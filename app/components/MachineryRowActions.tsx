'use client'

import { useState } from 'react'
import { Edit2, Trash2, X, Save, ChevronDown, ChevronRight, ShieldCheck } from 'lucide-react'
import { updateMachinery, deleteMachinery } from '@/app/app/machinery/actions'
import { useMachineryStore } from '@/lib/store/machineryStore'
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
  const [observations, setObservations] = useState(machine.observations || '')
  const [isRented, setIsRented] = useState(!!machine.is_rented)
  const [loading, setLoading] = useState(false)

  // Use Zustand store actions
  const { removeMachine, updateMachine: updateLocalMachine } = useMachineryStore()

  const handleUpdate = async () => {
    setLoading(true)
    const formData = new FormData()
    formData.append('external_code', externalCode)
    formData.append('machinery_full_name', fullName)
    formData.append('machinery_name', shortName)
    formData.append('machinery_model', model)
    formData.append('machinery_serial_code', serialCode)
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
        <td colSpan={8} className="p-6">
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
          <div className="flex justify-end gap-2">
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
          <td colSpan={8} className="p-6">
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
