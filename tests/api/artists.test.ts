import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseMock } from '../mocks/supabase';
import type { Artist, CreateArtistData, UpdateArtistData } from '@/lib/api/artists';

// Create a mock instance for supabase. This is safe to do here.
const supabase = createSupabaseMock();

// Mock the entire module that exports the supabase client.
// This call is hoisted by Vitest.
vi.mock('@/integrations/supabase/client', () => ({
  supabase,
}));

describe('Artists API Service', () => {

  beforeEach(() => {
    // Reset mocks before each test to ensure isolation
    vi.clearAllMocks();
  });

  // Test for getArtists
  describe('getArtists', () => {
    it('should return a list of artists on success', async () => {
      // Dynamically import the function to get the mocked version
      const { getArtists } = await import('@/lib/api/artists');

      const mockArtists: Artist[] = [
        { id: '1', name: 'Artist 1', user_id: 'user1', created_at: '2023-01-01', updated_at: '2023-01-01', description: null, avatar_url: null, metadata: {} },
        { id: '2', name: 'Artist 2', user_id: 'user1', created_at: '2023-01-02', updated_at: '2023-01-02', description: null, avatar_url: null, metadata: {} },
      ];
      supabase.order.mockResolvedValue({ data: mockArtists, error: null });

      const artists = await getArtists();

      expect(artists).toEqual(mockArtists);
      expect(supabase.from).toHaveBeenCalledWith('artists');
      expect(supabase.select).toHaveBeenCalledWith('*');
      expect(supabase.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should throw an error if supabase call fails', async () => {
      const { getArtists } = await import('@/lib/api/artists');
      const mockError = new Error('Supabase error');
      supabase.order.mockResolvedValue({ data: null, error: mockError });

      await expect(getArtists()).rejects.toThrow(mockError.message);
    });
  });

  // Test for getArtistById
  describe('getArtistById', () => {
    it('should return an artist if found', async () => {
      const { getArtistById } = await import('@/lib/api/artists');
      const mockArtist: Artist = { id: '1', name: 'Artist 1', user_id: 'user1', created_at: '2023-01-01', updated_at: '2023-01-01', description: null, avatar_url: null, metadata: {} };
      supabase.single.mockResolvedValue({ data: mockArtist, error: null });

      const artist = await getArtistById('1');

      expect(artist).toEqual(mockArtist);
      expect(supabase.from).toHaveBeenCalledWith('artists');
      expect(supabase.select).toHaveBeenCalledWith('*');
      expect(supabase.eq).toHaveBeenCalledWith('id', '1');
    });

    it('should return null if artist is not found (PGRST116 error)', async () => {
      const { getArtistById } = await import('@/lib/api/artists');
      const mockError = { code: 'PGRST116', message: 'Not a single row', details: '', hint: '' };
      supabase.single.mockResolvedValue({ data: null, error: mockError });

      const artist = await getArtistById('not-found');

      expect(artist).toBeNull();
    });

    it('should throw an error for other supabase errors', async () => {
      const { getArtistById } = await import('@/lib/api/artists');
      const mockError = new Error('Some other error');
      supabase.single.mockResolvedValue({ data: null, error: mockError as any });

      await expect(getArtistById('1')).rejects.toThrow(mockError.message);
    });
  });

  // Test for createArtist
  describe('createArtist', () => {
    it('should create and return a new artist', async () => {
      const { createArtist } = await import('@/lib/api/artists');
      const newArtistData: CreateArtistData = { name: 'New Artist', user_id: 'user1' };
      const createdArtist: Artist = { id: '3', created_at: '2023-01-03', updated_at: '2023-01-03', ...newArtistData, description: null, avatar_url: null, metadata: {} };
      supabase.single.mockResolvedValue({ data: createdArtist, error: null });

      const result = await createArtist(newArtistData);

      expect(result).toEqual(createdArtist);
      expect(supabase.from).toHaveBeenCalledWith('artists');
      expect(supabase.insert).toHaveBeenCalledWith(newArtistData);
      expect(supabase.select).toHaveBeenCalled();
      expect(supabase.single).toHaveBeenCalled();
    });
  });

  // Test for updateArtist
  describe('updateArtist', () => {
    it('should update and return the artist', async () => {
      const { updateArtist } = await import('@/lib/api/artists');
      const updateData: UpdateArtistData = { name: 'Updated Artist' };
      const updatedArtist: Artist = { id: '1', name: 'Updated Artist', user_id: 'user1', created_at: '2023-01-01', updated_at: '2023-01-04', description: null, avatar_url: null, metadata: {} };
      supabase.single.mockResolvedValue({ data: updatedArtist, error: null });

      const result = await updateArtist('1', updateData);

      expect(result).toEqual(updatedArtist);
      expect(supabase.from).toHaveBeenCalledWith('artists');
      expect(supabase.update).toHaveBeenCalledWith(updateData);
      expect(supabase.eq).toHaveBeenCalledWith('id', '1');
      expect(supabase.select).toHaveBeenCalled();
      expect(supabase.single).toHaveBeenCalled();
    });
  });

  // Test for deleteArtist
  describe('deleteArtist', () => {
    it('should delete an artist without error', async () => {
      const { deleteArtist } = await import('@/lib/api/artists');
      supabase.eq.mockResolvedValue({ error: null });

      await expect(deleteArtist('1')).resolves.not.toThrow();
      expect(supabase.from).toHaveBeenCalledWith('artists');
      expect(supabase.delete).toHaveBeenCalled();
      expect(supabase.eq).toHaveBeenCalledWith('id', '1');
    });

    it('should throw an error if supabase delete fails', async () => {
        const { deleteArtist } = await import('@/lib/api/artists');
        const mockError = new Error('Delete failed');
        supabase.eq.mockResolvedValue({ error: mockError });

        await expect(deleteArtist('1')).rejects.toThrow(mockError.message);
    });
  });
});
