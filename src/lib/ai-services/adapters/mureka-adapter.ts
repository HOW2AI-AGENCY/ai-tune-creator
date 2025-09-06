/**
 * SECURITY: Mureka AI Service Adapter - Client-side operations disabled
 * All Mureka operations must go through secure Edge Functions to protect API keys
 */

// SECURITY WARNING: This adapter is deprecated and disabled for security reasons
export class MurekaAdapter {
  readonly name = 'mureka';
  readonly version = '2.0.0-deprecated';

  constructor() {
    console.warn('SECURITY: MurekaAdapter client-side operations are disabled. Use Edge Functions instead.');
  }

  async generate(): Promise<never> {
    throw new Error('SECURITY: Direct client-side Mureka operations are disabled. Use secure Edge Functions instead.');
  }

  async getStatus(): Promise<never> {
    throw new Error('SECURITY: Direct client-side Mureka operations are disabled. Use secure Edge Functions instead.');
  }

  async cancel(): Promise<never> {
    throw new Error('SECURITY: Direct client-side Mureka operations are disabled. Use secure Edge Functions instead.');
  }

  async estimateCost(): Promise<never> {
    throw new Error('SECURITY: Direct client-side Mureka operations are disabled. Use secure Edge Functions instead.');
  }

  async generateLyrics(): Promise<never> {
    throw new Error('SECURITY: Direct client-side Mureka operations are disabled. Use secure Edge Functions instead.');
  }

  async extendLyrics(): Promise<never> {
    throw new Error('SECURITY: Direct client-side Mureka operations are disabled. Use secure Edge Functions instead.');
  }

  async extendSong(): Promise<never> {
    throw new Error('SECURITY: Direct client-side Mureka operations are disabled. Use secure Edge Functions instead.');
  }

  async generateInstrumental(): Promise<never> {
    throw new Error('SECURITY: Direct client-side Mureka operations are disabled. Use secure Edge Functions instead.');
  }

  async getInstrumentalStatus(): Promise<never> {
    throw new Error('SECURITY: Direct client-side Mureka operations are disabled. Use secure Edge Functions instead.');
  }

  async createUpload(): Promise<never> {
    throw new Error('SECURITY: Direct client-side Mureka operations are disabled. Use secure Edge Functions instead.');
  }

  async stemSong(): Promise<never> {
    throw new Error('SECURITY: Direct client-side Mureka operations are disabled. Use secure Edge Functions instead.');
  }
}

// Export deprecated class for backwards compatibility
export default MurekaAdapter;