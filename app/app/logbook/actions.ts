'use server'

import { createClient } from '@/lib/supabase/server'

export async function getMachineryLogs(
  machineId?: number,
  dateFrom?: string,
  dateTo?: string,
) {
  const supabase = await createClient()

  let query = supabase
    .from('machinery_logs')
    .select(`
      *,
      projects(project_name),
      machinery(machinery_name, machinery_full_name, external_code, is_rented)
    `)
    .order('date', { ascending: true })

  if (dateFrom) {
    query = query.gte('date', dateFrom)
  }
  if (dateTo) {
    query = query.lte('date', dateTo)
  }
  if (machineId) {
    query = query.eq('machine_id', machineId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching machinery logs:', error)
    return { error: error.message }
  }

  return { success: true, logs: data || [] }
}
