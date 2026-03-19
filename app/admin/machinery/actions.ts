'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function createMachinery(formData: FormData) {
  const external_code = formData.get('external_code') as string
  const machinery_full_name = formData.get('machinery_full_name') as string
  const machinery_name = formData.get('machinery_name') as string
  const machinery_model = formData.get('machinery_model') as string
  const machinery_serial_code = formData.get('machinery_serial_code') as string

  const { data, error } = await supabaseAdmin
    .from('machinery')
    .insert([{ 
      external_code, 
      machinery_full_name, 
      machinery_name, 
      machinery_model, 
      machinery_serial_code 
    }])
    .select()
    .single()

  if (error) {
    console.error('Error creating machinery:', error)
    return { error: error.message }
  }

  revalidatePath('/admin/machinery')
  return { success: true, machine: data }
}

export async function updateMachinery(machinery_id: number, formData: FormData) {
  const external_code = formData.get('external_code') as string
  const machinery_full_name = formData.get('machinery_full_name') as string
  const machinery_name = formData.get('machinery_name') as string
  const machinery_model = formData.get('machinery_model') as string
  const machinery_serial_code = formData.get('machinery_serial_code') as string

  const { data, error } = await supabaseAdmin
    .from('machinery')
    .update({ 
      external_code, 
      machinery_full_name, 
      machinery_name, 
      machinery_model, 
      machinery_serial_code 
    })
    .eq('machinery_id', machinery_id)
    .select()
    .single()

  if (error) {
    console.error('Error updating machinery:', error)
    return { error: error.message }
  }

  revalidatePath('/admin/machinery')
  return { success: true, machine: data }
}

export async function deleteMachinery(machinery_id: number) {
  const { error } = await supabaseAdmin
    .from('machinery')
    .delete()
    .eq('machinery_id', machinery_id)

  if (error) {
    console.error('Error deleting machinery:', error)
    return { error: error.message }
  }

  revalidatePath('/admin/machinery')
  return { success: true }
}
