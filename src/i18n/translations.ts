export const translations = {
  ru: {
    // Navigation
    dashboard: "Главная",
    artists: "Артисты", 
    projects: "Проекты",
    aiGeneration: "ИИ Генерация",
    settings: "Настройки",
    
    // Groups
    main: "Основное",
    account: "Аккаунт",
    
    // App branding
    appName: "AI Music",
    appSubtitle: "Платформа",
    
    // Pages
    dashboardTitle: "Панель управления",
    dashboardWelcome: "Добро пожаловать в AI Music Platform",
    dashboardDescription: "Управляйте своими проектами, артистами и создавайте музыку с помощью ИИ",
    
    artistsTitle: "Артисты",
    artistsDescription: "Управление артистами и их профилями",
    
    projectsTitle: "Проекты", 
    projectsDescription: "Ваши музыкальные проекты и треки",
    
    aiGenerationTitle: "ИИ Генерация",
    aiGenerationDescription: "Создавайте музыку с помощью искусственного интеллекта",
    
    settingsTitle: "Настройки",
    settingsDescription: "Настройки приложения и профиля",
    
    // Generation UI
    generateTrack: "Генерируем трек...",
    searchTracks: "Поиск треков, стилей, артистов...",
    searchTracksPlaceholder: "Поиск треков...",
    createTrack: "Создать трек",
    loginRequired: "Войдите в систему",
    loginRequiredDesc: "Для доступа к AI Studio необходимо войти в систему",
    tracks: "треков",
    
    // Generation States
    statusPreparing: "Подготовка",
    statusGenerating: "Генерация", 
    statusProcessing: "Обработка",
    statusSaving: "Сохранение",
    statusCompleted: "Готово",
    statusError: "Ошибка",
    statusPending: "В очереди",
    statusRunning: "Генерация",
    
    // Task Queue
    activeTasks: "Активные задачи",
    recentTasks: "Недавние задачи",
    estimatedTime: "Оценочное время",
    
    // Track Grid
    noTracks: "Нет треков",
    noTracksDesc: "Создайте первый трек с помощью AI генерации",
    syncingTracks: "Синхронизация треков",
    syncingTracksDesc: "Загружаем треки с внешних сервисов...",
    
    // Generation Success
    generationStarted: "🎵 Генерация запущена",
    generationError: "Ошибка генерации",
    generationErrorDesc: "Произошла ошибка при запуске генерации",
    
    // Accessibility
    playTrack: "Воспроизвести трек",
    pauseTrack: "Приостановить трек", 
    downloadTrack: "Скачать трек",
    likeTrack: "Добавить в избранное",
    moreOptions: "Дополнительные опции",
    filterTracks: "Фильтровать треки",
    syncTracks: "Синхронизировать треки",
    retry: "Повторить",
    cancel: "Отменить",
    
    // Network states
    offline: "Нет подключения",
    online: "Подключено",
    
    // Common
    comingSoon: "Скоро...",
    unknown: "Неизвестно",
  },
  
  en: {
    // Navigation
    dashboard: "Dashboard",
    artists: "Artists",
    projects: "Projects", 
    aiGeneration: "AI Generation",
    settings: "Settings",
    
    // Groups
    main: "Main",
    account: "Account",
    
    // App branding
    appName: "AI Music",
    appSubtitle: "Platform",
    
    // Pages
    dashboardTitle: "Dashboard",
    dashboardWelcome: "Welcome to AI Music Platform",
    dashboardDescription: "Manage your projects, artists and create music with AI",
    
    artistsTitle: "Artists",
    artistsDescription: "Manage artists and their profiles",
    
    projectsTitle: "Projects",
    projectsDescription: "Your music projects and tracks",
    
    aiGenerationTitle: "AI Generation", 
    aiGenerationDescription: "Create music with artificial intelligence",
    
    settingsTitle: "Settings",
    settingsDescription: "App and profile settings",
    
    // Generation UI
    generateTrack: "Generating track...",
    searchTracks: "Search tracks, styles, artists...",
    searchTracksPlaceholder: "Search tracks...",
    createTrack: "Create Track",
    loginRequired: "Sign In Required",
    loginRequiredDesc: "You need to sign in to access AI Studio",
    tracks: "tracks",
    
    // Generation States
    statusPreparing: "Preparing",
    statusGenerating: "Generating",
    statusProcessing: "Processing", 
    statusSaving: "Saving",
    statusCompleted: "Completed",
    statusError: "Error",
    statusPending: "Queued",
    statusRunning: "Generating",
    
    // Task Queue
    activeTasks: "Active Tasks",
    recentTasks: "Recent Tasks",
    estimatedTime: "Estimated time",
    
    // Track Grid
    noTracks: "No Tracks",
    noTracksDesc: "Create your first track with AI generation",
    syncingTracks: "Syncing Tracks",
    syncingTracksDesc: "Loading tracks from external services...",
    
    // Generation Success
    generationStarted: "🎵 Generation Started",
    generationError: "Generation Error",
    generationErrorDesc: "An error occurred while starting generation",
    
    // Accessibility
    playTrack: "Play track",
    pauseTrack: "Pause track",
    downloadTrack: "Download track", 
    likeTrack: "Like track",
    moreOptions: "More options",
    filterTracks: "Filter tracks",
    syncTracks: "Sync tracks",
    retry: "Retry",
    cancel: "Cancel",
    
    // Network states
    offline: "Offline",
    online: "Online",
    
    // Common
    comingSoon: "Coming soon...",
    unknown: "Unknown",
  }
} as const;

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.ru;