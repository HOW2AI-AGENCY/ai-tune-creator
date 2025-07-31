# 🔌 API документация

> **Подробное описание API эндпоинтов AI Music Platform**

---

## 📋 **Содержание**

1. [Обзор API](#обзор-api)
2. [Аутентификация](#аутентификация)
3. [REST эндпоинты](#rest-эндпоинты)
4. [RPC функции](#rpc-функции)
5. [WebSocket события](#websocket-события)
6. [Коды ошибок](#коды-ошибок)

---

## 🎯 **Обзор API**

AI Music Platform предоставляет несколько типов API:

- **Supabase REST API** - основные CRUD операции
- **RPC функции** - сложная бизнес-логика  
- **Edge Functions** - AI интеграции и обработка
- **Realtime API** - WebSocket события

### **Базовый URL**
```
https://zwbhlfhwymbmvioaikvs.supabase.co/rest/v1/
```

### **Заголовки запросов**
```http
Authorization: Bearer {jwt_token}
apikey: {supabase_anon_key}
Content-Type: application/json
Prefer: return=representation
```

---

## 🔐 **Аутентификация**

### **Регистрация**
```typescript
// POST /auth/v1/signup
interface SignUpRequest {
  email: string;
  password: string;
  data?: {
    display_name?: string;
    avatar_url?: string;
  };
}

interface AuthResponse {
  user: User | null;
  session: Session | null;
  error?: AuthError;
}
```

### **Вход**
```typescript
// POST /auth/v1/token?grant_type=password
interface SignInRequest {
  email: string;
  password: string;
}
```

### **Выход**
```typescript
// POST /auth/v1/logout
// Требует Authorization заголовка
```

---

## 📊 **REST эндпоинты**

### **Profiles**

#### Получить профиль пользователя
```http
GET /profiles?select=*&user_id=eq.{user_id}
```

```typescript
interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}
```

#### Обновить профиль
```http
PATCH /profiles?user_id=eq.{user_id}
Content-Type: application/json

{
  "display_name": "Новое имя",
  "bio": "Новое описание"
}
```

### **Artists**

#### Получить артистов пользователя
```http
GET /artists?select=*&user_id=eq.{user_id}&order=created_at.desc
```

```typescript
interface Artist {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}
```

#### Создать артиста
```http
POST /artists
Content-Type: application/json

{
  "name": "Название артиста",
  "description": "Описание",
  "metadata": {
    "genre": "Electronic",
    "location": "Moscow"
  }
}
```

### **Projects**

#### Получить проекты артиста
```http
GET /projects?select=*,tracks(*)&artist_id=eq.{artist_id}&order=created_at.desc
```

```typescript
interface Project {
  id: string;
  artist_id: string;
  title: string;
  description: string | null;
  type: 'album' | 'single' | 'ep';
  cover_url: string | null;
  status: 'draft' | 'published' | 'archived';
  metadata: Record<string, any>;
  tracks?: Track[];
  created_at: string;
  updated_at: string;
}
```

#### Создать проект
```http
POST /projects
Content-Type: application/json

{
  "artist_id": "uuid",
  "title": "Название проекта",
  "type": "album",
  "description": "Описание проекта"
}
```

### **Tracks**

#### Получить треки проекта
```http
GET /tracks?select=*,track_versions(*)&project_id=eq.{project_id}&order=track_number.asc
```

```typescript
interface Track {
  id: string;
  project_id: string;
  title: string;
  track_number: number;
  duration: number | null;
  audio_url: string | null;
  waveform_data: number[] | null;
  lyrics: string | null;
  metadata: Record<string, any>;
  track_versions?: TrackVersion[];
  created_at: string;
  updated_at: string;
}
```

#### Создать трек
```http
POST /tracks
Content-Type: application/json

{
  "project_id": "uuid",
  "title": "Название трека",
  "track_number": 1,
  "lyrics": "Текст песни"
}
```

### **AI Generations**

#### Получить историю генераций
```http
GET /ai_generations?select=*&user_id=eq.{user_id}&order=created_at.desc&limit=20
```

```typescript
interface AIGeneration {
  id: string;
  user_id: string;
  track_id: string | null;
  service: 'suno' | 'mureka' | 'openai';
  prompt: string;
  parameters: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result_url: string | null;
  error_message: string | null;
  external_id: string | null;
  created_at: string;
  completed_at: string | null;
}
```

---

## ⚡ **RPC функции**

### **get_user_stats**
```sql
SELECT get_user_stats(user_id UUID)
```

```typescript
interface UserStats {
  total_projects: number;
  total_tracks: number;
  total_generations: number;
  recent_activity: ActivityItem[];
}
```

**Пример вызова:**
```typescript
const { data, error } = await supabase
  .rpc('get_user_stats', { user_id: user.id });
```

### **search_content**
```sql
SELECT search_content(
  query TEXT,
  content_type TEXT DEFAULT 'all',
  user_id UUID DEFAULT NULL
)
```

```typescript
interface SearchResult {
  type: 'project' | 'track' | 'artist';
  id: string;
  title: string;
  description: string;
  url: string;
  metadata: Record<string, any>;
}
```

**Пример вызова:**
```typescript
const { data, error } = await supabase
  .rpc('search_content', { 
    query: 'electronic music',
    content_type: 'track',
    user_id: user.id 
  });
```

### **generate_ai_track**
```sql
SELECT generate_ai_track(
  project_id UUID,
  prompt TEXT,
  service TEXT DEFAULT 'suno',
  parameters JSONB DEFAULT '{}'::jsonb
)
```

**Пример вызова:**
```typescript
const { data, error } = await supabase
  .rpc('generate_ai_track', {
    project_id: project.id,
    prompt: 'Upbeat electronic track with synthesizers',
    service: 'suno',
    parameters: {
      genre: 'electronic',
      mood: 'energetic',
      duration: 120
    }
  });
```

---

## 🌐 **Edge Functions**

### **generate-track**
```http
POST /functions/v1/generate-track
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "project_id": "uuid",
  "prompt": "Описание трека",
  "service": "suno",
  "parameters": {
    "genre": "electronic",
    "mood": "energetic",
    "duration": 120
  }
}
```

**Ответ:**
```typescript
interface GenerateTrackResponse {
  generation_id: string;
  status: 'pending';
  estimated_time: number; // секунды
}
```

### **check-generation-status**
```http
GET /functions/v1/check-generation-status?generation_id={id}
Authorization: Bearer {jwt_token}
```

**Ответ:**
```typescript
interface GenerationStatusResponse {
  generation_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number; // 0-100
  result_url?: string;
  error_message?: string;
}
```

### **process-audio**
```http
POST /functions/v1/process-audio
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data

{
  "file": File,
  "track_id": "uuid",
  "operations": ["normalize", "generate_waveform"]
}
```

---

## 🔴 **WebSocket события**

### **Подключение**
```typescript
import { supabase } from '@/integrations/supabase/client';

// Подписка на изменения генераций
const subscription = supabase
  .channel('ai_generations')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'ai_generations',
    filter: `user_id=eq.${user.id}`
  }, (payload) => {
    console.log('Generation updated:', payload.new);
  })
  .subscribe();
```

### **События**

#### **generation_updated**
```typescript
interface GenerationUpdateEvent {
  event: 'generation_updated';
  data: {
    generation_id: string;
    status: GenerationStatus;
    progress?: number;
    result_url?: string;
    error_message?: string;
  };
}
```

#### **track_processed**
```typescript
interface TrackProcessedEvent {
  event: 'track_processed';
  data: {
    track_id: string;
    audio_url: string;
    waveform_data: number[];
    duration: number;
  };
}
```

---

## ❌ **Коды ошибок**

### **HTTP статусы**

| Код | Значение | Описание |
|-----|----------|----------|
| 200 | OK | Успешный запрос |
| 201 | Created | Ресурс создан |
| 400 | Bad Request | Неверный запрос |
| 401 | Unauthorized | Не авторизован |
| 403 | Forbidden | Доступ запрещен |
| 404 | Not Found | Ресурс не найден |
| 409 | Conflict | Конфликт данных |
| 422 | Unprocessable Entity | Ошибка валидации |
| 429 | Too Many Requests | Превышен лимит запросов |
| 500 | Internal Server Error | Внутренняя ошибка |

### **Пользовательские ошибки**

```typescript
interface APIError {
  code: string;
  message: string;
  details?: Record<string, any>;
}
```

#### **Ошибки аутентификации**
- `AUTH_USER_NOT_FOUND` - Пользователь не найден
- `AUTH_INVALID_CREDENTIALS` - Неверные учетные данные
- `AUTH_TOKEN_EXPIRED` - Токен истек

#### **Ошибки валидации**
- `VALIDATION_REQUIRED_FIELD` - Обязательное поле не заполнено
- `VALIDATION_INVALID_FORMAT` - Неверный формат данных
- `VALIDATION_VALUE_TOO_LONG` - Значение слишком длинное

#### **Ошибки AI генерации**
- `AI_SERVICE_UNAVAILABLE` - AI сервис недоступен
- `AI_GENERATION_FAILED` - Ошибка генерации
- `AI_QUOTA_EXCEEDED` - Превышена квота

#### **Ошибки файлов**
- `FILE_TOO_LARGE` - Файл слишком большой
- `FILE_INVALID_FORMAT` - Неподдерживаемый формат
- `STORAGE_QUOTA_EXCEEDED` - Превышена квота хранилища

---

## 📊 **Лимиты и ограничения**

### **Лимиты запросов**
- **REST API**: 100 запросов/минуту на пользователя
- **RPC функции**: 50 запросов/минуту на пользователя  
- **Edge Functions**: 20 запросов/минуту на пользователя

### **Лимиты данных**
- **Размер запроса**: 10 MB
- **Размер ответа**: 50 MB
- **Время ожидания**: 30 секунд

### **Лимиты файлов**
- **Максимальный размер аудио**: 100 MB
- **Поддерживаемые форматы**: MP3, WAV, FLAC, OGG
- **Квота хранилища**: 1 GB на пользователя

---

## 🧪 **Тестирование API**

### **Постман коллекция**
```json
{
  "info": {
    "name": "AI Music Platform API",
    "version": "1.0.0"
  },
  "auth": {
    "type": "bearer",
    "bearer": {
      "token": "{{jwt_token}}"
    }
  },
  "variable": [
    {
      "key": "base_url",
      "value": "https://zwbhlfhwymbmvioaikvs.supabase.co"
    },
    {
      "key": "apikey",
      "value": "{{supabase_anon_key}}"
    }
  ]
}
```

### **Примеры cURL**

```bash
# Получить профиль пользователя
curl -X GET \
  "https://zwbhlfhwymbmvioaikvs.supabase.co/rest/v1/profiles?user_id=eq.{user_id}" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "apikey: {supabase_anon_key}"

# Создать проект
curl -X POST \
  "https://zwbhlfhwymbmvioaikvs.supabase.co/rest/v1/projects" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "apikey: {supabase_anon_key}" \
  -H "Content-Type: application/json" \
  -d '{
    "artist_id": "uuid",
    "title": "My Album",
    "type": "album"
  }'
```

---

**Документация обновлена:** `2025-07-31 15:30`  
**Версия API:** `v1.0.0`