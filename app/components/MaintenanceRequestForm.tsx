'use client'

import { useState } from 'react'
import { Plus, Trash2, Upload, X, CheckCircle2, Loader2, Paperclip } from 'lucide-react'
import { createMaintenanceRequest, uploadMaintenanceAttachment } from '@/app/app/maintenance/actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface SparePart {
  id: string
  description: string
  quantity: number
  amount: number | null
}

interface MaintenanceRequestFormProps {
  machinery: any[]
  dict: any
}

export default function MaintenanceRequestForm({ machinery, dict }: MaintenanceRequestFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [spareParts, setSpareParts] = useState<SparePart[]>([])
  const [attachments, setAttachments] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const addSparePart = () => {
    setSpareParts([...spareParts, { 
      id: Math.random().toString(36).substr(2, 9),
      description: '', 
      quantity: 1, 
      amount: null 
    }])
  }

  const removeSparePart = (id: string) => {
    setSpareParts(spareParts.filter((p) => p.id !== id))
  }

  const updateSparePart = (id: string, field: keyof SparePart, value: any) => {
    setSpareParts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments([...attachments, ...Array.from(e.target.files)])
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    
    // Set is_external based on radio value
    const isExternal = formData.get('is_external') === 'true'
    formData.set('is_external', isExternal ? 'true' : 'false')

    try {
      // 1. Upload attachments first
      setIsUploading(true)
      const attachmentUrls = []
      for (const file of attachments) {
        const url = await uploadMaintenanceAttachment(file)
        attachmentUrls.push(url)
      }
      setIsUploading(false)

      // 2. Create request
      // Remove ID from spare parts before sending to DB
      const cleanSpareParts = spareParts.map(({ id, ...rest }) => rest)
      const res = await createMaintenanceRequest(formData, cleanSpareParts, attachmentUrls)
      
      if (res.success) {
        toast.success(dict.maintenance.success_create)
        router.push('/app/maintenance')
        router.refresh()
      } else {
        toast.error(res.error || 'Error al crear el registro')
      }
    } catch (error) {
      console.error(error)
      toast.error('Ocurrió un error inesperado')
    } finally {
      setLoading(false)
      setIsUploading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider text-[10px]">
              {dict.maintenance.machinery}
            </label>
            <select 
              name="machine_id" 
              required 
              className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">{dict.common.select_placeholder}</option>
              {machinery.map(m => (
                <option key={m.machinery_id} value={m.machinery_id}>
                  [{m.external_code}] {m.machinery_full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider text-[10px]">
              {dict.maintenance.maintenance_type}
            </label>
            <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-200">
              <label className="flex-1 cursor-pointer">
                <input type="radio" name="maintenance_type" value="preventive" defaultChecked className="sr-only peer" />
                <div className="text-center py-2 text-xs font-bold rounded-md peer-checked:bg-white peer-checked:shadow-sm peer-checked:text-blue-600 text-gray-500 transition-all">
                  {dict.maintenance.preventive}
                </div>
              </label>
              <label className="flex-1 cursor-pointer">
                <input type="radio" name="maintenance_type" value="corrective" className="sr-only peer" />
                <div className="text-center py-2 text-xs font-bold rounded-md peer-checked:bg-white peer-checked:shadow-sm peer-checked:text-blue-600 text-gray-500 transition-all">
                  {dict.maintenance.corrective}
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider text-[10px]">
              {dict.maintenance.is_external}
            </label>
            <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-200">
              <label className="flex-1 cursor-pointer">
                <input type="radio" name="is_external" value="false" defaultChecked className="sr-only peer" />
                <div className="text-center py-2 text-xs font-bold rounded-md peer-checked:bg-white peer-checked:shadow-sm peer-checked:text-blue-600 text-gray-500 transition-all">
                  Interno
                </div>
              </label>
              <label className="flex-1 cursor-pointer">
                <input type="radio" name="is_external" value="true" className="sr-only peer" />
                <div className="text-center py-2 text-xs font-bold rounded-md peer-checked:bg-white peer-checked:shadow-sm peer-checked:text-blue-600 text-gray-500 transition-all">
                  Externo
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider text-[10px]">
              {dict.maintenance.last_maintenance}
            </label>
            <input 
              type="date" 
              name="last_maintenance_date" 
              className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider text-[10px]">
              {dict.maintenance.next_maintenance}
            </label>
            <input 
              type="date" 
              name="next_maintenance_date" 
              className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider text-[10px]">
              {dict.maintenance.date}
            </label>
            <input 
              type="date" 
              name="date" 
              required 
              defaultValue={new Date().toISOString().split('T')[0]}
              className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>
        </div>
      </div>

      {/* Description - Full Row */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider text-[10px]">
          {dict.maintenance.description}
        </label>
        <textarea 
          name="description" 
          required 
          rows={4}
          className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          placeholder="Describa el trabajo realizado o solicitado..."
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider text-[10px]">
            {dict.maintenance.cost} (MXN)
          </label>
          <input 
            type="number" 
            step="0.01" 
            name="cost" 
            placeholder="0.00"
            className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider text-[10px]">
            {dict.maintenance.worked_time} (h)
          </label>
          <input 
            type="number" 
            step="0.1" 
            name="worked_time" 
            placeholder="0.0"
            className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider text-[10px]">
            {dict.maintenance.downtime} (h)
          </label>
          <input 
            type="number" 
            step="0.1" 
            name="downtime" 
            placeholder="0.0"
            className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>
      </div>

      {/* Spare Parts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
            <CheckCircle2 size={16} className="text-blue-500" />
            {dict.maintenance.spare_parts}
          </h3>
          <button 
            type="button" 
            onClick={addSparePart}
            className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline"
          >
            <Plus size={14} />
            {dict.maintenance.add_spare_part}
          </button>
        </div>

        {spareParts.length > 0 ? (
          <div className="space-y-3">
            {spareParts.map((part) => (
              <div key={part.id} className="flex flex-col md:flex-row gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200 items-end">
                <div className="flex-1 w-full">
                  <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">{dict.maintenance.spare_description}</label>
                  <input 
                    type="text" 
                    value={part.description}
                    onChange={(e) => updateSparePart(part.id, 'description', e.target.value)}
                    className="w-full p-2 text-sm border border-gray-300 rounded outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <div className="w-full md:w-24">
                  <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">{dict.maintenance.spare_quantity}</label>
                  <input 
                    type="number" 
                    value={part.quantity === 0 ? '' : part.quantity}
                    onChange={(e) => updateSparePart(part.id, 'quantity', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                    className="w-full p-2 text-sm border border-gray-300 rounded outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <div className="w-full md:w-32">
                  <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">{dict.maintenance.spare_amount}</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={part.amount === null ? '' : part.amount}
                    onChange={(e) => updateSparePart(part.id, 'amount', e.target.value === '' ? null : parseFloat(e.target.value))}
                    className="w-full p-2 text-sm border border-gray-300 rounded outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <button 
                  type="button" 
                  onClick={() => removeSparePart(part.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors mb-[2px]"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">No se han agregado refacciones.</p>
        )}
      </div>

      {/* Observations */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider text-[10px]">
          {dict.maintenance.observations}
        </label>
        <textarea 
          name="observations" 
          rows={3}
          className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
        />
      </div>

      {/* Attachments */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
            <Paperclip size={16} className="text-blue-500" />
            {dict.maintenance.attachments}
          </h3>
          <label className="cursor-pointer text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline">
            <Upload size={14} />
            Subir Archivos
            <input 
              type="file" 
              multiple 
              className="hidden" 
              accept="image/*,application/pdf"
              onChange={handleFileChange}
            />
          </label>
        </div>

        {attachments.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {attachments.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-blue-50 p-2 rounded-lg border border-blue-100">
                <span className="text-xs text-blue-700 truncate flex-1 pr-2">{file.name}</span>
                <button 
                  type="button" 
                  onClick={() => removeAttachment(index)}
                  className="text-blue-400 hover:text-red-500"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="pt-4">
        <button 
          type="submit" 
          disabled={loading || isUploading}
          className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:bg-gray-400 transition-all shadow-md flex items-center justify-center gap-2"
        >
          {(loading || isUploading) ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              {isUploading ? 'Subiendo archivos...' : 'Procesando...'}
            </>
          ) : (
            dict.maintenance.create
          )}
        </button>
      </div>
    </form>
  )
}
