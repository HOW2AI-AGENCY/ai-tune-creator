/**
 * Secure User Profile Utilities
 * 
 * This module provides secure access to user profile data with proper privacy controls.
 * Uses the new secure database functions created by the security migration.
 */

import { supabase } from '@/integrations/supabase/client';

export interface SecureProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  telegram_id?: string | null;
  telegram_username?: string | null;
  telegram_first_name?: string | null;
  telegram_last_name?: string | null;
  preferences: any;
  created_at: string;
  updated_at: string;
}

/**
 * Get current user's own profile data
 * This uses RLS policies to ensure users can only access their own data
 */
export const getCurrentUserProfile = async (): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Profile fetch failed:', error);
    return null;
  }
};

/**
 * Get minimal public profile data for a specific user
 * Uses the secure get_public_profile function that only exposes safe data
 */
export const getPublicProfile = async (userId: string): Promise<SecureProfile | null> => {
  try {
    const { data, error } = await supabase
      .rpc('get_public_profile', {
        profile_user_id: userId
      });

    if (error) {
      console.error('Error fetching public profile:', error);
      return null;
    }

    return data?.[0] || null;
  } catch (error) {
    console.error('Public profile fetch failed:', error);
    return null;
  }
};

/**
 * Update current user's profile
 * Only allows updating own profile data
 */
export const updateUserProfile = async (updates: Partial<UserProfile>): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

    if (error) {
      console.error('Error updating profile:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Profile update failed:', error);
    return false;
  }
};

/**
 * Create user profile with safe defaults
 */
export const createUserProfile = async (profileData: Partial<UserProfile>): Promise<UserProfile | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('No authenticated user');
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        user_id: user.id,
        display_name: profileData.display_name || null,
        avatar_url: profileData.avatar_url || null,
        bio: profileData.bio || null,
        telegram_id: profileData.telegram_id || null,
        telegram_username: profileData.telegram_username || null,
        telegram_first_name: profileData.telegram_first_name || null,
        telegram_last_name: profileData.telegram_last_name || null,
        preferences: profileData.preferences || {}
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Profile creation failed:', error);
    return null;
  }
};

/**
 * Get Telegram-specific data for current user
 * This is sensitive data that should only be accessible to the user themselves
 */
export const getTelegramData = async (): Promise<{
  telegram_id?: string | null;
  telegram_username?: string | null;
  telegram_first_name?: string | null;
  telegram_last_name?: string | null;
} | null> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('telegram_id, telegram_username, telegram_first_name, telegram_last_name')
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching Telegram data:', error);
      return null;
    }

    return data || {};
  } catch (error) {
    console.error('Telegram data fetch failed:', error);
    return null;
  }
};