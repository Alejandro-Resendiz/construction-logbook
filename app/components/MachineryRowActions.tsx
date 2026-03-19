'use client'

import { useState } from 'react'
import { Edit2, Trash2, Check, X, Save } from 'lucide-react'
import { updateMachinery, deleteMachinery } from '@/app/admin/machinery/actions'
import { useMachineryStore } from '@/lib/store/machineryStore'

interface MachineryRowActionsProps {
  machine: any
  dict: any
}

export default function MachineryRowActions({ machine, dict }: MachineryRowActionsProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [externalCode, setExternalCode] = useState(machine.external_code || '')
  const [fullName, setFullName] = useState(machine.machinery_full_name || '')
  const [shortName, setShortName] = useState(machine.machinery_name || '')
  const [model, setModel] = useState(machine.machinery_model || '')
  const [serialCode, setSerialCode] = useState(machine.machinery_serial_code || '')
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
    
    const res = await updateMachinery(machine.machinery_id, formData)
    if (res.success && res.machine) {
      updateLocalMachine(machine.machinery_id, res.machine)
      setIsEditing(false)
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (confirm('¿Estás seguro de eliminar esta maquina?')) {
      setLoading(true)
      const res = await deleteMachinery(machine.machinery_id)
      if (res.success) {
        removeMachine(machine.machinery_id)
      }
      setLoading(false)
    }
  }

  if (isEditing) {
    return (
      <tr className="bg-blue-50 border-b border-blue-100">
        <td colSpan={6} className="p-6">
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
    <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
      <td className="p-4 text-sm font-mono text-gray-500">{machine.external_code || '-'}</td>
      <td className="p-4 font-medium text-gray-900">{machine.machinery_full_name}</td>
      <td className="p-4 text-sm text-gray-600">{machine.machinery_name}</td>
      <td className="p-4 text-sm text-gray-600">{machine.machinery_model || '-'}</td>
      <td className="p-4 text-sm text-gray-600">{machine.machinery_serial_code || '-'}</td>
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
  )
}
