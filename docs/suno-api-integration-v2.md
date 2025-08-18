# Suno API Integration v2.0
## Аудит и модернизация интеграции с Suno API v1

*Версия: 0.01.037*  
*Дата обновления: 17.08.2025*

## 🎯 Обзор изменений

Данный документ описывает модернизацию интеграции с Suno API для соответствия актуальной спецификации v1 и добавления новых возможностей.

### Ключевые улучшения:
- ✅ Исправлена валидация для `upload-extend` API
- ✅ Устранена ошибка `undefined projectId` в callback
- ✅ Добавлена поддержка Timestamped Lyrics
- 🚧 Подготовка к Cover Generation
- 🚧 Обновление SunoAdapter под v1 API

## 📋 Детализированный план работ

### Phase 1: Backend исправления ✅

#### 1.1 Исправление upload-extend-suno-track
**Проблема**: Недостаточная валидация обязательных параметров согласно Suno API docs.

**Решение**:
```typescript
// Новая валидация для custom mode
if (defaultParamFlag) {
  if (!style || !title) {
    return error('style and title are required when defaultParamFlag is true');
  }
  
  if (!instrumental && !prompt) {
    return error('prompt is required when defaultParamFlag is true and instrumental is false');
  }
  
  if (!continueAt) {
    return error('continueAt is required when defaultParamFlag is true');
  }
}
```

#### 1.2 Исправление suno-callback
**Проблема**: `projectId` не определен в области видимости.

**Решение**:
```typescript
// Получаем projectId из metadata генерации
const projectId = generation.metadata?.project_id;
```

#### 1.3 Новая Edge Function: get-suno-timestamped-lyrics ✅
**Назначение**: Получение лирики с временными метками для синхронизации с аудио.

**Эндпоинт**: `/functions/v1/get-suno-timestamped-lyrics`

**Параметры**:
- `taskId` (required): ID задачи генерации
- `audioId` (optional): Конкретный ID аудио
- `musicIndex` (optional): Индекс трека (0 или 1)

**Ответ**:
```typescript
interface TimestampedLyricsResponse {
  alignedWords: AlignedWord[];
  waveformData: number[];
  hootCer: number;
  isStreamed: boolean;
}
```

### Phase 2: Frontend интеграция 🚧

#### 2.1 Валидация в UI компонентах
- Добавить проверки в формы генерации
- Показывать подсказки по обязательным полям
- Валидация файлов (формат, длительность)

#### 2.2 Интеграция новых возможностей
- Компонент для отображения Timestamped Lyrics
- Улучшенная обработка Upload & Extend
- Подготовка к Cover Generation

#### 2.3 Обновление терминологии
- "Расширить аудио" → "Upload & Extend"
- Добавить описания новых возможностей
- Обновить подсказки в UI

### Phase 3: Архитектурные улучшения 🔄

#### 3.1 Обновление SunoAdapter
```typescript
// Текущие проблемы:
- baseUrl: 'https://api.sunoapi.org/v2' // Неверная версия!
- Методы не соответствуют v1 API

// Решение:
- baseUrl: 'https://api.sunoapi.org'
- Методы под v1 endpoints
```

#### 3.2 Типизация
```typescript
// Новые типы для v1 API
interface SunoUploadExtendRequest {
  uploadUrl: string;
  defaultParamFlag: boolean;
  instrumental?: boolean;
  continueAt?: number;
  prompt?: string;
  style?: string;
  title?: string;
  model: 'V3_5' | 'V4' | 'V4_5' | 'V4_5PLUS';
  callBackUrl: string;
}
```

## 🔄 Диаграмма потока Upload & Extend

```mermaid
graph TD
    A[User: Select Audio File] --> B{File Valid?}
    B -->|No| C[Show Validation Error]
    B -->|Yes| D[Upload to Storage]
    D --> E[Get Upload URL]
    E --> F{Custom Mode?}
    F -->|Yes| G[Validate: style, title, continueAt]
    F -->|No| H[Use Default Parameters]
    G --> I{Instrumental?}
    I -->|No| J[Validate: prompt required]
    I -->|Yes| K[Skip prompt validation]
    J --> L[Call Suno Upload-Extend API]
    K --> L
    H --> L
    L --> M[Receive taskId]
    M --> N[Create AI Generation Record]
    N --> O[Monitor via Callback]
    O --> P[Update Track in Database]
    P --> Q[Download & Store Audio]
```

## 📊 API Endpoints Mapping

| Функция | Наш Endpoint | Suno API | Статус |
|---------|-------------|----------|--------|
| Basic Generation | `/functions/v1/generate-suno-track` | `/api/v1/generate/music` | ✅ Работает |
| Upload & Extend | `/functions/v1/upload-extend-suno-track` | `/api/v1/generate/upload-extend` | ✅ Исправлено |
| Extend Existing | `/functions/v1/extend-suno-track` | `/api/v1/generate/extend` | ✅ Работает |
| Get Status | `/functions/v1/get-suno-record-info` | `/api/v1/generate/record-info` | ✅ Работает |
| Timestamped Lyrics | `/functions/v1/get-suno-timestamped-lyrics` | `/api/v1/generate/get-timestamped-lyrics` | ✅ Добавлено |
| Cover Generation | `/functions/v1/generate-suno-cover` | `/api/v1/suno/cover/generate` | 🚧 TODO |
| Style Boost | `/functions/v1/boost-suno-style` | `/api/v1/style/generate` | ✅ Работает |

## 🔐 Безопасность и валидация

### Входные данные
- Максимальная длительность аудио: 2 минуты (120 секунд)
- Поддерживаемые форматы: MP3, WAV, M4A
- Максимальный размер файла: 50MB

### Валидация контента
- Проверка на нарушение контент-политики
- Фильтрация недопустимых текстов
- Валидация URL загрузки

### Rate Limiting
- Ограничения согласно Suno API лимитам
- Обработка ошибок 429 (Too Many Requests)
- Очередь запросов при превышении лимитов

## 🧪 Тестирование

### Unit Tests
- [ ] Валидация параметров upload-extend
- [ ] Корректность callback обработки
- [ ] Timestamped lyrics parsing

### Integration Tests  
- [ ] Полный цикл Upload & Extend
- [ ] Обработка ошибок API
- [ ] Callback handling

### E2E Tests
- [ ] UI для Upload & Extend
- [ ] Отображение прогресса
- [ ] Воспроизведение с синхронизированной лирикой

## 📈 Метрики и мониторинг

### Key Metrics
- Успешность Upload & Extend операций
- Время обработки timestamped lyrics
- Ошибки валидации в UI

### Логирование
- Детальные логи для debugging
- Трекинг API вызовов
- Мониторинг производительности

## 🔄 Migration Path

### Backward Compatibility
- Старые методы остаются рабочими
- Плавный переход на новые API
- Постепенное обновление UI компонентов

### Deprecation Timeline
- v0.01.037: Добавление новых методов
- v0.01.040: Обновление всех UI компонентов  
- v0.02.000: Удаление deprecated методов

---

## 📝 TODO для следующих версий

### v0.01.038
- [ ] Cover Generation интеграция
- [ ] Обновление SunoAdapter 
- [ ] UI компоненты для новых возможностей

### v0.01.040
- [ ] Полный переход на v1 API
- [ ] Расширенная аналитика
- [ ] Advanced audio processing

### v0.02.000
- [ ] Multi-provider support
- [ ] Advanced AI models integration
- [ ] Professional audio editing tools

---

*Документ будет обновляться по мере реализации плана.*