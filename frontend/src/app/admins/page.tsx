'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import DashboardLayout from '@/components/DashboardLayout'
import { useSettings } from '@/contexts/SettingsContext'

interface PermissionItem {
  page: string
  label: string
  labelAm: string
  actions: { key: string; label: string; labelAm: string }[]
}

interface PermissionGroup {
  groupName: string
  groupNameAm: string
  items: PermissionItem[]
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    groupName: '1. Dashboard',
    groupNameAm: '1. ዳሽቦርድ',
    items: [
      {
        page: 'dashboard',
        label: 'Dashboard',
        labelAm: 'ዳሽቦርድ',
        actions: [{ key: 'view', label: 'View', labelAm: 'እይ' }]
      },
    ]
  },
  {
    groupName: '2. Users',
    groupNameAm: '2. ተጠቃሚዎች',
    items: [
      {
        page: 'students',
        label: 'Students',
        labelAm: 'ተማሪዎች',
        actions: [
          { key: 'view', label: 'View', labelAm: 'እይ' },
          { key: 'add', label: 'Add', labelAm: 'ጨምር' },
          { key: 'edit', label: 'Edit', labelAm: 'አስተካክል' },
          { key: 'delete', label: 'Delete', labelAm: 'ሰርዝ' },
          { key: 'inactive', label: 'Inactive', labelAm: 'አቦዝን' }
        ]
      },
      {
        page: 'employees',
        label: 'Employees',
        labelAm: 'ሰራተኞች',
        actions: [
          { key: 'view', label: 'View', labelAm: 'እይ' },
          { key: 'add', label: 'Add', labelAm: 'ጨምር' },
          { key: 'edit', label: 'Edit', labelAm: 'አስተካክል' },
          { key: 'delete', label: 'Delete', labelAm: 'ሰርዝ' },
          { key: 'inactive', label: 'Inactive', labelAm: 'አቦዝን' }
        ]
      },
      {
        page: 'admins',
        label: 'Admins',
        labelAm: 'አስተዳዳሪዎች',
        actions: [
          { key: 'view', label: 'View', labelAm: 'እይ' },
          { key: 'add', label: 'Add', labelAm: 'ጨምር' },
          { key: 'edit', label: 'Edit', labelAm: 'አስተካክል' },
          { key: 'delete', label: 'Delete', labelAm: 'ሰርዝ' }
        ]
      },
    ]
  },
  {
    groupName: '3. Payments',
    groupNameAm: '3. ክፍያዎች',
    items: [
      {
        page: 'payments',
        label: 'Monthly Payments',
        labelAm: 'ወርሃዊ ክፍያዎች',
        actions: [
          { key: 'view', label: 'View', labelAm: 'እይ' },
          { key: 'add', label: 'Add', labelAm: 'ጨምር' },
          { key: 'delete', label: 'Delete', labelAm: 'ሰርዝ' }
        ]
      },
      {
        page: 'custom-payment',
        label: 'Custom Payments',
        labelAm: 'ልዩ ክፍያዎች',
        actions: [
          { key: 'view', label: 'View', labelAm: 'እይ' },
          { key: 'add', label: 'Add', labelAm: 'ጨምር' },
          { key: 'edit', label: 'Edit', labelAm: 'አስተካክል' },
          { key: 'delete', label: 'Delete', labelAm: 'ሰርዝ' }
        ]
      },
      {
        page: 'bank-reports',
        label: 'Transaction Reports',
        labelAm: 'የግብይት ሪፖርቶች',
        actions: [
          { key: 'view', label: 'View', labelAm: 'እይ' },
          { key: 'link', label: 'Link', labelAm: 'አገናኝ' },
          { key: 'approve', label: 'Approve', labelAm: 'አጽድቅ' },
          { key: 'delete', label: 'Delete', labelAm: 'ሰርዝ' }
        ]
      },
    ]
  },
  {
    groupName: '4. Notifications',
    groupNameAm: '4. ማሳወቂያዎች',
    items: [
      {
        page: 'notifications',
        label: 'SMS Notifications',
        labelAm: 'የኤስኤምኤስ ማሳወቂያዎች',
        actions: [
          { key: 'view', label: 'View', labelAm: 'እይ' },
          { key: 'send', label: 'Send', labelAm: 'ላክ' }
        ]
      },
      {
        page: 'notice',
        label: 'Portal Notifications',
        labelAm: 'የፖርታል ማስታወቂያዎች',
        actions: [
          { key: 'view', label: 'View', labelAm: 'እይ' },
          { key: 'send', label: 'Send', labelAm: 'ላክ' },
          { key: 'delete', label: 'Delete', labelAm: 'ሰርዝ' }
        ]
      },
    ]
  },
  {
    groupName: '5. Settings',
    groupNameAm: '5. ቅንብሮች',
    items: [
      {
        page: 'settings',
        label: 'System Settings',
        labelAm: 'የስርዓት ቅንብሮች',
        actions: [
          { key: 'view', label: 'View', labelAm: 'እይ' },
          { key: 'edit', label: 'Edit', labelAm: 'አስተካክል' }
        ]
      },
      {
        page: 'bank-settings',
        label: 'Bank Settings',
        labelAm: 'የባንክ ቅንብሮች',
        actions: [
          { key: 'view', label: 'View', labelAm: 'እይ' },
          { key: 'edit', label: 'Edit', labelAm: 'አስተካክል' }
        ]
      },
    ]
  },
  {
    groupName: '6. Activity Logs',
    groupNameAm: '6. የእንቅስቃሴ ምዝገባ',
    items: [
      {
        page: 'activity-logs',
        label: 'Activity Logs',
        labelAm: 'የእንቅስቃሴ ምዝገባ',
        actions: [{ key: 'view', label: 'View', labelAm: 'እይ' }]
      },
    ]
  },
  {
    groupName: '7. My Profile',
    groupNameAm: '7. የእኔ መገለጫ',
    items: [
      {
        page: 'profile',
        label: 'My Profile',
        labelAm: 'የእኔ መገለጫ',
        actions: [
          { key: 'view', label: 'View', labelAm: 'እይ' },
          { key: 'edit', label: 'Edit', labelAm: 'አስተካክል' }
        ]
      },
    ]
  },
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
  phone?: string
  mustChangePassword?: boolean
  permissions: { page: string; actions: string[] }[]
  isActive: boolean
  createdAt: string
  profilePhoto?: string
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
  const { theme, getText } = useSettings()
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Admin | null>(null)
  const [deleting, setDeleting] = useState<Admin | null>(null)
  const [showPassFor, setShowPassFor] = useState<string | null>(null)

  // form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [sendNotification, setSendNotification] = useState(true)
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'superadmin' | 'admin' | 'executive'>('admin')
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
    } catch {
      toast.error(getText('Failed to load admins', 'አስተዳዳሪዎችን መጫን አልተሳካም'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetch() }, [])

  useEffect(() => {
    const onFocus = () => fetch()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const generateRandomPassword = () => {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
    const lowercase = 'abcdefghijkmnopqrstuvwxyz'
    const numbers = '23456789'
    const symbols = '!@#$*&'
    const all = uppercase + lowercase + numbers + symbols

    let pass = ''
    pass += uppercase[Math.floor(Math.random() * uppercase.length)]
    pass += lowercase[Math.floor(Math.random() * lowercase.length)]
    pass += numbers[Math.floor(Math.random() * numbers.length)]
    pass += symbols[Math.floor(Math.random() * symbols.length)]

    for (let i = 0; i < 6; i++) {
      pass += all[Math.floor(Math.random() * all.length)]
    }

    const shuffled = pass.split('').sort(() => 0.5 - Math.random()).join('')
    setPassword(shuffled)
  }

  const openCreate = () => {
    setEditing(null)
    setName('')
    setEmail('')
    setPhone('')
    setSendNotification(true)
    setPassword('')
    setRole('admin')
    setPermMap({ dashboard: ['view'], profile: ['view', 'edit'] })
    setShowModal(true)
  }

  const openEdit = (a: Admin) => {
    setEditing(a)
    setName(a.name)
    setEmail(a.email)
    setPhone(a.phone || '')
    setSendNotification(false)
    setPassword('')
    setRole(a.role as 'superadmin' | 'admin' | 'executive')
    setPermMap(buildPermMap(a.permissions || []))
    setShowModal(true)
  }

  // When role changes auto-set defaults
  const handleRoleChange = (r: 'superadmin' | 'admin' | 'executive') => {
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
      toast.error(getText('Name, email and password are required', 'ስም፣ ኢሜይል እና የይለፍ ቃል ያስፈልጋሉ'))
      return
    }
    setSaving(true)
    try {
      const payload: any = {
        name,
        email,
        role,
        phone: phone.trim(),
        permissions: permMapToArray(permMap)
      }
      if (password) payload.password = password
      if (!editing) payload.sendNotification = sendNotification

      if (editing) {
        const res = await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/admins/${editing._id}`, payload, {
          headers: { Authorization: `Bearer ${token()}` }
        })
        setAdmins(prev => prev.map(a => a._id === editing._id ? res.data : a))
        toast.success(getText('Admin updated successfully', 'አስተዳዳሪ በተሳካ ሁኔታ ተዘምኗል'))
      } else {
        const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/admins`, payload, {
          headers: { Authorization: `Bearer ${token()}` }
        })
        setAdmins(prev => [res.data, ...prev])
        if (res.data.smsSent) {
          toast.success(getText('Admin created & SMS credentials sent successfully!', 'አስተዳዳሪ ተፈጥሯል፤ የመግቢያ መረጃዎች በኤስኤምኤስ ተልከዋል!'))
        } else if (res.data.smsError) {
          toast.success(getText(`Admin created, but SMS failed: ${res.data.smsError}`, `አስተዳዳሪ ተፈጥሯል፤ ግን ኤስኤምኤስ መላክ አልተሳካም፡ ${res.data.smsError}`))
        } else {
          toast.success(getText('Admin created successfully', 'አስተዳዳሪ በተሳካ ሁኔታ ተፈጥሯል'))
        }
      }
      setShowModal(false)
    } catch (e: any) {
      toast.error(e.response?.data?.message || getText('Failed to save', 'ማስቀመጥ አልተሳካም'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/admins/${deleting._id}`, {
        headers: { Authorization: `Bearer ${token()}` }
      })
      setAdmins(prev => prev.filter(a => a._id !== deleting._id))
      toast.success(getText('Admin deleted', 'አስተዳዳሪ ተሰርዟል'))
    } catch (e: any) {
      toast.error(e.response?.data?.message || getText('Failed to delete', 'መሰረዝ አልተሳካም'))
    } finally {
      setDeleting(null)
    }
  }

  const card = `rounded-2xl border shadow-sm ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`
  const inp = `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`
  const lbl = `block text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`

  return (
    <DashboardLayout pageTitle="Admins">
      <div className={`min-h-screen p-4 sm:p-6 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Header — with pr-16 / lg:pr-24 so notification bell never overlaps Add Admin button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pr-16 sm:pr-20 lg:pr-24">
            <div>
              <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {getText('Admins', 'አስተዳዳሪዎች')}
              </h1>
              <p className={`text-sm mt-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {admins.length} {getText(`admin${admins.length !== 1 ? 's' : ''}`, 'አስተዳዳሪዎች')}
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={fetch}
                className={`p-2.5 rounded-xl border transition-colors ${theme === 'dark' ? 'border-gray-600 text-gray-400 hover:bg-gray-700' : 'border-gray-200 text-gray-500 hover:bg-gray-100'}`}
                title={getText('Refresh', 'አድስ')}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>{getText('Add Admin', 'አስተዳዳሪ መዝግብ')}</span>
              </button>
            </div>
          </div>

          {/* Cards */}
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            </div>
          ) : admins.length === 0 ? (
            <div className={`${card} p-16 text-center`}>
              <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {getText('No admins yet. Create one to get started.', 'እስካሁን ምንም አስተዳዳሪዎች የሉም። ለመጀመር አንዱን ይፍጠሩ።')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...admins].sort((a, b) => {
                const order: Record<string, number> = { superadmin: 0, admin: 1, executive: 2 }
                return (order[a.role] ?? 3) - (order[b.role] ?? 3)
              }).map(a => (
                <div key={a._id} className={`${card} p-5 flex flex-col gap-3.5`}>
                  {/* Top */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-full flex-shrink-0 overflow-hidden">
                        {a.profilePhoto ? (
                          <img src={a.profilePhoto} alt={a.name} className="w-11 h-11 rounded-full object-cover" />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <span className="text-white font-bold text-base">{a.name.charAt(0).toUpperCase()}</span>
                          </div>
                        )}
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

                  {/* Phone & Status */}
                  <div className="flex items-center justify-between text-xs gap-2">
                    {a.phone ? (
                      <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 font-mono">
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span>{a.phone}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic text-[11px]">{getText('No phone', 'ስልክ የለም')}</span>
                    )}

                    {a.mustChangePassword && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                        {getText('Must Change Password', 'የይለፍ ቃል መቀየር አለበት')}
                      </span>
                    )}
                  </div>

                  {/* Credentials */}
                  <div className={`rounded-xl px-3 py-2.5 space-y-1.5 ${theme === 'dark' ? 'bg-gray-700/60' : 'bg-gray-50'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {getText('Username', 'የተጠቃሚ ስም')}
                      </span>
                      <span className={`text-xs font-mono font-semibold truncate max-w-[160px] ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                        {a.email}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {getText('Password', 'የይለፍ ቃል')}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-mono font-semibold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                          {showPassFor === a._id ? (a.plainPassword || '••••••••') : '••••••••'}
                        </span>
                        <button
                          onClick={() => setShowPassFor(showPassFor === a._id ? null : a._id)}
                          className={`text-xs font-medium ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}
                        >
                          {showPassFor === a._id ? getText('Hide', 'ደብቅ') : getText('Show', 'አሳይ')}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Permissions summary */}
                  {a.role !== 'superadmin' ? (
                    <div className="flex flex-wrap gap-1">
                      {(a.permissions || []).slice(0, 5).map(p => (
                        <span key={p.page} className={`text-xs px-2 py-0.5 rounded-full ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-blue-50 text-blue-700'}`}>
                          {p.page}
                        </span>
                      ))}
                      {(a.permissions || []).length > 5 && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                          +{(a.permissions || []).length - 5}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 w-fit">
                      {getText('All Access', 'ሙሉ መዳረሻ')}
                    </span>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1 border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => openEdit(a)}
                      className="flex-1 py-1.5 text-xs font-semibold bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors"
                    >
                      {getText('Edit', 'አስተካክል')}
                    </button>
                    <button
                      onClick={() => setDeleting(a)}
                      className="flex-1 py-1.5 text-xs font-semibold bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800 transition-colors"
                    >
                      {getText('Delete', 'ሰርዝ')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── CREATE / EDIT MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div
            className={`w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-inherit z-10">
              <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {editing ? getText('Edit Admin', 'አስተዳዳሪ አስተካክል') : getText('Create Admin', 'አዲስ አስተዳዳሪ መዝግብ')}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Basic fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>{getText('Full Name *', 'ሙሉ ስም *')}</label>
                  <input className={inp} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Abebe Kebede" />
                </div>
                <div>
                  <label className={lbl}>{getText('Email (Username) *', 'ኢሜይል (የተጠቃሚ ስም) *')}</label>
                  <input className={inp} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@bluelight.edu.et" />
                </div>
                <div>
                  <label className={lbl}>{getText('Phone Number', 'ስልክ ቁጥር')}</label>
                  <input className={inp} type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0912345678 or 2519..." />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={lbl}>{editing ? getText('New Password (leave blank to keep)', 'አዲስ የይለፍ ቃል (ሳይቀይሩ ለመተው ባዶ ይተዉት)') : getText('Password *', 'የይለፍ ቃል *')}</label>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 hover:underline"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>{getText('Auto Generate', 'በራስ-ሰር አመንጭ')}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      className={`${inp} pr-24`}
                      type="text"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={getText('Write manually or generate', 'በእጅ ያስገቡ ወይም አመንጭ ይጫኑ')}
                    />
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="absolute right-1.5 top-1.5 bottom-1.5 px-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-300 rounded-md text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm"
                      title={getText('Click to generate random password', 'የዘፈቀደ የይለፍ ቃል ለማመንጨት ጠቅ ያድርጉ')}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      <span>{getText('Generate', 'አመንጭ')}</span>
                    </button>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className={lbl}>{getText('Role *', 'ሚና *')}</label>
                  <select className={inp} value={role} onChange={e => handleRoleChange(e.target.value as any)}>
                    <option value="superadmin">{getText('Super Admin (Full Access)', 'ሱፐር አድሚን (ሙሉ መዳረሻ)')}</option>
                    <option value="admin">{getText('Admin (Custom Permissions)', 'አድሚን (የተመረጡ ፈቃዶች)')}</option>
                    <option value="executive">{getText('Executive', 'ኤክስኪዩቲቭ')}</option>
                  </select>
                </div>

                {/* SMS Notification Checkbox — Only on Create */}
                {!editing && (
                  <div className="sm:col-span-2 p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={sendNotification}
                        onChange={e => setSendNotification(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-blue-300' : 'text-blue-900'}`}>
                        {getText('Send SMS notification with credentials & login link', 'የመግቢያ መረጃዎችን እና የፖርታል ሊንክ በኤስኤምኤስ ላክ')}
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 pl-6.5">
                      {getText(
                        'Automatically delivers an SMS containing the username, password, portal link (admission.bluelight.edu.et), and reminder to change password upon first login.',
                        'የተጠቃሚ ስም፣ የይለፍ ቃል፣ የመግቢያ ሊንክ (admission.bluelight.edu.et) እና በመጀመሪያው መግቢያ ላይ የይለፍ ቃል እንዲቀይሩ ማሳሰቢያ የያዘ ኤስኤምኤስ ወዲያውኑ ይልካል።'
                      )}
                    </p>
                  </div>
                )}
              </div>

              {/* Permissions builder — organized by new sidebar menu groups */}
              {role !== 'superadmin' && (
                <div>
                  <div className="mb-3">
                    <p className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {getText('Page Permissions (Organized by Menu Group)', 'የገጾች ፈቃዶች (በቡድን የተደራጁ)')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {getText(
                        'Note: Transaction Reports and Bank Settings are separate permissions.',
                        'ማሳሰቢያ፡ የግብይት ሪፖርቶች እና የባንክ ቅንብሮች የተለያዩ ፈቃዶች ናቸው።'
                      )}
                    </p>
                  </div>

                  <div className="space-y-4">
                    {PERMISSION_GROUPS.map(grp => (
                      <div
                        key={grp.groupName}
                        className={`rounded-xl border p-3.5 ${
                          theme === 'dark' ? 'bg-gray-800/80 border-gray-700' : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-gray-200 dark:border-gray-700">
                          <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400"></span>
                          <h4 className={`text-xs font-bold uppercase tracking-wider ${
                            theme === 'dark' ? 'text-blue-400' : 'text-blue-700'
                          }`}>
                            {getText(grp.groupName, grp.groupNameAm)}
                          </h4>
                        </div>

                        <div className="space-y-2">
                          {grp.items.map(pg => {
                            const isSelected = !!permMap[pg.page]
                            const isLocked = pg.page === 'dashboard' || pg.page === 'profile'
                            return (
                              <div
                                key={pg.page}
                                className={`rounded-lg border p-2.5 transition-colors ${
                                  isSelected
                                    ? theme === 'dark'
                                      ? 'border-blue-500 bg-blue-900/20'
                                      : 'border-blue-300 bg-blue-50/70'
                                    : theme === 'dark'
                                      ? 'border-gray-600 bg-gray-700/50'
                                      : 'border-gray-200 bg-white'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      disabled={isLocked}
                                      onChange={() => !isLocked && togglePage(pg.page)}
                                      className="w-4 h-4 rounded text-blue-600"
                                    />
                                    <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                                      {getText(pg.label, pg.labelAm)}
                                      {isLocked && <span className="ml-1 text-xs font-normal text-gray-400">({getText('always on', 'ሁልጊዜ በርቷል')})</span>}
                                    </span>
                                  </label>
                                </div>
                                {isSelected && (
                                  <div className="flex flex-wrap gap-2 pl-6">
                                    {pg.actions.map(act => (
                                      <label key={act.key} className="flex items-center gap-1.5 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={(permMap[pg.page] || []).includes(act.key)}
                                          disabled={act.key === 'view' && isLocked}
                                          onChange={() => toggleAction(pg.page, act.key)}
                                          className="w-3.5 h-3.5 rounded text-blue-600"
                                        />
                                        <span className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                                          {getText(act.label, act.labelAm)}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${theme === 'dark' ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                {getText('Cancel', 'ይቅር')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <span>{editing ? getText('Save Changes', 'ለውጦችን መዝግብ') : getText('Create Admin', 'አስተዳዳሪ ፍጠር')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM ── */}
      {deleting && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="px-6 pt-8 pb-4 flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {getText('Delete Admin?', 'አስተዳዳሪ ይሰረዝ?')}
              </h2>
              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {getText(
                  `This will permanently delete ${deleting.name}. This cannot be undone.`,
                  `${deleting.name} በቋሚነት ይሰረዛል። ይህን መመለስ አይቻልም።`
                )}
              </p>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setDeleting(null)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${theme === 'dark' ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
              >
                {getText('Cancel', 'ይቅር')}
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {getText('Yes, Delete', 'አዎ፣ ሰርዝ')}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
