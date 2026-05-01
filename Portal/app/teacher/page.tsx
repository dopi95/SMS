'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const teacher = {
  name: 'Meron Haile Gebre',
  teacherId: 'TCH-001',
  role: 'Class Teacher',
  email: 'teacher@bluelight.com',
  phone: '+251922000001',
  sex: 'Female',
  employmentType: 'Full-Time',
  employmentDate: '2022-09-01',
  teachingClass: 'UKG',
  teachingSubject: 'English',
  qualification: 'B.Ed. in Early Childhood Education',
  experienceYears: '5',
  address: 'Addis Ababa, Ethiopia',
  isActive: true,
}

export default function TeacherDashboard() {
  const router = useRouter()

  useEffect(() => {
    const user = localStorage.getItem('portal_user')
    if (!user || JSON.parse(user).role !== 'teacher') router.push('/login')
  }, [router])

  function logout() {
    localStorage.removeItem('portal_user')
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-700 text-white px-6 py-4 flex items-center justify-between shadow">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center">
            <span className="text-blue-700 font-bold text-sm">B</span>
          </div>
          <span className="font-semibold text-lg">Teacher Portal</span>
        </div>
        <button onClick={logout} className="text-sm bg-white/20 hover:bg-white/30 px-4 py-1.5 rounded-lg transition">
          Logout
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-xl shadow p-6 flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-3xl font-bold">
            {teacher.name[0]}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">{teacher.name}</h2>
            <p className="text-gray-500 text-sm">{teacher.role} · {teacher.teacherId}</p>
            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
              Active
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-semibold text-gray-700 mb-4 text-sm uppercase tracking-wide">Employment Info</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Info label="Employment Type" value={teacher.employmentType} />
            <Info label="Employment Date" value={teacher.employmentDate} />
            <Info label="Teaching Class" value={teacher.teachingClass} />
            <Info label="Teaching Subject" value={teacher.teachingSubject} />
            <Info label="Experience" value={`${teacher.experienceYears} years`} />
            <Info label="Qualification" value={teacher.qualification} />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-semibold text-gray-700 mb-4 text-sm uppercase tracking-wide">Contact Info</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Info label="Email" value={teacher.email} />
            <Info label="Phone" value={teacher.phone} />
            <Info label="Gender" value={teacher.sex} />
            <Info label="Address" value={teacher.address} />
          </div>
        </div>
      </main>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-gray-400 text-xs">{label}</p>
      <p className="text-gray-800 font-medium">{value}</p>
    </div>
  )
}
