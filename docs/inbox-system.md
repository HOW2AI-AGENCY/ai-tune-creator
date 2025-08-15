# 📥 Система Inbox для AI генерации

## 🎯 Обзор системы

Система Inbox автоматически управляет треками, созданными через AI генерацию без указания конкретного проекта. Это обеспечивает организованность и предотвращает потерю сгенерированного контента.

## 🔧 Как работает Inbox

### Автоматическое создание
Когда пользователь генерирует трек без указания проекта:
1. Система проверяет наличие Inbox проекта для пользователя
2. Если Inbox не существует, создается автоматически
3. Трек сохраняется в Inbox проект
4. Пользователь может позже организовать треки по проектам

### Структура Inbox
```typescript
interface InboxProject {
  id: string;
  title: "Inbox";
  description: "Generated tracks without specific project context";
  type: "mixtape";
  status: "draft";
  is_inbox: true; // Специальный флаг
  artist_id: string; // Связан с default артистом пользователя
}
```

## 🗄️ База данных

### Функция ensure_user_inbox
```sql
CREATE OR REPLACE FUNCTION public.ensure_user_inbox(p_user_id uuid)
RETURNS uuid AS $$
DECLARE
    inbox_project_id UUID;
    default_artist_id UUID;
BEGIN
    -- Получаем дефолтного артиста (первого по дате создания)
    SELECT id INTO default_artist_id 
    FROM public.artists 
    WHERE user_id = p_user_id 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    -- Если артистов нет, создаем дефолтного
    IF default_artist_id IS NULL THEN
        INSERT INTO public.artists (user_id, name, description)
        VALUES (p_user_id, 'Personal Artist', 'Default artist profile')
        RETURNING id INTO default_artist_id;
    END IF;
    
    -- Проверяем существование Inbox проекта
    SELECT id INTO inbox_project_id
    FROM public.projects
    WHERE artist_id = default_artist_id 
    AND is_inbox = true
    LIMIT 1;
    
    -- Создаем Inbox если не существует
    IF inbox_project_id IS NULL THEN
        INSERT INTO public.projects (artist_id, title, description, type, status, is_inbox)
        VALUES (default_artist_id, 'Inbox', 'Generated tracks without specific project context', 'mixtape', 'draft', true)
        RETURNING id INTO inbox_project_id;
    END IF;
    
    RETURN inbox_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Структура таблиц
```sql
-- Добавлен флаг is_inbox в таблицу projects
ALTER TABLE public.projects 
ADD COLUMN is_inbox BOOLEAN DEFAULT false;

-- Индекс для быстрого поиска Inbox проектов
CREATE INDEX idx_projects_is_inbox ON public.projects(artist_id, is_inbox);
```

## 🎮 Пользовательский интерфейс

### Переключатель "Send to Inbox"
В боковой панели генерации треков:
```typescript
<div className="flex items-center space-x-2">
  <Switch
    id="use-inbox"
    checked={useInbox}
    onCheckedChange={setUseInbox}
  />
  <Label htmlFor="use-inbox">Send to Inbox</Label>
</div>
```

### Логика активации
```typescript
// Автоматически активируется если не выбран проект
useEffect(() => {
  if (!selectedProject && !selectedArtist) {
    setUseInbox(true);
  }
}, [selectedProject, selectedArtist]);
```

## ⚙️ Edge Functions интеграция

### Suno генерация
```typescript
// В generate-suno-track/index.ts
let finalProjectId = projectId;

if (useInbox || (!projectId && !artistId)) {
  console.log('Using inbox logic, useInbox:', useInbox);
  
  const { data: inboxProjectId, error } = await supabase
    .rpc('ensure_user_inbox', { p_user_id: userId });

  if (error) {
    throw new Error('Failed to create inbox project');
  }

  finalProjectId = inboxProjectId;
  console.log('Using inbox project:', finalProjectId);
}
```

### Mureka генерация
```typescript
// В generate-mureka-track/index.ts
// Аналогичная логика для Mureka API
if (useInbox || (!projectId && !artistId)) {
  const { data: inboxProjectId } = await supabase
    .rpc('ensure_user_inbox', { p_user_id: userId });
  finalProjectId = inboxProjectId;
}
```

## 🔄 Миграция существующих треков

### Edge Function backfill-inbox-tracks
```typescript
// POST /functions/v1/backfill-inbox-tracks
{
  "dryRun": false, // true для тестирования без изменений
  "batchSize": 50  // количество треков для обработки за раз
}
```

### Что делает миграция:
1. Находит треки без project_id
2. Создает/находит Inbox проект для каждого пользователя
3. Перемещает треки в соответствующий Inbox
4. Логирует все операции

## 📊 Мониторинг и аналитика

### SQL запросы для мониторинга
```sql
-- Количество Inbox проектов
SELECT COUNT(*) FROM projects WHERE is_inbox = true;

-- Треки в Inbox проектах  
SELECT p.title, COUNT(t.id) as track_count
FROM projects p
LEFT JOIN tracks t ON p.id = t.project_id
WHERE p.is_inbox = true
GROUP BY p.id, p.title;

-- Пользователи без Inbox проектов
SELECT u.id 
FROM auth.users u
LEFT JOIN artists a ON u.id = a.user_id
LEFT JOIN projects p ON a.id = p.artist_id AND p.is_inbox = true
WHERE p.id IS NULL;
```

### Метрики
- Процент треков в Inbox vs организованных проектах
- Среднее время от создания до организации трека
- Количество автосозданных Inbox проектов

## 🎯 Преимущества системы

### Для пользователей:
1. **Никогда не теряются треки** - Все генерации сохраняются
2. **Легкая организация** - Можно перемещать треки позже
3. **Быстрый старт** - Не нужно создавать проект для эксперимента
4. **Автоматическое управление** - Система сама создает нужные структуры

### Для разработчиков:
1. **Целостность данных** - Треки всегда имеют project_id
2. **Простая логика** - Единая система для всех AI сервисов  
3. **Масштабируемость** - Поддерживает множество пользователей
4. **Обратная совместимость** - Работает с существующими данными

## 🚀 Лучшие практики

### Для пользователей:
1. **Используйте Inbox** для экспериментов и быстрых идей
2. **Организуйте треки** в тематические проекты после генерации
3. **Проверяйте Inbox** периодически для организации контента
4. **Используйте конкретные проекты** для готовых работ

### Для разработчиков:
1. **Всегда вызывайте** `ensure_user_inbox` при необходимости
2. **Логируйте операции** Inbox для отладки
3. **Проверяйте производительность** при большом количестве треков
4. **Тестируйте миграции** на копии данных

## 🔧 Конфигурация

### Environment Variables
```bash
# В Edge Functions автоматически доступны
SUPABASE_URL=https://zwbhlfhwymbmvioaikvs.supabase.co
SUPABASE_ANON_KEY=your_anon_key
```

### Настройки RLS
```sql
-- RLS политики для projects таблицы включают is_inbox
CREATE POLICY "Users can view their own projects" 
ON public.projects FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.artists 
    WHERE artists.id = projects.artist_id 
    AND artists.user_id = auth.uid()
  )
);
```

---

💡 **Совет:** Система Inbox полностью автоматическая и не требует вмешательства пользователя. Она обеспечивает сохранность всех генераций и позволяет организовать контент в удобное время.