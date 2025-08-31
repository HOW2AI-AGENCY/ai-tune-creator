// Centralized CORS configuration for edge functions
// This file provides secure CORS headers based on function type and security requirements

// Function to check if an origin is allowed
const isOriginAllowed = (origin: string, allowedOrigins: (string | RegExp)[]): boolean => {
  if (!origin) return false;
  for (const allowed of allowedOrigins) {
    if (typeof allowed === 'string' && allowed === origin) {
      return true;
    }
    if (allowed instanceof RegExp && allowed.test(origin)) {
      return true;
    }
  }
  return false;
};

// Default secure CORS configuration
export const getSecureCorsHeaders = (origin?: string) => {
  const allowedOrigins: (string | RegExp)[] = [
    'https://zwbhlfhwymbmvioaikvs.supabase.co', // Main app domain
    /https?:\/\/localhost(:\d+)?/, // http://localhost, https://localhost, with any port
    /https:\/\/.*--lovable-app\.netlify\.app/, // Netlify preview domains
    /https:\/\/.*\.lovable\.app/, // Lovable preview domains
    'https://lovable.app' // Main production domain
  ];

  const headers = new Headers();

  if (origin && isOriginAllowed(origin, allowedOrigins)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Vary', 'Origin');
  } else {
    // Fallback for safety, though browsers might block this anyway
    headers.set('Access-Control-Allow-Origin', 'https://lovable.app');
  }

  headers.set('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type, x-cron-secret');
  headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, DELETE, PUT');
  headers.set('Access-Control-Allow-Credentials', 'true');

  return Object.fromEntries(headers.entries());
};

// For Telegram authentication - more permissive but still restricted
export const getTelegramCorsHeaders = (origin?: string) => {
  const telegramAllowedOrigins: (string | RegExp)[] = [
    'https://web.telegram.org',
    'https://telegram.org',
    'https://t.me',
    /https?:\/\/localhost(:\d+)?/,
    'https://zwbhlfhwymbmvioaikvs.supabase.co',
    'https://lovable.app'
  ];

  const headers = new Headers();
  if (origin && isOriginAllowed(origin, telegramAllowedOrigins)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Vary', 'Origin');
  } else {
    headers.set('Access-Control-Allow-Origin', 'https://lovable.app');
  }

  headers.set('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  headers.set('Access-Control-Allow-Credentials', 'true');

  return Object.fromEntries(headers.entries());
};

// For service-only functions (cron, webhooks) - no browser access needed
export const getServiceOnlyCorsHeaders = () => {
  return {
    'Access-Control-Allow-Origin': 'null', // No browser access
    'Access-Control-Allow-Headers': 'content-type, x-cron-secret, x-webhook-secret, authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
};

// For admin-only functions
export const getAdminOnlyCorsHeaders = (origin?: string) => {
  const adminAllowedOrigins: (string | RegExp)[] = [
    'https://zwbhlfhwymbmvioaikvs.supabase.co',
    /https?:\/\/localhost(:\d+)?/,
    'https://lovable.app' // Allow from main app for admin actions
  ];

  const headers = new Headers();
  if (origin && isOriginAllowed(origin, adminAllowedOrigins)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Vary', 'Origin');
  } else {
    headers.set('Access-Control-Allow-Origin', 'https://lovable.app');
  }

  headers.set('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, DELETE');
  headers.set('Access-Control-Allow-Credentials', 'true');

  return Object.fromEntries(headers.entries());
};

// Authentication helper for Edge Functions
export const authenticateUser = async (req: Request) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { user: null, error: 'Missing or invalid Authorization header' };
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return { user: null, error: 'Authentication failed' };
    }

    return { user, error: null, supabase };
  } catch (error) {
    return { user: null, error: 'Authentication error' };
  }
};

// Import required for auth helper
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';