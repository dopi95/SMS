'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import DashboardLayout from '@/components/DashboardLayout'
import { useSettings } from '@/contexts/SettingsContext'

const ALL_PAGES: { page: string; label: string; actions: { key: string; label: string }[] }[] = [
  { page: 'dashboard',        label: 'Dashboard',         actions: [{ key: 'view', label: 'View' }] },
  { page: 'students',         label: 'Students',          actions: [{ key: 'view', label: 'View' }, { key: 'add', label: 'Add' }, { key: 'edit', label: 'Edit' }, { key: 'delete', label: 'Delete' }, { key: 'inactive', label: 'Inactive' }] },
  { page: 'employees',        label: 'Employees',         actions: [{ key: 'view', label: 'View' }, { key: 'add', label: 'Add' }, { key: 'edit', label: 'Edit' }, { key: 'delete', label: 'Delete' }, { key: 'inactive', label: 'Inactive' }] },
  { page: 'payments',         label: 'Payments',          actions: [{ key: 'view', label: 'View' }, { key: 'add', label: 'Add' }, { key: 'delete', label: 'Delete' }] },
  { page: 'custom-payment',   label: 'Custom Payment',    actions: [{ key: 'view', label: 'View' }, { key: 'add', label: 'Add' }, { key: 'edit', label: 'Edit' }, { key: 'delete', label: 'Delete' }] },
  { page: 'pending-students', label: 'Pending Students',  actions: [{ key: 'view', label: 'View' }, { key: 'approve', label: 'Approve' }, { key: 'reject', label: 'Reject' }, { key: 'delete', label: 'Delete' }] },
  { page: 'notifications',    label: 'Notifications',     actions: [{ key: 'view', label: 'View' }, { key: 'send', label: 'Send' }] },
  { page: 'admins',           label: 'Admins',            actions: [{ key: 'view', label: 'View' }, { key: 'add', label: 'Add' }, { key: 'edit', label: 'Edit' }, { key: 'delete', label: 'Delete' }] },
  { page: 'activity-logs',    label: 'Activity Logs',     actions: [{ key: 'view', label: 'View' }] },
  { page: 'profile',          label: 'My Profile',        actions: [{ key: 'view', label: 'View' }, { key: 'edit', label: 'Edit' }] },
]

const ROLE_COLORS: Record<string, string> = {
  superadmin: 'bg-purple-100 text-purple-700 border-purple-200',
  admin:      'bg-blue-100 text-blue-700 border-blue-200',
  executive:  'bg-amber-100 text-amber-700 border-amber-200',
}

interface Admin {
  _id: string
  name: string
  email: string
  plainPassword: string
  role: string
  permissions: { page: string; actions: string[] }[]
  isActive: boolean
  createdAt: string
}

type PermMap = Record<string, string[]>

function buildPermMap(permissions: { page: string; actions: string[] }[]): PermMap {
  const m: PermMap = {}
  permissions.forEach(p => { m[p.page] = p.actions })
  return m
}

function permMapToArray(m: PermMap) {
  return Object.entries(m)
    .filter(([, actions]) => actions.length > 0)
    .map(([page, actions]) => ({ page, actions }))
}

export default function AdminsPage() {
  const { theme } = useSettings()
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Admin | null>(null)
  const [deleting, setDeleting] = useState<Admin | null>(null)
  const [showPassFor, setShowPassFor] = useState<string | null>(null)

  // form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'executive'>('admin')
  const [permMap, setPermMap] = useState<PermMap>({
    dashboard: ['view'],
    profile: ['view', 'edit'],
  })
  const [saving, setSaving] = useState(false)

  const token = () => localStorage.getItem('token')

  const fetch = async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admins`, {
        headers: { Authorization: `Bearer ${token()}` }
      })
      setAdmins(res.data)
    } catch { toast.error('Failed to load admins') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [])

  const openCreate = () => {
    setEditing(null)
    setName(''); setEmail(''); setPassword(''); setRole('admin')
    setPermMap({ dashboard: ['view'], profile: ['view', 'edit'] })
    setShowModal(true)
  }

  const openEdit = (a: Admin) => {
    setEditing(a)
    setName(a.name); setEmail(a.email); setPassword(''); setRole(a.role as any)
    setPermMap(buildPermMap(a.permissions || []))
    setShowModal(true)
  }

  // When role changes auto-set defaults
  const handleRoleChange = (r: 'admin' | 'executive') => {
    setRole(r)
    setPermMap({ dashboard: ['view'], profile: ['view', 'edit'] })
  }

  const togglePage = (page: string) => {
    setPermMap(prev => {
      if (prev[page]) {
        const next = { ...prev }
        delete next[page]
        return next
      }
      return { ...prev, [page]: ['view'] }
    })
  }

  const toggleAction = (page: string, action: string) => {
    setPermMap(prev => {
      const current = prev[page] || []
      const next = current.includes(action)
        ? current.filter(a => a !== action)
        : [...current, action]
      return { ...prev, [page]: next }
    })
  }

  const handleSave = async () => {
    if (!name || !email || (!editing && !password)) {
      toast.error('Name, email and password are required'); return
    }
    setSaving(true)
    try {
      const payload: any = { name, email, role, permissions: permMapToArray(permMap) }
      if (password) payload.password = password
      if (editing) {
        const res = await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/admins/${editing._id}`, payload, {
          headers: { Authorization: `Bearer ${token()}` }
        })
        setAdmins(prev => prev.map(a => a._id === editing._id ? res.data : a))
        toast.success('Admin updated')
      } else {
        const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/admins`, payload, {
          headers: { Authorization: `Bearer ${token()}` }
        })
        setAdmins(prev => [res.data, ...prev])
        toast.success('Admin created')
      }
      setShowModal(false)
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/admins/${deleting._id}`, {
        headers: { Authorization: `Bearer ${token()}` }
      })
      setAdmins(prev => prev.filter(a => a._id !== deleting._id))
      toast.success('Admin deleted')
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to delete')
    } finally { setDeleting(null) }
  }

  const card = `rounded-2xl border shadow-sm ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`
  const inp = `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`
  const lbl = `block text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`

  return (
    <DashboardLayout pageTitle="Admins">
      <div className={`min-h-screen p-4 sm:p-6 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Admins</h1>
              <p className={`text-sm mt-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{admins.length} admin{admins.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Admin
            </button>
          </div>

          {/* Cards */}
          {loading ? (
            <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
          ) : admins.length === 0 ? (
            <div className={`${card} p-16 text-center`}>
              <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No admins yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {admins.map(a => (
                <div key={a._id} className={`${card} p-5 flex flex-col gap-4`}>
                  {/* Top */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-base">{a.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className={`font-semibold text-sm truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{a.name}</p>
                        <p className={`text-xs truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{a.email}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 capitalize ${ROLE_COLORS[a.role] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                      {a.role === 'superadmin' ? 'Super Admin' : a.role}
                    </span>
                  </div>

                  {/* Credentials */}
                  <div className={`rounded-xl px-3 py-2.5 space-y-1.5 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Username</span>
                      <span className={`text-xs font-mono font-semibold truncate max-w-[160px] ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>{a.email}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Password</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-mono font-semibold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                          {showPassFor === a._id ? (a.plainPassword || '••••••••') : '••••••••'}
                        </span>
                        <button onClick={() => setShowPassFor(showPassFor === a._id ? null : a._id)}
                          className={`text-xs ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                          {showPassFor === a._id ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Permissions summary */}
                  {a.role !== 'superadmin' && (
                    <div className="flex flex-wrap gap-1">
                      {(a.permissions || []).slice(0, 5).map(p => (
                        <span key={p.page} className={`text-xs px-2 py-0.5 rounded-full ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-blue-50 text-blue-700'}`}>
                          {p.page}
                        </span>
                      ))}
                      {(a.permissions || []).length > 5 && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                          +{a.permissions.length - 5} more
                        </span>
                      )}
                      {a.role === 'superadmin' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">All Access</span>
                      )}
                    </div>
                  )}
                  {a.role === 'superadmin' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 w-fit">All Access</span>
                  )}

                  {/* Actions */}
                  {a.role !== 'superadmin' && (
                    <div className="flex gap-2 pt-1 border-t border-gray-100 dark:border-gray-700">
                      <button onClick={() => openEdit(a)}
                        className="flex-1 py-1.5 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 transition-colors">
                        Edit
                      </button>
                      <button onClick={() => setDeleting(a)}
                        className="flex-1 py-1.5 text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-200 transition-colors">
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── CREATE / EDIT MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowModal(false)}>
          <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
            onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {editing ? 'Edit Admin' : 'Create Admin'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Basic fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Full Name *</label>
                  <input className={inp} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Doe" />
                </div>
                <div>
                  <label className={lbl}>Email (Username) *</label>
                  <input className={inp} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@school.com" />
                </div>
                <div>
                  <label className={lbl}>{editing ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                  <input className={inp} type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" />
                </div>
                <div>
                  <label className={lbl}>Role *</label>
                  <select className={inp} value={role} onChange={e => handleRoleChange(e.target.value as any)}>
                    <option value="admin">Admin</option>
                    <option value="executive">Executive</option>
                  </select>
                </div>
              </div>

              {/* Permissions builder */}
              <div>
                <p className={`text-sm font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Page Permissions</p>
                <div className="space-y-2">
                  {ALL_PAGES.map(pg => {
                    const isSelected = !!permMap[pg.page]
                    const isLocked = pg.page === 'dashboard' || pg.page === 'profile'
                    return (
                      <div key={pg.page} className={`rounded-xl border p-3 transition-colors ${isSelected
                        ? theme === 'dark' ? 'border-blue-500 bg-blue-900/20' : 'border-blue-300 bg-blue-50'
                        : theme === 'dark' ? 'border-gray-600 bg-gray-700/50' : 'border-gray-200 bg-gray-50'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={isSelected} disabled={isLocked}
                              onChange={() => !isLocked && togglePage(pg.page)}
                              className="w-4 h-4 rounded text-blue-600" />
                            <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                              {pg.label}
                              {isLocked && <span className="ml-1 text-xs font-normal text-gray-400">(always on)</span>}
                            </span>
                          </label>
                        </div>
                        {isSelected && (
                          <div className="flex flex-wrap gap-2 pl-6">
                            {pg.actions.map(act => (
                              <label key={act.key} className="flex items-center gap-1.5 cursor-pointer">
                                <input type="checkbox"
                                  checked={(permMap[pg.page] || []).includes(act.key)}
                                  disabled={act.key === 'view' && isLocked}
                                  onChange={() => toggleAction(pg.page, act.key)}
                                  className="w-3.5 h-3.5 rounded text-blue-600" />
                                <span className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{act.label}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setShowModal(false)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${theme === 'dark' ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {editing ? 'Save Changes' : 'Create Admin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM ── */}
      {deleting && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className={`w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="px-6 pt-8 pb-4 flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </div>
              <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Delete Admin?</h2>
              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                This will permanently delete <strong>{deleting.name}</strong>. This cannot be undone.
              </p>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setDeleting(null)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${theme === 'dark' ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                Cancel
              </button>
              <button onClick={handleDelete}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors">
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
