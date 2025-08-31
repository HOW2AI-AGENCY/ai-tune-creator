/**
 * Unified Authentication Handler for AI Services Edge Functions
 * Provides consistent authentication patterns and API key management
 */

export interface AuthConfig {
  apiKey: string;
  service: 'suno' | 'mureka' | 'openai';
  baseUrl: string;
  version?: string;
  timeout?: number;
}

export interface AuthHeaders {
  Authorization: string;
  'Content-Type': string;
  'User-Agent': string;
  Accept: string;
  [key: string]: string;
}

export class AuthHandler {
  private static readonly SERVICE_CONFIGS = {
    suno: {
      baseUrl: 'https://api.sunoapi.org',
      version: 'v1',
      timeout: 30000,
      userAgent: 'AI-Tune-Creator-Suno/2.0'
    },
    mureka: {
      baseUrl: 'https://api.mureka.ai',
      version: 'v1', 
      timeout: 30000,
      userAgent: 'AI-Tune-Creator-Mureka/2.0'
    },
    openai: {
      baseUrl: 'https://api.openai.com',
      version: 'v1',
      timeout: 60000,
      userAgent: 'AI-Tune-Creator-OpenAI/2.0'
    }
  };

  /**
   * Get API key for service with rotation support
   */
  static getAPIKey(service: 'suno' | 'mureka' | 'openai'): string | null {
    const keyMappings = {
      suno: ['SUNOAPI_ORG_TOKEN', 'SUNOAPI_ORG_KEY', 'SUNO_API_KEY'],
      mureka: ['MUREKA_API_KEY', 'MUREKA_API_TOKEN'],
      openai: ['OPENAI_API_KEY', 'OPENAI_API_TOKEN']
    };

    const keys = keyMappings[service] || [];
    
    for (const keyName of keys) {
      const key = Deno.env.get(keyName);
      if (key && key.trim().length > 0) {
        return key.trim();
      }
    }

    return null;
  }

  /**
   * Validate API key format
   */
  static validateAPIKey(apiKey: string, service: 'suno' | 'mureka' | 'openai'): boolean {
    if (!apiKey || apiKey.length < 10) {
      return false;
    }

    switch (service) {
      case 'suno':
        // Suno keys typically start with 'sk-' or are UUIDs
        return /^(sk-|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/.test(apiKey) || 
               apiKey.length >= 32;
      case 'mureka':
        // Mureka keys are typically long alphanumeric strings
        return apiKey.length >= 20 && /^[a-zA-Z0-9]+$/.test(apiKey);
      case 'openai':
        // OpenAI keys start with 'sk-'
        return apiKey.startsWith('sk-') && apiKey.length >= 48;
      default:
        return true;
    }
  }

  /**
   * Generate standardized headers for API requests
   */
  static generateHeaders(service: 'suno' | 'mureka' | 'openai'): AuthHeaders {
    const apiKey = this.getAPIKey(service);
    if (!apiKey) {
      throw new Error(`${service.toUpperCase()} API key not configured`);
    }

    if (!this.validateAPIKey(apiKey, service)) {
      throw new Error(`Invalid ${service.toUpperCase()} API key format`);
    }

    const config = this.SERVICE_CONFIGS[service];
    
    const headers: AuthHeaders = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': config.userAgent
    };

    // Service-specific headers
    switch (service) {
      case 'suno':
        headers['X-API-Version'] = config.version;
        break;
      case 'mureka':
        headers['X-Client-Version'] = '2.0';
        break;
      case 'openai':
        headers['OpenAI-Version'] = '2024-02-15';
        break;
    }

    return headers;
  }

  /**
   * Generate full URL for API endpoint
   */
  static generateURL(service: 'suno' | 'mureka' | 'openai', endpoint: string): string {
    const config = this.SERVICE_CONFIGS[service];
    const baseUrl = config.baseUrl;
    const version = config.version;
    
    // Clean endpoint
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    
    // Build URL
    if (version && !cleanEndpoint.includes(version)) {
      return `${baseUrl}/api/${version}/${cleanEndpoint}`;
    } else {
      return `${baseUrl}/api/${cleanEndpoint}`;
    }
  }

  /**
   * Enhanced fetch with authentication and error handling
   */
  static async authenticatedFetch(
    service: 'suno' | 'mureka' | 'openai',
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = this.generateURL(service, endpoint);
    const headers = this.generateHeaders(service);
    const config = this.SERVICE_CONFIGS[service];

    // Merge headers
    const finalOptions: RequestInit = {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    };

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const response = await fetch(url, {
        ...finalOptions,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response;

    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`${service.toUpperCase()} API request timeout after ${config.timeout}ms`);
      }
      
      throw new Error(`${service.toUpperCase()} API request failed: ${error.message}`);
    }
  }

  /**
   * Test API key connectivity
   */
  static async testConnection(service: 'suno' | 'mureka' | 'openai'): Promise<boolean> {
    try {
      const testEndpoints = {
        suno: 'status',
        mureka: 'account/billing',
        openai: 'models'
      };

      const response = await this.authenticatedFetch(service, testEndpoints[service], {
        method: 'GET'
      });

      return response.ok;

    } catch (error) {
      console.error(`${service} API connection test failed:`, error);
      return false;
    }
  }

  /**
   * Get service configuration
   */
  static getServiceConfig(service: 'suno' | 'mureka' | 'openai') {
    return { ...this.SERVICE_CONFIGS[service] };
  }
}