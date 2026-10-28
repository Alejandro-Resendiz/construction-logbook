'use client'

import { useState } from 'react'
import { createMachineryLog } from '@/app/actions'
import { DEFAULT_DIESEL_PRICE } from '@/lib/constants'
import { toast } from 'sonner'
import { Clock, Fuel, CheckCircle2, Truck, Wrench } from 'lucide-react'

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

export default function MachineryLogForm({ machinery, projects, dict }: MachineryLogFormProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ hash_id?: string, is_completed?: boolean, error?: string } | null>(null)
  const [selectedMachineId, setSelectedMachineId] = useState('')
  const [fuelLiters, setFuelLiters] = useState('')

  const selectedMachine = machinery.find((m) => String(m.machinery_id) === selectedMachineId)
  const isTruck = selectedMachine?.machine_type === 'truck'
  const expectedRate = Number(selectedMachine?.expected_consumption_rate || 0)
  const estimatedHours = expectedRate > 0 && Number(fuelLiters) > 0
    ? (Number(fuelLiters) / expectedRate).toFixed(1)
    : null

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedMachineId) {
      toast.error('Por favor seleccione una maquinaria.')
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
      toast.success(isTruck ? 'Turno de camión iniciado' : 'Turno de máquina registrado exitosamente')
    }
    setLoading(false)
  }

  // Success view
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
            <p className="text-sm text-gray-600">{dict.success_hint || 'Guarda este código para registrar tu salida:'}</p>
            <div className="bg-gray-100 p-3 rounded-lg text-2xl font-mono tracking-widest text-blue-700 font-bold">
              {result.hash_id}
            </div>
          </div>
        ) : (
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
        )}

        <button 
          onClick={() => {
            setResult(null)
            setSelectedMachineId('')
            setFuelLiters('')
          }}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm"
        >
          {dict.new_registration_button || 'Nuevo Registro'}
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

      {/* Machinery Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {dict.machinery}
        </label>
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
      </div>

      {/* Machine Type Indicator Badge */}
      {selectedMachine && (
        <div className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs">
          {isTruck ? (
            <>
              <span className="p-1 bg-purple-100 text-purple-700 rounded-md">
                <Truck size={14} />
              </span>
              <div>
                <span className="font-semibold text-purple-900">Vehículo / Camión:</span>
                <span className="text-gray-600 ml-1">Requiere registro de hora de inicio.</span>
              </div>
            </>
          ) : (
            <>
              <span className="p-1 bg-blue-100 text-blue-700 rounded-md">
                <Wrench size={14} />
              </span>
              <div>
                <span className="font-semibold text-blue-900">Maquinaria Pesada:</span>
                <span className="text-gray-600 ml-1">Horas calculadas por carga de combustible y tasa estándar.</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Serial Code Preview */}
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

      {/* Project Selector */}
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
        <p className="mt-1 text-xs text-gray-500 italic">
          {dict.project_hint}
        </p>
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

      {/* Operator Name */}
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

      {/* Start Time: ONLY POPULATED FOR TRUCKS */}
      {isTruck && (
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

      {/* Fuel Liters */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="block text-sm font-medium text-gray-700">{dict.fuel_liters}</label>
          {estimatedHours && (
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

      {/* Live Calculated Fuel Consumption Box for Heavy Machinery */}
      {!isTruck && selectedMachine && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-blue-800 uppercase text-[11px]">
            <Fuel size={14} className="text-blue-600" />
            <span>Cálculo de Consumo de Operación</span>
          </div>
          {expectedRate > 0 ? (
            <div className="space-y-1">
              <p className="text-gray-600">
                Tasa estándar de consumo: <strong>{expectedRate.toFixed(1)} L/h</strong>
              </p>
              {Number(fuelLiters) > 0 ? (
                <div className="pt-1 flex items-baseline gap-2">
                  <span className="text-gray-700 font-medium">Tiempo efectivo estimado:</span>
                  <span className="text-base font-bold font-mono text-blue-700">~{estimatedHours} horas</span>
                </div>
              ) : (
                <p className="text-gray-400 italic">Ingrese los litros de combustible para calcular las horas de operación.</p>
              )}
            </div>
          ) : (
            <p className="text-amber-700 italic">
              Esta máquina aún no tiene configurada su tasa estándar ($L/h$) en el catálogo de maquinaria.
            </p>
          )}
        </div>
      )}

      {/* Fuel Price */}
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
        {loading ? dict.submitting : (isTruck ? dict.submit : 'Registrar Turno de Maquinaria')}
      </button>
    </form>
  )
}
