/**
 * Unified API Error Handler for AI Services
 * Provides consistent error handling across all AI service integrations
 */

export interface APIError {
  code: string;
  message: string;
  statusCode?: number;
  retryable: boolean;
  service: 'suno' | 'mureka' | 'openai';
  originalError?: unknown;
}

export class APIErrorHandler {
  /**
   * Standardized error classification and handling
   */
  static handleError(error: unknown, service: 'suno' | 'mureka' | 'openai'): APIError {
    // Network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network connection failed',
        retryable: true,
        service
      };
    }

    // HTTP errors
    if (error instanceof Response) {
      return this.handleHTTPError(error, service);
    }

    // Generic errors
    if (error instanceof Error) {
      return this.handleGenericError(error, service);
    }

    // Unknown errors
    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      retryable: false,
      service,
      originalError: error
    };
  }

  private static handleHTTPError(response: Response, service: string): APIError {
    const statusCode = response.status;
    
    switch (statusCode) {
      case 400:
        return {
          code: 'INVALID_REQUEST',
          message: 'Invalid request parameters',
          statusCode,
          retryable: false,
          service: service as any
        };
      case 401:
        return {
          code: 'AUTHENTICATION_FAILED',
          message: 'API authentication failed - check your API key',
          statusCode,
          retryable: false,
          service: service as any
        };
      case 403:
        return {
          code: 'FORBIDDEN',
          message: 'Access denied - insufficient permissions',
          statusCode,
          retryable: false,
          service: service as any
        };
      case 404:
        return {
          code: 'ENDPOINT_NOT_FOUND',
          message: 'API endpoint not found',
          statusCode,
          retryable: false,
          service: service as any
        };
      case 429:
        return {
          code: 'RATE_LIMITED',
          message: 'Rate limit exceeded - please try again later',
          statusCode,
          retryable: true,
          service: service as any
        };
      case 500:
      case 502:
      case 503:
      case 504:
        return {
          code: 'SERVER_ERROR',
          message: 'Server error - please try again',
          statusCode,
          retryable: true,
          service: service as any
        };
      default:
        return {
          code: 'HTTP_ERROR',
          message: `HTTP ${statusCode} error`,
          statusCode,
          retryable: statusCode >= 500,
          service: service as any
        };
    }
  }

  private static handleGenericError(error: Error, service: string): APIError {
    const message = error.message.toLowerCase();

    // Timeout errors
    if (message.includes('timeout') || message.includes('abort')) {
      return {
        code: 'TIMEOUT_ERROR',
        message: 'Request timeout - please try again',
        retryable: true,
        service: service as any,
        originalError: error
      };
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid')) {
      return {
        code: 'VALIDATION_ERROR',
        message: error.message,
        retryable: false,
        service: service as any,
        originalError: error
      };
    }

    // Service-specific errors
    if (message.includes('suno') && service === 'suno') {
      return {
        code: 'SUNO_API_ERROR',
        message: error.message,
        retryable: message.includes('temporary') || message.includes('retry'),
        service: service as any,
        originalError: error
      };
    }

    if (message.includes('mureka') && service === 'mureka') {
      return {
        code: 'MUREKA_API_ERROR',
        message: error.message,
        retryable: message.includes('temporary') || message.includes('retry'),
        service: service as any,
        originalError: error
      };
    }

    // Generic error
    return {
      code: 'GENERIC_ERROR',
      message: error.message,
      retryable: false,
      service: service as any,
      originalError: error
    };
  }

  /**
   * Retry logic with exponential backoff
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    options: {
      maxAttempts?: number;
      baseDelay?: number;
      maxDelay?: number;
      backoffFactor?: number;
      retryCondition?: (error: APIError) => boolean;
    } = {}
  ): Promise<T> {
    const {
      maxAttempts = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      backoffFactor = 2,
      retryCondition = (error) => error.retryable
    } = options;

    let lastError: APIError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? this.handleError(error, 'suno') : error as APIError;

        // Don't retry on last attempt or non-retryable errors
        if (attempt === maxAttempts || !retryCondition(lastError)) {
          throw lastError;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = Math.min(
          baseDelay * Math.pow(backoffFactor, attempt - 1) + Math.random() * 1000,
          maxDelay
        );

        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms:`, lastError.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }
}