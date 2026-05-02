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

const MONTHS = ['September','October','November','December','January','February','March','April','May','June']

export default function StudentDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [selectedYear, setSelectedYear] = useState(2019)
  const [tab, setTab] = useState<'profile'|'password'>('profile')
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
    // Always fetch fresh profile so photos are up to date
    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/auth/portal-profile/${encodeURIComponent(username)}`)
      .then(res => {
        const fresh = { role: res.data.role, profile: res.data.profile }
        localStorage.setItem('portal_user', JSON.stringify(fresh))
        setProfile(res.data.profile)
        fetchPayments(res.data.profile._id)
      })
      .catch(() => {
        setProfile(data.profile)
        fetchPayments(data.profile._id)
      })
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

  const formatDOB = (dob?: string) => {
    if (!dob) return '-'
    const d = new Date(dob)
    if (isNaN(d.getTime())) return dob
    return d.toLocaleDateString()
  }

  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
    </div>
  )

  const initials = `${profile.firstName[0]}${profile.lastName[0]}`

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster />
      {/* Header */}
      <header className="bg-blue-700 text-white px-4 sm:px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow">
            <span className="text-blue-700 font-bold text-sm">B</span>
          </div>
          <div>
            <span className="font-semibold text-base">Student Portal</span>
            <p className="text-blue-200 text-xs">Bluelight Academy</p>
          </div>
        </div>
        <button onClick={logout} className="text-sm bg-white/20 hover:bg-white/30 px-4 py-1.5 rounded-lg transition">
          Logout
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
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

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {(['profile','password'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>
              {t === 'profile' ? 'My Profile' : 'Change Password'}
            </button>
          ))}
        </div>

        {tab === 'profile' && <>
          {/* Basic Info */}
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

          {/* Amharic Names */}
          {(profile.firstNameAmharic || profile.middleNameAmharic || profile.lastNameAmharic) && (
            <Section title="Names in Amharic">
              <Grid cols={3}>
                <Info label="የመጀመሪያ ስም" value={profile.firstNameAmharic || '-'} />
                <Info label="የአባት ስም" value={profile.middleNameAmharic || '-'} />
                <Info label="የአያት ስም" value={profile.lastNameAmharic || '-'} />
              </Grid>
            </Section>
          )}

          {/* Academic Info */}
          <Section title="Academic Information">
            <Grid cols={3}>
              <Info label="Class" value={profile.class} />
              <Info label="Section" value={profile.section || '-'} />
              <Info label="Joined Year" value={profile.joinedYear} />
            </Grid>
          </Section>

          {/* Parent Info */}
          <Section title="Parent Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase">Father</p>
                <div className="flex items-center gap-3">
                  {profile.fatherPhoto
                    ? <img src={profile.fatherPhoto} alt="Father" className="w-14 h-14 rounded-full object-cover border-2 border-gray-300 flex-shrink-0" />
                    : <div className="w-14 h-14 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                        <svg className="w-7 h-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      </div>
                  }
                  <div className="space-y-1">
                    <Info label="Name" value={profile.fatherName || '-'} />
                    <Info label="Phone" value={profile.fatherPhone || '-'} />
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase">Mother</p>
                <div className="flex items-center gap-3">
                  {profile.motherPhoto
                    ? <img src={profile.motherPhoto} alt="Mother" className="w-14 h-14 rounded-full object-cover border-2 border-gray-300 flex-shrink-0" />
                    : <div className="w-14 h-14 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                        <svg className="w-7 h-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      </div>
                  }
                  <div className="space-y-1">
                    <Info label="Name" value={profile.motherName || '-'} />
                    <Info label="Phone" value={profile.motherPhone || '-'} />
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* Address */}
          {profile.address && (
            <Section title="Address">
              <p className="text-gray-800 text-sm bg-gray-50 rounded-lg p-3">{profile.address}</p>
            </Section>
          )}

          {/* Payment Status */}
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
        </>}

        {tab === 'password' && (
          <Section title="Change Password">
            {/* Show current credentials */}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <input type="password" required value={currentPw} onChange={e => setCurrentPw(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input type="password" required value={newPw} onChange={e => setNewPw(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input type="password" required value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button type="submit" disabled={changingPw}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition">
                {changingPw ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </Section>
        )}
      </main>
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
