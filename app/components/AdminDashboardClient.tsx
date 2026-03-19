'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Download, Search, Filter } from 'lucide-react'
import { startOfWeek, endOfWeek, format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

interface AdminDashboardClientProps {
  machinery: any[]
  dict: any
  common: any
}

export default function AdminDashboardClient({ machinery, dict, common }: AdminDashboardClientProps) {
  const [selectedMachine, setSelectedMachine] = useState('')
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchLogs = async () => {
    if (!selectedMachine) {
      setLogs([])
      return
    }
    
    setLoading(true)
    const start = startOfWeek(new Date(), { weekStartsOn: 1 }) // Monday
    const end = endOfWeek(new Date(), { weekStartsOn: 1 })

    const { data, error } = await supabase
      .from('machinery_logs')
      .select(`
        *,
        projects(project_name),
        machinery(machinery_name)
      `)
      .eq('machine_id', selectedMachine)
      .gte('date', format(start, 'yyyy-MM-dd'))
      .lte('date', format(end, 'yyyy-MM-dd'))
      .order('date', { ascending: true })

    if (error) {
      console.error(error)
    } else {
      setLogs(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchLogs()
  }, [selectedMachine])

  const exportPDF = () => {
    const doc = new jsPDF()
    const machineName = machinery.find(m => m.machinery_id.toString() === selectedMachine)?.machinery_name
    
    // Header
    doc.setFontSize(18)
    doc.text(dict.pdf.report_title, 14, 15)
    
    doc.setFontSize(12)
    doc.text(`${dict.pdf.machine_subtitle}: ${machineName}`, 14, 22)
    
    const tableColumn = [
      dict.columns.date,
      dict.columns.operator,
      dict.columns.project,
      dict.columns.start,
      dict.columns.end,
      dict.columns.fuel,
      dict.columns.observations,
      dict.columns.signature
    ]
    
    const tableRows = logs.map(log => [
      log.date,
      log.operator_name,
      log.projects?.project_name,
      log.start_time,
      log.end_time || '-',
      log.fuel_liters,
      log.observations || '',
      '' // Empty for signature
    ])

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      styles: { fontSize: 8 }
    })

    // Signatures at bottom
    // @ts-ignore
    const finalY = doc.lastAutoTable.finalY + 30
    doc.line(20, finalY, 80, finalY)
    doc.setFontSize(8) // Decreased font size for signature fields
    doc.text(dict.signatures.operator, 35, finalY + 5)
    
    doc.line(120, finalY, 180, finalY)
    doc.text(dict.signatures.admin, 135, finalY + 5)

    doc.save(`Reporte_${machineName}_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{dict.select_machine}</label>
          <select 
            value={selectedMachine}
            onChange={(e) => setSelectedMachine(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            <option value="">{common.select_placeholder}</option>
            {machinery.map(m => <option key={m.machinery_id} value={m.machinery_id}>{m.machinery_name}</option>)}
          </select>
        </div>
        <div>
          <button 
            onClick={exportPDF}
            disabled={logs.length === 0}
            className="flex items-center justify-center gap-2 w-full py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 transition-colors"
          >
            <Download size={18} />
            {dict.export_pdf}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-gray-900">
              <th className="p-4 font-semibold">{dict.columns.date}</th>
              <th className="p-4 font-semibold">{dict.columns.operator}</th>
              <th className="p-4 font-semibold">{dict.columns.project}</th>
              <th className="p-4 font-semibold">{dict.columns.start}</th>
              <th className="p-4 font-semibold">{dict.columns.end}</th>
              <th className="p-4 font-semibold">{dict.columns.fuel}</th>
              <th className="p-4 font-semibold">{dict.columns.observations}</th>
            </tr>
          </thead>
          <tbody className="text-gray-900">
            {loading ? (
              <tr><td colSpan={7} className="p-8 text-center text-gray-500">{dict.loading}</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-gray-500">{dict.no_logs}</td></tr>
            ) : (
              logs.map(log => (
                <tr key={log.machinery_log_id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="p-4 text-sm">{log.date}</td>
                  <td className="p-4 text-sm font-medium">{log.operator_name}</td>
                  <td className="p-4 text-sm">{log.projects?.project_name}</td>
                  <td className="p-4 text-sm font-mono">{log.start_time}</td>
                  <td className="p-4 text-sm font-mono">{log.end_time || '-'}</td>
                  <td className="p-4 text-sm">{log.fuel_liters}</td>
                  <td className="p-4 text-sm text-gray-700 italic max-w-xs truncate">{log.observations}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
