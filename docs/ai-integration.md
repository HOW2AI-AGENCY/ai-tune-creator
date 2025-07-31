# AI Integration Documentation

## Overview

Данная система интегрирована с несколькими провайдерами ИИ для генерации контента, связанного с музыкальными артистами, включая профили артистов, тексты песен и маркетинговые материалы.

## Supported AI Providers

### OpenAI
- **Models**: GPT-4o, GPT-4o Mini, GPT-4 Turbo
- **API Key**: `OPENAI_API_KEY` в Supabase Edge Function Secrets
- **Best for**: Высокое качество генерации, хорошая поддержка русского языка

### Anthropic Claude
- **Models**: Claude 3 Opus, Claude 3 Sonnet, Claude 3 Haiku
- **API Key**: `ANTHROPIC_API_KEY` в Supabase Edge Function Secrets
- **Best for**: Детальный анализ и креативное письмо

### DeepSeek
- **Models**: DeepSeek Chat, DeepSeek Coder
- **API Key**: `DEEPSEEK_API_KEY` в Supabase Edge Function Secrets
- **Best for**: Экономичная альтернатива с хорошим качеством

## Configuration

### User Settings
Пользователи могут настроить параметры ИИ в разделе "Настройки" -> "ИИ":

1. **Provider**: Выбор провайдера ИИ
2. **Model**: Выбор конкретной модели
3. **Temperature**: Контроль креативности (0.0-2.0)
4. **Max Tokens**: Максимальная длина ответа
5. **Custom Prompts**: Настройка промптов для разных типов генерации

### Edge Function Configuration
Настройки хранятся в Supabase Edge Function:
- `supabase/functions/generate-artist-info/index.ts`

## API Usage

### Generate Artist Info

**Endpoint**: `/functions/v1/generate-artist-info`

**Request Body**:
```json
{
  "name": "Имя артиста",
  "context": "Дополнительный контекст",
  "prompt": "Кастомный промпт",
  "provider": "openai|anthropic|deepseek",
  "model": "название_модели",
  "temperature": 0.8,
  "maxTokens": 1000
}
```

**Response**:
```json
{
  "artistInfo": {
    "description": "Описание артиста",
    "genre": "Жанр",
    "location": "Локация",
    "background": "Предыстория",
    "style": "Стиль",
    "influences": ["Влияние 1", "Влияние 2"]
  },
  "metadata": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "temperature": 0.8,
    "maxTokens": 1000,
    "generatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## Error Handling

### Common Errors
1. **API Key Missing**: Убедитесь, что API ключ настроен в Supabase Secrets
2. **Rate Limiting**: Провайдеры ИИ имеют лимиты запросов
3. **Invalid JSON**: ИИ может вернуть невалидный JSON
4. **Model Not Available**: Проверьте доступность модели

### Error Response Format
```json
{
  "error": "Описание ошибки",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "provider": "openai"
}
```

## Best Practices

### Prompt Engineering
1. **Be Specific**: Четко указывайте, что должен сгенерировать ИИ
2. **Context Matters**: Предоставляйте достаточно контекста
3. **Format Requirements**: Указывайте требуемый формат ответа
4. **Language**: Явно указывайте язык для генерации

### Performance Optimization
1. **Model Selection**: Используйте быстрые модели для простых задач
2. **Token Limits**: Не устанавливайте слишком большие лимиты
3. **Caching**: Кешируйте результаты для повторных запросов
4. **Async Processing**: Используйте асинхронную обработку для больших задач

### Security
1. **API Keys**: Никогда не передавайте API ключи в клиентский код
2. **Input Validation**: Всегда валидируйте пользовательский ввод
3. **Rate Limiting**: Имплементируйте собственные лимиты запросов
4. **Content Filtering**: Фильтруйте неподходящий контент

## Integration Points

### Artist Creation
- Автоматическая генерация профилей артистов
- Заполнение метаданных на основе имени артиста
- Интеграция с формой создания артиста

### Future Integrations
- Генерация текстов песен
- Создание маркетинговых материалов
- Автоматические описания проектов
- Рекомендации по жанрам и стилям

## Monitoring and Analytics

### Logs
- Все запросы к ИИ логируются в Edge Function
- Ошибки записываются с полным контекстом
- Время выполнения отслеживается

### Metrics
- Количество запросов по провайдерам
- Средние время ответа
- Успешность запросов
- Использование токенов

## Troubleshooting

### Common Issues
1. **Slow Response**: Проверьте выбранную модель и размер токенов
2. **Invalid Output**: Улучшите промпт или измените температуру
3. **API Errors**: Проверьте статус провайдера и лимиты
4. **Authentication**: Убедитесь в корректности API ключей

### Debug Mode
В development режиме возвращается дополнительная информация об ошибках, включая stack trace.

## Cost Optimization

### Token Usage
- Минимизируйте длину промптов
- Используйте appropriate max_tokens лимиты
- Кешируйте часто используемые результаты

### Model Selection
- **Fast tasks**: GPT-4o Mini, Claude 3 Haiku
- **Quality tasks**: GPT-4o, Claude 3 Opus
- **Budget tasks**: DeepSeek models

### Monitoring Costs
- Отслеживайте использование токенов
- Устанавливайте лимиты для пользователей
- Мониторьте costs через API провайдеров