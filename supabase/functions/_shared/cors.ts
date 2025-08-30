// Centralized CORS configuration for edge functions
// This file provides secure CORS headers based on function type and security requirements

export interface CorsConfig {
  allowedOrigins: string[];
  allowCredentials?: boolean;
  additionalHeaders?: string[];
}

// Default secure CORS configuration
export const getSecureCorsHeaders = (origin?: string, config?: CorsConfig) => {
  const defaultConfig: CorsConfig = {
    allowedOrigins: [
      'https://zwbhlfhwymbmvioaikvs.supabase.co', // Main app domain
    ],
    allowCredentials: false,
    additionalHeaders: []
  };

  // Add development origins in non-production
  const isDev = Deno.env.get('ENVIRONMENT') !== 'production';
  if (isDev) {
    defaultConfig.allowedOrigins.push(
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    );
  }

  const finalConfig = { ...defaultConfig, ...config };
  const allowedOrigin = origin && finalConfig.allowedOrigins.includes(origin) 
    ? origin 
    : finalConfig.allowedOrigins[0];

  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': [
      'authorization',
      'x-client-info', 
      'apikey',
      'content-type',
      ...finalConfig.additionalHeaders
    ].join(', '),
  };

  if (finalConfig.allowCredentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
};

// For Telegram authentication - more permissive but still restricted
export const getTelegramCorsHeaders = (origin?: string) => {
  return getSecureCorsHeaders(origin, {
    allowedOrigins: [
      'https://web.telegram.org',
      'https://telegram.org',
      'https://t.me',
      'https://zwbhlfhwymbmvioaikvs.supabase.co',
      // Add development origins
      ...(Deno.env.get('ENVIRONMENT') !== 'production' ? [
        'http://localhost:3000',
        'http://127.0.0.1:3000'
      ] : [])
    ],
    allowCredentials: true
  });
};

// For service-only functions (cron, webhooks) - no browser access needed
export const getServiceOnlyCorsHeaders = () => {
  return {
    'Access-Control-Allow-Origin': 'null', // No browser access
    'Access-Control-Allow-Headers': 'content-type, x-cron-secret',
  };
};

// For admin-only functions
export const getAdminOnlyCorsHeaders = (origin?: string) => {
  return getSecureCorsHeaders(origin, {
    allowedOrigins: [
      'https://zwbhlfhwymbmvioaikvs.supabase.co',
      ...(Deno.env.get('ENVIRONMENT') !== 'production' ? [
        'http://localhost:3000',
        'http://127.0.0.1:3000'
      ] : [])
    ]
  });
};