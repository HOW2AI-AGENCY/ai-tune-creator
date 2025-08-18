# Руководство по разработке AI Tune Creator

## 🚀 Быстрый старт

### Структура веток
- **main** - продакшен ветка (автодеплой)
- **develop** - основная ветка разработки  
- **feature/*** - ветки для новых функций

### Workflow
1. Создать feature ветку от develop
2. Разработка и тестирование
3. Pull Request в develop
4. После тестирования - merge в main

### Установка и запуск

```bash
# Клонирование
git clone https://github.com/HOW2AI-AGENCY/ai-tune-creator.git
cd ai-tune-creator

# Переход на develop ветку
git checkout develop

# Установка зависимостей (с флагом для совместимости)
npm install --legacy-peer-deps

# Создание .env файла
cp .env.example .env

# Запуск dev сервера
npm run dev
```

### Команды

```bash
# Разработка
npm run dev              # Запуск dev сервера
npm run build            # Сборка для продакшена
npm run preview          # Предпросмотр сборки

# Качество кода
npm run typecheck        # Проверка TypeScript
npm run lint             # Проверка ESLint
npm run lint:fix         # Автоисправление ESLint
```

## 🛠 Настройка среды разработки

### Pre-commit hooks
Настроены автоматические проверки:
- TypeScript компиляция
- ESLint исправления
- Форматирование кода

### Переменные окружения (.env)
```env
# Supabase
SUPABASE_URL=https://zwbhlfhwymbmvioaikvs.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here

# AI APIs
SUNO_API_KEY=your_suno_api_key_here
MUREKA_API_KEY=your_mureka_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

## 📁 Структура проекта

```
src/
├── components/         # React компоненты
├── features/          # Модули приложения
├── hooks/             # Пользовательские хуки
├── lib/               # Утилиты и сервисы
├── pages/             # Страницы приложения
└── providers/         # Context провайдеры

supabase/
└── functions/         # Edge Functions
```

## ⚠️ Важные правила

1. **ГЛАВНАЯ ВЕТКА (main)** связана с продакшеном!
2. Всегда работать через feature ветки
3. Тщательно тестировать перед merge в main
4. Использовать TypeScript для типобезопасности
5. Следовать существующим паттернам кода

## 🔧 Технологический стек

- **Frontend**: React 18 + TypeScript + Vite
- **Стилизация**: Tailwind CSS + shadcn/ui
- **Состояние**: React Query + Context API
- **База данных**: Supabase + PostgreSQL
- **AI**: Suno API + Mureka API + OpenAI

## 🐛 Решение проблем

### Ошибки установки
```bash
# Если ошибки с зависимостями
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# Если проблемы с native модулями (Windows)
npm install @rollup/rollup-win32-x64-msvc
```

### TypeScript ошибки
```bash
# Проверка типов
npm run typecheck
```

---
Удачной разработки! 🎵
