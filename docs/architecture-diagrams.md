# 🏗️ AI Music Platform - Архитектурные диаграммы

> **Версия**: 0.01.032  
> **Назначение**: Визуализация архитектуры системы с фокусом на оптимизацию производительности  
> **Связанные документы**: [Optimization Plan](./optimization-plan.md), [CLAUDE.md](../CLAUDE.md)

## 🎯 Общая архитектура системы

```mermaid
graph TB
    subgraph "🎤 Domain Layer - Artists (Core Entity)"
        A[Artists Entity] --> Profile[Artist Profile<br/>🎯 Goals & Mission<br/>🎨 Style Definition<br/>📝 Creative Brief]
        Profile --> Context[Context Provider<br/>🧠 AI Generation Context<br/>📊 Performance Analytics<br/>🔗 Collaboration Data]
        Context --> Persona[Virtual Persona<br/>🎭 Character Traits<br/>🎼 Musical Preferences<br/>💡 Creative Process]
    end
    
    subgraph "💽 Domain Layer - Projects (Organization)"
        P[Projects Entity] --> Type[Project Type<br/>🎵 Single<br/>📀 EP<br/>💿 Album]
        Type --> AutoGen[Auto Generation<br/>🤖 Smart Project Creation<br/>📋 Concept Development<br/>🎨 Visual Identity]
        AutoGen --> Strategy[Release Strategy<br/>📅 Timeline Planning<br/>🎯 Target Audience<br/>📈 Marketing Plan]
    end
    
    subgraph "🎵 Domain Layer - Tracks (Content)"
        T[Tracks Entity] --> Meta[Track Metadata<br/>📝 Lyrics with SUNO.AI tags<br/>🎧 Audio URL<br/>⏱️ Duration & BPM]
        Meta --> Versions[Version Control<br/>🔄 Iteration History<br/>🎚️ Mix Variations<br/>📊 A/B Testing]
        Versions --> AI_Integration[AI Integration<br/>🎼 Suno AI Generation<br/>🎹 Mureka Composition<br/>🎤 Vocal Synthesis]
    end
    
    subgraph "⚡ Performance Layer - Optimization"
        RQ[React Query<br/>📊 Server State Management<br/>⏰ Smart Invalidation<br/>🔄 Background Refetching]
        
        GS[Global Store<br/>🌐 Critical App Data<br/>👤 User Preferences<br/>🔗 Navigation State]
        
        LC[Local Cache<br/>💾 Static Resources<br/>📋 Form Drafts<br/>🎨 UI Preferences]
        
        PF[Prefetching<br/>🔮 Predictive Loading<br/>📱 Route Preloading<br/>🎯 Smart Anticipation]
        
        RQ -.->|"Hydrates"| GS
        GS -.->|"Persists to"| LC
        LC -.->|"Feeds"| PF
        PF -.->|"Warms"| RQ
    end
    
    subgraph "🎨 UI Layer - Components"
        Layout[App Layout<br/>📱 Responsive Design<br/>🎛️ Navigation<br/>🎨 Theme System]
        
        Gen[Generation Interface<br/>🎵 TrackGenerationSidebar<br/>📜 LyricsDrawer<br/>🎧 FloatingPlayer]
        
        Management[Content Management<br/>👥 Artists Management<br/>📁 Projects Organization<br/>🎵 Tracks Library]
        
        Layout --> Gen
        Layout --> Management
    end
    
    subgraph "🔧 Infrastructure Layer"
        DB[(Supabase Database<br/>🗃️ PostgreSQL<br/>🔐 RLS Policies<br/>⚡ Edge Functions)]
        
        Storage[(Supabase Storage<br/>🎧 Audio Files<br/>🖼️ Cover Images<br/>👤 Avatars)]
        
        AI_APIs[AI Services<br/>🎵 Suno AI<br/>🎹 Mureka<br/>🤖 OpenAI/Anthropic<br/>🎨 Image Generation]
        
        CDN[Content Delivery<br/>⚡ Fast Asset Delivery<br/>🌍 Global Distribution<br/>📱 Mobile Optimization]
    end
    
    A --> RQ
    P --> RQ
    T --> RQ
    
    RQ --> DB
    Gen --> AI_APIs
    Management --> Storage
    Storage --> CDN
    
    style A fill:#ff6b6b,stroke:#333,stroke-width:3px,color:#fff
    style RQ fill:#4ecdc4,stroke:#333,stroke-width:3px,color:#fff
    style Gen fill:#ffe66d,stroke:#333,stroke-width:2px
    style AI_APIs fill:#a8e6cf,stroke:#333,stroke-width:2px
```

## 🔄 Data Flow Architecture

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant UI as 🎨 UI Component
    participant GS as 🌐 Global Store
    participant RQ as ⚡ React Query
    participant API as 🔧 Supabase API
    participant AI as 🤖 AI Services
    
    Note over U,AI: 🎵 Track Generation Flow
    
    U->>UI: Initiates track generation
    UI->>GS: Check cached artists/projects
    
    alt Cache Hit 💚
        GS-->>UI: Return cached data
    else Cache Miss 🔴
        UI->>RQ: Fetch artists/projects
        RQ->>API: Database query
        API-->>RQ: Fresh data
        RQ-->>GS: Update global cache
        RQ-->>UI: Return data with caching
    end
    
    UI->>AI: Generate track (Suno/Mureka)
    AI-->>UI: Return audio + metadata
    
    Note over UI,API: 🎯 Optimistic Update Pattern
    UI->>UI: Immediate UI update
    UI->>API: Save to database
    
    alt Success 💚
        API-->>RQ: Confirm save
        RQ->>GS: Update cached data
    else Error 🔴
        API-->>UI: Error response
        UI->>UI: Rollback optimistic update
        UI->>U: Show error message
    end
    
    Note over RQ,API: 🔄 Background Sync
    RQ->>API: Background refetch
    API-->>RQ: Latest data
    RQ->>GS: Sync global state
```

## 🏗️ Component Architecture

```mermaid
graph TD
    subgraph "📱 Application Shell"
        App[App.tsx<br/>🎯 Router Setup<br/>🎨 Theme Provider<br/>🔐 Auth Context]
        
        Layout[AppLayout.tsx<br/>📐 Layout Structure<br/>🎛️ Navigation<br/>📱 Responsive Grid]
        
        App --> Layout
    end
    
    subgraph "🎤 Artists Module (≤300 lines each)"
        ArtistsList[ArtistsList.tsx<br/>📊 Data Display<br/>🔍 Search/Filter<br/>📄 Pagination]
        
        ArtistCard[ArtistCard.tsx<br/>🎭 Artist Preview<br/>🎨 Avatar Display<br/>⭐ Quick Actions]
        
        ArtistDialog[ArtistDialog.tsx<br/>📝 Create/Edit Form<br/>🤖 AI Generation<br/>✅ Validation]
        
        useArtists[useArtists.hook.ts<br/>⚡ React Query<br/>🔄 CRUD Operations<br/>💾 Optimistic Updates]
        
        ArtistsList --> ArtistCard
        ArtistsList --> ArtistDialog
        ArtistDialog --> useArtists
        ArtistCard --> useArtists
    end
    
    subgraph "💽 Projects Module (≤300 lines each)"
        ProjectsList[ProjectsList.tsx<br/>📁 Project Grid<br/>🏷️ Type Filters<br/>📊 Statistics]
        
        ProjectCard[ProjectCard.tsx<br/>💿 Cover Display<br/>🎵 Track Count<br/>📅 Release Date]
        
        ProjectDialog[ProjectDialog.tsx<br/>📝 Project Form<br/>🎨 Cover Upload<br/>🤖 Auto-Generation]
        
        useProjects[useProjects.hook.ts<br/>⚡ React Query<br/>🔗 Artist Relations<br/>📊 Analytics]
        
        ProjectsList --> ProjectCard
        ProjectsList --> ProjectDialog
        ProjectDialog --> useProjects
        ProjectCard --> useProjects
    end
    
    subgraph "🎵 Generation Module (≤300 lines each)"
        GenerationPage[AIGenerationNew.tsx<br/>🎛️ Main Interface<br/>📊 Data Orchestration<br/>🔄 State Management]
        
        GenSidebar[TrackGenerationSidebar.tsx<br/>📝 Generation Form<br/>🎚️ Parameters<br/>🎯 Context Selection]
        
        LyricsDrawer[LyricsDrawer.tsx<br/>📜 Lyrics Display<br/>🏷️ SUNO.AI Tags<br/>📋 Copy/Export]
        
        FloatingPlayer[FloatingPlayer.tsx<br/>🎧 Audio Control<br/>🔊 Volume/Seek<br/>📊 Progress Bar]
        
        useGeneration[useGeneration.hook.ts<br/>🤖 AI Integration<br/>📊 Status Tracking<br/>🔄 Real-time Updates]
        
        GenerationPage --> GenSidebar
        GenerationPage --> LyricsDrawer  
        GenerationPage --> FloatingPlayer
        GenSidebar --> useGeneration
    end
    
    subgraph "🌐 Global State (≤300 lines each)"
        AppDataProvider[AppDataProvider.tsx<br/>🌍 Global Context<br/>💾 Persistent State<br/>🔄 Hydration/Dehydration]
        
        useAppData[useAppData.hook.ts<br/>📊 State Selectors<br/>🎯 Action Creators<br/>⚡ Performance Optimized]
        
        CacheManager[CacheManager.ts<br/>💾 Storage Strategy<br/>⏰ TTL Management<br/>🧹 Cleanup Logic]
        
        AppDataProvider --> useAppData
        AppDataProvider --> CacheManager
    end
    
    Layout --> ArtistsList
    Layout --> ProjectsList
    Layout --> GenerationPage
    
    ArtistsList -.->|"Uses Global State"| AppDataProvider
    ProjectsList -.->|"Uses Global State"| AppDataProvider
    GenerationPage -.->|"Uses Global State"| AppDataProvider
    
    style App fill:#4ecdc4,stroke:#333,stroke-width:3px,color:#fff
    style AppDataProvider fill:#ff6b6b,stroke:#333,stroke-width:3px,color:#fff
    style GenerationPage fill:#ffe66d,stroke:#333,stroke-width:2px
    style useArtists fill:#a8e6cf,stroke:#333,stroke-width:2px
    style useProjects fill:#a8e6cf,stroke:#333,stroke-width:2px
    style useGeneration fill:#a8e6cf,stroke:#333,stroke-width:2px
```

## 🔄 Caching Strategy

```mermaid
graph LR
    subgraph "📊 Cache Levels"
        L1[Level 1<br/>🚀 React Query<br/>Server State Cache]
        L2[Level 2<br/>🌐 Global Context<br/>Critical App Data]  
        L3[Level 3<br/>💾 localStorage<br/>Static Resources]
    end
    
    subgraph "📈 Cache Metrics"
        TTL[TTL Strategy<br/>⏰ 5min stale<br/>⏰ 30min cache<br/>⏰ Infinite static]
        
        HitRate[Hit Rate Target<br/>🎯 80% average<br/>🎯 95% static<br/>🎯 60% dynamic]
        
        Invalidation[Smart Invalidation<br/>🔄 Mutation-based<br/>🎯 Tag-based<br/>⚡ Real-time sync]
    end
    
    subgraph "🎯 Cache Keys"
        UserScoped["👤 User-Scoped<br/>artists-{userId}<br/>projects-{userId}<br/>generations-{userId}"]
        
        GlobalScoped["🌍 Global-Scoped<br/>genres-list<br/>moods-list<br/>ui-preferences"]
        
        EntityScoped["🏷️ Entity-Scoped<br/>artist-{artistId}<br/>project-{projectId}<br/>track-{trackId}"]
    end
    
    L1 -.->|"Hydrates"| L2
    L2 -.->|"Persists"| L3
    L3 -.->|"Seeds"| L1
    
    TTL --> L1
    HitRate --> L2
    Invalidation --> L3
    
    UserScoped --> L1
    GlobalScoped --> L2  
    EntityScoped --> L3
    
    style L1 fill:#4ecdc4,stroke:#333,stroke-width:2px,color:#fff
    style L2 fill:#ffe66d,stroke:#333,stroke-width:2px
    style L3 fill:#a8e6cf,stroke:#333,stroke-width:2px
```

## 🎨 Cover Generation Flow

```mermaid
flowchart TD
    Start([🎵 Track Created]) --> CheckMode{Cover Generation Mode?}
    
    CheckMode -->|"Default"| DefaultGen[🤖 SunoAPI.org<br/>Auto-generate from<br/>track metadata]
    CheckMode -->|"Custom"| CustomGen[🎨 Custom Prompt<br/>User-defined<br/>style & content]
    
    DefaultGen --> GenPrompt1[🧠 Create Prompt<br/>Title: {track.title}<br/>Genre: {track.genre}<br/>Mood: {track.mood}]
    
    CustomGen --> ProviderSelect[🎯 Provider Selection<br/>• Stability AI<br/>• DALL-E 3<br/>• Midjourney<br/>• SunoAPI.org]
    
    GenPrompt1 --> CallAPI1[📡 Call SunoAPI.org<br/>POST /generate-cover]
    ProviderSelect --> GenPrompt2[📝 User Prompt Input<br/>+ Style Parameters]
    GenPrompt2 --> CallAPI2[📡 Call Selected Provider<br/>With custom parameters]
    
    CallAPI1 --> ProcessResult1[🖼️ Process Result<br/>• Validate image<br/>• Generate variants<br/>• Store metadata]
    
    CallAPI2 --> ProcessResult2[🖼️ Process Result<br/>• Quality check<br/>• Resize variants<br/>• Store metadata]
    
    ProcessResult1 --> StoreImage[💾 Store in Supabase<br/>• Original file<br/>• Thumbnails<br/>• Metadata JSON]
    ProcessResult2 --> StoreImage
    
    StoreImage --> UpdateTrack[📝 Update Track Record<br/>cover_url = generated_url<br/>cover_metadata = details]
    
    UpdateTrack --> ShowOptions{Show Regeneration Options?}
    
    ShowOptions -->|"Yes"| RegenerateUI[🔄 Regeneration Interface<br/>• Try different prompt<br/>• Change provider<br/>• Adjust parameters]
    
    ShowOptions -->|"No"| Complete([✅ Cover Generation Complete])
    
    RegenerateUI --> CustomGen
    
    style Start fill:#4ecdc4,stroke:#333,stroke-width:2px,color:#fff
    style DefaultGen fill:#a8e6cf,stroke:#333,stroke-width:2px
    style CustomGen fill:#ffe66d,stroke:#333,stroke-width:2px
    style Complete fill:#ff6b6b,stroke:#333,stroke-width:2px,color:#fff
```

---

> **Документация обновляется**: По мере реализации оптимизаций диаграммы будут дополняться деталями имплементации.

**Связанные файлы**:
- [Optimization Plan](./optimization-plan.md) - Детальный план реализации
- [CLAUDE.md](../CLAUDE.md) - Основная документация проекта  
- [README.md](../README.md) - Точка входа в документацию

**TODO**:
- [ ] Добавить диаграммы для AI интеграции
- [ ] Детализировать error handling flows  
- [ ] Создать performance monitoring диаграммы
- [ ] Добавить security архитектуру