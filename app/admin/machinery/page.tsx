'use client'

import { useState, useEffect } from 'react'
import { getDictionary } from '@/lib/i18n'
import { Plus, X, Hammer } from 'lucide-react'
import { createMachinery } from './actions'
import MachineryRowActions from '@/app/components/MachineryRowActions'
import { useMachineryStore } from '@/lib/store/machineryStore'

export default function MachineryPage() {
  const [dict, setDict] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  
  // Use Zustand store
  const { machinery, loading, fetchMachinery, addMachine } = useMachineryStore()

  useEffect(() => {
    setDict(getDictionary('es'))
    fetchMachinery()
  }, [fetchMachinery])

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

        {/* Collapsible Creation Form */}
        {showForm && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100 mb-8 animate-in fade-in slide-in-from-top-4 duration-200">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">
              {dict.admin.machinery.new_machine}
            </h2>
            <form 
              onSubmit={async (e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                const res = await createMachinery(formData)
                if (res.success && res.machine) {
                  addMachine(res.machine) // Update local store
                  setShowForm(false)
                }
              }} 
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">{dict.admin.machinery.external_code}</label>
                  <input type="text" name="external_code" className="w-full p-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">{dict.admin.machinery.full_name}</label>
                  <input type="text" name="machinery_full_name" required className="w-full p-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">{dict.admin.machinery.short_name}</label>
                  <input type="text" name="machinery_name" required className="w-full p-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">{dict.admin.machinery.model}</label>
                  <input type="text" name="machinery_model" className="w-full p-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">{dict.admin.machinery.serial_code}</label>
                  <input type="text" name="machinery_serial_code" className="w-full p-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
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
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 font-semibold text-gray-600">{dict.admin.machinery.external_code}</th>
                  <th className="p-4 font-semibold text-gray-600">{dict.admin.machinery.full_name}</th>
                  <th className="p-4 font-semibold text-gray-600">{dict.admin.machinery.short_name}</th>
                  <th className="p-4 font-semibold text-gray-600">{dict.admin.machinery.model}</th>
                  <th className="p-4 font-semibold text-gray-600">{dict.admin.machinery.serial_code}</th>
                  <th className="p-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="text-gray-900">
                {loading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-400 italic">Cargando maquinaria...</td></tr>
                ) : machinery.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">
                      {dict.admin.machinery.no_machinery}
                    </td>
                  </tr>
                ) : (
                  machinery.map((m) => (
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
