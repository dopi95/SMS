'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import DashboardLayout from '@/components/DashboardLayout'
import { useSettings } from '@/contexts/SettingsContext'
import { usePermissions } from '@/contexts/PermissionsContext'

interface Log {
  _id: string
  performedByName: string
  performedByRole: string
  performedByPhoto?: string
  action: string
  module: string
  description: string
  createdAt: string
}

const MODULE_COLORS: Record<string, string> = {
  'Student':         'bg-blue-100 text-blue-700',
  'Employee':        'bg-indigo-100 text-indigo-700',
  'Payment':         'bg-green-100 text-green-700',
  'Custom Payment':  'bg-teal-100 text-teal-700',
  'Pending Student': 'bg-yellow-100 text-yellow-700',
  'Profile':         'bg-purple-100 text-purple-700',
}

const ACTION_COLORS: Record<string, string> = {
  'Added':          'bg-green-50 text-green-700 border-green-200',
  'Edited':         'bg-blue-50 text-blue-700 border-blue-200',
  'Deleted':        'bg-red-50 text-red-600 border-red-200',
  'Deleted File':   'bg-red-50 text-red-600 border-red-200',
  'Deactivated':    'bg-orange-50 text-orange-700 border-orange-200',
  'Activated':      'bg-green-50 text-green-700 border-green-200',
  'Approved':       'bg-green-50 text-green-700 border-green-200',
  'Rejected':       'bg-orange-50 text-orange-700 border-orange-200',
  'Payment Added':  'bg-green-50 text-green-700 border-green-200',
  'Payment Deleted':'bg-red-50 text-red-600 border-red-200',
  'Profile Updated':'bg-purple-50 text-purple-700 border-purple-200',
  'Password Changed':'bg-purple-50 text-purple-700 border-purple-200',
  'Created File':   'bg-teal-50 text-teal-700 border-teal-200',
  'Added Entry':    'bg-teal-50 text-teal-700 border-teal-200',
  'Edited Entry':   'bg-blue-50 text-blue-700 border-blue-200',
  'Deleted Entry':  'bg-red-50 text-red-600 border-red-200',
  'Bulk Deleted':   'bg-red-50 text-red-600 border-red-200',
}

export default function ActivityLogsPage() {
  const { theme } = useSettings()
  const { role } = usePermissions()
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterModule, setFilterModule] = useState('all')
  const [confirmClear, setConfirmClear] = useState(false)

  const token = () => localStorage.getItem('token')

  const fetchLogs = async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/activity-logs`, {
        headers: { Authorization: `Bearer ${token()}` }
      })
      setLogs(res.data)
    } catch { toast.error('Failed to load logs') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchLogs() }, [])

  const handleClear = async () => {
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/activity-logs/clear`, {
        headers: { Authorization: `Bearer ${token()}` }
      })
      setLogs([])
      toast.success('Logs cleared')
    } catch { toast.error('Failed to clear logs') }
    finally { setConfirmClear(false) }
  }

  const modules = ['all', ...Array.from(new Set(logs.map(l => l.module)))]

  const filtered = logs.filter(l => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      l.performedByName.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      l.description.toLowerCase().includes(q) ||
      l.module.toLowerCase().includes(q)
    const matchModule = filterModule === 'all' || l.module === filterModule
    return matchSearch && matchModule
  })

  const card = `rounded-2xl border shadow-sm ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`

  return (
    <DashboardLayout pageTitle="Activity Logs">
      <div className={`min-h-screen p-4 sm:p-6 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-6xl mx-auto space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Activity Logs</h1>
              <p className={`text-sm mt-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{filtered.length} record{filtered.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={fetchLogs}
                className={`p-2 rounded-xl border transition-colors ${theme === 'dark' ? 'border-gray-600 text-gray-400 hover:bg-gray-700' : 'border-gray-200 text-gray-500 hover:bg-gray-100'}`}
                title="Refresh">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </button>
              {role === 'superadmin' && (
                <button onClick={() => setConfirmClear(true)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors">
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className={`${card} px-4 py-3 flex flex-wrap gap-3 items-center`}>
            <div className="relative flex-1 min-w-[200px]">
              <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" placeholder="Search by name, action, description..."
                value={search} onChange={e => setSearch(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`} />
            </div>
            <select value={filterModule} onChange={e => setFilterModule(e.target.value)}
              className={`px-3 py-2 border rounded-xl text-sm focus:outline-none ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}>
              {modules.map(m => <option key={m} value={m}>{m === 'all' ? 'All Modules' : m}</option>)}
            </select>
          </div>

          {/* Logs */}
          <div className={card}>
            {loading ? (
              <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
            ) : filtered.length === 0 ? (
              <div className="p-16 text-center">
                <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No activity logs found.</p>
              </div>
            ) : (
              <div className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-100'}`}>
                {filtered.map(log => (
                  <div key={log._id} className="px-5 py-4 flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden">
                      {log.performedByPhoto ? (
                        <img src={log.performedByPhoto} alt={log.performedByName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                          <span className="text-white font-bold text-sm">{log.performedByName.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{log.performedByName}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500'}`}>{log.performedByRole}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ACTION_COLORS[log.action] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>{log.action}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MODULE_COLORS[log.module] || 'bg-gray-100 text-gray-600'}`}>{log.module}</span>
                      </div>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{log.description}</p>
                    </div>

                    {/* Time */}
                    <div className="flex-shrink-0 text-right">
                      <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`}>{new Date(log.createdAt).toLocaleDateString()}</p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Clear Modal */}
      {confirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className={`w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="px-6 pt-8 pb-4 flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </div>
              <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Clear All Logs?</h2>
              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>This will permanently delete all activity logs. This cannot be undone.</p>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setConfirmClear(false)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${theme === 'dark' ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                Cancel
              </button>
              <button onClick={handleClear}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors">
                Yes, Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
