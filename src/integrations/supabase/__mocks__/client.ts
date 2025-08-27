import { vi } from 'vitest';

// Create a chainable mock for Supabase client
const createChainableMock = () => {
  const mock = {
    from: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    order: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  };

  // Set up chaining - each method returns the mock object except for terminal methods
  mock.from.mockReturnValue(mock);
  mock.select.mockReturnValue(mock);
  mock.insert.mockReturnValue(mock);
  mock.update.mockReturnValue(mock);
  mock.delete.mockReturnValue(mock);
  mock.order.mockReturnValue(mock);
  mock.eq.mockReturnValue(mock);

  // Terminal methods should be configured in individual tests
  mock.single.mockResolvedValue({ data: null, error: null });
  mock.maybeSingle.mockResolvedValue({ data: null, error: null });

  return mock;
};

export const supabase = createChainableMock();