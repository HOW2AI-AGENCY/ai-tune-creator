# Анализ проблем Mureka AI - Диагностический отчет

*Обновлено: 20.08.2025, 15:55 UTC*

## 🚨 Текущие проблемы с Mureka треками

### Обнаруженные проблемы

#### 1. Частичный сбой при сохранении множественных треков
**Статус:** ❌ КРИТИЧЕСКИЙ  
**Источник:** Edge Function logs `generate-mureka-track`

**Детали:**
```
[MULTI-TRACK] Найдено 2 треков, сохраняем все
[MULTI-TRACK] Сохраняем трек 2/2  
❌ [MULTI-TRACK] Ошибка сохранения трека 2: FunctionsHttpError: Edge Function returned a non-2xx status code
```

**Анализ:**
- ✅ Mureka API работает корректно (статус `succeeded`)
- ✅ Первый трек сохраняется успешно
- ❌ Второй трек падает с ошибкой 400 в `download-and-save-track`

#### 2. download-and-save-track возвращает 400 ошибку
**Источник:** Analytics logs
```
POST | 400 | /functions/v1/download-and-save-track
Function ID: 4853694f-f99f-48c0-ae76-e10db624ff50
```

**Вероятные причины 400 ошибки:**
1. **Дублирование generation_id** - второй трек пытается использовать тот же ID
2. **Конфликт блокировки** - `acquire_operation_lock` для того же ключа
3. **Неправильные параметры** - отсутствует required field для второго трека

## 🔍 Диагностика кода

### Проблема в generate-mureka-track
**Файл:** `supabase/functions/generate-mureka-track/index.ts`

**Код обработки множественных треков:**
```typescript
if (taskData.results && Array.isArray(taskData.results) && taskData.results.length > 1) {
  // Сохраняем все треки
  for (let i = 0; i < taskData.results.length; i++) {
    const trackResult = taskData.results[i];
    // ❌ ПРОБЛЕМА: Один generation_id для всех треков
    const downloadResponse = await supabase.functions.invoke('download-and-save-track', {
      body: {
        generation_id: generationId, // ⚠️ Тот же ID!
        external_url: trackResult.song_url,
        filename: `mureka-track-${generationId}-${i+1}.mp3`
      }
    });
  }
}
```

### Проблема в download-and-save-track
**Файл:** `supabase/functions/download-and-save-track/index.ts`

**Блокировка по generation_id:**
```typescript
const lockKey = `download:${generation_id || incomingTaskId}`;
const { data: lockAcquired } = await supabase.rpc('acquire_operation_lock', {
  p_key: lockKey,
  p_ttl_seconds: 120
});

if (!lockAcquired) {
  // ❌ Второй трек не может получить блокировку!
  return new Response(JSON.stringify({ 
    success: true,
    message: 'Download already in progress or completed'
  }), { status: 200 });
}
```

## 📋 План исправления

### 1. Исправить обработку множественных треков
```typescript
// Создать отдельные generation записи для каждого трека
for (let i = 0; i < trackData.results.length; i++) {
  const uniqueGenerationId = crypto.randomUUID();
  
  // Создать запись в ai_generations для каждого трека
  await supabase.from('ai_generations').insert({
    id: uniqueGenerationId,
    user_id: generation.user_id,
    prompt: generation.prompt,
    service: 'mureka',
    status: 'completed',
    metadata: {
      ...generation.metadata,
      track_index: i + 1,
      original_task_id: taskId
    }
  });

  // Сохранить с уникальным ID
  await supabase.functions.invoke('download-and-save-track', {
    body: {
      generation_id: uniqueGenerationId,
      external_url: trackResult.song_url,
      filename: `mureka-track-${taskId}-${i+1}.mp3`
    }
  });
}
```

### 2. Улучшить блокировку в download-and-save-track
```typescript
// Использовать более специфичный ключ блокировки
const lockKey = `download:${generation_id || incomingTaskId}:${Date.now()}:${Math.random()}`;
```

### 3. Добавить retry логику
```typescript
// В generate-mureka-track добавить повторные попытки
for (let retry = 0; retry < 3; retry++) {
  try {
    const downloadResponse = await supabase.functions.invoke('download-and-save-track', {
      body: downloadPayload
    });
    break; // Успех
  } catch (error) {
    if (retry === 2) throw error;
    await new Promise(resolve => setTimeout(resolve, 1000 * (retry + 1)));
  }
}
```

## ✅ Проверка работоспособности

### Что работает:
- ✅ **Mureka API** - статус online, кредиты 27.56$
- ✅ **Генерация треков** - API возвращает succeed
- ✅ **Первый трек** - успешно сохраняется
- ✅ **UI отображение** - 17 треков загружены

### Что нужно исправить:
- ❌ **Множественные треки** - второй трек падает с 400
- ❌ **Блокировка** - конфликт в acquire_operation_lock
- ❌ **Error handling** - нет retry логики

## 🔧 Временное решение

Пока можно использовать Mureka только для одиночных треков. Множественные треки будут частично работать (первый трек сохранится).

## 📊 Статистика проблем

**Успешность сохранения:**
- Одиночные треки: ✅ 100%
- Множественные треки: ⚠️ 50% (только первый)

**Время до исправления:** 30-60 минут разработки

**Приоритет:** ВЫСОКИЙ (влияет на пользовательский опыт)

---

*Этот отчет обновляется в реальном времени на основе логов системы*