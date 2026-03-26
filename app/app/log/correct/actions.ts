'use server'

import { createClient } from '@supabase/supabase-js'

// We create a special admin client that uses the SERVICE_ROLE_KEY
// to bypass RLS and allow correcting completed logs.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function adminUpdateLog(hash_id: string, formData: FormData) {
  const end_time = formData.get('end_time') as string
  const observations = formData.get('observations') as string
  const fuel_price = parseFloat(formData.get('fuel_price') as string) || null

  const { error } = await supabaseAdmin
    .from('machinery_logs')
    .update({
      end_time,
      observations,
      fuel_price,
      is_corrected: true,
      is_completed: true // Ensure it stays completed
    })
    .eq('hash_id', hash_id)

  if (error) {
    console.error('Error admin updating log:', error)
    return { error: error.message }
  }

  return { success: true }
}
