# AI Services Integration Documentation

Модульная система для интеграции с различными AI сервисами генерации музыки, разработанная для переиспользования в различных проектах.

## Содержание

1. [Архитектура системы](#архитектура-системы)
2. [Быстрый старт](#быстрый-старт)
3. [API клиент](#api-клиент)
4. [Адаптеры сервисов](#адаптеры-сервисов)
5. [Маршрутизация запросов](#маршрутизация-запросов)
6. [Мониторинг и метрики](#мониторинг-и-метрики)
7. [Примеры использования](#примеры-использования)
8. [Расширение системы](#расширение-системы)

## Архитектура системы

Система построена на модульной архитектуре с четким разделением ответственности:

```
src/lib/ai-services/
├── core/
│   ├── api-client.ts          # Базовый HTTP клиент
│   └── service-adapter.ts     # Базовый класс для адаптеров
├── adapters/
│   ├── suno-adapter.ts        # Адаптер для Suno AI
│   ├── mureka-adapter.ts      # Адаптер для Mureka AI
│   └── index.ts               # Экспорт адаптеров
├── router/
│   └── service-router.ts      # Маршрутизация и балансировка
├── types.ts                   # Общие типы
├── base-service.ts            # Базовая реализация
├── service-registry.ts        # Реестр сервисов
└── index.ts                   # Главный экспорт
```

### Основные компоненты

- **APIClient**: Низкоуровневый HTTP клиент с автоматическими повторами, обработкой ошибок и rate limiting
- **ServiceAdapter**: Базовый класс для создания адаптеров к конкретным AI сервисам
- **ServiceRouter**: Интеллектуальная маршрутизация запросов между доступными сервисами
- **ServiceRegistry**: Управление зарегистрированными сервисами

## Быстрый старт

### Установка

```typescript
import { ServiceRouter, createSunoAdapter, createMurekaAdapter } from '@/lib/ai-services';
```

### Базовая настройка

```typescript
// Создание роутера
const router = new ServiceRouter({
  fallbackStrategy: 'queue',
  healthCheckInterval: 30000,
  maxRetries: 3,
  loadBalancing: 'best-performance'
});

// Регистрация сервисов
const sunoAdapter = createSunoAdapter('your-suno-api-key');
const murekaAdapter = createMurekaAdapter('your-mureka-api-key');

router.registerService('suno', sunoAdapter, {
  priority: 1,
  weight: 1,
  enabled: true,
  tags: ['music-generation', 'lyrics']
});

router.registerService('mureka', murekaAdapter, {
  priority: 2,
  weight: 1,
  enabled: true,
  tags: ['music-generation', 'instrumental']
});

// Генерация музыки
const result = await router.generate({
  type: 'text-to-music',
  prompt: 'Upbeat electronic dance music with heavy bass',
  style: 'electronic',
  duration: 120
});

console.log('Generation started:', result.id);

// Проверка статуса
const status = await router.getStatus(result.id);
console.log('Status:', status.status);
```

## API клиент

### Основные возможности

- Автоматические повторы при ошибках
- Rate limiting и обработка лимитов API
- Поддержка потоковой передачи данных
- Загрузка файлов
- Таймауты и отмена запросов

### Пример использования

```typescript
import { APIClient } from '@/lib/ai-services/core/api-client';

const client = new APIClient({
  baseUrl: 'https://api.example.com',
  apiKey: 'your-api-key',
  timeout: 30000,
  retries: 3
});

// GET запрос
const response = await client.get('/endpoint');

// POST запрос с данными
const result = await client.post('/generate', {
  prompt: 'Generate music',
  style: 'rock'
});

// Загрузка файла
const uploadResult = await client.uploadFile('/upload', file, {
  fileName: 'track.mp3',
  additionalFields: { 
    category: 'music' 
  }
});

// Потоковая передача
for await (const chunk of client.stream('/stream-endpoint')) {
  console.log('Received chunk:', chunk);
}
```

### Обработка ошибок

```typescript
try {
  const response = await client.get('/endpoint');
} catch (error) {
  if (error instanceof APIError) {
    console.log('API Error:', error.status, error.message);
    console.log('Retryable:', error.retryable);
    console.log('Response:', error.response);
  }
}
```

## Адаптеры сервисов

### Создание собственного адаптера

```typescript
import { ServiceAdapter, ServiceAdapterConfig, HealthCheckResult } from '@/lib/ai-services/core/service-adapter';
import { GenerationRequest, GenerationResponse, AIServiceCapabilities } from '@/lib/ai-services/types';

export class CustomServiceAdapter extends ServiceAdapter {
  readonly capabilities: AIServiceCapabilities = {
    supportedFormats: ['mp3', 'wav'],
    maxDuration: 300,
    supportedLanguages: ['en', 'es'],
    features: {
      textToMusic: true,
      styleTransfer: false,
      voiceCloning: false,
      instrumentSeparation: false,
      mastering: false,
      realTimeGeneration: false
    }
  };

  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    const validation = this.validateRequest(request);
    if (!validation.valid) {
      throw new Error(`Invalid request: ${validation.errors.join(', ')}`);
    }

    try {
      const response = await this.post('/generate', {
        prompt: request.prompt,
        style: request.style,
        duration: request.duration
      });

      return {
        id: response.data.taskId,
        status: 'pending',
        metadata: {
          created_at: Date.now(),
          model: 'default'
        },
        progress: 0
      };
    } catch (error) {
      throw this.handleError(error, 'generation');
    }
  }

  async getStatus(generationId: string): Promise<GenerationResponse> {
    const response = await this.get(`/status/${generationId}`);
    
    return {
      id: generationId,
      status: response.data.status,
      audioUrl: response.data.audioUrl,
      progress: response.data.progress || 0,
      metadata: {
        duration: response.data.duration,
        format: 'mp3'
      }
    };
  }

  async cancel(generationId: string): Promise<boolean> {
    try {
      await this.post(`/cancel/${generationId}`);
      return true;
    } catch {
      return false;
    }
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const response = await this.get('/health');
      const responseTime = Date.now() - startTime;

      return {
        healthy: response.data.status === 'ok',
        status: 'online',
        responseTime,
        credits: {
          remaining: response.data.credits
        }
      };
    } catch (error) {
      return {
        healthy: false,
        status: 'offline',
        message: error.message,
        responseTime: Date.now() - startTime
      };
    }
  }
}

// Фабричная функция
export function createCustomAdapter(apiKey: string): CustomServiceAdapter {
  return new CustomServiceAdapter({
    apiKey,
    name: 'Custom Service',
    version: '1.0',
    baseUrl: 'https://api.custom-service.com'
  });
}
```

### Suno AI адаптер

```typescript
import { createSunoAdapter } from '@/lib/ai-services/adapters/suno-adapter';

const suno = createSunoAdapter('your-suno-api-key');

// Генерация музыки
const result = await suno.generate({
  type: 'text-to-music',
  prompt: 'Relaxing piano melody',
  model: 'V4_5',
  duration: 120,
  make_instrumental: false
});

// Расширение трека
const extension = await suno.extendTrack('audio-id', {
  continueAt: 60,
  prompt: 'Add drums and bass',
  model: 'V4_5'
});

// Генерация текста
const lyrics = await suno.generateLyrics('Write a song about friendship');

// Конвертация в WAV
const wavTask = await suno.convertToWav('audio-id');

// Разделение вокала
const vocalTask = await suno.separateVocals('audio-id');
```

### Mureka AI адаптер

```typescript
import { createMurekaAdapter } from '@/lib/ai-services/adapters/mureka-adapter';

const mureka = createMurekaAdapter('your-mureka-api-key');

// Генерация инструментальной музыки
const instrumental = await mureka.generateInstrumental({
  prompt: 'Electronic ambient music',
  style: 'ambient',
  duration: 180
});

// Расширение с загрузкой файла
const extension = await mureka.extendTrack(audioFile, {
  prompt: 'Add more energy',
  duration: 60
});

// Разделение стемов
const stems = await mureka.separateStems(audioFile, 'vocals');
```

## Маршрутизация запросов

### Стратегии маршрутизации

#### Best Performance (по умолчанию)
Выбирает сервис на основе здоровья, времени отклика и успешности выполнения:

```typescript
const router = new ServiceRouter({
  loadBalancing: 'best-performance'
});

const result = await router.generate(request, {
  strategy: 'best-performance'
});
```

#### Lowest Cost
Выбирает самый дешевый доступный сервис:

```typescript
const result = await router.generate(request, {
  strategy: 'lowest-cost',
  maxCost: 0.50
});
```

#### Fastest
Выбирает сервис с наименьшим временем отклика:

```typescript
const result = await router.generate(request, {
  strategy: 'fastest'
});
```

#### Round Robin
Равномерно распределяет запросы между сервисами:

```typescript
const result = await router.generate(request, {
  strategy: 'round-robin'
});
```

### Фильтрация сервисов

```typescript
const result = await router.generate(request, {
  excludeServices: ['slow-service'],
  requiredTags: ['music-generation'],
  maxCost: 1.00
});
```

### Создание собственной стратегии

```typescript
import { RouterStrategy, GenerationRequest } from '@/lib/ai-services/types';

class CustomStrategy implements RouterStrategy {
  name = 'custom-strategy';

  selectService(request: GenerationRequest, services: any[]): any {
    // Ваша логика выбора сервиса
    return services.find(service => 
      service.tags.includes('preferred') && 
      service.adapter.getLastHealthCheck()?.healthy
    ) || services[0];
  }
}

router.registerStrategy('custom', new CustomStrategy());
```

## Мониторинг и метрики

### Проверка здоровья сервисов

```typescript
const healthStatus = router.getServicesHealth();

console.log('Services health:', healthStatus);
/*
{
  "suno": {
    "enabled": true,
    "healthy": true,
    "status": "online",
    "message": "375.2 credits remaining",
    "responseTime": 1250,
    "credits": { "remaining": 375.2 },
    "rateLimits": { "remaining": 50, "resetTime": "2024-01-01T12:00:00Z" }
  },
  "mureka": {
    "enabled": true,
    "healthy": true,
    "status": "online",
    "message": "$29.00 balance remaining",
    "responseTime": 890,
    "credits": { "remaining": 29, "total": 30 }
  }
}
*/
```

### Автоматические проверки здоровья

```typescript
// Запуск проверок каждые 30 секунд
router.registerService('suno', sunoAdapter, {
  autoHealthCheck: true
});

// Или для отдельного адаптера
sunoAdapter.startHealthChecks(30000);

// Получение последней проверки
const lastCheck = sunoAdapter.getLastHealthCheck();
if (lastCheck?.healthy) {
  console.log('Service is healthy');
}
```

### Метрики производительности

```typescript
const metrics = await sunoAdapter.getMetrics();

console.log('Service metrics:', {
  uptime: `${metrics.uptime}%`,
  avgResponseTime: `${metrics.avgResponseTime}ms`,
  successRate: `${metrics.successRate}%`,
  errorRate: `${metrics.errorRate}%`,
  costEfficiency: metrics.costEfficiency,
  qualityScore: metrics.qualityScore
});
```

## Примеры использования

### Простая генерация музыки

```typescript
import { ServiceRouter, createSunoAdapter } from '@/lib/ai-services';

const router = new ServiceRouter();
const suno = createSunoAdapter(process.env.SUNO_API_KEY!);

router.registerService('suno', suno);

async function generateMusic() {
  try {
    const result = await router.generate({
      type: 'text-to-music',
      prompt: 'Upbeat pop song about summer vacation',
      style: 'pop',
      duration: 180
    });

    console.log('Generation started:', result.id);

    // Ожидание завершения
    let status;
    do {
      await new Promise(resolve => setTimeout(resolve, 5000));
      status = await router.getStatus(result.id);
      console.log(`Progress: ${status.progress}%`);
    } while (status.status === 'processing' || status.status === 'pending');

    if (status.status === 'completed') {
      console.log('Music generated:', status.audioUrl);
    } else {
      console.error('Generation failed:', status.error);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

### Использование с React хуком

```typescript
import { useState, useEffect } from 'react';
import { ServiceRouter } from '@/lib/ai-services';

export function useAIGeneration(router: ServiceRouter) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async (request: GenerationRequest) => {
    setIsGenerating(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      const generation = await router.generate(request);
      
      // Опрос статуса
      const pollStatus = async () => {
        const status = await router.getStatus(generation.id);
        setProgress(status.progress || 0);

        if (status.status === 'completed') {
          setResult(status.audioUrl || '');
          setIsGenerating(false);
        } else if (status.status === 'failed') {
          setError(status.error || 'Generation failed');
          setIsGenerating(false);
        } else {
          setTimeout(pollStatus, 3000);
        }
      };

      pollStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsGenerating(false);
    }
  };

  return {
    generate,
    isGenerating,
    progress,
    result,
    error
  };
}
```

### Обработка файлов

```typescript
async function processAudioFile(file: File) {
  const mureka = createMurekaAdapter(process.env.MUREKA_API_KEY!);

  // Расширение трека
  const extension = await mureka.extendTrack(file, {
    prompt: 'Add orchestral strings',
    duration: 60,
    style: 'classical'
  });

  // Разделение стемов
  const vocals = await mureka.separateStems(file, 'vocals');
  const drums = await mureka.separateStems(file, 'drums');

  return {
    extension: extension.id,
    vocals: vocals.requestId,
    drums: drums.requestId
  };
}
```

## Расширение системы

### Добавление нового сервиса

1. Создайте адаптер, наследующий от `ServiceAdapter`
2. Реализуйте все абстрактные методы
3. Определите возможности сервиса в `capabilities`
4. Создайте фабричную функцию

```typescript
// my-service-adapter.ts
export class MyServiceAdapter extends ServiceAdapter {
  readonly capabilities: AIServiceCapabilities = {
    // ... определение возможностей
  };

  // ... реализация методов
}

export function createMyServiceAdapter(apiKey: string): MyServiceAdapter {
  return new MyServiceAdapter({
    apiKey,
    name: 'My Service',
    version: '1.0',
    baseUrl: 'https://api.myservice.com'
  });
}
```

### Добавление новых стратегий маршрутизации

```typescript
class PriorityStrategy implements RouterStrategy {
  name = 'priority';

  selectService(request: GenerationRequest, services: any[]): any {
    // Выбор по приоритету с учетом здоровья
    const healthyServices = services.filter(s => 
      s.adapter.getLastHealthCheck()?.healthy
    );
    
    return healthyServices.reduce((best, current) => 
      current.priority > best.priority ? current : best
    );
  }
}

router.registerStrategy('priority', new PriorityStrategy());
```

### Интеграция с базой данных

```typescript
class DatabaseServiceRegistry {
  private router: ServiceRouter;

  constructor(router: ServiceRouter) {
    this.router = router;
  }

  async loadServicesFromDB() {
    const services = await db.select('ai_services').where('enabled', true);
    
    for (const service of services) {
      const adapter = this.createAdapter(service.type, service.config);
      this.router.registerService(service.id, adapter, service.options);
    }
  }

  private createAdapter(type: string, config: any) {
    switch (type) {
      case 'suno':
        return createSunoAdapter(config.apiKey);
      case 'mureka':
        return createMurekaAdapter(config.apiKey);
      default:
        throw new Error(`Unknown service type: ${type}`);
    }
  }
}
```

### Кэширование результатов

```typescript
class CachedServiceAdapter extends ServiceAdapter {
  private cache = new Map<string, GenerationResponse>();

  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    const cacheKey = this.getCacheKey(request);
    const cached = this.cache.get(cacheKey);
    
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }

    const result = await super.generate(request);
    this.cache.set(cacheKey, result);
    
    return result;
  }

  private getCacheKey(request: GenerationRequest): string {
    return btoa(JSON.stringify(request));
  }

  private isCacheValid(result: GenerationResponse): boolean {
    const maxAge = 24 * 60 * 60 * 1000; // 24 часа
    return (Date.now() - (result.metadata.created_at || 0)) < maxAge;
  }
}
```

## Безопасность

### Управление API ключами

```typescript
// Использование переменных окружения
const sunoAdapter = createSunoAdapter(process.env.SUNO_API_KEY!);

// Ротация ключей
adapter.updateConfig({
  apiKey: newApiKey
});

// Валидация ключей при старте
async function validateApiKeys() {
  const services = [sunoAdapter, murekaAdapter];
  
  for (const service of services) {
    const health = await service.healthCheck();
    if (!health.healthy) {
      console.error(`Invalid API key for ${service.getServiceInfo().name}`);
    }
  }
}
```

### Rate Limiting

```typescript
// Автоматическое rate limiting встроено в APIClient
const client = new APIClient({
  baseUrl: 'https://api.service.com',
  apiKey: 'key',
  // Rate limits обрабатываются автоматически
});

// Проверка лимитов
const rateLimitInfo = adapter.getRateLimitInfo('/generate');
if (rateLimitInfo && rateLimitInfo.remaining === 0) {
  console.log('Rate limit reached, waiting until:', rateLimitInfo.resetTime);
}
```

## Тестирование

### Мок адаптеры для тестов

```typescript
class MockServiceAdapter extends ServiceAdapter {
  readonly capabilities: AIServiceCapabilities = {
    supportedFormats: ['mp3'],
    maxDuration: 300,
    features: {
      textToMusic: true,
      styleTransfer: false,
      voiceCloning: false,
      instrumentSeparation: false,
      mastering: false,
      realTimeGeneration: false
    }
  };

  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    return {
      id: 'mock-id-' + Date.now(),
      status: 'completed',
      audioUrl: 'https://example.com/mock-audio.mp3',
      metadata: {
        created_at: Date.now(),
        finished_at: Date.now() + 1000,
        duration: request.duration || 30
      },
      progress: 100
    };
  }

  async getStatus(id: string): Promise<GenerationResponse> {
    return this.generate({} as any);
  }

  async cancel(id: string): Promise<boolean> {
    return true;
  }

  async healthCheck(): Promise<HealthCheckResult> {
    return {
      healthy: true,
      status: 'online',
      responseTime: 100
    };
  }
}
```

### Интеграционные тесты

```typescript
describe('AI Services Integration', () => {
  let router: ServiceRouter;

  beforeEach(() => {
    router = new ServiceRouter();
    router.registerService('mock', new MockServiceAdapter({
      apiKey: 'test',
      name: 'Mock',
      version: '1.0',
      baseUrl: 'https://mock.com'
    }));
  });

  test('should generate music successfully', async () => {
    const result = await router.generate({
      type: 'text-to-music',
      prompt: 'Test music',
      duration: 30
    });

    expect(result.id).toBeDefined();
    expect(result.status).toBe('completed');
  });

  test('should handle service failures gracefully', async () => {
    // Test failover logic
  });
});
```

Эта документация предоставляет полное руководство по использованию модульной системы AI сервисов, которая может быть легко переиспользована в различных проектах.