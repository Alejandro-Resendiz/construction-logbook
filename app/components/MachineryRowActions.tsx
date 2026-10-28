'use client'

import { useState, useRef, useEffect } from 'react'
import { Edit2, Trash2, X, Save, ChevronDown, ChevronRight, ShieldCheck, QrCode, Loader2, FileText, FileCode, Truck, Wrench } from 'lucide-react'
import { updateMachinery, deleteMachinery } from '@/app/app/machinery/actions'
import { useMachineryStore } from '@/lib/store/machineryStore'
import { exportMachineryQrPdf, exportMachineryQrSvg } from '@/lib/pdf/machineryQrExporter'
import { toast } from 'sonner'

interface MachineryRowActionsProps {
  machine: any
  dict: any
}

export default function MachineryRowActions({ machine, dict }: MachineryRowActionsProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [externalCode, setExternalCode] = useState(machine.external_code || '')
  const [fullName, setFullName] = useState(machine.machinery_full_name || '')
  const [shortName, setShortName] = useState(machine.machinery_name || '')
  const [model, setModel] = useState(machine.machinery_model || '')
  const [serialCode, setSerialCode] = useState(machine.machinery_serial_code || '')
  const [machineType, setMachineType] = useState(machine.machine_type || 'machine')
  const [expectedHours, setExpectedHours] = useState(machine.expected_consumption_hours?.toString() || '')
  const [expectedLiters, setExpectedLiters] = useState(machine.expected_consumption_liters?.toString() || '')
  const [observations, setObservations] = useState(machine.observations || '')
  const [isRented, setIsRented] = useState(!!machine.is_rented)
  const [loading, setLoading] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [exportingFormat, setExportingFormat] = useState<'pdf' | 'svg' | null>(null)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  // Use Zustand store actions
  const { removeMachine, updateMachine: updateLocalMachine } = useMachineryStore()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false)
      }
    }
    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showExportMenu])

  const handleExportPdf = async () => {
    setShowExportMenu(false)
    try {
      setExportingFormat('pdf')
      await exportMachineryQrPdf(machine)
      toast.success('Ficha PDF con QR generada exitosamente')
    } catch (err) {
      console.error('Error al exportar QR a PDF:', err)
      toast.error('Error al generar la ficha PDF del código QR')
    } finally {
      setExportingFormat(null)
    }
  }

  const handleExportSvg = () => {
    setShowExportMenu(false)
    try {
      setExportingFormat('svg')
      exportMachineryQrSvg(machine)
      toast.success('Vector SVG del QR descargado exitosamente')
    } catch (err) {
      console.error('Error al exportar QR a SVG:', err)
      toast.error('Error al generar el vector SVG')
    } finally {
      setExportingFormat(null)
    }
  }

  const handleUpdate = async () => {
    setLoading(true)
    const formData = new FormData()
    formData.append('external_code', externalCode)
    formData.append('machinery_full_name', fullName)
    formData.append('machinery_name', shortName)
    formData.append('machinery_model', model)
    formData.append('machinery_serial_code', serialCode)
    formData.append('machine_type', machineType)
    formData.append('expected_consumption_hours', expectedHours)
    formData.append('expected_consumption_liters', expectedLiters)
    formData.append('observations', observations)
    formData.append('is_rented', isRented ? 'true' : 'false')
    
    const res = await updateMachinery(machine.machinery_id, formData)
    if (res.success && res.machine) {
      updateLocalMachine(machine.machinery_id, res.machine)
      toast.success(dict.common.notifications?.success_update || 'Actualizado correctamente')
      setIsEditing(false)
    } else {
      const errorMsg = dict.common.notifications?.[res.error as string] || dict.common.notifications?.error_update || 'Error al actualizar'
      toast.error(errorMsg)
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (confirm('¿Estás seguro de eliminar esta maquina?')) {
      setLoading(true)
      const res = await deleteMachinery(machine.machinery_id)
      if (res.success) {
        removeMachine(machine.machinery_id)
        toast.success(dict.common.notifications?.success_delete || 'Eliminado correctamente')
      } else {
        toast.error(dict.common.notifications?.error_delete || 'Error al eliminar')
      }
      setLoading(false)
    }
  }

  if (isEditing) {
    return (
      <tr className="bg-blue-50 border-b border-blue-100">
        <td colSpan={9} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-blue-600 uppercase">{dict.admin.machinery.external_code}</label>
              <input 
                type="text" value={externalCode} onChange={(e) => setExternalCode(e.target.value)} 
                className="w-full p-2 border rounded bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-bold text-blue-600 uppercase">{dict.admin.machinery.full_name}</label>
              <input 
                type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} 
                className="w-full p-2 border rounded bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" required 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-blue-600 uppercase">{dict.admin.machinery.short_name}</label>
              <input 
                type="text" value={shortName} onChange={(e) => setShortName(e.target.value)} 
                className="w-full p-2 border rounded bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" required 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-blue-600 uppercase">{dict.admin.machinery.model}</label>
              <input 
                type="text" value={model} onChange={(e) => setModel(e.target.value)} 
                className="w-full p-2 border rounded bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-blue-600 uppercase">{dict.admin.machinery.serial_code}</label>
              <input 
                type="text" value={serialCode} onChange={(e) => setSerialCode(e.target.value)} 
                className="w-full p-2 border rounded bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-blue-600 uppercase">Tipo</label>
              <select
                value={machineType}
                onChange={(e) => setMachineType(e.target.value)}
                className="w-full p-2 border rounded bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="machine">Máquina</option>
                <option value="truck">Camión</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-blue-600 uppercase">Horas Estándar (h)</label>
              <input 
                type="number" step="0.1" value={expectedHours} onChange={(e) => setExpectedHours(e.target.value)} 
                placeholder="Ej: 8.0"
                className="w-full p-2 border rounded bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-blue-600 uppercase">Litros Estándar (L)</label>
                {Number(expectedHours) > 0 && Number(expectedLiters) > 0 && (
                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                    {(Number(expectedLiters) / Number(expectedHours)).toFixed(1)} L/h
                  </span>
                )}
              </div>
              <input 
                type="number" step="0.1" value={expectedLiters} onChange={(e) => setExpectedLiters(e.target.value)} 
                placeholder="Ej: 160.0"
                className="w-full p-2 border rounded bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-blue-600 uppercase mb-2 block">{dict.admin.machinery.is_rented}</label>
              <label className="inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={isRented} onChange={(e) => setIsRented(e.target.checked)} className="sr-only peer" />
                <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-bold text-blue-600 uppercase">{dict.update_log.observations}</label>
              <input 
                type="text" value={observations} onChange={(e) => setObservations(e.target.value)} 
                className="w-full p-2 border rounded bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button 
              onClick={() => setIsEditing(false)} 
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X size={16} />
              {dict.common.cancel}
            </button>
            <button 
              onClick={handleUpdate} 
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Save size={16} />
              {loading ? dict.admin.machinery.creating : dict.common.save}
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <>
      <tr className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${isExpanded ? 'bg-gray-50/30' : ''}`}>
        <td className="p-4 w-10">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
          >
            {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </button>
        </td>
        <td className="p-4 text-sm font-mono text-gray-500">{machine.external_code || '-'}</td>
        <td className="p-4 font-medium text-gray-900">{machine.machinery_full_name}</td>
        <td className="p-4 text-sm text-gray-600">{machine.machinery_name}</td>
        <td className="p-4 text-sm text-gray-600">{machine.machinery_model || '-'}</td>
        <td className="p-4 text-sm text-gray-600">{machine.machinery_serial_code || '-'}</td>
        <td className="p-4 text-sm">
          <div className="flex flex-col gap-1 items-start">
            {machine.machine_type === 'truck' ? (
              <span className="px-2.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1">
                <Truck size={11} className="shrink-0" />
                Camión
              </span>
            ) : (
              <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1">
                <Wrench size={11} className="shrink-0" />
                Máquina
              </span>
            )}
            {Number(machine.expected_consumption_rate) > 0 ? (
              <span className="text-[11px] font-mono text-gray-500 font-medium">
                {Number(machine.expected_consumption_rate).toFixed(1)} L/h
              </span>
            ) : (
              <span className="text-[10px] text-gray-400 italic">Sin tasa</span>
            )}
          </div>
        </td>
        <td className="p-4 text-sm">
          {machine.is_rented ? (
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
              {dict.common.yes}
            </span>
          ) : (
            <span className="px-3 py-1 bg-gray-100 text-gray-400 rounded-full text-[10px] font-bold uppercase tracking-wider">
              {dict.common.no}
            </span>
          )}
        </td>
        <td className="p-4 text-right">
          <div className="flex justify-end items-center gap-2">
            <div className="relative" ref={exportMenuRef}>
              <button
                type="button"
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={!!exportingFormat}
                className={`p-2 rounded-lg transition-all flex items-center gap-0.5 ${
                  showExportMenu
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'
                } disabled:opacity-50`}
                title="Exportar QR (PDF / SVG)"
              >
                {exportingFormat ? (
                  <Loader2 size={18} className="animate-spin text-indigo-600" />
                ) : (
                  <>
                    <QrCode size={18} />
                    <ChevronDown size={12} className={`transition-transform duration-200 ${showExportMenu ? 'rotate-180 text-indigo-600' : 'text-gray-400'}`} />
                  </>
                )}
              </button>

              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-left">
                  <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50">
                    Exportar Código QR
                  </div>
                  <button
                    type="button"
                    onClick={handleExportPdf}
                    className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2.5 transition-colors"
                  >
                    <FileText size={15} className="text-rose-500 shrink-0" />
                    <div>
                      <span className="font-medium block leading-tight">Ficha PDF</span>
                      <span className="text-[10px] text-gray-400">Hoja Carta imprimible</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportSvg}
                    className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2.5 transition-colors"
                  >
                    <FileCode size={15} className="text-amber-500 shrink-0" />
                    <div>
                      <span className="font-medium block leading-tight">Vector SVG</span>
                      <span className="text-[10px] text-gray-400">Código QR puro</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <button 
              onClick={() => setIsEditing(true)} 
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
              title={dict.common.edit}
            >
              <Edit2 size={18} />
            </button>
            <button 
              onClick={handleDelete} 
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
              title={dict.common.delete}
            >
              <Trash2 size={18} />
            </button>
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-gray-50/50 border-b border-gray-100 animate-in fade-in slide-in-from-top-1 duration-200">
          <td colSpan={9} className="p-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                {dict.update_log.observations}
              </label>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {machine.observations || (
                  <span className="text-gray-400 italic">Sin observaciones registradas.</span>
                )}
              </p>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
