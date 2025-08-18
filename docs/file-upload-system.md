# Система загрузки файлов

## Обзор

Система загрузки файлов обеспечивает безопасную и эффективную загрузку файлов в различные хранилища Supabase с поддержкой валидации, отслеживания прогресса и автоматического управления путями.

## Компоненты системы

### 1. useFileUpload Hook

**Расположение:** `src/hooks/useFileUpload.tsx`

#### Возможности:
- Загрузка файлов в различные bucket'ы
- Валидация типов файлов и размеров
- Отслеживание прогресса загрузки
- Автоматическое построение безопасных путей
- Обработка ошибок с уведомлениями

#### Параметры:
```typescript
interface UseFileUploadProps {
  onUploadComplete?: (url: string, metadata?: any) => void;
  onUploadError?: (error: string) => void;
  allowedTypes?: string[];
  maxSize?: number; // в MB
  bucket?: string;
  folder?: string;
}
```

#### Возвращаемые методы:
```typescript
{
  uploadFile: (file: File, uploadFolder?: string, fileName?: string) => Promise<string | null>;
  deleteFile: (filePath: string, bucketName?: string) => Promise<boolean>;
  uploading: boolean;
  progress: number;
}
```

### 2. FileUploadZone Component

**Расположение:** `src/features/ai-generation/components/FileUploadZone.tsx`

#### Возможности:
- Drag & drop интерфейс
- Выбор файлов через диалог
- Настраиваемые ограничения
- Визуальная обратная связь
- Поддержка различных типов файлов

#### Параметры:
```typescript
interface FileUploadZoneProps {
  onFileUploaded?: (url: string, metadata?: any) => void;
  allowedTypes?: string[];
  maxSize?: number;
  bucket?: string;
  folder?: string;
  accept?: string;
  children?: React.ReactNode;
  disabled?: boolean;
}
```

## Конфигурация хранилищ

### Bucket'ы Supabase

1. **albert-tracks**
   - Назначение: Аудио файлы и треки
   - Публичный доступ: Да
   - RLS: Включен

2. **project-covers**
   - Назначение: Обложки проектов
   - Публичный доступ: Да
   - RLS: Включен

3. **artist-assets**
   - Назначение: Баннеры и материалы артистов
   - Публичный доступ: Да
   - RLS: Включен

4. **avatars**
   - Назначение: Аватары пользователей
   - Публичный доступ: Да
   - RLS: Включен

5. **promo-materials**
   - Назначение: Промо материалы
   - Публичный доступ: Да
   - RLS: Включен

6. **user-uploads**
   - Назначение: Пользовательские загрузки
   - Публичный доступ: Нет
   - RLS: Включен

### Константы хранилища

**Файл:** `src/lib/storage/constants.ts`

```typescript
// Константы bucket'ов
export const BUCKET_AUDIO = 'albert-tracks';
export const BUCKET_PROJECT_COVERS = 'project-covers';
export const BUCKET_AVATARS = 'avatars';
export const BUCKET_ARTIST_ASSETS = 'artist-assets';
export const BUCKET_PROMO = 'promo-materials';
export const BUCKET_USER_UPLOADS = 'user-uploads';

// Конфигурация
export const AUDIO_CONTENT_TYPE = 'audio/mpeg';
export const AUDIO_CACHE_CONTROL = 'public, max-age=31536000, immutable';
```

### Функции-помощники

#### buildStoragePath()
Создает безопасный путь для файла с временной меткой:
```typescript
buildStoragePath(
  userId: string,
  service: 'suno' | 'mureka',
  taskId: string,
  baseFileName: string
): string
```

#### isValidAudioUrl()
Валидирует URL аудио файла для воспроизведения:
```typescript
isValidAudioUrl(url: string): boolean
```

**Проверки:**
- Протокол HTTPS
- Домены из whitelist
- Поддерживаемые расширения файлов (.mp3, .wav, .m4a, .ogg)

## Безопасность

### RLS Политики

Все bucket'ы защищены Row Level Security политиками:

1. **Чтение**: Пользователи могут читать свои файлы
2. **Загрузка**: Пользователи могут загружать в свои папки
3. **Обновление**: Пользователи могут обновлять свои файлы
4. **Удаление**: Пользователи могут удалять свои файлы

### Валидация

- Проверка типов файлов
- Ограничения размера файлов
- Валидация имен файлов
- Проверка доменов для URL

## Примеры использования

### Базовая загрузка файла

```typescript
import { useFileUpload } from '@/hooks/useFileUpload';

function MyComponent() {
  const { uploadFile, uploading, progress } = useFileUpload({
    allowedTypes: ['audio/mpeg', 'audio/wav'],
    maxSize: 50,
    bucket: 'albert-tracks',
    onUploadComplete: (url, metadata) => {
      console.log('Файл загружен:', url);
    }
  });

  const handleUpload = async (file: File) => {
    const url = await uploadFile(file);
    if (url) {
      // Файл успешно загружен
    }
  };

  return (
    <div>
      {uploading && <p>Загрузка: {progress}%</p>}
    </div>
  );
}
```

### Использование FileUploadZone

```typescript
import { FileUploadZone } from '@/features/ai-generation/components/FileUploadZone';

function UploadForm() {
  return (
    <FileUploadZone
      allowedTypes={['image/jpeg', 'image/png']}
      maxSize={10}
      bucket="project-covers"
      folder="covers"
      accept="image/*"
      onFileUploaded={(url, metadata) => {
        console.log('Обложка загружена:', url);
      }}
    />
  );
}
```

### Загрузка аудио файлов

```typescript
function AudioUpload() {
  return (
    <FileUploadZone
      allowedTypes={['audio/mpeg', 'audio/wav', 'audio/m4a']}
      maxSize={100}
      bucket="albert-tracks"
      folder="user-uploads"
      accept="audio/*"
      onFileUploaded={(url, metadata) => {
        // Сохранить URL в базе данных
        console.log('Аудио загружено:', url, metadata);
      }}
    />
  );
}
```

## Обработка ошибок

Система автоматически обрабатывает различные типы ошибок:

- **Размер файла**: Превышение лимита размера
- **Тип файла**: Неподдерживаемый формат
- **Авторизация**: Пользователь не авторизован
- **Сеть**: Проблемы с подключением
- **Хранилище**: Ошибки Supabase Storage

Все ошибки отображаются через систему toast уведомлений.

## Мониторинг и отладка

### Логирование

Все операции загрузки логируются в консоль:
```
Uploading to path: {userId}/{service}/{taskId}/{fileName}
Upload error: {error details}
```

### Метаданные файлов

Каждая загрузка возвращает метаданные:
```typescript
{
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
  storagePath: string;
}
```

## Миграции и обновления

При изменении структуры хранилищ используйте Supabase миграции:

```sql
-- Создание нового bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('new-bucket', 'new-bucket', true);

-- Создание RLS политики
CREATE POLICY "User specific access" ON storage.objects 
FOR ALL USING (auth.uid()::text = (storage.foldername(name))[1]);
```

Система загрузки файлов готова к использованию и интегрирована со всеми компонентами приложения.