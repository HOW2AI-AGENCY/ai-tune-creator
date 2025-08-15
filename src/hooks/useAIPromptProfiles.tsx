import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface PromptProfile {
  id: string;
  name: string;
  description: string;
  service: 'suno' | 'mureka' | 'both';
  style_template: string;
  genre_tags: string[];
  voice_style?: string;
  language?: string;
  tempo?: string;
  is_active: boolean;
}

export function useAIPromptProfiles() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<PromptProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<PromptProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfiles = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('category', 'ai_prompts')
        .eq('user_id', user.id);

      if (error) throw error;

      const profilesData = data?.map(item => ({
        id: item.id,
        ...(item.value as any),
      })) || [];

      setProfiles(profilesData);
      
      // Find and set active profile
      const active = profilesData.find(p => p.is_active);
      setActiveProfile(active || null);
    } catch (error: any) {
      console.error('Error loading prompt profiles:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить профили промптов",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const applyProfile = (profile: PromptProfile, service: 'suno' | 'mureka') => {
    // Return applied settings based on profile and service
    if (profile.service !== 'both' && profile.service !== service) {
      return null; // Profile not compatible with current service
    }

    return {
      stylePrompt: profile.style_template,
      genreTags: profile.genre_tags,
      voiceStyle: profile.voice_style,
      language: profile.language,
      tempo: profile.tempo
    };
  };

  const getActiveProfileForService = (service: 'suno' | 'mureka') => {
    if (!activeProfile) return null;
    return applyProfile(activeProfile, service);
  };

  const activateProfile = async (profileId: string) => {
    try {
      // Deactivate all profiles first
      const allProfiles = await supabase
        .from('user_settings')
        .select('*')
        .eq('category', 'ai_prompts')
        .eq('user_id', user?.id);

      for (const profile of allProfiles.data || []) {
        await supabase
          .from('user_settings')
          .update({
            value: { ...(profile.value as any), is_active: false }
          })
          .eq('id', profile.id);
      }

      // Activate the selected profile
      const profile = profiles.find(p => p.id === profileId);
      if (profile) {
        const { error } = await supabase
          .from('user_settings')
          .update({
            value: {
              ...(profile as any),
              is_active: true
            }
          })
          .eq('id', profileId);

        if (error) throw error;

        setActiveProfile({ ...profile, is_active: true });
        toast({
          title: "Профиль активирован",
          description: `Профиль "${profile.name}" теперь активен`
        });
      }
    } catch (error: any) {
      console.error('Error activating profile:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось активировать профиль",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadProfiles();
  }, [user]);

  return {
    profiles,
    activeProfile,
    loading,
    loadProfiles,
    applyProfile,
    getActiveProfileForService,
    activateProfile
  };
}