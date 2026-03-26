'use client'

import React, { useMemo, useState } from 'react'
import * as d3 from 'd3-array'
import ResponsiveBarChart from './charts/BarChart'
import ResponsiveDonutChart from './charts/DonutChart'
import { Fuel, Clock, Gauge, TrendingUp, DollarSign } from 'lucide-react'

interface LogbookAnalyticsProps {
  logs: any[]
  dict: any
}

export default function LogbookAnalytics({ logs, dict }: LogbookAnalyticsProps) {
  const [viewMode, setViewMode] = useState<'liters' | 'mxn'>('liters')

  const analyticsData = useMemo(() => {
    if (!logs || logs.length === 0) return null

    // Helper to calculate hours
    const getHours = (start: string, end: string) => {
      if (!start || !end) return 0
      const [sh, sm] = start.split(':').map(Number)
      const [eh, em] = end.split(':').map(Number)
      const startDate = new Date(2000, 0, 1, sh, sm)
      const endDate = new Date(2000, 0, 1, eh, em)
      let diff = (endDate.getTime() - startDate.getTime()) / 1000 / 3600
      return diff > 0 ? diff : 0
    }

    const processedLogs = logs.map(log => ({
      ...log,
      hours: getHours(log.start_time, log.end_time),
      cost: (log.fuel_liters || 0) * (log.fuel_price || 0),
      machineLabel: log.machinery?.external_code || `M-${log.machine_id}`,
      machineName: log.machinery?.machinery_name || `M-${log.machine_id}`,
      projectLabel: log.projects?.project_name || `P-${log.project_id}`
    }))

    // 1. Consumption per Machine
    const fuelPerMachine = Array.from(
      d3.rollup(processedLogs, v => d3.sum(v, d => d.fuel_liters), d => d.machineLabel),
      ([label, value]) => ({ 
        label, 
        value, 
        name: processedLogs.find(d => d.machineLabel === label)?.machineName || label 
      })
    ).sort((a, b) => b.value - a.value)

    const costPerMachine = Array.from(
      d3.rollup(processedLogs, v => d3.sum(v, d => d.cost), d => d.machineLabel),
      ([label, value]) => ({ 
        label, 
        value, 
        name: processedLogs.find(d => d.machineLabel === label)?.machineName || label 
      })
    ).sort((a, b) => b.value - a.value)

    // 2. Utilization (Hours) per Machine
    const hoursPerMachine = Array.from(
      d3.rollup(processedLogs, v => d3.sum(v, d => d.hours), d => d.machineLabel),
      ([label, value]) => ({ 
        label, 
        value, 
        name: processedLogs.find(d => d.machineLabel === label)?.machineName || label 
      })
    ).sort((a, b) => b.value - a.value)

    // 3. Efficiency (Avg L/h) per Machine
    const efficiencyPerMachine = Array.from(
      d3.rollup(processedLogs, 
        v => {
          const totalL = d3.sum(v, d => d.fuel_liters)
          const totalH = d3.sum(v, d => d.hours)
          return totalH > 0 ? totalL / totalH : 0
        }, 
        d => d.machineLabel
      ),
      ([label, value]) => ({ 
        label, 
        value, 
        name: processedLogs.find(d => d.machineLabel === label)?.machineName || label 
      })
    ).sort((a, b) => b.value - a.value).filter(d => d.value > 0)

    // 4. Consumption per Project
    const fuelPerProject = Array.from(
      d3.rollup(processedLogs, v => d3.sum(v, d => d.fuel_liters), d => d.projectLabel),
      ([label, value]) => ({ label, value, name: label })
    ).sort((a, b) => b.value - a.value)

    const costPerProject = Array.from(
      d3.rollup(processedLogs, v => d3.sum(v, d => d.cost), d => d.projectLabel),
      ([label, value]) => ({ label, value, name: label })
    ).sort((a, b) => b.value - a.value)

    return {
      fuelPerMachine,
      costPerMachine,
      hoursPerMachine,
      efficiencyPerMachine,
      fuelPerProject,
      costPerProject,
      totals: {
        liters: d3.sum(processedLogs, d => d.fuel_liters),
        cost: d3.sum(processedLogs, d => d.cost),
        hours: d3.sum(processedLogs, d => d.hours)
      }
    }
  }, [logs])

  if (!analyticsData) {
    return (
      <div className="bg-white p-12 rounded-xl border border-gray-100 text-center space-y-4">
        <TrendingUp size={48} className="mx-auto text-gray-300" />
        <p className="text-gray-500 font-medium">{dict.analytics.no_data}</p>
      </div>
    )
  }

  const currentFuelData = viewMode === 'liters' ? analyticsData.fuelPerMachine : analyticsData.costPerMachine
  const currentProjectData = viewMode === 'liters' ? analyticsData.fuelPerProject : analyticsData.costPerProject

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <Fuel size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{dict.analytics.total_liters}</p>
            <p className="text-2xl font-bold text-gray-900">{analyticsData.totals.liters.toFixed(2)} L</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{dict.analytics.total_mxn}</p>
            <p className="text-2xl font-bold text-gray-900">${analyticsData.totals.cost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{dict.analytics.kpi_utilization}</p>
            <p className="text-2xl font-bold text-gray-900">{analyticsData.totals.hours.toFixed(1)} h</p>
          </div>
        </div>
      </div>

      {/* Consumption & Expenses Group */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Gauge className="text-blue-600" />
            Consumo y Gastos
          </h2>
          <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 w-fit">
            <button
              onClick={() => setViewMode('liters')}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'liters' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'
              }`}
            >
              Litros
            </button>
            <button
              onClick={() => setViewMode('mxn')}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'mxn' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'
              }`}
            >
              MXN
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Fuel Consumption per Machine */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4 h-80">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm uppercase tracking-wider text-gray-500">
              {dict.analytics.kpi_fuel_machine}
            </h3>
            <div className="h-[calc(100%-2rem)]">
              <ResponsiveBarChart 
                data={currentFuelData} 
                color={viewMode === 'liters' ? '#3b82f6' : '#10b981'}
                yAxisLabel={viewMode === 'liters' ? 'Litros' : 'MXN'}
              />
            </div>
          </div>

          {/* Consumption per Project */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4 h-80">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm uppercase tracking-wider text-gray-500">
              {dict.analytics.kpi_fuel_project}
            </h3>
            <div className="h-[calc(100%-2rem)]">
              <ResponsiveDonutChart data={currentProjectData} />
            </div>
          </div>
        </div>
      </section>

      {/* Performance & Utilization Group */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp className="text-green-600" />
          Utilización y Rendimiento
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Utilization per Machine */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4 h-80">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm uppercase tracking-wider text-gray-500">
              {dict.analytics.kpi_utilization}
            </h3>
            <div className="h-[calc(100%-2rem)]">
              <ResponsiveBarChart data={analyticsData.hoursPerMachine} color="#f97316" yAxisLabel="Horas" />
            </div>
          </div>

          {/* Efficiency per Machine */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4 h-80">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm uppercase tracking-wider text-gray-500">
              {dict.analytics.kpi_efficiency}
            </h3>
            <div className="h-[calc(100%-2rem)]">
              <ResponsiveBarChart data={analyticsData.efficiencyPerMachine} color="#10b981" yAxisLabel="L/h" />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
