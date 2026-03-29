'use client'

import { useState, useEffect } from 'react'
import { getDictionary } from '@/lib/i18n'
import { Hammer, Plus, X, Search } from 'lucide-react'
import { useMachineryDepreciationStore } from '@/lib/store/machineryDepreciationStore'
import { useMachineryStore } from '@/lib/store/machineryStore'
import MachineryDepreciationRow from '@/app/components/MachineryDepreciationRow'
import { toast } from 'sonner'

export default function MachineryDepreciationPage() {
  const [dict, setDict] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMachineId, setSelectedMachineId] = useState<string>('')
  
  const { depreciations, loading, fetchDepreciations, upsertDepreciation } = useMachineryDepreciationStore()
  const { machinery, fetchMachinery } = useMachineryStore()

  useEffect(() => {
    setDict(getDictionary('es'))
    fetchDepreciations()
    fetchMachinery()
  }, [fetchDepreciations, fetchMachinery])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const machinery_id = Number(formData.get('machinery_id'))
    if (!machinery_id) {
      toast.error('Seleccione una máquina')
      return
    }

    const res = await upsertDepreciation({
      machinery_id,
      optimal_fuel_consumption: formData.get('optimal_fuel_consumption') ? Number(formData.get('optimal_fuel_consumption')) : undefined,
      service_life: formData.get('service_life') ? Number(formData.get('service_life')) : undefined,
      purchase_value: formData.get('purchase_value') ? Number(formData.get('purchase_value')) : undefined,
      rescue_value: formData.get('rescue_value') ? Number(formData.get('rescue_value')) / 100 : undefined,
      estimated_depreciation_rate: formData.get('estimated_depreciation_rate') ? Number(formData.get('estimated_depreciation_rate')) : undefined
    })

    if (res.success) {
      toast.success(dict.common.notifications?.success_update || 'Registrado correctamente')
      setShowForm(false)
      setSelectedMachineId('')
    } else {
      toast.error(dict.common.notifications?.error_update || 'Error al registrar')
    }
  }

  // Filter out machines that already have depreciation info for the selection dropdown
  const machinesWithoutDepreciation = machinery.filter(m => 
    !depreciations.some(d => d.machinery_id === m.machinery_id) && !m.is_rented
  )

  const filteredDepreciations = depreciations.filter(d => {
    const search = searchQuery.toLowerCase()
    return (
      d.machinery?.external_code?.toLowerCase().includes(search) ||
      d.machinery?.machinery_full_name?.toLowerCase().includes(search)
    )
  })

  if (!dict) return <div className="p-8 text-center text-gray-500 italic">Cargando...</div>

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Hammer className="text-blue-600" />
            {dict.admin.depreciation.title}
          </h1>
          <button 
            onClick={() => setShowForm(!showForm)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
              showForm 
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
            }`}
          >
            {showForm ? <X size={20} /> : <Plus size={20} />}
            {showForm ? dict.common.cancel : dict.admin.machinery.new_machine}
          </button>
        </header>

        {/* Search Bar */}
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por código o nombre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl leading-5 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm transition-all shadow-sm"
          />
        </div>

        {/* Creation Form */}
        {showForm && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100 mb-8 animate-in fade-in slide-in-from-top-4 duration-200">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">
              {dict.admin.depreciation.create}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">
                    {dict.new_log.machinery}
                  </label>
                  <select 
                    name="machinery_id"
                    required
                    value={selectedMachineId}
                    onChange={(e) => setSelectedMachineId(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{dict.new_log.select_machinery}</option>
                    {machinesWithoutDepreciation.map(m => (
                      <option key={m.machinery_id} value={m.machinery_id}>
                        [{m.external_code}] {m.machinery_full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">
                    {dict.admin.depreciation.optimal_fuel}
                  </label>
                  <input 
                    type="number" step="0.01" name="optimal_fuel_consumption"
                    className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">
                    {dict.admin.depreciation.service_life}
                  </label>
                  <input 
                    type="number" name="service_life"
                    className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">
                    {dict.admin.depreciation.purchase_value}
                  </label>
                  <input 
                    type="number" step="0.01" name="purchase_value"
                    className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">
                    {dict.admin.depreciation.rescue_value}
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" step="0.1" name="rescue_value"
                      className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                    <span className="text-gray-500">%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">
                    {dict.admin.depreciation.estimated_depreciation_rate}
                  </label>
                  <input 
                    type="number" step="0.01" name="estimated_depreciation_rate"
                    className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button 
                  type="submit"
                  className="px-10 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-sm"
                >
                  {dict.common.save}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Depreciation List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 font-semibold text-gray-600">{dict.admin.machinery.external_code}</th>
                  <th className="p-4 font-semibold text-gray-600">{dict.admin.machinery.full_name}</th>
                  <th className="p-4 font-semibold text-gray-600">{dict.admin.depreciation.optimal_fuel}</th>
                  <th className="p-4 font-semibold text-gray-600">{dict.admin.depreciation.service_life}</th>
                  <th className="p-4 font-semibold text-gray-600">{dict.admin.depreciation.purchase_value}</th>
                  <th className="p-4 font-semibold text-gray-600">{dict.admin.depreciation.rescue_value}</th>
                  <th className="p-4 font-semibold text-gray-600">{dict.admin.depreciation.estimated_depreciation_rate}</th>
                  <th className="p-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="text-gray-900">
                {loading ? (
                  <tr><td colSpan={8} className="p-8 text-center text-gray-400 italic">Cargando...</td></tr>
                ) : filteredDepreciations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400 italic">
                      {dict.admin.depreciation.no_data}
                    </td>
                  </tr>
                ) : (
                  filteredDepreciations.map((d) => (
                    <MachineryDepreciationRow 
                      key={d.machinery_id} 
                      depr={d} 
                      dict={dict}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}
