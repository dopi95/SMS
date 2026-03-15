'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { useSettings } from '@/contexts/SettingsContext'
import { usePermissions } from '@/contexts/PermissionsContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useRouter, useParams } from 'next/navigation'

interface PaymentFile {
  _id: string
  title: string
  year: number
  createdBy: {
    name: string
    email: string
  }
}

interface PaymentEntry {
  _id: string
  studentName: string
  class: string
  amount: number
  paymentDate: string
  paymentMethod: 'cash' | 'bank'
}

const CLASS_OPTIONS = [
  'Nursery A', 'Nursery B', 'Nursery C', 'Nursery D',
  'LKG A', 'LKG B', 'LKG C', 'LKG D',
  'UKG A', 'UKG B', 'UKG C', 'UKG D'
]

export default function PaymentFilePage() {
  const { theme, getText } = useSettings()
  const { role, canDo } = usePermissions()
  const router = useRouter()
  const params = useParams()
  const fileId = params.id as string

  const [file, setFile] = useState<PaymentFile | null>(null)
  const [entries, setEntries] = useState<PaymentEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingEntry, setEditingEntry] = useState<PaymentEntry | null>(null)
  
  const [studentName, setStudentName] = useState('')
  const [studentClass, setStudentClass] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>('cash')

  useEffect(() => {
    fetchFileData()
  }, [fileId])

  const fetchFileData = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/custom-payments/files/${fileId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setFile(response.data.file)
      setEntries(response.data.entries)
    } catch (error) {
      toast.error(getText('Failed to fetch file data', 'የፋይል መረጃ መጫን አልተሳካም'))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      
      if (editingEntry) {
        await axios.put(
          `${process.env.NEXT_PUBLIC_API_URL}/custom-payments/entries/${editingEntry._id}`,
          { studentName, class: studentClass, amount: Number(amount), paymentDate, paymentMethod },
          { headers: { Authorization: `Bearer ${token}` } }
        )
        toast.success(getText('Entry updated successfully', 'ግቤት በተሳካ ሁኔታ ተዘምኗል'))
      } else {
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/custom-payments/entries`,
          { fileId, studentName, class: studentClass, amount: Number(amount), paymentDate, paymentMethod },
          { headers: { Authorization: `Bearer ${token}` } }
        )
        toast.success(getText('Entry added successfully', 'ግቤት በተሳካ ሁኔታ ታክሏል'))
      }
      
      resetForm()
      fetchFileData()
    } catch (error: any) {
      toast.error(error.response?.data?.message || getText('Failed to save entry', 'ግቤት ማስቀመጥ አልተሳካም'))
    }
  }

  const handleEdit = (entry: PaymentEntry) => {
    setEditingEntry(entry)
    setStudentName(entry.studentName)
    setStudentClass(entry.class)
    setAmount(entry.amount.toString())
    setPaymentDate(new Date(entry.paymentDate).toISOString().split('T')[0])
    setPaymentMethod(entry.paymentMethod)
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm(getText('Are you sure you want to delete this entry?', 'እርግጠኛ ነዎት ይህን ግቤት መሰረዝ ይፈልጋሉ?'))) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/custom-payments/entries/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success(getText('Entry deleted successfully', 'ግቤት በተሳካ ሁኔታ ተሰርዟል'))
      fetchFileData()
    } catch (error) {
      toast.error(getText('Failed to delete entry', 'ግቤት መሰረዝ አልተሳካም'))
    }
  }

  const resetForm = () => {
    setShowModal(false)
    setEditingEntry(null)
    setStudentName('')
    setStudentClass('')
    setAmount('')
    setPaymentDate(new Date().toISOString().split('T')[0])
    setPaymentMethod('cash')
  }

  const totalAmount = entries.reduce((sum, entry) => sum + entry.amount, 0)

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/custom-payments/files/${fileId}/export`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      )
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${file?.title}-${file?.year}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success(getText('File exported successfully', 'ፋይል በተሳካ ሁኔታ ወጥቷል'))
    } catch (error) {
      toast.error(getText('Failed to export file', 'ፋይል መላክ አልተሳካም'))
    }
  }

  return (
    <DashboardLayout pageTitle={file?.title || getText('Payment File', 'የክፍያ ፋይል')}>
      <div className={`min-h-screen p-6 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className={`rounded-xl shadow-lg border mb-6 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                <div className={`px-6 py-5 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                    <div>
                      <h1 className={`text-2xl md:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {file?.title}
                      </h1>
                      <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {getText('Year', 'ዓመት')}: {file?.year} E.C | {getText('Total Entries', 'ጠቅላላ ግቤቶች')}: {entries.length}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 md:gap-3">
                      <button
                        onClick={() => router.push('/payments/custom')}
                        className={`flex-1 sm:flex-initial px-3 sm:px-4 md:px-5 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                      >
                        <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span className="text-sm md:text-base">{getText('Back', 'ተመለስ')}</span>
                      </button>
                      <button
                        onClick={handleExport}
                        className={`flex-1 sm:flex-initial px-3 sm:px-4 md:px-5 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md ${theme === 'dark' ? 'bg-green-700 hover:bg-green-600 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                      >
                        <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-sm md:text-base">{getText('Export', 'ላክ')}</span>
                      </button>
                      {canDo('custom-payment', 'add') && (
                      <button
                        onClick={() => setShowModal(true)}
                        className="flex-1 sm:flex-initial bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-3 sm:px-4 md:px-5 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95"
                      >
                        <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-sm md:text-base">{getText('Add Entry', 'ግቤት ጨምር')}</span>
                      </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Summary */}
                {role !== 'executive' && (
                <div className={`px-6 py-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {getText('Total Amount Collected', 'ጠቅላላ የተሰበሰበ መጠን')}:
                    </span>
                    <span className={`text-2xl font-bold ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                      {totalAmount.toLocaleString()} ETB
                    </span>
                  </div>
                </div>
                )}
              </div>

              {/* Entries Table */}
              <div className={`rounded-xl shadow-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                {entries.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                      {getText('No entries yet. Add your first payment entry.', 'ገና ምንም ግቤቶች የሉም። የመጀመሪያውን የክፍያ ግቤት ያክሉ።')}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                      <thead>
                        <tr className={`border-b ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                            {getText('Student Name', 'የተማሪ ስም')}
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                            {getText('Class', 'ክፍል')}
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                            {getText('Amount', 'መጠን')}
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                            {getText('Payment Date', 'የክፍያ ቀን')}
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                            {getText('Payment Method', 'የክፍያ ዘዴ')}
                          </th>
                          <th className={`px-6 py-3 text-center text-xs font-medium uppercase ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                            {getText('Actions', 'ድርጊቶች')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-600' : 'divide-gray-100'}`}>
                        {entries.map((entry) => (
                          <tr key={entry._id} className={theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                            <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                              <div className="font-medium">{entry.studentName}</div>
                            </td>
                            <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                              {entry.class}
                            </td>
                            <td className={`px-6 py-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'} font-semibold`}>
                              {entry.amount.toLocaleString()} ETB
                            </td>
                            <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                              {new Date(entry.paymentDate).toLocaleDateString()}
                            </td>
                            <td className={`px-6 py-4`}>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${entry.paymentMethod === 'bank' ? (theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700') : (theme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700')}`}>
                                {entry.paymentMethod === 'bank' ? getText('Bank', 'ባንክ') : getText('Cash', 'ጥሬ ገንዘብ')}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-2">
                                {canDo('custom-payment', 'edit') && (
                                <button
                                  onClick={() => handleEdit(entry)}
                                  className={`p-2 rounded-lg transition-all ${theme === 'dark' ? 'hover:bg-blue-900/30 text-blue-400' : 'hover:bg-blue-50 text-blue-500'}`}
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                )}
                                {canDo('custom-payment', 'delete') && (
                                <button
                                  onClick={() => handleDelete(entry._id)}
                                  className={`p-2 rounded-lg transition-all ${theme === 'dark' ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-500'}`}
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
                    {entries.map((entry) => (
                      <div key={entry._id} className={`p-4 ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className={`font-semibold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {entry.studentName}
                            </h3>
                            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                              {getText('Class', 'ክፍል')}: {entry.class}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {canDo('custom-payment', 'edit') && (
                            <button
                              onClick={() => handleEdit(entry)}
                              className={`p-2 rounded-lg transition-all ${theme === 'dark' ? 'hover:bg-blue-900/30 text-blue-400' : 'hover:bg-blue-50 text-blue-500'}`}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            )}
                            {canDo('custom-payment', 'delete') && (
                            <button
                              onClick={() => handleDelete(entry._id)}
                              className={`p-2 rounded-lg transition-all ${theme === 'dark' ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-500'}`}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                              {getText('Amount', 'መጠን')}:
                            </span>
                            <span className={`font-semibold text-lg ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                              {entry.amount.toLocaleString()} ETB
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                              {getText('Date', 'ቀን')}:
                            </span>
                            <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                              {new Date(entry.paymentDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                              {getText('Method', 'ዘዴ')}:
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${entry.paymentMethod === 'bank' ? (theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700') : (theme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700')}`}>
                              {entry.paymentMethod === 'bank' ? getText('Bank', 'ባንክ') : getText('Cash', 'ጥሬ ገንዘብ')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl shadow-2xl p-6 w-full max-w-md ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {editingEntry ? getText('Edit Entry', 'ግቤት አርትዕ') : getText('Add Entry', 'ግቤት ጨምር')}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {getText('Student Name', 'የተማሪ ስም')} *
                  </label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    required
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {getText('Class', 'ክፍል')} *
                  </label>
                  <select
                    value={studentClass}
                    onChange={(e) => setStudentClass(e.target.value)}
                    required
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  >
                    <option value="">{getText('Select Class', 'ክፍል ይምረጡ')}</option>
                    {CLASS_OPTIONS.map(cls => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {getText('Amount (ETB)', 'መጠን (ብር)')} *
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    min="0"
                    step="0.01"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {getText('Payment Date', 'የክፍያ ቀን')} *
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    required
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {getText('Payment Method', 'የክፍያ ዘዴ')} *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'bank')}
                    required
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  >
                    <option value="cash">{getText('Cash', 'ጥሬ ገንዘብ')}</option>
                    <option value="bank">{getText('Bank', 'ባንክ')}</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={resetForm}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                >
                  {getText('Cancel', 'ሰርዝ')}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
                >
                  {editingEntry ? getText('Update', 'አዘምን') : getText('Add', 'ጨምር')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
