'use client'

import { useState } from 'react'
import { Save, Upload, X, Loader2, Paperclip, ExternalLink, ArrowLeft } from 'lucide-react'
import { updateMaintenanceDetails, uploadMaintenanceAttachment } from '@/app/app/maintenance/actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface MaintenanceEditFormProps {
  request: any
  dict: any
}

export default function MaintenanceEditForm({ request, dict }: MaintenanceEditFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [observations, setObservations] = useState(request.observations || '')
  const [attachments, setAttachments] = useState<string[]>(request.attachments || [])
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewFiles([...newFiles, ...Array.from(e.target.files)])
    }
  }

  const removeNewFile = (index: number) => {
    setNewFiles(newFiles.filter((_, i) => i !== index))
  }

  const removeExistingAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 1. Upload new files
      setIsUploading(true)
      const uploadedUrls = []
      for (const file of newFiles) {
        const url = await uploadMaintenanceAttachment(file)
        uploadedUrls.push(url)
      }
      setIsUploading(false)

      // 2. Update details
      const finalAttachments = [...attachments, ...uploadedUrls]
      const res = await updateMaintenanceDetails(request.maintenance_request_id, observations, finalAttachments)
      
      if (res.success) {
        toast.success(dict.maintenance.success_update)
        router.push('/app/maintenance')
        router.refresh()
      } else {
        toast.error(res.error || 'Error al actualizar el registro')
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
    <div className="space-y-8">
      {/* Read-Only Info Summary */}
      <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{dict.maintenance.machinery}</label>
          <p className="font-bold text-gray-900">[{request.machinery?.external_code}] {request.machinery?.machinery_full_name}</p>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{dict.maintenance.type}</label>
          <div className="flex gap-2">
            <p className="font-medium text-gray-700 capitalize">{dict.maintenance[request.maintenance_type]}</p>
            {request.is_external && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border bg-purple-50 text-purple-600 border-purple-100">
                {dict.maintenance.is_external}
              </span>
            )}
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{dict.maintenance.date}</label>
          <p className="font-medium text-gray-700">{request.date}</p>
        </div>
        <div className="md:col-span-3 space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{dict.maintenance.description}</label>
          <p className="text-sm text-gray-700">{request.description}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Observations */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider text-[10px]">
            {dict.maintenance.observations}
          </label>
          <textarea 
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            rows={5}
            className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 shadow-sm"
            placeholder="Detalles adicionales sobre el servicio realizado..."
          />
        </div>

        {/* Attachments Management */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <Paperclip size={16} className="text-blue-500" />
              {dict.maintenance.attachments}
            </h3>
            <label className="cursor-pointer text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline">
              <Upload size={14} />
              Agregar Archivos
              <input 
                type="file" 
                multiple 
                className="hidden" 
                accept="image/*,application/pdf"
                onChange={handleFileChange}
              />
            </label>
          </div>

          {/* Existing Attachments */}
          {attachments.length > 0 && (
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-gray-400 uppercase">Archivos actuales</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {attachments.map((url, index) => (
                  <div key={index} className="flex items-center justify-between bg-white border border-gray-200 p-2 rounded-lg shadow-sm group">
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate flex-1 flex items-center gap-2">
                      <ExternalLink size={12} />
                      Documento {index + 1}
                    </a>
                    <button 
                      type="button" 
                      onClick={() => removeExistingAttachment(index)}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Files to Upload */}
          {newFiles.length > 0 && (
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-blue-400 uppercase">Nuevos para subir</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {newFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-blue-50 border border-blue-100 p-2 rounded-lg">
                    <span className="text-xs text-blue-700 truncate flex-1">{file.name}</span>
                    <button 
                      type="button" 
                      onClick={() => removeNewFile(index)}
                      className="text-blue-400 hover:text-red-500"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-4 pt-4">
          <Link 
            href="/app/maintenance"
            className="flex-1 flex items-center justify-center gap-2 py-3 border border-gray-300 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-all"
          >
            <ArrowLeft size={18} />
            {dict.common.cancel}
          </Link>
          <button 
            type="submit" 
            disabled={loading || isUploading}
            className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:bg-gray-400 transition-all shadow-md flex items-center justify-center gap-2"
          >
            {(loading || isUploading) ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                {isUploading ? 'Subiendo archivos...' : 'Guardando...'}
              </>
            ) : (
              <>
                <Save size={20} />
                {dict.common.save}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
