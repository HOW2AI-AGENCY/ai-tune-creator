/**
 * SECURITY: Suno AI Service Adapter - Client-side operations disabled
 * All Suno operations must go through secure Edge Functions to protect API keys
 */

// SECURITY WARNING: This adapter is deprecated and disabled for security reasons
export class SunoAdapter {
  readonly name = 'suno';
  readonly version = '2.0.0-deprecated';

  constructor() {
    console.warn('SECURITY: SunoAdapter client-side operations are disabled. Use Edge Functions instead.');
  }

  async generate(): Promise<never> {
    throw new Error('SECURITY: Direct client-side Suno operations are disabled. Use secure Edge Functions instead.');
  }

  async getStatus(): Promise<never> {
    throw new Error('SECURITY: Direct client-side Suno operations are disabled. Use secure Edge Functions instead.');
  }

  async cancel(): Promise<never> {
    throw new Error('SECURITY: Direct client-side Suno operations are disabled. Use secure Edge Functions instead.');
  }

  async estimateCost(): Promise<never> {
    throw new Error('SECURITY: Direct client-side Suno operations are disabled. Use secure Edge Functions instead.');
  }
}

// Export deprecated class for backwards compatibility
export default SunoAdapter;