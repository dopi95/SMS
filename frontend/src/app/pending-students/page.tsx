'use client'

import { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import axios from 'axios'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { usePermissions } from '@/contexts/PermissionsContext'

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
  fatherPhoto: string
  motherName: string
  motherPhone: string
  motherPhoto: string
  status: string
  createdAt: string
}

type AlertType = 'success-approve' | 'success-reject' | 'success-delete' | 'confirm-reject' | 'confirm-delete'

interface AlertState {
  type: AlertType
  studentName: string
  studentId?: string
  pendingId: string
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
}

export default function PendingStudentsPage() {
  const [students, setStudents] = useState<PendingStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [detail, setDetail] = useState<PendingStudent | null>(null)
  const [alert, setAlert] = useState<AlertState | null>(null)
  const { canDo, role } = usePermissions()
  const isExecutive = role === 'executive'

  // filters
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterClass, setFilterClass] = useState('all')
  const [filterStatus, setFilterStatus] = useState('pending')
  const [filterToday, setFilterToday] = useState(false)

  const fetchPending = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/pending-students`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setStudents(res.data)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPending() }, [fetchPending])

  const todayStr = new Date().toDateString()

  const filtered = students.filter(s => {
    const q = search.toLowerCase()
    const name = `${s.firstName} ${s.middleName} ${s.lastName}`.toLowerCase()
    const amName = `${s.firstNameAmharic} ${s.middleNameAmharic} ${s.lastNameAmharic}`.toLowerCase()
    const matchSearch = !q ||
      name.includes(q) || amName.includes(q) ||
      s.fatherName?.toLowerCase().includes(q) ||
      s.motherName?.toLowerCase().includes(q) ||
      s.fatherPhone?.includes(q) ||
      s.motherPhone?.includes(q)
    const matchType = filterType === 'all' || s.studentType === filterType
    const matchClass = filterClass === 'all' || s.class.includes(filterClass)
    const matchStatus = filterStatus === 'all' || s.status === filterStatus
    const matchToday = !filterToday || new Date(s.createdAt).toDateString() === todayStr
    return matchSearch && matchType && matchClass && matchStatus && matchToday
  })

  const pendingCount = students.filter(s => s.status === 'pending').length

  async function approve(id: string) {
    setActionId(id)
    const s = students.find(x => x._id === id)!
    try {
      const token = localStorage.getItem('token')
      const res = await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/pending-students/${id}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setStudents(prev => prev.map(x => x._id === id ? { ...x, status: 'approved' } : x))
      setDetail(prev => prev?._id === id ? { ...prev, status: 'approved' } : prev)
      setAlert({ type: 'success-approve', studentName: `${s.firstName} ${s.middleName} ${s.lastName}`, studentId: res.data.studentId, pendingId: id })
    } catch (e: any) {
      setAlert({ type: 'success-approve', studentName: e.response?.data?.message || 'Approval failed', pendingId: id })
    } finally {
      setActionId(null)
    }
  }

  function confirmReject(id: string) {
    const s = students.find(x => x._id === id)!
    setAlert({ type: 'confirm-reject', studentName: `${s.firstName} ${s.middleName} ${s.lastName}`, pendingId: id })
  }

  async function executeReject(id: string) {
    setActionId(id)
    try {
      const token = localStorage.getItem('token')
      await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/pending-students/${id}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const s = students.find(x => x._id === id)!
      setStudents(prev => prev.map(x => x._id === id ? { ...x, status: 'rejected' } : x))
      setDetail(prev => prev?._id === id ? { ...prev, status: 'rejected' } : prev)
      setAlert({ type: 'success-reject', studentName: `${s.firstName} ${s.middleName} ${s.lastName}`, pendingId: id })
    } catch {
      setAlert(null)
    } finally {
      setActionId(null)
    }
  }

  function confirmDelete(id: string) {
    const s = students.find(x => x._id === id)!
    setAlert({ type: 'confirm-delete', studentName: `${s.firstName} ${s.middleName} ${s.lastName}`, pendingId: id })
  }

  async function executeDelete(id: string) {
    setActionId(id)
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/pending-students/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setStudents(prev => prev.filter(x => x._id !== id))
      setDetail(null)
      setAlert({ type: 'success-delete', studentName: students.find(x => x._id === id)?.firstName || '', pendingId: id })
    } catch {
      setAlert(null)
    } finally {
      setActionId(null)
    }
  }

  function exportPDF() {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

    // Header bar
    doc.setFillColor(29, 78, 216)
    doc.rect(0, 0, 297, 18, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Bluelight Academy — Student Registrations', 14, 12)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(`Exported: ${new Date().toLocaleString()}   |   Total: ${filtered.length} record${filtered.length !== 1 ? 's' : ''}`, 297 - 14, 12, { align: 'right' })

    autoTable(doc, {
      startY: 22,
      head: [['#', 'Student Name', 'Gender', 'Class', 'Type', 'Status', 'Father Name', 'Father Phone', 'Mother Name', 'Mother Phone', 'Registered Date']],
      body: filtered.map((s, i) => [
        i + 1,
        `${s.firstName} ${s.middleName} ${s.lastName}`,
        s.gender ? s.gender.charAt(0).toUpperCase() + s.gender.slice(1) : '—',
        s.class.replace(/\s*\(.*?\)/, '').trim(),
        s.studentType === 'new' ? 'New' : 'Existing',
        s.status.charAt(0).toUpperCase() + s.status.slice(1),
        s.fatherName || '—',
        s.fatherPhone || '—',
        s.motherName || '—',
        s.motherPhone || '—',
        new Date(s.createdAt).toLocaleDateString(),
      ]),
      styles: { fontSize: 8, cellPadding: 3, textColor: [30, 30, 30] },
      headStyles: { fillColor: [29, 78, 216], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 247, 255] },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 38 },
        2: { cellWidth: 16 },
        3: { cellWidth: 22 },
        4: { cellWidth: 18 },
        5: { cellWidth: 18 },
        6: { cellWidth: 32 },
        7: { cellWidth: 24 },
        8: { cellWidth: 32 },
        9: { cellWidth: 24 },
        10: { cellWidth: 24 },
      },
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        const pageCount = (doc as any).internal.getNumberOfPages()
        doc.setFontSize(7)
        doc.setTextColor(150)
        doc.text(`Page ${data.pageNumber} of ${pageCount}`, 297 / 2, 205, { align: 'center' })
      },
    })

    doc.save(`student-registrations-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  const selCls = 'px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer'

  return (
    <DashboardLayout pageTitle="Pending Students" hideBell>
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-4">

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl shadow border border-gray-100 px-6 py-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Registered</p>
                <p className="text-3xl font-extrabold text-gray-900">{students.length}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow border border-gray-100 px-6 py-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Pending</p>
                <p className="text-3xl font-extrabold text-yellow-600">{pendingCount}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow border border-gray-100 px-6 py-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Registered Today</p>
                <p className="text-3xl font-extrabold text-green-600">{students.filter(s => new Date(s.createdAt).toDateString() === todayStr).length}</p>
              </div>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="bg-white rounded-2xl shadow border border-gray-100 px-4 py-4 space-y-3">
            {/* Search */}
            <div className="relative">
              <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by student name, father/mother name or phone..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>

            {/* Filter Row */}
            <div className="flex flex-wrap gap-2 items-center">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={selCls}>
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>

              <select value={filterType} onChange={e => setFilterType(e.target.value)} className={selCls}>
                <option value="all">All Types</option>
                <option value="new">New</option>
                <option value="existing">Existing</option>
              </select>

              <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className={selCls}>
                <option value="all">All Classes</option>
                <option value="Nursery">Nursery</option>
                <option value="LKG">LKG</option>
                <option value="UKG">UKG</option>
              </select>

              <button
                onClick={() => setFilterToday(p => !p)}
                className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${filterToday ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}
              >
                Today Only
              </button>

              {(search || filterType !== 'all' || filterClass !== 'all' || filterStatus !== 'pending' || filterToday) && (
                <button
                  onClick={() => { setSearch(''); setFilterType('all'); setFilterClass('all'); setFilterStatus('pending'); setFilterToday(false) }}
                  className="px-3 py-2 rounded-xl text-sm font-medium text-red-500 border border-red-200 hover:bg-red-50 transition-colors"
                >
                  Clear Filters
                </button>
              )}

              <span className="ml-auto text-sm text-gray-400">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>

              <button
                onClick={exportPDF}
                disabled={filtered.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                Export PDF
              </button>
            </div>
          </div>

          {/* Table / Cards */}
          <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-16 text-center">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-400 font-medium">No results found</p>
              </div>
            ) : (
              <>
                {/* ── DESKTOP TABLE ── */}
                <div className="hidden md:block">
                  <table className="w-full table-fixed">
                    <colgroup>
                      <col className="w-8" />
                      <col className="w-[22%]" />
                      <col className="w-[12%]" />
                      <col className="w-[9%]" />
                      <col className="w-[9%]" />
                      <col className="w-[13%]" />
                      <col className="w-[11%]" />
                      <col className="w-[16%]" />
                    </colgroup>
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {['#', 'Student Name', 'Class', 'Type', 'Status', 'Father Phone', 'Date', 'Actions'].map(h => (
                          <th key={h} className="px-2 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filtered.map((s, i) => (
                        <tr key={s._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-2 py-3 text-xs text-gray-400">{i + 1}</td>
                          <td className="px-2 py-3">
                            <div className="flex items-center gap-2 min-w-0">
                              {s.photo ? (
                                <img src={s.photo} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                  <span className="text-blue-700 font-bold text-xs">{s.firstName?.[0]}</span>
                                </div>
                              )}
                              <p className="text-xs font-semibold text-gray-900 truncate">{s.firstName} {s.middleName} {s.lastName}</p>
                            </div>
                          </td>
                          <td className="px-2 py-3 text-xs text-gray-700 truncate">{s.class.replace(/\s*\(.*?\)/, '').trim()}</td>
                          <td className="px-2 py-3">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.studentType === 'new' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                              {s.studentType === 'new' ? 'New' : 'Exist'}
                            </span>
                          </td>
                          <td className="px-2 py-3">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[s.status] || 'bg-gray-100 text-gray-600'}`}>
                              {s.status}
                            </span>
                          </td>
                          <td className="px-2 py-3 text-xs text-gray-700 truncate">{s.fatherPhone || '—'}</td>
                          <td className="px-2 py-3 text-xs text-gray-500">{new Date(s.createdAt).toLocaleDateString()}</td>
                          <td className="px-2 py-3">
                            <div className="flex items-center gap-1">
                              {/* Detail */}
                              <button onClick={() => setDetail(s)} title="Detail"
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors flex-shrink-0">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              </button>
                              {/* Approve */}
                              {s.status !== 'approved' && canDo('pending-students','approve') && (
                                <button onClick={() => approve(s._id)} disabled={actionId === s._id} title="Approve"
                                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white transition-colors flex-shrink-0">
                                  {actionId === s._id
                                    ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                                    : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                                </button>
                              )}
                              {/* Reject */}
                              {s.status !== 'rejected' && canDo('pending-students','reject') && (
                                <button onClick={() => confirmReject(s._id)} disabled={actionId === s._id} title="Reject"
                                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-orange-50 hover:bg-orange-100 disabled:opacity-50 text-orange-600 border border-orange-200 transition-colors flex-shrink-0">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                              )}
                              {/* Delete */}
                              {canDo('pending-students','delete') && (
                              <button onClick={() => confirmDelete(s._id)} disabled={actionId === s._id} title="Delete"
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white transition-colors flex-shrink-0">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ── MOBILE CARDS ── */}
                <div className="md:hidden divide-y divide-gray-100">
                  {filtered.map((s, i) => (
                    <div key={s._id} className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xs text-gray-400 font-medium w-5 flex-shrink-0">{i + 1}</span>
                        {s.photo ? (
                          <img src={s.photo} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 border-blue-100" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 border-2 border-blue-200">
                            <span className="text-blue-700 font-bold text-lg">{s.firstName?.[0]}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{s.firstName} {s.middleName} {s.lastName}</p>
                          <p className="text-xs text-gray-400 truncate">{s.firstNameAmharic} {s.middleNameAmharic} {s.lastNameAmharic}</p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${s.studentType === 'new' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                          {s.studentType === 'new' ? 'New' : 'Existing'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3 bg-gray-50 rounded-xl px-3 py-2.5">
                        <MobileRow label="Class" value={s.class} />
                        <MobileRow label="Status" value={s.status} statusColor={STATUS_BADGE[s.status]} />
                        <MobileRow label="Father Phone" value={s.fatherPhone || '—'} />
                        <MobileRow label="Registered" value={new Date(s.createdAt).toLocaleDateString()} />
                      </div>

                      <div className="flex gap-2">
                        <button onClick={() => setDetail(s)} className="flex-1 py-2 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl border border-blue-200 transition-colors">Detail</button>
                        {!isExecutive && s.status !== 'approved' && canDo('pending-students','approve') && <button onClick={() => approve(s._id)} disabled={actionId === s._id} className="flex-1 py-2 text-xs font-semibold bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl transition-colors">{actionId === s._id ? '...' : 'Approve'}</button>}
                        {!isExecutive && s.status !== 'rejected' && canDo('pending-students','reject') && <button onClick={() => confirmReject(s._id)} disabled={actionId === s._id} className="flex-1 py-2 text-xs font-semibold bg-orange-50 hover:bg-orange-100 disabled:opacity-50 text-orange-600 rounded-xl border border-orange-200 transition-colors">Reject</button>}
                        {!isExecutive && canDo('pending-students','delete') && <button onClick={() => confirmDelete(s._id)} disabled={actionId === s._id} className="flex-1 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl transition-colors">Delete</button>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="bg-blue-700 px-6 py-5 flex items-center gap-4 rounded-t-2xl">
              {detail.photo ? (
                <img src={detail.photo} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-white/40" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center">
                  <span className="text-white font-bold text-2xl">{detail.firstName?.[0]}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-lg">{detail.firstName} {detail.middleName} {detail.lastName}</p>
                <p className="text-blue-200 text-sm">{detail.firstNameAmharic} {detail.middleNameAmharic} {detail.lastNameAmharic}</p>
              </div>
              <button onClick={() => setDetail(null)} className="text-white/70 hover:text-white">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <Section title="Student Information">
                <DetailRow label="Gender" value={detail.gender} />
                <DetailRow label="Date of Birth" value={detail.dateOfBirth} />
                <DetailRow label="Class" value={detail.class} />
                <DetailRow label="Joined Year" value={`${detail.joinedYear} E.C`} />
                <DetailRow label="Student Type" value={detail.studentType === 'new' ? 'New · አዲስ' : 'Existing · ነባር'} />
                {detail.email && <DetailRow label="Email" value={detail.email} />}
                {detail.address && <DetailRow label="Address" value={detail.address} />}
              </Section>
              <Section title="Parent Information">
                <DetailRow label="Father Name" value={detail.fatherName} />
                <DetailRow label="Father Phone" value={detail.fatherPhone} />
                {detail.fatherPhoto && (
                  <div className="flex gap-3 text-sm">
                    <span className="text-gray-400 w-28 flex-shrink-0">Father Photo</span>
                    <img src={detail.fatherPhoto} alt="Father" className="w-16 h-16 rounded-xl object-cover border border-gray-200" />
                  </div>
                )}
                <DetailRow label="Mother Name" value={detail.motherName} />
                <DetailRow label="Mother Phone" value={detail.motherPhone} />
                {detail.motherPhoto && (
                  <div className="flex gap-3 text-sm">
                    <span className="text-gray-400 w-28 flex-shrink-0">Mother Photo</span>
                    <img src={detail.motherPhoto} alt="Mother" className="w-16 h-16 rounded-xl object-cover border border-gray-200" />
                  </div>
                )}
              </Section>
              <Section title="Submission">
                <DetailRow label="Status" value={detail.status} />
                <DetailRow label="Submitted" value={new Date(detail.createdAt).toLocaleString()} />
              </Section>
            </div>

            <div className="px-6 pb-3 flex gap-3">
              {!isExecutive && detail.status !== 'approved' && (
                <button onClick={() => approve(detail._id)} disabled={actionId === detail._id}
                  className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                  {actionId === detail._id ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                  Approve
                </button>
              )}
              {!isExecutive && detail.status !== 'rejected' && (
                <button onClick={() => confirmReject(detail._id)} disabled={actionId === detail._id}
                  className="flex-1 py-2.5 bg-orange-50 hover:bg-orange-100 disabled:opacity-50 text-orange-600 font-semibold rounded-xl border border-orange-200 transition-colors flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                  Reject
                </button>
              )}
            </div>
            <div className="px-6 pb-6">
              {!isExecutive && (
              <button onClick={() => confirmDelete(detail._id)} disabled={actionId === detail._id}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Delete Record
              </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* ── ALERT / CONFIRM MODAL ── */}
      {alert && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

            {/* Success — Approve */}
            {alert.type === 'success-approve' && (
              <>
                <div className="bg-green-600 px-6 pt-8 pb-6 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-3">
                    <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h2 className="text-xl font-bold text-white">Student Approved!</h2>
                  <p className="text-green-100 text-sm mt-1">{alert.studentName} has been added to active students.</p>
                </div>
                <div className="px-6 py-5 space-y-2">
                  {alert.studentId && (
                    <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between">
                      <span className="text-sm text-gray-500">Student ID</span>
                      <span className="text-base font-bold text-green-700 tracking-wide">{alert.studentId}</span>
                    </div>
                  )}
                  <button onClick={() => setAlert(null)}
                    className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors">
                    Done
                  </button>
                </div>
              </>
            )}

            {/* Success — Reject */}
            {alert.type === 'success-reject' && (
              <>
                <div className="bg-orange-500 px-6 pt-8 pb-6 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-3">
                    <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                  </div>
                  <h2 className="text-xl font-bold text-white">Application Rejected</h2>
                  <p className="text-orange-100 text-sm mt-1">{alert.studentName}'s application has been rejected and removed from active students.</p>
                </div>
                <div className="px-6 py-5">
                  <button onClick={() => setAlert(null)}
                    className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors">
                    Done
                  </button>
                </div>
              </>
            )}

            {/* Success — Delete */}
            {alert.type === 'success-delete' && (
              <>
                <div className="bg-red-600 px-6 pt-8 pb-6 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-3">
                    <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </div>
                  <h2 className="text-xl font-bold text-white">Record Deleted</h2>
                  <p className="text-red-100 text-sm mt-1">The registration record has been permanently removed.</p>
                </div>
                <div className="px-6 py-5">
                  <button onClick={() => setAlert(null)}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors">
                    Done
                  </button>
                </div>
              </>
            )}

            {/* Confirm — Reject */}
            {alert.type === 'confirm-reject' && (
              <>
                <div className="px-6 pt-8 pb-4 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-3">
                    <svg className="w-8 h-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">Reject Application?</h2>
                  <p className="text-gray-500 text-sm mt-1">{alert.studentName}'s application will be rejected and removed from active students.</p>
                </div>
                <div className="px-6 pb-6 flex gap-3">
                  <button onClick={() => setAlert(null)}
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors">
                    Cancel
                  </button>
                  <button onClick={() => executeReject(alert.pendingId)}
                    className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors">
                    Yes, Reject
                  </button>
                </div>
              </>
            )}

            {/* Confirm — Delete */}
            {alert.type === 'confirm-delete' && (
              <>
                <div className="px-6 pt-8 pb-4 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-3">
                    <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">Delete Record?</h2>
                  <p className="text-gray-500 text-sm mt-1">This will permanently delete {alert.studentName}'s registration. This cannot be undone.</p>
                </div>
                <div className="px-6 pb-6 flex gap-3">
                  <button onClick={() => setAlert(null)}
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors">
                    Cancel
                  </button>
                  <button onClick={() => executeDelete(alert.pendingId)}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors">
                    Yes, Delete
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

function MobileRow({ label, value, statusColor }: { label: string; value: string; statusColor?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-gray-400">{label}</span>
      {statusColor
        ? <span className={`text-xs font-semibold px-2 py-0.5 rounded-full w-fit mt-0.5 capitalize ${statusColor}`}>{value}</span>
        : <span className="text-xs font-semibold text-gray-700">{value}</span>
      }
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{title}</p>
      <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-2">{children}</div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-gray-400 w-28 flex-shrink-0">{label}</span>
      <span className="text-gray-800 font-medium capitalize">{value || '—'}</span>
    </div>
  )
}
