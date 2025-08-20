# Полное руководство по интеграции Suno AI

## 🎯 Обзор системы

Система генерации треков с Suno AI включает в себя полный цикл:
1. **Создание запроса** → Edge Function `generate-suno-track`
2. **Отслеживание прогресса** → Автоматическое обновление статуса
3. **Обработка результата** → Callback `suno-callback` 
4. **Скачивание файла** → Edge Function `download-and-save-track`
5. **Синхронизация** → Edge Function `sync-generated-tracks`

## 🔄 Жизненный цикл генерации

### 1. Инициация генерации
```typescript
// В useUnifiedGeneration.tsx
const response = await supabase.functions.invoke('generate-suno-track', {
  body: {
    prompt: "Create an upbeat pop song with catchy chorus",
    service: 'suno',
    model: 'V3_5',
    callBackUrl: `${supabaseUrl}/functions/v1/suno-callback`
  }
});
```

### 2. Создание записи в БД
```sql
-- Создается запись в ai_generations
INSERT INTO ai_generations (
  id,
  user_id,
  prompt,
  service,
  status,
  metadata
) VALUES (
  uuid_generate_v4(),
  auth.uid(),
  'Create an upbeat pop song...',
  'suno',
  'pending',
  '{"service": "suno", "model": "V3_5"}'::jsonb
);
```

### 3. Получение результата через Callback
```typescript
// suno-callback/index.ts получает:
{
  "id": "generation-id",
  "status": "completed", 
  "audio_url": "https://cdn.suno.ai/...",
  "title": "Generated Song Title",
  "lyrics": "[Verse 1]\n...",
  "metadata": {
    "duration": 120,
    "model": "V3_5"
  }
}
```

### 4. Автоматическое скачивание
```typescript
// Callback вызывает download-and-save-track
await supabase.functions.invoke('download-and-save-track', {
  body: {
    audioUrl: result.audio_url,
    generationId: generationId,
    fileName: `suno-track-${generationId}.mp3`
  }
});
```

### 5. Финальная синхронизация
```typescript
// sync-generated-tracks обновляет треки
// Ищет completed генерации без треков и создает их
```

## 🛠 Ключевые компоненты

### Frontend Components

#### UnifiedGenerationSidebar
**Файл:** `src/features/ai-generation/components/UnifiedGenerationSidebar.tsx`
- **Назначение:** Единая форма для генерации треков
- **Особенности:**
  - English по умолчанию для Suno (лучшие результаты)
  - Валидация входных данных
  - Поддержка пресетов и кастомных настроек

#### useUnifiedGeneration Hook
**Файл:** `src/features/ai-generation/hooks/useUnifiedGeneration.tsx`
- **Назначение:** Управление состоянием генерации
- **Методы:**
  - `generateTrack()` - запуск генерации
  - `startProgressMonitoring()` - отслеживание прогресса
  - `cancelGeneration()` - отмена генерации

#### GenerationTrackCard
**Файл:** `src/features/ai-generation/components/GenerationTrackCard.tsx`
- **Назначение:** Отображение результатов генерации
- **Особенности:**
  - Автоматическое извлечение audio_url
  - Поддержка воспроизведения
  - Индикация статуса генерации

### Backend Edge Functions

#### generate-suno-track
**Эндпоинт:** `https://api.sunoapi.org/api/v1/generate`
**Метод:** POST
**Headers:**
```
Authorization: Bearer {SUNOAPI_ORG_TOKEN}
Content-Type: application/json
```

**Тело запроса:**
```json
{
  "prompt": "Create an upbeat pop song",
  "mode": "custom",
  "style": "pop, energetic",
  "title": "My Generated Song",
  "callBackUrl": "https://project.supabase.co/functions/v1/suno-callback"
}
```

**Ответ:**
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "task-12345"
  }
}
```

#### suno-callback
**Назначение:** Обработка результатов от Suno API
**Важные особенности:**
- Автоматическое извлечение audio_url из результата
- Создание трека в БД с правильными метаданными
- Запуск скачивания файла

**Структура результата Suno:**
```json
{
  "id": "task-id",
  "status": "completed",
  "clips": [
    {
      "id": "clip-id",
      "audio_url": "https://cdn.suno.ai/file.mp3",
      "title": "Generated Title",
      "lyric": "[Verse 1]\nGenerated lyrics...",
      "duration": 120.5,
      "metadata": {
        "prompt": "Original prompt",
        "style": "pop, energetic"
      }
    }
  ]
}
```

#### download-and-save-track
**Назначение:** Скачивание аудио файлов и сохранение в Supabase Storage
**Алгоритм:**
1. Скачивание файла по URL
2. Сохранение в Storage bucket `albert-tracks`
3. Обновление БД с локальным URL
4. Обновление метаданных трека

**Путь файлов:** `albert-tracks/{user_id}/suno/suno-track-{id}-{timestamp}.mp3`

#### sync-generated-tracks
**Назначение:** Синхронизация завершенных генераций с треками
**Логика:**
```typescript
// Ищем completed генерации без треков
const completedGenerations = await supabase
  .from('ai_generations')
  .select('*')
  .eq('status', 'completed')
  .is('track_id', null);

// Для каждой генерации создаем или обновляем трек
for (const generation of completedGenerations) {
  const audioUrl = extractAudioUrl(generation.result_url);
  if (audioUrl) {
    await createOrUpdateTrack(generation, audioUrl);
  }
}
```

## 🔧 Настройка Environment Variables

### В Supabase Secrets:

1. **SUNOAPI_ORG_TOKEN**
   - Получить: https://sunoapi.org/api-key
   - Формат: строка ~32 символа
   - Используется во всех Suno функциях

## 📊 Мониторинг и отладка

### Проверка статуса генерации
```typescript
// Проверка через Edge Function
const { data } = await supabase.functions.invoke('get-suno-record-info', {
  body: { taskId: 'task-id' }
});
```

### Логирование
Все Edge Functions включают подробное логирование:
- Входящие параметры
- API вызовы к Suno
- Ответы от Suno
- Ошибки и исключения

### Типичные проблемы и решения

#### 1. Audio URL не извлекается
**Причина:** Неправильная структура ответа от Suno
**Решение:** Проверить логи callback функции

#### 2. Файлы не скачиваются
**Причина:** Недоступность URL или проблемы с Storage
**Решение:** Проверить доступность URL и права Storage

#### 3. Треки не появляются в UI
**Причина:** Не создана связь generation → track
**Решение:** Запустить sync-generated-tracks вручную

## 🎵 Воспроизведение треков

### FloatingPlayer
**Компонент:** `src/features/ai-generation/components/FloatingPlayer.tsx`
- Поддержка всех аудио форматов
- Автоматическое переключение треков
- Контроль громкости и прогресса

### TrackResultsGrid
**Компонент:** `src/features/ai-generation/components/TrackResultsGrid.tsx`
- Отображение библиотеки треков
- Кнопки воспроизведения для каждого трека
- Индикация текущего воспроизводящегося трека

## 🏗 Архитектурные решения

### Метаданные сервисов
Все треки содержат информацию об AI сервисе:
```json
{
  "service": "suno",
  "model": "V3_5",
  "generation_id": "uuid",
  "original_prompt": "Create an upbeat pop song"
}
```

### Единый интерфейс генерации
Компонент `UnifiedGenerationSidebar` поддерживает:
- Быстрые пресеты (с English промптами для Suno)
- Детальные настройки
- Валидацию входных данных
- Переключение между Suno и Mureka

### Автоматическая синхронизация
Система автоматически:
- Отслеживает статус генераций
- Скачивает готовые файлы
- Создает треки в БД
- Обновляет UI через события

## 🚀 Рекомендации по использованию

### Для лучших результатов с Suno AI:
1. **Используйте английские промпты** - Suno лучше понимает английский
2. **Будьте конкретны** - "Create upbeat pop song with guitar" лучше чем "Make music"
3. **Указывайте стиль** - Добавляйте жанр и настроение
4. **Оптимальная длина** - 120-180 секунд для полных песен

### Мониторинг производительности:
- Следите за логами Edge Functions
- Проверяйте статус AI сервисов через AIServiceStatusPanel
- Используйте sync-generated-tracks для восстановления "потерянных" треков