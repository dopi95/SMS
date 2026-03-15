'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { useSettings } from '@/contexts/SettingsContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface PaymentFile {
  _id: string
  title: string
  year: number
  createdBy: {
    name: string
    email: string
  }
  createdAt: string
}

export default function CustomPaymentsPage() {
  const { theme, getText } = useSettings()
  const router = useRouter()
  const [files, setFiles] = useState<PaymentFile[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingFile, setEditingFile] = useState<PaymentFile | null>(null)
  const [title, setTitle] = useState('')
  const [year, setYear] = useState(2019)

  useEffect(() => {
    fetchFiles()
  }, [])

  const fetchFiles = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/custom-payments/files`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setFiles(response.data)
    } catch (error) {
      toast.error(getText('Failed to fetch files', 'ፋይሎችን መጫን አልተሳካም'))
    } finally {
      setLoading(false)
    }
  }

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      
      if (editingFile) {
        await axios.put(
          `${process.env.NEXT_PUBLIC_API_URL}/custom-payments/files/${editingFile._id}`,
          { title, year },
          { headers: { Authorization: `Bearer ${token}` } }
        )
        toast.success(getText('File updated successfully', 'ፋይል በተሳካ ሁኔታ ተዘምኗል'))
      } else {
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/custom-payments/files`,
          { title, year },
          { headers: { Authorization: `Bearer ${token}` } }
        )
        toast.success(getText('File created successfully', 'ፋይል በተሳካ ሁኔታ ተፈጥሯል'))
      }
      
      setShowModal(false)
      setEditingFile(null)
      setTitle('')
      setYear(2019)
      fetchFiles()
    } catch (error: any) {
      toast.error(error.response?.data?.message || getText('Failed to save file', 'ፋይል ማስቀመጥ አልተሳካም'))
    }
  }

  const handleDeleteFile = async (id: string) => {
    if (!confirm(getText('Are you sure you want to delete this file?', 'እርግጠኛ ነዎት ይህን ፋይል መሰረዝ ይፈልጋሉ?'))) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/custom-payments/files/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success(getText('File deleted successfully', 'ፋይል በተሳካ ሁኔታ ተሰርዟል'))
      fetchFiles()
    } catch (error) {
      toast.error(getText('Failed to delete file', 'ፋይል መሰረዝ አልተሳካም'))
    }
  }

  const handleEditFile = (file: PaymentFile) => {
    setEditingFile(file)
    setTitle(file.title)
    setYear(file.year)
    setShowModal(true)
  }

  return (
    <DashboardLayout pageTitle={getText('Custom Payments', 'ልዩ ክፍያዎች')}>
      <div className={`min-h-screen p-6 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto">
          <div className={`rounded-xl shadow-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className={`px-6 py-5 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                  <h1 className={`text-2xl md:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {getText('Custom Payment Files', 'ልዩ የክፍያ ፋይሎች')}
                  </h1>
                  <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {getText('Create and manage custom payment files', 'ልዩ የክፍያ ፋይሎችን ይፍጠሩ እና ያስተዳድሩ')}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => router.push('/payments')}
                    className={`px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span>{getText('Back', 'ተመለስ')}</span>
                  </button>
                  <button
                    onClick={() => setShowModal(true)}
                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg active:scale-95"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>{getText('Create File', 'ፋይል ፍጠር')}</span>
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                  {getText('No payment files found. Create one to get started.', 'ምንም የክፍያ ፋይሎች አልተገኙም። ለመጀመር አንድ ይፍጠሩ።')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                {files.map((file) => (
                  <div
                    key={file._id}
                    className={`rounded-lg border p-5 transition-all hover:shadow-lg ${theme === 'dark' ? 'bg-gray-700 border-gray-600 hover:border-purple-500' : 'bg-white border-gray-200 hover:border-purple-400'}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 cursor-pointer" onClick={() => router.push(`/payments/custom/${file._id}`)}>
                        <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {file.title}
                        </h3>
                        <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {getText('Year', 'ዓመት')}: {file.year} E.C
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/payments/custom/${file._id}`)
                          }}
                          className={`p-2 rounded-lg transition-all ${theme === 'dark' ? 'hover:bg-green-900/30 text-green-400' : 'hover:bg-green-50 text-green-600'}`}
                          title={getText('Add Entry', 'ግቤት ጨምር')}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditFile(file)
                          }}
                          className={`p-2 rounded-lg transition-all ${theme === 'dark' ? 'hover:bg-blue-900/30 text-blue-400' : 'hover:bg-blue-50 text-blue-500'}`}
                          title={getText('Edit File', 'ፋይል አርትዕ')}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteFile(file._id)
                          }}
                          className={`p-2 rounded-lg transition-all ${theme === 'dark' ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-500'}`}
                          title={getText('Delete File', 'ፋይል ሰርዝ')}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      {getText('Created by', 'የተፈጠረው በ')}: {file.createdBy.name}
                    </div>
                    <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      {new Date(file.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create File Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl shadow-2xl p-6 w-full max-w-md ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {editingFile ? getText('Edit Payment File', 'የክፍያ ፋይል አርትዕ') : getText('Create Payment File', 'የክፍያ ፋይል ፍጠር')}
            </h2>
            <form onSubmit={handleCreateFile}>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {getText('File Title', 'የፋይል ርዕስ')} *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                    placeholder="e.g., Registration Fee, Uniform Payment"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {getText('Year', 'ዓመት')} *
                  </label>
                  <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    required
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  >
                    <option value={2018}>2018 E.C</option>
                    <option value={2019}>2019 E.C</option>
                    <option value={2020}>2020 E.C</option>
                    <option value={2021}>2021 E.C</option>
                    <option value={2022}>2022 E.C</option>
                    <option value={2023}>2023 E.C</option>
                    <option value={2024}>2024 E.C</option>
                    <option value={2025}>2025 E.C</option>
                    <option value={2026}>2026 E.C</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingFile(null)
                    setTitle('')
                    setYear(2019)
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                >
                  {getText('Cancel', 'ሰርዝ')}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
                >
                  {editingFile ? getText('Update', 'አዘምን') : getText('Create', 'ፍጠር')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
