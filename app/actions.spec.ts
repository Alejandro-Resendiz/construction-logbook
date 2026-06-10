import { createMachineryLog } from './actions';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => {
  const mockSingle = jest.fn();
  const mockSelect = jest.fn().mockImplementation(() => ({
    single: mockSingle,
  }));
  const mockInsert = jest.fn().mockImplementation(() => ({
    select: mockSelect,
  }));
  const mockFrom = jest.fn().mockImplementation(() => ({
    insert: mockInsert,
  }));

  return {
    supabase: {
      from: mockFrom,
      // Helper references for test mocking:
      insert: mockInsert,
      select: mockSelect,
      single: mockSingle,
    },
  };
});

describe('Public Operator Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createMachineryLog', () => {
    it('should submit request to Supabase and return successfully with hash_id', async () => {
      const formData = new FormData();
      formData.append('machine_id', '1');
      formData.append('project_id', '2');
      formData.append('date', '2026-05-29');
      formData.append('operator_name', 'Juan Pérez');
      formData.append('start_time', '08:00');
      formData.append('fuel_liters', '50');

      const mockSingle = supabase.single as jest.Mock;
      mockSingle.mockResolvedValueOnce({
        data: { hash_id: 'abc-xyz' },
        error: null,
      });

      const res = await createMachineryLog(formData);

      expect(supabase.from).toHaveBeenCalledWith('machinery_logs');
      expect(supabase.insert).toHaveBeenCalledWith([
        {
          machine_id: 1,
          project_id: 2,
          date: '2026-05-29',
          operator_name: 'Juan Pérez',
          start_time: '08:00',
          fuel_liters: 50,
          fuel_price: null,
        },
      ]);
      expect(res.hash_id).toBe('abc-xyz');
    });

    it('should return error when Supabase creation fails', async () => {
      const formData = new FormData();
      formData.append('machine_id', '1');

      const mockSingle = supabase.single as jest.Mock;
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'VALIDATION_FAILED' },
      });

      const res = await createMachineryLog(formData);
      expect(res.error).toBe('VALIDATION_FAILED');
    });
  });
});
