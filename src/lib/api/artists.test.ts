import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getArtists,
  getArtistById,
  createArtist,
  updateArtist,
  deleteArtist,
  type Artist,
  type CreateArtistData,
  type UpdateArtistData,
} from './artists';

// Tell Vitest to use the manual mock
vi.mock('@/integrations/supabase/client');

// Import the mocked supabase instance
import { supabase } from '@/integrations/supabase/client';

describe('API - artists', () => {
  // Use clearAllMocks to reset call history but keep mock implementation
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getArtists', () => {
    it('should return a list of artists on success', async () => {
      const mockArtists: Artist[] = [
        { id: '1', name: 'Artist 1', user_id: 'user1', created_at: '2023-01-01', updated_at: '2023-01-01', metadata: {} },
      ];
      (supabase.order as any).mockResolvedValueOnce({ data: mockArtists, error: null });

      const artists = await getArtists();

      expect(supabase.from).toHaveBeenCalledWith('artists');
      expect(supabase.select).toHaveBeenCalledWith('*');
      expect(supabase.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(artists).toEqual(mockArtists);
    });

    it('should throw an error if supabase fails', async () => {
      const mockError = { message: 'Failed to fetch' };
      (supabase.order as any).mockResolvedValueOnce({ data: null, error: mockError });

      await expect(getArtists()).rejects.toThrow(mockError.message);
    });
  });

  describe('getArtistById', () => {
    it('should return a single artist on success', async () => {
      const mockArtist: Artist = { id: '1', name: 'Artist 1', user_id: 'user1', created_at: '2023-01-01', updated_at: '2023-01-01', metadata: {} };
      (supabase.single as any).mockResolvedValueOnce({ data: mockArtist, error: null });

      const artist = await getArtistById('1');

      expect(supabase.from).toHaveBeenCalledWith('artists');
      expect(supabase.select).toHaveBeenCalledWith('*');
      expect(supabase.eq).toHaveBeenCalledWith('id', '1');
      expect(supabase.single).toHaveBeenCalled();
      expect(artist).toEqual(mockArtist);
    });

    it('should return null if artist is not found (PGRST116)', async () => {
      const mockError = { code: 'PGRST116', message: 'Not a single row' };
      (supabase.single as any).mockResolvedValueOnce({ data: null, error: mockError });

      const artist = await getArtistById('999');

      expect(artist).toBeNull();
    });

    it('should throw an error for other supabase failures', async () => {
      const mockError = { message: 'Some other error' };
      (supabase.single as any).mockResolvedValueOnce({ data: null, error: mockError });

      await expect(getArtistById('1')).rejects.toThrow(mockError.message);
    });
  });

  describe('createArtist', () => {
    it('should create and return a new artist', async () => {
      const newArtistData: CreateArtistData = { name: 'New Artist', user_id: 'user1' };
      const mockCreatedArtist: Artist = { id: '3', ...newArtistData, created_at: '2023-01-03', updated_at: '2023-01-03', metadata: {} };
      (supabase.single as any).mockResolvedValueOnce({ data: mockCreatedArtist, error: null });

      const artist = await createArtist(newArtistData);

      expect(supabase.from).toHaveBeenCalledWith('artists');
      expect(supabase.insert).toHaveBeenCalledWith(newArtistData);
      expect(supabase.select).toHaveBeenCalled();
      expect(supabase.single).toHaveBeenCalled();
      expect(artist).toEqual(mockCreatedArtist);
    });

    it('should throw an error if creation fails', async () => {
      const mockError = { message: 'Failed to create' };
      (supabase.single as any).mockResolvedValueOnce({ data: null, error: mockError });

      await expect(createArtist({ name: 'fail', user_id: 'user1' })).rejects.toThrow(mockError.message);
    });
  });

  describe('updateArtist', () => {
    it('should update and return the artist', async () => {
      const updateData: UpdateArtistData = { name: 'Updated Artist' };
      const mockUpdatedArtist: Artist = { id: '1', name: 'Updated Artist', user_id: 'user1', created_at: '2023-01-01', updated_at: '2023-01-04', metadata: {} };
      (supabase.single as any).mockResolvedValueOnce({ data: mockUpdatedArtist, error: null });

      const artist = await updateArtist('1', updateData);

      expect(supabase.from).toHaveBeenCalledWith('artists');
      expect(supabase.update).toHaveBeenCalledWith(updateData);
      expect(supabase.eq).toHaveBeenCalledWith('id', '1');
      expect(supabase.select).toHaveBeenCalled();
      expect(supabase.single).toHaveBeenCalled();
      expect(artist).toEqual(mockUpdatedArtist);
    });

    it('should throw an error if update fails', async () => {
      const mockError = { message: 'Failed to update' };
      (supabase.single as any).mockResolvedValueOnce({ data: null, error: mockError });

      await expect(updateArtist('1', { name: 'fail' })).rejects.toThrow(mockError.message);
    });
  });

  describe('deleteArtist', () => {
    it('should complete without error on successful deletion', async () => {
      (supabase.eq as any).mockResolvedValueOnce({ error: null });

      await expect(deleteArtist('1')).resolves.toBeUndefined();

      expect(supabase.from).toHaveBeenCalledWith('artists');
      expect(supabase.delete).toHaveBeenCalled();
      expect(supabase.eq).toHaveBeenCalledWith('id', '1');
    });

    it('should throw an error if deletion fails', async () => {
      const mockError = { message: 'Failed to delete' };
      (supabase.eq as any).mockResolvedValueOnce({ error: mockError });

      await expect(deleteArtist('1')).rejects.toThrow(mockError.message);
    });
  });
});
