import { supabase } from '@/integrations/supabase/client';
import { BUCKET_AUDIO } from './constants';

/**
 * Generates a signed URL for private audio storage access
 * @param storagePath The path in storage bucket
 * @param expiresIn Expiration time in seconds (default: 1 hour)
 * @returns Promise with signed URL or null
 */
export async function createSignedAudioUrl(
  storagePath: string, 
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    if (!storagePath) {
      console.warn('createSignedAudioUrl: storagePath is empty');
      return null;
    }

    const { data, error } = await supabase.storage
      .from(BUCKET_AUDIO)
      .createSignedUrl(storagePath, expiresIn);

    if (error) {
      console.error('Failed to create signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error creating signed URL:', error);
    return null;
  }
}

/**
 * Generates signed URLs for multiple audio files
 * @param storagePaths Array of storage paths
 * @param expiresIn Expiration time in seconds (default: 1 hour)
 * @returns Promise with array of signed URLs (null for failed items)
 */
export async function createSignedAudioUrls(
  storagePaths: string[],
  expiresIn: number = 3600
): Promise<(string | null)[]> {
  const promises = storagePaths.map(path => createSignedAudioUrl(path, expiresIn));
  return Promise.all(promises);
}

/**
 * Determines if a URL is a private storage URL that needs signing
 * @param url The URL to check
 * @returns boolean indicating if it needs a signed URL
 */
export function needsSignedUrl(url: string): boolean {
  if (!url) return false;
  
  // Check if it's a Supabase storage URL without a signed token
  const isSupabaseStorage = url.includes('supabase.co/storage/v1/object/');
  const hasSignedToken = url.includes('token=') || url.includes('t=');
  
  return isSupabaseStorage && !hasSignedToken;
}

/**
 * Gets the storage path from a full storage URL
 * @param url Full storage URL
 * @returns Storage path or null if not a valid storage URL
 */
export function extractStoragePath(url: string): string | null {
  try {
    if (!url.includes('storage/v1/object/')) return null;
    
    const parts = url.split('storage/v1/object/');
    if (parts.length < 2) return null;
    
    // Remove bucket name and decode
    const pathWithBucket = parts[1];
    const pathParts = pathWithBucket.split('/');
    
    if (pathParts.length < 2) return null;
    
    // Remove bucket name, keep the rest
    pathParts.shift();
    return decodeURIComponent(pathParts.join('/'));
  } catch (error) {
    console.error('Error extracting storage path:', error);
    return null;
  }
}
