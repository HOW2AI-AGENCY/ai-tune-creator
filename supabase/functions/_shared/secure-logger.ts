/**
 * Secure logging utility for Edge Functions
 * Prevents logging of sensitive information and provides structured logging
 */

// Sensitive field patterns to redact
const SENSITIVE_PATTERNS = [
  /api[_-]?key/i,
  /token/i,
  /secret/i,
  /password/i,
  /auth/i,
  /bearer/i,
  /credential/i,
  /private[_-]?key/i,
  /session/i,
  /jwt/i,
  /email/i,
  /phone/i,
  /ssn/i,
  /credit[_-]?card/i,
];

export interface LogContext {
  userId?: string;
  functionName?: string;
  requestId?: string;
  timestamp?: string;
  duration?: number;
  [key: string]: any;
}

export class SecureLogger {
  private static redactSensitiveData(obj: any, depth = 0): any {
    // Prevent infinite recursion
    if (depth > 5) return '[Max Depth Reached]';
    
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item, index) => {
        if (index > 100) return '[Array Too Large]'; // Prevent huge arrays
        return this.redactSensitiveData(item, depth + 1);
      });
    }

    const redacted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Check if key matches sensitive patterns
      const isSensitive = SENSITIVE_PATTERNS.some(pattern => pattern.test(key));
      
      if (isSensitive) {
        redacted[key] = '[REDACTED]';
      } else if (typeof value === 'string' && value.length > 500) {
        // Truncate long strings to prevent log spam
        redacted[key] = `${value.substring(0, 100)}... [TRUNCATED ${value.length} chars]`;
      } else {
        redacted[key] = this.redactSensitiveData(value, depth + 1);
      }
    }
    
    return redacted;
  }

  private static formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (context?.functionName) {
      return `${prefix} [${context.functionName}] ${message}`;
    }
    
    return `${prefix} ${message}`;
  }

  static info(message: string, context?: LogContext, data?: any): void {
    const formattedMessage = this.formatMessage('info', message, context);
    
    if (data) {
      const safeData = this.redactSensitiveData(data);
      console.log(formattedMessage, safeData);
    } else {
      console.log(formattedMessage);
    }
  }

  static warn(message: string, context?: LogContext, data?: any): void {
    const formattedMessage = this.formatMessage('warn', message, context);
    
    if (data) {
      const safeData = this.redactSensitiveData(data);
      console.warn(formattedMessage, safeData);
    } else {
      console.warn(formattedMessage);
    }
  }

  static error(message: string, context?: LogContext, error?: Error | any): void {
    const formattedMessage = this.formatMessage('error', message, context);
    
    if (error) {
      const safeError = {
        message: error?.message || 'Unknown error',
        name: error?.name || 'Error',
        stack: error?.stack?.split('\n').slice(0, 5).join('\n'), // Limit stack trace
        ...(error instanceof Error ? {} : this.redactSensitiveData(error))
      };
      console.error(formattedMessage, safeError);
    } else {
      console.error(formattedMessage);
    }
  }

  static debug(message: string, context?: LogContext, data?: any): void {
    // Only log debug in development
    const isDev = Deno.env.get('ENVIRONMENT') !== 'production';
    if (!isDev) return;

    const formattedMessage = this.formatMessage('debug', message, context);
    
    if (data) {
      const safeData = this.redactSensitiveData(data);
      console.debug(formattedMessage, safeData);
    } else {
      console.debug(formattedMessage);
    }
  }

  static logAPICall(
    functionName: string, 
    method: string, 
    userId?: string,
    params?: any,
    duration?: number
  ): void {
    const context: LogContext = {
      functionName,
      userId,
      duration,
      timestamp: new Date().toISOString()
    };

    const safeParams = params ? this.redactSensitiveData(params) : undefined;
    
    this.info(`API Call: ${method}`, context, safeParams);
  }

  static logAuthentication(
    functionName: string,
    userId: string,
    success: boolean,
    method?: string
  ): void {
    const context: LogContext = {
      functionName,
      userId,
      timestamp: new Date().toISOString()
    };

    const message = success 
      ? `Authentication successful${method ? ` via ${method}` : ''}`
      : `Authentication failed${method ? ` via ${method}` : ''}`;

    if (success) {
      this.info(message, context);
    } else {
      this.warn(message, context);
    }
  }

  static logRateLimit(
    functionName: string,
    userId: string,
    blocked: boolean,
    remainingRequests?: number
  ): void {
    const context: LogContext = {
      functionName,
      userId,
      timestamp: new Date().toISOString()
    };

    if (blocked) {
      this.warn('Rate limit exceeded', context, { remainingRequests: 0 });
    } else {
      this.debug('Rate limit check passed', context, { remainingRequests });
    }
  }

  static logDatabaseOperation(
    functionName: string,
    operation: string,
    table: string,
    userId?: string,
    duration?: number,
    error?: Error
  ): void {
    const context: LogContext = {
      functionName,
      userId,
      duration,
      timestamp: new Date().toISOString()
    };

    const message = `Database ${operation} on ${table}`;
    
    if (error) {
      this.error(`${message} failed`, context, error);
    } else {
      this.info(`${message} completed`, context);
    }
  }
}

// Export aliases for convenience
export const logger = SecureLogger;
export default SecureLogger;