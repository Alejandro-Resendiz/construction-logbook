'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { sendMaintenanceAuthNotification } from '@/lib/notifications'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const sparePartSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().min(0),
  amount: z.number().optional().nullable(),
})

const maintenanceRequestSchema = z.object({
  machine_id: z.number(),
  maintenance_type: z.enum(['preventive', 'corrective']),
  type: z.enum(['preventive', 'corrective']),
  date: z.string(),
  last_maintenance_date: z.string().optional().nullable(),
  next_maintenance_date: z.string().optional().nullable(),
  description: z.string().min(1),
  spare_parts: z.array(sparePartSchema),
  cost: z.number().optional(),
  worked_time: z.number().optional(),
  downtime: z.number().optional(),
  is_external: z.boolean().optional(),
  observations: z.string().optional().nullable(),
  attachments: z.array(z.string()).optional(),
})

export async function createMaintenanceRequest(formData: FormData, spareParts: any[], attachmentUrls: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const rawData = {
    machine_id: parseInt(formData.get('machine_id') as string),
    maintenance_type: formData.get('maintenance_type') as 'preventive' | 'corrective',
    type: formData.get('maintenance_type') as 'preventive' | 'corrective',
    date: formData.get('date') as string,
    last_maintenance_date: formData.get('last_maintenance_date') as string || null,
    next_maintenance_date: formData.get('next_maintenance_date') as string || null,
    description: formData.get('description') as string,
    spare_parts: spareParts,
    cost: parseFloat(formData.get('cost') as string) || 0,
    worked_time: parseFloat(formData.get('worked_time') as string) || 0,
    downtime: parseFloat(formData.get('downtime') as string) || 0,
    is_external: formData.get('is_external') === 'true',
    observations: formData.get('observations') as string || null,
    attachments: attachmentUrls,
  }

  try {
    const validatedData = maintenanceRequestSchema.parse(rawData)
    
    const { data, error } = await supabase
      .from('maintenance_requests')
      .insert([validatedData])
      .select(`
        *,
        machinery(machinery_name)
      `)
      .single()

    if (error) {
      console.error('Error creating maintenance request:', error)
      return { error: error.message }
    }

    // Send Notification
    await sendMaintenanceAuthNotification({
      hash_id: data.hash_id,
      machineName: data.machinery?.machinery_name || 'Maquinaria Desconocida',
      description: data.description,
    })

    revalidatePath('/app/maintenance')
    return { success: true, data }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: 'Validation failed', details: err.issues }
    }
    return { error: 'Internal Server Error' }
  }
}

export async function updateMaintenanceStatus(requestId: number, status: 'pending' | 'approved' | 'rejected') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabaseAdmin
    .from('maintenance_requests')
    .update({ status })
    .eq('maintenance_request_id', requestId)

  if (error) {
    console.error('Error updating status:', error)
    return { error: error.message }
  }

  revalidatePath('/app/maintenance')
  return { success: true }
}

export async function updateMaintenanceDetails(requestId: number, observations: string, attachments: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('maintenance_requests')
    .update({ observations, attachments })
    .eq('maintenance_request_id', requestId)

  if (error) {
    console.error('Error updating details:', error)
    return { error: error.message }
  }

  revalidatePath('/app/maintenance')
  revalidatePath(`/app/maintenance/${requestId}`)
  return { success: true }
}

export async function uploadMaintenanceAttachment(file: File) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const fileExt = file.name.split('.').pop()
  const fileName = `${Math.random()}-${Date.now()}.${fileExt}`
  const filePath = `${user.id}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('maintenance_attachments')
    .upload(filePath, file)

  if (uploadError) {
    console.error('Upload error:', uploadError)
    throw uploadError
  }

  const { data: { publicUrl } } = supabase.storage
    .from('maintenance_attachments')
    .getPublicUrl(filePath)

  return publicUrl
}
