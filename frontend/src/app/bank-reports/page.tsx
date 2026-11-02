'use client'

import { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import Pagination from '@/components/Pagination'
import { useSettings } from '@/contexts/SettingsContext'
import axios from 'axios'
import toast from 'react-hot-toast'
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
  InformationCircleIcon
} from '@heroicons/react/24/outline'

interface Student {
  _id: string
  studentId: string
  firstName: string
  middleName: string
  lastName: string
  class: string
  section?: string
  paymentCode?: string
}

interface BankTransaction {
  _id: string
  bank: 'CBE' | 'AWASH' | 'UNKNOWN'
  reference: string
  amount: number
  currency: string
  senderName: string
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
  const { theme, getText } = useSettings()

  // Transactions State
  const [transactions, setTransactions] = useState<BankTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<BankStats | null>(null)

  // Filters State
  const [bankFilter, setBankFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
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
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)

  // Link Student State
  const [studentSearch, setStudentSearch] = useState('')
  const [studentList, setStudentList] = useState<Student[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [createPaymentRecord, setCreatePaymentRecord] = useState(true)
  const [paymentMonth, setPaymentMonth] = useState('September')
  const [paymentYear, setPaymentYear] = useState('2019')
  const [linking, setLinking] = useState(false)

  const months = ['September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May', 'June']

  // Fetch Transactions
  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/bank-transactions`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          bank: bankFilter,
          status: statusFilter,
          search: searchTerm,
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
  }, [bankFilter, statusFilter, searchTerm, currentPage, getText])

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
    if (!query || query.length < 2) {
      setStudentList([])
      return
    }
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/students`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { search: query, limit: 10 }
      })
      setStudentList(res.data.students || [])
    } catch {}
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
  }, [bankFilter, statusFilter, searchTerm])

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
        { smsText: importText, sender: importSender },
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
        {
          studentId: selectedStudentId,
          createPayment: createPaymentRecord,
          month: paymentMonth,
          year: paymentYear
        },
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

  return (
    <DashboardLayout pageTitle={getText('Bank Reports', 'የባንክ ሪፖርት')}>
      <div className={`min-h-screen p-4 sm:p-6 lg:p-8 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header */}
          <div className={`rounded-2xl p-6 shadow-lg border transition-all ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white shadow-md">
                  <BanknotesIcon className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    {getText('Bank Reports & Transactions', 'የባንክ ሪፖርቶች እና ግብይቶች')}
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
          <div className={`p-4 rounded-2xl shadow border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
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
            </div>
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
                {/* Desktop View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className={`text-xs uppercase font-semibold border-b ${theme === 'dark' ? 'bg-gray-700/60 border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-100 text-gray-600'}`}>
                      <tr>
                        <th className="px-6 py-3.5">{getText('Bank', 'ባንክ')}</th>
                        <th className="px-6 py-3.5">{getText('Reference No.', 'የማጣቀሻ ቁጥር')}</th>
                        <th className="px-6 py-3.5">{getText('Date & Time', 'ቀን እና ሰዓት')}</th>
                        <th className="px-6 py-3.5">{getText('Amount', 'መጠን')}</th>
                        <th className="px-6 py-3.5">{getText('Payer / Sender', 'ከፋይ')}</th>
                        <th className="px-6 py-3.5">{getText('Account', 'የተላከበት ሂሳብ')}</th>
                        <th className="px-6 py-3.5">{getText('Matched Student', 'የተያያዘ ተማሪ')}</th>
                        <th className="px-6 py-3.5 text-right">{getText('Actions', 'ድርጊቶች')}</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700/60' : 'divide-gray-100'}`}>
                      {transactions.map((txn) => {
                        const isCbe = txn.bank === 'CBE'
                        return (
                          <tr key={txn._id} className={`transition ${theme === 'dark' ? 'hover:bg-gray-700/40' : 'hover:bg-gray-50/70'}`}>
                            {/* Bank */}
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-black tracking-wide ${
                                isCbe ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                              }`}>
                                {txn.bank}
                              </span>
                            </td>

                            {/* Reference */}
                            <td className="px-6 py-4 font-mono font-semibold">
                              {txn.reference}
                            </td>

                            {/* Date */}
                            <td className="px-6 py-4 text-xs">
                              {new Date(txn.transactionDate).toLocaleDateString()}
                              <span className={`block text-[11px] ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                {new Date(txn.transactionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </td>

                            {/* Amount */}
                            <td className="px-6 py-4 font-bold text-emerald-600 dark:text-emerald-400">
                              ETB {txn.amount.toLocaleString()}
                            </td>

                            {/* Payer */}
                            <td className="px-6 py-4">
                              <div className="font-medium">{txn.senderName || '—'}</div>
                            </td>

                            {/* Receiver Account */}
                            <td className="px-6 py-4 font-mono text-xs text-gray-500 dark:text-gray-400">
                              {txn.receiverAccount || '—'}
                            </td>

                            {/* Matched Student */}
                            <td className="px-6 py-4">
                              {txn.matchedStudent ? (
                                <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
                                  <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                                  <span>
                                    {txn.matchedStudent.firstName} {txn.matchedStudent.lastName}
                                  </span>
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200">
                                    {txn.matchedStudent.class}
                                  </span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setLinkingTxn(txn)
                                    setStudentSearch(txn.senderName || '')
                                    if (txn.senderName) searchStudents(txn.senderName)
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition"
                                >
                                  <LinkIcon className="w-3.5 h-3.5" />
                                  <span>{getText('Link Student', 'ተማሪ አያይዝ')}</span>
                                </button>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => setShowSmsModal(txn)}
                                  className={`p-1.5 rounded-lg transition ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
                                  title={getText('View Raw SMS', 'የኤስኤምኤስ ጽሑፍ ተመልከት')}
                                >
                                  <EyeIcon className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTransaction(txn._id, txn.reference)}
                                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition"
                                  title={getText('Delete', 'ሰርዝ')}
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden divide-y divide-gray-100 dark:divide-gray-700/60">
                  {transactions.map((txn) => {
                    const isCbe = txn.bank === 'CBE'
                    return (
                      <div key={txn._id} className="p-4 space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                              isCbe ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                            }`}>
                              {txn.bank}
                            </span>
                            <span className="font-mono text-xs font-bold text-gray-600 dark:text-gray-300">
                              {txn.reference}
                            </span>
                          </div>
                          <span className="font-extrabold text-base text-emerald-600 dark:text-emerald-400">
                            ETB {txn.amount.toLocaleString()}
                          </span>
                        </div>

                        <div className="text-xs space-y-1">
                          <p><span className="text-gray-400">{getText('Payer:', 'ከፋይ፡')}</span> <span className="font-medium">{txn.senderName || '—'}</span></p>
                          <p><span className="text-gray-400">{getText('Account:', 'ሂሳብ፡')}</span> <span className="font-mono">{txn.receiverAccount || '—'}</span></p>
                          <p><span className="text-gray-400">{getText('Date:', 'ቀን፡')}</span> {new Date(txn.transactionDate).toLocaleString()}</p>
                        </div>

                        <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                          {txn.matchedStudent ? (
                            <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                              <CheckCircleIcon className="w-4 h-4 text-green-500" />
                              {txn.matchedStudent.firstName} {txn.matchedStudent.lastName}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setLinkingTxn(txn)
                                setStudentSearch(txn.senderName || '')
                                if (txn.senderName) searchStudents(txn.senderName)
                              }}
                              className="text-xs px-2.5 py-1 rounded font-semibold text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300"
                            >
                              {getText('Link Student', 'ተማሪ አያይዝ')}
                            </button>
                          )}

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setShowSmsModal(txn)}
                              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 underline"
                            >
                              {getText('SMS', 'ኤስኤምኤስ')}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTransaction(txn._id, txn.reference)}
                              className="text-xs text-red-500"
                            >
                              {getText('Delete', 'ሰርዝ')}
                            </button>
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
                  {getText('Search Student (Name or ID)', 'ተማሪ ፈልግ (ስም ወይም መታወቂያ)')} *
                </label>
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => {
                    setStudentSearch(e.target.value)
                    searchStudents(e.target.value)
                  }}
                  placeholder={getText('Type student name or ID...', 'የተማሪ ስም ወይም መታወቂያ ጻፍ...')}
                  className={`w-full px-3 py-2.5 rounded-lg border text-sm ${
                    theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
              </div>

              {/* Student Results */}
              {studentList.length > 0 && (
                <div className={`max-h-48 overflow-y-auto rounded-lg border divide-y ${
                  theme === 'dark' ? 'border-gray-700 divide-gray-700 bg-gray-700/50' : 'border-gray-200 divide-gray-100 bg-gray-50'
                }`}>
                  {studentList.map((st) => (
                    <div
                      key={st._id}
                      onClick={() => setSelectedStudentId(st._id)}
                      className={`p-3 text-xs cursor-pointer flex justify-between items-center transition ${
                        selectedStudentId === st._id
                          ? 'bg-blue-600 text-white font-bold'
                          : theme === 'dark' ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-white text-gray-800'
                      }`}
                    >
                      <div>
                        <p className="font-semibold">{st.firstName} {st.middleName} {st.lastName}</p>
                        <p className="opacity-75">{st.studentId} • {st.class} {st.section && `- ${st.section}`}</p>
                      </div>
                      {selectedStudentId === st._id && (
                        <CheckCircleIcon className="w-5 h-5 text-white" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Create Payment Option */}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createPaymentRecord}
                    onChange={(e) => setCreatePaymentRecord(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span>{getText('Also create/mark monthly fee Payment record', 'እንዲሁም የወር ክፍያ መዝገብ ይፈጠር')}</span>
                </label>

                {createPaymentRecord && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-0.5">{getText('Month', 'ወር')}</label>
                      <select
                        value={paymentMonth}
                        onChange={(e) => setPaymentMonth(e.target.value)}
                        className={`w-full px-2.5 py-1.5 rounded-lg border text-xs ${
                          theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                        }`}
                      >
                        {months.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-0.5">{getText('Year', 'አመት')}</label>
                      <select
                        value={paymentYear}
                        onChange={(e) => setPaymentYear(e.target.value)}
                        className={`w-full px-2.5 py-1.5 rounded-lg border text-xs ${
                          theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                        }`}
                      >
                        {[2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026].map(y => (
                          <option key={y} value={y}>{y} E.C.</option>
                        ))}
                      </select>
                    </div>
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
                  <span className="text-gray-400 block">{getText('Payer:', 'ከፋይ፡')}</span>
                  <span className="font-medium">{showSmsModal.senderName || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">{getText('Received At:', 'የደረሰበት ሰዓት፡')}</span>
                  <span>{new Date(showSmsModal.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setShowSmsModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700"
              >
                {getText('Close', 'ዝጋ')}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

