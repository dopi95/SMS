'use client'

import { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import axios from 'axios'
import toast from 'react-hot-toast'

interface PendingStudent {
  _id: string
  studentType: string
  firstName: string
  middleName: string
  lastName: string
  firstNameAmharic: string
  middleNameAmharic: string
  lastNameAmharic: string
  gender: string
  email: string
  dateOfBirth: string
  joinedYear: string
  class: string
  address: string
  photo: string
  fatherName: string
  fatherPhone: string
  motherName: string
  motherPhone: string
  status: string
  createdAt: string
}

export default function PendingStudentsPage() {
  const [students, setStudents] = useState<PendingStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [selected, setSelected] = useState<PendingStudent | null>(null)

  const fetchPending = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/pending-students`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setStudents(res.data)
    } catch {
      toast.error('Failed to load pending students')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPending() }, [fetchPending])

  async function approve(id: string) {
    setActionId(id)
    try {
      const token = localStorage.getItem('token')
      await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/pending-students/${id}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Student approved and added to active students!')
      setSelected(null)
      fetchPending()
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Approval failed')
    } finally {
      setActionId(null)
    }
  }

  async function reject(id: string) {
    if (!confirm('Are you sure you want to reject this application?')) return
    setActionId(id)
    try {
      const token = localStorage.getItem('token')
      await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/pending-students/${id}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Application rejected')
      setSelected(null)
      fetchPending()
    } catch {
      toast.error('Rejection failed')
    } finally {
      setActionId(null)
    }
  }

  return (
    <DashboardLayout pageTitle="Pending Students">
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="bg-white rounded-2xl shadow border border-gray-100 mb-6 px-6 py-5 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Pending Registrations</h1>
              <p className="text-sm text-gray-500 mt-0.5">Review and approve student registration requests</p>
            </div>
            <span className="bg-yellow-100 text-yellow-800 text-sm font-bold px-4 py-1.5 rounded-full">
              {students.length} Pending
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
          ) : students.length === 0 ? (
            <div className="bg-white rounded-2xl shadow border border-gray-100 p-16 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">No pending registrations</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {students.map(s => (
                <div key={s._id} className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                  {/* Card Header */}
                  <div className="bg-blue-700 px-4 py-3 flex items-center gap-3">
                    {s.photo ? (
                      <img src={s.photo} alt="photo" className="w-12 h-12 rounded-full object-cover border-2 border-white/40" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/40">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate">{s.firstName} {s.middleName} {s.lastName}</p>
                      <p className="text-blue-200 text-xs truncate">{s.firstNameAmharic} {s.middleNameAmharic} {s.lastNameAmharic}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.studentType === 'new' ? 'bg-green-400/20 text-green-100' : 'bg-yellow-400/20 text-yellow-100'}`}>
                      {s.studentType === 'new' ? 'New' : 'Existing'}
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="px-4 py-3 space-y-1.5 text-sm">
                    <Row label="Gender" value={s.gender} />
                    <Row label="Class" value={s.class} />
                    <Row label="Joined Year" value={`${s.joinedYear} E.C`} />
                    <Row label="Date of Birth" value={s.dateOfBirth} />
                    {s.email && <Row label="Email" value={s.email} />}
                    {s.address && <Row label="Address" value={s.address} />}
                    <div className="border-t border-gray-100 pt-1.5 mt-1.5">
                      <Row label="Father" value={`${s.fatherName} · ${s.fatherPhone}`} />
                      <Row label="Mother" value={`${s.motherName} · ${s.motherPhone}`} />
                    </div>
                    <p className="text-xs text-gray-400 pt-1">
                      Submitted: {new Date(s.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="px-4 pb-4 flex gap-2">
                    <button
                      onClick={() => approve(s._id)}
                      disabled={actionId === s._id}
                      className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                    >
                      {actionId === s._id ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => reject(s._id)}
                      disabled={actionId === s._id}
                      className="flex-1 py-2 bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 text-sm font-semibold rounded-xl border border-red-200 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-400 w-24 flex-shrink-0">{label}:</span>
      <span className="text-gray-700 font-medium truncate">{value || '—'}</span>
    </div>
  )
}
