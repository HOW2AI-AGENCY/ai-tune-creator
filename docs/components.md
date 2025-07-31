# 🧩 Документация компонентов

> **Руководство по UI компонентам AI Music Platform**

---

## 📋 **Содержание**

1. [Принципы компонентов](#принципы-компонентов)
2. [Shared компоненты](#shared-компоненты)
3. [Landing компоненты](#landing-компоненты)
4. [Dashboard компоненты](#dashboard-компоненты)
5. [Feature компоненты](#feature-компоненты)
6. [Шаблоны и конвенции](#шаблоны-и-конвенции)

---

## 🎯 **Принципы компонентов**

### **Архитектурные принципы**

1. **Single Responsibility** - один компонент = одна задача
2. **Composability** - компоненты легко комбинируются
3. **Reusability** - максимальное переиспользование
4. **Accessibility** - поддержка WCAG 2.1+
5. **Performance** - оптимизация рендеринга

### **Правила именования**

```typescript
// ✅ Правильно
<AudioPlayer />
<TrackCard />
<ProjectHeader />

// ❌ Неправильно  
<audioPlayer />
<trackcard />
<project_header />
```

### **Структура компонента**

```typescript
/**
 * 🎵 AudioPlayer - Универсальный аудиоплеер
 * 
 * @description Компонент для воспроизведения треков с визуализацией
 * @author Developer Name
 * @since 2025-07-31
 * @task T-015
 */

interface AudioPlayerProps {
  track: Track;
  autoPlay?: boolean;
  showVisualizer?: boolean;
  onPlay?: (track: Track) => void;
  onPause?: () => void;
  className?: string;
}

export const AudioPlayer = ({ 
  track, 
  autoPlay = false,
  showVisualizer = true,
  onPlay,
  onPause,
  className 
}: AudioPlayerProps) => {
  // ... implementation
};

AudioPlayer.displayName = 'AudioPlayer';
```

---

## 🌐 **Shared компоненты**

### **Navigation**

#### `NavBar`
```typescript
/**
 * 🧭 NavBar - Главная навигация
 * @task T-020
 */
interface NavBarProps {
  variant?: 'landing' | 'dashboard';
  showSearch?: boolean;
  showNotifications?: boolean;
}

<NavBar variant="dashboard" showSearch showNotifications />
```

#### `SideBar`
```typescript
/**
 * 📋 SideBar - Боковая навигация
 * @task T-021
 */
interface SideBarProps {
  items: NavItem[];
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

<SideBar 
  items={navItems} 
  collapsed={false}
  onCollapse={setCollapsed}
/>
```

### **Layout**

#### `PageContainer`
```typescript
/**
 * 📄 PageContainer - Контейнер страницы
 * @task T-022
 */
interface PageContainerProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  children: React.ReactNode;
}

<PageContainer 
  title="Мои проекты"
  subtitle="Управляйте своими музыкальными проектами"
  actions={<CreateProjectButton />}
  breadcrumbs={breadcrumbs}
>
  {children}
</PageContainer>
```

### **Feedback**

#### `LoadingSpinner`
```typescript
/**
 * ⏳ LoadingSpinner - Индикатор загрузки
 * @task T-023
 */
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary';
  text?: string;
}

<LoadingSpinner size="md" variant="primary" text="Генерирую трек..." />
```

#### `EmptyState`
```typescript
/**
 * 🗂️ EmptyState - Пустое состояние
 * @task T-024
 */
interface EmptyStateProps {
  icon?: React.ComponentType;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

<EmptyState 
  icon={MusicIcon}
  title="Нет треков"
  description="Создайте первый трек с помощью AI"
  action={{
    label: "Создать трек",
    onClick: handleCreateTrack
  }}
/>
```

---

## 🏠 **Landing компоненты**

### **Hero Section**

#### `HeroSection`
```typescript
/**
 * 🎯 HeroSection - Главный блок посадочной страницы
 * @task T-030
 */
interface HeroSectionProps {
  title: string;
  subtitle: string;
  ctaText: string;
  onCtaClick: () => void;
  demoTrack?: Track;
}

<HeroSection 
  title="Создавайте музыку с ИИ"
  subtitle="Профессиональная платформа для AI-генерации музыки"
  ctaText="Начать создавать"
  onCtaClick={handleSignUp}
  demoTrack={demoTrack}
/>
```

### **Features**

#### `HowItWorks`
```typescript
/**
 * ⚙️ HowItWorks - Как это работает
 * @task T-031
 */
interface Step {
  icon: React.ComponentType;
  title: string;
  description: string;
}

interface HowItWorksProps {
  steps: Step[];
}

<HowItWorks steps={workflowSteps} />
```

#### `DemoTracks`
```typescript
/**
 * 🎵 DemoTracks - Демо треки
 * @task T-032
 */
interface DemoTracksProps {
  tracks: Track[];
  title?: string;
  onTrackPlay?: (track: Track) => void;
}

<DemoTracks 
  tracks={demoTracks}
  title="Примеры AI-треков"
  onTrackPlay={handleTrackPlay}
/>
```

---

## 📊 **Dashboard компоненты**

### **Overview**

#### `OverviewPanel`
```typescript
/**
 * 📈 OverviewPanel - Обзор дашборда
 * @task T-040
 */
interface OverviewPanelProps {
  stats: UserStats;
  recentProjects: Project[];
  recentGenerations: Generation[];
}

<OverviewPanel 
  stats={userStats}
  recentProjects={projects}
  recentGenerations={generations}
/>
```

#### `StatsCard`
```typescript
/**
 * 📊 StatsCard - Карточка статистики
 * @task T-041
 */
interface StatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  icon?: React.ComponentType;
}

<StatsCard 
  title="Всего треков"
  value={42}
  change={{ value: 12, type: 'increase' }}
  icon={MusicIcon}
/>
```

### **Quick Actions**

#### `QuickActions`
```typescript
/**
 * ⚡ QuickActions - Быстрые действия
 * @task T-042
 */
interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

interface QuickActionsProps {
  actions: QuickAction[];
}

<QuickActions actions={quickActions} />
```

---

## 🎵 **Feature компоненты**

### **Audio Components**

#### `AudioPlayer`
```typescript
/**
 * 🎵 AudioPlayer - Аудиоплеер
 * @task T-050
 */
interface AudioPlayerProps {
  track: Track;
  autoPlay?: boolean;
  showVisualizer?: boolean;
  showPlaylist?: boolean;
  onPlay?: (track: Track) => void;
  onPause?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

<AudioPlayer 
  track={currentTrack}
  showVisualizer
  showPlaylist
  onPlay={handlePlay}
  onPause={handlePause}
  onNext={handleNext}
  onPrevious={handlePrevious}
/>
```

#### `WaveformVisualizer`
```typescript
/**
 * 🌊 WaveformVisualizer - Визуализация аудио
 * @task T-051
 */
interface WaveformVisualizerProps {
  audioUrl: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onSeek?: (time: number) => void;
  height?: number;
  color?: string;
}

<WaveformVisualizer 
  audioUrl={track.audioUrl}
  isPlaying={isPlaying}
  currentTime={currentTime}
  duration={duration}
  onSeek={handleSeek}
  height={100}
  color="hsl(var(--primary))"
/>
```

### **Project Components**

#### `ProjectCard`
```typescript
/**
 * 🎼 ProjectCard - Карточка проекта
 * @task T-060
 */
interface ProjectCardProps {
  project: Project;
  variant?: 'compact' | 'detailed';
  showActions?: boolean;
  onPlay?: (project: Project) => void;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
}

<ProjectCard 
  project={project}
  variant="detailed"
  showActions
  onPlay={handlePlay}
  onEdit={handleEdit}
  onDelete={handleDelete}
/>
```

#### `TrackCard`
```typescript
/**
 * 🎵 TrackCard - Карточка трека
 * @task T-061
 */
interface TrackCardProps {
  track: Track;
  showProject?: boolean;
  showArtist?: boolean;
  onPlay?: (track: Track) => void;
  onAddToPlaylist?: (track: Track) => void;
  onDownload?: (track: Track) => void;
}

<TrackCard 
  track={track}
  showProject
  showArtist
  onPlay={handlePlay}
  onAddToPlaylist={handleAddToPlaylist}
  onDownload={handleDownload}
/>
```

### **AI Components**

#### `AIGenerationModal`
```typescript
/**
 * 🧠 AIGenerationModal - Модал AI генерации
 * @task T-070
 */
interface AIGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  onGenerate: (params: GenerationParams) => void;
}

<AIGenerationModal 
  isOpen={showModal}
  onClose={handleClose}
  projectId={project.id}
  onGenerate={handleGenerate}
/>
```

#### `GenerationStatus`
```typescript
/**
 * ⏳ GenerationStatus - Статус генерации
 * @task T-071
 */
interface GenerationStatusProps {
  generation: Generation;
  onCancel?: (generation: Generation) => void;
  onRetry?: (generation: Generation) => void;
}

<GenerationStatus 
  generation={generation}
  onCancel={handleCancel}
  onRetry={handleRetry}
/>
```

---

## 🛠️ **Шаблоны и конвенции**

### **Шаблон компонента**

```typescript
/**
 * 🎯 ComponentName - Краткое описание
 * 
 * @description Подробное описание функциональности
 * @author Developer Name
 * @since 2025-07-31
 * @task T-XXX
 * 
 * @example
 * <ComponentName 
 *   prop1="value1"
 *   prop2={value2}
 *   onAction={handleAction}
 * />
 */

import React, { memo } from 'react';
import { cn } from '@/lib/utils';

interface ComponentNameProps {
  // Required props
  requiredProp: string;
  
  // Optional props with defaults
  optionalProp?: boolean;
  
  // Event handlers
  onAction?: (data: DataType) => void;
  
  // Style props
  className?: string;
  variant?: 'primary' | 'secondary';
}

export const ComponentName = memo<ComponentNameProps>(({ 
  requiredProp,
  optionalProp = false,
  onAction,
  className,
  variant = 'primary'
}) => {
  // TODO [T-XXX]: Add implementation
  
  return (
    <div className={cn(
      'base-classes',
      variant === 'primary' && 'primary-classes',
      variant === 'secondary' && 'secondary-classes',
      className
    )}>
      {/* Component content */}
    </div>
  );
});

ComponentName.displayName = 'ComponentName';

export type { ComponentNameProps };
```

### **Конвенции стилизации**

```typescript
// ✅ Используй semantic tokens
className="bg-background text-foreground border-border"

// ❌ Не используй прямые цвета
className="bg-white text-black border-gray-200"

// ✅ Используй cn для условной стилизации
className={cn(
  'base-classes',
  isActive && 'active-classes',
  className
)}

// ✅ Группируй связанные классы
className={cn(
  // Layout
  'flex items-center justify-between',
  // Spacing
  'p-4 gap-2',
  // Visual
  'bg-card rounded-md border',
  // Interactive
  'hover:bg-accent transition-colors',
  // Conditional
  isSelected && 'ring-2 ring-primary',
  className
)}
```

### **TypeScript типы**

```typescript
// Базовые типы
type ComponentVariant = 'primary' | 'secondary' | 'ghost';
type ComponentSize = 'sm' | 'md' | 'lg';
type ComponentStatus = 'idle' | 'loading' | 'success' | 'error';

// Расширение базовых HTML атрибутов
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ComponentVariant;
  size?: ComponentSize;
  isLoading?: boolean;
}

// Композитные типы
interface ActionButton {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: ComponentVariant;
  disabled?: boolean;
}
```

---

## 📚 **Дополнительные ресурсы**

- [shadcn/ui документация](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

**Документация обновлена:** `2025-07-31 15:30`  
**Версия компонентов:** `v1.0.0`