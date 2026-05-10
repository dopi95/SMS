'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import toast, { Toaster } from 'react-hot-toast'

interface StudentProfile {
  _id: string; studentId: string; firstName: string; middleName: string; lastName: string
  firstNameAmharic?: string; middleNameAmharic?: string; lastNameAmharic?: string
  email?: string; gender: string; dateOfBirth?: string; joinedYear: string
  class: string; section?: string; address?: string; paymentCode?: string; photo?: string
  fatherName?: string; fatherPhone?: string; fatherPhoto?: string
  motherName?: string; motherPhone?: string; motherPhoto?: string
  portalUsername: string
}

interface Payment { _id: string; month: string; year: number; amount: number }
interface Notice { _id: string; title: string; message: string; sentBy: string; createdAt: string }

const MONTHS = ['September','October','November','December','January','February','March','April','May','June']

export default function StudentDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [notices, setNotices] = useState<Notice[]>([])
  const [selectedYear, setSelectedYear] = useState(2019)
  const [page, setPage] = useState<'overview' | 'profile' | 'password'>('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [changingPw, setChangingPw] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem('portal_user')
    if (!raw) { router.push('/login'); return }
    const data = JSON.parse(raw)
    if (data.role !== 'student') { router.push('/login'); return }
    const username = data.profile?.portalUsername
    if (!username) { router.push('/login'); return }
    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/auth/portal-profile/${encodeURIComponent(username)}`)
      .then(res => {
        const fresh = { role: res.data.role, profile: res.data.profile }
        localStorage.setItem('portal_user', JSON.stringify(fresh))
        setProfile(res.data.profile)
        fetchPayments(res.data.profile._id)
      })
      .catch(() => { setProfile(data.profile); fetchPayments(data.profile._id) })
    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/auth/portal-notices`)
      .then(res => setNotices(res.data))
      .catch(() => {})
  }, [router])

  const fetchPayments = async (id: string) => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/auth/portal-payments/${id}`)
      setPayments(res.data)
    } catch {}
  }

  const logout = () => { localStorage.removeItem('portal_user'); router.push('/login') }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPw !== confirmPw) { toast.error('Passwords do not match'); return }
    if (newPw.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setChangingPw(true)
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/portal-change-password`, {
        username: profile?.portalUsername, currentPassword: currentPw, newPassword: newPw, role: 'student'
      })
      toast.success('Password changed successfully!')
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password')
    } finally { setChangingPw(false) }
  }

  const isPaid = (month: string) => payments.some(p => p.month === month && p.year === selectedYear)
  const formatDOB = (dob?: string) => { if (!dob) return '-'; const d = new Date(dob); return isNaN(d.getTime()) ? dob : d.toLocaleDateString() }

  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  )

  const initials = `${profile.firstName[0]}${profile.lastName[0]}`

  const navItems = [
    { key: 'overview' as const, label: 'Overview', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
    )},
    { key: 'profile' as const, label: 'My Profile', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
    )},
    { key: 'password' as const, label: 'Change Password', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
    )},
  ]

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      {/* Logo + X button on mobile */}
      <div className="px-5 py-5 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/lo.png" alt="Bluelight Academy" className="w-9 h-9 rounded-full object-contain flex-shrink-0" />
            <div>
              <p className="font-bold text-gray-800 text-sm leading-tight">Bluelight Academy</p>
              <p className="text-gray-400 text-xs">Student Portal</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Profile mini */}
      <div className="px-5 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          {profile.photo
            ? <img src={profile.photo} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-blue-400 flex-shrink-0" />
            : <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{initials}</div>
          }
          <div className="min-w-0">
            <p className="text-gray-800 font-semibold text-sm truncate">{profile.firstName} {profile.lastName}</p>
            <p className="text-gray-400 text-xs">{profile.studentId}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(item => (
          <button key={item.key} onClick={() => { setPage(item.key); setSidebarOpen(false) }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              page === item.key ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-600 hover:bg-gray-100'
            }`}>
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-200">
        <button onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Logout
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Toaster />

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 fixed inset-y-0 left-0 z-30">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-64 bg-white border-r border-gray-200 h-full z-50">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-gray-200 text-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-700">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <span className="font-semibold text-sm text-gray-800">{navItems.find(n => n.key === page)?.label}</span>
          <div className="w-8" />
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-4xl w-full mx-auto">

          {/* Overview */}
          {page === 'overview' && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-gray-800">Welcome back, {profile.firstName} 👋</h1>
                <p className="text-gray-500 text-sm mt-0.5">Here are the latest notices from Bluelight Academy.</p>
              </div>

              {notices.length === 0 ? (
                <div className="bg-white rounded-xl shadow p-10 text-center">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  <p className="text-gray-400 text-sm">No notices yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notices.map((n, i) => (
                    <div key={n._id} className="bg-white rounded-xl shadow p-5 border-l-4 border-blue-500">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {i === 0 && <span className="text-xs bg-blue-100 text-blue-600 font-semibold px-2 py-0.5 rounded-full">New</span>}
                            <h3 className="font-semibold text-gray-800 text-sm">{n.title}</h3>
                          </div>
                          <p className="text-gray-600 text-sm leading-relaxed">{n.message}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-gray-400">By {n.sentBy}</span>
                            <span className="text-xs text-gray-300">•</span>
                            <span className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* My Profile */}
          {page === 'profile' && (
            <div className="space-y-5">
              {/* Profile Card */}
              <div className="bg-white rounded-xl shadow p-5 flex flex-col sm:flex-row items-center sm:items-start gap-4">
                {profile.photo
                  ? <img src={profile.photo} alt="" className="w-20 h-20 rounded-full object-cover border-4 border-blue-500 flex-shrink-0" />
                  : <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">{initials}</div>
                }
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="text-xl font-bold text-gray-800">{profile.firstName} {profile.middleName} {profile.lastName}</h2>
                  {profile.firstNameAmharic && <p className="text-gray-500 text-sm">{profile.firstNameAmharic} {profile.middleNameAmharic} {profile.lastNameAmharic}</p>}
                  <p className="text-blue-600 font-medium text-sm mt-0.5">{profile.studentId}</p>
                  <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">Active</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">{profile.class}{profile.section ? ` - ${profile.section}` : ''}</span>
                  </div>
                </div>
              </div>

              <Section title="Basic Information">
                <Grid>
                  <Info label="Student ID" value={profile.studentId} />
                  <Info label="Payment Code" value={profile.paymentCode || '-'} />
                  <Info label="Full Name" value={`${profile.firstName} ${profile.middleName} ${profile.lastName}`} />
                  <Info label="Gender" value={profile.gender} />
                  <Info label="Email" value={profile.email || '-'} />
                  <Info label="Date of Birth" value={formatDOB(profile.dateOfBirth)} />
                </Grid>
              </Section>

              {(profile.firstNameAmharic || profile.middleNameAmharic || profile.lastNameAmharic) && (
                <Section title="Names in Amharic">
                  <Grid cols={3}>
                    <Info label="የመጀመሪያ ስም" value={profile.firstNameAmharic || '-'} />
                    <Info label="የአባት ስም" value={profile.middleNameAmharic || '-'} />
                    <Info label="የአያት ስም" value={profile.lastNameAmharic || '-'} />
                  </Grid>
                </Section>
              )}

              <Section title="Academic Information">
                <Grid cols={3}>
                  <Info label="Class" value={profile.class} />
                  <Info label="Section" value={profile.section || '-'} />
                  <Info label="Joined Year" value={profile.joinedYear} />
                </Grid>
              </Section>

              <Section title="Parent Information">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[{ label: 'Father', name: profile.fatherName, phone: profile.fatherPhone, photo: profile.fatherPhoto },
                    { label: 'Mother', name: profile.motherName, phone: profile.motherPhone, photo: profile.motherPhoto }
                  ].map(p => (
                    <div key={p.label} className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase">{p.label}</p>
                      <div className="flex items-center gap-3">
                        {p.photo
                          ? <img src={p.photo} alt={p.label} className="w-14 h-14 rounded-full object-cover border-2 border-gray-300 flex-shrink-0" />
                          : <div className="w-14 h-14 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                              <svg className="w-7 h-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            </div>
                        }
                        <div className="space-y-1">
                          <Info label="Name" value={p.name || '-'} />
                          <Info label="Phone" value={p.phone || '-'} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              {profile.address && (
                <Section title="Address">
                  <p className="text-gray-800 text-sm bg-gray-50 rounded-lg p-3">{profile.address}</p>
                </Section>
              )}

              <Section title="Payment Status">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-500">Academic Year</p>
                  <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {[2018,2019,2020,2021,2022,2023,2024,2025,2026].map(y => (
                      <option key={y} value={y}>{y} E.C</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {MONTHS.map(month => {
                    const paid = isPaid(month)
                    return (
                      <div key={month} className={`p-3 rounded-lg border-2 ${paid ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${paid ? 'text-green-700' : 'text-gray-600'}`}>{month.slice(0,3)}</span>
                          {paid
                            ? <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                            : <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
                          }
                        </div>
                        <p className={`text-xs mt-1 ${paid ? 'text-green-600' : 'text-red-500'}`}>{paid ? 'Paid' : 'Unpaid'}</p>
                      </div>
                    )
                  })}
                </div>
              </Section>
            </div>
          )}

          {/* Change Password */}
          {page === 'password' && (
            <div className="space-y-5">
              <Section title="Change Password">
                <div className="mb-6 p-4 rounded-xl border-2 border-blue-100 bg-blue-50 space-y-3">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Your Current Login Credentials</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-white rounded-lg px-4 py-3 border border-blue-200">
                      <p className="text-xs text-gray-400 font-medium mb-1">Username</p>
                      <p className="font-mono font-semibold text-blue-700 text-sm">{profile.portalUsername}</p>
                    </div>
                    <div className="bg-white rounded-lg px-4 py-3 border border-blue-200">
                      <p className="text-xs text-gray-400 font-medium mb-1">Password</p>
                      <p className="font-mono font-semibold text-green-700 text-sm">{'•'.repeat(8)} <span className="text-xs text-gray-400">(change below)</span></p>
                    </div>
                  </div>
                  <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                    Keep your credentials secure. Do not share with anyone.
                  </p>
                </div>
                <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
                  {[
                    { label: 'Current Password', val: currentPw, set: setCurrentPw },
                    { label: 'New Password', val: newPw, set: setNewPw },
                    { label: 'Confirm New Password', val: confirmPw, set: setConfirmPw },
                  ].map(f => (
                    <div key={f.label}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                      <input type="password" required value={f.val} onChange={e => f.set(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  ))}
                  <button type="submit" disabled={changingPw}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition">
                    {changingPw ? 'Changing...' : 'Change Password'}
                  </button>
                </form>
              </Section>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow p-5">
      <h3 className="font-semibold text-gray-700 mb-4 text-sm uppercase tracking-wide border-b pb-2">{title}</h3>
      {children}
    </div>
  )
}

function Grid({ children, cols = 2 }: { children: React.ReactNode; cols?: number }) {
  return <div className={`grid grid-cols-1 sm:grid-cols-${cols} gap-4`}>{children}</div>
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-gray-400 text-xs font-medium">{label}</p>
      <p className="text-gray-800 font-medium text-sm mt-0.5">{value}</p>
    </div>
  )
}
