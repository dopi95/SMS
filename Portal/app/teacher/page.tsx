'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import toast, { Toaster } from 'react-hot-toast'

interface TeacherProfile {
  _id: string; teacherId: string; fullName: string; email?: string; phone: string
  role: string; qualification?: string; qualificationLevel?: string; experienceYears?: string
  address?: string; sex: string; employmentDate: string; employmentType: string
  teachingClass?: string; teachingSubject?: string; photo?: string; portalUsername: string
}

export default function TeacherDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<TeacherProfile | null>(null)
  const [tab, setTab] = useState<'profile'|'password'>('profile')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [changingPw, setChangingPw] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem('portal_user')
    if (!raw) { router.push('/login'); return }
    const data = JSON.parse(raw)
    if (data.role !== 'teacher') { router.push('/login'); return }
    setProfile(data.profile)
  }, [router])

  const logout = () => { localStorage.removeItem('portal_user'); router.push('/login') }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPw !== confirmPw) { toast.error('Passwords do not match'); return }
    if (newPw.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setChangingPw(true)
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/portal-change-password`, {
        username: profile?.portalUsername, currentPassword: currentPw, newPassword: newPw, role: 'teacher'
      })
      toast.success('Password changed successfully!')
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password')
    } finally { setChangingPw(false) }
  }

  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
    </div>
  )

  const initials = profile.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)

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
            <span className="font-semibold text-base">Staff Portal</span>
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
            <h2 className="text-xl font-bold text-gray-800">{profile.fullName}</h2>
            <p className="text-blue-600 font-medium text-sm mt-0.5">{profile.teacherId}</p>
            <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">Active</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">{profile.role}</span>
              {profile.teachingClass && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">Class {profile.teachingClass}</span>}
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
          {/* Personal Info */}
          <Section title="Personal Information">
            <Grid>
              <Info label="Full Name" value={profile.fullName} />
              <Info label="Staff ID" value={profile.teacherId} />
              <Info label="Gender" value={profile.sex} />
              <Info label="Phone" value={profile.phone} />
              <Info label="Email" value={profile.email || '-'} />
              <Info label="Address" value={profile.address || '-'} />
            </Grid>
          </Section>

          {/* Employment Info */}
          <Section title="Employment Information">
            <Grid>
              <Info label="Role" value={profile.role} />
              <Info label="Employment Type" value={profile.employmentType} />
              <Info label="Employment Date" value={new Date(profile.employmentDate).toLocaleDateString()} />
              <Info label="Qualification" value={profile.qualification || '-'} />
              <Info label="Qualification Level" value={profile.qualificationLevel || '-'} />
              <Info label="Experience" value={profile.experienceYears ? `${profile.experienceYears} years` : '-'} />
            </Grid>
          </Section>

          {/* Teaching Info */}
          {(profile.teachingClass || profile.teachingSubject) && (
            <Section title="Teaching Information">
              <Grid>
                <Info label="Teaching Class" value={profile.teachingClass || '-'} />
                <Info label="Teaching Subject" value={profile.teachingSubject || '-'} />
              </Grid>
            </Section>
          )}
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
