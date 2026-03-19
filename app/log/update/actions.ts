'use server'

import { supabase } from '@/lib/supabase'

export async function getLogByHashId(hash_id: string) {
  const { data, error } = await supabase
    .from('machinery_logs')
    .select(`
      hash_id, 
      operator_name, 
      date, 
      is_completed, 
      end_time, 
      observations,
      start_time,
      fuel_liters,
      machinery(machinery_name),
      projects(project_name)
    `)
    .eq('hash_id', hash_id)
    .single()

  if (error) {
    console.error('Error fetching log:', error)
    return { error: 'No se encontró el registro.' }
  }

  return { log: data }
}

export async function updateMachineryLog(hash_id: string, formData: FormData) {
  const end_time = formData.get('end_time') as string
  const observations = formData.get('observations') as string

  // Double check if already completed
  const { data: checkData } = await supabase
    .from('machinery_logs')
    .select('is_completed')
    .eq('hash_id', hash_id)
    .single()

  if (checkData?.is_completed) {
    return { error: 'Ya está actualizado, contacta a tu administrador.' }
  }

  const { error } = await supabase
    .from('machinery_logs')
    .update({
      end_time,
      observations,
      is_completed: true,
    })
    .eq('hash_id', hash_id)

  if (error) {
    console.error('Error updating log:', error)
    return { error: error.message }
  }

  return { success: true }
}
