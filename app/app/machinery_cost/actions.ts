'use server'

import { createClient } from '@/lib/supabase/server'

export async function getMachineryCostData(dateFrom?: string, dateTo?: string) {
  const supabase = await createClient()

  // 1. Fetch machinery joined with depreciation
  const { data: machines, error: machError } = await supabase
    .from('machinery')
    .select(`
      machinery_id,
      machinery_full_name,
      external_code,
      is_rented,
      machinery_depreciation (
        optimal_fuel_consumption,
        service_life,
        purchase_value,
        rescue_value
      )
    `)

  if (machError) {
    console.error('Error fetching machines:', machError)
    return { error: machError.message }
  }

  // 2. Fetch all completed logs for aggregation
  let logsQuery = supabase
    .from('machinery_logs')
    .select('machine_id, project_id, start_time, end_time, fuel_liters, fuel_price, projects(project_name)')
    .eq('is_completed', true)

  if (dateFrom) logsQuery = logsQuery.gte('date', dateFrom)
  if (dateTo) logsQuery = logsQuery.lte('date', dateTo)

  const { data: logs, error: logsError } = await logsQuery

  if (logsError) {
    console.error('Error fetching logs:', logsError)
    return { error: logsError.message }
  }

  // 3. Fetch all approved maintenance requests
  let maintQuery = supabase
    .from('maintenance_requests')
    .select('machine_id, cost')
    .eq('status', 'approved')

  if (dateFrom) maintQuery = maintQuery.gte('date', dateFrom)
  if (dateTo) maintQuery = maintQuery.lte('date', dateTo)

  const { data: maintenance, error: maintError } = await maintQuery

  if (maintError) {
    console.error('Error fetching maintenance:', maintError)
    return { error: maintError.message }
  }

  // Helper function to calculate hours between two TIME strings (HH:mm:ss)
  const calculateHours = (start: string, end: string | null) => {
    if (!end) return 0
    const [sH, sM] = start.split(':').map(Number)
    const [eH, eM] = end.split(':').map(Number)
    
    let hours = eH - sH
    const mins = eM - sM
    
    // Handle cases where end time is the next day (unlikely but possible if it crosses midnight)
    if (hours < 0) hours += 24
    
    return hours + (mins / 60)
  }

  // Aggregate data by machine_id
  const costData = machines.map(m => {
    const machineLogs = logs?.filter(l => l.machine_id === m.machinery_id) || []
    const machineMaint = maintenance?.filter(mr => mr.machine_id === m.machinery_id) || []
    
    const worked_hours = machineLogs.reduce((acc, l) => acc + calculateHours(l.start_time, l.end_time), 0)
    const diesel_consumption = machineLogs.reduce((acc, l) => acc + (Number(l.fuel_liters) || 0), 0)
    
    const fuelPrices = machineLogs.filter(l => l.fuel_price).map(l => Number(l.fuel_price))
    const diesel_price = fuelPrices.length > 0 ? fuelPrices.reduce((acc, p) => acc + p, 0) / fuelPrices.length : 0
    
    const maintenance_cost = machineMaint.reduce((acc, mr) => acc + (Number(mr.cost) || 0), 0)
    
    const depr = m.machinery_depreciation?.[0] || null

    return {
      machinery_id: m.machinery_id,
      machinery_full_name: m.machinery_full_name,
      external_code: m.external_code,
      is_rented: m.is_rented,
      worked_hours,
      diesel_consumption,
      diesel_price,
      maintenance_cost,
      // Depreciation info
      optimal_fuel_consumption: depr?.optimal_fuel_consumption || 0,
      service_life: depr?.service_life || 0,
      purchase_value: depr?.purchase_value || 0,
      rescue_value_percent: (depr?.rescue_value || 0),
    }
  })

  // Aggregate data by project for "costo por proyecto"
  // Note: Since maintenance_requests doesn't have project_id in our schema (only machine_id),
  // we might only be able to aggregate diesel and worked hours by project from logs.
  // Unless maintenance_requests should also have project_id? 
  // Checking maintenance_requests schema again...
  
  const projectsMap: Record<number, { name: string, worked_hours: number, diesel_cost: number }> = {}
  
  logs?.forEach(l => {
    if (!l.project_id) return
    if (!projectsMap[l.project_id]) {
      projectsMap[l.project_id] = { 
        name: (l.projects as any)?.project_name || 'Desconocido', 
        worked_hours: 0, 
        diesel_cost: 0 
      }
    }
    const hours = calculateHours(l.start_time, l.end_time)
    projectsMap[l.project_id].worked_hours += hours
    projectsMap[l.project_id].diesel_cost += (Number(l.fuel_liters) || 0) * (Number(l.fuel_price) || 0)
  })

  const projectData = Object.entries(projectsMap).map(([id, data]) => ({
    project_id: Number(id),
    ...data
  }))

  return { data: costData, projectData, logs }
}
