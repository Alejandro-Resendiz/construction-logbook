import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

// Declare var variables so they are hoisted to the very top and available inside the mock factories
var mockAdminClientMethods: any;
var mockServerClientMethods: any;

// Mock supabaseAdmin from @supabase/supabase-js
jest.mock('@supabase/supabase-js', () => {
  const mockAdminSingle = jest.fn();
  const mockAdminUpdateEq = jest.fn();
  const mockAdminUpdate = jest.fn().mockImplementation(() => ({
    eq: mockAdminUpdateEq,
  }));
  const mockAdminFrom = jest.fn().mockImplementation(() => ({
    update: mockAdminUpdate,
  }));

  mockAdminClientMethods = {
    from: mockAdminFrom,
    update: mockAdminUpdate,
    updateEq: mockAdminUpdateEq,
    single: mockAdminSingle,
  };

  return {
    createClient: jest.fn(() => mockAdminClientMethods),
  };
});

// Mock regular supabase client from @/lib/supabase/server
jest.mock('@/lib/supabase/server', () => {
  const mockSingle = jest.fn();
  const mockSelect = jest.fn().mockImplementation(() => ({
    single: mockSingle,
  }));
  const mockInsert = jest.fn().mockImplementation(() => ({
    select: mockSelect,
  }));
  const mockUpdateEq = jest.fn();
  const mockUpdate = jest.fn().mockImplementation(() => ({
    eq: mockUpdateEq,
  }));
  const mockFrom = jest.fn().mockImplementation(() => ({
    insert: mockInsert,
    update: mockUpdate,
  }));
  const mockGetUser = jest.fn().mockResolvedValue({
    data: { user: { id: 'user-123' } },
    error: null,
  });

  mockServerClientMethods = {
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
    insert: mockInsert,
    select: mockSelect,
    single: mockSingle,
    update: mockUpdate,
    updateEq: mockUpdateEq,
    getUser: mockGetUser,
  };

  return {
    createClient: jest.fn(() => mockServerClientMethods),
  };
});

import { createMaintenanceRequest, updateMaintenanceStatus, updateMaintenanceDetails } from './actions';
import { sendMaintenanceAuthNotification } from '@/lib/notifications';
import { revalidatePath } from 'next/cache';

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/lib/notifications', () => ({
  sendMaintenanceAuthNotification: jest.fn().mockResolvedValue(true),
}));

describe('Maintenance Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createMaintenanceRequest', () => {
    it('should submit request to Supabase and return successfully with mapped data', async () => {
      const formData = new FormData();
      formData.append('machine_id', '1');
      formData.append('maintenance_type', 'preventive');
      formData.append('date', '2026-05-28');
      formData.append('description', 'Regular oil change');

      mockServerClientMethods.single.mockResolvedValueOnce({
        data: {
          maintenance_request_id: 10,
          machine_id: 1,
          maintenance_type: 'preventive',
          type: 'preventive',
          date: '2026-05-28',
          description: 'Regular oil change',
          status: 'pending',
          hash_id: 'hash-xyz',
          machinery: {
            machinery_name: 'Caterpillar 320D',
          },
        },
        error: null,
      });

      const res = await createMaintenanceRequest(formData, [], []);
      expect(res.success).toBe(true);
      expect(res.data?.maintenance_request_id).toBe(10);
      expect(res.data?.hash_id).toBe('hash-xyz');
      expect(res.data?.machinery?.machinery_name).toBe('Caterpillar 320D');
      expect(sendMaintenanceAuthNotification).toHaveBeenCalledWith({
        hash_id: 'hash-xyz',
        machineName: 'Caterpillar 320D',
        description: 'Regular oil change',
      });
      expect(revalidatePath).toHaveBeenCalledWith('/app/maintenance');
    });
  });

  describe('updateMaintenanceStatus', () => {
    it('should successfully update status via supabaseAdmin', async () => {
      mockAdminClientMethods.updateEq.mockResolvedValueOnce({
        error: null,
      });

      const res = await updateMaintenanceStatus(10, 'approved');

      expect(res.success).toBe(true);
      expect(revalidatePath).toHaveBeenCalledWith('/app/maintenance');
    });
  });

  describe('updateMaintenanceDetails', () => {
    it('should successfully update observations and attachments via supabase', async () => {
      mockServerClientMethods.updateEq.mockResolvedValueOnce({
        error: null,
      });

      const res = await updateMaintenanceDetails(10, 'Done perfectly', ['url1', 'url2']);

      expect(res.success).toBe(true);
      expect(revalidatePath).toHaveBeenCalledWith('/app/maintenance');
    });
  });
});
