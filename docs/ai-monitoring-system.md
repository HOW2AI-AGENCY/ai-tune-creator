# Система мониторинга AI сервисов

## Обзор системы

Система мониторинга статуса AI сервисов предназначена для отслеживания доступности и баланса кредитов двух основных AI сервисов: **Suno AI** и **Mureka**. Система работает в реальном времени, обновляя статусы каждые 30 секунд.

## Архитектура системы

### 1. Frontend компоненты

#### useAIServiceStatus Hook
**Файл:** `src/hooks/useAIServiceStatus.tsx`

**Назначение:** Центральный хук для управления состоянием статусов AI сервисов

**Основные функции:**
- Автоматическое обновление статусов каждые 30 секунд
- Проверка статуса через Supabase Edge Functions
- Управление состояниями загрузки

**Интерфейс ServiceStatus:**
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

#### AIServiceStatusPanel Component
**Файл:** `src/features/ai-generation/components/AIServiceStatusPanel.tsx`

**Назначение:** UI компонент для отображения статуса сервисов

**Особенности:**
- Поддержка компактного и полного режимов отображения
- Цветовая индикация статусов (зеленый - онлайн, красный - оффлайн, желтый - ограничено)
- Отображение баланса кредитов и лимитов запросов
- Кнопка обновления статуса

### 2. Backend Edge Functions

#### check-suno-status Function
**Файл:** `supabase/functions/check-suno-status/index.ts`

**API Endpoint:** `https://api.sunoapi.org/api/v1/generate/credit`

**Метод:** GET

**Headers:**
```
Authorization: Bearer {SUNOAPI_ORG_TOKEN}
Content-Type: application/json
```

**Формат ответа Suno API:**
```json
{
  "code": 200,
  "msg": "success", 
  "data": 483.2
}
```

**Логика определения статуса:**
- `online`: кредитов > 5
- `limited`: кредитов ≤ 5 или ≤ 0
- `offline`: ошибка API или неверный ключ

**Environment Variable:** `SUNOAPI_ORG_TOKEN`

#### check-mureka-status Function
**Файл:** `supabase/functions/check-mureka-status/index.ts`

**API Endpoint:** `https://api.mureka.ai/v1/account/billing`

**Метод:** GET

**Headers:**
```
Authorization: Bearer {MUREKA_API_KEY}
Content-Type: application/json
```

**Формат ответа Mureka API:**
```json
{
  "account_id": 81403406581761,
  "balance": 2930,
  "total_recharge": 3000,
  "total_spending": 69,
  "concurrent_request_limit": 1
}
```

**Особенности обработки:**
- Баланс приходит в центах, конвертируется в доллары (/100)
- `creditsRemaining` = balance / 100
- `creditsTotal` = total_recharge / 100

**Логика определения статуса:**
- `online`: баланс > $1.00
- `limited`: баланс ≤ $1.00 или ≤ $0.00
- `offline`: ошибка API или неверный ключ

**Environment Variable:** `MUREKA_API_KEY`

## Коды статусов и их значения

### Статусы сервисов:

1. **online** (Онлайн)
   - Сервис доступен
   - Достаточно кредитов для работы
   - Цвет: зеленый

2. **limited** (Ограничено)
   - Сервис доступен, но мало кредитов
   - Превышен лимит запросов
   - Цвет: желтый

3. **offline** (Оффлайн)
   - Сервис недоступен
   - Неверный API ключ
   - Серверная ошибка
   - Цвет: красный

4. **checking** (Проверка)
   - Выполняется запрос к API
   - Временное состояние
   - Цвет: серый с анимацией

### HTTP коды ошибок:

**Suno API:**
- 200: Успешный запрос
- 401: Неверный API ключ
- 429: Превышен лимит запросов
- 500+: Серверная ошибка

**Mureka API:**
- 200: Успешный запрос
- 401: Неверный API ключ
- 429: Превышен лимит запросов
- 500+: Серверная ошибка

## Настройка Environment Variables

### В Supabase Secrets:

1. **SUNOAPI_ORG_TOKEN**
   - Получить на: https://sunoapi.org/api-key
   - Формат: строка длиной ~32 символа
   - Используется в Edge Function `check-suno-status`

2. **MUREKA_API_KEY**
   - Получить в панели управления Mureka
   - Формат: строка длиной ~34 символа
   - Используется в Edge Function `check-mureka-status`

## Логирование и отладка

### Console логи в Edge Functions:

**Suno Status Function:**
```
- "Checking Suno API with endpoint: https://api.sunoapi.org/api/v1/generate/credit"
- "Using API key length: 32"
- "Suno API Response: { code: 200, msg: 'success', data: 483.2 }"
- "Suno status check result: { status: 'online', creditsRemaining: 483.2, ... }"
```

**Mureka Status Function:**
```
- "Checking Mureka API with endpoint: https://api.mureka.ai/v1/account/billing"
- "Using API key length: 34"
- "Mureka API Response: { account_id: 81403406581761, balance: 2930, ... }"
- "Mureka status check result: { status: 'online', creditsRemaining: 29.3, ... }"
```

## Интеграция в приложении

### Использование в компонентах:

```typescript
import { useAIServiceStatus } from '@/hooks/useAIServiceStatus';

function MyComponent() {
  const { services, isLoading, refreshStatuses } = useAIServiceStatus();

  const sunoService = services.find(s => s.service === 'suno');
  const murekaService = services.find(s => s.service === 'mureka');

  return (
    <div>
      Suno статус: {sunoService?.status}
      Mureka кредиты: {murekaService?.creditsRemaining}
    </div>
  );
}
```

### Добавление панели статуса:

```typescript
import { AIServiceStatusPanel } from '@/features/ai-generation/components/AIServiceStatusPanel';

// Полная панель
<AIServiceStatusPanel />

// Компактная панель
<AIServiceStatusPanel compact />
```

## Устранение неполадок

### Типичные проблемы:

1. **Статус "offline" при валидных ключах**
   - Проверить правильность эндпоинтов API
   - Проверить Environment Variables в Supabase
   - Посмотреть логи Edge Functions

2. **Ошибка CORS**
   - Убедиться что corsHeaders правильно настроены
   - Проверить обработку OPTIONS запросов

3. **Неправильное отображение кредитов**
   - Для Mureka: проверить конвертацию из центов в доллары
   - Для Suno: проверить парсинг поля `data`

### Мониторинг через Supabase:

1. **Edge Function Logs:**
   - Путь: Project → Functions → function-name → Logs
   - Посмотреть последние вызовы и ошибки

2. **Secrets Management:**
   - Путь: Project → Settings → Functions
   - Проверить наличие и валидность API ключей

## Расширение системы

### Добавление нового AI сервиса:

1. Создать новую Edge Function `check-{service}-status`
2. Добавить сервис в enum `useAIServiceStatus` 
3. Обновить UI компоненты для поддержки нового сервиса
4. Добавить соответствующие Environment Variables

### Настройка интервалов обновления:

В `useAIServiceStatus.tsx` изменить значение:
```typescript
const interval = setInterval(refreshStatuses, 30000); // 30 секунд
```

## Компоненты системы мониторинга

### AIServiceStatusBanner
**Файл:** `src/components/ai-generation/AIServiceStatusBanner.tsx`
- Баннер статуса для основных страниц
- Отображение критических проблем
- Интеграция с системой уведомлений

### UnifiedGenerationControls  
**Файл:** `src/components/ai-generation/UnifiedGenerationControls.tsx`
- Единые элементы управления генерацией
- Интеграция со статусом сервисов
- Блокировка при недоступности сервисов

### TaskQueuePanel
**Файл:** `src/components/ai-generation/TaskQueuePanel.tsx`
- Панель очереди задач
- Мониторинг выполнения запросов
- Статистика использования

Эта документация покрывает все аспекты системы мониторинга AI сервисов, включая правильные эндпоинты, форматы данных, обработку ошибок и интеграцию в приложении.