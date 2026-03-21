'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function createProject(formData: FormData) {
  const project_name = formData.get('project_name') as string

  const { data, error } = await supabaseAdmin
    .from('projects')
    .insert([{ project_name }])
    .select()
    .single()

  if (error) {
    console.error('Error creating project:', error)
    if (error.code === '23505') {
      return { error: 'DUPLICATE_PROJECT' }
    }
    return { error: 'GENERIC_ERROR' }
  }

  revalidatePath('/admin/projects')
  return { success: true, project: data }
}

export async function updateProject(project_id: number, formData: FormData) {
  const project_name = formData.get('project_name') as string

  const { data, error } = await supabaseAdmin
    .from('projects')
    .update({ project_name })
    .eq('project_id', project_id)
    .select()
    .single()

  if (error) {
    console.error('Error updating project:', error)
    if (error.code === '23505') {
      return { error: 'DUPLICATE_PROJECT' }
    }
    return { error: 'GENERIC_ERROR' }
  }

  revalidatePath('/admin/projects')
  return { success: true, project: data }
}

export async function deleteProject(project_id: number) {
  const { error } = await supabaseAdmin
    .from('projects')
    .delete()
    .eq('project_id', project_id)

  if (error) {
    console.error('Error deleting project:', error)
    return { error: 'GENERIC_ERROR' }
  }

  revalidatePath('/admin/projects')
  return { success: true }
}
