'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import toast, { Toaster } from 'react-hot-toast'
import EthiopianDatePicker from '../components/EthiopianDatePicker'

interface TeacherProfile {
  _id: string; teacherId: string; fullName: string; email?: string; phone: string
  role: string; qualification?: string; qualificationLevel?: string; experienceYears?: string
  address?: string; sex: string; employmentDate: string; employmentType: string
  teachingClass?: string; teachingSection?: string; teachingSubject?: string
  photo?: string; portalUsername: string
}

interface Student { _id: string; studentId: string; firstName: string; middleName: string; lastName: string }
interface AttRecord { studentId: string; studentName: string; status: 'P' | 'A' | 'PE' | '' }

export default function TeacherDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<TeacherProfile | null>(null)
  const [page, setPage] = useState<'profile' | 'attendance' | 'password'>('profile')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [changingPw, setChangingPw] = useState(false)

  // Attendance state
  const [students, setStudents] = useState<Student[]>([])
  const [attDate, setAttDate] = useState(() => new Date().toISOString().split('T')[0])
  const [records, setRecords] = useState<AttRecord[]>([])
  const [savingId, setSavingId] = useState<string | null>(null)
  const [loadingStudents, setLoadingStudents] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem('portal_user')
    if (!raw) { router.push('/login'); return }
    const data = JSON.parse(raw)
    if (data.role !== 'teacher') { router.push('/login'); return }
    const username = data.profile?.portalUsername
    if (!username) { router.push('/login'); return }
    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/auth/portal-profile/${encodeURIComponent(username)}`)
      .then(res => {
        const fresh = { role: res.data.role, profile: res.data.profile }
        localStorage.setItem('portal_user', JSON.stringify(fresh))
        setProfile(res.data.profile)
      })
      .catch(() => setProfile(data.profile))
  }, [router])

  // Load students when attendance page opens
  useEffect(() => {
    if (page === 'attendance' && profile?.teachingClass) {
      loadStudents()
    }
  }, [page, profile])

  // Load existing attendance when date changes
  useEffect(() => {
    if (page === 'attendance' && profile && students.length > 0) {
      loadAttendance()
    }
  }, [attDate, students])

  const loadStudents = async () => {
    if (!profile?.teachingClass) return
    setLoadingStudents(true)
    try {
      const section = profile.teachingSection || 'none'
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/auth/portal-students/${profile.teachingClass}/${section}`)
      setStudents(res.data)
      // init records
      setRecords(res.data.map((s: Student) => ({
        studentId: s.studentId,
        studentName: `${s.firstName} ${s.middleName} ${s.lastName}`,
        status: '' as const
      })))
    } catch { toast.error('Failed to load students') }
    finally { setLoadingStudents(false) }
  }

  const loadAttendance = async () => {
    if (!profile) return
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/auth/portal-attendance/${profile.teacherId}/${attDate}`)
      if (res.data?.records?.length) {
        // merge saved records with current student list
        setRecords(students.map(s => {
          const saved = res.data.records.find((r: AttRecord) => r.studentId === s.studentId)
          return {
            studentId: s.studentId,
            studentName: `${s.firstName} ${s.middleName} ${s.lastName}`,
            status: saved ? saved.status : '' as const
          }
        }))
      } else {
        setRecords(students.map(s => ({
          studentId: s.studentId,
          studentName: `${s.firstName} ${s.middleName} ${s.lastName}`,
          status: '' as const
        })))
      }
    } catch {}
  }

  const markStatus = async (studentId: string, newStatus: 'P' | 'A' | 'PE' | '') => {
    const updated = records.map(r => r.studentId === studentId ? { ...r, status: newStatus } : r)
    setRecords(updated)
    if (!profile) return
    setSavingId(studentId)
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/portal-attendance`, {
        date: attDate, year: attDate.split('-')[0],
        teacherId: profile.teacherId,
        class: profile.teachingClass,
        section: profile.teachingSection,
        records: updated
      })
    } catch { toast.error('Failed to save') }
    finally { setSavingId(null) }
  }

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
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  )

  const initials = profile.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)

  const navItems = [
    { key: 'profile' as const, label: 'My Profile', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
    )},
    { key: 'attendance' as const, label: 'Attendance', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
    )},
    { key: 'password' as const, label: 'Change Password', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
    )},
  ]

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/lo.png" alt="Bluelight Academy" className="w-9 h-9 rounded-full object-contain flex-shrink-0" />
            <div>
              <p className="font-bold text-gray-800 text-sm leading-tight">Bluelight Academy</p>
              <p className="text-gray-400 text-xs">Staff Portal</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      <div className="px-5 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          {profile.photo
            ? <img src={profile.photo} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-blue-400 flex-shrink-0" />
            : <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{initials}</div>
          }
          <div className="min-w-0">
            <p className="text-gray-800 font-semibold text-sm truncate">{profile.fullName.split(' ').slice(0, 2).join(' ')}</p>
            <p className="text-gray-400 text-xs">{profile.role}</p>
          </div>
        </div>
      </div>

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

      <div className="px-3 py-4 border-t border-gray-200">
        <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Logout
        </button>
      </div>
    </div>
  )

  const presentCount = records.filter(r => r.status === 'P').length
  const absentCount = records.filter(r => r.status === 'A').length
  const permissionCount = records.filter(r => r.status === 'PE').length
  const unmarkedCount = records.filter(r => r.status === '').length

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Toaster />

      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 fixed inset-y-0 left-0 z-30">
        <Sidebar />
      </aside>

      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-64 bg-white border-r border-gray-200 h-full z-50"><Sidebar /></div>
        </div>
      )}

      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-700">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <span className="font-semibold text-sm text-gray-800">{navItems.find(n => n.key === page)?.label}</span>
          <div className="w-8" />
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-4xl w-full mx-auto">

          {/* My Profile */}
          {page === 'profile' && (
            <div className="space-y-5">
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
                    {profile.teachingClass && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">{profile.teachingClass}{profile.teachingSection ? ` - ${profile.teachingSection}` : ''}</span>}
                  </div>
                </div>
              </div>

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

              <Section title="Employment Information">
                <Grid>
                  <Info label="Role" value={profile.role} />
                  <Info label="Employment Type" value={profile.employmentType} />
                  <Info label="Employment Date" value={profile.employmentDate ? new Date(profile.employmentDate).toLocaleDateString() : '-'} />
                  <Info label="Qualification" value={profile.qualification || '-'} />
                  <Info label="Qualification Level" value={profile.qualificationLevel || '-'} />
                  <Info label="Experience" value={profile.experienceYears ? `${profile.experienceYears} years` : '-'} />
                </Grid>
              </Section>

              {(profile.teachingClass || profile.teachingSubject) && (
                <Section title="Teaching Information">
                  <Grid cols={2}>
                    <Info label="Teaching Class" value={profile.teachingClass || '-'} />
                    <Info label="Teaching Section" value={profile.teachingSection || '-'} />
                    <Info label="Teaching Subject" value={profile.teachingSubject || '-'} />
                  </Grid>
                </Section>
              )}
            </div>
          )}

          {/* Attendance */}
          {page === 'attendance' && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-gray-800">Attendance</h1>
                <p className="text-gray-500 text-sm mt-0.5">
                  {profile.teachingClass ? `Class ${profile.teachingClass}${profile.teachingSection ? ` - Section ${profile.teachingSection}` : ''}` : 'No class assigned'}
                </p>
              </div>

              {!profile.teachingClass ? (
                <div className="bg-white rounded-xl shadow p-10 text-center">
                  <p className="text-gray-400 text-sm">No class assigned to your profile.</p>
                </div>
              ) : (
                <>
                  {/* Date selector */}
                  <div className="bg-white rounded-xl shadow p-4">
                    <label className="block text-xs font-medium text-gray-500 mb-2">Date (Ethiopian Calendar)</label>
                    <EthiopianDatePicker value={attDate} onChange={setAttDate} />
                  </div>

                  {/* Summary */}
                  {records.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="bg-white rounded-xl shadow p-3 text-center">
                        <p className="text-xl font-bold text-gray-800">{records.length}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Total</p>
                      </div>
                      <div className="bg-white rounded-xl shadow p-3 text-center">
                        <p className="text-xl font-bold text-green-600">{presentCount}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Present</p>
                      </div>
                      <div className="bg-white rounded-xl shadow p-3 text-center">
                        <p className="text-xl font-bold text-red-500">{absentCount}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Absent</p>
                      </div>
                      <div className="bg-white rounded-xl shadow p-3 text-center">
                        <p className="text-xl font-bold text-blue-500">{permissionCount}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Permission</p>
                      </div>
                    </div>
                  )}

                  {/* Student list */}
                  {loadingStudents ? (
                    <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
                  ) : records.length === 0 ? (
                    <div className="bg-white rounded-xl shadow p-10 text-center">
                      <p className="text-gray-400 text-sm">No students found for this class.</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl shadow overflow-hidden">
                      <div className="px-3 py-3 border-b border-gray-100">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <p className="text-sm font-semibold text-gray-700">Students — {attDate}</p>
                          <div className="flex gap-2 text-xs text-gray-400">
                            <span className="flex items-center gap-1"><span className="w-5 h-5 rounded bg-green-500 flex items-center justify-center text-white font-bold text-xs">✓</span> Present</span>
                            <span className="flex items-center gap-1"><span className="w-5 h-5 rounded bg-red-500 flex items-center justify-center text-white font-bold text-xs">✗</span> Absent</span>
                            <span className="flex items-center gap-1"><span className="w-5 h-5 rounded bg-blue-500 flex items-center justify-center text-white font-bold text-xs">P</span> Perm</span>
                          </div>
                        </div>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {records.map((r, i) => (
                          <div key={r.studentId} className="flex items-center justify-between px-3 py-3 hover:bg-gray-50 transition gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="text-xs text-gray-400 w-5 flex-shrink-0">{i + 1}</span>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">{r.studentName}</p>
                                <p className="text-xs text-gray-400">{r.studentId}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {r.status === '' ? (
                                <>
                                  <button onClick={() => markStatus(r.studentId, 'P')} disabled={savingId === r.studentId}
                                    className="w-9 h-9 rounded-lg border-2 border-gray-200 bg-white text-gray-300 font-bold text-base hover:border-green-400 hover:text-green-500 transition-all">
                                    ✓
                                  </button>
                                  <button onClick={() => markStatus(r.studentId, 'A')} disabled={savingId === r.studentId}
                                    className="w-9 h-9 rounded-lg border-2 border-gray-200 bg-white text-gray-300 font-bold text-base hover:border-red-400 hover:text-red-500 transition-all">
                                    ✗
                                  </button>
                                  <button onClick={() => markStatus(r.studentId, 'PE')} disabled={savingId === r.studentId}
                                    className="w-9 h-9 rounded-lg border-2 border-gray-200 bg-white text-gray-300 font-bold text-sm hover:border-blue-400 hover:text-blue-500 transition-all">
                                    P
                                  </button>
                                </>
                              ) : (
                                <>
                                  <div className={`w-9 h-9 rounded-lg font-bold text-base flex items-center justify-center ${
                                    r.status === 'P' ? 'bg-green-500 text-white' :
                                    r.status === 'A' ? 'bg-red-500 text-white' :
                                    'bg-blue-500 text-white text-sm'
                                  }`}>
                                    {r.status === 'P' ? '✓' : r.status === 'A' ? '✗' : 'P'}
                                  </div>
                                  <button onClick={() => markStatus(r.studentId, '')} disabled={savingId === r.studentId}
                                    className="w-7 h-7 rounded-lg border border-gray-200 bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-400 hover:border-red-200 transition-all flex items-center justify-center"
                                    title="Reset">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                  </button>
                                </>
                              )}
                              {savingId === r.studentId && <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
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
