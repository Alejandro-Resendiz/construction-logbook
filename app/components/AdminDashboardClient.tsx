'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Download, Search, Filter } from 'lucide-react'
import { startOfWeek, endOfWeek, format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

interface AdminDashboardClientProps {
  machinery: any[]
  dict: any
  common: any
}

export default function AdminDashboardClient({ machinery, dict, common }: AdminDashboardClientProps) {
  const [selectedMachine, setSelectedMachine] = useState('')
  const [dateFrom, setDateFrom] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const today = format(new Date(), 'yyyy-MM-dd')

  const fetchLogs = async () => {
    if (!selectedMachine || !dateFrom || !dateTo) {
      setLogs([])
      return
    }
    
    setLoading(true)
    const { data, error } = await supabase
      .from('machinery_logs')
      .select(`
        *,
        projects(project_name),
        machinery(machinery_name, machinery_full_name)
      `)
      .eq('machine_id', selectedMachine)
      .gte('date', dateFrom)
      .lte('date', dateTo)
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
  }, [selectedMachine, dateFrom, dateTo])

  // Validation: Max 7 days
  const handleDateChange = (type: 'from' | 'to', value: string) => {
    const from = type === 'from' ? new Date(value) : new Date(dateFrom)
    const to = type === 'to' ? new Date(value) : new Date(dateTo)
    
    const diffTime = Math.abs(to.getTime() - from.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays > 7) {
      alert('El rango máximo es de 7 días.')
      return
    }

    if (type === 'from') setDateFrom(value)
    else setDateTo(value)
  }

  const exportPDF = () => {
    const doc = new jsPDF()
    const machineName = machinery.find(m => m.machinery_id.toString() === selectedMachine)?.machinery_full_name
    
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
      headStyles: { fillColor: "#FFC500", textColor: 0 },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { overflow: 'linebreak' },
        2: { overflow: 'linebreak' },
        3: { cellWidth: 18 },
        4: { cellWidth: 18 },
        5: { cellWidth: 21, overflow: 'linebreak' },
        6: { overflow: 'linebreak' },
        7: { cellWidth: 30 }
      }
    })

    // Signatures at bottom
    // @ts-ignore
    const finalY = doc.lastAutoTable.finalY + 30
    
    // Line 1: Operator
    const line1Start = 20
    const line1End = 80
    const line1Center = line1Start + (line1End - line1Start) / 2
    doc.line(line1Start, finalY, line1End, finalY)
    doc.setFontSize(8)
    doc.text(dict.signatures.operator, line1Center, finalY + 5, { align: 'center' })
    
    // Line 2: Admin
    const line2Start = 120
    const line2End = 180
    const line2Center = line2Start + (line2End - line2Start) / 2
    doc.line(line2Start, finalY, line2End, finalY)
    doc.text(dict.signatures.admin, line2Center, finalY + 5, { align: 'center' })

    const fileName = `Reporte_${machineName}_${dateFrom}_a_${dateTo}.pdf`
    doc.save(fileName)
  }

  const exportExcel = async () => {
    const machineName = machinery.find(m => m.machinery_id.toString() === selectedMachine)?.machinery_full_name
    
    // 1. Load the template from the public folder
    const response = await fetch('/templates/logbook_template.xlsx')
    const arrayBuffer = await response.arrayBuffer()
    
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(arrayBuffer)
    
    const worksheet = workbook.getWorksheet(1)
    if (!worksheet) return

    // 2. Fill the header metadata
    worksheet.getCell('C4').value = machineName // Machine Full Name
    worksheet.getCell('B2').value = format(new Date(dateFrom), 'dd/MM/yyyy') // Start Date
    worksheet.getCell('F2').value = format(new Date(dateTo), 'dd/MM/yyyy') // End Date

    // 3. Get the template row (Row 6) to clone its styles
    const templateRow = worksheet.getRow(6)

    // 4. Fill the logs starting from Row 6
    logs.forEach((log, index) => {
      const rowIndex = 6 + index
      const currentRow = worksheet.getRow(rowIndex)
      
      const rowData = [
        log.date, // Col A: FECHA
        log.operator_name, // Col B: OPERADOR
        log.projects?.project_name, // Col C: PROYECTO
        log.start_time, // Col D: HORA INICIO
        log.end_time || '-', // Col E: HORA FIN
        log.fuel_liters, // Col F: CARGA DE COMBUSTIBLE
        log.observations || '' // Col G: OBSERVACIONES
      ]

      // Set values and copy styles from templateRow cell by cell
      rowData.forEach((value, colIndex) => {
        const colNumber = colIndex + 1
        const targetCell = currentRow.getCell(colNumber)
        const sourceCell = templateRow.getCell(colNumber)

        targetCell.value = value

        // Clone every style property from the template (Row 6)
        targetCell.style = { ...sourceCell.style }
      })
      
      currentRow.commit()
    })

    // 5. Generate and Download
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const fileName = `Reporte_${machineName}_${dateFrom}_a_${dateTo}.xlsx`
    saveAs(blob, fileName)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
        {/* Row 1: Machine Selector (Full width) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{dict.select_machine}</label>
          <select 
            value={selectedMachine}
            onChange={(e) => setSelectedMachine(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            <option value="">{common.select_placeholder}</option>
            {machinery.map(m => <option key={m.machinery_id} value={m.machinery_id}>{m.machinery_full_name}</option>)}
          </select>
        </div>

        {/* Row 2: Date range and Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
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
          <div className="md:col-span-2 flex gap-2">
            <button 
              onClick={exportPDF}
              disabled={logs.length === 0}
              className="flex items-center justify-center gap-2 flex-1 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 transition-colors"
            >
              <Download size={18} />
              {dict.export_pdf}
            </button>
            <button 
              onClick={exportExcel}
              disabled={logs.length === 0}
              className="flex items-center justify-center gap-2 flex-1 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
            >
              <Search size={18} />
              {dict.export_excel || 'Exportar Excel'}
            </button>
          </div>
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
