'use server'

import { createClient } from '@/lib/supabase/server'

export async function getMachineryCostData(dateFrom?: string, dateTo?: string, projectId?: number) {
  const supabase = await createClient()

  // 0. Fetch all projects for dropdowns
  const { data: allProjects } = await supabase
    .from('projects')
    .select('project_id, project_name')
    .order('project_name', { ascending: true })

  // 1. Fetch machinery joined with depreciation
  const { data: machines, error: machError } = await supabase
    .from('machinery')
    .select(`
      machinery_id,
      machinery_full_name,
      external_code,
      is_rented,
      machine_type,
      expected_consumption_rate,
      machinery_depreciation (
        optimal_fuel_consumption,
        service_life,
        purchase_value,
        rescue_value,
        estimated_depreciation_rate
      )
    `)

  if (machError) {
    console.error('Error fetching machines:', machError)
    return { error: machError.message }
  }

  // 2. Fetch all completed logs for aggregation
  let logsQuery = supabase
    .from('machinery_logs')
    .select('machine_id, project_id, start_time, end_time, fuel_liters, fuel_price, effective_hours, projects(project_name)')
    .eq('is_completed', true)

  if (dateFrom) logsQuery = logsQuery.gte('date', dateFrom)
  if (dateTo) logsQuery = logsQuery.lte('date', dateTo)
  if (projectId) logsQuery = logsQuery.eq('project_id', projectId)

  const { data: logs, error: logsError } = await logsQuery

  if (logsError) {
    console.error('Error fetching logs:', logsError)
    return { error: logsError.message }
  }

  // 3. Fetch all approved maintenance requests
  let maintQuery = supabase
    .from('maintenance_requests')
    .select('machine_id, cost, project_id')
    .eq('status', 'approved')

  if (dateFrom) maintQuery = maintQuery.gte('date', dateFrom)
  if (dateTo) maintQuery = maintQuery.lte('date', dateTo)
  if (projectId) maintQuery = maintQuery.eq('project_id', projectId)

  const { data: maintenance, error: maintError } = await maintQuery

  if (maintError) {
    console.error('Error fetching maintenance:', maintError)
    return { error: maintError.message }
  }

  // Helper function to calculate hours between two TIME strings (HH:mm:ss)
  const calculateHours = (start: string | null, end: string | null) => {
    if (!start || !end) return 0
    const [sH, sM] = start.split(':').map(Number)
    const [eH, eM] = end.split(':').map(Number)
    
    let hours = eH - sH
    const mins = eM - sM
    
    // Handle cases where end time is the next day (unlikely but possible if it crosses midnight)
    if (hours < 0) hours += 24
    
    return hours + (mins / 60)
  }

  // If projectId is specified, only include machines that had logs or maintenance on that project
  const targetMachines = projectId 
    ? machines.filter(m => logs?.some(l => l.machine_id === m.machinery_id) || maintenance?.some(mr => mr.machine_id === m.machinery_id))
    : machines

  // Aggregate data by machine_id
  const costData = targetMachines.map(m => {
    const machineLogs = logs?.filter(l => l.machine_id === m.machinery_id) || []
    const machineMaint = maintenance?.filter(mr => mr.machine_id === m.machinery_id) || []
    
    const worked_hours = machineLogs.reduce((acc, l) => {
      if (l.effective_hours != null) {
        return acc + Number(l.effective_hours)
      }
      const isMachine = m.machine_type !== 'truck'
      if (isMachine && Number(m.expected_consumption_rate) > 0 && Number(l.fuel_liters) > 0) {
        return acc + (Number(l.fuel_liters) / Number(m.expected_consumption_rate))
      }
      return acc + calculateHours(l.start_time, l.end_time)
    }, 0)
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
      machine_type: m.machine_type || 'machine',
      worked_hours,
      diesel_consumption,
      diesel_price,
      maintenance_cost,
      // Depreciation info
      optimal_fuel_consumption: depr?.optimal_fuel_consumption || 0,
      service_life: depr?.service_life || 0,
      purchase_value: depr?.purchase_value || 0,
      rescue_value_percent: (depr?.rescue_value || 0),
      estimated_depreciation_rate: depr?.estimated_depreciation_rate || 0,
    }
  })

  // Aggregate data by project for "costo por proyecto"
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
    const machine = machines.find(m => m.machinery_id === l.machine_id)
    const isMachine = machine?.machine_type !== 'truck'
    const hours = l.effective_hours != null
      ? Number(l.effective_hours)
      : (isMachine && Number(machine?.expected_consumption_rate) > 0 && Number(l.fuel_liters) > 0)
        ? (Number(l.fuel_liters) / Number(machine?.expected_consumption_rate))
        : calculateHours(l.start_time, l.end_time)
    projectsMap[l.project_id].worked_hours += hours
    projectsMap[l.project_id].diesel_cost += (Number(l.fuel_liters) || 0) * (Number(l.fuel_price) || 0)
  })

  const projectData = Object.entries(projectsMap).map(([id, data]) => ({
    project_id: Number(id),
    ...data
  }))

  return { data: costData, projectData, logs, projects: allProjects || [] }
}
