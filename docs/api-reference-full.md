# Полная документация API - AI Music Generation

## Обзор системы

Система интегрирует два основных AI сервиса для генерации музыки:
- **Suno AI** - полные песни с вокалом
- **Mureka AI** - креативные композиции и инструментальная музыка

## Suno AI API v1

### Базовая информация
- **Base URL**: `https://api.sunoapi.org`
- **Аутентификация**: Bearer Token в заголовке `Authorization`
- **Формат данных**: JSON

### Доступные модели

| Модель | Описание | Макс. длительность | Особенности |
|--------|----------|-------------------|-------------|
| `V3_5` | Стабильная модель с хорошим качеством | 4 минуты | Базовая модель |
| `V4` | Улучшенное качество вокала | 4 минуты | Лучший вокал |
| `V4_5` | Продвинутые промпты, быстрая генерация | 8 минут | Умные промпты |
| `V4_5PLUS` | Премиум модель с максимальными возможностями | 8 минут | Топовое качество |

> UI: выбор модели доступен в GenerationContextPanel и в UnifiedGenerationSidebar. Значение `auto` маппится на `V3_5` по умолчанию.

### Эндпоинты

#### 1. Генерация музыки
```
POST /api/v1/generate
```

**Параметры запроса:**
```json
{
  "prompt": "string", // Описание или лирика (макс 3000-5000 символов)
  "style": "string", // Стиль музыки (макс 200-1000 символов)
  "title": "string", // Название трека (макс 80 символов)
  "customMode": boolean, // true для кастомного режима
  "instrumental": boolean, // true для инструментальной музыки
  "model": "V3_5" | "V4" | "V4_5" | "V4_5PLUS",
  "negativeTags": "string", // Исключения стилей
  "vocalGender": "m" | "f", // Пол вокала
  "styleWeight": 0.65, // Вес стиля (0.00-1.00)
  "weirdnessConstraint": 0.65, // Ограничение креативности (0.00-1.00)
  "audioWeight": 0.65, // Вес входного аудио (0.00-1.00)
  "callBackUrl": "https://api.example.com/callback"
}
```

**Ответ:**
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "5c79****be8e"
  }
}
```

#### 2. Получение кредитов
```
GET /api/v1/generate/credit
```

**Ответ:**
```json
{
  "code": 200,
  "msg": "success",
  "data": 100 // количество кредитов
}
```

#### 3. Расширение трека
```
POST /api/v1/generate/extend
```

**Параметры:**
```json
{
  "defaultParamFlag": true,
  "audioId": "5c79****be8e",
  "prompt": "string",
  "style": "string", 
  "title": "string",
  "continueAt": 60, // секунда для продолжения
  "model": "V3_5",
  "callBackUrl": "https://api.example.com/callback"
}
```

### Коды статусов

| Код | Описание |
|-----|----------|
| 200 | Успешно |
| 400 | Неверные параметры |
| 401 | Ошибка аутентификации |
| 404 | Неверный метод или путь |
| 405 | Превышен лимит запросов |
| 413 | Промпт слишком длинный |
| 429 | Недостаточно кредитов |
| 430 | Слишком частые вызовы |
| 455 | Техническое обслуживание |
| 500 | Ошибка сервера |

## Mureka AI API v1

### Базовая информация
- **Base URL**: `https://api.mureka.ai`
- **Аутентификация**: Bearer Token в заголовке `Authorization`
- **Модели**: V7, O1, V6

### Основные эндпоинты

#### 1. Генерация песни
```
POST /v1/song/generate
```

#### 2. Генерация инструментальной музыки
```
POST /v1/instrumental/generate
```

#### 3. Генерация лирики
```
POST /v1/lyrics/generate
```

#### 4. Статус задачи
```
GET /v1/song/query/{task_id}
```

#### 5. Баланс аккаунта
```
GET /v1/account/billing
```

**Ответ:**
```json
{
  "account_id": 81403406581761,
  "balance": 2930, // в центах
  "total_recharge": 3000,
  "total_spending": 69,
  "concurrent_request_limit": 1
}
```

## Unified Generation API (Внутренний)

### Edge Functions

#### generate-suno-track
**Путь**: `supabase/functions/generate-suno-track`

**Входные параметры:**
```typescript
interface SunoGenerationRequest {
  prompt: string;
  style?: string;
  title?: string;
  tags?: string;
  make_instrumental?: boolean;
  wait_audio?: boolean;
  model?: 'V3_5' | 'V4' | 'V4_5' | 'V4_5PLUS';
  mode?: 'quick' | 'custom';
  custom_lyrics?: string;
  voice_style?: string;
  trackId?: string;
  projectId?: string;
  artistId?: string;
}
```

#### generate-mureka-track
**Путь**: `supabase/functions/generate-mureka-track`

#### check-suno-status
**Путь**: `supabase/functions/check-suno-status`

#### check-mureka-status  
**Путь**: `supabase/functions/check-mureka-status`

## Canonical Input System

### CanonicalGenerationInput
```typescript
interface CanonicalGenerationInput {
  description: string;
  lyrics?: string;
  tags: string[];
  flags: {
    instrumental: boolean;
    language?: string;
    voiceStyle?: string;
    tempo?: string;
    duration?: number;
    model?: string;
  };
  mode: 'quick' | 'custom';
  inputType: 'description' | 'lyrics';
  context: {
    projectId?: string;
    artistId?: string;
    useInbox?: boolean;
  };
  service: 'suno' | 'mureka';
}
```

## Форматы ответов

### UnifiedTaskProgress
```typescript
interface UnifiedTaskProgress {
  id: string;
  title: string;
  service: 'suno' | 'mureka';
  status: 'queued' | 'generating' | 'completed' | 'failed' | 'timeout';
  overallProgress: number;
  steps: TaskStep[];
  error?: string;
  result?: {
    trackId?: string;
    audioUrl?: string;
    metadata?: any;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### TaskStep
```typescript
interface TaskStep {
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message?: string;
  estimatedTime?: number;
}
```

## Системы мониторинга

### AIServiceStatus
```typescript
interface ServiceStatus {
  service: 'suno' | 'mureka';
  status: 'online' | 'offline' | 'limited' | 'checking';
  creditsRemaining?: number;
  creditsTotal?: number;
  rateLimit?: {
    remaining: number;
    resetTime: Date;
  };
  lastChecked: Date;
  error?: string;
}
```

## Обработка ошибок

### Коды ошибок системы

| Тип | Код | Описание | Решение |
|-----|-----|----------|---------|
| VALIDATION_ERROR | 400 | Неверные параметры | Проверить входные данные |
| AUTH_ERROR | 401 | Ошибка аутентификации | Проверить API ключи |
| RATE_LIMIT | 429 | Превышен лимит | Подождать или увеличить лимиты |
| INSUFFICIENT_CREDITS | 429 | Недостаточно кредитов | Пополнить баланс |
| TIMEOUT_ERROR | 408 | Таймаут | Повторить запрос |
| SERVER_ERROR | 500 | Ошибка сервера | Связаться с поддержкой |

### Retry логика
- Автоматические повторы для кодов 5xx
- Экспоненциальная задержка: 1s, 2s, 4s, 8s
- Максимум 3 попытки
- Таймаут: 120 секунд для генерации

## Лимиты и ограничения

### Suno AI
- Промпт: 400-5000 символов (зависит от модели)
- Стиль: 200-1000 символов
- Название: 80 символов
- Длительность: 4-8 минут (зависит от модели)

### Mureka AI
- Промпт: 2000 символов
- Длительность: 5-300 секунд
- Поддерживаемые форматы: MP3, M4A, MIDI

## Environment Variables

### Supabase Secrets
```bash
# Suno API
SUNOAPI_ORG_TOKEN=your_suno_token
SUNO_API_TOKEN=your_suno_alt_token

# Mureka API  
MUREKA_API_KEY=your_mureka_key

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

## Примеры использования

### Генерация через Suno
```typescript
const input: CanonicalGenerationInput = {
  description: "Спокойная пианино мелодия с элементами джаза",
  tags: ["jazz", "piano", "relaxing"],
  flags: {
    instrumental: false,
    language: "ru",
    model: "V4_5PLUS",
    duration: 180
  },
  mode: "custom",
  inputType: "description",
  context: { useInbox: true },
  service: "suno"
};

const result = await generateTrack(input);
```

### Мониторинг статуса
```typescript
const { services } = useAIServiceStatus();
const sunoStatus = services.find(s => s.service === 'suno');

if (sunoStatus?.status === 'online') {
  console.log(`Suno доступен, кредитов: ${sunoStatus.creditsRemaining}`);
}
```

## Changelog

### v1.2.0 (2025-01-20)
- ✅ Добавлена поддержка Suno V4.5+
- ✅ Исправлена нормализация моделей 
- ✅ Улучшена обработка ошибок
- ✅ Обновлены лимиты API

### v1.1.0 (2025-01-15)
- ✅ Унификация системы генерации
- ✅ Добавлен мониторинг статуса сервисов
- ✅ Система канонических входных данных

### v1.0.0 (2025-01-10)
- ✅ Первоначальная реализация
- ✅ Интеграция Suno и Mureka API
- ✅ Базовая система генерации