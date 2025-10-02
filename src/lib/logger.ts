/**
 * Production-safe logger that removes console logging in production builds
 * Sanitizes PII and sensitive data before logging
 */

const IS_PRODUCTION = import.meta.env.PROD;

const SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'key',
  'apiKey',
  'api_key',
  'accessToken',
  'refreshToken',
  'telegram_id',
  'telegram_username',
  'telegram_first_name',
  'telegram_last_name',
  'email',
  'phone',
  'user_id',
  'userId',
  'auth',
  'authorization'
];

/**
 * Recursively sanitize sensitive data from objects
 */
function sanitizeData(data: any): any {
  if (data === null || data === undefined) return data;
  
  if (typeof data === 'string') {
    // Redact if string looks like token/key
    if (data.length > 20 && /^[A-Za-z0-9_-]{20,}$/.test(data)) {
      return '[REDACTED]';
    }
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }
  
  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.some(sk => lowerKey.includes(sk.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeData(value);
      }
    }
    return sanitized;
  }
  
  return data;
}

/**
 * Safe logger for development with PII filtering
 */
export const logger = {
  log(...args: any[]) {
    if (IS_PRODUCTION) return;
    console.log(...args.map(sanitizeData));
  },
  
  info(...args: any[]) {
    if (IS_PRODUCTION) return;
    console.info(...args.map(sanitizeData));
  },
  
  warn(...args: any[]) {
    if (IS_PRODUCTION) return;
    console.warn(...args.map(sanitizeData));
  },
  
  error(...args: any[]) {
    // Always log errors but sanitize them
    console.error(...args.map(sanitizeData));
  },
  
  debug(...args: any[]) {
    if (IS_PRODUCTION) return;
    console.debug(...args.map(sanitizeData));
  }
};

/**
 * Logger specifically for security-sensitive operations
 */
export const securityLogger = {
  log(message: string, data?: any) {
    if (IS_PRODUCTION) return;
    console.log(`[SECURITY] ${message}`, data ? sanitizeData(data) : '');
  },
  
  warn(message: string, data?: any) {
    if (IS_PRODUCTION) return;
    console.warn(`[SECURITY] ${message}`, data ? sanitizeData(data) : '');
  },
  
  error(message: string, data?: any) {
    // Always log security errors
    console.error(`[SECURITY] ${message}`, data ? sanitizeData(data) : '');
  }
};
