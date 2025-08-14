import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { userDataCache } from '@/lib/cache/CacheManager';

export interface AISettings {
  provider: 'openai' | 'anthropic' | 'deepseek';
  model: string;
  temperature: number;
  maxTokens: number;
  customPrompts: {
    artistGeneration: string;
    lyricsGeneration: string;
    marketingMaterials: string;
    // T-052: Добавляем промпты для треков
    trackConceptGeneration: string;
    trackDescriptionGeneration: string;
  };
}

const DEFAULT_SETTINGS: AISettings = {
  provider: 'openai',
  model: 'gpt-4o-mini',
  temperature: 0.8,
  maxTokens: 1000,
  customPrompts: {
    artistGeneration: 'Создай детальный профиль артиста, который будет полезен для дальнейшего создания лирики и маркетинговых материалов.',
    lyricsGeneration: 'Создай текст песни в стиле и тематике данного артиста.',
    marketingMaterials: 'Создай маркетинговые материалы для продвижения артиста и его музыки.',
    // T-052: Промпты для генерации треков
    trackConceptGeneration: 'Создай концепцию трека с описанием стиля, настроения и основной идеи песни.',
    trackDescriptionGeneration: 'Создай краткое описание трека, которое будет использоваться для его продвижения и каталогизации.'
  }
};

const MODEL_OPTIONS = {
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o (Самый мощный)' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Быстрый)' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' }
  ],
  anthropic: [
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus (Самый мощный)' },
    { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet (Сбалансированный)' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku (Быстрый)' }
  ],
  deepseek: [
    { value: 'deepseek-chat', label: 'DeepSeek Chat' },
    { value: 'deepseek-coder', label: 'DeepSeek Coder' }
  ]
};

export function useAISettings() {
  const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Check cache first
      const cacheKey = `ai_settings_${user.id}`;
      const cachedSettings = userDataCache.get(cacheKey);
      if (cachedSettings) {
        setSettings({ ...DEFAULT_SETTINGS, ...cachedSettings });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_settings')
        .select('value')
        .eq('user_id', user.id)
        .eq('category', 'ai')
        .eq('key', 'settings')
        .maybeSingle();

      if (error) {
        throw error;
      }

      const settingsData = data?.value || {};
      const mergedSettings = { ...DEFAULT_SETTINGS, ...settingsData as Partial<AISettings> };
      
      setSettings(mergedSettings);
      userDataCache.set(cacheKey, settingsData, 10 * 60 * 1000); // Cache for 10 minutes
    } catch (error: any) {
      console.error('Error loading AI settings:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить настройки ИИ",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: Partial<AISettings>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }

      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          category: 'ai',
          key: 'settings',
          value: updatedSettings
        });

      if (error) {
        throw error;
      }

      // Update cache
      const cacheKey = `ai_settings_${user.id}`;
      userDataCache.set(cacheKey, updatedSettings, 10 * 60 * 1000);

      toast({
        title: "Успешно",
        description: "Настройки ИИ сохранены"
      });
    } catch (error: any) {
      console.error('Error saving AI settings:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить настройки ИИ",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return {
    settings,
    loading,
    saveSettings,
    modelOptions: MODEL_OPTIONS,
    defaultSettings: DEFAULT_SETTINGS
  };
}