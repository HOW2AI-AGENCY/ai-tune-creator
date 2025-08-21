# Инцидент 2025‑08‑21: Mureka — трек отображается, но не скачался/не воспроизводится

## Кратко
- Генерация: succeeded (2 варианта)
- Сохранение: записи в `tracks` созданы с CDN `audio_url`
- Фоновая загрузка: не стартовала из‑за идемпотентной блокировки (`download-and-save-track` → "Download already in progress or completed")
- Воспроизведение: у части клиентов не начинается при источнике `cdn.mureka.ai`

## Логи
- generate-mureka-track: задача `90372875288577` → `succeeded`
- save-mureka-generation: `Background download initiated` → ответ функции: `Download already in progress or completed`
- get-mureka-task-status: подтверждение `succeeded`

## Причина
- Сталый/пересекающийся lock по ключу `download:<generation_id>` блокирует реальную загрузку.
- В итоге отсутствует локальный публичный URL из `albert-tracks` → плеер использует CDN, где возможны сетевые/региональные/Range ограничения.

## Что делать
1) Ручной ретрай через `download-and-save-track` (см. docs/troubleshooting-mureka-playback.md)
2) Проверить публичный доступ `albert-tracks` и наличие файла
3) Убедиться, что `tracks.audio_url` обновлён локальным URL (после RPC)

## План улучшений
- Уменьшить TTL блокировки (120с → 30–60с)
- Повторный вызов при ответе "already in progress", если нет `metadata.local_storage_path`
- Проброс `taskId` помимо `generation_id` для уникальности в массовых генерациях
- Кнопка "Повторить загрузку" в UI для проблемных треков
