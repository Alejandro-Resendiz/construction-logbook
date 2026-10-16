'use client'

import { useState, useEffect, useRef } from 'react'
import { createMachineryLog } from '@/app/actions'
import { DEFAULT_DIESEL_PRICE } from '@/lib/constants'
import { Html5Qrcode } from 'html5-qrcode'
import { toast } from 'sonner'
import { QrCode, ListFilter, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react'

interface MachineryLogFormProps {
  machinery: { machinery_id: number, machinery_full_name: string, machinery_serial_code?: string | null }[]
  projects: { project_id: number, project_name: string }[]
  dict: any
}

export default function MachineryLogForm({ machinery, projects, dict }: MachineryLogFormProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ hash_id?: string, error?: string } | null>(null)
  const [selectedMachineId, setSelectedMachineId] = useState('')
  
  // Scanner state: mode defaults to 'qr' per requirement
  const [scanMode, setScanMode] = useState<'qr' | 'manual'>('qr')
  const [isScanning, setIsScanning] = useState(true)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const machineryRef = useRef(machinery)
  machineryRef.current = machinery
  const lastScannedTimeRef = useRef<number>(0)
  const scannerRef = useRef<Html5Qrcode | null>(null)

  const selectedMachine = machinery.find((m) => String(m.machinery_id) === selectedMachineId)

  // Camera QR Scanner lifecycle
  useEffect(() => {
    if (scanMode !== 'qr' || !isScanning) return

    let isCancelled = false
    setCameraError(null)

    if (typeof window !== 'undefined' && !navigator?.mediaDevices?.getUserMedia) {
      setCameraError('Tu navegador o dispositivo no soporta acceso a la cámara. Por favor utiliza la selección manual.')
      return
    }

    const elementId = 'machinery-qr-reader'
    const container = document.getElementById(elementId)
    if (!container) return

    let html5QrCode: Html5Qrcode | null = null
    try {
      html5QrCode = new Html5Qrcode(elementId)
      scannerRef.current = html5QrCode
    } catch (e) {
      console.warn('Error instantiating Html5Qrcode:', e)
      return
    }

    const config = {
      fps: 10,
      qrbox: { width: 220, height: 220 },
      aspectRatio: 1.0,
    }

    html5QrCode
      .start(
        { facingMode: 'environment' },
        config,
        (decodedText: string) => {
          if (isCancelled) return
          handleScanSuccess(decodedText)
        },
        () => {
          // Normal frame scan tick without QR code, silent
        }
      )
      .then(() => {
        if (isCancelled && html5QrCode) {
          if (html5QrCode.isScanning) {
            html5QrCode.stop().then(() => {
              try {
                html5QrCode?.clear()
              } catch (_) {}
            }).catch(() => {})
          }
        }
      })
      .catch((err) => {
        if (isCancelled) return
        console.warn('Camera start error:', err)
        setCameraError('No se pudo acceder a la cámara. Por favor verifica los permisos o utiliza la selección manual.')
      })

    return () => {
      isCancelled = true
      if (html5QrCode) {
        if (html5QrCode.isScanning) {
          html5QrCode
            .stop()
            .then(() => {
              try {
                html5QrCode?.clear()
              } catch (_) {}
            })
            .catch((err) => console.warn('Error stopping scanner:', err))
        } else {
          try {
            html5QrCode.clear()
          } catch (_) {}
        }
      }
    }
  }, [scanMode, isScanning])

  const handleScanSuccess = (decodedText: string) => {
    const now = Date.now()
    // Debounce rapid frame matches within 2 seconds
    if (now - lastScannedTimeRef.current < 2000) return
    lastScannedTimeRef.current = now

    const trimmed = decodedText.trim()
    const match = trimmed.match(/^machinery:([a-zA-Z0-9_-]+)$/i)
    if (!match) {
      toast.error('Código QR inválido. Debe ser una etiqueta de maquinaria del sistema.')
      return
    }

    const scannedId = match[1]
    const matched = machineryRef.current.find((m) => String(m.machinery_id) === scannedId)
    if (!matched) {
      toast.error(`Maquinaria con ID #${scannedId} no encontrada en el catálogo.`)
      return
    }

    setSelectedMachineId(String(matched.machinery_id))
    setIsScanning(false)
    toast.success(`Maquinaria detectada: ${matched.machinery_full_name}`)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedMachineId) {
      toast.error('Por favor selecciona o escanea una maquinaria')
      return
    }
    setLoading(true)
    setResult(null)

    const formData = new FormData(e.currentTarget)
    const res = await createMachineryLog(formData)
    setResult(res)
    setLoading(false)
  }

  if (result?.hash_id) {
    return (
      <div className="text-center p-6 space-y-4">
        <div className="text-green-600 font-bold text-lg">{dict.success_title}</div>
        <p className="text-gray-600">{dict.success_hint}</p>
        <div className="bg-gray-100 p-4 rounded-lg text-2xl font-mono tracking-widest text-blue-700">
          {result.hash_id}
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
        >
          {dict.new_registration_button}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {result?.error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
          {result.error}
        </div>
      )}

      {/* Machinery Selector with QR Code Scanner / Manual Toggle */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            {dict.machinery}
          </label>
          <div className="inline-flex p-1 bg-gray-100 rounded-lg text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setScanMode('qr')
                setIsScanning(true)
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                scanMode === 'qr'
                  ? 'bg-white text-blue-600 shadow-sm font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <QrCode size={14} />
              <span>Escanear QR</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setScanMode('manual')
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                scanMode === 'manual'
                  ? 'bg-white text-blue-600 shadow-sm font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ListFilter size={14} />
              <span>Manual</span>
            </button>
          </div>
        </div>

        {/* QR Mode Viewport */}
        {scanMode === 'qr' && (
          <div className="space-y-3">
            {isScanning ? (
              <div className="relative border-2 border-dashed border-blue-200 rounded-xl p-3 bg-blue-50/30 text-center">
                <div
                  id="machinery-qr-reader"
                  className="w-full rounded-lg overflow-hidden bg-black mx-auto min-h-[220px] relative [&_video]:w-full [&_video]:h-full [&_video]:object-cover [&_video]:rounded-lg"
                />
                {cameraError ? (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2 text-left">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <div>
                      <p>{cameraError}</p>
                      <button
                        type="button"
                        onClick={() => setScanMode('manual')}
                        className="mt-1 font-semibold text-blue-600 underline hover:text-blue-800"
                      >
                        Cambiar a selección manual
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-blue-700 font-medium">
                    Apunte la cámara al código QR de la maquinaria
                  </p>
                )}
              </div>
            ) : (
              selectedMachine && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
                      <CheckCircle2 size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-emerald-900 truncate">
                        {selectedMachine.machinery_full_name}
                      </p>
                      <p className="text-[11px] text-emerald-700 font-mono">
                        {selectedMachine.machinery_serial_code
                          ? `Serie: ${selectedMachine.machinery_serial_code}`
                          : `ID: #${selectedMachine.machinery_id}`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsScanning(true)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors shrink-0"
                    title="Escanear otro código"
                  >
                    <RefreshCw size={12} />
                    <span>Re-escanear</span>
                  </button>
                </div>
              )
            )}
          </div>
        )}

        {/* Existing Machinery Dropdown */}
        <div>
          <select 
            name="machine_id" 
            required 
            value={selectedMachineId}
            onChange={(e) => setSelectedMachineId(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
          >
            <option value="">{dict.select_machinery}</option>
            {machinery.map((m) => (
              <option key={m.machinery_id} value={m.machinery_id}>{m.machinery_full_name}</option>
            ))}
          </select>
          {scanMode === 'qr' && !selectedMachineId && (
            <p className="mt-1 text-xs text-gray-400">
              Al escanear el código QR, la maquinaria se seleccionará automáticamente en esta lista.
            </p>
          )}
        </div>
      </div>

      {selectedMachine?.machinery_serial_code && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {dict.serial_code}
          </label>
          <input 
            type="text" 
            readOnly 
            value={selectedMachine.machinery_serial_code}
            className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 outline-none text-gray-900 font-mono cursor-not-allowed"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{dict.project}</label>
        <select 
          name="project_id" 
          required 
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
        >
          <option value="">{dict.select_project}</option>
          {projects.map((p) => (
            <option key={p.project_id} value={p.project_id}>{p.project_name}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500 italic">
          {dict.project_hint}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{dict.date}</label>
        <input 
          type="date" 
          name="date" 
          required 
          defaultValue={new Date().toISOString().split('T')[0]}
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{dict.operator_name}</label>
        <input 
          type="text" 
          name="operator_name" 
          required 
          placeholder={dict.operator_placeholder}
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{dict.start_time}</label>
        <input 
          type="time" 
          name="start_time" 
          required 
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{dict.fuel_liters}</label>
        <input 
          type="number" 
          step="0.01" 
          name="fuel_liters" 
          required 
          placeholder={dict.fuel_placeholder}
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{dict.fuel_price}</label>
        <input 
          type="number" 
          step="0.01" 
          name="fuel_price" 
          required
          defaultValue={DEFAULT_DIESEL_PRICE.toFixed(2)}
          placeholder={dict.fuel_price_placeholder || DEFAULT_DIESEL_PRICE.toFixed(2)}
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
        />
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? dict.submitting : dict.submit}
      </button>
    </form>
  )
}
