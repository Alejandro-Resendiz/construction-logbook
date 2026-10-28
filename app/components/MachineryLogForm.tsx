'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  createMachineryLog, 
  getActiveShiftForMachine, 
  pauseShift, 
  resumeShift, 
  completeShift 
} from '@/app/actions'
import { DEFAULT_DIESEL_PRICE } from '@/lib/constants'
import { Html5Qrcode } from 'html5-qrcode'
import { toast } from 'sonner'
import { 
  QrCode, 
  ListFilter, 
  CheckCircle2, 
  RefreshCw, 
  AlertCircle, 
  Pause, 
  Play, 
  LogOut, 
  Clock, 
  Fuel, 
  AlertTriangle, 
  Loader2 
} from 'lucide-react'

interface MachineryLogFormProps {
  machinery: { 
    machinery_id: number
    machinery_full_name: string
    machinery_serial_code?: string | null
    machine_type?: string | null
    expected_consumption_rate?: number | null 
  }[]
  projects: { project_id: number, project_name: string }[]
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
  const [result, setResult] = useState<{ hash_id?: string, error?: string } | null>(null)
  const [selectedMachineId, setSelectedMachineId] = useState('')
  
  // Workflow Mode Feature Flag: Defaults to 'classic' for safe onboarding
  const [workflowMode, setWorkflowMode] = useState<'classic' | 'smart'>('classic')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sigma_shift_workflow_mode')
      if (saved === 'smart' || saved === 'classic') {
        setWorkflowMode(saved)
      }
    } catch (_) {}
  }, [])

  const handleWorkflowChange = (mode: 'classic' | 'smart') => {
    setWorkflowMode(mode)
    try {
      localStorage.setItem('sigma_shift_workflow_mode', mode)
    } catch (_) {}
  }

  // Scanner state
  const [scanMode, setScanMode] = useState<'qr' | 'manual'>('qr')
  const [isScanning, setIsScanning] = useState(true)
  const [cameraError, setCameraError] = useState<string | null>(null)

  // Active shift lifecycle state
  const [activeShift, setActiveShift] = useState<any | null>(null)
  const [checkingShift, setCheckingShift] = useState(false)

  // Pause & Complete Modals / Sub-forms
  const [showPauseModal, setShowPauseModal] = useState(false)
  const [pauseReason, setPauseReason] = useState(PAUSE_REASONS[0])
  const [pauseNotes, setPauseNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [completeEndTime, setCompleteEndTime] = useState(new Date().toTimeString().slice(0, 5))
  const [completeObservations, setCompleteObservations] = useState('')

  // Live fuel calculation state for new shift form
  const [fuelLitersInput, setFuelLitersInput] = useState('')

  const machineryRef = useRef(machinery)
  machineryRef.current = machinery
  const lastScannedTimeRef = useRef<number>(0)
  const scannerRef = useRef<Html5Qrcode | null>(null)

  const selectedMachine = machinery.find((m) => String(m.machinery_id) === selectedMachineId)

  // Fetch active shift whenever machine changes
  useEffect(() => {
    if (!selectedMachineId) {
      setActiveShift(null)
      return
    }

    let isMounted = true
    const checkShift = async () => {
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

    checkShift()
    return () => {
      isMounted = false
    }
  }, [selectedMachineId])

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
        () => {}
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

  // Handle Pause action
  const handlePauseShift = async () => {
    if (!activeShift) return
    setActionLoading(true)
    try {
      const res = await pauseShift(activeShift.machinery_log_id, pauseReason, pauseNotes)
      if (res.success) {
        toast.warning('Turno de maquinaria pausado')
        setShowPauseModal(false)
        setPauseNotes('')
        // Refresh shift state
        const ref = await getActiveShiftForMachine(parseInt(selectedMachineId))
        setActiveShift(ref.activeShift || null)
      } else {
        toast.error(res.error || 'Error al pausar el turno')
      }
    } catch (err) {
      toast.error('Error al pausar el turno')
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Resume action
  const handleResumeShift = async () => {
    if (!activeShift) return
    setActionLoading(true)
    try {
      const res = await resumeShift(activeShift.machinery_log_id)
      if (res.success) {
        toast.success('Turno reanudado con éxito')
        const ref = await getActiveShiftForMachine(parseInt(selectedMachineId))
        setActiveShift(ref.activeShift || null)
      } else {
        toast.error(res.error || 'Error al reanudar el turno')
      }
    } catch (err) {
      toast.error('Error al reanudar el turno')
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Complete (Check-out) action
  const handleCompleteShift = async () => {
    if (!activeShift) return
    setActionLoading(true)
    try {
      const res = await completeShift(activeShift.machinery_log_id, completeEndTime, completeObservations)
      if (res.success) {
        toast.success('Turno cerrado y completado exitosamente')
        setShowCompleteModal(false)
        setActiveShift(null)
      } else {
        toast.error(res.error || 'Error al completar el turno')
      }
    } catch (err) {
      toast.error('Error al completar el turno')
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Form Submit for starting a new shift
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
    
    if (res.error) {
      setResult({ error: res.error })
      toast.error(res.error)
    } else {
      setResult(res)
      toast.success('Turno iniciado exitosamente')
      // Refresh active shift
      const ref = await getActiveShiftForMachine(parseInt(selectedMachineId))
      setActiveShift(ref.activeShift || null)
    }
    setLoading(false)
  }

  if (result?.hash_id && (workflowMode === 'classic' || !selectedMachine || selectedMachine.machine_type === 'truck')) {
    return (
      <div className="text-center p-6 space-y-4">
        <div className="text-green-600 font-bold text-lg">{dict.success_title}</div>
        <p className="text-gray-600">{dict.success_hint}</p>
        <div className="bg-gray-100 p-4 rounded-lg text-2xl font-mono tracking-widest text-blue-700">
          {result.hash_id}
        </div>
        <button 
          onClick={() => {
            setResult(null)
            setSelectedMachineId('')
            setIsScanning(true)
          }}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
        >
          {dict.new_registration_button}
        </button>
      </div>
    )
  }

  const isMachineType = selectedMachine?.machine_type !== 'truck'
  const expectedRate = Number(selectedMachine?.expected_consumption_rate || 0)
  const estimatedHours = expectedRate > 0 && Number(fuelLitersInput) > 0
    ? (Number(fuelLitersInput) / expectedRate).toFixed(1)
    : null

  return (
    <div className="space-y-6">
      {/* Hybrid Workflow Feature Flag Toggle */}
      <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Flujo:</span>
          {workflowMode === 'classic' ? (
            <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-medium">
              Clásico (Manual)
            </span>
          ) : (
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
              QR Rápido (Beta)
            </span>
          )}
        </div>
        <div className="inline-flex p-0.5 bg-white rounded-lg border border-slate-200 shadow-xs">
          <button
            type="button"
            onClick={() => handleWorkflowChange('classic')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
              workflowMode === 'classic'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Clásico
          </button>
          <button
            type="button"
            onClick={() => handleWorkflowChange('smart')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
              workflowMode === 'smart'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            QR Rápido
          </button>
        </div>
      </div>

      {/* Machinery Selector with Mode Toggle */}
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
              onClick={() => setScanMode('manual')}
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

        {/* QR Scanner Viewport */}
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
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 bg-blue-100 text-blue-700 rounded-lg shrink-0">
                      <CheckCircle2 size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-blue-900 truncate">
                        {selectedMachine.machinery_full_name}
                      </p>
                      <p className="text-[11px] text-blue-700 font-mono">
                        {selectedMachine.machinery_serial_code
                          ? `Serie: ${selectedMachine.machinery_serial_code}`
                          : `ID: #${selectedMachine.machinery_id}`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsScanning(true)
                      setActiveShift(null)
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-800 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors shrink-0"
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

        {/* Existing Dropdown Selector */}
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
              <option key={m.machinery_id} value={m.machinery_id}>
                {m.machinery_full_name} {m.machine_type === 'truck' ? '(Camión)' : '(Máquina)'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {checkingShift && (
        <div className="flex items-center justify-center p-4 text-xs text-gray-500 gap-2">
          <Loader2 size={16} className="animate-spin text-blue-600" />
          <span>Verificando estado del turno...</span>
        </div>
      )}

      {/* ACTIVE SHIFT IN-PROGRESS WORKFLOW (For Heavy Machinery in Smart Mode) */}
      {workflowMode === 'smart' && !checkingShift && selectedMachine && isMachineType && activeShift && (
        <div className="space-y-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm animate-in fade-in duration-200">
          {/* Header Status Badge */}
          <div className="flex items-center justify-between border-b pb-3 border-gray-100">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${activeShift.status === 'paused' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-ping'}`} />
              <span className="font-bold text-sm text-gray-900">
                {activeShift.status === 'paused' ? 'TURNO EN PAUSA' : 'TURNO EN CURSO'}
              </span>
            </div>
            <span className="text-xs font-mono text-gray-500">
              Inicio: {activeShift.start_time}
            </span>
          </div>

          {/* Shift Details */}
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
              <span className="text-gray-400 block uppercase text-[10px] font-bold">Combustible Cargado</span>
              <span className="font-medium text-gray-800 font-mono">{activeShift.fuel_liters} L</span>
            </div>
            <div className="p-2.5 bg-gray-50 rounded-lg">
              <span className="text-gray-400 block uppercase text-[10px] font-bold">Tiempo Pausado</span>
              <span className="font-medium text-gray-800 font-mono">{activeShift.total_paused_minutes || 0} min</span>
            </div>
          </div>

          {/* Expected Operation Hours Pill */}
          {expectedRate > 0 && activeShift.fuel_liters > 0 && (
            <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-lg flex items-center gap-2 text-xs text-blue-800">
              <Fuel size={15} className="shrink-0 text-blue-600" />
              <span>
                Tiempo estándar esperado: <strong>{(activeShift.fuel_liters / expectedRate).toFixed(1)} h</strong> (tasa de {expectedRate.toFixed(1)} L/h)
              </span>
            </div>
          )}

          {/* If Currently Paused: Show reason & status */}
          {activeShift.status === 'paused' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle size={14} className="text-amber-600" />
                <span>Máquina detenida</span>
              </div>
              <p>
                Motivo: <strong>{activeShift.pause_events?.[activeShift.pause_events.length - 1]?.reason || 'Pausa operativa'}</strong>
              </p>
              {activeShift.pause_events?.[activeShift.pause_events.length - 1]?.notes && (
                <p className="text-gray-500 italic">
                  &ldquo;{activeShift.pause_events[activeShift.pause_events.length - 1].notes}&rdquo;
                </p>
              )}
            </div>
          )}

          {/* Lifecycle Action Buttons */}
          <div className="pt-2 flex flex-col gap-2">
            {activeShift.status === 'started' ? (
              <button
                type="button"
                onClick={() => setShowPauseModal(true)}
                disabled={actionLoading}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50"
              >
                <Pause size={16} />
                <span>Pausar Máquina</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleResumeShift}
                disabled={actionLoading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50"
              >
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                <span>Reanudar Turno (Despausar)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setCompleteEndTime(new Date().toTimeString().slice(0, 5))
                setShowCompleteModal(true)
              }}
              disabled={actionLoading}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50"
            >
              <LogOut size={16} />
              <span>Cerrar Turno (Check-out)</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL: PAUSE REASON */}
      {showPauseModal && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-amber-900 uppercase">Motivo de la Pausa</h4>
            <button 
              type="button" 
              onClick={() => setShowPauseModal(false)}
              className="text-xs text-amber-700 hover:text-amber-900"
            >
              Cancelar
            </button>
          </div>

          <div className="space-y-2">
            <select
              value={pauseReason}
              onChange={(e) => setPauseReason(e.target.value)}
              className="w-full p-2 border border-amber-300 rounded-lg text-sm bg-white text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
            >
              {PAUSE_REASONS.map((reason) => (
                <option key={reason} value={reason}>{reason}</option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Detalle u observación opcional..."
              value={pauseNotes}
              onChange={(e) => setPauseNotes(e.target.value)}
              className="w-full p-2 border border-amber-300 rounded-lg text-sm bg-white text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
            />

            <button
              type="button"
              onClick={handlePauseShift}
              disabled={actionLoading}
              className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Pause size={14} />}
              <span>Confirmar Pausa</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL: CHECK-OUT COMPLETION */}
      {showCompleteModal && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 uppercase">Finalizar Turno de Trabajo</h4>
            <button 
              type="button" 
              onClick={() => setShowCompleteModal(false)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Cancelar
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <label className="block text-gray-700 font-medium mb-1">Hora de Salida</label>
              <input
                type="time"
                value={completeEndTime}
                onChange={(e) => setCompleteEndTime(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 bg-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">Observaciones Finales</label>
              <textarea
                rows={2}
                placeholder="Cualquier eventualidad o condición del equipo..."
                value={completeObservations}
                onChange={(e) => setCompleteObservations(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 bg-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="button"
              onClick={handleCompleteShift}
              disabled={actionLoading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
            >
              {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
              <span>Confirmar Cierre de Turno</span>
            </button>
          </div>
        </div>
      )}

      {/* START SHIFT FORM: RENDERED IN CLASSIC MODE, OR IN SMART MODE WHEN NO ACTIVE SHIFT (OR FOR TRUCK TYPE) */}
      {(workflowMode === 'classic' || !activeShift || !isMachineType) && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {result?.error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
              {result.error}
            </div>
          )}

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
              defaultValue={new Date().toTimeString().slice(0, 5)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">{dict.fuel_liters}</label>
              {estimatedHours && (
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded flex items-center gap-1">
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
              value={fuelLitersInput}
              onChange={(e) => setFuelLitersInput(e.target.value)}
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
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {loading 
              ? dict.submitting 
              : (workflowMode === 'smart' && isMachineType ? 'Iniciar Turno (Check-in)' : dict.submit)}
          </button>
        </form>
      )}
    </div>
  )
}
