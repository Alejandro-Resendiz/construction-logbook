'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Download, Search, ChevronDown, Check, Layers, ListFilter } from 'lucide-react'
import { startOfWeek, format } from 'date-fns'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { toast } from 'sonner'
import LogbookAnalytics from './LogbookAnalytics'
import { DEFAULT_DIESEL_PRICE } from '@/lib/constants'

interface AppDashboardClientProps {
  machinery: any[]
  projects?: any[]
  dict: any
  common: any
}

export default function AppDashboardClient({ machinery, projects, dict, common }: AppDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<'table' | 'analytics'>('table')
  const [viewMode, setViewMode] = useState<'aggregated' | 'detailed'>('aggregated')
  const [selectedProject, setSelectedProject] = useState('')
  const [projectList, setProjectList] = useState<any[]>(projects || [])
  
  // Multiselect machines: defaults to all machines selected
  const [selectedMachines, setSelectedMachines] = useState<string[]>(() => 
    machinery.map(m => m.machinery_id.toString())
  )
  const [isMachineDropdownOpen, setIsMachineDropdownOpen] = useState(false)
  const [machineSearch, setMachineSearch] = useState('')
  const machineDropdownRef = useRef<HTMLDivElement>(null)

  const [machineType, setMachineType] = useState<'all' | 'owned' | 'rented'>('all')
  const [dateFrom, setDateFrom] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const today = format(new Date(), 'yyyy-MM-dd')

  // Close multiselect on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (machineDropdownRef.current && !machineDropdownRef.current.contains(event.target as Node)) {
        setIsMachineDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (projects && projects.length > 0) {
      setProjectList(projects)
    } else {
      supabase.from('projects').select('project_id, project_name').order('project_name', { ascending: true }).then(({ data }) => {
        if (data) setProjectList(data)
      })
    }
  }, [projects])

  // Filter machines by active machineType filter (owned / rented / all)
  const availableMachinery = useMemo(() => {
    let list = machinery || []
    if (machineType === 'owned') return list.filter(m => !m.is_rented)
    if (machineType === 'rented') return list.filter(m => m.is_rented)
    return list
  }, [machinery, machineType])

  // Machines visible in the dropdown filtered by user search
  const visibleMachinery = useMemo(() => {
    if (!machineSearch.trim()) return availableMachinery
    const q = machineSearch.toLowerCase()
    return availableMachinery.filter(m => 
      m.machinery_full_name?.toLowerCase().includes(q) ||
      m.external_code?.toLowerCase().includes(q) ||
      m.machinery_name?.toLowerCase().includes(q)
    )
  }, [availableMachinery, machineSearch])

  const isAllSelected = useMemo(() => {
    if (availableMachinery.length === 0) return false
    return availableMachinery.every(m => selectedMachines.includes(m.machinery_id.toString()))
  }, [availableMachinery, selectedMachines])

  const toggleSelectAll = () => {
    if (isAllSelected) {
      // Remove all current available machines from selection
      const availableIds = new Set(availableMachinery.map(m => m.machinery_id.toString()))
      setSelectedMachines(prev => prev.filter(id => !availableIds.has(id)))
    } else {
      // Add all available machines to selection
      const availableIds = availableMachinery.map(m => m.machinery_id.toString())
      const combined = Array.from(new Set([...selectedMachines, ...availableIds]))
      setSelectedMachines(combined)
    }
  }

  const toggleMachine = (id: string) => {
    if (selectedMachines.includes(id)) {
      setSelectedMachines(prev => prev.filter(mId => mId !== id))
    } else {
      setSelectedMachines(prev => [...prev, id])
    }
  }

  const machineSelectorLabel = useMemo(() => {
    if (availableMachinery.length === 0) return 'Sin maquinaria disponible'
    if (selectedMachines.length === 0) return 'Ninguna máquina seleccionada'
    if (isAllSelected) return `Todas las máquinas (${availableMachinery.length})`
    if (selectedMachines.length === 1) {
      const match = machinery.find(m => m.machinery_id.toString() === selectedMachines[0])
      return match ? match.machinery_full_name : '1 máquina seleccionada'
    }
    return `${selectedMachines.length} máquinas seleccionadas`
  }, [availableMachinery, selectedMachines, isAllSelected, machinery])

  const fetchLogs = async () => {
    // If no machines selected and no project selected, don't execute full scan
    if (selectedMachines.length === 0 && !selectedProject) {
      setLogs([])
      return
    }
    
    setLoading(true)
    let query = supabase
      .from('machinery_logs')
      .select(`
        *,
        projects(project_name),
        machinery(machinery_name, machinery_full_name, external_code, is_rented, machine_type, expected_consumption_rate)
      `)
      .gte('date', dateFrom)
      .lte('date', dateTo)

    // Filter by machines if a specific subset is selected
    if (selectedMachines.length > 0 && selectedMachines.length < machinery.length) {
      query = query.in('machine_id', selectedMachines)
    }

    if (selectedProject) {
      query = query.eq('project_id', selectedProject)
    }

    const { data, error } = await query.order('date', { ascending: true })

    if (error) {
      console.error(error)
      setLogs([])
    } else {
      // Client-side filter for machine type (is_rented)
      let filteredData = data || []
      if (machineType === 'owned') {
        filteredData = filteredData.filter(log => !log.machinery?.is_rented)
      } else if (machineType === 'rented') {
        filteredData = filteredData.filter(log => log.machinery?.is_rented)
      }
      setLogs(filteredData)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchLogs()
  }, [selectedMachines, selectedProject, dateFrom, dateTo, machineType, activeTab])

  // Validation: Prevent future dates and enforce valid range
  const handleDateChange = (type: 'from' | 'to', value: string) => {
    if (!value) return

    if (value > today) {
      toast.error(common.notifications?.future_date_error || 'No se pueden seleccionar fechas futuras.')
      return
    }

    if (type === 'from') {
      if (dateTo && value > dateTo) {
        toast.error(common.notifications?.invalid_range_error || 'La fecha de inicio no puede ser posterior a la fecha de fin.')
        return
      }
      setDateFrom(value)
    } else {
      if (dateFrom && value < dateFrom) {
        toast.error(common.notifications?.invalid_range_error || 'La fecha de fin no puede ser anterior a la fecha de inicio.')
        return
      }
      setDateTo(value)
    }
  }

  const nonZeroPrices = logs.filter(l => Number(l.fuel_price) > 0).map(l => Number(l.fuel_price))
  const calculatedAvgPrice = nonZeroPrices.length > 0 ? nonZeroPrices.reduce((a, b) => a + b, 0) / nonZeroPrices.length : DEFAULT_DIESEL_PRICE
  const fallbackPrice = Number(calculatedAvgPrice.toFixed(2))

  // Helper to calculate hours for truck shifts
  const calculateHours = (start?: string, end?: string) => {
    if (!start || !end) return 0
    const [sH, sM] = start.split(':').map(Number)
    const [eH, eM] = end.split(':').map(Number)
    const startMin = sH * 60 + sM
    const endMin = eH * 60 + eM
    const diffMin = endMin >= startMin ? endMin - startMin : (24 * 60 - startMin) + endMin
    return Number((diffMin / 60).toFixed(2))
  }

  // Machine-Level Aggregation computations
  const { aggregatedData, totals } = useMemo(() => {
    if (!logs || logs.length === 0) {
      return {
        aggregatedData: [],
        totals: {
          totalMachines: 0,
          totalShifts: 0,
          totalHours: 0,
          totalLiters: 0,
          totalCost: 0,
          avgRate: 0
        }
      }
    }

    const map = new Map<number, {
      machine_id: number
      machine_name: string
      machine_full_name: string
      external_code: string
      machine_type: string
      is_rented: boolean
      shift_count: number
      total_hours: number
      total_liters: number
      total_cost: number
      avg_rate: number
    }>()

    logs.forEach(log => {
      const mId = log.machine_id
      const isMachine = log.machinery?.machine_type !== 'truck'
      const rate = Number(log.machinery?.expected_consumption_rate) || 0
      const hours = log.effective_hours != null
        ? Number(log.effective_hours)
        : isMachine && rate > 0 && log.fuel_liters
          ? Number((log.fuel_liters / rate).toFixed(2))
          : calculateHours(log.start_time, log.end_time)
      const cost = (log.fuel_liters || 0) * (log.fuel_price ? Number(log.fuel_price) : fallbackPrice)

      const existing = map.get(mId)
      if (existing) {
        existing.shift_count += 1
        existing.total_hours += hours
        existing.total_liters += log.fuel_liters || 0
        existing.total_cost += cost
      } else {
        map.set(mId, {
          machine_id: mId,
          machine_name: log.machinery?.machinery_name || `M-${mId}`,
          machine_full_name: log.machinery?.machinery_full_name || `Máquina ${mId}`,
          external_code: log.machinery?.external_code || '-',
          machine_type: log.machinery?.machine_type || 'machine',
          is_rented: Boolean(log.machinery?.is_rented),
          shift_count: 1,
          total_hours: hours,
          total_liters: log.fuel_liters || 0,
          total_cost: cost,
          avg_rate: 0
        })
      }
    })

    const rows = Array.from(map.values()).map(r => ({
      ...r,
      total_hours: Number(r.total_hours.toFixed(2)),
      total_liters: Number(r.total_liters.toFixed(2)),
      total_cost: Number(r.total_cost.toFixed(2)),
      avg_rate: r.total_hours > 0 ? Number((r.total_liters / r.total_hours).toFixed(2)) : 0
    })).sort((a, b) => b.total_liters - a.total_liters)

    const sumShifts = rows.reduce((acc, r) => acc + r.shift_count, 0)
    const sumHours = rows.reduce((acc, r) => acc + r.total_hours, 0)
    const sumLiters = rows.reduce((acc, r) => acc + r.total_liters, 0)
    const sumCost = rows.reduce((acc, r) => acc + r.total_cost, 0)
    const overallRate = sumHours > 0 ? Number((sumLiters / sumHours).toFixed(2)) : 0

    return {
      aggregatedData: rows,
      totals: {
        totalMachines: rows.length,
        totalShifts: sumShifts,
        totalHours: Number(sumHours.toFixed(2)),
        totalLiters: Number(sumLiters.toFixed(2)),
        totalCost: Number(sumCost.toFixed(2)),
        avgRate: overallRate
      }
    }
  }, [logs, fallbackPrice])

  const exportPDF = async () => {
    const { jsPDF } = await import('jspdf/dist/jspdf.es.min.js') as any
    const autoTableModule = await import('jspdf-autotable')
    const autoTable = autoTableModule.default || autoTableModule

    const doc = new jsPDF()
    const projName = projectList.find(p => p.project_id.toString() === selectedProject)?.project_name || 'Todos los proyectos'

    if (viewMode === 'aggregated') {
      // Header
      doc.setFontSize(18)
      doc.text('Reporte Agrupado de Maquinaria', 14, 15)
      
      doc.setFontSize(10)
      doc.text(`Proyecto: ${projName}  |  Periodo: ${dateFrom} al ${dateTo}`, 14, 22)
      
      const tableColumn = [
        'Código',
        'Maquinaria',
        'Tipo',
        'Turnos',
        'Horas (h)',
        'Diesel (L)',
        'Gasto ($ MXN)',
        'Rendimiento (L/h)'
      ]

      const tableRows: any[] = aggregatedData.map(r => [
        r.external_code,
        r.machine_full_name,
        r.machine_type === 'truck' ? 'Camión' : 'Máquina',
        r.shift_count.toString(),
        r.total_hours.toFixed(1),
        r.total_liters.toFixed(2),
        `$${r.total_cost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
        r.avg_rate > 0 ? r.avg_rate.toFixed(1) : '-'
      ])

      // Totals row
      tableRows.push([
        'TOTALES',
        `${totals.totalMachines} equipos`,
        '-',
        totals.totalShifts.toString(),
        totals.totalHours.toFixed(1),
        totals.totalLiters.toFixed(2),
        `$${totals.totalCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
        totals.avgRate > 0 ? totals.avgRate.toFixed(1) : '-'
      ])

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 28,
        theme: 'grid',
        headStyles: { fillColor: '#2563EB', textColor: 255 },
        styles: { fontSize: 8 },
        didParseCell: function(data: any) {
          if (data.row.index === tableRows.length - 1) {
            data.cell.styles.fontStyle = 'bold'
            data.cell.styles.fillColor = [241, 245, 249]
          }
        }
      })

      const fileName = `Reporte_Agrupado_${dateFrom}_a_${dateTo}.pdf`
      doc.save(fileName)
    } else {
      // Detailed View PDF Export
      const machineSubtitle = selectedMachines.length === 1 
        ? machinery.find(m => m.machinery_id.toString() === selectedMachines[0])?.machinery_full_name 
        : `${selectedMachines.length} máquinas`

      doc.setFontSize(18)
      doc.text(dict.pdf.report_title, 14, 15)
      
      doc.setFontSize(11)
      doc.text(`${dict.pdf.machine_subtitle}: ${machineSubtitle}  |  Proyecto: ${projName}`, 14, 22)
      
      const tableColumn = [
        dict.columns.date,
        dict.columns.operator,
        dict.columns.project,
        dict.columns.start,
        dict.columns.end,
        dict.columns.fuel,
        dict.columns.fuel_price,
        dict.columns.observations,
        dict.columns.signature
      ]
      
      let usedFallbackInPdf = false

      const tableRows = logs.map(log => {
        let priceStr = '-'
        if (log.fuel_price) {
          priceStr = `$${Number(log.fuel_price).toFixed(2)}`
        } else {
          usedFallbackInPdf = true
          priceStr = `$${fallbackPrice.toFixed(2)} (Est.)`
        }
        return [
          log.date,
          log.operator_name,
          log.projects?.project_name,
          log.start_time || '-',
          log.end_time || '-',
          log.fuel_liters,
          priceStr,
          log.observations || '',
          '' // Empty for signature
        ]
      })

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 30,
        theme: 'grid',
        headStyles: { fillColor: '#FFC500', textColor: 0 },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 18 },
          1: { overflow: 'linebreak' },
          2: { overflow: 'linebreak' },
          3: { cellWidth: 15 },
          4: { cellWidth: 15 },
          5: { cellWidth: 20 },
          6: { cellWidth: 20 },
          7: { overflow: 'linebreak' },
          8: { cellWidth: 22 }
        }
      })

      // @ts-ignore
      const finalY = doc.lastAutoTable.finalY + 25
      
      const line1Start = 20
      const line1End = 80
      const line1Center = line1Start + (line1End - line1Start) / 2
      doc.line(line1Start, finalY, line1End, finalY)
      doc.setFontSize(8)
      doc.text(dict.signatures.operator, line1Center, finalY + 5, { align: 'center' })
      
      const line2Start = 120
      const line2End = 180
      const line2Center = line2Start + (line2End - line2Start) / 2
      doc.line(line2Start, finalY, line2End, finalY)
      doc.text(dict.signatures.admin, line2Center, finalY + 5, { align: 'center' })

      if (usedFallbackInPdf) {
        doc.setFontSize(7)
        doc.setTextColor(180, 83, 9)
        doc.text('* (Est.) Indica precio de referencia sugerido para registros sin costo de origen.', 14, finalY + 14)
      }

      const fileName = `Reporte_Detallado_${dateFrom}_a_${dateTo}.pdf`
      doc.save(fileName)
    }
  }

  const exportExcel = async () => {
    const projName = projectList.find(p => p.project_id.toString() === selectedProject)?.project_name || 'Todos los proyectos'

    if (viewMode === 'aggregated') {
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Resumen Agrupado')
      
      worksheet.addRow(['REPORTE AGRUPADO POR MAQUINARIA'])
      worksheet.addRow([`Proyecto: ${projName}`, `Periodo: ${dateFrom} al ${dateTo}`])
      worksheet.addRow([])

      const headerRow = worksheet.addRow(['Código', 'Maquinaria', 'Tipo', 'Turnos', 'Horas Totales', 'Combustible (L)', 'Costo Total ($ MXN)', 'Rendimiento (L/h)'])
      headerRow.font = { bold: true }
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2E8F0' }
      }

      aggregatedData.forEach(r => {
        worksheet.addRow([
          r.external_code,
          r.machine_full_name,
          r.machine_type === 'truck' ? 'Camión' : 'Máquina',
          r.shift_count,
          r.total_hours,
          r.total_liters,
          r.total_cost,
          r.avg_rate
        ])
      })

      const totalRow = worksheet.addRow([
        'TOTALES',
        `${totals.totalMachines} equipos`,
        '-',
        totals.totalShifts,
        totals.totalHours,
        totals.totalLiters,
        totals.totalCost,
        totals.avgRate
      ])
      totalRow.font = { bold: true }

      worksheet.columns.forEach(col => {
        col.width = 18
      })

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const fileName = `Reporte_Agrupado_${dateFrom}_a_${dateTo}.xlsx`
      saveAs(blob, fileName)
    } else {
      // Detailed View Excel Export using template
      const machineName = selectedMachines.length === 1 
        ? machinery.find(m => m.machinery_id.toString() === selectedMachines[0])?.machinery_full_name 
        : 'Múltiple maquinaria'

      const response = await fetch('/templates/logbook_template.xlsx')
      const arrayBuffer = await response.arrayBuffer()
      
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(arrayBuffer)
      
      const worksheet = workbook.getWorksheet(1)
      if (!worksheet) return

      worksheet.getCell('C4').value = machineName
      worksheet.getCell('B2').value = format(new Date(dateFrom), 'dd/MM/yyyy')
      worksheet.getCell('F2').value = format(new Date(dateTo), 'dd/MM/yyyy')

      const templateRow = worksheet.getRow(6)

      logs.forEach((log, index) => {
        const rowIndex = 6 + index
        const currentRow = worksheet.getRow(rowIndex)
        
        const rowData = [
          log.date,
          log.operator_name,
          log.projects?.project_name,
          log.start_time || '-',
          log.end_time || '-',
          log.fuel_liters,
          log.fuel_price || '-',
          log.observations || ''
        ]

        rowData.forEach((value, colIndex) => {
          const colNumber = colIndex + 1
          const targetCell = currentRow.getCell(colNumber)
          const sourceCell = templateRow.getCell(colNumber)

          targetCell.value = value
          targetCell.style = { ...sourceCell.style }
        })
        
        currentRow.commit()
      })

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const fileName = `Reporte_Detallado_${dateFrom}_a_${dateTo}.xlsx`
      saveAs(blob, fileName)
    }
  }

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('table')}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${
            activeTab === 'table' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {dict.analytics.table_tab}
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${
            activeTab === 'analytics' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {dict.analytics.analytics_tab}
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Col 1: Project Selector (SWAPPED FIRST) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{dict.select_project || 'Filtrar por Proyecto'}</label>
            <select 
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
            >
              <option value="">Todos los proyectos</option>
              {projectList.map(p => (
                <option key={p.project_id} value={p.project_id}>
                  {p.project_name}
                </option>
              ))}
            </select>
          </div>

          {/* Col 2: Machine Multiselect Dropdown (SWAPPED SECOND) */}
          <div className="relative" ref={machineDropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{dict.select_machine || 'Filtrar por Maquinaria'}</label>
            <button
              type="button"
              onClick={() => setIsMachineDropdownOpen(prev => !prev)}
              className="w-full flex items-center justify-between p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white text-left text-sm"
            >
              <span className="truncate pr-2">{machineSelectorLabel}</span>
              <ChevronDown size={16} className={`text-gray-400 transition-transform ${isMachineDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Popover */}
            {isMachineDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-xl p-3 space-y-2">
                {/* Header Action: Select All / Clear */}
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span>{isAllSelected ? 'Deseleccionar todas' : 'Seleccionar todas'}</span>
                  </label>
                  <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    {selectedMachines.length} de {availableMachinery.length}
                  </span>
                </div>

                {/* Search Bar */}
                <input
                  type="text"
                  placeholder="Buscar por código o nombre..."
                  value={machineSearch}
                  onChange={(e) => setMachineSearch(e.target.value)}
                  className="w-full p-2 text-xs border border-gray-200 rounded-md outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />

                {/* Machines List */}
                <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                  {visibleMachinery.length === 0 ? (
                    <div className="p-3 text-center text-xs text-gray-400">No se encontraron máquinas</div>
                  ) : (
                    visibleMachinery.map(m => {
                      const idStr = m.machinery_id.toString()
                      const isChecked = selectedMachines.includes(idStr)
                      return (
                        <label 
                          key={m.machinery_id} 
                          className={`flex items-center gap-2 p-2 hover:bg-gray-50 rounded-md cursor-pointer text-xs transition-colors ${
                            isChecked ? 'bg-blue-50/50' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleMachine(idStr)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                          />
                          <span className="font-mono font-bold text-gray-700">{m.external_code}</span>
                          <span className="truncate flex-1 text-gray-800">{m.machinery_full_name}</span>
                          <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                            m.machine_type === 'truck' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {m.machine_type === 'truck' ? 'Camión' : 'Máquina'}
                          </span>
                          {m.is_rented && (
                            <span className="px-1 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded">
                              R
                            </span>
                          )}
                        </label>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Col 3: Machine Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{dict.analytics.machinery_type}</label>
            <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-200">
              <button
                onClick={() => setMachineType('all')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                  machineType === 'all' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'
                }`}
              >
                {common.all}
              </button>
              <button
                onClick={() => setMachineType('owned')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                  machineType === 'owned' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'
                }`}
              >
                {dict.analytics.owned_only}
              </button>
              <button
                onClick={() => setMachineType('rented')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                  machineType === 'rented' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'
                }`}
              >
                {dict.analytics.rented_only}
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Date range, View Mode Toggle, and Export Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end pt-2">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Desde</label>
            <input 
              type="date" value={dateFrom} max={today}
              onChange={(e) => handleDateChange('from', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hasta</label>
            <input 
              type="date" value={dateTo} max={today}
              onChange={(e) => handleDateChange('to', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          
          {activeTab === 'table' && (
            <div className="md:col-span-2 flex gap-2">
              <button 
                onClick={exportPDF}
                disabled={logs.length === 0}
                className="flex items-center justify-center gap-2 flex-1 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 transition-colors shadow-sm"
              >
                <Download size={18} />
                {dict.export_pdf}
              </button>
              <button 
                onClick={exportExcel}
                disabled={logs.length === 0}
                className="flex items-center justify-center gap-2 flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 transition-colors shadow-sm"
              >
                <Search size={18} />
                {dict.export_excel || 'Exportar Excel'}
              </button>
            </div>
          )}
        </div>
      </div>

      {activeTab === 'table' ? (
        <div className="space-y-3">
          {/* View Mode Toggle: Aggregated vs Detailed */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Modo de Tabla:</span>
              <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                <button
                  onClick={() => setViewMode('aggregated')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    viewMode === 'aggregated' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Layers size={14} />
                  Agrupado por Máquina
                </button>
                <button
                  onClick={() => setViewMode('detailed')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    viewMode === 'detailed' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <ListFilter size={14} />
                  Detalle de Registros
                </button>
              </div>
            </div>

            <span className="text-xs text-gray-500 font-medium">
              {viewMode === 'aggregated' 
                ? `${aggregatedData.length} ${aggregatedData.length === 1 ? 'máquina' : 'máquinas'}` 
                : `${logs.length} ${logs.length === 1 ? 'registro' : 'registros'}`}
            </span>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
            {viewMode === 'aggregated' ? (
              /* AGGREGATED VIEW (DEFAULT) */
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-900 text-xs uppercase tracking-wider">
                    <th className="p-4 font-bold">Código</th>
                    <th className="p-4 font-bold">Maquinaria</th>
                    <th className="p-4 font-bold">Tipo</th>
                    <th className="p-4 font-bold text-center">Turnos</th>
                    <th className="p-4 font-bold text-right">Horas Operativas</th>
                    <th className="p-4 font-bold text-right">Consumo Diesel (L)</th>
                    <th className="p-4 font-bold text-right">Gasto Total ($ MXN)</th>
                    <th className="p-4 font-bold text-right">Rendimiento Promedio</th>
                  </tr>
                </thead>
                <tbody className="text-gray-900">
                  {loading ? (
                    <tr><td colSpan={8} className="p-8 text-center text-gray-500">{dict.loading}</td></tr>
                  ) : aggregatedData.length === 0 ? (
                    <tr><td colSpan={8} className="p-8 text-center text-gray-500">{dict.no_logs}</td></tr>
                  ) : (
                    aggregatedData.map(row => (
                      <tr key={row.machine_id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="p-4 text-sm font-mono font-bold text-gray-800">{row.external_code}</td>
                        <td className="p-4 text-sm font-medium">
                          {row.machine_full_name}
                          {row.is_rented && (
                            <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded">
                              Rentada
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-sm">
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                            row.machine_type === 'truck' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {row.machine_type === 'truck' ? 'Camión' : 'Máquina'}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-center font-mono">{row.shift_count}</td>
                        <td className="p-4 text-sm text-right font-mono">{row.total_hours.toFixed(1)} h</td>
                        <td className="p-4 text-sm text-right font-mono font-semibold text-blue-900">
                          {row.total_liters.toLocaleString('es-MX', { minimumFractionDigits: 2 })} L
                        </td>
                        <td className="p-4 text-sm text-right font-mono font-bold text-green-700">
                          ${row.total_cost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-sm text-right font-mono text-gray-600">
                          {row.avg_rate > 0 ? `${row.avg_rate.toFixed(1)} L/h` : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {aggregatedData.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-100 font-bold border-t-2 border-gray-300 text-gray-900">
                      <td className="p-4 text-sm font-bold uppercase tracking-wider" colSpan={3}>
                        TOTALES ({totals.totalMachines} {totals.totalMachines === 1 ? 'máquina' : 'máquinas'})
                      </td>
                      <td className="p-4 text-sm text-center font-mono font-bold text-gray-900">{totals.totalShifts}</td>
                      <td className="p-4 text-sm text-right font-mono font-bold text-orange-900">{totals.totalHours.toFixed(1)} h</td>
                      <td className="p-4 text-sm text-right font-mono font-bold text-blue-900">
                        {totals.totalLiters.toLocaleString('es-MX', { minimumFractionDigits: 2 })} L
                      </td>
                      <td className="p-4 text-sm text-right font-mono font-bold text-green-800">
                        ${totals.totalCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-sm text-right font-mono font-bold text-gray-900">
                        {totals.avgRate > 0 ? `${totals.avgRate.toFixed(1)} L/h` : '-'}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            ) : (
              /* DETAILED VIEW (RAW SHIFT RECORDS) */
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-900 text-xs uppercase tracking-wider">
                    <th className="p-4 font-bold">{dict.columns.date}</th>
                    <th className="p-4 font-bold">{dict.columns.operator}</th>
                    <th className="p-4 font-bold">{dict.columns.project}</th>
                    <th className="p-4 font-bold">{dict.columns.start}</th>
                    <th className="p-4 font-bold">{dict.columns.end}</th>
                    <th className="p-4 font-bold text-right">{dict.columns.fuel}</th>
                    <th className="p-4 font-bold text-right">{dict.columns.fuel_price}</th>
                    <th className="p-4 font-bold">{dict.columns.observations}</th>
                  </tr>
                </thead>
                <tbody className="text-gray-900">
                  {loading ? (
                    <tr><td colSpan={8} className="p-8 text-center text-gray-500">{dict.loading}</td></tr>
                  ) : logs.length === 0 ? (
                    <tr><td colSpan={8} className="p-8 text-center text-gray-500">{dict.no_logs}</td></tr>
                  ) : (
                    logs.map(log => (
                      <tr key={log.machinery_log_id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="p-4 text-sm">{log.date}</td>
                        <td className="p-4 text-sm font-medium">{log.operator_name}</td>
                        <td className="p-4 text-sm">{log.projects?.project_name}</td>
                        <td className="p-4 text-sm font-mono">{log.start_time || '-'}</td>
                        <td className="p-4 text-sm font-mono">{log.end_time || '-'}</td>
                        <td className="p-4 text-sm text-right font-mono font-semibold text-blue-900">
                          {Number(log.fuel_liters).toFixed(2)} L
                        </td>
                        <td className="p-4 text-sm text-right font-mono font-bold">
                          {log.fuel_price ? (
                            `$${Number(log.fuel_price).toFixed(2)}`
                          ) : (
                            <span className="inline-flex items-center gap-1.5" title="Precio estimado de referencia">
                              <span className="text-gray-700">${fallbackPrice.toFixed(2)}</span>
                              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded">Est.</span>
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-sm text-gray-700 italic max-w-xs truncate">{log.observations}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {logs.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-100 font-bold border-t-2 border-gray-300 text-gray-900">
                      <td className="p-4 text-sm font-bold uppercase tracking-wider" colSpan={5}>
                        TOTALES ({logs.length} registros)
                      </td>
                      <td className="p-4 text-sm text-right font-mono font-bold text-blue-900">
                        {totals.totalLiters.toLocaleString('es-MX', { minimumFractionDigits: 2 })} L
                      </td>
                      <td className="p-4 text-sm text-right font-mono font-bold text-green-800">
                        ${totals.totalCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </div>
        </div>
      ) : (
        <LogbookAnalytics 
          logs={logs} 
          dict={dict} 
          dateFrom={dateFrom} 
          dateTo={dateTo} 
          selectedMachineName={
            selectedMachines.length === 0 || selectedMachines.length === machinery.length
              ? 'Toda la maquinaria'
              : selectedMachines.length === 1
              ? machinery.find(m => m.machinery_id.toString() === selectedMachines[0])?.machinery_full_name || '1 máquina'
              : `${selectedMachines.length} máquinas seleccionadas`
          }
          selectedProjectName={projectList.find(p => p.project_id.toString() === selectedProject)?.project_name}
          machineType={machineType}
        />
      )}
    </div>
  )
}
