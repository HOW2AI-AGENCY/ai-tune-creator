# Руководство по развертыванию | AI Music Platform

## 🚀 Обзор развертывания

AI Music Platform разработана для легкого развертывания на современных облачных платформах с автоматическим CI/CD процессом.

## 🌍 Варианты развертывания

### 1. Lovable (Рекомендуется для прототипирования)

**Преимущества:**
- Мгновенное развертывание
- Автоматические обновления
- Встроенный CI/CD
- Бесплатный SSL

**Процесс:**
1. Откройте [Lovable проект](https://lovable.dev/projects/142f7309-a198-4a8a-b0e8-960d17b70681)
2. Нажмите кнопку "Publish" в правом верхнем углу
3. Выберите домен или используйте автоматический
4. Дождитесь завершения развертывания

**URL:** `https://your-project.lovable.app`

### 2. Vercel (Рекомендуется для продакшена)

**Преимущества:**
- Глобальная CDN сеть
- Автоматические превью
- Serverless функции
- Оптимизация производительности

**Установка:**
```bash
npm install -g vercel
vercel login
vercel --prod
```

**Конфигурация `vercel.json`:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "functions": {
    "app/api/**/*.ts": {
      "runtime": "@vercel/node"
    }
  },
  "env": {
    "VITE_SUPABASE_URL": "@supabase_url",
    "VITE_SUPABASE_ANON_KEY": "@supabase_anon_key"
  }
}
```

### 3. Netlify

**Преимущества:**
- Простая настройка
- Встроенные формы
- Netlify Functions
- Continuous deployment

**Настройка:**
```toml
# netlify.toml
[build]
  publish = "dist"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 4. AWS S3 + CloudFront

**Преимущества:**
- Полный контроль
- Высокая производительность
- Гибкая конфигурация
- Интеграция с AWS экосистемой

**Скрипт развертывания:**
```bash
#!/bin/bash
# deploy-aws.sh

# Сборка проекта
npm run build

# Синхронизация с S3
aws s3 sync dist/ s3://your-bucket-name --delete

# Инвалидация CloudFront кеша
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

## 🔧 Настройка окружения

### Переменные окружения

Создайте файл `.env.production`:

```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# AI Services
VITE_SUNO_API_KEY=your_suno_key
VITE_MUREKA_API_KEY=your_mureka_key

# Analytics
VITE_GA_TRACKING_ID=GA_MEASUREMENT_ID
VITE_HOTJAR_ID=your_hotjar_id

# Feature Flags
VITE_ENABLE_AI_GENERATION=true
VITE_ENABLE_PREMIUM_FEATURES=false

# App Configuration
VITE_APP_ENV=production
VITE_API_BASE_URL=https://api.aimusicplatform.com
```

### Безопасность переменных

**Публичные переменные (VITE_*):**
- Доступны в клиентском коде
- Используйте только для несекретных данных
- Анонимные ключи Supabase безопасны

**Серверные переменные:**
- Храните в CI/CD системе
- Используйте секреты платформы развертывания
- Никогда не коммитьте в репозиторий

## 🏗️ CI/CD конфигурация

### GitHub Actions

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

### GitLab CI/CD

`.gitlab-ci.yml`:

```yaml
stages:
  - test
  - build
  - deploy

variables:
  NODE_VERSION: "18"

test:
  stage: test
  image: node:$NODE_VERSION
  script:
    - npm ci
    - npm run type-check
    - npm run lint
    - npm test
  only:
    - merge_requests
    - main

build:
  stage: build
  image: node:$NODE_VERSION
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 hour
  only:
    - main

deploy_production:
  stage: deploy
  image: node:$NODE_VERSION
  script:
    - npm install -g vercel
    - vercel --token $VERCEL_TOKEN --prod
  environment:
    name: production
    url: https://aimusicplatform.com
  only:
    - main
```

## 🗄️ База данных

### Supabase миграции

```bash
# Установка Supabase CLI
npm install -g supabase

# Инициализация
supabase init

# Запуск локально
supabase start

# Применение миграций к продакшену
supabase db push --db-url "postgresql://..."
```

### Backup стратегия

```bash
#!/bin/bash
# backup-db.sh

# Создание резервной копии
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Загрузка в S3
aws s3 cp backup_*.sql s3://your-backup-bucket/db-backups/

# Очистка старых бэкапов (старше 30 дней)
find . -name "backup_*.sql" -mtime +30 -delete
```

## 📊 Мониторинг и логирование

### Настройка аналитики

```typescript
// lib/analytics.ts
import { Analytics } from '@vercel/analytics/react';

export const AnalyticsProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      {children}
      <Analytics />
    </>
  );
};
```

### Error tracking

```typescript
// lib/sentry.ts
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.VITE_APP_ENV,
  integrations: [
    new Sentry.BrowserTracing(),
  ],
  tracesSampleRate: 1.0,
});
```

### Health checks

```typescript
// pages/api/health.ts
export default function handler(req: Request) {
  return new Response(JSON.stringify({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    environment: process.env.VITE_APP_ENV
  }), {
    headers: { 'content-type': 'application/json' }
  });
}
```

## 🔒 Безопасность в продакшене

### SSL/TLS сертификаты

- **Vercel/Netlify**: Автоматические Let's Encrypt сертификаты
- **AWS**: AWS Certificate Manager
- **Собственный сервер**: Certbot + Let's Encrypt

### Security Headers

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  return response;
}
```

### Content Security Policy

```html
<!-- В index.html -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline' https://vercel.live;
               style-src 'self' 'unsafe-inline';
               img-src 'self' data: https:;
               connect-src 'self' https://*.supabase.co;">
```

## 📈 Производительность

### Оптимизация сборки

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          supabase: ['@supabase/supabase-js']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
});
```

### Кеширование

```typescript
// sw.js (Service Worker)
const CACHE_NAME = 'ai-music-platform-v1';
const urlsToCache = [
  '/',
  '/static/css/',
  '/static/js/',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});
```

## 🌐 CDN и кеширование

### Vercel конфигурация

```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*)\\.html",
      "headers": [
        {
          "key": "Cache-Control", 
          "value": "public, max-age=3600"
        }
      ]
    }
  ]
}
```

### CloudFront конфигурация

```yaml
# cloudformation.yml
CacheBehaviors:
  - PathPattern: "/assets/*"
    TargetOriginId: S3Origin
    ViewerProtocolPolicy: redirect-to-https
    CachePolicyId: 4135ea2d-6df8-44a3-9df3-4b5a84be39ad # Managed-CachingOptimized
    
  - PathPattern: "/api/*"
    TargetOriginId: S3Origin
    ViewerProtocolPolicy: redirect-to-https
    CachePolicyId: 4135ea2d-6df8-44a3-9df3-4b5a84be39ad # Managed-CachingDisabled
```

## 🚨 Troubleshooting

### Частые проблемы

#### 1. Ошибки сборки
```bash
# Очистка кеша
npm run clean
rm -rf node_modules
npm install

# Проверка зависимостей
npm audit
npm update
```

#### 2. Проблемы с переменными окружения
```bash
# Проверка переменных в сборке
echo $VITE_SUPABASE_URL

# Локальное тестирование продакшн сборки
npm run build
npm run preview
```

#### 3. Ошибки CORS
```typescript
// supabase/config.toml
[api]
enabled = true
port = 54321
schemas = ["public"]
extra_search_path = ["public"]
max_rows = 1000

[cors]
origins = ["http://localhost:3000", "https://yourdomain.com"]
```

### Логи и отладка

```bash
# Логи Vercel
vercel logs [deployment-url]

# Логи Netlify
netlify logs

# Локальные логи продакшн сборки
NODE_ENV=production npm run dev 2>&1 | tee app.log
```

## 📋 Чек-лист развертывания

### Перед релизом

- [ ] Все тесты проходят
- [ ] Линтер не выдает ошибок
- [ ] Проверка типов TypeScript успешна
- [ ] Обновлен CHANGELOG.md
- [ ] Обновлена версия в package.json
- [ ] Проверены переменные окружения
- [ ] Backup базы данных создан

### После развертывания

- [ ] Проверка health endpoint
- [ ] Тестирование основных функций
- [ ] Проверка метрик производительности
- [ ] Мониторинг ошибок
- [ ] Проверка SSL сертификата
- [ ] Тестирование на мобильных устройствах

### Откат (Rollback)

```bash
# Vercel
vercel rollback [deployment-url]

# Git реверт
git revert HEAD
git push origin main

# Database rollback
supabase db reset --db-url $DATABASE_URL
```

## 📞 Поддержка

### Контакты DevOps команды

- **Email**: devops@aimusicplatform.com
- **Slack**: #devops-support
- **Escalation**: +7 (XXX) XXX-XX-XX

### Полезные ссылки

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Deployment Guide](https://supabase.com/docs/guides/hosting/overview)
- [Vite Deployment](https://vitejs.dev/guide/static-deploy.html)

---

**Версия документации**: 1.0.0 | **Последнее обновление**: 2024-07-31