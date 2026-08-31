'use client'

import { useState, useMemo } from 'react'
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
  Building2
} from 'lucide-react'
import { updateMaintenanceStatus } from '@/app/app/maintenance/actions'
import { toast } from 'sonner'
import Link from 'next/link'
import { addPdfFooters } from '@/lib/pdf/chartExporter'

interface MaintenanceListProps {
  initialRequests: any[]
  machinery: any[]
  dict: any
  role: string | null
}

export default function MaintenanceList({ initialRequests, machinery, dict, role }: MaintenanceListProps) {
  const [requests, setRequests] = useState(initialRequests)
  const [machineFilter, setMachineFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isExportingPdf, setIsExportingPdf] = useState(false)

  const isAdmin = role === 'admin'

  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      const matchesMachine = machineFilter === '' || r.machine_id.toString() === machineFilter
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter
      const matchesSearch = searchQuery === '' || 
        r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.project_name && r.project_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        r.machinery?.machinery_full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.machinery?.external_code.toLowerCase().includes(searchQuery.toLowerCase())
      
      return matchesMachine && matchesStatus && matchesSearch
    })
  }, [requests, machineFilter, statusFilter, searchQuery])

  const grandTotalPaid = useMemo(() => {
    return filteredRequests.reduce((acc, r) => acc + (r.total_paid || 0), 0)
  }, [filteredRequests])

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
      toast.error('No hay registros de mantenimiento para exportar.')
      return
    }

    setIsExportingPdf(true)
    try {
      const { jsPDF } = await import('jspdf/dist/jspdf.es.min.js') as any
      const autoTableModule = await import('jspdf-autotable')
      const autoTable = autoTableModule.default || autoTableModule

      const doc = new jsPDF('p', 'mm', 'a4')
      const pageWidth = doc.internal.pageSize.getWidth()

      // Header Banner
      doc.setFillColor(37, 99, 235) // Primary Blue
      doc.rect(0, 0, pageWidth, 24, 'F')

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Reporte de Servicios de Mantenimiento', 14, 16)

      // Metadata card
      doc.setTextColor(50, 50, 50)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')

      const selectedMachineObj = machinery.find(m => m.machinery_id.toString() === machineFilter)
      const machineText = selectedMachineObj ? `[${selectedMachineObj.external_code}] ${selectedMachineObj.machinery_full_name}` : 'Todas'
      const statusText = statusFilter === 'all' ? 'Todos los estados' : statusFilter === 'approved' ? 'Aprobados' : statusFilter === 'pending' ? 'Pendientes' : 'Rechazados'

      doc.setFillColor(248, 250, 252)
      doc.roundedRect(14, 30, pageWidth - 28, 24, 2, 2, 'F')

      doc.setFont('helvetica', 'bold')
      doc.text(`Fecha de Emisión:`, 18, 38)
      doc.setFont('helvetica', 'normal')
      doc.text(new Date().toLocaleDateString('es-MX'), 48, 38)

      doc.setFont('helvetica', 'bold')
      doc.text(`Filtrado Maquinaria:`, 110, 38)
      doc.setFont('helvetica', 'normal')
      doc.text(machineText, 142, 38, { maxWidth: 50 })

      doc.setFont('helvetica', 'bold')
      doc.text(`Estado Servicios:`, 18, 46)
      doc.setFont('helvetica', 'normal')
      doc.text(statusText, 48, 46)

      doc.setFont('helvetica', 'bold')
      doc.text(`Total Pagado Filtrado:`, 110, 46)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(21, 128, 61)
      doc.text(`$${grandTotalPaid.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`, 142, 46)

      // Table columns & rows
      let currentY = 60
      const tableColumns = [
        'Fecha',
        'Máquina',
        'Tipo',
        'Proyecto',
        'Descripción',
        'Estado',
        'Total Pagado ($ MXN)'
      ]

      const tableRows = filteredRequests.map(r => {
        const machineStr = `${r.machinery?.external_code || 'M'}\n${r.machinery?.machinery_name || ''}`
        const typeStr = `${r.maintenance_type === 'preventive' ? 'Preventivo' : 'Correctivo'}${r.is_external ? ' (Ext.)' : ''}`
        const statusLabel = r.status === 'approved' ? 'Aprobado' : r.status === 'rejected' ? 'Rechazado' : 'Pendiente'
        const paidStr = `$${(r.total_paid || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

        return [
          r.date,
          machineStr,
          typeStr,
          r.project_name || 'Sin proyecto',
          r.description,
          statusLabel,
          paidStr
        ]
      })

      // Add Grand Total summary row
      tableRows.push([
        'TOTAL',
        '',
        '',
        `Servicios: ${filteredRequests.length}`,
        '',
        '',
        `$${grandTotalPaid.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
      ])

      autoTable(doc, {
        head: [tableColumns],
        body: tableRows,
        startY: currentY + 4,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 2.5 },
        columnStyles: {
          0: { cellWidth: 18 },
          1: { cellWidth: 26, fontStyle: 'bold', overflow: 'linebreak' },
          2: { cellWidth: 22, overflow: 'linebreak' },
          3: { cellWidth: 30, overflow: 'linebreak' },
          4: { cellWidth: 40, overflow: 'linebreak' },
          5: { cellWidth: 20, fontStyle: 'bold' },
          6: { cellWidth: 28, halign: 'right', fontStyle: 'bold', textColor: [21, 128, 61] }
        },
        didParseCell: (data: any) => {
          // Highlight final summary row
          if (data.row.index === tableRows.length - 1) {
            data.cell.styles.fontStyle = 'bold'
            data.cell.styles.fillColor = [240, 253, 244]
          }
        }
      })

      addPdfFooters(doc, 'Hivaco Logbook - Reporte de Mantenimiento')
      doc.save(`Reporte_Mantenimiento_${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success('Reporte PDF descargado con éxito')
    } catch (err) {
      console.error('Error al generar PDF de mantenimiento:', err)
      toast.error('No se pudo generar el reporte PDF')
    } finally {
      setIsExportingPdf(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Filter Bar & Export Actions */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex-1 w-full relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input 
            type="text" 
            placeholder="Buscar por descripción, máquina u obra..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <select 
            value={machineFilter}
            onChange={(e) => setMachineFilter(e.target.value)}
            className="p-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="">{dict.admin.select_machine}</option>
            {machinery.map(m => (
              <option key={m.machinery_id} value={m.machinery_id}>
                [{m.external_code}] {m.machinery_full_name}
              </option>
            ))}
          </select>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">Todos los estados</option>
            <option value="pending">{dict.maintenance.pending}</option>
            <option value="approved">{dict.maintenance.approved}</option>
            <option value="rejected">{dict.maintenance.rejected}</option>
          </select>
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf || filteredRequests.length === 0}
            className="flex items-center justify-center gap-2 px-5 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:bg-gray-300 shadow-sm transition-all whitespace-nowrap"
          >
            {isExportingPdf ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <FileText size={16} />
                Exportar PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <Building2 size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">Servicios Registrados</p>
            <p className="text-lg font-bold text-gray-900">{filteredRequests.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">Total Pagado Filtrado</p>
            <p className="text-lg font-bold text-green-700">
              ${grandTotalPaid.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-gray-900">
              <th className="p-4 w-10"></th>
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">{dict.maintenance.date}</th>
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">{dict.maintenance.machinery}</th>
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">{dict.maintenance.type}</th>
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Proyecto</th>
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">{dict.maintenance.description}</th>
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-right">Total Pagado</th>
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">{dict.maintenance.status}</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody className="text-gray-900">
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-12 text-center text-gray-400 italic">
                  {dict.maintenance.no_requests}
                </td>
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
        </table>
      </div>
    </div>
  )
}

function MaintenanceRow({ req, dict, isAdmin, onStatusUpdate }: { req: any, dict: any, isAdmin: boolean, onStatusUpdate: any }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    approved: 'bg-green-100 text-green-700 border-green-200',
    rejected: 'bg-red-100 text-red-700 border-red-200'
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
              onChange={(e) => onStatusUpdate(req.maintenance_request_id, e.target.value)}
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
              {/* Observations */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                  {dict.maintenance.observations}
                </label>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {req.observations || (
                    <span className="text-gray-400 italic">Sin observaciones registradas.</span>
                  )}
                </p>
              </div>

              {/* Spare Parts List */}
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

              {/* Attachments List */}
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
