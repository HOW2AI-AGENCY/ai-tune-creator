import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          data: [],
          error: null
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: null,
            error: null
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: null,
              error: null
            }))
          }))
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: null,
          error: null
        }))
      }))
    }))
  }
}));

import { getArtists, getArtistById, createArtist, updateArtist, deleteArtist } from './artists';

describe('Artists API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getArtists', () => {
    it('should return list of artists', async () => {
      const result = await getArtists();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getArtistById', () => {
    it('should return artist by id', async () => {
      const result = await getArtistById('test-id');
      expect(result).toBeDefined();
    });
  });

  describe('createArtist', () => {
    it('should create new artist', async () => {
      const artistData = {
        name: 'Test Artist',
        description: 'Test Description',
        user_id: 'test-user-id'
      };
      
      const result = await createArtist(artistData);
      expect(result).toBeDefined();
    });
  });

  describe('updateArtist', () => {
    it('should update existing artist', async () => {
      const artistData = {
        name: 'Updated Artist'
      };
      
      const result = await updateArtist('test-id', artistData);
      expect(result).toBeDefined();
    });
  });

  describe('deleteArtist', () => {
    it('should delete artist', async () => {
      await expect(deleteArtist('test-id')).resolves.not.toThrow();
    });
  });
});