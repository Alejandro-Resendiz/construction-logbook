'use server'

import { supabase } from '@/lib/supabase'

export async function createMachineryLog(formData: FormData) {
  const machine_id = formData.get('machine_id') as string
  const project_id = formData.get('project_id') as string
  const date = formData.get('date') as string
  const operator_name = formData.get('operator_name') as string
  const start_time = formData.get('start_time') as string
  const fuel_liters = parseFloat(formData.get('fuel_liters') as string)
  const fuel_price = parseFloat(formData.get('fuel_price') as string) || null

  const { data, error } = await supabase
    .from('machinery_logs')
    .insert([
      {
        machine_id: parseInt(machine_id),
        project_id: parseInt(project_id),
        date,
        operator_name,
        start_time,
        fuel_liters,
        fuel_price,
      },
    ])
    .select('hash_id')
    .single()

  if (error) {
    console.error('Error creating log:', error)
    return { error: error.message }
  }

  return { hash_id: data.hash_id }
}
