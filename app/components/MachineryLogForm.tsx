'use client'

import { useState, useEffect, useRef } from 'react'
import {
  createMachineryLog,
  getActiveShiftForMachine,
  pauseShift,
  resumeShift,
  completeShift,
} from '@/app/actions'
import { DEFAULT_DIESEL_PRICE } from '@/lib/constants'
import { Html5Qrcode } from 'html5-qrcode'
import { toast } from 'sonner'
import {
  QrCode,
  ListFilter,
  CheckCircle2,
  Truck,
  Wrench,
  Clock,
  Fuel,
  Pause,
  Play,
  LogOut,
  AlertCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react'

interface MachineryLogFormProps {
  machinery: {
    machinery_id: number
    machinery_full_name: string
    machinery_serial_code?: string | null
    machine_type?: string | null
    expected_consumption_rate?: number | null
  }[]
  projects: { project_id: number; project_name: string }[]
  dict: any
}

const PAUSE_REASONS = [
  'Falla mecánica / Mantenimiento',
  'Clima / Lluvia',
  'Falta de material / En espera',
  'Comida / Descanso',
  'Otro',
]

export default function MachineryLogForm({ machinery, projects, dict }: MachineryLogFormProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ hash_id?: string; is_completed?: boolean; error?: string } | null>(null)
  const [selectedMachineId, setSelectedMachineId] = useState('')
  const [fuelLiters, setFuelLiters] = useState('')

  // Scan mode: default QR, persisted in localStorage
  const [scanMode, setScanMode] = useState<'qr' | 'manual'>('qr')
  const [isScanning, setIsScanning] = useState(true)
  const [cameraError, setCameraError] = useState<string | null>(null)

  // Active shift lifecycle
  const [activeShift, setActiveShift] = useState<any | null>(null)
  const [checkingShift, setCheckingShift] = useState(false)

  // Pause modal
  const [showPauseModal, setShowPauseModal] = useState(false)
  const [pauseReason, setPauseReason] = useState(PAUSE_REASONS[0])
  const [pauseNotes, setPauseNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Complete modal
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [completeEndTime, setCompleteEndTime] = useState(new Date().toTimeString().slice(0, 5))
  const [completeObservations, setCompleteObservations] = useState('')

  const machineryRef = useRef(machinery)
  machineryRef.current = machinery
  const lastScannedTimeRef = useRef<number>(0)
  const scannerRef = useRef<Html5Qrcode | null>(null)

  const selectedMachine = machinery.find((m) => String(m.machinery_id) === selectedMachineId)
  const isTruck = selectedMachine?.machine_type === 'truck'
  const isMachineType = selectedMachine ? !isTruck : false
  const expectedRate = Number(selectedMachine?.expected_consumption_rate || 0)
  // Estimated hours shown only in manual mode (fuel/rate calculation)
  const estimatedHours =
    scanMode === 'manual' && expectedRate > 0 && Number(fuelLiters) > 0
      ? (Number(fuelLiters) / expectedRate).toFixed(1)
      : null

  // Restore persisted scan mode on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sigma_machinery_scan_mode')
      if (saved === 'qr' || saved === 'manual') setScanMode(saved as 'qr' | 'manual')
    } catch (_) {}
  }, [])

  const handleScanModeChange = (mode: 'qr' | 'manual') => {
    setScanMode(mode)
    if (mode === 'qr') setIsScanning(true)
    try {
      localStorage.setItem('sigma_machinery_scan_mode', mode)
    } catch (_) {}
  }

  // Check active shift whenever machine selection changes
  useEffect(() => {
    if (!selectedMachineId) {
      setActiveShift(null)
      return
    }
    let isMounted = true
    const check = async () => {
      setCheckingShift(true)
      try {
        const res = await getActiveShiftForMachine(parseInt(selectedMachineId))
        if (!isMounted) return
        if (res.wasOrphanClosed) {
          toast.info('Se cerró automáticamente un turno anterior que superó las 8 horas.')
        }
        setActiveShift(res.activeShift || null)
      } catch (err) {
        console.error('Error checking active shift:', err)
      } finally {
        if (isMounted) setCheckingShift(false)
      }
    }
    check()
    return () => { isMounted = false }
  }, [selectedMachineId])

  // QR camera scanner lifecycle
  useEffect(() => {
    if (scanMode !== 'qr' || !isScanning) return

    let isCancelled = false
    setCameraError(null)

    if (typeof window !== 'undefined' && !navigator?.mediaDevices?.getUserMedia) {
      setCameraError('Tu navegador o dispositivo no soporta acceso a la cámara. Usá la selección manual.')
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

    html5QrCode
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1.0 },
        (decodedText: string) => {
          if (isCancelled) return
          handleScanSuccess(decodedText)
        },
        () => {}
      )
      .then(() => {
        if (isCancelled && html5QrCode?.isScanning) {
          html5QrCode.stop().then(() => { try { html5QrCode?.clear() } catch (_) {} }).catch(() => {})
        }
      })
      .catch((err) => {
        if (isCancelled) return
        console.warn('Camera start error:', err)
        setCameraError('No se pudo acceder a la cámara. Verificá los permisos o usá la selección manual.')
      })

    return () => {
      isCancelled = true
      if (html5QrCode) {
        if (html5QrCode.isScanning) {
          html5QrCode.stop().then(() => { try { html5QrCode?.clear() } catch (_) {} }).catch((e) => console.warn('Error stopping scanner:', e))
        } else {
          try { html5QrCode.clear() } catch (_) {}
        }
      }
    }
  }, [scanMode, isScanning])

  const handleScanSuccess = (decodedText: string) => {
    const now = Date.now()
    if (now - lastScannedTimeRef.current < 2000) return
    lastScannedTimeRef.current = now

    const trimmed = decodedText.trim()
    const match = trimmed.match(/^machinery:([a-zA-Z0-9_-]+)$/i)
    if (!match) {
      toast.error('Código QR inválido. Debe pertenecer a una maquinaria del sistema.')
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

  // Pause
  const handlePauseShift = async () => {
    if (!activeShift) return
    setActionLoading(true)
    try {
      const res = await pauseShift(activeShift.machinery_log_id, pauseReason, pauseNotes)
      if (res.success) {
        toast.warning('Turno pausado')
        setShowPauseModal(false)
        setPauseNotes('')
        const ref = await getActiveShiftForMachine(parseInt(selectedMachineId))
        setActiveShift(ref.activeShift || null)
      } else {
        toast.error(res.error || 'Error al pausar el turno')
      }
    } catch { toast.error('Error al pausar el turno') }
    finally { setActionLoading(false) }
  }

  // Resume
  const handleResumeShift = async () => {
    if (!activeShift) return
    setActionLoading(true)
    try {
      const res = await resumeShift(activeShift.machinery_log_id)
      if (res.success) {
        toast.success('Turno reanudado')
        const ref = await getActiveShiftForMachine(parseInt(selectedMachineId))
        setActiveShift(ref.activeShift || null)
      } else {
        toast.error(res.error || 'Error al reanudar el turno')
      }
    } catch { toast.error('Error al reanudar el turno') }
    finally { setActionLoading(false) }
  }

  // Complete
  const handleCompleteShift = async () => {
    if (!activeShift) return
    setActionLoading(true)
    try {
      const res = await completeShift(activeShift.machinery_log_id, completeEndTime, completeObservations)
      if (res.success) {
        toast.success('Turno cerrado exitosamente')
        setShowCompleteModal(false)
        setActiveShift(null)
        setSelectedMachineId('')
        setIsScanning(true)
      } else {
        toast.error(res.error || 'Error al completar el turno')
      }
    } catch { toast.error('Error al completar el turno') }
    finally { setActionLoading(false) }
  }

  // New log submit
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedMachineId) {
      toast.error('Por favor seleccioná o escaneá una maquinaria.')
      return
    }
    setLoading(true)
    setResult(null)
    const formData = new FormData(e.currentTarget)
    const res = await createMachineryLog(formData)
    if (res.error) {
      setResult({ error: res.error })
      toast.error(res.error)
    } else {
      setResult(res)
      const isOpen = !res.is_completed
      toast.success(isOpen ? 'Turno iniciado (Check-in)' : 'Turno registrado exitosamente')
      if (isOpen) {
        // Refresh active shift panel
        const ref = await getActiveShiftForMachine(parseInt(selectedMachineId))
        setActiveShift(ref.activeShift || null)
        setResult(null) // Don't show success screen — go straight to lifecycle panel
      }
    }
    setLoading(false)
  }

  // ── Success screen (manual machines or truck after open) ──────────────────
  if (result?.hash_id) {
    return (
      <div className="text-center p-6 space-y-4 animate-in fade-in duration-200">
        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 size={28} />
        </div>
        <div className="text-green-700 font-bold text-lg">
          {dict.success_title || '¡Registro Guardado con Éxito!'}
        </div>

        {isTruck ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">{dict.success_hint || 'Guardá este código para registrar tu salida:'}</p>
            <div className="bg-gray-100 p-3 rounded-lg text-2xl font-mono tracking-widest text-blue-700 font-bold">
              {result.hash_id}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-left text-xs text-blue-900 space-y-2">
              <p className="font-semibold text-sm">Resumen de Operación Registrada:</p>
              <p><strong>Equipo:</strong> {selectedMachine?.machinery_full_name}</p>
              <p><strong>Combustible cargado:</strong> {fuelLiters} Litros</p>
              {estimatedHours && (
                <p><strong>Tiempo estimado de operación:</strong> ~{estimatedHours} horas (Tasa: {expectedRate.toFixed(1)} L/h)</p>
              )}
              <p className="text-emerald-700 font-medium pt-1">
                ✓ Turno completado y computado automáticamente para reportes de costos.
              </p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center space-y-1">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                Código de Registro (para corrección):
              </span>
              <div className="text-xl font-mono font-bold text-gray-800 tracking-wider">
                {result.hash_id}
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => {
            setResult(null)
            setSelectedMachineId('')
            setFuelLiters('')
            setIsScanning(true)
          }}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm"
        >
          {dict.new_registration_button || 'Nuevo Registro'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {result?.error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">{result.error}</div>
      )}

      {/* ── Scan mode toggle ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">{dict.machinery}</label>
        <div className="inline-flex p-1 bg-gray-100 rounded-lg text-xs font-medium">
          <button
            type="button"
            onClick={() => { handleScanModeChange('qr'); setSelectedMachineId('') }}
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
            onClick={() => handleScanModeChange('manual')}
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

      {/* ── QR viewport ──────────────────────────────────────────────────── */}
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
                      onClick={() => handleScanModeChange('manual')}
                      className="mt-1 font-semibold text-blue-600 underline hover:text-blue-800"
                    >
                      Cambiar a selección manual
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-xs text-blue-700 font-medium">
                  Apuntá la cámara al código QR de la maquinaria
                </p>
              )}
            </div>
          ) : (
            selectedMachine && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="p-1.5 bg-blue-100 text-blue-700 rounded-md shrink-0">
                    {isTruck ? <Truck size={16} /> : <Wrench size={16} />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-blue-900 truncate">{selectedMachine.machinery_full_name}</p>
                    <p className="text-[11px] text-blue-600">QR detectado correctamente</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedMachineId(''); setIsScanning(true); setActiveShift(null) }}
                  className="shrink-0 text-xs text-blue-500 underline hover:text-blue-700"
                >
                  Cambiar
                </button>
              </div>
            )
          )}
        </div>
      )}

      {/* ── Manual dropdown ───────────────────────────────────────────────── */}
      {scanMode === 'manual' && (
        <select
          name="machine_id"
          required
          value={selectedMachineId}
          onChange={(e) => setSelectedMachineId(e.target.value)}
          className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
        >
          <option value="">{dict.select_machinery}</option>
          {machinery.map((m) => (
            <option key={m.machinery_id} value={m.machinery_id}>
              {m.machinery_full_name} {m.machine_type === 'truck' ? '(Camión)' : '(Máquina)'}
            </option>
          ))}
        </select>
      )}

      {/* ── Shift checking spinner ───────────────────────────────────────── */}
      {checkingShift && (
        <div className="flex items-center justify-center p-3 text-xs text-gray-500 gap-2">
          <Loader2 size={16} className="animate-spin text-blue-600" />
          <span>Verificando estado del turno...</span>
        </div>
      )}

      {/* ── Open-shift warning (machines only, non-blocking) ─────────────── */}
      {!checkingShift && selectedMachine && isMachineType && activeShift && scanMode === 'manual' && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold">
            <AlertTriangle size={15} className="text-amber-600" />
            <span>Esta maquinaria tiene un turno sin cerrar</span>
          </div>
          <p className="text-xs">
            Hash:{' '}
            <span className="font-mono font-bold">{activeShift.hash_id}</span>
          </p>
          <p className="text-xs text-amber-600">
            Podés corregirlo en el formulario de corrección. El nuevo registro se creará de todas formas.
          </p>
        </div>
      )}

      {/* ── Active shift lifecycle panel (QR mode — trucks and machines) ─── */}
      {!checkingShift && selectedMachine && activeShift && scanMode === 'qr' && (
        <div className="space-y-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm animate-in fade-in duration-200">
          {/* Status header */}
          <div className="flex items-center justify-between border-b pb-3 border-gray-100">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${activeShift.status === 'paused' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-ping'}`} />
              <span className="font-bold text-sm text-gray-900">
                {activeShift.status === 'paused' ? 'TURNO EN PAUSA' : 'TURNO EN CURSO'}
              </span>
            </div>
            <span className="text-xs font-mono text-gray-500">Inicio: {activeShift.start_time}</span>
          </div>

          {/* Shift details grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 bg-gray-50 rounded-lg">
              <span className="text-gray-400 block uppercase text-[10px] font-bold">Operador</span>
              <span className="font-medium text-gray-800">{activeShift.operator_name}</span>
            </div>
            <div className="p-2.5 bg-gray-50 rounded-lg">
              <span className="text-gray-400 block uppercase text-[10px] font-bold">Proyecto</span>
              <span className="font-medium text-gray-800">{activeShift.projects?.project_name || 'Sin proyecto'}</span>
            </div>
            <div className="p-2.5 bg-gray-50 rounded-lg">
              <span className="text-gray-400 block uppercase text-[10px] font-bold">Combustible</span>
              <span className="font-medium text-gray-800 font-mono">{activeShift.fuel_liters ?? '-'} L</span>
            </div>
            <div className="p-2.5 bg-gray-50 rounded-lg">
              <span className="text-gray-400 block uppercase text-[10px] font-bold">Tiempo Pausado</span>
              <span className="font-medium text-gray-800 font-mono">{activeShift.total_paused_minutes || 0} min</span>
            </div>
          </div>

          {/* Pause reason info (if paused) */}
          {activeShift.status === 'paused' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle size={14} className="text-amber-600" />
                <span>Máquina detenida</span>
              </div>
              <p>Motivo: <strong>{activeShift.pause_events?.[activeShift.pause_events.length - 1]?.reason || 'Pausa operativa'}</strong></p>
              {activeShift.pause_events?.[activeShift.pause_events.length - 1]?.notes && (
                <p className="text-gray-500 italic">&ldquo;{activeShift.pause_events[activeShift.pause_events.length - 1].notes}&rdquo;</p>
              )}
            </div>
          )}

          {/* Lifecycle action buttons */}
          <div className="pt-1 flex flex-col gap-2">
            {activeShift.status === 'started' ? (
              <button
                type="button"
                onClick={() => setShowPauseModal(true)}
                disabled={actionLoading}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <Pause size={16} />
                <span>Pausar Maquinaria</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleResumeShift}
                disabled={actionLoading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                <span>Reanudar Maquinaria</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => { setCompleteEndTime(new Date().toTimeString().slice(0, 5)); setShowCompleteModal(true) }}
              disabled={actionLoading}
              className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <LogOut size={16} />
              <span>Cerrar Turno (Check-out)</span>
            </button>
            <button
              type="button"
              onClick={() => { setSelectedMachineId(''); setActiveShift(null); setIsScanning(true) }}
              className="w-full text-xs text-gray-400 hover:text-gray-600 underline py-1"
            >
              Escanear otra maquinaria
            </button>
          </div>
        </div>
      )}

      {/* ── New log form (shown when no active shift, or manual mode) ─────── */}
      {!checkingShift && selectedMachine && (!activeShift || scanMode === 'manual') && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Hidden: machine_id (QR mode — set from scan; manual mode — set from select) */}
          {scanMode === 'qr' && selectedMachineId && (
            <input type="hidden" name="machine_id" value={selectedMachineId} />
          )}
          {/* Hidden: input method so the action knows which lifecycle to use */}
          <input type="hidden" name="input_method" value={scanMode} />

          {/* Machine type badge */}
          <div className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs">
            {isTruck ? (
              <>
                <span className="p-1 bg-purple-100 text-purple-700 rounded-md"><Truck size={14} /></span>
                <div>
                  <span className="font-semibold text-purple-900">Vehículo / Camión:</span>
                  <span className="text-gray-600 ml-1">Requiere registro de hora de inicio.</span>
                </div>
              </>
            ) : (
              <>
                <span className="p-1 bg-blue-100 text-blue-700 rounded-md"><Wrench size={14} /></span>
                <div>
                  <span className="font-semibold text-blue-900">Maquinaria Pesada:</span>
                  <span className="text-gray-600 ml-1">
                    {scanMode === 'qr'
                      ? 'El turno se medirá en tiempo real. Las horas efectivas se calculan al cierre.'
                      : 'Horas calculadas por carga de combustible y tasa de consumo.'}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Serial code (read-only preview) */}
          {selectedMachine.machinery_serial_code && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{dict.serial_code}</label>
              <input
                type="text"
                readOnly
                value={selectedMachine.machinery_serial_code}
                className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 font-mono cursor-not-allowed outline-none"
              />
            </div>
          )}

          {/* Project */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{dict.project}</label>
            <select
              name="project_id"
              required
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
            >
              <option value="">{dict.select_project}</option>
              {projects.map((p) => (
                <option key={p.project_id} value={p.project_id}>{p.project_name}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 italic">{dict.project_hint}</p>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{dict.date}</label>
            <input
              type="date"
              name="date"
              required
              defaultValue={new Date().toISOString().split('T')[0]}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
            />
          </div>

          {/* Operator */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{dict.operator_name}</label>
            <input
              type="text"
              name="operator_name"
              required
              placeholder={dict.operator_placeholder}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
            />
          </div>

          {/* Start time: trucks always; machines via QR */}
          {(isTruck || (!isTruck && scanMode === 'qr')) && (
            <div className="animate-in fade-in duration-150">
              <label className="block text-sm font-medium text-gray-700 mb-1">{dict.start_time}</label>
              <input
                type="time"
                name="start_time"
                required
                defaultValue={new Date().toTimeString().slice(0, 5)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
              />
            </div>
          )}

          {/* Fuel liters */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">{dict.fuel_liters}</label>
              {estimatedHours && scanMode === 'manual' && (
                <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded flex items-center gap-1">
                  <Clock size={12} />
                  Est: ~{estimatedHours} hrs ({expectedRate.toFixed(1)} L/h)
                </span>
              )}
            </div>
            <input
              type="number"
              step="0.01"
              name="fuel_liters"
              required
              placeholder={dict.fuel_placeholder}
              value={fuelLiters}
              onChange={(e) => setFuelLiters(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
            />
          </div>

          {/* Fuel consumption info box (manual + machine only) */}
          {!isTruck && scanMode === 'manual' && (
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-blue-800 uppercase text-[11px]">
                <Fuel size={14} className="text-blue-600" />
                <span>Cálculo de Consumo de Operación</span>
              </div>
              {expectedRate > 0 ? (
                <div className="space-y-1">
                  <p className="text-gray-600">Consumo por hora: <strong>{expectedRate.toFixed(1)} L/h</strong></p>
                  {Number(fuelLiters) > 0 ? (
                    <div className="pt-1 flex items-baseline gap-2">
                      <span className="text-gray-700 font-medium">Tiempo efectivo estimado:</span>
                      <span className="text-base font-bold font-mono text-blue-700">~{estimatedHours} horas</span>
                    </div>
                  ) : (
                    <p className="text-gray-400 italic">Ingresá los litros de combustible para calcular las horas de operación.</p>
                  )}
                </div>
              ) : (
                <p className="text-amber-700 italic">
                  Esta máquina aún no tiene configurada la tasa de consumo por hora (L/h) en el catálogo de maquinaria.
                </p>
              )}
            </div>
          )}

          {/* Fuel price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{dict.fuel_price}</label>
            <input
              type="number"
              step="0.01"
              name="fuel_price"
              required
              defaultValue={DEFAULT_DIESEL_PRICE.toFixed(2)}
              placeholder={dict.fuel_price_placeholder || DEFAULT_DIESEL_PRICE.toFixed(2)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {loading
              ? dict.submitting
              : isTruck
                ? dict.submit
                : scanMode === 'qr'
                  ? 'Iniciar Turno (Check-in)'
                  : 'Registrar Turno de Maquinaria'}
          </button>
        </form>
      )}

      {/* ── Pause modal ───────────────────────────────────────────────────── */}
      {showPauseModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 space-y-4 shadow-xl animate-in slide-in-from-bottom-4 duration-200">
            <h3 className="font-bold text-gray-900 text-lg">Pausar Turno</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de pausa</label>
              <select
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
              >
                {PAUSE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas adicionales (opcional)</label>
              <textarea
                value={pauseNotes}
                onChange={(e) => setPauseNotes(e.target.value)}
                rows={2}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                placeholder="Ej: Esperando repuesto del motor..."
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowPauseModal(false)}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handlePauseShift}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold disabled:opacity-50"
              >
                {actionLoading ? 'Pausando...' : 'Confirmar Pausa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Complete modal ────────────────────────────────────────────────── */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 space-y-4 shadow-xl animate-in slide-in-from-bottom-4 duration-200">
            <h3 className="font-bold text-gray-900 text-lg">Cerrar Turno</h3>
            {isMachineType && (
              <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 p-2 rounded-lg">
                Las horas efectivas se calcularán automáticamente a partir del tiempo real del turno menos las pausas.
              </p>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hora de cierre</label>
              <input
                type="time"
                value={completeEndTime}
                onChange={(e) => setCompleteEndTime(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones (opcional)</label>
              <textarea
                value={completeObservations}
                onChange={(e) => setCompleteObservations(e.target.value)}
                rows={2}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                placeholder="Ej: Trabajo completado sin incidencias."
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowCompleteModal(false)}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCompleteShift}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold disabled:opacity-50"
              >
                {actionLoading ? 'Cerrando...' : 'Confirmar Cierre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
