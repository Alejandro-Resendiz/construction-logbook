import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => {
  const mockSingle = jest.fn();
  const mockEq = jest.fn().mockImplementation(() => ({
    single: mockSingle,
  }));
  const mockSelect = jest.fn().mockImplementation(() => ({
    eq: mockEq,
  }));
  const mockUpdateEq = jest.fn();
  const mockUpdate = jest.fn().mockImplementation(() => ({
    eq: mockUpdateEq,
  }));
  const mockFrom = jest.fn().mockImplementation(() => ({
    select: mockSelect,
    update: mockUpdate,
  }));

  return {
    supabase: {
      from: mockFrom,
      select: mockSelect,
      update: mockUpdate,
      single: mockSingle,
      updateEq: mockUpdateEq,
    },
  };
});

import { getLogByHashId, updateMachineryLog } from './actions';

describe('Operator Log Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getLogByHashId', () => {
    it('should retrieve operator log successfully', async () => {
      (supabase.single as jest.Mock).mockResolvedValueOnce({
        data: {
          hash_id: 'abc-123',
          operator_name: 'Juan Pérez',
          date: '2026-05-28',
          is_completed: false,
          end_time: null,
          observations: null,
          start_time: '08:00',
          fuel_liters: 50.5,
          machinery: {
            machinery_name: 'Caterpillar 320D',
          },
          projects: {
            project_name: 'Carretera Norte',
          },
        },
        error: null,
      });

      const res = await getLogByHashId('abc-123');

      expect(res.log).toBeDefined();
      expect(res.log?.hash_id).toBe('abc-123');
      expect(res.log?.operator_name).toBe('Juan Pérez');
      expect(res.log?.machinery?.machinery_name).toBe('Caterpillar 320D');
      expect(res.log?.projects?.project_name).toBe('Carretera Norte');
    });

    it('should return error when log is not found', async () => {
      (supabase.single as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: 'NOT_FOUND' },
      });

      const res = await getLogByHashId('nonexistent');
      expect(res.error).toBe('No se encontró el registro.');
    });
  });

  describe('updateMachineryLog', () => {
    it('should return success: true on successful update', async () => {
      const formData = new FormData();
      formData.append('end_time', '17:00');
      formData.append('observations', 'All operations normal');

      // 1. mock select check data (is_completed = false)
      (supabase.single as jest.Mock).mockResolvedValueOnce({
        data: { is_completed: false },
        error: null,
      });

      // 2. mock update response
      (supabase.updateEq as jest.Mock).mockResolvedValueOnce({
        error: null,
      });

      const res = await updateMachineryLog('abc-123', formData);

      expect(res.success).toBe(true);
    });

    it('should return conflict or other error on exception', async () => {
      const formData = new FormData();
      formData.append('end_time', '17:00');

      // mock select check data (is_completed = true)
      (supabase.single as jest.Mock).mockResolvedValueOnce({
        data: { is_completed: true },
        error: null,
      });

      const res = await updateMachineryLog('abc-123', formData);
      expect(res.error).toBe('Ya está actualizado, contacta a tu administrador.');
    });
  });
});
