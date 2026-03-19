import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

interface ProjectsState {
  projects: any[]
  loading: boolean
  fetchProjects: () => Promise<void>
  addProject: (project: any) => void
  removeProject: (project_id: number) => void
  updateProject: (project_id: number, updatedProject: any) => void
}

export const useProjectsStore = create<ProjectsState>((set) => ({
  projects: [],
  loading: false,
  fetchProjects: async () => {
    set({ loading: true })
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('project_name', { ascending: true })
    set({ projects: data || [], loading: false })
  },
  addProject: (project) => 
    set((state) => ({ projects: [...state.projects, project].sort((a, b) => a.project_name.localeCompare(b.project_name)) })),
  removeProject: (project_id) => 
    set((state) => ({ projects: state.projects.filter(p => p.project_id !== project_id) })),
  updateProject: (project_id, updatedProject) => 
    set((state) => ({
      projects: state.projects.map(p => p.project_id === project_id ? { ...p, ...updatedProject } : p)
        .sort((a, b) => a.project_name.localeCompare(b.project_name))
    }))
}))
