/**
 * Оптимизированный хук для работы с настройками пользователя
 * Заменяет useUserSettings с улучшенной производительностью
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { memoize, debounce } from '@/lib/performance/PerformanceOptimizer';
import { createComponentLogger } from '@/lib/debug/ConsoleManager';

const logger = createComponentLogger('useOptimizedSettings');

interface UserSettings {
  profile: {
    display_name?: string;
    bio?: string;
    avatar_url?: string;
  };
  notifications: {
    email_notifications: boolean;
    push_notifications: boolean;
    ai_generation_complete: boolean;
    project_updates: boolean;
    weekly_digest: boolean;
  };
  preferences: {
    default_ai_service: string;
    auto_save_projects: boolean;
    theme: 'light' | 'dark' | 'system';
  };
  ai_settings: {
    provider: string;
    model: string;
    temperature: number;
    max_tokens: number;
    custom_prompts: Record<string, string>;
  };
}

const defaultSettings: UserSettings = {
  profile: { display_name: '', bio: '', avatar_url: '' },
  notifications: {
    email_notifications: true,
    push_notifications: false,
    ai_generation_complete: true,
    project_updates: true,
    weekly_digest: false
  },
  preferences: {
    default_ai_service: 'suno',
    auto_save_projects: true,
    theme: 'system'
  },
  ai_settings: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.8,
    max_tokens: 1000,
    custom_prompts: {
      artist_generation: 'Создай детальный профиль артиста для музыкального проекта.',
      lyrics_generation: 'Создай текст песни в указанном стиле.',
      marketing_materials: 'Создай маркетинговые материалы для продвижения.'
    }
  }
};

// Мемоизированная функция загрузки настроек
const loadUserSettings = memoize(
  async (userId: string): Promise<UserSettings> => {
    logger.info('Loading user settings', { userId });
    
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('display_name, bio, avatar_url, preferences')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      logger.error('Failed to load settings', error);
      throw error;
    }

    if (!profileData) {
      logger.info('No profile found, using defaults');
      return defaultSettings;
    }

    const savedPrefs = (profileData.preferences as any) || {};
    return {
      profile: {
        display_name: profileData.display_name || '',
        bio: profileData.bio || '',
        avatar_url: profileData.avatar_url || ''
      },
      notifications: savedPrefs.notifications || defaultSettings.notifications,
      preferences: savedPrefs.preferences || defaultSettings.preferences,
      ai_settings: savedPrefs.ai_settings || defaultSettings.ai_settings
    };
  },
  (userId: string) => `settings_${userId}`,
  2 * 60 * 1000 // кеш на 2 минуты
);

export const useOptimizedSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Оптимизированная загрузка настроек
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const loadedSettings = await loadUserSettings(user.id);
        setSettings(loadedSettings);
      } catch (error: any) {
        logger.error('Settings load failed', error);
        toast({
          title: 'Ошибка',
          description: 'Не удалось загрузить настройки',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [user, toast]);

  // Debounced функция сохранения
  const debouncedSave = useCallback(
    debounce(async (settingsToSave: UserSettings, userId: string) => {
      try {
        logger.info('Saving settings', { userId });
        
        // Сохранение профиля
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            user_id: userId,
            display_name: settingsToSave.profile.display_name,
            bio: settingsToSave.profile.bio,
            avatar_url: settingsToSave.profile.avatar_url,
            preferences: {
              notifications: settingsToSave.notifications,
              preferences: settingsToSave.preferences,
              ai_settings: settingsToSave.ai_settings
            },
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });

        if (profileError) throw profileError;

        logger.info('Settings saved successfully');
        toast({
          title: 'Настройки сохранены',
          description: 'Все настройки успешно обновлены'
        });

        // Очищаем кеш после сохранения
        loadUserSettings.clearCache?.(`settings_${userId}`);

      } catch (error: any) {
        logger.error('Settings save failed', error);
        toast({
          title: 'Ошибка сохранения',
          description: error.message || 'Не удалось сохранить настройки',
          variant: 'destructive'
        });
      } finally {
        setIsSaving(false);
      }
    }, 1000, 'saveSettings'),
    [toast]
  );

  // Оптимизированное обновление настроек
  const updateSetting = useCallback((section: keyof UserSettings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  }, []);

  // Мгновенное сохранение для критических изменений
  const saveSettingsImmediately = useCallback(async (section?: keyof UserSettings) => {
    if (!user) return false;

    setIsSaving(true);
    
    // Отменяем debounced сохранение и сохраняем немедленно
    try {
      await debouncedSave(settings, user.id);
      return true;
    } catch (error) {
      logger.error('Immediate save failed', error);
      return false;
    }
  }, [user, settings, debouncedSave]);

  // Автосохранение с debounce
  useEffect(() => {
    if (!user || isLoading) return;
    
    setIsSaving(true);
    debouncedSave(settings, user.id);
  }, [settings, user, isLoading, debouncedSave]);

  return {
    settings,
    isLoading,
    isSaving,
    updateSetting,
    saveSettings: saveSettingsImmediately
  };
};