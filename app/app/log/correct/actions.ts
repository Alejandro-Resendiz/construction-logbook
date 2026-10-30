'use server'

import { createClient } from '@supabase/supabase-js'

// We create a special admin client that uses the SERVICE_ROLE_KEY
// to bypass RLS and allow correcting completed logs.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function adminUpdateLog(hash_id: string, formData: FormData) {
  const rawEndTime = formData.get('end_time') as string
  const end_time = rawEndTime && rawEndTime.trim() !== '' ? rawEndTime : null
  const observations = formData.get('observations') as string
  const fuel_price = parseFloat(formData.get('fuel_price') as string) || null
  const rawFuelLiters = formData.get('fuel_liters') as string | null

  const updatePayload: Record<string, any> = {
    end_time,
    observations,
    fuel_price,
    is_corrected: true,
    is_completed: true // Ensure it stays completed
  }

  if (rawFuelLiters && !isNaN(parseFloat(rawFuelLiters))) {
    const fuel_liters = parseFloat(rawFuelLiters)
    updatePayload.fuel_liters = fuel_liters

    const { data: logRecord } = await supabaseAdmin
      .from('machinery_logs')
      .select('machine_id, machinery(machine_type, expected_consumption_rate)')
      .eq('hash_id', hash_id)
      .single()

    const mach = (logRecord as any)?.machinery
    if (mach?.machine_type !== 'truck' && Number(mach?.expected_consumption_rate) > 0) {
      updatePayload.effective_hours = Number((fuel_liters / Number(mach.expected_consumption_rate)).toFixed(2))
    }
  }

  const { error } = await supabaseAdmin
    .from('machinery_logs')
    .update(updatePayload)
    .eq('hash_id', hash_id)

  if (error) {
    console.error('Error admin updating log:', error)
    return { error: error.message }
  }

  return { success: true }
}
