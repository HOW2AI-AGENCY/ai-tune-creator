# 🛠️ Руководство по устранению неполадок

## 📋 Общие проблемы и решения

### 🤖 Проблемы с AI генерацией

#### Mureka API Error: "Invalid Request, The lyrics are empty"
**Симптомы:** 
```json
{
  "success": false,
  "error": "Mureka API error: 400 {\"error\":{\"message\":\"Invalid Request, The lyrics are empty.\"}}"
}
```

**Решение:**
1. ✅ **Исправлено в версии 0.01.035** - Система автоматически обеспечивает непустые lyrics
2. Для инструментальных треков используется `[Instrumental]`
3. Если lyrics не указаны, промпт конвертируется в lyrics

#### Suno API недоступен
**Симптомы:**
- Статус показывает 🔴 Offline
- Ошибки аутентификации

**Решения:**
1. Проверьте API ключ в Supabase Secrets
2. Проверьте баланс кредитов на Suno
3. Убедитесь что сервис работает: https://status.suno.ai

#### Превышен лимит запросов
**Симптомы:**
```json
{
  "error": "Rate limit exceeded. Suno AI generation limited to 5 requests per 10 minutes."
}
```

**Решения:**
1. Подождите указанное время до сброса лимита
2. Используйте альтернативный AI сервис (Mureka)
3. Проверьте `retryAfter` значение в ответе

### 🗂️ Проблемы с Inbox системой

#### Треки не попадают в Inbox
**Диагностика:**
1. Проверьте что включена опция "Send to Inbox"
2. Убедитесь что не выбран конкретный проект

**Решение:**
```typescript
// Проверка inbox logic в Edge Function
if (useInbox || (!projectId && !artistId)) {
  const { data: inboxProjectId } = await supabase
    .rpc('ensure_user_inbox', { p_user_id: userId });
}
```

#### Дублирование Inbox проектов
**Симптомы:** Несколько проектов с названием "Inbox"

**Решение:**
```sql
-- Найти дубликаты
SELECT user_id, COUNT(*) 
FROM projects 
WHERE is_inbox = true 
GROUP BY user_id 
HAVING COUNT(*) > 1;

-- Объединить в один (выполнить через backfill-inbox-tracks)
```

### 📊 Проблемы с мониторингом статуса

#### Статус сервисов не обновляется
**Симптомы:** Панель статуса показывает устаревшие данные

**Решения:**
1. Кнопка обновления в панели статуса
2. Перезагрузка страницы
3. Проверка Edge Functions логов

#### Неправильное отображение кредитов
**Для Mureka:**
- Баланс в центах делится на 100 для отображения в долларах
- Проверьте формат API ответа: `balance: 2900` = $29.00

**Для Suno:**
- Кредиты отображаются как есть
- Проверьте поле `data` в ответе API

### 🎵 Проблемы с воспроизведением треков

#### Аудио не загружается
**Диагностика:**
1. Проверьте `audio_url` в базе данных
2. Убедитесь что URL доступен
3. Проверьте CORS настройки

**Решение:**
```typescript
// Проверка доступности аудио
const checkAudioUrl = async (url: string) => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
};
```

#### Треки без метаданных
**Симптомы:** Отсутствует duration, bpm, или другие метаданные

**Решение:**
1. Проверьте обработку ответа от AI API
2. Убедитесь что метаданные сохраняются в поле `metadata`

### 🗄️ Проблемы с базой данных

#### RLS Policy ошибки
**Симптомы:**
```
new row violates row-level security policy
```

**Решение:**
1. Проверьте что пользователь аутентифицирован
2. Убедитесь что `user_id` правильно установлен
3. Проверьте RLS политики для таблицы

#### Функции базы данных недоступны
**Симптомы:**
```
function ensure_user_inbox(uuid) does not exist
```

**Решение:**
1. Выполните миграции базы данных
2. Проверьте что функции созданы с правильным `search_path`

## 🔧 Инструменты диагностики

### Edge Functions логи
```bash
# Просмотр логов генерации
https://supabase.com/dashboard/project/zwbhlfhwymbmvioaikvs/functions/generate-mureka-track/logs
https://supabase.com/dashboard/project/zwbhlfhwymbmvioaikvs/functions/generate-suno-track/logs

# Логи проверки статуса
https://supabase.com/dashboard/project/zwbhlfhwymbmvioaikvs/functions/check-mureka-status/logs
https://supabase.com/dashboard/project/zwbhlfhwymbmvioaikvs/functions/check-suno-status/logs
```

### SQL запросы для диагностики
```sql
-- Проверка последних генераций
SELECT service, status, created_at, metadata->>'error' as error
FROM ai_generations 
WHERE user_id = auth.uid()
ORDER BY created_at DESC 
LIMIT 10;

-- Проверка Inbox проектов
SELECT id, title, is_inbox, artist_id
FROM projects 
WHERE is_inbox = true AND user_id = auth.uid();

-- Проверка треков без проектов
SELECT id, title, project_id
FROM tracks 
WHERE user_id = auth.uid() AND project_id IS NULL;
```

### React DevTools
```typescript
// Проверка состояния AI сервисов
const { services, isLoading, error } = useAIServiceStatus();
console.log('AI Services:', services);

// Проверка генерации треков
const { generateTrack, isGenerating } = useTrackGeneration();
console.log('Generation state:', { isGenerating });
```

## 📞 Получение помощи

### Логи для поддержки
При обращении в поддержку приложите:
1. **Timestamp** ошибки
2. **Edge Function логи** из Supabase
3. **Console логи** браузера
4. **Network tab** с неудачными запросами

### Самодиагностика
```typescript
// Проверочный скрипт
const diagnostics = {
  auth: !!supabase.auth.getUser(),
  services: await Promise.all([
    fetch('/functions/v1/check-suno-status'),
    fetch('/functions/v1/check-mureka-status')
  ]),
  database: await supabase.from('profiles').select('id').limit(1)
};
```

### Известные ограничения
1. **Mureka API** требует обязательные lyrics (не может быть пустым)
2. **Suno API** имеет лимит 5 запросов / 10 минут
3. **Edge Functions** имеют timeout 25 секунд для HTTP запросов
4. **Файлы аудио** должны быть доступны по публичным URL

## 🚀 Профилактика проблем

### Рекомендации по использованию
1. **Проверяйте статус** сервисов перед генерацией
2. **Используйте валидные** параметры для каждого AI сервиса
3. **Не превышайте** лимиты запросов
4. **Сохраняйте** удачные настройки для повторного использования

### Мониторинг системы
1. Настройте уведомления для критических ошибок
2. Отслеживайте использование кредитов AI сервисов
3. Регулярно проверяйте логи Edge Functions
4. Мониторьте производительность базы данных

---

💡 **Подсказка:** Большинство проблем решается перезагрузкой страницы и проверкой статуса AI сервисов. Если проблема сохраняется, проверьте Edge Functions логи для детальной диагностики.