'use server'

import { supabase } from '@/lib/supabase'

export async function createMachineryLog(formData: FormData) {
  const machine_id = parseInt(formData.get('machine_id') as string)
  const project_id = parseInt(formData.get('project_id') as string)
  const date = (formData.get('date') as string) || new Date().toISOString().split('T')[0]
  const operator_name = formData.get('operator_name') as string
  const rawStartTime = formData.get('start_time') as string | null
  const fuel_liters = parseFloat(formData.get('fuel_liters') as string) || 0
  const fuel_price = parseFloat(formData.get('fuel_price') as string) || null
  // 'qr' = open shift lifecycle (accurate time tracking)
  // 'manual' = instant completion (fuel/rate estimation)
  const input_method = (formData.get('input_method') as string) || 'manual'

  // Fetch machine type and benchmark rate
  const { data: machine } = await supabase
    .from('machinery')
    .select('machine_type, expected_consumption_rate')
    .eq('machinery_id', machine_id)
    .single()

  const isMachineType = machine?.machine_type !== 'truck'
  const rate = Number(machine?.expected_consumption_rate) || 0

  // QR machines open a shift lifecycle — no effective_hours yet (calculated on close)
  // Manual machines calculate effective_hours immediately from fuel/rate
  // Trucks always open a shift (no effective_hours)
  const useQrLifecycle = isMachineType && input_method === 'qr'

  const effective_hours =
    isMachineType && !useQrLifecycle && rate > 0 && fuel_liters
      ? Number((fuel_liters / rate).toFixed(2))
      : null

  const start_time = useQrLifecycle
    ? (rawStartTime || new Date().toTimeString().slice(0, 5))
    : isMachineType
      ? null
      : (rawStartTime || new Date().toTimeString().slice(0, 5))

  const is_completed = useQrLifecycle ? false : isMachineType ? true : false
  const status = (useQrLifecycle || !isMachineType) ? 'started' : 'completed'

  const { data, error } = await supabase
    .from('machinery_logs')
    .insert([
      {
        machine_id,
        project_id,
        date,
        operator_name,
        start_time,
        fuel_liters,
        fuel_price,
        effective_hours,
        is_completed,
        status,
        pause_events: [],
        total_paused_minutes: 0,
      },
    ])
    .select('hash_id, machinery_log_id')
    .single()

  if (error) {
    console.error('Error creating log:', error)
    // Fallback if local migration hasn't dropped NOT NULL on start_time yet
    if (error.code === '23502' && error.message.includes('start_time')) {
      const retry = await supabase
        .from('machinery_logs')
        .insert([
          {
            machine_id,
            project_id,
            date,
            operator_name,
            start_time: '00:00:00',
            fuel_liters,
            fuel_price,
            effective_hours,
            is_completed,
            status,
          },
        ])
        .select('hash_id, machinery_log_id')
        .single()

      if (!retry.error && retry.data) {
        return { hash_id: retry.data.hash_id, log_id: retry.data.machinery_log_id, is_completed }
      }
    }
    return { error: error.message }
  }

  return { hash_id: data.hash_id, log_id: data.machinery_log_id, is_completed }
}

/**
 * Checks for any active (open) shift on a specific machine.
 * Includes Just-in-Time (JIT) 8-hour auto-close check for orphan shifts.
 */
export async function getActiveShiftForMachine(machineId: number) {
  const { data: shifts, error } = await supabase
    .from('machinery_logs')
    .select(`
      machinery_log_id,
      machine_id,
      project_id,
      hash_id,
      date,
      operator_name,
      start_time,
      end_time,
      fuel_liters,
      fuel_price,
      observations,
      status,
      pause_events,
      total_paused_minutes,
      created_at,
      projects(project_name)
    `)
    .eq('machine_id', machineId)
    .eq('is_completed', false)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error || !shifts || shifts.length === 0) {
    return { activeShift: null }
  }

  const shift = shifts[0]

  // JIT Orphan Shift Evaluation: Check if open shift exceeds 8 hours
  const createdAtTime = new Date(shift.created_at).getTime()
  const nowTime = Date.now()
  const elapsedHours = (nowTime - createdAtTime) / (1000 * 60 * 60)

  if (elapsedHours >= 8) {
    // Automatically close orphan shift capped at start_time + 8h
    const [sH, sM] = (shift.start_time || '08:00').split(':').map(Number)
    const endH = (sH + 8) % 24
    const calculatedEndTime = `${String(endH).padStart(2, '0')}:${String(sM || 0).padStart(2, '0')}`

    await supabase
      .from('machinery_logs')
      .update({
        is_completed: true,
        status: 'completed',
        auto_closed: true,
        end_time: shift.end_time || calculatedEndTime,
        observations: (shift.observations ? shift.observations + ' | ' : '') + '[Cierre automático: límite de 8 horas alcanzado]',
      })
      .eq('machinery_log_id', shift.machinery_log_id)

    return { activeShift: null, wasOrphanClosed: true }
  }

  return { activeShift: shift }
}

/**
 * Pauses an active shift, recording the timestamp and pause reason into pause_events timeseries.
 */
export async function pauseShift(logId: number, reason: string, notes?: string) {
  const { data: shift, error: fetchErr } = await supabase
    .from('machinery_logs')
    .select('pause_events, status, is_completed')
    .eq('machinery_log_id', logId)
    .single()

  if (fetchErr || !shift || shift.is_completed) {
    return { error: 'Turno no encontrado o ya completado.' }
  }

  if (shift.status === 'paused') {
    return { error: 'El turno ya se encuentra en pausa.' }
  }

  const currentEvents = Array.isArray(shift.pause_events) ? shift.pause_events : []
  const newEvent = {
    paused_at: new Date().toISOString(),
    unpaused_at: null,
    reason,
    notes: notes || '',
  }

  const updatedEvents = [...currentEvents, newEvent]

  const { error: updateErr } = await supabase
    .from('machinery_logs')
    .update({
      status: 'paused',
      pause_events: updatedEvents,
    })
    .eq('machinery_log_id', logId)

  if (updateErr) {
    return { error: updateErr.message }
  }

  return { success: true }
}

/**
 * Resumes a paused shift, recording unpaused_at timestamp and accumulating duration into total_paused_minutes.
 */
export async function resumeShift(logId: number) {
  const { data: shift, error: fetchErr } = await supabase
    .from('machinery_logs')
    .select('pause_events, status, is_completed, total_paused_minutes')
    .eq('machinery_log_id', logId)
    .single()

  if (fetchErr || !shift || shift.is_completed) {
    return { error: 'Turno no encontrado o ya completado.' }
  }

  if (shift.status !== 'paused') {
    return { error: 'El turno no está pausado actualmente.' }
  }

  const currentEvents = Array.isArray(shift.pause_events) ? [...shift.pause_events] : []
  const lastIdx = currentEvents.length - 1
  let additionalMinutes = 0

  if (lastIdx >= 0 && !currentEvents[lastIdx].unpaused_at) {
    const now = new Date()
    const pausedAt = new Date(currentEvents[lastIdx].paused_at)
    additionalMinutes = Math.max(1, Math.round((now.getTime() - pausedAt.getTime()) / 60000))

    currentEvents[lastIdx] = {
      ...currentEvents[lastIdx],
      unpaused_at: now.toISOString(),
      duration_minutes: additionalMinutes,
    }
  }

  const totalMinutes = (shift.total_paused_minutes || 0) + additionalMinutes

  const { error: updateErr } = await supabase
    .from('machinery_logs')
    .update({
      status: 'started',
      pause_events: currentEvents,
      total_paused_minutes: totalMinutes,
    })
    .eq('machinery_log_id', logId)

  if (updateErr) {
    return { error: updateErr.message }
  }

  return { success: true }
}

/**
 * Completes and closes an active shift, sealing any ongoing pause and updating end_time and observations.
 * For machine-type logs (opened via QR), calculates effective_hours from actual wall-clock time.
 */
export async function completeShift(logId: number, endTime?: string, observations?: string) {
  const { data: shift, error: fetchErr } = await supabase
    .from('machinery_logs')
    .select(`
      pause_events,
      status,
      is_completed,
      total_paused_minutes,
      observations,
      start_time,
      machinery(machine_type)
    `)
    .eq('machinery_log_id', logId)
    .single()

  if (fetchErr || !shift || shift.is_completed) {
    return { error: 'Turno no encontrado o ya completado.' }
  }

  let currentEvents = Array.isArray(shift.pause_events) ? [...shift.pause_events] : []
  let totalMinutes = shift.total_paused_minutes || 0

  // If currently paused, seal the open pause interval
  if (shift.status === 'paused' && currentEvents.length > 0) {
    const lastIdx = currentEvents.length - 1
    if (!currentEvents[lastIdx].unpaused_at) {
      const now = new Date()
      const pausedAt = new Date(currentEvents[lastIdx].paused_at)
      const additionalMinutes = Math.max(1, Math.round((now.getTime() - pausedAt.getTime()) / 60000))
      currentEvents[lastIdx] = {
        ...currentEvents[lastIdx],
        unpaused_at: now.toISOString(),
        duration_minutes: additionalMinutes,
      }
      totalMinutes += additionalMinutes
    }
  }

  const calculatedEndTime = endTime || new Date().toTimeString().slice(0, 5)
  const combinedObservations = observations
    ? (shift.observations ? `${shift.observations} | ${observations}` : observations)
    : shift.observations

  // For machine-type logs, calculate effective_hours from actual elapsed time minus pauses
  const machineType = (shift.machinery as any)?.machine_type
  let effective_hours: number | null = null
  if (machineType !== 'truck' && shift.start_time) {
    const [sh, sm] = (shift.start_time as string).split(':').map(Number)
    const [eh, em] = calculatedEndTime.split(':').map(Number)
    const totalShiftMinutes = (eh * 60 + em) - (sh * 60 + sm)
    const netMinutes = Math.max(0, totalShiftMinutes - totalMinutes)
    effective_hours = Number((netMinutes / 60).toFixed(2))
  }

  const { error: updateErr } = await supabase
    .from('machinery_logs')
    .update({
      status: 'completed',
      is_completed: true,
      end_time: calculatedEndTime,
      pause_events: currentEvents,
      total_paused_minutes: totalMinutes,
      observations: combinedObservations,
      ...(effective_hours !== null ? { effective_hours } : {}),
    })
    .eq('machinery_log_id', logId)

  if (updateErr) {
    return { error: updateErr.message }
  }

  return { success: true }
}

/**
 * Manual fallback action / CLI runner to close all shifts exceeding the 8-hour limit.
 */
export async function closeOrphanShiftsManually() {
  const cutoff = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('machinery_logs')
    .update({
      is_completed: true,
      status: 'completed',
      auto_closed: true,
      observations: '[Cierre automático: límite de 8 horas alcanzado]',
    })
    .eq('is_completed', false)
    .lt('created_at', cutoff)
    .select('machinery_log_id')

  if (error) {
    console.error('Error closing orphan shifts manually:', error)
    return { error: error.message }
  }

  return { closedCount: data?.length || 0 }
}
