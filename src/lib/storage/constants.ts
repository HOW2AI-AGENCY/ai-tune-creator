// Storage bucket constants
export const BUCKET_AUDIO = 'albert-tracks';
export const BUCKET_PROJECT_COVERS = 'project-covers';
export const BUCKET_AVATARS = 'avatars';
export const BUCKET_ARTIST_ASSETS = 'artist-assets';
export const BUCKET_PROMO = 'promo-materials';
export const BUCKET_USER_UPLOADS = 'user-uploads';

// Storage configuration
export const AUDIO_CONTENT_TYPE = 'audio/mpeg';
export const AUDIO_CACHE_CONTROL = 'public, max-age=31536000, immutable';

// Build safe storage path with timestamp and random suffix
export function buildStoragePath(
  userId: string,
  service: 'suno' | 'mureka',
  taskId: string,
  baseFileName: string
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const fileName = `${timestamp}-${random}-${baseFileName}`;
  return `${userId}/${service}/${taskId}/${fileName}`;
}

// Validate audio URL for playback
export function isValidAudioUrl(url: string): boolean {
  if (!url) return false;
  
  try {
    const urlObj = new URL(url);
    
    // Protocol check
    if (urlObj.protocol !== 'https:') return false;
    
    // Domain whitelist
    const allowedDomains = [
      'zwbhlfhwymbmvioaikvs.supabase.co',
      'supabase.co',
      'cdn.sunoapi.org',
      'api.sunoapi.org',
      'api.mureka.ai',
      'tempfile.redpandaai.co'
    ];
    
    const isAllowedDomain = allowedDomains.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
    );
    
    if (!isAllowedDomain) return false;
    
    // File extension check
    const pathname = urlObj.pathname.toLowerCase();
    const validExtensions = ['.mp3', '.wav', '.m4a', '.ogg'];
    const hasValidExtension = validExtensions.some(ext => pathname.endsWith(ext));
    
    return hasValidExtension;
  } catch {
    return false;
  }
}