'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Truck, Calculator, RotateCcw, Download, PieChart, Table as TableIcon, Calendar } from 'lucide-react'
import { getMachineryCostData } from '@/app/app/machinery_cost/actions'
import { toast } from 'sonner'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { format, startOfWeek } from 'date-fns'
import ResponsiveBarChart from './charts/BarChart'

interface MachineryCostDashboardProps {
  dict: any
}

export default function MachineryCostDashboard({ dict }: MachineryCostDashboardProps) {
  const [activeTab, setActiveTab] = useState<'rows' | 'kpis'>('rows')
  const [loading, setLoading] = useState(true)
  const [isCalculated, setIsCalculated] = useState(false)
  const [data, setData] = useState<any[]>([])
  const [projectData, setProjectData] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [filterType, setFilterType] = useState<'all' | 'owned' | 'rented'>('all')
  
  // Date Range
  const [dateFrom, setDateFrom] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'))

  // Inputs
  const [utilityPercent, setUtilityPercent] = useState<number>(20) // Default 20%
  const [operatorSalaryDefault, setOperatorSalaryDefault] = useState<number>(15000) // Default 15000
  const [dieselPriceDefault, setDieselPriceDefault] = useState<number>(24.5) // Default placeholder

  const loadData = useCallback(async () => {
    setLoading(true)
    const res = await getMachineryCostData(dateFrom, dateTo)
    if (res.data) {
      // Calculate overall avg diesel price from records as a hint
      const allPrices = res.data.filter((i: any) => i.diesel_price > 0).map((i: any) => i.diesel_price)
      const avgPrice = allPrices.length > 0 ? allPrices.reduce((a: any, b: any) => a + b, 0) / allPrices.length : 24.5
      setDieselPriceDefault(Number(avgPrice.toFixed(2)))

      // Initialize rows with default operator salary and individual avg price
      const initialRows = res.data.map((item: any) => ({
        ...item,
        operator_salary: operatorSalaryDefault,
        diesel_price: item.diesel_price > 0 ? item.diesel_price : avgPrice
      }))
      setData(initialRows)
      setProjectData(res.projectData || [])
      setLogs(res.logs || [])
      setIsCalculated(false) // Reset calculation state when data reloads
    } else {
      toast.error('Error al cargar datos')
    }
    setLoading(false)
  }, [dateFrom, dateTo, operatorSalaryDefault])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleOperatorSalaryChange = (id: number, value: number) => {
    setData(prev => prev.map(item => 
      item.machinery_id === id ? { ...item, operator_salary: value } : item
    ))
  }

  const handleDieselPriceChange = (id: number, value: number) => {
    setData(prev => prev.map(item => 
      item.machinery_id === id ? { ...item, diesel_price: value } : item
    ))
  }

  const handleOperatorSalaryDefaultChange = (value: number) => {
    setOperatorSalaryDefault(value)
    if (!isCalculated) {
      setData(prev => prev.map(item => ({ ...item, operator_salary: value })))
    }
  }

  const handleDieselPriceDefaultChange = (value: number) => {
    setDieselPriceDefault(value)
    if (!isCalculated) {
      setData(prev => prev.map(item => ({ ...item, diesel_price: value })))
    }
  }

  const filteredData = useMemo(() => {
    return data.filter(item => {
      if (filterType === 'all') return true
      if (filterType === 'rented') return item.is_rented
      return !item.is_rented
    })
  }, [data, filterType])

  const calculateResults = () => {
    // 1. Calculate per-machine results
    const updatedData = data.map(item => {
      const worked_hours = item.worked_hours || 1 // Avoid division by zero
      
      const rescue_value = item.purchase_value * item.rescue_value_percent
      const fuel_cost_hr = (item.diesel_consumption * item.diesel_price) / worked_hours
      const operator_cost_hr = item.operator_salary / worked_hours
      const maintenance_cost_hr = item.maintenance_cost / worked_hours
      
      // Depreciation Cost/hr: (purchase_value - rescue_value) / lifespan_years / 2112
      const service_life = item.service_life || 1
      const depreciation_cost_hr = (item.purchase_value - rescue_value) / service_life / 2112
      
      const total_cost_hr = fuel_cost_hr + operator_cost_hr + maintenance_cost_hr + depreciation_cost_hr
      const rent_rate_hr = total_cost_hr * (1 + (utilityPercent / 100))

      return {
        ...item,
        results: {
          rescue_value,
          fuel_cost_hr,
          operator_cost_hr,
          maintenance_cost_hr,
          depreciation_cost_hr,
          total_cost_hr,
          rent_rate_hr
        }
      }
    })

    // 2. Calculate per-project results using the machine hourly costs
    const calculateHours = (start: string, end: string | null) => {
      if (!end) return 0
      const [sH, sM] = start.split(':').map(Number)
      const [eH, eM] = end.split(':').map(Number)
      let hours = eH - sH
      if (hours < 0) hours += 24
      return hours + ((eM - sM) / 60)
    }

    const updatedProjectData = projectData.map(proj => {
      const projectLogs = logs.filter(l => l.project_id === proj.project_id)
      let total_cost = 0
      
      projectLogs.forEach(log => {
        const machine = updatedData.find(m => m.machinery_id === log.machine_id)
        if (machine?.results) {
          const hours = calculateHours(log.start_time, log.end_time)
          total_cost += machine.results.total_cost_hr * hours
        }
      })

      return {
        ...proj,
        total_cost
      }
    })

    setData(updatedData)
    setProjectData(updatedProjectData)
    setIsCalculated(true)
    toast.success('Cálculos realizados con éxito')
  }

  const clearData = () => {
    setIsCalculated(false)
    // Optionally reload from DB to reset
    loadData()
  }

  const exportCSV = () => {
    const csvContent = [
      ["Codigo", "Maquinaria", "Horas Trab", "Diesel (L)", "Precio Diesel", "Costo Mant", "Valor Rescate", "Costo Comb/h", "Costo Op/h", "Costo Mant/h", "Costo Depr/h", "Costo Total/h", "Tarifa Renta/h"].join(","),
      ...filteredData.map(item => [
        item.external_code,
        item.machinery_full_name,
        item.worked_hours.toFixed(2),
        item.diesel_consumption.toFixed(2),
        item.diesel_price.toFixed(2),
        item.maintenance_cost.toFixed(2),
        item.results?.rescue_value.toFixed(2) || "0.00",
        item.results?.fuel_cost_hr.toFixed(2) || "0.00",
        item.results?.operator_cost_hr.toFixed(2) || "0.00",
        item.results?.maintenance_cost_hr.toFixed(2) || "0.00",
        item.results?.depreciation_cost_hr.toFixed(2) || "0.00",
        item.results?.total_cost_hr.toFixed(2) || "0.00",
        item.results?.rent_rate_hr.toFixed(2) || "0.00"
      ].join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    saveAs(blob, `Costos_Maquinaria_${new Date().toISOString().split('T')[0]}.csv`)
  }

  if (loading) return <div className="p-8 text-center text-gray-500 italic">Cargando dashboard de costos...</div>

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Truck className="text-blue-600" />
            {dict.admin.machinery_cost.title}
          </h1>
          <p className="text-gray-500">Análisis de costos y tarifas de renta basados en registros operativos.</p>
        </div>
        
        <div className="flex gap-2">
          {!isCalculated ? (
            <button 
              onClick={calculateResults}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 shadow-md transition-all"
            >
              <Calculator size={20} />
              {dict.admin.machinery_cost.calculate}
            </button>
          ) : (
            <>
              <button 
                onClick={clearData}
                className="flex items-center gap-2 px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
              >
                <RotateCcw size={20} />
                {dict.admin.machinery_cost.clear}
              </button>
              <button 
                onClick={exportCSV}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 shadow-md transition-all"
              >
                <Download size={20} />
                {dict.admin.machinery_cost.export}
              </button>
            </>
          )}
        </div>
      </header>

      {/* Global Filters & Range */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
            <Calendar size={14} />
            {dict.admin.machinery_cost.analysis_period}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input 
              type="date" value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="p-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <input 
              type="date" value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="p-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase">
            {dict.admin.analytics.machinery_type}
          </label>
          <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-200">
            <button
              onClick={() => setFilterType('all')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                filterType === 'all' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'
              }`}
            >
              {dict.common.all}
            </button>
            <button
              onClick={() => setFilterType('owned')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                filterType === 'owned' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'
              }`}
            >
              {dict.admin.analytics.owned_only}
            </button>
            <button
              onClick={() => setFilterType('rented')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                filterType === 'rented' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'
              }`}
            >
              {dict.admin.analytics.rented_only}
            </button>
          </div>
        </div>

        <div className="flex justify-end pb-1">
          <button 
            onClick={loadData}
            className="px-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2 border border-blue-100"
          >
            <RotateCcw size={16} />
            {dict.admin.machinery_cost.refresh_data}
          </button>
        </div>
      </div>

      {/* Global Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
            {dict.admin.machinery_cost.utility_percent}
          </label>
          <div className="flex items-center gap-3">
            <input 
              type="number" 
              value={utilityPercent}
              onChange={(e) => setUtilityPercent(Number(e.target.value))}
              disabled={isCalculated}
              className="flex-1 p-2 border border-gray-300 rounded-lg text-lg font-bold text-blue-600 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-50 disabled:text-gray-400"
            />
            <span className="text-xl font-bold text-gray-400">%</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
            {dict.admin.machinery_cost.diesel_price} Default
          </label>
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-gray-400">$</span>
            <input 
              type="number" 
              step="0.01"
              value={dieselPriceDefault}
              onChange={(e) => handleDieselPriceDefaultChange(Number(e.target.value))}
              disabled={isCalculated}
              className="flex-1 p-2 border border-gray-300 rounded-lg text-lg font-bold text-blue-600 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
            {dict.admin.machinery_cost.operator_salary} Default
          </label>
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-gray-400">$</span>
            <input 
              type="number" 
              value={operatorSalaryDefault}
              onChange={(e) => handleOperatorSalaryDefaultChange(Number(e.target.value))}
              disabled={isCalculated}
              className="flex-1 p-2 border border-gray-300 rounded-lg text-lg font-bold text-blue-600 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
        </div>
      </div>
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('rows')}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'rows' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <TableIcon size={18} />
          {dict.admin.analytics.table_tab}
        </button>
        <button
          onClick={() => setActiveTab('kpis')}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'kpis' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <PieChart size={18} />
          {dict.admin.machinery_cost.visualizations}
        </button>
      </div>

      {activeTab === 'rows' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-600">
                <th className="p-4 font-bold uppercase text-[10px]">{dict.admin.machinery.external_code}</th>
                <th className="p-4 font-bold uppercase text-[10px]">{dict.admin.machinery.short_name}</th>
                <th className="p-4 font-bold uppercase text-[10px]">{dict.admin.machinery_cost.worked_hours}</th>
                <th className="p-4 font-bold uppercase text-[10px]">{dict.admin.machinery_cost.diesel_consumption}</th>
                <th className="p-4 font-bold uppercase text-[10px]">{dict.admin.depreciation.optimal_fuel}</th>
                <th className="p-4 font-bold uppercase text-[10px]">{dict.admin.machinery_cost.diesel_price}</th>
                <th className="p-4 font-bold uppercase text-[10px]">{dict.admin.machinery_cost.maintenance_cost}</th>
                <th className="p-4 font-bold uppercase text-[10px]">{dict.admin.machinery_cost.operator_salary}</th>
                
                {isCalculated && (
                  <>
                    <th className="p-4 font-bold uppercase text-[10px] bg-blue-50 text-blue-700">{dict.admin.machinery_cost.fuel_cost_hr}</th>
                    <th className="p-4 font-bold uppercase text-[10px] bg-blue-50 text-blue-700">{dict.admin.machinery_cost.operator_cost_hr}</th>
                    <th className="p-4 font-bold uppercase text-[10px] bg-blue-50 text-blue-700">{dict.admin.machinery_cost.maintenance_cost_hr}</th>
                    <th className="p-4 font-bold uppercase text-[10px] bg-blue-50 text-blue-700">{dict.admin.machinery_cost.depreciation_cost_hr}</th>
                    <th className="p-4 font-bold uppercase text-[10px] bg-orange-50 text-orange-700">{dict.admin.machinery_cost.total_cost_hr}</th>
                    <th className="p-4 font-bold uppercase text-[10px] bg-green-50 text-green-700">{dict.admin.machinery_cost.rent_rate_hr}</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="text-gray-900">
              {filteredData.map(item => (
                <tr key={item.machinery_id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 font-bold">{item.external_code}</td>
                  <td className="p-4">{item.machinery_full_name}</td>
                  <td className="p-4 font-mono">{item.worked_hours.toFixed(1)}h</td>
                  <td className="p-4 font-mono">{item.diesel_consumption.toFixed(1)}L</td>
                  <td className="p-4 font-mono text-gray-500">{item.optimal_fuel_consumption}L/h</td>
                  <td className="p-4">
                    <input 
                      type="number" 
                      step="0.01"
                      value={item.diesel_price}
                      onChange={(e) => handleDieselPriceChange(item.machinery_id, Number(e.target.value))}
                      disabled={isCalculated}
                      className="w-20 p-1 border border-gray-300 rounded outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-transparent disabled:border-transparent font-mono"
                    />
                  </td>
                  <td className="p-4 font-mono text-red-600">${item.maintenance_cost.toLocaleString()}</td>
                  <td className="p-4">
                    <input 
                      type="number" 
                      value={item.operator_salary}
                      onChange={(e) => handleOperatorSalaryChange(item.machinery_id, Number(e.target.value))}
                      disabled={isCalculated}
                      className="w-24 p-1 border border-gray-300 rounded outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-transparent disabled:border-transparent font-mono"
                    />
                  </td>

                  {isCalculated && (
                    <>
                      <td className="p-4 font-mono bg-blue-50/30 font-bold">${item.results?.fuel_cost_hr.toFixed(2)}</td>
                      <td className="p-4 font-mono bg-blue-50/30 font-bold">${item.results?.operator_cost_hr.toFixed(2)}</td>
                      <td className="p-4 font-mono bg-blue-50/30 font-bold">${item.results?.maintenance_cost_hr.toFixed(2)}</td>
                      <td className="p-4 font-mono bg-blue-50/30 font-bold">${item.results?.depreciation_cost_hr.toFixed(2)}</td>
                      <td className="p-4 font-mono bg-orange-50/30 font-bold text-orange-700">${item.results?.total_cost_hr.toFixed(2)}</td>
                      <td className="p-4 font-mono bg-green-50/30 font-bold text-green-700 text-lg">${item.results?.rent_rate_hr.toFixed(2)}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-8">
          {!isCalculated ? (
            <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
              <Calculator size={64} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">{dict.admin.machinery_cost.calculation_required}</h3>
              <p className="text-gray-500 mb-6">{dict.admin.machinery_cost.calculation_hint}</p>
              <button 
                onClick={calculateResults}
                className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 shadow-md transition-all"
              >
                <Calculator size={20} />
                {dict.admin.machinery_cost.calculate}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Costo por Hora */}
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4 h-96">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm uppercase tracking-wider text-gray-500 border-b pb-2">
                  {dict.admin.machinery_cost.chart_total_cost}
                </h3>
                <div className="h-[calc(100%-3rem)]">
                  <ResponsiveBarChart 
                    data={filteredData.map(item => ({
                      label: item.external_code,
                      value: item.results?.total_cost_hr || 0,
                      name: item.machinery_full_name
                    }))} 
                    color="#f97316"
                    yAxisLabel="$/h"
                  />
                </div>
              </div>

              {/* Rentabilidad */}
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4 h-96">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm uppercase tracking-wider text-gray-500 border-b pb-2">
                  {dict.admin.machinery_cost.chart_profitability}
                </h3>
                <div className="h-[calc(100%-3rem)]">
                  <ResponsiveBarChart 
                    data={filteredData.map(item => ({
                      label: item.external_code,
                      value: (item.results?.rent_rate_hr || 0) - (item.results?.total_cost_hr || 0),
                      name: item.machinery_full_name
                    }))} 
                    color="#10b981"
                    yAxisLabel="$/h"
                  />
                </div>
              </div>

              {/* Costo por Proyecto */}
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4 h-96 lg:col-span-2">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm uppercase tracking-wider text-gray-500 border-b pb-2">
                  {dict.admin.machinery_cost.chart_project_total}
                </h3>
                <div className="h-[calc(100%-3rem)]">
                  <ResponsiveBarChart 
                    data={projectData.map(p => ({
                      label: p.name,
                      value: p.total_cost || 0
                    }))} 
                    color="#3b82f6"
                    yAxisLabel="MXN"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
