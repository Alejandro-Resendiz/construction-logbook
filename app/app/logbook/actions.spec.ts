import { getMachineryLogs } from './actions';
import { createClient } from '@/lib/supabase/server';

let mockData: any = [];
let mockError: any = null;

const mockQuery: any = {
  select: jest.fn().mockImplementation(() => mockQuery),
  order: jest.fn().mockImplementation(() => mockQuery),
  gte: jest.fn().mockImplementation(() => mockQuery),
  lte: jest.fn().mockImplementation(() => mockQuery),
  eq: jest.fn().mockImplementation(() => mockQuery),
  then: jest.fn().mockImplementation((onfulfilled) => {
    return Promise.resolve({ data: mockData, error: mockError }).then(onfulfilled);
  }),
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn().mockImplementation(() => mockQuery),
  })),
}));

describe('Logbook Server Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockData = [];
    mockError = null;
  });

  describe('getMachineryLogs', () => {
    it('should retrieve logs from Supabase successfully', async () => {
      mockData = [
        {
          machinery_log_id: 5,
          machine_id: 2,
          project_id: 3,
          date: '2026-05-29',
          operator_name: 'Juan Pérez',
          start_time: '08:00',
          end_time: '16:00',
          fuel_liters: 40.5,
          fuel_price: 24.5,
          observations: 'All good',
          is_completed: true,
          is_corrected: false,
          created_at: '2026-05-29T12:00:00Z',
          hash_id: 'abc-xyz',
          machinery: {
            machinery_name: 'Caterpillar 320D',
            machinery_full_name: 'Excavadora Caterpillar',
            external_code: 'EX-01',
            is_rented: false,
          },
          projects: {
            project_name: 'Carretera Central',
          },
        },
      ];

      const res = await getMachineryLogs(2, '2026-05-20', '2026-05-27');

      expect(mockQuery.gte).toHaveBeenCalledWith('date', '2026-05-20');
      expect(mockQuery.lte).toHaveBeenCalledWith('date', '2026-05-27');
      expect(mockQuery.eq).toHaveBeenCalledWith('machine_id', 2);
      
      expect(res.success).toBe(true);
      expect(res.logs).toBeDefined();
      expect(res.logs?.length).toBe(1);

      const log = res.logs?.[0];
      expect(log.machinery_log_id).toBe(5);
      expect(log.operator_name).toBe('Juan Pérez');
      expect(log.projects?.project_name).toBe('Carretera Central');
      expect(log.machinery?.machinery_name).toBe('Caterpillar 320D');
      expect(log.machinery?.is_rented).toBe(false);
    });

    it('should return error when Supabase fetch fails', async () => {
      mockError = { message: 'CONNECTION_FAILURE' };

      const res = await getMachineryLogs();
      expect(res.error).toBe('CONNECTION_FAILURE');
    });
  });
});
