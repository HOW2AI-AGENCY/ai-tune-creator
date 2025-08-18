import { describe, it, expect } from 'vitest';
import { buildStoragePath, isValidAudioUrl } from '../src/lib/storage/constants';

describe('Storage Utils', () => {
  describe('buildStoragePath', () => {
    it('should create unique paths with timestamp and random suffix', () => {
      const path1 = buildStoragePath('user123', 'suno', 'task456', 'track.mp3');
      const path2 = buildStoragePath('user123', 'suno', 'task456', 'track.mp3');
      
      expect(path1).toMatch(/user123\/suno\/task456\/\d+-[a-z0-9]+-track\.mp3/);
      expect(path2).toMatch(/user123\/suno\/task456\/\d+-[a-z0-9]+-track\.mp3/);
      expect(path1).not.toBe(path2); // Should be unique
    });

    it('should handle different services and task IDs', () => {
      const sunoPath = buildStoragePath('user1', 'suno', 'abc123', 'song.mp3');
      const murekaPath = buildStoragePath('user1', 'mureka', 'xyz789', 'song.mp3');
      
      expect(sunoPath).toContain('suno/abc123');
      expect(murekaPath).toContain('mureka/xyz789');
    });
  });

  describe('isValidAudioUrl', () => {
    it('should accept valid Supabase storage URLs', () => {
      const validUrls = [
        'https://zwbhlfhwymbmvioaikvs.supabase.co/storage/v1/object/public/albert-tracks/file.mp3',
        'https://cdn.sunoapi.org/tracks/file.wav',
        'https://api.mureka.ai/download/file.m4a'
      ];

      validUrls.forEach(url => {
        expect(isValidAudioUrl(url)).toBe(true);
      });
    });

    it('should reject invalid URLs', () => {
      const invalidUrls = [
        '',
        'http://insecure.com/file.mp3', // not https
        'https://malicious.com/file.mp3', // not whitelisted domain
        'https://zwbhlfhwymbmvioaikvs.supabase.co/file.txt', // not audio extension
        'not-a-url',
        'javascript:alert(1)'
      ];

      invalidUrls.forEach(url => {
        expect(isValidAudioUrl(url)).toBe(false);
      });
    });

    it('should require audio file extensions', () => {
      const baseUrl = 'https://zwbhlfhwymbmvioaikvs.supabase.co/storage/v1/object/public/albert-tracks/';
      
      expect(isValidAudioUrl(baseUrl + 'file.mp3')).toBe(true);
      expect(isValidAudioUrl(baseUrl + 'file.wav')).toBe(true);
      expect(isValidAudioUrl(baseUrl + 'file.m4a')).toBe(true);
      expect(isValidAudioUrl(baseUrl + 'file.ogg')).toBe(true);
      
      expect(isValidAudioUrl(baseUrl + 'file.pdf')).toBe(false);
      expect(isValidAudioUrl(baseUrl + 'file')).toBe(false);
    });
  });
});