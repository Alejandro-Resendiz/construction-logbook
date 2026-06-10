import { createClient } from '@supabase/supabase-js';

// Define the mock inside the factory to avoid hoisting issues
jest.mock('@supabase/supabase-js', () => {
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
    createClient: jest.fn(() => ({
      from: mockFrom,
      insert: mockInsert,
      select: mockSelect,
      single: mockSingle,
    })),
  };
});

import { createProject } from './actions';
import { revalidatePath } from 'next/cache';

// Retrieve the mocked methods from the createClient call result
const mockSupabase = (createClient as jest.Mock).mock.results[0].value;

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('Projects Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return success: true when project is created', async () => {
    const formData = new FormData();
    formData.append('project_name', 'Nuevo Proyecto');

    mockSupabase.single.mockResolvedValueOnce({
      data: { project_id: 1, project_name: 'Nuevo Proyecto' },
      error: null,
    });

    const result = await createProject(formData);

    expect(mockSupabase.from).toHaveBeenCalledWith('projects');
    expect(mockSupabase.insert).toHaveBeenCalledWith([{ project_name: 'Nuevo Proyecto' }]);
    expect(result).toEqual({
      success: true,
      project: { project_id: 1, project_name: 'Nuevo Proyecto' },
    });
    expect(revalidatePath).toHaveBeenCalledWith('/app/projects');
  });

  it('should return DUPLICATE_PROJECT error on conflict', async () => {
    const formData = new FormData();
    formData.append('project_name', 'Duplicate');

    mockSupabase.single.mockResolvedValueOnce({
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint' },
    });

    const result = await createProject(formData);
    expect(result.error).toBe('DUPLICATE_PROJECT');
  });
});
