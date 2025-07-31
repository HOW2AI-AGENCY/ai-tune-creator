# API Документация | AI Music Platform

## 📋 Обзор API

AI Music Platform предоставляет RESTful API для управления артистами, проектами, треками и промо-материалами.

**Base URL**: `https://your-project.supabase.co/rest/v1`

**Версия API**: v1.0.0

## 🔐 Аутентификация

### JWT Токены

Все запросы требуют авторизации через JWT токен в заголовке:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Получение токена

```typescript
import { supabase } from '@/lib/supabase';

// Вход пользователя
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

// Токен доступен в data.session.access_token
```

## 👤 Пользователи и профили

### GET /profiles

Получить профили пользователей

```http
GET /profiles
Authorization: Bearer YOUR_JWT_TOKEN
```

**Ответ:**
```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid", 
      "display_name": "John Doe",
      "avatar_url": "https://...",
      "bio": "Music producer",
      "created_at": "2024-07-31T12:00:00Z",
      "updated_at": "2024-07-31T12:00:00Z"
    }
  ]
}
```

### POST /profiles

Создать новый профиль

```http
POST /profiles
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "display_name": "John Doe",
  "avatar_url": "https://...",
  "bio": "Music producer"
}
```

## 🎤 Артисты

### GET /artists

Получить список артистов пользователя

```http
GET /artists?user_id=eq.uuid
Authorization: Bearer YOUR_JWT_TOKEN
```

**Параметры:**
- `user_id` - ID пользователя (обязательный)
- `limit` - количество записей (по умолчанию 10)
- `offset` - смещение для пагинации

**Ответ:**
```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "name": "Artist Name",
      "type": "solo", // solo | band | duo
      "genre": "Electronic",
      "bio": "Artist biography",
      "avatar_url": "https://...",
      "social_links": {
        "instagram": "@artist",
        "spotify": "spotify:artist:id",
        "youtube": "@artist"
      },
      "metadata": {
        "formed_year": 2020,
        "location": "Moscow, Russia"
      },
      "created_at": "2024-07-31T12:00:00Z",
      "updated_at": "2024-07-31T12:00:00Z"
    }
  ]
}
```

### POST /artists

Создать нового артиста

```http
POST /artists
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "New Artist",
  "type": "solo",
  "genre": "Electronic",
  "bio": "Artist biography",
  "avatar_url": "https://...",
  "social_links": {
    "instagram": "@newartist",
    "spotify": "spotify:artist:newid"
  },
  "metadata": {
    "formed_year": 2024,
    "location": "Moscow, Russia"
  }
}
```

### PUT /artists

Обновить артиста

```http
PUT /artists?id=eq.uuid
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "Updated Artist Name",
  "bio": "Updated biography"
}
```

### DELETE /artists

Удалить артиста

```http
DELETE /artists?id=eq.uuid
Authorization: Bearer YOUR_JWT_TOKEN
```

## 📁 Проекты

### GET /projects

Получить проекты пользователя

```http
GET /projects?user_id=eq.uuid
Authorization: Bearer YOUR_JWT_TOKEN
```

**Ответ:**
```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "title": "My Album",
      "description": "Album description",
      "status": "active", // draft | active | completed | archived
      "type": "album", // single | ep | album | mixtape
      "cover_url": "https://...",
      "metadata": {
        "release_date": "2024-12-01",
        "label": "Independent",
        "catalog_number": "REL001"
      },
      "created_at": "2024-07-31T12:00:00Z",
      "updated_at": "2024-07-31T12:00:00Z"
    }
  ]
}
```

### POST /projects

Создать новый проект

```http
POST /projects
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "title": "New Album",
  "description": "Album description",
  "type": "album",
  "status": "draft",
  "metadata": {
    "release_date": "2024-12-01",
    "label": "Independent"
  }
}
```

## 🎵 Треки

### GET /tracks

Получить треки проекта

```http
GET /tracks?project_id=eq.uuid
Authorization: Bearer YOUR_JWT_TOKEN
```

**Ответ:**
```json
{
  "data": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "title": "Track Title",
      "duration": 180,
      "bpm": 128,
      "key": "Am",
      "genre": "Electronic",
      "audio_url": "https://...",
      "waveform_url": "https://...",
      "lyrics": "Track lyrics...",
      "metadata": {
        "isrc": "USRC17607839",
        "composer": "John Doe",
        "publisher": "Music Publisher"
      },
      "created_at": "2024-07-31T12:00:00Z",
      "updated_at": "2024-07-31T12:00:00Z"
    }
  ]
}
```

### POST /tracks

Создать новый трек

```http
POST /tracks
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "project_id": "uuid",
  "title": "New Track",
  "duration": 180,
  "bpm": 128,
  "key": "Am",
  "genre": "Electronic",
  "audio_url": "https://...",
  "lyrics": "Track lyrics...",
  "metadata": {
    "composer": "John Doe",
    "publisher": "Music Publisher"
  }
}
```

## 🖼️ Промо-материалы

### GET /promo_materials

Получить промо-материалы

```http
GET /promo_materials?entity_type=eq.artist&entity_id=eq.uuid
Authorization: Bearer YOUR_JWT_TOKEN
```

**Параметры:**
- `entity_type` - тип сущности (artist, project, track)
- `entity_id` - ID сущности
- `material_type` - тип материала (photo, video, banner, poster)

**Ответ:**
```json
{
  "data": [
    {
      "id": "uuid",
      "entity_type": "artist",
      "entity_id": "uuid",
      "material_type": "photo",
      "title": "Artist Photo",
      "file_url": "https://...",
      "thumbnail_url": "https://...",
      "file_size": 1024000,
      "mime_type": "image/jpeg",
      "metadata": {
        "width": 1920,
        "height": 1080,
        "photographer": "John Photographer"
      },
      "created_at": "2024-07-31T12:00:00Z"
    }
  ]
}
```

### POST /promo_materials

Загрузить промо-материал

```http
POST /promo_materials
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "entity_type": "artist",
  "entity_id": "uuid",
  "material_type": "photo",
  "title": "Artist Photo",
  "file_url": "https://...",
  "thumbnail_url": "https://...",
  "file_size": 1024000,
  "mime_type": "image/jpeg",
  "metadata": {
    "width": 1920,
    "height": 1080
  }
}
```

## 🤖 AI Генерация

### POST /rpc/generate_ai_track

Генерация трека с помощью AI

```http
POST /rpc/generate_ai_track
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "prompt": "Electronic dance music with uplifting melody",
  "style": "edm",
  "duration": 120,
  "options": {
    "provider": "suno", // suno | mureka
    "quality": "high",
    "instrumental": false
  }
}
```

**Ответ:**
```json
{
  "generation_id": "uuid",
  "status": "processing",
  "estimated_time": 60,
  "message": "Track generation started"
}
```

### GET /rpc/get_generation_status

Проверить статус генерации

```http
GET /rpc/get_generation_status?generation_id=uuid
Authorization: Bearer YOUR_JWT_TOKEN
```

**Ответ:**
```json
{
  "generation_id": "uuid",
  "status": "completed", // processing | completed | failed
  "progress": 100,
  "audio_url": "https://...",
  "metadata": {
    "duration": 120,
    "bpm": 128,
    "key": "Am"
  },
  "created_at": "2024-07-31T12:00:00Z",
  "completed_at": "2024-07-31T12:02:00Z"
}
```

## 📊 Аналитика

### GET /rpc/get_user_stats

Получить статистику пользователя

```http
GET /rpc/get_user_stats?user_id=uuid
Authorization: Bearer YOUR_JWT_TOKEN
```

**Ответ:**
```json
{
  "artists_count": 5,
  "projects_count": 12,
  "tracks_count": 47,
  "total_duration": 7200,
  "ai_generations_count": 23,
  "storage_used": 512000000,
  "last_activity": "2024-07-31T12:00:00Z"
}
```

## 📂 Файловое хранилище

### POST /storage/v1/object/{bucket}

Загрузить файл в Supabase Storage

```http
POST /storage/v1/object/avatars/user-uuid/avatar.jpg
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: image/jpeg

[binary file data]
```

### GET /storage/v1/object/public/{bucket}/{path}

Получить публичный файл

```http
GET /storage/v1/object/public/avatars/user-uuid/avatar.jpg
```

## ⚠️ Обработка ошибок

### Стандартные HTTP коды

- `200` - Успешный запрос
- `201` - Ресурс создан
- `400` - Неверный запрос
- `401` - Не авторизован
- `403` - Доступ запрещен
- `404` - Ресурс не найден
- `422` - Ошибка валидации
- `429` - Превышен лимит запросов
- `500` - Внутренняя ошибка сервера

### Формат ошибок

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Name is required",
    "details": {
      "field": "name",
      "expected": "string",
      "received": "null"
    }
  }
}
```

### Коды ошибок API

- `AUTH_REQUIRED` - Требуется аутентификация
- `PERMISSION_DENIED` - Нет прав доступа
- `VALIDATION_ERROR` - Ошибка валидации данных
- `RESOURCE_NOT_FOUND` - Ресурс не найден
- `RATE_LIMIT_EXCEEDED` - Превышен лимит запросов
- `FILE_TOO_LARGE` - Файл слишком большой
- `INVALID_FILE_TYPE` - Неподдерживаемый тип файла

## 📈 Лимиты и ограничения

### Rate Limiting

- **REST API**: 100 запросов/минуту на пользователя
- **AI Generation**: 10 запросов/час на пользователя
- **File Upload**: 50 МБ на файл, 1 ГБ/день на пользователя

### Размеры данных

- **Текстовые поля**: до 10,000 символов
- **Файлы изображений**: до 50 МБ
- **Аудио файлы**: до 100 МБ
- **Видео файлы**: до 500 МБ

## 📝 Примеры использования

### TypeScript/JavaScript

```typescript
import { supabase } from '@/lib/supabase';

// Создание артиста
const createArtist = async (artistData: CreateArtistData) => {
  const { data, error } = await supabase
    .from('artists')
    .insert(artistData)
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

// Получение промо-материалов
const getPromoMaterials = async (entityType: string, entityId: string) => {
  const { data, error } = await supabase
    .from('promo_materials')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId);
    
  if (error) throw error;
  return data;
};
```

### cURL примеры

```bash
# Создание артиста
curl -X POST \
  'https://your-project.supabase.co/rest/v1/artists' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "New Artist",
    "type": "solo",
    "genre": "Electronic"
  }'

# Получение проектов
curl -X GET \
  'https://your-project.supabase.co/rest/v1/projects?user_id=eq.uuid' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

## 🔄 Webhooks

### События

- `artist.created` - Создан новый артист
- `project.updated` - Обновлен проект
- `track.generated` - Завершена AI генерация трека
- `promo_material.uploaded` - Загружен промо-материал

### Настройка webhook

```typescript
// Пример обработчика webhook
app.post('/webhooks/ai-music', (req, res) => {
  const { event, data } = req.body;
  
  switch (event) {
    case 'track.generated':
      // Обработка завершения генерации
      console.log('Track generated:', data.track_id);
      break;
    case 'artist.created':
      // Обработка создания артиста
      console.log('Artist created:', data.artist_id);
      break;
  }
  
  res.status(200).send('OK');
});
```

## 📚 SDK и библиотеки

### JavaScript/TypeScript

```bash
npm install @supabase/supabase-js
```

### React Hook

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const useArtists = (userId: string) => {
  return useQuery({
    queryKey: ['artists', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('artists')
        .select('*')
        .eq('user_id', userId);
      
      if (error) throw error;
      return data;
    }
  });
};
```

---

## 📞 Поддержка

- **Документация**: [docs.aimusicplatform.com](https://docs.aimusicplatform.com)
- **Email**: api@aimusicplatform.com
- **GitHub Issues**: [github.com/username/ai-music-platform/issues](https://github.com/username/ai-music-platform/issues)

**Версия документации**: 1.0.0 | **Последнее обновление**: 2024-07-31