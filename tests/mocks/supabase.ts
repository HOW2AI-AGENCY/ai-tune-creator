import { vi } from 'vitest';

/**
 * Creates a simplified mock of the Supabase client for testing purposes.
 * This factory allows for method chaining and mocking return values on a per-test basis.
 *
 * @example
 * const supabase = createSupabaseMock();
 * supabase.select.mockResolvedValue({ data: [], error: null });
 */
export const createSupabaseMock = () => {
  const mock = {
    from: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    order: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
  };

  // Mock chaining by returning `this` for most methods
  mock.from.mockReturnThis();
  mock.select.mockReturnThis();
  mock.insert.mockReturnThis();
  mock.update.mockReturnThis();
  mock.delete.mockReturnThis();
  mock.order.mockReturnThis();
  mock.eq.mockReturnThis();

  return mock;
};
