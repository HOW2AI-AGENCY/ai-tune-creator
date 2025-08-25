import { useState, useEffect } from 'react';
import { createSignedAudioUrl, needsSignedUrl, extractStoragePath } from '@/lib/storage';

/**
 * Hook to handle signed URLs for private audio storage
 * @param audioUrl The audio URL (can be external or storage URL)
 * @param storagePath Optional: direct storage path if available
 * @returns Object with playbackUrl and loading state
 */
export function useSignedAudioUrl(audioUrl?: string, storagePath?: string) {
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!audioUrl) {
      setPlaybackUrl(null);
      setError(null);
      return;
    }

    // If it's an external URL or already signed, use it directly
    if (!needsSignedUrl(audioUrl)) {
      setPlaybackUrl(audioUrl);
      setError(null);
      return;
    }

    // Need to create a signed URL
    setLoading(true);
    setError(null);

    const generateSignedUrl = async () => {
      try {
        let pathToSign = storagePath;
        
        // Extract path from URL if not provided
        if (!pathToSign) {
          pathToSign = extractStoragePath(audioUrl);
          if (!pathToSign) {
            throw new Error('Could not extract storage path from URL');
          }
        }

        const signedUrl = await createSignedAudioUrl(pathToSign);
        
        if (!signedUrl) {
          throw new Error('Failed to create signed URL');
        }

        setPlaybackUrl(signedUrl);
      } catch (err) {
        console.error('Error creating signed URL:', err);
        setError(err instanceof Error ? err.message : 'Failed to create signed URL');
        // Fallback to original URL
        setPlaybackUrl(audioUrl);
      } finally {
        setLoading(false);
      }
    };

    generateSignedUrl();
  }, [audioUrl, storagePath]);

  return {
    playbackUrl,
    loading,
    error,
    needsSigning: audioUrl ? needsSignedUrl(audioUrl) : false
  };
}