'use client'

import { useState } from 'react'
import { createMachineryLog } from '@/app/actions'

interface MachineryLogFormProps {
  machinery: { machinery_id: number, machinery_full_name: string }[]
  projects: { project_id: number, project_name: string }[]
  dict: any
}

export default function MachineryLogForm({ machinery, projects, dict }: MachineryLogFormProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ hash_id?: string, error?: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{dict.machinery}</label>
        <select 
          name="machine_id" 
          required 
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
        >
          <option value="">{dict.select_machinery}</option>
          {machinery.map((m) => (
            <option key={m.machinery_id} value={m.machinery_id}>{m.machinery_full_name}</option>
          ))}
        </select>
      </div>

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
