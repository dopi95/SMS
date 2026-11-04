'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import ConfirmDialog from '@/components/ConfirmDialog'
import { useSettings } from '@/contexts/SettingsContext'
import { usePermissions } from '@/contexts/PermissionsContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface UserSummary {
  _id: string
  name: string
  email: string
  role: string
  profilePhoto?: string
}

interface PaymentFile {
  _id: string
  title: string
  year: number
  createdBy: {
    name: string
    email: string
  }
  hiddenFromUsers?: UserSummary[]
  createdAt: string
}

export default function CustomPaymentsPage() {
  const { theme, getText } = useSettings()
  const { canDo, role } = usePermissions()
  const isSuperAdmin = role === 'superadmin'
  const router = useRouter()
  const [files, setFiles] = useState<PaymentFile[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingFile, setEditingFile] = useState<PaymentFile | null>(null)
  const [title, setTitle] = useState('')
  const [year, setYear] = useState(2019)
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Visibility state (Super Admin only)
  const [visibilityModalFile, setVisibilityModalFile] = useState<PaymentFile | null>(null)
  const [eligibleUsers, setEligibleUsers] = useState<UserSummary[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [selectedHiddenUserIds, setSelectedHiddenUserIds] = useState<string[]>([])
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [savingVisibility, setSavingVisibility] = useState(false)

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

  const handleDeleteFile = async () => {
    if (!deletingFileId) return
    setDeleting(true)
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/custom-payments/files/${deletingFileId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success(getText('File deleted successfully', 'ፋይል በተሳካ ሁኔታ ተሰርዟል'))
      setDeletingFileId(null)
      fetchFiles()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || getText('Failed to delete file', 'ፋይል መሰረዝ አልተሳካም'))
      setDeletingFileId(null)
    } finally {
      setDeleting(false)
    }
  }

  const handleEditFile = (file: PaymentFile) => {
    setEditingFile(file)
    setTitle(file.title)
    setYear(file.year)
    setShowModal(true)
  }

  const openVisibilityModal = async (file: PaymentFile) => {
    setVisibilityModalFile(file)
    const existingHiddenIds = (file.hiddenFromUsers || []).map(u => (typeof u === 'string' ? u : u._id))
    setSelectedHiddenUserIds(existingHiddenIds)
    setUserSearchTerm('')
    setLoadingUsers(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/custom-payments/visibility-users`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setEligibleUsers(res.data)
    } catch (err: any) {
      toast.error(err.response?.data?.message || getText('Failed to load users', 'ተጠቃሚዎችን መጫን አልተሳካም'))
    } finally {
      setLoadingUsers(false)
    }
  }

  const toggleUserHidden = (userId: string) => {
    setSelectedHiddenUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  const filteredUsers = eligibleUsers.filter(u => {
    const q = userSearchTerm.toLowerCase().trim()
    if (!q) return true
    return (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
  })

  const handleSelectAll = () => {
    const filteredIds = filteredUsers.map(u => u._id)
    setSelectedHiddenUserIds(prev => Array.from(new Set([...prev, ...filteredIds])))
  }

  const handleDeselectAll = () => {
    const filteredIds = new Set(filteredUsers.map(u => u._id))
    setSelectedHiddenUserIds(prev => prev.filter(id => !filteredIds.has(id)))
  }

  const handleSaveVisibility = async () => {
    if (!visibilityModalFile) return
    setSavingVisibility(true)
    try {
      const token = localStorage.getItem('token')
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/custom-payments/files/${visibilityModalFile._id}/visibility`,
        { hiddenFromUsers: selectedHiddenUserIds },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success(getText('File visibility updated successfully', 'የፋይል የማየት ፈቃድ በተሳካ ሁኔታ ተዘምኗል'))
      setVisibilityModalFile(null)
      fetchFiles()
    } catch (err: any) {
      toast.error(err.response?.data?.message || getText('Failed to update visibility', 'የማየት ፈቃድ ማዘመን አልተሳካም'))
    } finally {
      setSavingVisibility(false)
    }
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
                  {canDo('custom-payment', 'add') && (
                  <button
                    onClick={() => setShowModal(true)}
                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg active:scale-95"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>{getText('Create File', 'ፋይል ፍጠር')}</span>
                  </button>
                  )}
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
                        {canDo('custom-payment', 'add') && (
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(`/payments/custom/${file._id}`) }}
                          className={`p-2 rounded-lg transition-all ${theme === 'dark' ? 'hover:bg-green-900/30 text-green-400' : 'hover:bg-green-50 text-green-600'}`}
                          title={getText('Add Entry', 'ግቤት ጨምር')}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                        )}
                        {canDo('custom-payment', 'edit') && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEditFile(file) }}
                          className={`p-2 rounded-lg transition-all ${theme === 'dark' ? 'hover:bg-blue-900/30 text-blue-400' : 'hover:bg-blue-50 text-blue-500'}`}
                          title={getText('Edit File', 'ፋይል አርትዕ')}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        )}
                        {canDo('custom-payment', 'delete') && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeletingFileId(file._id) }}
                          className={`p-2 rounded-lg transition-all ${theme === 'dark' ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-500'}`}
                          title={getText('Delete File', 'ፋይል ሰርዝ')}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        )}
                        {isSuperAdmin && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openVisibilityModal(file) }}
                          className={`p-2 rounded-lg transition-all relative ${
                            file.hiddenFromUsers && file.hiddenFromUsers.length > 0
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                              : theme === 'dark' ? 'hover:bg-purple-900/30 text-purple-400' : 'hover:bg-purple-50 text-purple-600'
                          }`}
                          title={getText('Manage Visibility (Hide from users)', 'የማየት ፈቃድ ያስተዳድሩ')}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                          {file.hiddenFromUsers && file.hiddenFromUsers.length > 0 && (
                            <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full shadow-sm">
                              {file.hiddenFromUsers.length}
                            </span>
                          )}
                        </button>
                        )}
                      </div>
                    </div>
                    <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      {getText('Created by', 'የተፈጠረው በ')}: {file.createdBy.name}
                    </div>
                    <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      {new Date(file.createdAt).toLocaleDateString()}
                    </div>
                    {isSuperAdmin && file.hiddenFromUsers && file.hiddenFromUsers.length > 0 && (
                      <div className="mt-3 flex items-center justify-between text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800/50">
                        <span className="flex items-center gap-1.5 font-medium">
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                          <span>
                            {getText(
                              `Hidden from ${file.hiddenFromUsers.length} admin${file.hiddenFromUsers.length > 1 ? 's' : ''}`,
                              `ከ ${file.hiddenFromUsers.length} አድሚኖች ተሰውሯል`
                            )}
                          </span>
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); openVisibilityModal(file) }}
                          className="text-amber-800 dark:text-amber-200 underline font-semibold hover:opacity-80"
                        >
                          {getText('Edit', 'አስተካክል')}
                        </button>
                      </div>
                    )}
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
      <ConfirmDialog
        isOpen={!!deletingFileId}
        onClose={() => setDeletingFileId(null)}
        onConfirm={handleDeleteFile}
        title={getText('Delete File', 'ፋይል ሰርዝ')}
        message={getText('Are you sure you want to delete this file? All entries will be lost.', 'እርግጠኛ ነዎት ይህን ፋይል መሰረዝ ይፈልጋሉ? ሁሉም ግቤቶች ይጠፋሉ።')}
        confirmText={deleting ? getText('Deleting...', 'እየሰረዘ...') : getText('Delete', 'ሰርዝ')}
        confirmColor="red"
        icon={<svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}
      />

      {/* Manage File Visibility Modal (Superadmin Only) */}
      {visibilityModalFile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
            {/* Modal Header */}
            <div className={`px-6 py-5 border-b flex items-start justify-between ${theme === 'dark' ? 'border-gray-700 bg-gray-800/80' : 'border-gray-100 bg-gray-50/80'}`}>
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 rounded-xl">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                </span>
                <div>
                  <h2 className="text-lg font-bold">
                    {getText('File Visibility Permissions', 'የፋይል የማየት ፈቃድ')}
                  </h2>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {visibilityModalFile.title} ({visibilityModalFile.year} E.C)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setVisibilityModalFile(null)}
                className={`p-1.5 rounded-lg text-gray-400 hover:text-gray-600 ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Instruction banner */}
            <div className={`px-6 py-3 text-xs border-b ${theme === 'dark' ? 'bg-purple-950/30 border-gray-700 text-purple-200' : 'bg-purple-50/80 border-purple-100 text-purple-800'}`}>
              <p className="leading-relaxed">
                {getText(
                  'Check admins who CANNOT see this file. Checked admins will have this specific file completely hidden from their view.',
                  'ይህን ፋይል ማየት የማይችሉትን አድሚኖች ይምረጡ። ምልክት የተደረገባቸው አድሚኖች ይህን ፋይል ጨርሶ ማየት አይችሉም።'
                )}
              </p>
            </div>

            {/* Search & Bulk Select Controls */}
            <div className="px-6 py-3 flex items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700/50">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder={getText('Search admin by name or email...', 'አድሚን በስም ወይም በኢሜይል ይፈልጉ...')}
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}
                />
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                >
                  {getText('Hide All', 'ሁሉንም ሰውር')}
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                >
                  {getText('Show to All', 'ለሁሉም አሳይ')}
                </button>
              </div>
            </div>

            {/* User Checkbox List */}
            <div className="flex-1 overflow-y-auto px-6 py-2 divide-y divide-gray-100 dark:divide-gray-700/60 max-h-[380px]">
              {loadingUsers ? (
                <div className="py-12 flex justify-center items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-400">
                  {getText('No admins found', 'ምንም አድሚን አልተገኘም')}
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const isHidden = selectedHiddenUserIds.includes(user._id)
                  return (
                    <label
                      key={user._id}
                      onClick={() => toggleUserHidden(user._id)}
                      className={`py-3 px-3 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isHidden
                          ? theme === 'dark' ? 'bg-red-950/20 hover:bg-red-950/30' : 'bg-red-50/70 hover:bg-red-50'
                          : theme === 'dark' ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isHidden}
                          onChange={() => {}} // handled by click on container
                          className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-gray-300 dark:border-gray-600"
                        />
                        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-xs">
                          {user.profilePhoto ? (
                            <img src={user.profilePhoto} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                            user.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {user.name}
                          </p>
                          <p className={`text-xs truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {user.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full capitalize font-medium ${
                          user.role === 'admin'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {user.role}
                        </span>
                        {isHidden ? (
                          <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 border border-red-200 dark:border-red-800">
                            {getText('Hidden', 'የተሰወረ')}
                          </span>
                        ) : (
                          <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 border border-green-200 dark:border-green-800">
                            {getText('Visible', 'የሚታይ')}
                          </span>
                        )}
                      </div>
                    </label>
                  )
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className={`px-6 py-4 border-t flex items-center justify-between gap-3 ${theme === 'dark' ? 'border-gray-700 bg-gray-800/80' : 'border-gray-100 bg-gray-50/80'}`}>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {selectedHiddenUserIds.length > 0 ? (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    {getText(
                      `Hidden from ${selectedHiddenUserIds.length} admin(s)`,
                      `ከ ${selectedHiddenUserIds.length} አድሚን(ዎች) ተሰውሯል`
                    )}
                  </span>
                ) : (
                  <span>{getText('Visible to all admins', 'ለሁሉም አድሚኖች ይታያል')}</span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setVisibilityModalFile(null)}
                  disabled={savingVisibility}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${theme === 'dark' ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-100'}`}
                >
                  {getText('Cancel', 'ሰርዝ')}
                </button>
                <button
                  type="button"
                  onClick={handleSaveVisibility}
                  disabled={savingVisibility}
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-xs font-bold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingVisibility && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>{getText('Save Visibility', 'ፈቃድ አስቀምጥ')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
