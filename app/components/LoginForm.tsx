'use client'

import { useState } from 'react'
import { login } from '@/app/login/actions'

interface LoginFormProps {
  dict: any
}

export default function LoginForm({ dict }: LoginFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAction = async (formData: FormData) => {
    setLoading(true)
    setError(null)
    
    const result = await login(formData)
    
    if (result?.error) {
      setError(dict.login_error)
      setLoading(false)
    }
  }

  return (
    <form action={handleAction} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{dict.email}</label>
        <input 
          type="email" 
          name="email"
          autoComplete="email"
          required 
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{dict.password}</label>
        <input 
          type="password" 
          name="password"
          autoComplete="current-password"
          required 
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
        />
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
      >
        {loading ? dict.logging_in : dict.login_button}
      </button>
    </form>
  )
}
