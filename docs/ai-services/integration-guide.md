# Руководство по интеграции AI сервисов

Пошаговое руководство по интеграции системы AI сервисов в ваш проект.

## Установка и настройка

### 1. Копирование файлов

Скопируйте директорию `src/lib/ai-services/` в ваш проект:

```bash
# Структура файлов для копирования
src/lib/ai-services/
├── core/
│   ├── api-client.ts
│   └── service-adapter.ts
├── adapters/
│   ├── suno-adapter.ts
│   ├── mureka-adapter.ts
│   └── index.ts
├── router/
│   └── service-router.ts
├── types.ts
├── base-service.ts
├── service-registry.ts
└── index.ts
```

### 2. Установка зависимостей

Убедитесь, что в вашем проекте есть необходимые зависимости:

```json
{
  "dependencies": {
    "typescript": "^5.0.0"
  }
}
```

### 3. Настройка TypeScript

Добавьте в `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true
  }
}
```

## Базовая интеграция

### 1. Создание конфигурации

```typescript
// config/ai-services.ts
export const aiServicesConfig = {
  suno: {
    apiKey: process.env.SUNO_API_KEY || '',
    baseUrl: 'https://api.sunoapi.org',
    enabled: true,
    priority: 1
  },
  mureka: {
    apiKey: process.env.MUREKA_API_KEY || '',
    baseUrl: 'https://api.mureka.ai',
    enabled: true,
    priority: 2
  }
};
```

### 2. Инициализация системы

```typescript
// services/ai-service-manager.ts
import { ServiceRouter, createSunoAdapter, createMurekaAdapter } from '@/lib/ai-services';
import { aiServicesConfig } from '@/config/ai-services';

class AIServiceManager {
  private router: ServiceRouter;
  private initialized = false;

  constructor() {
    this.router = new ServiceRouter({
      fallbackStrategy: 'queue',
      healthCheckInterval: 30000,
      maxRetries: 3,
      loadBalancing: 'best-performance'
    });
  }

  async initialize() {
    if (this.initialized) return;

    // Инициализация Suno AI
    if (aiServicesConfig.suno.enabled && aiServicesConfig.suno.apiKey) {
      const sunoAdapter = createSunoAdapter(aiServicesConfig.suno.apiKey, {
        baseUrl: aiServicesConfig.suno.baseUrl,
        timeout: 60000
      });

      this.router.registerService('suno', sunoAdapter, {
        priority: aiServicesConfig.suno.priority,
        enabled: true,
        tags: ['music-generation', 'lyrics', 'vocal-separation'],
        autoHealthCheck: true
      });
    }

    // Инициализация Mureka AI
    if (aiServicesConfig.mureka.enabled && aiServicesConfig.mureka.apiKey) {
      const murekaAdapter = createMurekaAdapter(aiServicesConfig.mureka.apiKey, {
        baseUrl: aiServicesConfig.mureka.baseUrl,
        timeout: 60000
      });

      this.router.registerService('mureka', murekaAdapter, {
        priority: aiServicesConfig.mureka.priority,
        enabled: true,
        tags: ['music-generation', 'instrumental', 'stem-separation'],
        autoHealthCheck: true
      });
    }

    this.initialized = true;
    console.log('AI Service Manager initialized');
  }

  getRouter(): ServiceRouter {
    return this.router;
  }

  async getHealthStatus() {
    return this.router.getServicesHealth();
  }

  async generateMusic(request: GenerationRequest) {
    if (!this.initialized) {
      await this.initialize();
    }

    return this.router.generate(request);
  }

  async getGenerationStatus(id: string) {
    return this.router.getStatus(id);
  }

  async cancelGeneration(id: string) {
    return this.router.cancel(id);
  }

  destroy() {
    this.router.destroy();
  }
}

// Синглтон экземпляр
export const aiServiceManager = new AIServiceManager();
```

### 3. React хуки

```typescript
// hooks/useAIServices.ts
import { useState, useEffect, useCallback } from 'react';
import { aiServiceManager } from '@/services/ai-service-manager';
import { GenerationRequest, GenerationResponse } from '@/lib/ai-services/types';

export function useAIGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);

  const generate = useCallback(async (request: GenerationRequest) => {
    setIsGenerating(true);
    setProgress(0);
    setError(null);
    setResult(null);
    setGenerationId(null);

    try {
      const generation = await aiServiceManager.generateMusic(request);
      setGenerationId(generation.id);
      
      // Начинаем опрос статуса
      pollStatus(generation.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsGenerating(false);
    }
  }, []);

  const pollStatus = useCallback(async (id: string) => {
    try {
      const status = await aiServiceManager.getGenerationStatus(id);
      setProgress(status.progress || 0);

      if (status.status === 'completed') {
        setResult(status.audioUrl || '');
        setIsGenerating(false);
      } else if (status.status === 'failed') {
        setError(status.error || 'Generation failed');
        setIsGenerating(false);
      } else if (status.status === 'processing' || status.status === 'pending') {
        // Продолжаем опрос через 3 секунды
        setTimeout(() => pollStatus(id), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status check failed');
      setIsGenerating(false);
    }
  }, []);

  const cancel = useCallback(async () => {
    if (generationId) {
      try {
        await aiServiceManager.cancelGeneration(generationId);
        setIsGenerating(false);
        setProgress(0);
      } catch (err) {
        console.error('Failed to cancel generation:', err);
      }
    }
  }, [generationId]);

  return {
    generate,
    cancel,
    isGenerating,
    progress,
    result,
    error,
    generationId
  };
}

export function useServiceHealth() {
  const [health, setHealth] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchHealth = useCallback(async () => {
    try {
      const healthStatus = await aiServiceManager.getHealthStatus();
      setHealth(healthStatus);
    } catch (error) {
      console.error('Failed to fetch service health:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    
    // Обновляем каждые 30 секунд
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  return {
    health,
    isLoading,
    refresh: fetchHealth
  };
}
```

### 4. React компоненты

```typescript
// components/MusicGenerator.tsx
import React, { useState } from 'react';
import { useAIGeneration } from '@/hooks/useAIServices';

export function MusicGenerator() {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('');
  const [duration, setDuration] = useState(30);
  
  const { generate, cancel, isGenerating, progress, result, error } = useAIGeneration();

  const handleGenerate = async () => {
    await generate({
      type: 'text-to-music',
      prompt,
      style,
      duration
    });
  };

  return (
    <div className="music-generator">
      <div className="form-group">
        <label>Описание музыки:</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Опишите какую музыку хотите создать..."
          disabled={isGenerating}
        />
      </div>

      <div className="form-group">
        <label>Стиль:</label>
        <input
          type="text"
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          placeholder="pop, rock, electronic..."
          disabled={isGenerating}
        />
      </div>

      <div className="form-group">
        <label>Длительность (секунды):</label>
        <input
          type="number"
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          min={10}
          max={300}
          disabled={isGenerating}
        />
      </div>

      <div className="actions">
        {!isGenerating ? (
          <button 
            onClick={handleGenerate}
            disabled={!prompt.trim()}
          >
            Создать музыку
          </button>
        ) : (
          <div className="generation-status">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <p>Генерация... {progress}%</p>
            <button onClick={cancel}>Отменить</button>
          </div>
        )}
      </div>

      {error && (
        <div className="error">
          Ошибка: {error}
        </div>
      )}

      {result && (
        <div className="result">
          <h3>Музыка готова!</h3>
          <audio controls src={result} />
          <a href={result} download>Скачать</a>
        </div>
      )}
    </div>
  );
}
```

```typescript
// components/ServiceHealthMonitor.tsx
import React from 'react';
import { useServiceHealth } from '@/hooks/useAIServices';

export function ServiceHealthMonitor() {
  const { health, isLoading, refresh } = useServiceHealth();

  if (isLoading) {
    return <div>Загрузка статуса сервисов...</div>;
  }

  return (
    <div className="service-health-monitor">
      <div className="header">
        <h3>Статус AI сервисов</h3>
        <button onClick={refresh}>Обновить</button>
      </div>

      <div className="services">
        {Object.entries(health).map(([serviceId, status]) => (
          <div key={serviceId} className={`service-card ${status.status}`}>
            <div className="service-name">{serviceId}</div>
            <div className="service-status">
              <span className={`status-indicator ${status.status}`} />
              {status.status}
            </div>
            
            {status.message && (
              <div className="service-message">{status.message}</div>
            )}
            
            {status.responseTime && (
              <div className="response-time">
                Время отклика: {status.responseTime}ms
              </div>
            )}
            
            {status.credits && (
              <div className="credits">
                Кредиты: {status.credits.remaining}
                {status.credits.total && ` / ${status.credits.total}`}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Интеграция с Next.js

### 1. API роуты

```typescript
// pages/api/music/generate.ts (или app/api/music/generate/route.ts)
import { NextApiRequest, NextApiResponse } from 'next';
import { aiServiceManager } from '@/services/ai-service-manager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, style, duration } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const result = await aiServiceManager.generateMusic({
      type: 'text-to-music',
      prompt,
      style,
      duration: duration || 30
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}
```

```typescript
// pages/api/music/status/[id].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { aiServiceManager } from '@/services/ai-service-manager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'ID is required' });
    }

    const status = await aiServiceManager.getGenerationStatus(id);
    res.status(200).json(status);
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}
```

### 2. App Router (Next.js 13+)

```typescript
// app/api/music/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { aiServiceManager } from '@/services/ai-service-manager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, style, duration } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const result = await aiServiceManager.generateMusic({
      type: 'text-to-music',
      prompt,
      style,
      duration: duration || 30
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Интеграция с Express.js

```typescript
// server/routes/music.ts
import express from 'express';
import { aiServiceManager } from '../services/ai-service-manager';

const router = express.Router();

// Генерация музыки
router.post('/generate', async (req, res) => {
  try {
    const { prompt, style, duration } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const result = await aiServiceManager.generateMusic({
      type: 'text-to-music',
      prompt,
      style,
      duration: duration || 30
    });

    res.json(result);
  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

// Статус генерации
router.get('/status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const status = await aiServiceManager.getGenerationStatus(id);
    res.json(status);
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

// Здоровье сервисов
router.get('/health', async (req, res) => {
  try {
    const health = await aiServiceManager.getHealthStatus();
    res.json(health);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

export { router as musicRouter };
```

## Переменные окружения

Создайте файл `.env`:

```bash
# Suno AI
SUNO_API_KEY=your_suno_api_key_here

# Mureka AI  
MUREKA_API_KEY=your_mureka_api_key_here

# Опционально: кастомные базовые URL
SUNO_BASE_URL=https://api.sunoapi.org
MUREKA_BASE_URL=https://api.mureka.ai

# Настройки системы
AI_SERVICES_HEALTH_CHECK_INTERVAL=30000
AI_SERVICES_MAX_RETRIES=3
AI_SERVICES_TIMEOUT=60000
```

## Стили CSS

```css
/* styles/ai-services.css */
.music-generator {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.form-group textarea {
  height: 80px;
  resize: vertical;
}

.actions {
  margin: 20px 0;
}

.actions button {
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.actions button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.generation-status {
  text-align: center;
}

.progress-bar {
  width: 100%;
  height: 20px;
  background: #f0f0f0;
  border-radius: 10px;
  overflow: hidden;
  margin: 10px 0;
}

.progress-fill {
  height: 100%;
  background: #007bff;
  transition: width 0.3s ease;
}

.error {
  background: #f8d7da;
  color: #721c24;
  padding: 10px;
  border-radius: 4px;
  margin: 10px 0;
}

.result {
  background: #d4edda;
  color: #155724;
  padding: 20px;
  border-radius: 4px;
  margin: 20px 0;
}

.service-health-monitor {
  max-width: 800px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.services {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.service-card {
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #ddd;
}

.service-card.online {
  background: #d4edda;
  border-color: #c3e6cb;
}

.service-card.offline {
  background: #f8d7da;
  border-color: #f5c6cb;
}

.service-card.limited {
  background: #fff3cd;
  border-color: #ffeaa7;
}

.service-name {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 10px;
}

.service-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.status-indicator.online {
  background: #28a745;
}

.status-indicator.offline {
  background: #dc3545;
}

.status-indicator.limited {
  background: #ffc107;
}

.service-message,
.response-time,
.credits {
  font-size: 14px;
  color: #666;
  margin-bottom: 5px;
}
```

## Отладка и мониторинг

### 1. Логирование

```typescript
// utils/logger.ts
class Logger {
  static info(message: string, data?: any) {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data || '');
  }

  static error(message: string, error?: any) {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error || '');
  }

  static warn(message: string, data?: any) {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, data || '');
  }
}

// Добавьте в ai-service-manager.ts
Logger.info('AI Service Manager initialized', {
  services: Object.keys(this.router.getServicesHealth())
});
```

### 2. Метрики

```typescript
// utils/metrics.ts
class MetricsCollector {
  private metrics = new Map<string, number>();

  increment(metric: string, value = 1) {
    const current = this.metrics.get(metric) || 0;
    this.metrics.set(metric, current + value);
  }

  getMetrics() {
    return Object.fromEntries(this.metrics);
  }

  reset() {
    this.metrics.clear();
  }
}

export const metrics = new MetricsCollector();

// Использование в коде
metrics.increment('music_generations_started');
metrics.increment('suno_api_calls');
```

Теперь у вас есть полная система для интеграции AI сервисов в любой проект!