/**
 * Core API Client for AI Services
 * Modular and reusable across projects
 */

export interface APIClientConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  body?: any;
}

export interface APIResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
  success: boolean;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class APIClient {
  private config: APIClientConfig;
  private rateLimitInfo: Map<string, RateLimitInfo> = new Map();

  constructor(config: APIClientConfig) {
    this.config = {
      timeout: 30000,
      retries: 3,
      ...config
    };
  }

  /**
   * Make HTTP request with automatic retries and error handling
   */
  async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<APIResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const method = options.method || 'GET';
    const timeout = options.timeout || this.config.timeout;
    const maxRetries = options.retries ?? this.config.retries;

    // Check rate limits
    await this.waitForRateLimit(endpoint);

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
      ...this.config.headers,
      ...options.headers
    };

    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const requestOptions: RequestInit = {
          method,
          headers,
          signal: controller.signal
        };

        if (options.body && method !== 'GET') {
          requestOptions.body = typeof options.body === 'string' 
            ? options.body 
            : JSON.stringify(options.body);
        }

        const response = await fetch(url, requestOptions);
        clearTimeout(timeoutId);

        // Update rate limit info
        this.updateRateLimitInfo(endpoint, response.headers);

        if (!response.ok) {
          const errorData = await this.parseErrorResponse(response);
          const retryable = this.isRetryableError(response.status);
          
          if (retryable && attempt < maxRetries) {
            await this.wait(this.getBackoffDelay(attempt));
            continue;
          }

          throw new APIError(
            errorData.message || `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            errorData,
            retryable
          );
        }

        const data = await this.parseResponse<T>(response);
        
        return {
          data,
          status: response.status,
          headers: this.responseHeadersToObject(response.headers),
          success: true
        };

      } catch (error) {
        lastError = error as Error;
        
        if (error instanceof APIError && !error.retryable) {
          throw error;
        }

        if (attempt < maxRetries) {
          await this.wait(this.getBackoffDelay(attempt));
          continue;
        }
      }
    }

    throw lastError!;
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T = any>(endpoint: string, body?: any, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  /**
   * PUT request
   */
  async put<T = any>(endpoint: string, body?: any, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Upload file with multipart/form-data
   */
  async uploadFile<T = any>(endpoint: string, file: File | Blob, options: {
    fileName?: string;
    additionalFields?: Record<string, string>;
    onProgress?: (progress: number) => void;
  } = {}): Promise<APIResponse<T>> {
    const formData = new FormData();
    
    if (file instanceof File) {
      formData.append('file', file, options.fileName || file.name);
    } else {
      formData.append('file', file, options.fileName || 'file');
    }

    if (options.additionalFields) {
      Object.entries(options.additionalFields).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const headers = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      ...this.config.headers
    };

    // Remove Content-Type header to let browser set it with boundary
    delete headers['Content-Type'];

    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
      headers
    });
  }

  /**
   * Stream data from endpoint
   */
  async *stream<T = any>(endpoint: string, options: RequestOptions = {}): AsyncGenerator<T, void, unknown> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Accept': 'text/event-stream',
      ...this.config.headers,
      ...options.headers
    };

    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!response.ok) {
      const errorData = await this.parseErrorResponse(response);
      throw new APIError(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              yield data as T;
            } catch (e) {
              console.warn('Failed to parse SSE data:', line);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Check rate limit status
   */
  getRateLimitInfo(endpoint: string): RateLimitInfo | null {
    return this.rateLimitInfo.get(endpoint) || null;
  }

  /**
   * Update API configuration
   */
  updateConfig(updates: Partial<APIClientConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  // Private methods

  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      return response.json();
    } else if (contentType?.includes('text/')) {
      return response.text() as any;
    } else {
      return response.blob() as any;
    }
  }

  private async parseErrorResponse(response: Response): Promise<any> {
    try {
      return await response.json();
    } catch {
      return { message: response.statusText };
    }
  }

  private isRetryableError(status: number): boolean {
    return status >= 500 || status === 429 || status === 408;
  }

  private getBackoffDelay(attempt: number): number {
    return Math.min(1000 * Math.pow(2, attempt), 10000);
  }

  private async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private updateRateLimitInfo(endpoint: string, headers: Headers): void {
    const limit = headers.get('x-ratelimit-limit');
    const remaining = headers.get('x-ratelimit-remaining');
    const reset = headers.get('x-ratelimit-reset');
    const retryAfter = headers.get('retry-after');

    if (limit && remaining && reset) {
      this.rateLimitInfo.set(endpoint, {
        limit: parseInt(limit),
        remaining: parseInt(remaining),
        resetTime: new Date(parseInt(reset) * 1000),
        retryAfter: retryAfter ? parseInt(retryAfter) : undefined
      });
    }
  }

  private async waitForRateLimit(endpoint: string): Promise<void> {
    const rateLimitInfo = this.rateLimitInfo.get(endpoint);
    
    if (rateLimitInfo && rateLimitInfo.remaining <= 0) {
      const now = new Date();
      const waitTime = rateLimitInfo.resetTime.getTime() - now.getTime();
      
      if (waitTime > 0) {
        await this.wait(Math.min(waitTime, 60000)); // Max 1 minute wait
      }
    }
  }

  private responseHeadersToObject(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
}