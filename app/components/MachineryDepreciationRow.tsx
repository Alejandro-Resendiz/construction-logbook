'use client'

import { useState } from 'react'
import { Edit2, Save, X } from 'lucide-react'
import { useMachineryDepreciationStore } from '@/lib/store/machineryDepreciationStore'
import { toast } from 'sonner'

interface MachineryDepreciationRowProps {
  depr: any
  dict: any
}

export default function MachineryDepreciationRow({ depr, dict }: MachineryDepreciationRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    optimal_fuel_consumption: depr.optimal_fuel_consumption,
    service_life: depr.service_life,
    purchase_value: depr.purchase_value,
    rescue_value: depr.rescue_value * 100 // Convert to percentage for display
  })

  const { upsertDepreciation } = useMachineryDepreciationStore()

  const handleSave = async () => {
    const res = await upsertDepreciation({
      machinery_id: depr.machinery_id,
      optimal_fuel_consumption: Number(formData.optimal_fuel_consumption),
      service_life: Number(formData.service_life),
      purchase_value: Number(formData.purchase_value),
      rescue_value: Number(formData.rescue_value) / 100
    })

    if (res.success) {
      toast.success(dict.common.notifications?.success_update || 'Actualizado correctamente')
      setIsEditing(false)
    } else {
      toast.error(dict.common.notifications?.error_update || 'Error al actualizar')
    }
  }

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="p-4 font-medium text-gray-900">
        {depr.machinery?.external_code}
      </td>
      <td className="p-4 text-gray-600">
        {depr.machinery?.machinery_full_name}
      </td>
      <td className="p-4 text-gray-600">
        {isEditing ? (
          <input 
            type="number" 
            step="0.01"
            value={formData.optimal_fuel_consumption}
            onChange={(e) => setFormData({ ...formData, optimal_fuel_consumption: e.target.value as any })}
            className="w-24 p-1 border border-gray-300 rounded outline-none focus:ring-1 focus:ring-blue-500"
          />
        ) : (
          `${depr.optimal_fuel_consumption} L/h`
        )}
      </td>
      <td className="p-4 text-gray-600">
        {isEditing ? (
          <input 
            type="number" 
            value={formData.service_life}
            onChange={(e) => setFormData({ ...formData, service_life: e.target.value as any })}
            className="w-20 p-1 border border-gray-300 rounded outline-none focus:ring-1 focus:ring-blue-500"
          />
        ) : (
          `${depr.service_life} años`
        )}
      </td>
      <td className="p-4 text-gray-600">
        {isEditing ? (
          <input 
            type="number" 
            step="0.01"
            value={formData.purchase_value}
            onChange={(e) => setFormData({ ...formData, purchase_value: e.target.value as any })}
            className="w-32 p-1 border border-gray-300 rounded outline-none focus:ring-1 focus:ring-blue-500"
          />
        ) : (
          `$${Number(depr.purchase_value).toLocaleString()}`
        )}
      </td>
      <td className="p-4 text-gray-600">
        {isEditing ? (
          <div className="flex items-center gap-1">
            <input 
              type="number" 
              step="0.1"
              value={formData.rescue_value}
              onChange={(e) => setFormData({ ...formData, rescue_value: e.target.value as any })}
              className="w-16 p-1 border border-gray-300 rounded outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span>%</span>
          </div>
        ) : (
          `${(depr.rescue_value * 100).toFixed(1)}%`
        )}
      </td>
      <td className="p-4 text-right">
        {isEditing ? (
          <div className="flex justify-end gap-2">
            <button 
              onClick={handleSave}
              className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
            >
              <Save size={18} />
            </button>
            <button 
              onClick={() => {
                setIsEditing(false)
                setFormData({
                  optimal_fuel_consumption: depr.optimal_fuel_consumption,
                  service_life: depr.service_life,
                  purchase_value: depr.purchase_value,
                  rescue_value: depr.rescue_value * 100
                })
              }}
              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setIsEditing(true)}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
          >
            <Edit2 size={18} />
          </button>
        )}
      </td>
    </tr>
  )
}
