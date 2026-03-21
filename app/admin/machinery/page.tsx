'use client'

import { useState, useEffect } from 'react'
import { getDictionary } from '@/lib/i18n'
import { Plus, X, Hammer, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { createMachinery } from './actions'
import MachineryRowActions from '@/app/components/MachineryRowActions'
import { useMachineryStore } from '@/lib/store/machineryStore'
import { toast } from 'sonner'

export default function MachineryPage() {
  const [dict, setDict] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' | null }>({ key: 'machinery_full_name', direction: 'asc' })
  
  // Use Zustand store
  const { machinery, loading, fetchMachinery, addMachine } = useMachineryStore()

  useEffect(() => {
    setDict(getDictionary('es'))
    fetchMachinery()
  }, [fetchMachinery])

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={14} className="text-gray-400" />
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600" /> : <ArrowDown size={14} className="text-blue-600" />
  }

  // Filter and Sort Logic
  const filteredMachinery = machinery
    .filter(m => {
      const search = searchQuery.toLowerCase()
      return (
        m.external_code?.toLowerCase().includes(search) ||
        m.machinery_full_name?.toLowerCase().includes(search) ||
        m.machinery_name?.toLowerCase().includes(search) ||
        m.machinery_model?.toLowerCase().includes(search) ||
        m.machinery_serial_code?.toLowerCase().includes(search)
      )
    })
    .sort((a, b) => {
      if (!sortConfig.key || !sortConfig.direction) return 0
      
      const valA = a[sortConfig.key] || ''
      const valB = b[sortConfig.key] || ''
      
      if (sortConfig.direction === 'asc') {
        return valA.toString().localeCompare(valB.toString())
      } else {
        return valB.toString().localeCompare(valA.toString())
      }
    })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    // Manual validation for highlighting
    const requiredFields = ['external_code', 'machinery_full_name', 'machinery_name']
    const newErrors: string[] = []
    
    requiredFields.forEach(field => {
      if (!formData.get(field)) {
        newErrors.push(field)
      }
    })

    if (newErrors.length > 0) {
      setErrors(newErrors)
      toast.error(dict.common.notifications?.missing_fields || 'Por favor complete los campos obligatorios.')
      return
    }

    setErrors([])
    const res = await createMachinery(formData)
    if (res.success && res.machine) {
      addMachine(res.machine)
      toast.success(dict.common.notifications?.success_update || 'Registrado correctamente')
      setShowForm(false)
    } else {
      const errorMsg = dict.common.notifications?.[res.error as string] || dict.common.notifications?.generic_error || 'Error al registrar'
      toast.error(errorMsg)
    }
  }

  if (!dict) return <div className="p-8 text-center text-gray-500 italic">Cargando...</div>

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Hammer className="text-blue-600" />
            {dict.admin.machinery.title}
          </h1>
          <button 
            onClick={() => {
              setShowForm(!showForm)
              setErrors([])
            }}
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
            placeholder="Buscar por código, nombre, modelo o serie..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl leading-5 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm transition-all shadow-sm"
          />
        </div>

        {/* Collapsible Creation Form */}
        {showForm && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100 mb-8 animate-in fade-in slide-in-from-top-4 duration-200">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">
              {dict.admin.machinery.new_machine}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                    {dict.admin.machinery.external_code}
                    <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" name="external_code" 
                    className={`w-full p-2 border rounded-lg text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                      errors.includes('external_code') ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`} 
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                    {dict.admin.machinery.full_name}
                    <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" name="machinery_full_name" 
                    className={`w-full p-2 border rounded-lg text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                      errors.includes('machinery_full_name') ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`} 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                    {dict.admin.machinery.short_name}
                    <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" name="machinery_name" 
                    className={`w-full p-2 border rounded-lg text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                      errors.includes('machinery_name') ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`} 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">{dict.admin.machinery.model}</label>
                  <input type="text" name="machinery_model" className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">{dict.admin.machinery.serial_code}</label>
                  <input type="text" name="machinery_serial_code" className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-1 md:col-span-3 lg:col-span-5">
                  <label className="text-xs font-bold text-gray-500 uppercase">{dict.update_log.observations}</label>
                  <input type="text" name="observations" className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="flex justify-end">
                <button 
                  type="submit"
                  className="px-10 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-sm"
                >
                  {dict.admin.machinery.create}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Machinery List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th onClick={() => handleSort('external_code')} className="p-4 font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors select-none">
                    <div className="flex items-center gap-2">
                      {dict.admin.machinery.external_code}
                      {getSortIcon('external_code')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('machinery_full_name')} className="p-4 font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors select-none">
                    <div className="flex items-center gap-2">
                      {dict.admin.machinery.full_name}
                      {getSortIcon('machinery_full_name')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('machinery_name')} className="p-4 font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors select-none">
                    <div className="flex items-center gap-2">
                      {dict.admin.machinery.short_name}
                      {getSortIcon('machinery_name')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('machinery_model')} className="p-4 font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors select-none">
                    <div className="flex items-center gap-2">
                      {dict.admin.machinery.model}
                      {getSortIcon('machinery_model')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('machinery_serial_code')} className="p-4 font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors select-none">
                    <div className="flex items-center gap-2">
                      {dict.admin.machinery.serial_code}
                      {getSortIcon('machinery_serial_code')}
                    </div>
                  </th>
                  <th className="p-4 font-semibold text-gray-600">{dict.update_log.observations}</th>
                  <th className="p-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="text-gray-900">
                {loading ? (
                  <tr><td colSpan={7} className="p-8 text-center text-gray-400 italic">Cargando maquinaria...</td></tr>
                ) : filteredMachinery.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400 italic">
                      {searchQuery ? 'No se encontraron resultados' : dict.admin.machinery.no_machinery}
                    </td>
                  </tr>
                ) : (
                  filteredMachinery.map((m) => (
                    <MachineryRowActions 
                      key={m.machinery_id} 
                      machine={m} 
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
