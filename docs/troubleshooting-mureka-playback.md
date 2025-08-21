# Инцидент: Mureka трек отображается, но не скачался и не воспроизводится (21.08.2025)

## Сводка
- Генерация Mureka завершилась успешно, трек отображается в UI.
- Фоновая загрузка в Supabase Storage не произошла из‑за идемпотентной блокировки в функции `download-and-save-track` (ответ: "Download already in progress or completed").
- Воспроизведение с CDN (`cdn.mureka.ai`) у некоторых пользователей не стартует (ошибка сети/поддержки источника) — вероятно из‑за ограничений CDN (CORS/Range/региональная блокировка).

## Доказательства (логи)
- generate-mureka-track: статус задачи `succeeded`, 2 трека сохранены в БД.
- save-mureka-generation: фоновая загрузка инициирована, но ответ функции — "Download already in progress or completed" (загрузка не началась).
- get-mureka-task-status: подтверждает `succeeded`.

## Причина
1) Идемпотентная блокировка (RPC `acquire_operation_lock`) могла быть выставлена ранее и осталась до TTL (120 сек) → повторный вызов сразу возвращает `already in progress`.
2) Трек остаётся с внешним `audio_url` (CDN), локальная копия в `albert-tracks` не создаётся → часть клиентов не воспроизводит источник с CDN.

## Быстрое решение (ручной ретрай)
- Запустите фоновую загрузку повторно для конкретной генерации:

```ts
// В консоли приложения (авторизованы как пользователь)
import { createClient } from '@supabase/supabase-js'
const sb = createClient(import.meta.env.VITE_SUPABASE_URL!, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!)
await sb.functions.invoke('download-and-save-track', {
  body: {
    generation_id: '<GENERATION_ID>',
    external_url: '<CDN_AUDIO_URL>',
    filename: 'mureka_<short>.mp3'
  }
})
```

Проверьте:
- В таблице `ai_generations`: `metadata.local_storage_path` и `result_url` указывают на публичный URL из `albert-tracks`.
- В `tracks`: поле `audio_url` обновлено локальным публичным URL (обновляется RPC `create_or_update_track_from_generation`).

## Диагностика воспроизведения
- В браузере откройте DevTools → Console и Network.
- При ошибке audio элемент даёт коды:
  - MEDIA_ERR_NETWORK — проблемы сети/доступа к CDN
  - MEDIA_ERR_SRC_NOT_SUPPORTED — источник не поддерживается/ограничен
- Убедитесь, что URL соответствует правилам `isValidAudioUrl` (разрешён `cdn.mureka.ai`, расширение `.mp3`).

## Проверка Storage
- Бакет `albert-tracks` должен быть публичным, файл доступен по `getPublicUrl()`.
- Кеширование: `public, max-age=31536000, immutable`.

## Профилактика
- Сократить TTL блокировки до 30–60 сек и добавить повтор при ответе "already in progress", если у генерации нет `metadata.local_storage_path`.
- В `save-mureka-generation` передавать `taskId` помимо `generation_id` (уникальнее для массовых генераций).
- UI: показать кнопку "Повторить загрузку" для трека без локальной копии.

## Статус
- Рекомендация: выполнить ручной ретрай (см. выше). Если проблема повторяется — внедрить автоповтор, уменьшить TTL и доработать логику блокировок.
