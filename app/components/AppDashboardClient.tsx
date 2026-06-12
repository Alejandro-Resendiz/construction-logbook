'use client'

import { useState, useEffect } from 'react'
import { getMachineryLogs } from '@/app/app/logbook/actions'
import { Download, Search, Filter } from 'lucide-react'
import { startOfWeek, endOfWeek, format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { toast } from 'sonner'
import LogbookAnalytics from './LogbookAnalytics'
import { useTranslation } from '@/hooks/useTranslation'

interface AppDashboardClientProps {
  machinery: any[]
  common: any
}

export default function AppDashboardClient({ machinery, common }: AppDashboardClientProps) {
  
  const { t } = useTranslation('admin')
  const [activeTab, setActiveTab] = useState<'table' | 'analytics'>('table')
  const [selectedMachine, setSelectedMachine] = useState('')
  const [machineType, setMachineType] = useState<'all' | 'owned' | 'rented'>('all')
  const [dateFrom, setDateFrom] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const today = format(new Date(), 'yyyy-MM-dd')

  const fetchLogs = async () => {
    if (activeTab === 'table' && !selectedMachine) {
      setLogs([])
      return
    }
    
    setLoading(true)
    try {
      const machineId = selectedMachine ? parseInt(selectedMachine) : undefined
      const res = await getMachineryLogs(machineId, dateFrom, dateTo)

      if (res.error) {
        setLogs([])
        toast.error(res.error)
      } else {
        let filteredData = res.logs || []
        if (machineType === 'owned') {
          filteredData = filteredData.filter(log => !log.machinery?.is_rented)
        } else if (machineType === 'rented') {
          filteredData = filteredData.filter(log => log.machinery?.is_rented)
        }
        setLogs(filteredData)
      }
    } catch (err) {
      toast.error('Error fetching logs');
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [selectedMachine, dateFrom, dateTo, machineType, activeTab])

  const handleDateChange = (type: 'from' | 'to', value: string) => {
    const from = type === 'from' ? new Date(value) : new Date(dateFrom)
    const to = type === 'to' ? new Date(value) : new Date(dateTo)
    
    const diffTime = Math.abs(to.getTime() - from.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays > 7) {
      toast.error(common.notifications?.max_range_error || 'El rango máximo es de 7 días.')
      return
    }

    if (type === 'from') setDateFrom(value)
    else setDateTo(value)
  }

  const exportPDF = () => {
    try {
      const doc = new jsPDF()
      const machineName = machinery.find(m => m.machinery_id.toString() === selectedMachine)?.machinery_full_name
      
      doc.setFontSize(18)
      doc.text(t('pdf.report_title'), 14, 15)
      
      doc.setFontSize(12)
      doc.text(`${t('pdf.machine_subtitle')}: ${machineName}`, 14, 22)
      
      const tableColumn = [
        t('columns.date'),
        t('columns.operator'),
        t('columns.project'),
        t('columns.start'),
        t('columns.end'),
        t('columns.fuel'),
        t('columns.fuel_price'),
        t('columns.observations'),
        t('columns.signature')
      ]
      
      const tableRows = logs.map(log => [
        log.date,
        log.operator_name,
        log.projects?.project_name,
        log.start_time,
        log.end_time || '-',
        log.fuel_liters,
        log.fuel_price || '-',
        log.observations || '',
        ''
      ])

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 30,
        theme: 'grid',
        headStyles: { fillColor: "#FFC500", textColor: 0 },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 18 },
          1: { overflow: 'linebreak' },
          2: { overflow: 'linebreak' },
          3: { cellWidth: 15 },
          4: { cellWidth: 15 },
          5: { cellWidth: 20 },
          6: { cellWidth: 15 },
          7: { overflow: 'linebreak' },
          8: { cellWidth: 25 }
        }
      })

      // @ts-ignore
      const finalY = doc.lastAutoTable.finalY + 30
      
      const line1Start = 20
      const line1End = 80
      const line1Center = line1Start + (line1End - line1Start) / 2
      doc.line(line1Start, finalY, line1End, finalY)
      doc.setFontSize(8)
      doc.text(t('signatures.operator'), line1Center, finalY + 5, { align: 'center' })
      
      const line2Start = 120
      const line2End = 180
      const line2Center = line2Start + (line2End - line2Start) / 2
      doc.line(line2Start, finalY, line2End, finalY)
      doc.text(t('signatures.admin'), line2Center, finalY + 5, { align: 'center' })

      const fileName = `Reporte_${machineName}_${dateFrom}_a_${dateTo}.pdf`
      doc.save(fileName)
    } catch (err) {
      toast.error('Error exporting PDF');
    }
  }

  const exportExcel = async () => {
    try {
      const machineName = machinery.find(m => m.machinery_id.toString() === selectedMachine)?.machinery_full_name
      
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
          log.start_time,
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
      const fileName = `Reporte_${machineName}_${dateFrom}_a_${dateTo}.xlsx`
      saveAs(blob, fileName)
    } catch (err) {
      toast.error('Error exporting Excel');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('table')}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${
            activeTab === 'table' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {t('analytics.table_tab')}
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${
            activeTab === 'analytics' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {t('analytics.analytics_tab')}
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('select_machine')}</label>
            <select 
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">{activeTab === 'analytics' ? t('analytics.all_machines') : common.select_placeholder}</option>
              {machinery.map(m => <option key={m.machinery_id} value={m.machinery_id}>{m.machinery_full_name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('analytics.machinery_type')}</label>
            <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-200">
              <button
                onClick={() => setMachineType('all')}
                className={`flex-1 py-1 text-xs font-bold rounded-md transition-all ${
                  machineType === 'all' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'
                }`}
              >
                {t('common.all')}
              </button>
              <button
                onClick={() => setMachineType('owned')}
                className={`flex-1 py-1 text-xs font-bold rounded-md transition-all ${
                  machineType === 'owned' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'
                }`}
              >
                {t('analytics.owned_only')}
              </button>
              <button
                onClick={() => setMachineType('rented')}
                className={`flex-1 py-1 text-xs font-bold rounded-md transition-all ${
                  machineType === 'rented' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'
                }`}
              >
                {t('analytics.rented_only')}
              </button>
            </div>
          </div>
        </div>

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
          
          {activeTab === 'table' && (
            <div className="md:col-span-2 flex gap-2">
              <button 
                onClick={exportPDF}
                disabled={logs.length === 0}
                className="flex items-center justify-center gap-2 flex-1 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 transition-colors"
              >
                <Download size={18} />
                {t('export_pdf')}
              </button>
              <div className="relative group flex-1">
                <button 
                  disabled={true}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-gray-300 text-gray-500 rounded-lg font-semibold cursor-not-allowed transition-colors"
                >
                  <Download size={18} />
                  {t('export_excel') || 'Exportar Excel'}
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity w-48 text-center pointer-events-none z-10">
                  {t('feature.xlsx.premium.tooltip')}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {activeTab === 'table' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-900">
                <th className="p-4 font-semibold">{t('columns.date')}</th>
                <th className="p-4 font-semibold">{t('columns.operator')}</th>
                <th className="p-4 font-semibold">{t('columns.project')}</th>
                <th className="p-4 font-semibold">{t('columns.start')}</th>
                <th className="p-4 font-semibold">{t('columns.end')}</th>
                <th className="p-4 font-semibold">{t('columns.fuel')}</th>
                <th className="p-4 font-semibold">{t('columns.fuel_price')}</th>
                <th className="p-4 font-semibold">{t('columns.observations')}</th>
              </tr>
            </thead>
            <tbody className="text-gray-900">
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-gray-500">{t('loading')}</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-gray-500">{selectedMachine ? t('no_logs') : 'Selecciona una máquina para ver la tabla'}</td></tr>
              ) : (
                logs.map(log => (
                  <tr key={log.machinery_log_id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="p-4 text-sm">{log.date}</td>
                    <td className="p-4 text-sm font-medium">{log.operator_name}</td>
                    <td className="p-4 text-sm">{log.projects?.project_name}</td>
                    <td className="p-4 text-sm font-mono">{log.start_time}</td>
                    <td className="p-4 text-sm font-mono">{log.end_time || '-'}</td>
                    <td className="p-4 text-sm">{log.fuel_liters}</td>
                    <td className="p-4 text-sm font-mono">{log.fuel_price ? `$${log.fuel_price}` : '-'}</td>
                    <td className="p-4 text-sm text-gray-700 italic max-w-xs truncate">{log.observations}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <LogbookAnalytics logs={logs} />
      )}
    </div>
  )
}
