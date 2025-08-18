export interface QuickPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  genre: string;
  mood: string;
  prompt: string;
  tags: string[];
  service: 'suno' | 'mureka';
}

export interface GenerationParams {
  // Основной контент (всегда заполнен)
  prompt: string;  // Описание стиля ИЛИ лирика (зависит от inputType)
  
  // Контекст генерации
  service: 'suno' | 'mureka';
  mode: 'quick' | 'custom';
  inputType: 'description' | 'lyrics';  // Обязательное поле для понимания содержимого prompt
  
  // Проект и артист
  projectId?: string;
  artistId?: string;
  useInbox?: boolean;
  
  // Стилистика и жанры
  stylePrompt?: string;    // Дополнительное описание стиля (только для description режима)
  genreTags?: string[];    // Жанровые теги
  
  // Аудио параметры
  tempo?: string;
  duration?: number;
  instrumental?: boolean;
  voiceStyle?: string;
  language?: string;
}

export interface Option {
  id: string;
  name: string;
}