import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useTelegramAuth } from '@/hooks/useTelegramAuth';

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

export const useUserSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { authData } = useTelegramAuth();
  
  const [settings, setSettings] = useState<UserSettings>({
    profile: {
      display_name: '',
      bio: '',
      avatar_url: ''
    },
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
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load user settings from Supabase
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return;

      try {
        // Load profile data with preferences
        const { data: profileData } = await supabase
          .from('profiles')
          .select('display_name, bio, avatar_url, preferences')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileData) {
          const savedPrefs = (profileData.preferences as any) || {};
          setSettings(prev => ({
            ...prev,
            profile: {
              display_name: profileData.display_name || '',
              bio: profileData.bio || '',
              avatar_url: profileData.avatar_url || ''
            },
            notifications: savedPrefs.notifications || prev.notifications,
            preferences: savedPrefs.preferences || prev.preferences,
            ai_settings: savedPrefs.ai_settings || prev.ai_settings
          }));
        }

      } catch (error) {
        console.error('Error loading settings:', error);
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

  // Save settings to Supabase
  const saveSettings = async (section?: keyof UserSettings) => {
    if (!user) return false;

    setIsSaving(true);
    try {
      // Save profile data
      if (!section || section === 'profile') {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            user_id: user.id,
            display_name: settings.profile.display_name,
            bio: settings.profile.bio,
            avatar_url: settings.profile.avatar_url,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });

        if (profileError) throw profileError;
      }

      // Save preferences in profiles table
      if (!section || ['notifications', 'preferences', 'ai_settings'].includes(section)) {
        const { error: preferencesError } = await supabase
          .from('profiles')
          .upsert({
            user_id: user.id,
            preferences: {
              notifications: settings.notifications,
              preferences: settings.preferences,
              ai_settings: settings.ai_settings
            },
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });

        if (preferencesError) throw preferencesError;
      }

      toast({
        title: 'Настройки сохранены',
        description: section ? 
          `Настройки ${section} успешно обновлены` : 
          'Все настройки успешно сохранены'
      });

      return true;

    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Ошибка сохранения',
        description: error.message || 'Не удалось сохранить настройки',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Update specific setting
  const updateSetting = (section: keyof UserSettings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  // Link account helpers
  const linkAccount = async (provider: 'email' | 'telegram', credentials: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('link-account', {
        body: { provider, credentials }
      });

      if (error) throw error;

      toast({
        title: 'Аккаунт привязан',
        description: `${provider === 'email' ? 'Email' : 'Telegram'} успешно привязан к аккаунту`
      });

      return true;
    } catch (error: any) {
      toast({
        title: 'Ошибка привязки',
        description: error.message || 'Не удалось привязать аккаунт',
        variant: 'destructive'
      });
      return false;
    }
  };

  return {
    settings,
    isLoading,
    isSaving,
    updateSetting,
    saveSettings,
    linkAccount,
    isConnectedViaTelegram: !!authData
  };
};