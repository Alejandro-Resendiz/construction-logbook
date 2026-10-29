'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  Search,
  ChevronDown,
  ChevronRight,
  Edit2,
  Paperclip,
  ExternalLink,
  FileText,
  Loader2,
  DollarSign,
  Building2,
  Layers,
  ListFilter,
  Clock,
  Wrench,
} from 'lucide-react'
import { updateMaintenanceStatus } from '@/app/app/maintenance/actions'
import { toast } from 'sonner'
import Link from 'next/link'
import { addPdfFooters } from '@/lib/pdf/chartExporter'

interface MaintenanceListProps {
  initialRequests: any[]
  machinery: any[]
  projects?: any[]
  dict: any
  role: string | null
}

interface MachineSummary {
  machine_id: number
  external_code: string
  machinery_name: string
  machinery_full_name: string
  preventive_count: number
  corrective_count: number
  total_downtime: number
  spare_parts_cost: number
  service_cost: number
  total_paid: number
  requests: any[]
}

export default function MaintenanceList({ initialRequests, machinery, projects = [], dict, role }: MaintenanceListProps) {
  const [requests, setRequests] = useState(initialRequests)
  const [viewMode, setViewMode] = useState<'aggregated' | 'detailed'>('aggregated')
  const [projectFilter, setProjectFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isExportingPdf, setIsExportingPdf] = useState(false)

  // Machine multiselect state
  const [selectedMachines, setSelectedMachines] = useState<string[]>(() =>
    machinery.map(m => m.machinery_id.toString())
  )
  const [isMachineDropdownOpen, setIsMachineDropdownOpen] = useState(false)
  const [machineSearch, setMachineSearch] = useState('')
  const machineDropdownRef = useRef<HTMLDivElement>(null)

  // Expanded machine rows in aggregated view
  const [expandedMachines, setExpandedMachines] = useState<Set<number>>(new Set())

  const isAdmin = role === 'admin'

  // Close multiselect on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (machineDropdownRef.current && !machineDropdownRef.current.contains(e.target as Node)) {
        setIsMachineDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Machines visible in the popover (filtered by search)
  const visibleMachinery = useMemo(() => {
    if (!machineSearch.trim()) return machinery
    const q = machineSearch.toLowerCase()
    return machinery.filter(m =>
      m.machinery_full_name?.toLowerCase().includes(q) ||
      m.external_code?.toLowerCase().includes(q) ||
      m.machinery_name?.toLowerCase().includes(q)
    )
  }, [machinery, machineSearch])

  const isAllSelected = machinery.length > 0 && machinery.every(m => selectedMachines.includes(m.machinery_id.toString()))

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedMachines([])
    } else {
      setSelectedMachines(machinery.map(m => m.machinery_id.toString()))
    }
  }

  const toggleMachine = (id: string) => {
    setSelectedMachines(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const machineSelectorLabel = useMemo(() => {
    if (selectedMachines.length === 0) return 'Ninguna seleccionada'
    if (isAllSelected) return `Todas las máquinas (${machinery.length})`
    if (selectedMachines.length === 1) {
      const m = machinery.find(m => m.machinery_id.toString() === selectedMachines[0])
      return m ? m.machinery_full_name : '1 máquina'
    }
    return `${selectedMachines.length} máquinas seleccionadas`
  }, [selectedMachines, isAllSelected, machinery])

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      const matchesMachine = selectedMachines.length === 0 || selectedMachines.includes(r.machine_id.toString())
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter
      const matchesProject = projectFilter === '' || r.project_id?.toString() === projectFilter || r.project_name === projectFilter
      const matchesSearch = searchQuery === '' ||
        r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.project_name && r.project_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        r.machinery?.machinery_full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.machinery?.external_code?.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesMachine && matchesStatus && matchesProject && matchesSearch
    })
  }, [requests, selectedMachines, statusFilter, projectFilter, searchQuery])

  // Machine-level aggregation
  const { aggregatedData, totals } = useMemo(() => {
    const map = new Map<number, MachineSummary>()

    filteredRequests.forEach(r => {
      const mId = r.machine_id
      const spareParts = (r.spare_parts || []).reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0)
      const serviceCost = Number(r.cost) || 0
      const totalPaid = serviceCost + spareParts

      const existing = map.get(mId)
      if (existing) {
        existing.requests.push(r)
        if (r.maintenance_type === 'preventive') existing.preventive_count++
        else existing.corrective_count++
        existing.total_downtime += Number(r.downtime) || 0
        existing.spare_parts_cost += spareParts
        existing.service_cost += serviceCost
        existing.total_paid += totalPaid
      } else {
        map.set(mId, {
          machine_id: mId,
          external_code: r.machinery?.external_code || '-',
          machinery_name: r.machinery?.machinery_name || `M-${mId}`,
          machinery_full_name: r.machinery?.machinery_full_name || `Máquina ${mId}`,
          preventive_count: r.maintenance_type === 'preventive' ? 1 : 0,
          corrective_count: r.maintenance_type === 'corrective' ? 1 : 0,
          total_downtime: Number(r.downtime) || 0,
          spare_parts_cost: spareParts,
          service_cost: serviceCost,
          total_paid: totalPaid,
          requests: [r],
        })
      }
    })

    const rows = Array.from(map.values()).sort((a, b) => b.total_paid - a.total_paid)

    const grandTotals = {
      totalMachines: rows.length,
      totalServices: filteredRequests.length,
      totalPreventive: rows.reduce((acc, r) => acc + r.preventive_count, 0),
      totalCorrective: rows.reduce((acc, r) => acc + r.corrective_count, 0),
      totalDowntime: rows.reduce((acc, r) => acc + r.total_downtime, 0),
      totalSpareParts: rows.reduce((acc, r) => acc + r.spare_parts_cost, 0),
      totalService: rows.reduce((acc, r) => acc + r.service_cost, 0),
      grandTotalPaid: rows.reduce((acc, r) => acc + r.total_paid, 0),
    }

    return { aggregatedData: rows, totals: grandTotals }
  }, [filteredRequests])

  const toggleExpandMachine = (machineId: number) => {
    setExpandedMachines(prev => {
      const next = new Set(prev)
      next.has(machineId) ? next.delete(machineId) : next.add(machineId)
      return next
    })
  }

  const handleStatusUpdate = async (id: number, newStatus: string) => {
    const res = await updateMaintenanceStatus(id, newStatus as any)
    if (res.success) {
      setRequests(prev => prev.map(r =>
        r.maintenance_request_id === id ? { ...r, status: newStatus } : r
      ))
      toast.success(dict.maintenance.success_update)
    } else {
      toast.error(res.error || 'Error al actualizar estado')
    }
  }

  const handleExportPdf = async () => {
    if (filteredRequests.length === 0) {
      toast.error('No hay registros para exportar.')
      return
    }
    setIsExportingPdf(true)
    try {
      const { jsPDF } = await import('jspdf/dist/jspdf.es.min.js') as any
      const autoTableModule = await import('jspdf-autotable')
      const autoTable = autoTableModule.default || autoTableModule

      const doc = new jsPDF('p', 'mm', 'a4')
      const pageWidth = doc.internal.pageSize.getWidth()

      doc.setFillColor(37, 99, 235)
      doc.rect(0, 0, pageWidth, 24, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Reporte de Servicios de Mantenimiento', 14, 16)

      const projName = projects.find(p => p.project_id?.toString() === projectFilter)?.project_name || 'Todos los proyectos'
      const statusText = statusFilter === 'all' ? 'Todos' : statusFilter === 'approved' ? 'Aprobados' : statusFilter === 'pending' ? 'Pendientes' : 'Rechazados'

      doc.setFillColor(248, 250, 252)
      doc.roundedRect(14, 30, pageWidth - 28, 20, 2, 2, 'F')
      doc.setTextColor(50, 50, 50)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('Proyecto:', 18, 38)
      doc.setFont('helvetica', 'normal')
      doc.text(projName, 38, 38)
      doc.setFont('helvetica', 'bold')
      doc.text('Estado:', 110, 38)
      doc.setFont('helvetica', 'normal')
      doc.text(statusText, 128, 38)
      doc.setFont('helvetica', 'bold')
      doc.text('Total Pagado:', 18, 46)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(21, 128, 61)
      doc.text(`$${totals.grandTotalPaid.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`, 45, 46)

      if (viewMode === 'aggregated') {
        const tableColumns = ['Código', 'Maquinaria', 'Prev.', 'Corr.', 'T. Muerto (h)', 'Refacciones ($)', 'Servicio ($)', 'Total Pagado ($)']
        const tableRows: any[] = aggregatedData.map(r => [
          r.external_code,
          r.machinery_full_name,
          r.preventive_count,
          r.corrective_count,
          r.total_downtime.toFixed(1),
          `$${r.spare_parts_cost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
          `$${r.service_cost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
          `$${r.total_paid.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
        ])
        tableRows.push([
          'TOTALES',
          `${totals.totalMachines} máquinas`,
          totals.totalPreventive,
          totals.totalCorrective,
          totals.totalDowntime.toFixed(1),
          `$${totals.totalSpareParts.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
          `$${totals.totalService.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
          `$${totals.grandTotalPaid.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
        ])
        autoTable(doc, {
          head: [tableColumns],
          body: tableRows,
          startY: 56,
          theme: 'grid',
          headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 8 },
          styles: { fontSize: 8, cellPadding: 2.5 },
          columnStyles: {
            0: { cellWidth: 18, fontStyle: 'bold' },
            1: { cellWidth: 38, overflow: 'linebreak' },
            2: { cellWidth: 12, halign: 'center' },
            3: { cellWidth: 12, halign: 'center' },
            4: { cellWidth: 20, halign: 'right' },
            5: { cellWidth: 26, halign: 'right' },
            6: { cellWidth: 26, halign: 'right' },
            7: { cellWidth: 28, halign: 'right', fontStyle: 'bold', textColor: [21, 128, 61] },
          },
          didParseCell: (data: any) => {
            if (data.row.index === tableRows.length - 1) {
              data.cell.styles.fontStyle = 'bold'
              data.cell.styles.fillColor = [240, 253, 244]
            }
          },
        })
      } else {
        const tableColumns = ['Fecha', 'Máquina', 'Tipo', 'Proyecto', 'Descripción', 'Estado', 'Total Pagado ($)']
        const tableRows: any[] = filteredRequests.map(r => {
          const typeStr = `${r.maintenance_type === 'preventive' ? 'Preventivo' : 'Correctivo'}${r.is_external ? ' (Ext.)' : ''}`
          const statusLabel = r.status === 'approved' ? 'Aprobado' : r.status === 'rejected' ? 'Rechazado' : 'Pendiente'
          return [
            r.date,
            `${r.machinery?.external_code || ''}\n${r.machinery?.machinery_name || ''}`,
            typeStr,
            r.project_name || 'Sin proyecto',
            r.description,
            statusLabel,
            `$${(r.total_paid || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
          ]
        })
        tableRows.push(['TOTAL', '', '', `Servicios: ${filteredRequests.length}`, '', '', `$${totals.grandTotalPaid.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`])
        autoTable(doc, {
          head: [tableColumns],
          body: tableRows,
          startY: 56,
          theme: 'grid',
          headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 8 },
          styles: { fontSize: 8, cellPadding: 2.5 },
          columnStyles: {
            0: { cellWidth: 18 },
            1: { cellWidth: 26, fontStyle: 'bold', overflow: 'linebreak' },
            2: { cellWidth: 22, overflow: 'linebreak' },
            3: { cellWidth: 28, overflow: 'linebreak' },
            4: { cellWidth: 40, overflow: 'linebreak' },
            5: { cellWidth: 20 },
            6: { cellWidth: 28, halign: 'right', fontStyle: 'bold', textColor: [21, 128, 61] },
          },
          didParseCell: (data: any) => {
            if (data.row.index === tableRows.length - 1) {
              data.cell.styles.fontStyle = 'bold'
              data.cell.styles.fillColor = [240, 253, 244]
            }
          },
        })
      }

      addPdfFooters(doc, 'Hivaco Logbook - Reporte de Mantenimiento')
      doc.save(`Reporte_Mantenimiento_${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success('Reporte PDF descargado con éxito')
    } catch (err) {
      console.error('Error al generar PDF:', err)
      toast.error('No se pudo generar el reporte PDF')
    } finally {
      setIsExportingPdf(false)
    }
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    approved: 'bg-green-100 text-green-700 border-green-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
  }

  return (
    <div className="space-y-5">

      {/* ── Filter Toolbar ── */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

          {/* Col 1: Project Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Proyecto</label>
            <select
              value={projectFilter}
              onChange={e => setProjectFilter(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white"
            >
              <option value="">Todos los proyectos</option>
              {projects.map(p => (
                <option key={p.project_id} value={p.project_id}>
                  {p.project_name}
                </option>
              ))}
            </select>
          </div>

          {/* Col 2: Machine Multiselect */}
          <div className="relative" ref={machineDropdownRef}>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Maquinaria</label>
            <button
              type="button"
              onClick={() => setIsMachineDropdownOpen(prev => !prev)}
              className="w-full flex items-center justify-between p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white text-left"
            >
              <span className="truncate pr-2">{machineSelectorLabel}</span>
              <ChevronDown size={16} className={`text-gray-400 transition-transform ${isMachineDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isMachineDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-xl p-3 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-blue-600 h-4 w-4"
                    />
                    <span>{isAllSelected ? 'Deseleccionar todas' : 'Seleccionar todas'}</span>
                  </label>
                  <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    {selectedMachines.length} de {machinery.length}
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Buscar por código o nombre..."
                  value={machineSearch}
                  onChange={e => setMachineSearch(e.target.value)}
                  className="w-full p-2 text-xs border border-gray-200 rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                  {visibleMachinery.length === 0 ? (
                    <div className="p-3 text-center text-xs text-gray-400">Sin resultados</div>
                  ) : (
                    visibleMachinery.map(m => {
                      const idStr = m.machinery_id.toString()
                      const checked = selectedMachines.includes(idStr)
                      return (
                        <label
                          key={m.machinery_id}
                          className={`flex items-center gap-2 p-2 hover:bg-gray-50 rounded-md cursor-pointer text-xs transition-colors ${checked ? 'bg-blue-50/50' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleMachine(idStr)}
                            className="rounded border-gray-300 text-blue-600 h-4 w-4"
                          />
                          <span className="font-mono font-bold text-gray-700">{m.external_code}</span>
                          <span className="truncate flex-1 text-gray-800">{m.machinery_full_name}</span>
                        </label>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Col 3: Status + Search */}
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estado</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white"
              >
                <option value="all">Todos los estados</option>
                <option value="pending">{dict.maintenance.pending}</option>
                <option value="approved">{dict.maintenance.approved}</option>
                <option value="rejected">{dict.maintenance.rejected}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Row 2: Search + Export */}
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar por descripción, máquina u obra..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf || filteredRequests.length === 0}
            className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:bg-gray-300 shadow-sm transition-all whitespace-nowrap"
          >
            {isExportingPdf ? (
              <><Loader2 size={16} className="animate-spin" />Generando...</>
            ) : (
              <><FileText size={16} />Exportar PDF</>
            )}
          </button>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <Building2 size={18} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Máquinas</p>
            <p className="text-lg font-bold text-gray-900">{totals.totalMachines}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Wrench size={18} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Servicios</p>
            <p className="text-lg font-bold text-gray-900">{totals.totalServices}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
            <Clock size={18} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Tiempo Muerto</p>
            <p className="text-lg font-bold text-gray-900">{totals.totalDowntime.toFixed(1)} h</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center text-green-600">
            <DollarSign size={18} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Total Pagado</p>
            <p className="text-lg font-bold text-green-700">
              ${totals.grandTotalPaid.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* ── View Mode Toggle ── */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Vista:</span>
          <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
            <button
              onClick={() => setViewMode('aggregated')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                viewMode === 'aggregated' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Layers size={13} />
              Agrupado por Máquina
            </button>
            <button
              onClick={() => setViewMode('detailed')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                viewMode === 'detailed' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ListFilter size={13} />
              Detalle de Servicios
            </button>
          </div>
        </div>
        <span className="text-xs text-gray-500 font-medium">
          {viewMode === 'aggregated'
            ? `${aggregatedData.length} ${aggregatedData.length === 1 ? 'máquina' : 'máquinas'}`
            : `${filteredRequests.length} ${filteredRequests.length === 1 ? 'servicio' : 'servicios'}`}
        </span>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
        {viewMode === 'aggregated' ? (
          /* AGGREGATED VIEW */
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-900">
                <th className="p-4 w-10" />
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Código</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Maquinaria</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-center">Preventivos</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-center">Correctivos</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-right">Tiempo Muerto</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-right">Refacciones</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-right">Servicio</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-right">Total Pagado</th>
              </tr>
            </thead>
            <tbody className="text-gray-900">
              {aggregatedData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-gray-400 italic">{dict.maintenance.no_requests}</td>
                </tr>
              ) : (
                aggregatedData.map(row => (
                  <React.Fragment key={row.machine_id}>
                    <tr
                      className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${expandedMachines.has(row.machine_id) ? 'bg-gray-50/30' : ''}`}
                    >
                      <td className="p-4">
                        <button
                          onClick={() => toggleExpandMachine(row.machine_id)}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                        >
                          {expandedMachines.has(row.machine_id)
                            ? <ChevronDown size={16} />
                            : <ChevronRight size={16} />}
                        </button>
                      </td>
                      <td className="p-4 text-sm font-mono font-bold text-gray-800">{row.external_code}</td>
                      <td className="p-4 text-sm font-medium">{row.machinery_full_name}</td>
                      <td className="p-4 text-sm text-center">
                        {row.preventive_count > 0 ? (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full">
                            {row.preventive_count}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="p-4 text-sm text-center">
                        {row.corrective_count > 0 ? (
                          <span className="px-2 py-0.5 bg-orange-50 text-orange-700 text-xs font-bold rounded-full">
                            {row.corrective_count}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="p-4 text-sm text-right font-mono text-gray-700">
                        {row.total_downtime > 0 ? `${row.total_downtime.toFixed(1)} h` : '—'}
                      </td>
                      <td className="p-4 text-sm text-right font-mono text-gray-800">
                        ${row.spare_parts_cost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-sm text-right font-mono text-gray-800">
                        ${row.service_cost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-sm text-right font-mono font-bold text-green-700">
                        ${row.total_paid.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    {expandedMachines.has(row.machine_id) && (
                      <tr key={`${row.machine_id}-detail`} className="bg-gray-50/60 border-b border-gray-100 animate-in fade-in slide-in-from-top-1 duration-150">
                        <td colSpan={9} className="px-8 py-4">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                            Servicios ({row.requests.length})
                          </p>
                          <ul className="space-y-1.5">
                            {row.requests.map((req: any) => (
                              <li key={req.maintenance_request_id} className="flex items-start gap-2.5 text-sm">
                                <span className={`mt-0.5 flex-shrink-0 px-1.5 py-0.5 text-[9px] font-bold uppercase rounded border ${
                                  req.maintenance_type === 'preventive'
                                    ? 'bg-blue-50 text-blue-600 border-blue-100'
                                    : 'bg-orange-50 text-orange-600 border-orange-100'
                                }`}>
                                  {req.maintenance_type === 'preventive' ? 'Prev' : 'Corr'}
                                </span>
                                <span className="text-gray-500 font-mono text-xs flex-shrink-0">{req.date}</span>
                                <span className="text-gray-800 flex-1">{req.description}</span>
                                <Link
                                  href={`/app/maintenance/${req.maintenance_request_id}`}
                                  className="flex-shrink-0 p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                                  title="Ver detalle"
                                >
                                  <Edit2 size={12} />
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
            {aggregatedData.length > 0 && (
              <tfoot>
                <tr className="bg-gray-100 font-bold border-t-2 border-gray-300 text-gray-900">
                  <td className="p-4" />
                  <td className="p-4 text-sm uppercase tracking-wider" colSpan={2}>
                    TOTALES ({totals.totalMachines} {totals.totalMachines === 1 ? 'máquina' : 'máquinas'})
                  </td>
                  <td className="p-4 text-sm text-center font-mono font-bold text-blue-900">{totals.totalPreventive}</td>
                  <td className="p-4 text-sm text-center font-mono font-bold text-orange-900">{totals.totalCorrective}</td>
                  <td className="p-4 text-sm text-right font-mono font-bold text-gray-900">
                    {totals.totalDowntime > 0 ? `${totals.totalDowntime.toFixed(1)} h` : '—'}
                  </td>
                  <td className="p-4 text-sm text-right font-mono font-bold text-gray-900">
                    ${totals.totalSpareParts.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-4 text-sm text-right font-mono font-bold text-gray-900">
                    ${totals.totalService.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-4 text-sm text-right font-mono font-bold text-green-800">
                    ${totals.grandTotalPaid.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        ) : (
          /* DETAILED VIEW — existing flat ticket list */
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-900">
                <th className="p-4 w-10" />
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">{dict.maintenance.date}</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">{dict.maintenance.machinery}</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">{dict.maintenance.type}</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Proyecto</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">{dict.maintenance.description}</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-right">Total Pagado</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">{dict.maintenance.status}</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody className="text-gray-900">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-gray-400 italic">{dict.maintenance.no_requests}</td>
                </tr>
              ) : (
                filteredRequests.map(req => (
                  <MaintenanceRow
                    key={req.maintenance_request_id}
                    req={req}
                    dict={dict}
                    isAdmin={isAdmin}
                    onStatusUpdate={handleStatusUpdate}
                  />
                ))
              )}
            </tbody>
            {filteredRequests.length > 0 && (
              <tfoot>
                <tr className="bg-gray-100 font-bold border-t-2 border-gray-300 text-gray-900">
                  <td className="p-4" colSpan={6}>
                    TOTALES ({filteredRequests.length} {filteredRequests.length === 1 ? 'servicio' : 'servicios'})
                  </td>
                  <td className="p-4 text-sm text-right font-mono font-bold text-green-800">
                    ${totals.grandTotalPaid.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-4" colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>
    </div>
  )
}

function MaintenanceRow({ req, dict, isAdmin, onStatusUpdate }: { req: any, dict: any, isAdmin: boolean, onStatusUpdate: any }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    approved: 'bg-green-100 text-green-700 border-green-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
  }

  return (
    <>
      <tr className={`border-b border-gray-50 hover:bg-gray-50/50 transition-all ${isExpanded ? 'bg-gray-50/30' : ''}`}>
        <td className="p-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
          >
            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
        </td>
        <td className="p-4 text-sm whitespace-nowrap">{req.date}</td>
        <td className="p-4 text-sm">
          <div className="font-bold">[{req.machinery?.external_code}]</div>
          <div className="text-[10px] text-gray-500 truncate max-w-[120px]">{req.machinery?.machinery_name}</div>
        </td>
        <td className="p-4 text-sm">
          <div className="flex flex-col gap-1">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border w-fit ${
              req.maintenance_type === 'preventive' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-orange-50 text-orange-600 border-orange-100'
            }`}>
              {dict.maintenance[req.maintenance_type]}
            </span>
            {req.is_external && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border bg-purple-50 text-purple-600 border-purple-100 w-fit">
                {dict.maintenance.is_external}
              </span>
            )}
          </div>
        </td>
        <td className="p-4 text-sm">
          <div className="font-bold text-gray-800">{req.project_name || 'Sin proyecto'}</div>
        </td>
        <td className="p-4 text-sm max-w-xs truncate">{req.description}</td>
        <td className="p-4 text-sm font-mono font-bold text-green-700 text-right">
          ${(req.total_paid || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
        </td>
        <td className="p-4 text-sm">
          {isAdmin ? (
            <select
              value={req.status}
              onChange={e => onStatusUpdate(req.maintenance_request_id, e.target.value)}
              className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border outline-none focus:ring-2 focus:ring-blue-500 transition-all ${statusColors[req.status as keyof typeof statusColors]}`}
            >
              <option value="pending">{dict.maintenance.pending}</option>
              <option value="approved">{dict.maintenance.approved}</option>
              <option value="rejected">{dict.maintenance.rejected}</option>
            </select>
          ) : (
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${statusColors[req.status as keyof typeof statusColors]}`}>
              {dict.maintenance[req.status]}
            </span>
          )}
        </td>
        <td className="p-4 text-right">
          <Link
            href={`/app/maintenance/${req.maintenance_request_id}`}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all inline-block"
            title={dict.common.edit}
          >
            <Edit2 size={16} />
          </Link>
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-gray-50/50 border-b border-gray-100 animate-in fade-in slide-in-from-top-1 duration-200">
          <td colSpan={9} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                  {dict.maintenance.observations}
                </label>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {req.observations || <span className="text-gray-400 italic">Sin observaciones registradas.</span>}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                  {dict.maintenance.spare_parts}
                </label>
                {req.spare_parts && req.spare_parts.length > 0 ? (
                  <ul className="space-y-2">
                    {req.spare_parts.map((part: any, i: number) => (
                      <li key={i} className="text-sm flex justify-between bg-white p-2 rounded border border-gray-100">
                        <span className="text-gray-700 font-medium">{part.description}</span>
                        <div className="flex gap-4">
                          <span className="text-gray-400 font-bold">x{part.quantity}</span>
                          {part.amount && <span className="text-blue-600 font-bold">${part.amount.toFixed(2)}</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400 italic">No se usaron refacciones.</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                  {dict.maintenance.attachments}
                </label>
                {req.attachments && req.attachments.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {req.attachments.map((url: string, i: number) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-lg text-xs text-blue-600 hover:bg-blue-50 transition-all shadow-sm"
                      >
                        <Paperclip size={14} />
                        Adjunto {i + 1}
                        <ExternalLink size={12} />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">Sin archivos adjuntos.</p>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
