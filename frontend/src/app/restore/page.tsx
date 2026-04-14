'use client'

import { useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function RestorePage() {
  const [secret, setSecret] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const [results, setResults] = useState<Record<string, number> | null>(null)

  const handleRestore = async () => {
    if (!secret || !file) return setMessage('Please provide both the secret key and backup file.')

    try {
      setStatus('loading')
      setMessage('')

      const text = await file.text()
      const backup = JSON.parse(text)

      const res = await fetch(`${API_URL}/backup/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, data: backup.data }),
      })

      const json = await res.json()

      if (!res.ok) {
        setStatus('error')
        setMessage(json.message || 'Restore failed')
        return
      }

      setStatus('success')
      setMessage('All data restored successfully!')
      setResults(json.restored)
    } catch (err: any) {
      setStatus('error')
      setMessage(err.message || 'Something went wrong')
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Database Restore</h1>
          <p className="text-gray-500 text-sm mt-1">Restore your backup to the new database</p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Restore Secret Key</label>
            <input
              type="password"
              value={secret}
              onChange={e => setSecret(e.target.value)}
              placeholder="Enter your restore secret"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Backup File (.json)</label>
            <input
              type="file"
              accept=".json"
              onChange={e => setFile(e.target.files?.[0] || null)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {file && <p className="text-xs text-gray-500 mt-1">Selected: {file.name}</p>}
          </div>

          {message && (
            <div className={`p-3 rounded-lg text-sm ${status === 'success' ? 'bg-green-50 text-green-700' : status === 'error' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'}`}>
              {message}
            </div>
          )}

          {results && (
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
              <p className="font-medium text-gray-700 mb-2">Restored Records:</p>
              {Object.entries(results).map(([key, count]) => (
                <div key={key} className="flex justify-between text-gray-600">
                  <span className="capitalize">{key}</span>
                  <span className="font-medium text-blue-600">{count}</span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleRestore}
            disabled={status === 'loading' || !secret || !file}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {status === 'loading' ? 'Restoring...' : 'Restore Database'}
          </button>
        </div>
      </div>
    </div>
  )
}
