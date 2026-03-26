'use client'

import { useState } from 'react'
import { getLogByHashId } from '@/app/log/update/actions'
import { adminUpdateLog } from '@/app/app/log/correct/actions'

interface CorrectionLogFormProps {
  dict: any
  adminDict: any
}

export default function CorrectionLogForm({ dict, adminDict }: CorrectionLogFormProps) {
  const [hashId, setHashId] = useState('')
  const [log, setLog] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await getLogByHashId(hashId)
    if (res.error) setError(dict.not_found)
    else setLog(res.log)
    setLoading(false)
  }

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const res = await adminUpdateLog(log.hash_id, formData)
    if (res.error) setError(res.error)
    else setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="text-center p-6 space-y-4">
        <div className="text-green-600 font-bold text-lg">{adminDict.correction.success}</div>
        <button 
          onClick={() => window.location.href = '/app'} 
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
        >
          {adminDict.correction.back_to_panel}
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
              type="text" value={hashId} onChange={(e) => setHashId(e.target.value)}
              placeholder={dict.hash_id_placeholder} required
              className="w-full p-2 border border-gray-300 rounded-lg font-mono outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
            {loading ? dict.searching : dict.search_button}
          </button>
        </form>
      ) : (
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="bg-yellow-50 p-4 rounded-lg text-sm border border-yellow-100 text-gray-900">
            <p><strong>{dict.operator}:</strong> {log.operator_name}</p>
            <p><strong>{dict.date}:</strong> {log.date}</p>
            <p><strong>{dict.fuel_liters}:</strong> {log.fuel_liters}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{dict.fuel_price}</label>
            <input type="number" step="0.01" name="fuel_price" defaultValue={log.fuel_price} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{dict.end_time}</label>
            <input type="time" name="end_time" defaultValue={log.end_time} required className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{dict.observations}</label>
            <textarea name="observations" defaultValue={log.observations} rows={3} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" />
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700">
            {loading ? dict.updating : adminDict.correction.save_button}
          </button>
          <button type="button" onClick={() => setLog(null)} className="w-full text-sm text-gray-500 underline hover:text-gray-700">
            {adminDict.correction.cancel}
          </button>
        </form>
      )}
      {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}
    </div>
  )
}
