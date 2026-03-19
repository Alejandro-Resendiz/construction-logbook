'use client'

import { useState } from 'react'
import { getLogByHashId, updateMachineryLog } from '@/app/log/update/actions'

interface UpdateLogFormProps {
  dict: any
}

export default function UpdateLogForm({ dict }: UpdateLogFormProps) {
  const [hashId, setHashId] = useState('')
  const [log, setLog] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hashId) return
    
    setLoading(true)
    setError(null)
    setLog(null)
    
    const res = await getLogByHashId(hashId)
    if (res.error) {
      setError(dict.not_found)
    } else {
      setLog(res.log)
    }
    setLoading(false)
  }

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!log) return

    setLoading(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    const res = await updateMachineryLog(log.hash_id, formData)
    
    if (res.error) {
      setError(res.error)
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="text-center p-6 space-y-4">
        <div className="text-green-600 font-bold text-lg">{dict.success_title}</div>
        <p className="text-gray-600">{dict.success_message}</p>
        <button 
          onClick={() => window.location.href = '/'}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
        >
          {dict.back_to_home}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {!log ? (
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{dict.hash_id_label}</label>
            <input 
              type="text" 
              value={hashId}
              onChange={(e) => setHashId(e.target.value)}
              required 
              placeholder={dict.hash_id_placeholder}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-gray-900"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? dict.searching : dict.search_button}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          {/* Read-only Information Section */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-2">
            <div className="flex justify-between border-b border-blue-100 pb-1">
              <span className="text-xs text-blue-600 font-semibold uppercase">{dict.operator}</span>
              <span className="text-sm text-blue-900 font-medium">{log.operator_name}</span>
            </div>
            <div className="flex justify-between border-b border-blue-100 pb-1">
              <span className="text-xs text-blue-600 font-semibold uppercase">{dict.machinery}</span>
              <span className="text-sm text-blue-900 font-medium">{log.machinery?.machinery_name}</span>
            </div>
            <div className="flex justify-between border-b border-blue-100 pb-1">
              <span className="text-xs text-blue-600 font-semibold uppercase">{dict.project}</span>
              <span className="text-sm text-blue-900 font-medium">{log.projects?.project_name}</span>
            </div>
            <div className="flex justify-between border-b border-blue-100 pb-1">
              <span className="text-xs text-blue-600 font-semibold uppercase">{dict.date}</span>
              <span className="text-sm text-blue-900 font-medium">{log.date}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-xs text-blue-600 font-semibold uppercase">{dict.start_time}</span>
              <span className="text-sm text-blue-900 font-medium">{log.start_time}</span>
            </div>
          </div>

          {log.is_completed ? (
            <div className="p-4 bg-yellow-100 text-yellow-800 rounded-lg border border-yellow-200">
              {dict.already_completed}
            </div>
          ) : (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{dict.end_time}</label>
                <input 
                  type="time" 
                  name="end_time" 
                  required 
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{dict.observations}</label>
                <textarea 
                  name="observations" 
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                  placeholder={dict.observations_placeholder}
                ></textarea>
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400"
              >
                {loading ? dict.updating : dict.submit}
              </button>
            </form>
          )}
          <button 
            onClick={() => setLog(null)}
            className="w-full text-sm text-gray-500 hover:text-gray-700 underline"
          >
            {dict.search_another}
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
