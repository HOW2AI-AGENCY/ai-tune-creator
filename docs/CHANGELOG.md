# Changelog

Все изменения в проекте документируются в этом файле.

## [2.0.0] - 2025-08-18

### Добавлено

#### Система мониторинга AI сервисов
- `useAIServiceStatus` хук для отслеживания статуса сервисов
- `AIServiceStatusPanel` компонент для отображения статуса
- Edge Functions для проверки статуса Suno и Mureka
- Автоматическое обновление статуса каждые 30 секунд
- Отслеживание кредитов и лимитов запросов

#### Система загрузки файлов
- `useFileUpload` хук с поддержкой множественных bucket'ов
- `FileUploadZone` компонент с drag & drop функционалом
- Новые Supabase storage bucket'ы:
  - `albert-tracks` - аудио файлы
  - `project-covers` - обложки проектов
  - `artist-assets` - материалы артистов
  - `avatars` - аватары пользователей
  - `promo-materials` - промо контент
  - `user-uploads` - пользовательские файлы

#### Безопасность и валидация
- RLS политики для всех storage bucket'ов
- Валидация URL аудио файлов
- Проверка типов и размеров файлов
- Белый список доменов для безопасности

#### Документация
- [AI Monitoring System](ai-monitoring-system.md) - полное руководство по мониторингу
- [File Upload System](file-upload-system.md) - система загрузки файлов
- Обновленное [Integration Guide](ai-services/integration-guide.md)
- Новый [README](README.md) с обзором всех систем

### Изменено

#### Хранилище
- Рефакторинг `src/lib/storage/constants.ts` с новыми bucket константами
- Обновлен `useFileUpload` для работы с разными типами хранилищ
- Улучшена система построения путей файлов

#### Компоненты
- Обновлен экспорт в `src/features/ai-generation/index.ts`
- Добавлена поддержка `folder` параметра в file upload хуках

### Исправлено

#### TypeScript ошибки
- Исправлены missing export ошибки в storage constants
- Добавлены отсутствующие типы для file upload props
- Обновлены import'ы в компонентах

#### Безопасность
- Исправлены все предупреждения Supabase Linter
- Добавлены недостающие RLS политики
- Улучшена валидация на уровне базы данных

### Миграции базы данных

#### Storage buckets и RLS политики
```sql
-- Создание storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
('albert-tracks', 'albert-tracks', true),
('project-covers', 'project-covers', true),
('artist-assets', 'artist-assets', true),
('avatars', 'avatars', true),
('promo-materials', 'promo-materials', true),
('user-uploads', 'user-uploads', false);

-- RLS политики для каждого bucket
CREATE POLICY "Users can view their own files" ON storage.objects 
FOR SELECT USING (auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own files" ON storage.objects 
FOR INSERT WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own files" ON storage.objects 
FOR UPDATE USING (auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files" ON storage.objects 
FOR DELETE USING (auth.uid()::text = (storage.foldername(name))[1]);
```

### Environment Variables

#### Новые переменные
- `SUNOAPI_ORG_TOKEN` - API токен для Suno AI
- `MUREKA_API_KEY` - API ключ для Mureka

#### Обновленные
- Все существующие AI сервис ключи проверены и документированы

## [1.5.0] - 2025-08-17

### Добавлено
- Базовая система AI генерации
- Интеграция с Suno и Mureka API
- Supabase Edge Functions для генерации

### Изменено
- Структура проекта для лучшей организации
- Оптимизация производительности компонентов

### Исправлено
- Различные bug fixes и улучшения стабильности

## [1.0.0] - 2025-08-01

### Добавлено
- Начальная версия приложения
- Базовая аутентификация
- Управление проектами и треками
- Интеграция с Supabase

---

## Формат записей

Записи в changelog следуют формату [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

### Типы изменений
- **Добавлено** для новых функций
- **Изменено** для изменений в существующей функциональности
- **Исправлено** для багфиксов
- **Удалено** для удаленной функциональности
- **Безопасность** для уязвимостей

### Ссылки на версии
Все версии доступны в Git теги репозитория.