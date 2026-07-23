'use client'

import React, { useMemo, useState, useRef } from 'react'
import * as d3 from 'd3-array'
import { toast } from 'sonner'
import ResponsiveBarChart from './charts/BarChart'
import ResponsiveDonutChart from './charts/DonutChart'
import { Fuel, Clock, Gauge, TrendingUp, DollarSign, Download, Loader2 } from 'lucide-react'
import { svgToPngDataUrl, addPdfFooters } from '@/lib/pdf/chartExporter'

interface LogbookAnalyticsProps {
  logs: any[]
  dict: any
  dateFrom?: string
  dateTo?: string
  selectedMachineName?: string
  machineType?: 'all' | 'owned' | 'rented'
}

export default function LogbookAnalytics({ 
  logs, 
  dict,
  dateFrom,
  dateTo,
  selectedMachineName = 'Toda la maquinaria',
  machineType = 'all'
}: LogbookAnalyticsProps) {
  const [viewMode, setViewMode] = useState<'liters' | 'mxn'>('liters')
  const [isExportingPdf, setIsExportingPdf] = useState(false)

  const fuelChartRef = useRef<HTMLDivElement>(null)
  const projectChartRef = useRef<HTMLDivElement>(null)
  const hoursChartRef = useRef<HTMLDivElement>(null)
  const efficiencyChartRef = useRef<HTMLDivElement>(null)

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

  const handleExportPdf = async () => {
    if (!analyticsData) return
    setIsExportingPdf(true)

    try {
      const { jsPDF } = await import('jspdf/dist/jspdf.es.min.js') as any
      const doc = new jsPDF('p', 'mm', 'a4')
      const pageWidth = doc.internal.pageSize.getWidth()

      // Header Banner
      doc.setFillColor(37, 99, 235) // Primary Blue
      doc.rect(0, 0, pageWidth, 24, 'F')

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Reporte Visual de Analytics y Logbook', 14, 16)

      // Metadata card
      doc.setTextColor(50, 50, 50)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')

      const typeLabel = machineType === 'all' ? 'Todas' : machineType === 'owned' ? 'Propias' : 'Rentadas'
      const rangeText = dateFrom && dateTo ? `${dateFrom} al ${dateTo}` : 'Periodo actual'

      doc.setFillColor(248, 250, 252)
      doc.roundedRect(14, 30, pageWidth - 28, 20, 2, 2, 'F')

      doc.setFont('helvetica', 'bold')
      doc.text(`Periodo:`, 18, 38)
      doc.setFont('helvetica', 'normal')
      doc.text(rangeText, 35, 38)

      doc.setFont('helvetica', 'bold')
      doc.text(`Maquinaria:`, 95, 38)
      doc.setFont('helvetica', 'normal')
      doc.text(selectedMachineName, 118, 38)

      doc.setFont('helvetica', 'bold')
      doc.text(`Tipo:`, 18, 45)
      doc.setFont('helvetica', 'normal')
      doc.text(typeLabel, 35, 45)

      doc.setFont('helvetica', 'bold')
      doc.text(`Modo de vista:`, 95, 45)
      doc.setFont('helvetica', 'normal')
      doc.text(viewMode === 'liters' ? 'Litros (Volumen)' : 'MXN (Costo)', 118, 45)

      // Summary KPIs Box
      let currentY = 56
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 41, 59)
      doc.text('Resumen General de Métricas', 14, currentY)

      currentY += 4
      const cardWidth = (pageWidth - 28 - 12) / 3

      // KPI 1: Liters
      doc.setFillColor(239, 246, 255)
      doc.roundedRect(14, currentY, cardWidth, 18, 2, 2, 'F')
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      doc.text('TOTAL CONSUMO', 18, currentY + 6)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(29, 78, 216)
      doc.text(`${analyticsData.totals.liters.toFixed(2)} L`, 18, currentY + 13)

      // KPI 2: MXN
      doc.setFillColor(240, 253, 244)
      doc.roundedRect(14 + cardWidth + 6, currentY, cardWidth, 18, 2, 2, 'F')
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 116, 139)
      doc.text('GASTO TOTAL', 18 + cardWidth + 6, currentY + 6)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(21, 128, 61)
      doc.text(`$${analyticsData.totals.cost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 18 + cardWidth + 6, currentY + 13)

      // KPI 3: Hours
      doc.setFillColor(255, 247, 237)
      doc.roundedRect(14 + (cardWidth + 6) * 2, currentY, cardWidth, 18, 2, 2, 'F')
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 116, 139)
      doc.text('UTILIZACIÓN TOTAL', 18 + (cardWidth + 6) * 2, currentY + 6)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(194, 65, 12)
      doc.text(`${analyticsData.totals.hours.toFixed(1)} h`, 18 + (cardWidth + 6) * 2, currentY + 13)

      // Section 1: Consumo y Gastos Charts
      currentY += 26
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 41, 59)
      doc.text(`Consumo y Gastos (${viewMode === 'liters' ? 'Litros' : 'MXN'})`, 14, currentY)

      currentY += 4
      const chartW = (pageWidth - 34) / 2
      const chartH = 68

      // Capture Fuel Chart
      const fuelSvg = fuelChartRef.current?.querySelector('svg')
      if (fuelSvg) {
        const pngUrl = await svgToPngDataUrl(fuelSvg as SVGSVGElement, 2)
        doc.setFontSize(8)
        doc.setTextColor(100, 100, 100)
        doc.text(dict.analytics?.kpi_fuel_machine || 'Consumo por Máquina', 14, currentY + 4)
        doc.addImage(pngUrl, 'PNG', 14, currentY + 6, chartW, chartH)
      }

      // Capture Project Chart
      const projectSvg = projectChartRef.current?.querySelector('svg')
      if (projectSvg) {
        const pngUrl = await svgToPngDataUrl(projectSvg as SVGSVGElement, 2)
        doc.setFontSize(8)
        doc.setTextColor(100, 100, 100)
        doc.text(dict.analytics?.kpi_fuel_project || 'Consumo por Proyecto', 14 + chartW + 6, currentY + 4)
        doc.addImage(pngUrl, 'PNG', 14 + chartW + 6, currentY + 6, chartW, chartH)
      }

      // PAGE 2: Performance & Utilization
      doc.addPage()
      let p2Y = 20
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 41, 59)
      doc.text('Utilización y Rendimiento Operativo', 14, p2Y)

      p2Y += 10
      const hoursSvg = hoursChartRef.current?.querySelector('svg')
      if (hoursSvg) {
        const pngUrl = await svgToPngDataUrl(hoursSvg as SVGSVGElement, 2)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(71, 85, 105)
        doc.text(dict.analytics?.kpi_utilization || 'Horas Trabajadas por Máquina', 14, p2Y)
        doc.addImage(pngUrl, 'PNG', 14, p2Y + 4, pageWidth - 28, 85)
      }

      p2Y += 98
      const effSvg = efficiencyChartRef.current?.querySelector('svg')
      if (effSvg) {
        const pngUrl = await svgToPngDataUrl(effSvg as SVGSVGElement, 2)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(71, 85, 105)
        doc.text(dict.analytics?.kpi_efficiency || 'Rendimiento Promedio (L/h)', 14, p2Y)
        doc.addImage(pngUrl, 'PNG', 14, p2Y + 4, pageWidth - 28, 85)
      }

      addPdfFooters(doc, 'Hivaco Logbook - Reporte Visual Analytics')
      const fileName = `Reporte_Analytics_${dateFrom || 'General'}_a_${dateTo || 'General'}.pdf`
      doc.save(fileName)
      toast.success('Reporte PDF descargado con éxito')
    } catch (error) {
      console.error('Error al generar PDF:', error)
      toast.error('No se pudo generar el reporte PDF')
    } finally {
      setIsExportingPdf(false)
    }
  }

  if (!analyticsData) {
    return (
      <div className="bg-white p-12 rounded-xl border border-gray-100 text-center space-y-4">
        <TrendingUp size={48} className="mx-auto text-gray-300" />
        <p className="text-gray-500 font-medium">{dict.analytics?.no_data}</p>
      </div>
    )
  }

  const currentFuelData = viewMode === 'liters' ? analyticsData.fuelPerMachine : analyticsData.costPerMachine
  const currentProjectData = viewMode === 'liters' ? analyticsData.fuelPerProject : analyticsData.costPerProject

  return (
    <div className="space-y-8">
      {/* Export Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <h3 className="font-bold text-gray-900">Dashboard de Análisis Operativo</h3>
          <p className="text-xs text-gray-500">Visualización de consumo, costos y eficiencia de maquinaria.</p>
        </div>
        <button
          onClick={handleExportPdf}
          disabled={isExportingPdf}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:bg-gray-300 shadow-sm transition-all"
        >
          {isExportingPdf ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Generando Reporte PDF...
            </>
          ) : (
            <>
              <Download size={18} />
              Exportar Reporte PDF
            </>
          )}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <Fuel size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{dict.analytics?.total_liters}</p>
            <p className="text-2xl font-bold text-gray-900">{analyticsData.totals.liters.toFixed(2)} L</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{dict.analytics?.total_mxn}</p>
            <p className="text-2xl font-bold text-gray-900">${analyticsData.totals.cost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{dict.analytics?.kpi_utilization}</p>
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
          <div ref={fuelChartRef} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4 h-80">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm uppercase tracking-wider text-gray-500">
              {dict.analytics?.kpi_fuel_machine}
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
          <div ref={projectChartRef} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4 h-80">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm uppercase tracking-wider text-gray-500">
              {dict.analytics?.kpi_fuel_project}
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
          <div ref={hoursChartRef} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4 h-80">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm uppercase tracking-wider text-gray-500">
              {dict.analytics?.kpi_utilization}
            </h3>
            <div className="h-[calc(100%-2rem)]">
              <ResponsiveBarChart data={analyticsData.hoursPerMachine} color="#f97316" yAxisLabel="Horas" />
            </div>
          </div>

          {/* Efficiency per Machine */}
          <div ref={efficiencyChartRef} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4 h-80">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm uppercase tracking-wider text-gray-500">
              {dict.analytics?.kpi_efficiency}
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
