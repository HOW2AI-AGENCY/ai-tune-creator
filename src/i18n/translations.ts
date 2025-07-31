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
    
    // Common
    comingSoon: "Скоро...",
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
    
    // Common
    comingSoon: "Coming soon...",
  }
} as const;

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.ru;