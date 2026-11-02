'use client'

import { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import Pagination from '@/components/Pagination'
import { useSettings } from '@/contexts/SettingsContext'
import { usePermissions } from '@/contexts/PermissionsContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  ETHIOPIAN_ACADEMIC_MONTHS,
  getCurrentEthiopianAcademicMonth,
  getCurrentEthiopianYear
} from '@/utils/dateUtils'
import { getStudentDisplayName } from '@/utils/studentUtils'
import {
  BanknotesIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  PlusCircleIcon,
  ClipboardDocumentCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  LinkIcon,
  TrashIcon,
  EyeIcon,
  CalendarDaysIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

interface Student {
  _id: string
  studentId: string
  firstName: string
  middleName: string
  lastName: string
  firstNameAmharic?: string
  middleNameAmharic?: string
  lastNameAmharic?: string
  class: string
  section?: string
  paymentCode?: string
  fatherName?: string
  fatherPhone?: string
  motherName?: string
  motherPhone?: string
}

interface BankTransaction {
  _id: string
  bank: 'CBE' | 'AWASH' | 'UNKNOWN'
  reference: string
  amount: number
  currency: string
  senderName: string
  sourceBank?: string
  receiverAccount: string
  senderPhone: string
  transactionDate: string
  rawSms: string
  matchedStudent?: Student | null
  status: 'unmatched' | 'matched' | 'ignored'
  isReconciled?: boolean
  createdAt: string
}

interface BankStats {
  totalCount: number
  totalAmount: number
  todayAmount: number
  monthAmount: number
  cbe: { count: number; amount: number }
  awash: { count: number; amount: number }
  matchedCount: number
  unmatchedCount: number
}

interface BankSettings {
  cbeAccount: string
  cbePhone: string
  cbeActive: boolean
  awashAccount: string
  awashPhone: string
  awashActive: boolean
  webhookSecret: string
}

export default function BankReportsPage() {
  const { theme, getText, language } = useSettings()
  const { canAccess, canDo, loading: permLoading } = usePermissions()

  // Transactions State
  const [transactions, setTransactions] = useState<BankTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<BankStats | null>(null)

  // Filters State
  const [bankFilter, setBankFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [dateFilterMode, setDateFilterMode] = useState<'all' | 'single' | 'range'>('all')
  const [specificDate, setSpecificDate] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [totalItems, setTotalItems] = useState<number>(0)
  const PAGE_SIZE = 20

  // Modals
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showSmsModal, setShowSmsModal] = useState<BankTransaction | null>(null)
  const [linkingTxn, setLinkingTxn] = useState<BankTransaction | null>(null)

  // Settings State
  const [settings, setSettings] = useState<BankSettings>({
    cbeAccount: '',
    cbePhone: '',
    cbeActive: true,
    awashAccount: '',
    awashPhone: '',
    awashActive: true,
    webhookSecret: ''
  })
  const [savingSettings, setSavingSettings] = useState(false)

  // Manual Import State
  const [importText, setImportText] = useState('')
  const [importSender, setImportSender] = useState('')
  const [importDate, setImportDate] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)

  // Link Student State
  const [studentSearch, setStudentSearch] = useState('')
  const [studentList, setStudentList] = useState<Student[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [linking, setLinking] = useState(false)
  const [searchingStudents, setSearchingStudents] = useState(false)

  // Approval Modal State
  const [approvingTxn, setApprovingTxn] = useState<BankTransaction | null>(null)
  const [approveMonth, setApproveMonth] = useState<string>('')
  const [approveYear, setApproveYear] = useState<number>(2019)
  const [approveAmount, setApproveAmount] = useState<number>(0)
  const [approveDate, setApproveDate] = useState<string>('')
  const [approveDesc, setApproveDesc] = useState<string>('')
  const [approving, setApproving] = useState<boolean>(false)

  // Fetch Transactions
  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const effStart = dateFilterMode === 'single' ? specificDate : dateFilterMode === 'range' ? startDate : ''
      const effEnd = dateFilterMode === 'single' ? specificDate : dateFilterMode === 'range' ? endDate : ''
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/bank-transactions`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          bank: bankFilter,
          status: statusFilter,
          search: searchTerm,
          startDate: effStart || undefined,
          endDate: effEnd || undefined,
          page: currentPage,
          limit: PAGE_SIZE
        }
      })
      setTransactions(res.data.transactions || [])
      setTotalPages(res.data.pagination?.totalPages || 1)
      setTotalItems(res.data.pagination?.total || 0)
    } catch (err: any) {
      toast.error(getText('Failed to load transactions', 'ግብይቶችን መጫን አልተሳካም'))
    } finally {
      setLoading(false)
    }
  }, [bankFilter, statusFilter, searchTerm, dateFilterMode, specificDate, startDate, endDate, currentPage, getText])

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/bank-transactions/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setStats(res.data)
    } catch {}
  }, [])

  // Fetch Settings
  const fetchSettings = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/bank-transactions/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data) {
        setSettings({
          cbeAccount: res.data.cbeAccount || '',
          cbePhone: res.data.cbePhone || '',
          cbeActive: res.data.cbeActive !== false,
          awashAccount: res.data.awashAccount || '',
          awashPhone: res.data.awashPhone || '',
          awashActive: res.data.awashActive !== false,
          webhookSecret: res.data.webhookSecret || ''
        })
      }
    } catch {}
  }, [])

  // Search Students for Linking
  const searchStudents = async (query: string) => {
    if (!query || query.trim().length < 2) {
      setStudentList([])
      return
    }
    setSearchingStudents(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/bank-transactions/search-students`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { q: query.trim() }
      })
      setStudentList(Array.isArray(res.data) ? res.data : [])
    } catch {
      setStudentList([])
    } finally {
      setSearchingStudents(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  useEffect(() => {
    fetchStats()
    fetchSettings()
  }, [fetchStats, fetchSettings])

  useEffect(() => {
    setCurrentPage(1)
  }, [bankFilter, statusFilter, searchTerm, dateFilterMode, specificDate, startDate, endDate])

  // Save Settings
  const handleSaveSettings = async () => {
    setSavingSettings(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/bank-transactions/settings`, settings, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSettings(res.data)
      toast.success(getText('Bank settings saved successfully', 'የባንክ ቅንብሮች በተሳካ ሁኔታ ተቀምጠዋል'))
      setShowSettingsModal(false)
      fetchStats()
    } catch (err: any) {
      toast.error(err.response?.data?.message || getText('Failed to save settings', 'ቅንብሮችን ማስቀመጥ አልተሳካም'))
    } finally {
      setSavingSettings(false)
    }
  }

  // Handle Manual SMS Import
  const handleManualImport = async () => {
    if (!importText.trim()) {
      toast.error(getText('Please paste SMS text', 'እባክዎ የኤስኤምኤስ ጽሑፍ ያስገቡ'))
      return
    }
    setImporting(true)
    setImportResult(null)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/bank-transactions/parse-manual`,
        { smsText: importText, sender: importSender, customDate: importDate || undefined },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setImportResult(res.data)
      toast.success(
        getText(
          `Processed: ${res.data.saved} saved, ${res.data.duplicates} duplicates, ${res.data.ignored} ignored`,
          `ተከናውኗል፡ ${res.data.saved} ተመዝግቧል፣ ${res.data.duplicates} ድጋሚ፣ ${res.data.ignored} ተትቷል`
        )
      )
      fetchTransactions()
      fetchStats()
    } catch (err: any) {
      toast.error(err.response?.data?.message || getText('Failed to import SMS', 'ኤስኤምኤስ ማስገባት አልተሳካም'))
    } finally {
      setImporting(false)
    }
  }

  // Handle Link Student
  const handleLinkStudent = async () => {
    if (!linkingTxn || !selectedStudentId) {
      toast.error(getText('Please select a student', 'እባክዎ ተማሪ ይምረጡ'))
      return
    }
    setLinking(true)
    try {
      const token = localStorage.getItem('token')
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/bank-transactions/${linkingTxn._id}/link-student`,
        { studentId: selectedStudentId },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success(getText('Student linked successfully', 'ተማሪው በተሳካ ሁኔታ ተያይዟል'))
      setLinkingTxn(null)
      setSelectedStudentId('')
      setStudentSearch('')
      setStudentList([])
      fetchTransactions()
      fetchStats()
    } catch (err: any) {
      toast.error(err.response?.data?.message || getText('Failed to link student', 'ተማሪውን ማያያዝ አልተሳካም'))
    } finally {
      setLinking(false)
    }
  }

  // Open Approve & Record Payment Modal
  const handleOpenApproveModal = (txn: BankTransaction) => {
    setApprovingTxn(txn)
    setApproveMonth(getCurrentEthiopianAcademicMonth())
    setApproveYear(getCurrentEthiopianYear())
    setApproveAmount(txn.amount)
    const txnDateStr = txn.transactionDate
      ? new Date(txn.transactionDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
    setApproveDate(txnDateStr)
    setApproveDesc(`Bank payment via ${txn.bank} (Ref: ${txn.reference})`)
  }

  // Confirm Approval & Record Payment
  const handleConfirmApprove = async () => {
    if (!approvingTxn) return
    setApproving(true)
    try {
      const token = localStorage.getItem('token')
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/bank-transactions/${approvingTxn._id}/approve-payment`,
        {
          month: approveMonth,
          year: approveYear,
          amount: approveAmount,
          paymentDate: approveDate,
          description: approveDesc
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success(getText('Payment approved and recorded on the Payments page!', 'ክፍያው ጸድቆ በክፍያ ገጽ ላይ በተሳካ ሁኔታ ተመዝግቧል!'))

      // Update local transaction state
      setTransactions(prev => prev.map(t => t._id === approvingTxn._id ? { ...t, isReconciled: true } : t))
      if (showSmsModal && showSmsModal._id === approvingTxn._id) {
        setShowSmsModal(prev => prev ? { ...prev, isReconciled: true } : null)
      }
      setApprovingTxn(null)
      fetchTransactions()
      fetchStats()
    } catch (err: any) {
      toast.error(err.response?.data?.message || getText('Failed to approve payment', 'ክፍያውን ማጽደቅ አልተሳካም'))
    } finally {
      setApproving(false)
    }
  }

  // Revoke Approval & Delete Associated Payment
  const handleRevokeApprove = async (id: string) => {
    if (!confirm(getText(
      'Are you sure you want to remove this approval? This will delete the payment record from the Payments page and return this transaction to pending approval.',
      'ይህንን ማጽደቅ ማንሳት እርግጠኛ ነዎት? ይህ ከክፍያ ገጽ ላይ መዝገቡን ይሰርዛል እንዲሁም ግብይቱን ወደ ማጽደቂያነት ይመልሰዋል።'
    ))) return

    try {
      const token = localStorage.getItem('token')
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/bank-transactions/${id}/unapprove-payment`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success(getText('Approval removed and payment record deleted', 'ማጽደቅ ተነስቷል እንዲሁም የክፍያ መዝገቡ ተሰርዟል'))

      setTransactions(prev => prev.map(t => t._id === id ? { ...t, isReconciled: false } : t))
      if (showSmsModal && showSmsModal._id === id) {
        setShowSmsModal(prev => prev ? { ...prev, isReconciled: false } : null)
      }
      fetchTransactions()
      fetchStats()
    } catch (err: any) {
      toast.error(err.response?.data?.message || getText('Failed to remove approval', 'ማጽደቅን ማንሳት አልተሳካም'))
    }
  }

  // Delete Transaction
  const handleDeleteTransaction = async (id: string, ref: string) => {
    if (!confirm(getText(`Are you sure you want to delete transaction ${ref}?`, `እርግጠኛ ነዎት ግብይት ${ref}ን መሰረዝ ይፈልጋሉ?`))) return
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/bank-transactions/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success(getText('Transaction deleted', 'ግብይት ተሰርዟል'))
      fetchTransactions()
      fetchStats()
    } catch {
      toast.error(getText('Failed to delete', 'መሰረዝ አልተሳካም'))
    }
  }

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin.replace(':3000', ':5000').replace(':4500', ':5000')}/api/bank-transactions/webhook`
    : 'https://admission.bluelight.edu.et/api/bank-transactions/webhook'

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} ${getText('copied to clipboard', 'ወደ ቅንጥብ ሰሌዳ ተቀድቷል')}`)
  }

  if (!permLoading && !canAccess('bank-reports')) {
    return (
      <DashboardLayout pageTitle={getText('Transaction Reports', 'የግብይት ሪፖርት')}>
        <div className={`min-h-[70vh] flex flex-col items-center justify-center p-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mb-4 shadow-inner">
            <XCircleIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-bold mb-2">
            {getText('Access Denied', 'ፍቃድ የለዎትም')}
          </h2>
          <p className={`text-sm max-w-md text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            {getText(
              'You do not have permission to view Transaction Reports. Please contact the administrator.',
              'ይህንን የግብይት ሪፖርት ገጽ ለማየት ፍቃድ የለዎትም። እባክዎ ዋና አስተዳዳሪውን ያነጋግሩ።'
            )}
          </p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout pageTitle={getText('Transaction Reports', 'የግብይት ሪፖርት')}>
      <div className={`min-h-screen w-full max-w-full overflow-x-hidden p-3 sm:p-6 lg:p-8 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="w-full max-w-7xl mx-auto space-y-6 overflow-hidden">

          {/* Header */}
          <div className={`rounded-2xl p-4 sm:p-6 shadow-lg border transition-all ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white shadow-md">
                  <BanknotesIcon className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    {getText('Transaction Reports', 'የግብይት ሪፖርት')}
                  </h1>
                  <p className={`text-sm mt-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {getText('Automated CBE and Awash Bank SMS payment tracking & reconciliation', 'የኢትዮጵያ ንግድ ባንክ እና አዋሽ ባንክ ክፍያዎችን በኤስኤምኤስ በራስ-ሰር መከታተያ')}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(true)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition shadow flex items-center gap-2"
                >
                  <PlusCircleIcon className="w-5 h-5" />
                  <span>{getText('Quick SMS Import', 'ኤስኤምኤስ አስገባ')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSettingsModal(true)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition border shadow-sm flex items-center gap-2 ${
                    theme === 'dark' ? 'bg-gray-700 border-gray-600 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 border-gray-200 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  <Cog6ToothIcon className="w-5 h-5" />
                  <span>{getText('Bank Settings', 'የባንክ ቅንብሮች')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => { fetchTransactions(); fetchStats(); }}
                  className={`p-2.5 rounded-xl transition border shadow-sm ${
                    theme === 'dark' ? 'bg-gray-700 border-gray-600 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 border-gray-200 hover:bg-gray-200 text-gray-700'
                  }`}
                  title={getText('Refresh', 'አድስ')}
                >
                  <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin text-blue-500' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Config Alert if accounts not configured */}
          {(!settings.cbeAccount && !settings.awashAccount) && (
            <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
              theme === 'dark' ? 'bg-amber-950/40 border-amber-800 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              <div className="flex items-center gap-3">
                <InformationCircleIcon className="w-6 h-6 text-amber-500 flex-shrink-0" />
                <p className="text-sm">
                  {getText(
                    'No target school accounts configured yet! Please configure your specific CBE and Awash account numbers so the system can filter your school transactions.',
                    'ገና የተመረጡ የትምህርት ቤት የባንክ ሂሳቦች አልተመዘገቡም! የት/ቤቱን የንግድ ባንክ እና አዋሽ ባንክ ሂሳብ ቁጥሮች እባክዎ ያስመዝግቡ።'
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 whitespace-nowrap"
              >
                {getText('Configure Now', 'አሁን አስተካክል')}
              </button>
            </div>
          )}

          {/* Stats KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Collected */}
            <div className={`p-5 rounded-2xl shadow border transition-all ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {getText('Total Received', 'ጠቅላላ የተሰበሰበ')}
                  </p>
                  <h3 className="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400">
                    ETB {(stats?.totalAmount || 0).toLocaleString()}
                  </h3>
                  <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {stats?.totalCount || 0} {getText('transactions', 'ግብይቶች')}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <BanknotesIcon className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* CBE Stats */}
            <div className={`p-5 rounded-2xl shadow border transition-all ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                    <p className={`text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      CBE ({getText('ንግድ ባንክ', 'ንግድ ባንክ')})
                    </p>
                  </div>
                  <h3 className="text-2xl font-black mt-1 text-purple-600 dark:text-purple-400">
                    ETB {(stats?.cbe?.amount || 0).toLocaleString()}
                  </h3>
                  <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {stats?.cbe?.count || 0} {getText('transfers', 'ክፍያዎች')}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 font-extrabold text-sm">
                  CBE
                </div>
              </div>
            </div>

            {/* Awash Stats */}
            <div className={`p-5 rounded-2xl shadow border transition-all ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <p className={`text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      Awash Bank ({getText('አዋሽ ባንክ', 'አዋሽ ባንክ')})
                    </p>
                  </div>
                  <h3 className="text-2xl font-black mt-1 text-amber-600 dark:text-amber-400">
                    ETB {(stats?.awash?.amount || 0).toLocaleString()}
                  </h3>
                  <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {stats?.awash?.count || 0} {getText('transfers', 'ክፍያዎች')}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold text-sm">
                  AWASH
                </div>
              </div>
            </div>

            {/* Reconciliation Status */}
            <div className={`p-5 rounded-2xl shadow border transition-all ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {getText('Reconciliation', 'የተያያዙ ተማሪዎች')}
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                      {stats?.matchedCount || 0}
                    </span>
                    <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      / {stats?.totalCount || 0}
                    </span>
                  </div>
                  <p className={`text-xs mt-1 text-amber-600 dark:text-amber-400 font-medium`}>
                    {stats?.unmatchedCount || 0} {getText('unmatched', 'ያልተያያዙ')}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <ClipboardDocumentCheckIcon className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className={`p-4 rounded-2xl shadow border space-y-3 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3.5 top-3.5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={getText('Search reference (FT/AWB), payer, account or SMS text...', 'ማጣቀሻ ቁጥር፣ ከፋይ ስም ወይም ሂሳብ ፈልግ...')}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-blue-500 outline-none ${
                    theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'
                  }`}
                />
              </div>

              {/* Bank Selector */}
              <select
                value={bankFilter}
                onChange={(e) => setBankFilter(e.target.value)}
                className={`px-4 py-2.5 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <option value="all">{getText('All Banks', 'ሁሉም ባንኮች')}</option>
                <option value="CBE">CBE (ንግድ ባንክ)</option>
                <option value="AWASH">Awash Bank (አዋሽ ባንክ)</option>
              </select>

              {/* Status Selector */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`px-4 py-2.5 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <option value="all">{getText('All Status', 'ሁሉም ሁኔታ')}</option>
                <option value="matched">{getText('Matched with Student', 'ከተማሪ ጋር የተያያዘ')}</option>
                <option value="unmatched">{getText('Unmatched / Pending', 'ያልተያያዘ')}</option>
              </select>

              {/* Date Filter Mode Selector */}
              <select
                value={dateFilterMode}
                onChange={(e) => setDateFilterMode(e.target.value as any)}
                className={`px-4 py-2.5 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none ${
                  dateFilterMode !== 'all'
                    ? 'border-blue-500 ring-2 ring-blue-500/20 text-blue-600 dark:text-blue-400 font-bold'
                    : theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <option value="all">{getText('All Dates', 'ሁሉም ቀናት')}</option>
                <option value="single">{getText('Specific Date', 'የተወሰነ ቀን')}</option>
                <option value="range">{getText('Date Range (From - To)', 'የቀን ክልል (ከ - እስከ)')}</option>
              </select>
            </div>

            {/* Date Inputs & Presets (Visible when single or range is selected) */}
            {dateFilterMode !== 'all' && (
              <div className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                theme === 'dark' ? 'bg-gray-700/50 border-gray-600' : 'bg-blue-50/50 border-blue-100'
              }`}>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                    <CalendarDaysIcon className="w-5 h-5 flex-shrink-0" />
                    <span>
                      {dateFilterMode === 'single'
                        ? getText('Specific Date:', 'የተወሰነ ቀን፡')
                        : getText('Date Range:', 'የቀን ክልል፡')}
                    </span>
                  </div>

                  {dateFilterMode === 'single' ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={specificDate}
                        onChange={(e) => setSpecificDate(e.target.value)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none shadow-sm ${
                          theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                        }`}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-gray-500 dark:text-gray-400 font-medium">{getText('From:', 'ከ፡')}</span>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none shadow-sm ${
                            theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                          }`}
                        />
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-gray-500 dark:text-gray-400 font-medium">{getText('To:', 'እስከ፡')}</span>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none shadow-sm ${
                            theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Date Presets */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const todayStr = new Date().toISOString().split('T')[0]
                      setDateFilterMode('single')
                      setSpecificDate(todayStr)
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm ${
                      dateFilterMode === 'single' && specificDate === new Date().toISOString().split('T')[0]
                        ? 'bg-blue-600 text-white'
                        : theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-600' : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
                    }`}
                  >
                    {getText('Today', 'ዛሬ')}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date()
                      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
                      const todayStr = now.toISOString().split('T')[0]
                      setDateFilterMode('range')
                      setStartDate(firstDay)
                      setEndDate(todayStr)
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm ${
                      dateFilterMode === 'range' && startDate && endDate
                        ? 'bg-blue-600 text-white'
                        : theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-600' : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
                    }`}
                  >
                    {getText('This Month', 'የዚህ ወር')}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDateFilterMode('all')
                      setSpecificDate('')
                      setStartDate('')
                      setEndDate('')
                    }}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition"
                  >
                    ✕ {getText('Clear', 'ሰርዝ')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Transactions Table & Mobile Cards */}
          <div className={`rounded-2xl shadow-lg border overflow-hidden ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className={`px-6 py-4 border-b flex justify-between items-center ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
              <h2 className="font-bold text-lg">
                {getText('Transactions List', 'የግብይቶች ዝርዝር')} ({totalItems})
              </h2>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-16 px-4">
                <BanknotesIcon className="w-16 h-16 mx-auto text-gray-400 mb-3 opacity-60" />
                <p className={`text-base font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  {getText('No bank transactions found', 'ምንም የባንክ ግብይቶች አልተገኙም')}
                </p>
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                  {getText('Import SMS messages manually or configure the Android webhook forwarder.', 'ኤስኤምኤስ በእጅ ያስገቡ ወይም የአንድሮይድ አስተላላፊውን ያዘጋጁ።')}
                </p>
                <button
                  type="button"
                  onClick={() => setShowImportModal(true)}
                  className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition"
                >
                  {getText('Import Sample or Real SMS', 'ኤስኤምኤስ አስገባ')}
                </button>
              </div>
            ) : (
              <>
                {/* Desktop View (xl and up) */}
                <div className="hidden xl:block overflow-x-auto w-full">
                  <table className="w-full text-left text-xs sm:text-sm table-fixed">
                    <thead className={`text-xs uppercase font-semibold border-b ${theme === 'dark' ? 'bg-gray-700/60 border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-100 text-gray-600'}`}>
                      <tr>
                        <th className="px-3.5 py-3 w-20">{getText('Bank', 'ባንክ')}</th>
                        <th className="px-3.5 py-3 w-40">{getText('Reference No.', 'የማጣቀሻ ቁጥር')}</th>
                        <th className="px-3.5 py-3 w-32">{getText('Date & Time', 'ቀን እና ሰዓት')}</th>
                        <th className="px-3.5 py-3 w-28">{getText('Amount', 'መጠን')}</th>
                        <th className="px-3.5 py-3 w-48">{getText('Payer / Sender', 'ከፋይ')}</th>
                        <th className="px-3.5 py-3">{getText('Matched Student', 'የተያያዘ ተማሪ')}</th>
                        <th className="px-3.5 py-3 text-right w-20">{getText('Actions', 'ድርጊቶች')}</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700/60' : 'divide-gray-100'}`}>
                      {transactions.map((txn) => {
                        const isCbe = txn.bank === 'CBE'
                        return (
                          <tr key={txn._id} className={`transition ${theme === 'dark' ? 'hover:bg-gray-700/40' : 'hover:bg-gray-50/70'}`}>
                            {/* Bank */}
                            <td className="px-3.5 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-black tracking-wide ${
                                isCbe ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                              }`}>
                                {txn.bank}
                              </span>
                            </td>

                            {/* Reference */}
                            <td className="px-3.5 py-3 font-mono font-semibold truncate" title={txn.reference}>
                              {txn.reference}
                            </td>

                            {/* Date */}
                            <td className="px-3.5 py-3 text-xs">
                              {new Date(txn.transactionDate).toLocaleDateString()}
                              <span className={`block text-[11px] ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                {new Date(txn.transactionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </td>

                            {/* Amount */}
                            <td className="px-3.5 py-3 font-bold text-emerald-600 dark:text-emerald-400 truncate">
                              ETB {txn.amount.toLocaleString()}
                            </td>

                            {/* Payer & Originating Bank */}
                            <td className="px-3.5 py-3">
                              <div className="font-medium truncate" title={txn.senderName || '—'}>{txn.senderName || '—'}</div>
                              {txn.sourceBank && (
                                <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5 truncate" title={`${getText('From', 'ከ')}: ${txn.sourceBank}`}>
                                  <span className="font-bold text-blue-600 dark:text-blue-400">{getText('From:', 'ከ፡')}</span>
                                  <span className="truncate">{txn.sourceBank}</span>
                                </div>
                              )}
                            </td>

                            {/* Matched Student */}
                            <td className="px-3.5 py-3">
                              {txn.matchedStudent ? (
                                <div className="flex items-center justify-between gap-2">
                                  <div
                                    className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium truncate"
                                    title={getStudentDisplayName(txn.matchedStudent, language)}
                                  >
                                    <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                                    <span className="truncate">
                                      {getStudentDisplayName(txn.matchedStudent, language)}
                                    </span>
                                    <span className="text-[11px] px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 flex-shrink-0">
                                      {txn.matchedStudent.class}
                                    </span>
                                  </div>

                                  {txn.isReconciled ? (
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                                        ✓ {getText('Paid', 'የተከፈለ')}
                                      </span>
                                      {canDo('bank-reports', 'approve') && (
                                        <button
                                          type="button"
                                          onClick={() => handleRevokeApprove(txn._id)}
                                          className="p-0.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition"
                                          title={getText('Remove approval & return to Approve', 'ማጽደቁን አንሳ')}
                                        >
                                          <XCircleIcon className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  ) : canDo('bank-reports', 'approve') ? (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenApproveModal(txn)}
                                      className="text-[11px] px-2 py-0.5 rounded-md font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition flex items-center gap-1 flex-shrink-0 shadow-sm"
                                      title={getText('Approve & record on Payment page', 'ክፍያውን አጽድቅ')}
                                    >
                                      <ClipboardDocumentCheckIcon className="w-3.5 h-3.5" />
                                      <span>{getText('Approve', 'አጽድቅ')}</span>
                                    </button>
                                  ) : null}
                                </div>
                              ) : canDo('bank-reports', 'link') ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setLinkingTxn(txn)
                                    setStudentSearch('')
                                    setSelectedStudentId('')
                                    setStudentList([])
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition"
                                >
                                  <LinkIcon className="w-3.5 h-3.5" />
                                  <span>{getText('Link', 'አያይዝ')}</span>
                                </button>
                              ) : (
                                <span className="text-xs text-amber-600/70 font-medium">
                                  {getText('Unmatched', 'ያልተያያዘ')}
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="px-3.5 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => setShowSmsModal(txn)}
                                  className={`p-1 rounded-lg transition ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
                                  title={getText('View Raw SMS', 'የኤስኤምኤስ ጽሑፍ ተመልከት')}
                                >
                                  <EyeIcon className="w-4 h-4" />
                                </button>
                                {canDo('bank-reports', 'delete') && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTransaction(txn._id, txn.reference)}
                                    className="p-1 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition"
                                    title={getText('Delete', 'ሰርዝ')}
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile & Tablet Card View (< xl) */}
                <div className="xl:hidden divide-y divide-gray-100 dark:divide-gray-700/60 w-full max-w-full overflow-hidden">
                  {transactions.map((txn) => {
                    const isCbe = txn.bank === 'CBE'
                    return (
                      <div key={txn._id} className="p-3.5 sm:p-4 space-y-2.5 w-full max-w-full overflow-hidden">
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-black flex-shrink-0 ${
                              isCbe ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                            }`}>
                              {txn.bank}
                            </span>
                            <span className="font-mono text-xs font-bold text-gray-700 dark:text-gray-300 truncate" title={txn.reference}>
                              {txn.reference}
                            </span>
                          </div>
                          <span className="font-extrabold text-sm sm:text-base text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                            ETB {txn.amount.toLocaleString()}
                          </span>
                        </div>

                        <div className="text-xs space-y-1 break-words">
                          <p><span className="text-gray-400">{getText('Payer:', 'ከፋይ፡')}</span> <span className="font-medium">{txn.senderName || '—'}</span></p>
                          {txn.sourceBank && (
                            <p><span className="text-gray-400">{getText('From:', 'ከ፡')}</span> <span className="font-semibold text-blue-600 dark:text-blue-400">{txn.sourceBank}</span></p>
                          )}
                          <p><span className="text-gray-400">{getText('Account:', 'ሂሳብ፡')}</span> <span className="font-mono">{txn.receiverAccount || '—'}</span></p>
                          <p><span className="text-gray-400">{getText('Date:', 'ቀን፡')}</span> {new Date(txn.transactionDate).toLocaleString()}</p>
                        </div>

                        <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-2">
                          {txn.matchedStudent ? (
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 min-w-0 truncate" title={getStudentDisplayName(txn.matchedStudent, language)}>
                                <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                                <span className="truncate">{getStudentDisplayName(txn.matchedStudent, language)}</span>
                              </span>
                              {txn.isReconciled ? (
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                                    ✓ {getText('Paid', 'የተከፈለ')}
                                  </span>
                                  {canDo('bank-reports', 'approve') && (
                                    <button
                                      type="button"
                                      onClick={() => handleRevokeApprove(txn._id)}
                                      className="text-[10px] px-1.5 py-0.5 rounded font-bold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800 transition"
                                    >
                                      {getText('Remove', 'አንሳ')}
                                    </button>
                                  )}
                                </div>
                              ) : canDo('bank-reports', 'approve') ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenApproveModal(txn)}
                                  className="text-[10px] px-2 py-0.5 rounded font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition flex items-center gap-1 flex-shrink-0 shadow-sm"
                                >
                                  <ClipboardDocumentCheckIcon className="w-3 h-3" />
                                  <span>{getText('Approve', 'አጽድቅ')}</span>
                                </button>
                              ) : null}
                            </div>
                          ) : canDo('bank-reports', 'link') ? (
                            <button
                              type="button"
                              onClick={() => {
                                setLinkingTxn(txn)
                                setStudentSearch('')
                                setSelectedStudentId('')
                                setStudentList([])
                              }}
                              className="text-xs px-2.5 py-1 rounded font-semibold text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300"
                            >
                              {getText('Link Student', 'ተማሪ አያይዝ')}
                            </button>
                          ) : null}

                          <div className="flex items-center gap-3 ml-auto">
                            <button
                              type="button"
                              onClick={() => setShowSmsModal(txn)}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                            >
                              <EyeIcon className="w-3.5 h-3.5" />
                              <span>{getText('SMS', 'ኤስኤምኤስ')}</span>
                            </button>
                            {canDo('bank-reports', 'delete') && (
                              <button
                                type="button"
                                onClick={() => handleDeleteTransaction(txn._id, txn.reference)}
                                className="text-xs text-red-500 hover:text-red-700 font-medium"
                              >
                                {getText('Delete', 'ሰርዝ')}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Pagination */}
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  pageSize={PAGE_SIZE}
                  onPageChange={(page) => setCurrentPage(page)}
                  itemName={{ en: 'transactions', am: 'ግብይቶች' }}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: Bank & Webhook Settings */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-2xl rounded-2xl shadow-2xl border p-6 max-h-[90vh] overflow-y-auto ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="flex justify-between items-start pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Cog6ToothIcon className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-bold">
                  {getText('Bank & Account Filter Settings', 'የባንክ እና የሂሳብ ማጣሪያ ቅንብሮች')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-6">
              {/* Explanation Banner */}
              <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
                theme === 'dark' ? 'bg-blue-950/40 border-blue-800 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-900'
              }`}>
                {getText(
                  '💡 Multiple accounts on your phone? Put your exact school account number below. The system checks every incoming SMS and IGNORES messages that belong to other personal/business accounts on that same phone number!',
                  '💡 በስልክ ቁጥርዎ ብዙ የባንክ ሂሳቦች አሉዎት? የት/ቤቱን ትክክለኛ ሂሳብ ቁጥር ከዚህ በታች ያስገቡ። ሲስተሙ የሚመጣውን እያንዳንዱን መልእክት በማረጋገጥ የሌሎች ሂሳቦችን መልእክቶች በራሱ ውድቅ ያደርጋል!'
                )}
              </div>

              {/* CBE Section */}
              <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/50 space-y-3 bg-purple-50/20">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm text-purple-700 dark:text-purple-300">
                    1. Commercial Bank of Ethiopia (CBE / ንግድ ባንክ)
                  </span>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.cbeActive}
                      onChange={(e) => setSettings({ ...settings, cbeActive: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <span>{getText('Active', 'አገልግሎት ላይ')}</span>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {getText('CBE School Account Number', 'የት/ቤት ንግድ ባንክ ሂሳብ ቁጥር')} *
                  </label>
                  <input
                    type="text"
                    value={settings.cbeAccount}
                    onChange={(e) => setSettings({ ...settings, cbeAccount: e.target.value })}
                    placeholder="e.g. 1000293847561"
                    className={`w-full px-3 py-2 rounded-lg border text-sm font-mono ${
                      theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    {getText('Only SMS with this account will be recorded. Other CBE accounts will be ignored.', 'ይህን ሂሳብ ቁጥር የያዙ ኤስኤምኤሶች ብቻ ይመዘገባሉ። ሌሎች ሂሳቦች አይመዘገቡም።')}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {getText('CBE Phone / SIM Number (Optional)', 'የንግድ ባንክ ስልክ ቁጥር')}
                  </label>
                  <input
                    type="text"
                    value={settings.cbePhone}
                    onChange={(e) => setSettings({ ...settings, cbePhone: e.target.value })}
                    placeholder="e.g. 0911223344"
                    className={`w-full px-3 py-2 rounded-lg border text-sm font-mono ${
                      theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>
              </div>

              {/* Awash Section */}
              <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 space-y-3 bg-amber-50/20">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm text-amber-700 dark:text-amber-300">
                    2. Awash Bank (አዋሽ ባንክ)
                  </span>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.awashActive}
                      onChange={(e) => setSettings({ ...settings, awashActive: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <span>{getText('Active', 'አገልግሎት ላይ')}</span>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {getText('Awash School Account Number', 'የት/ቤት አዋሽ ባንክ ሂሳብ ቁጥር')} *
                  </label>
                  <input
                    type="text"
                    value={settings.awashAccount}
                    onChange={(e) => setSettings({ ...settings, awashAccount: e.target.value })}
                    placeholder="e.g. 01320495867300"
                    className={`w-full px-3 py-2 rounded-lg border text-sm font-mono ${
                      theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    {getText('Only SMS with this account will be recorded. Other Awash accounts will be ignored.', 'ይህን ሂሳብ ቁጥር የያዙ ኤስኤምኤሶች ብቻ ይመዘገባሉ።')}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {getText('Awash Phone / SIM Number (Optional)', 'የአዋሽ ባንክ ስልክ ቁጥር')}
                  </label>
                  <input
                    type="text"
                    value={settings.awashPhone}
                    onChange={(e) => setSettings({ ...settings, awashPhone: e.target.value })}
                    placeholder="e.g. 0922334455"
                    className={`w-full px-3 py-2 rounded-lg border text-sm font-mono ${
                      theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>
              </div>

              {/* Webhook Setup Instructions */}
              <div className="p-4 rounded-xl border border-gray-300 dark:border-gray-700 space-y-3">
                <h4 className="font-bold text-sm flex items-center gap-2">
                  <span>📱</span>
                  <span>{getText('Android Auto-Forwarder Webhook Setup', 'የአንድሮይድ ስልክ ራስ-ሰር አስተላላፊ ማስተካከያ')}</span>
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {getText(
                    'Install any free Android SMS Forwarder app (e.g., SMS Forwarder / Tasker / Webhook Forwarder) on the phone that receives your CBE/Awash bank alerts. Configure it with this URL and Secret Key:',
                    'የባንክ መልእክት በሚቀበለው ስልክ ላይ SMS Forwarder መተግበሪያ በመጫን ይህንን ሊንክ እና ቁልፍ ያስገቡ፡'
                  )}
                </p>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">Webhook URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={webhookUrl}
                      className={`flex-1 px-3 py-2 rounded-lg border text-xs font-mono select-all ${
                        theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-800'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(webhookUrl, 'Webhook URL')}
                      className="px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                    >
                      {getText('Copy', 'ቅዳ')}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">Secret Key (API Key)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={settings.webhookSecret}
                      className={`flex-1 px-3 py-2 rounded-lg border text-xs font-mono select-all ${
                        theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-800'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(settings.webhookSecret, 'Secret Key')}
                      className="px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                    >
                      {getText('Copy', 'ቅዳ')}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                  theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {getText('Cancel', 'ሰርዝ')}
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition"
              >
                {savingSettings ? getText('Saving...', 'በማስቀመጥ ላይ...') : getText('Save Settings', 'ቅንብሮችን መዝግብ')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Quick SMS Paste / Import */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-2xl rounded-2xl shadow-2xl border p-6 max-h-[90vh] overflow-y-auto ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="flex justify-between items-start pb-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <PlusCircleIcon className="w-6 h-6 text-blue-600" />
                  <span>{getText('Quick SMS Import & Parse', 'የባንክ ኤስኤምኤስ ማስገቢያ')}</span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {getText('Paste one or multiple CBE or Awash Bank SMS messages to parse and record them.', 'አንድ ወይም ከዚያ በላይ የንግድ ባንክ ወይም አዋሽ ባንክ መልእክቶችን እዚህ ይለጥፉ።')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {getText('Paste SMS Message(s) Here', 'የኤስኤምኤስ ጽሑፍ እዚህ ይለጥፉ')} *
                </label>
                <textarea
                  rows={6}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={`Dear Customer, your account 1000... has been credited with ETB 3,500.00 from ABEBE KEBEDE. Ref: FT2601928374 on 02/11/2026.`}
                  className={`w-full p-3 rounded-xl border text-sm font-mono ${
                    theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  {getText('Bank Detection (Optional)', 'ባንክ መለያ (አማራጭ)')}
                </label>
                <select
                  value={importSender}
                  onChange={(e) => setImportSender(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm font-medium ${
                    theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                  }`}
                >
                  <option value="">{getText('Auto-Detect from SMS (Recommended)', 'ከመልእክቱ በራስ-ሰር ለይ (ይመረጣል)')}</option>
                  <option value="AWASH">Awash Bank (አዋሽ ባንክ)</option>
                  <option value="CBE">CBE (የኢትዮጵያ ንግድ ባንክ)</option>
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  {getText('Leave on Auto-Detect so the system detects whether it is CBE or Awash automatically.', 'ሲስተሙ የትኛው ባንክ እንደሆነ ራሱ እንዲለይ በራስ-ሰር ላይ ይተዉት።')}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  {getText('SMS / Transaction Date (Optional)', 'የተላከበት / የግብይት ቀን (አማራጭ)')}
                </label>
                <input
                  type="date"
                  value={importDate}
                  onChange={(e) => setImportDate(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${
                    theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                  }`}
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  {getText(
                    'CBE SMS messages do not print a date in the text. If you are importing a past message, choose the date here (defaults to today).',
                    'የንግድ ባንክ (CBE) መልእክቶች ቀኑን በጽሑፉ ውስጥ አያካትቱም። ያለፈ ቀን መልእክት እያስገቡ ከሆነ ቀኑን እዚህ ይምረጡ (ካልተመረጠ የዛሬ ቀን ይሆናል)።'
                  )}
                </p>
              </div>

              {/* Sample test button */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const acc = settings.cbeAccount || '1000293847561'
                    const rndRef = 'FT26' + Math.floor(10000000 + Math.random() * 90000000)
                    setImportText(`Dear Customer, your account ${acc} has been credited with ETB 4,500.00 from ABEBE KEBEDE. Ref: ${rndRef} on ${new Date().toLocaleDateString()}. Current balance is ETB 50,000.00.`)
                    setImportSender('CBE')
                  }}
                  className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
                >
                  + {getText('Load Sample CBE SMS', 'የምሳሌ ንግድ ባንክ ኤስኤምኤስ')}
                </button>
                <span className="text-gray-400">•</span>
                <button
                  type="button"
                  onClick={() => {
                    const acc = settings.awashAccount || '01320495867300'
                    const rndRef = 'AWB' + Math.floor(10000000 + Math.random() * 90000000)
                    setImportText(`Dear Customer, your A/C ${acc} has been credited with ETB 3,500.00 by ALMAZ HAILE. Txn ID: ${rndRef} on ${new Date().toLocaleDateString()}.`)
                    setImportSender('AWASH')
                  }}
                  className="text-xs text-amber-600 dark:text-amber-400 hover:underline"
                >
                  + {getText('Load Sample Awash SMS', 'የምሳሌ አዋሽ ባንክ ኤስኤምኤስ')}
                </button>
              </div>

              {/* Result Preview */}
              {importResult && (
                <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                  theme === 'dark' ? 'bg-gray-700/60 border-gray-600' : 'bg-gray-50 border-gray-200'
                }`}>
                  <p className="font-bold text-sm">
                    {getText('Import Summary', 'የማስገባት ውጤት')}:
                  </p>
                  <div className="flex gap-4">
                    <span className="text-green-600 font-bold">{importResult.saved} {getText('Saved', 'ተመዝግቧል')}</span>
                    <span className="text-gray-400">{importResult.duplicates} {getText('Duplicates', 'ድጋሚ')}</span>
                    <span className="text-amber-500 font-bold">{importResult.ignored} {getText('Ignored / Other Accounts', 'የተተወ')}</span>
                    <span className="text-red-500">{importResult.failed} {getText('Failed', 'ያልተሳካ')}</span>
                  </div>
                  {importResult.details?.map((d: any, idx: number) => (
                    <div key={idx} className="p-2 rounded bg-black/5 dark:bg-white/5 font-mono">
                      {d.success ? (
                        <span className="text-green-500">✓ {d.transaction?.bank} Ref: {d.transaction?.reference} (ETB {d.transaction?.amount})</span>
                      ) : (
                        <span className="text-amber-500">⚠ {d.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                  theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {getText('Close', 'ዝጋ')}
              </button>
              <button
                type="button"
                onClick={handleManualImport}
                disabled={importing}
                className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition"
              >
                {importing ? getText('Processing...', 'በማስገባት ላይ...') : getText('Parse & Record', 'ተንትነህ መዝግብ')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Link Student Modal */}
      {linkingTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl border p-6 ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="flex justify-between items-start pb-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <LinkIcon className="w-5 h-5 text-blue-600" />
                  <span>{getText('Link Transaction to Student', 'ግብይቱን ከተማሪ ጋር ማያያዝ')}</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Ref: <span className="font-mono font-semibold">{linkingTxn.reference}</span> • ETB {linkingTxn.amount.toLocaleString()}
                  {linkingTxn.senderName ? ` • Payer: ${linkingTxn.senderName}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLinkingTxn(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {getText('Search Student (Name, Parent, Phone, or ID)', 'ተማሪ ፈልግ (ስም፣ ወላጅ፣ ስልክ፣ ወይም መታወቂያ)')} *
                </label>
                <div className="relative">
                  <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    value={studentSearch}
                    autoFocus
                    onChange={(e) => {
                      setStudentSearch(e.target.value)
                      searchStudents(e.target.value)
                    }}
                    placeholder={getText('Type student name, father/mother name, phone, or ID...', 'የተማሪ ስም፣ የአባት/እናት ስም፣ ስልክ ወይም መታወቂያ ጻፍ...')}
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
                      theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'
                    }`}
                  />
                  {searchingStudents && (
                    <div className="absolute right-3 top-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Student Results */}
              <div className="space-y-2">
                <span className="text-xs text-gray-400 font-semibold block">
                  {getText('Search Results', 'የፍለጋ ውጤቶች')} ({studentList.length})
                </span>

                {studentList.length > 0 ? (
                  <div className={`max-h-60 overflow-y-auto rounded-xl border p-2 space-y-2 ${
                    theme === 'dark' ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-gray-50'
                  }`}>
                    {studentList.map((st) => {
                      const isSelected = selectedStudentId === st._id
                      return (
                        <div
                          key={st._id}
                          onClick={() => setSelectedStudentId(st._id)}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-400'
                              : theme === 'dark'
                              ? 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-200'
                              : 'bg-white hover:bg-blue-50/50 border-gray-200 text-gray-800'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm">
                                  {getStudentDisplayName(st, language)}
                                </span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                  isSelected
                                    ? 'bg-blue-700 text-white'
                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200'
                                }`}>
                                  {st.class} {st.section ? `- ${st.section}` : ''}
                                </span>
                              </div>
                              <p className="text-[11px] opacity-80 font-mono">
                                ID: {st.studentId || '—'}
                              </p>
                              {(st.fatherName || st.fatherPhone) && (
                                <p className="text-[11px] opacity-75">
                                  <span className="font-semibold">{getText('Father:', 'አባት፡')}</span> {st.fatherName || '—'} {st.fatherPhone ? `(${st.fatherPhone})` : ''}
                                </p>
                              )}
                              {(st.motherName || st.motherPhone) && (
                                <p className="text-[11px] opacity-75">
                                  <span className="font-semibold">{getText('Mother:', 'እናት፡')}</span> {st.motherName || '—'} {st.motherPhone ? `(${st.motherPhone})` : ''}
                                </p>
                              )}
                            </div>
                            {isSelected && (
                              <CheckCircleIcon className="w-5 h-5 text-white flex-shrink-0 ml-2" />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : studentSearch.trim().length >= 2 && !searchingStudents ? (
                  <div className="text-center py-6 px-3 border border-dashed rounded-xl border-gray-300 dark:border-gray-700">
                    <p className="text-xs text-gray-400">
                      {getText('No student found matching your search.', 'በፍለጋዎ የሚዛመድ ተማሪ አልተገኘም።')}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-6 px-3 border border-dashed rounded-xl border-gray-300 dark:border-gray-700">
                    <p className="text-xs text-gray-400">
                      {getText('Type at least 2 characters to search by name, parent, phone, or ID.', 'በስም፣ በወላጅ ስም፣ በስልክ ወይም በመታወቂያ ለመፈለግ ቢያንስ 2 ፊደል ይጻፉ።')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setLinkingTxn(null)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                  theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {getText('Cancel', 'ሰርዝ')}
              </button>
              <button
                type="button"
                onClick={handleLinkStudent}
                disabled={!selectedStudentId || linking}
                className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {linking ? getText('Linking...', 'በማያያዝ ላይ...') : getText('Confirm & Link', 'አረጋግጥና አያይዝ')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: View Raw SMS Modal */}
      {showSmsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl border p-6 ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="flex justify-between items-start pb-3 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <span>📩</span>
                  <span>{showSmsModal.bank} {getText('SMS Details', 'የኤስኤምኤስ ዝርዝር')}</span>
                </h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{showSmsModal.reference}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSmsModal(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div>
                <span className="text-gray-400 block mb-1 font-semibold">{getText('Raw SMS Message Text:', 'የመጣው ሙሉ የኤስኤምኤስ ጽሑፍ፡')}</span>
                <div className={`p-3 rounded-xl border font-mono whitespace-pre-wrap leading-relaxed ${
                  theme === 'dark' ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-800'
                }`}>
                  {showSmsModal.rawSms}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-400 block">{getText('Amount:', 'መጠን፡')}</span>
                  <span className="font-bold text-emerald-600">ETB {showSmsModal.amount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">{getText('Account:', 'ሂሳብ፡')}</span>
                  <span className="font-mono">{showSmsModal.receiverAccount || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">{getText('Payer / Sender:', 'ከፋይ፡')}</span>
                  <span className="font-medium">{showSmsModal.senderName || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">{getText('From (Originating Bank):', 'የተላከበት ባንክ / ምንጭ፡')}</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{showSmsModal.sourceBank || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">{getText('Transaction Date:', 'የግብይት ቀን፡')}</span>
                  <span>{new Date(showSmsModal.transactionDate).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">{getText('Received At:', 'የደረሰበት ሰዓት፡')}</span>
                  <span>{new Date(showSmsModal.createdAt).toLocaleString()}</span>
                </div>
                <div className="col-span-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-gray-400 block font-semibold">{getText('Matched Student:', 'የተያያዘ ተማሪ፡')}</span>
                  {showSmsModal.matchedStudent ? (
                    <div className="flex items-center gap-2 mt-1">
                      <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="font-bold text-sm text-blue-600 dark:text-blue-400">
                        {getStudentDisplayName(showSmsModal.matchedStudent, language)}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200">
                        {showSmsModal.matchedStudent.class} {showSmsModal.matchedStudent.section ? `- ${showSmsModal.matchedStudent.section}` : ''}
                      </span>
                    </div>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-medium italic mt-0.5 block">{getText('None (Unmatched)', 'ያልተያያዘ')}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
              {showSmsModal.matchedStudent ? (
                showSmsModal.isReconciled ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300 flex items-center gap-1.5">
                      <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                      <span>{getText('Approved & Recorded in Payments', 'ጸድቆ በክፍያ ዝርዝር ላይ ተመዝግቧል')}</span>
                    </span>
                    {canDo('bank-reports', 'approve') && (
                      <button
                        type="button"
                        onClick={() => handleRevokeApprove(showSmsModal._id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800 transition flex items-center gap-1"
                        title={getText('Remove approval & return to Approve', 'ማጽደቁን አንሳ')}
                      >
                        <XCircleIcon className="w-4 h-4" />
                        <span>{getText('Remove Approval', 'ማጽደቁን አንሳ')}</span>
                      </button>
                    )}
                  </div>
                ) : canDo('bank-reports', 'approve') ? (
                  <button
                    type="button"
                    onClick={() => {
                      const txn = showSmsModal
                      setShowSmsModal(null)
                      handleOpenApproveModal(txn)
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md flex items-center gap-1.5 transition"
                  >
                    <ClipboardDocumentCheckIcon className="w-4 h-4" />
                    <span>{getText('Approve & Record Payment', 'ክፍያውን አጽድቅና መዝግብ')}</span>
                  </button>
                ) : null
              ) : canDo('bank-reports', 'link') ? (
                <button
                  type="button"
                  onClick={() => {
                    const txn = showSmsModal
                    setShowSmsModal(null)
                    setLinkingTxn(txn)
                    setStudentSearch('')
                    setSelectedStudentId('')
                    setStudentList([])
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300 flex items-center gap-1.5 transition"
                >
                  <LinkIcon className="w-4 h-4" />
                  <span>{getText('Link Student to Approve', 'ለማጽደቅ ተማሪ አያይዝ')}</span>
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => setShowSmsModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                {getText('Close', 'ዝጋ')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Approve & Record Payment Modal */}
      {approvingTxn && approvingTxn.matchedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl border p-6 ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="flex justify-between items-start pb-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <ClipboardDocumentCheckIcon className="w-5 h-5" />
                  <span>{getText('Approve & Record Payment', 'ክፍያውን አጽድቅና መዝግብ')}</span>
                </h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">
                  {approvingTxn.bank} Ref: {approvingTxn.reference}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setApprovingTxn(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              {/* Linked Student Card */}
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                theme === 'dark' ? 'bg-gray-900/60 border-gray-700' : 'bg-blue-50/60 border-blue-100'
              }`}>
                <div>
                  <span className="text-[11px] text-gray-400 uppercase font-semibold block">{getText('Student:', 'ተማሪ፡')}</span>
                  <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    {getStudentDisplayName(approvingTxn.matchedStudent, language)}
                  </p>
                  <p className="text-[11px] opacity-75">
                    {approvingTxn.matchedStudent.studentId} • {approvingTxn.matchedStudent.class} {approvingTxn.matchedStudent.section ? `- ${approvingTxn.matchedStudent.section}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-gray-400 uppercase font-semibold block">{getText('Amount:', 'መጠን፡')}</span>
                  <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                    ETB {approvingTxn.amount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Academic Year */}
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {getText('Academic Year (E.C.):', 'የትምህርት ዘመን (ዓ.ም)፡')} *
                  </label>
                  <select
                    value={approveYear}
                    onChange={(e) => setApproveYear(parseInt(e.target.value))}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none ${
                      theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'
                    }`}
                  >
                    {[2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026].map(y => (
                      <option key={y} value={y}>{y} E.C.</option>
                    ))}
                  </select>
                </div>

                {/* Academic Month */}
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {getText('Academic Month:', 'የክፍያ ወር፡')} *
                  </label>
                  <select
                    value={approveMonth}
                    onChange={(e) => setApproveMonth(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none ${
                      theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'
                    }`}
                  >
                    {ETHIOPIAN_ACADEMIC_MONTHS.map(m => (
                      <option key={m.value} value={m.value}>
                        {m.value} ({m.am})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {getText('Amount (ETB):', 'መጠን (ብር)፡')} *
                  </label>
                  <input
                    type="number"
                    value={approveAmount}
                    onChange={(e) => setApproveAmount(parseFloat(e.target.value) || 0)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-500 outline-none ${
                      theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'
                    }`}
                  />
                </div>

                {/* Payment Date */}
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {getText('Payment Date:', 'የክፍያ ቀን፡')} *
                  </label>
                  <input
                    type="date"
                    value={approveDate}
                    onChange={(e) => setApproveDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none ${
                      theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'
                    }`}
                  />
                </div>
              </div>

              {/* Description / Remark */}
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {getText('Description / Remark (Optional):', 'መግለጫ / ማስታወሻ (አማራጭ)፡')}
                </label>
                <input
                  type="text"
                  value={approveDesc}
                  onChange={(e) => setApproveDesc(e.target.value)}
                  placeholder={getText('e.g. November monthly fee via CBE', 'ለምሳሌ፡ የህዳር ወር ክፍያ በንግድ ባንክ')}
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:ring-2 focus:ring-emerald-500 outline-none ${
                    theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'
                  }`}
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                <InformationCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
                <span>
                  {getText(
                    'Approving will immediately create an official Payment record in the Payments page and mark this transaction as reconciled.',
                    'ማጽደቅ በክፍያ ገጽ ላይ ኦፊሴላዊ የክፍያ መዝገብ ይፈጥራል እንዲሁም ይህንን የባንክ ግብይት የተረጋገጠ ያደርገዋል።'
                  )}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setApprovingTxn(null)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                  theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {getText('Cancel', 'ሰርዝ')}
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                disabled={approving}
                className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg disabled:opacity-50 transition flex items-center gap-2"
              >
                <ClipboardDocumentCheckIcon className="w-4 h-4" />
                <span>{approving ? getText('Recording...', 'በመመዝገብ ላይ...') : getText('Approve Payment', 'ክፍያውን አጽድቅ')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

