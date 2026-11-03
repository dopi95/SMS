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
  getCurrentEthiopianYear,
  getAcademicMonthIndex,
  getEthiopianMonthDisplay
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
  InformationCircleIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon
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
  type?: 'credit' | 'debit'
  reference: string
  receiptUrl?: string
  hasBankReference?: boolean
  amount: number
  currency: string
  senderName: string
  payerName?: string
  receiverName?: string
  sourceBank?: string
  receiverAccount: string
  senderPhone: string
  transactionDate: string
  rawSms: string
  matchedStudent?: Student | null
  matchedStudents?: Student[]
  relatedMatchesCount?: number
  status: 'unmatched' | 'matched' | 'ignored'
  isReconciled?: boolean
  createdAt: string
}

interface BankStatsBreakdown {
  totalCount?: number
  count: number
  amount: number
  creditAmount?: number
  debitAmount?: number
  creditCount?: number
  debitCount?: number
  netAmount?: number
}

interface BankStats {
  totalCount: number
  totalAmount: number
  totalCreditAmount?: number
  totalDebitAmount?: number
  creditCount?: number
  debitCount?: number
  netAmount?: number
  todayAmount?: number
  monthAmount?: number
  cbe: BankStatsBreakdown
  awash: BankStatsBreakdown
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


function getDisplayReference(txn?: BankTransaction | null): string {
  if (!txn) return '—';
  if (txn.reference && !txn.reference.startsWith('REF-') && !txn.reference.includes('WISQB')) {
    return txn.reference;
  }
  if (txn.rawSms) {
    const ftMatch = txn.rawSms.match(/\b(FT[0-9A-Za-z]{8,18})\b/i);
    if (ftMatch) return ftMatch[1].trim();
  }
  if (txn.hasBankReference === false) return '—';
  return '—';
}

function extractReceiptUrl(text?: string): string {
  if (!text) return '';
  const match = text.match(/https?:\/\/(?:apps\.cbe\.com\.et(?::\d+)?\/BranchReceipt|mbreciept\.cbe\.com\.et|awashpay\.awashbank\.com(?::\d+)?)[^\s]+/i)
    || text.match(/(?:for\s+)?Rec(?:ie|ei)pt\s*[:\s]+(https?:\/\/[^\s]+)/i)
    || text.match(/https?:\/\/[^\s]+(?:BranchReceipt|mbreciept|awashpay)[^\s]*/i)
    || text.match(/https?:\/\/(?:[a-zA-Z0-9-]+\.)*(?:cbe\.com\.et|awashbank\.com)[^\s]+/i);
  if (match) {
    const raw = (match[1] || match[0]).trim();
    if (!/shorturl|forms\.gle|survey/i.test(raw)) {
      return raw.replace(/[\.,;]+$/, '');
    }
  }
  return '';
}

function extractNamesFromSms(rawSms: string, isDebit: boolean) {
  let payer = '';
  let receiver = '';
  if (!rawSms) return { payer, receiver };

  // 1. Parentheses name after account e.g. (Dagnachew Tesfaye) or (KEBEDE ABEBE)
  const parenMatch = rawSms.match(/(?:account\s+[0-9*xX]+|payer|beneficiary|receiver|to)\s*\(([^)]+)\)/i)
    || rawSms.match(/\(([A-Za-z\s]{3,35})\)\s*(?:account|has been|\.|\s*$)/i);
  if (parenMatch) {
    const raw = parenMatch[1].trim();
    if (!/^(your|account|etb|cbe|the|awash|a\/c|birr)/i.test(raw)) {
      if (isDebit) receiver = raw;
      else payer = raw;
    }
  }

  // 2. Beneficiary in debit/transfer: 'transferred to [Name]', 'payment to [Name]', 'paid to [Name]', 'sent to [Name]', 'to [Name]'
  const toMatch = rawSms.match(/(?:transferred(?:\s+(?:ETB|Birr)?\s*[\d,]+(?:\.\d{1,2})?)?\s+to|payment to|paid to|sent to|transfer to)\s+([A-Za-z\s]{2,35}?)(?:\s*\(|\s+on|\s*\.|\s*Ref|\s*,|\s*Txn|\s*Receipt|\s+from|\s*$)/i);
  if (toMatch) {
    const raw = toMatch[1].trim();
    if (!/^(your|account|etb|cbe|the|awash|a\/c|birr)/i.test(raw)) {
      receiver = raw;
    }
  }

  // 3. Sender in credit/received: 'from [Name]', 'transferred from [Name]', 'by [Name]'
  const fromMatch = rawSms.match(/(?:from|by|payer|transferred from)\s+([A-Za-z\s]{2,35}?)(?:\s*\(|\s+on|\s*\.|\s*Ref|\s*,|\s*Txn|\s*Receipt|\s*to\s+your|\s+via|\s+from|\s*$)/i);
  if (fromMatch) {
    const raw = fromMatch[1].trim();
    if (!/^(your|account|etb|cbe|the|awash|a\/c|ips|birr)/i.test(raw)) {
      payer = raw;
    }
  }

  // 4. 'Dear [Name],' at start if not customer
  const dearMatch = rawSms.match(/^Dear\s+([A-Za-z\s]{2,35}?)(?:,|\s+your|\s+you|\s+has)/i);
  if (dearMatch) {
    const raw = dearMatch[1].trim();
    if (!/^(customer|valued customer|client|user)/i.test(raw)) {
      if (isDebit && !payer) payer = raw;
      else if (!isDebit && !receiver) receiver = raw;
    }
  }

  // 5. Fee / charge in debit
  const feeMatch = rawSms.match(/for\s+([A-Za-z\s]{3,35}?)(?:\.|\s*Ref|\s*Txn|\s*Receipt|\s*$)/i);
  if (feeMatch) {
    const raw = feeMatch[1].trim();
    if (/service|fee|charge|bill|tax|sms/i.test(raw) && !receiver) {
      receiver = raw;
    }
  }

  return { payer, receiver };
}

function getPayerName(txn?: BankTransaction | null): string {
  if (!txn) return '—';
  if (txn.payerName && txn.payerName.trim()) return txn.payerName.trim();
  if (txn.type !== 'debit') {
    if (txn.senderName && txn.senderName.trim()) return txn.senderName.trim();
    const { payer } = extractNamesFromSms(txn.rawSms || '', false);
    if (payer) return payer;
  } else {
    const { payer } = extractNamesFromSms(txn.rawSms || '', true);
    if (payer) return payer;
  }
  return '—';
}

function getReceiverName(txn?: BankTransaction | null): string {
  if (!txn) return '—';
  if (txn.receiverName && txn.receiverName.trim()) return txn.receiverName.trim();
  if (txn.type === 'debit') {
    if (txn.senderName && txn.senderName.trim()) return txn.senderName.trim();
    const { receiver } = extractNamesFromSms(txn.rawSms || '', true);
    if (receiver) return receiver;
  } else {
    const { receiver } = extractNamesFromSms(txn.rawSms || '', false);
    if (receiver) return receiver;
  }
  return '—';
}

function detectPayerBankFromSms(rawSms: string, bank?: string): string | null {
  if (!rawSms) return null;
  const text = rawSms.trim();
  const lower = text.toLowerCase();

  // 1. IPS transfer mentions: "via IPS Commercial Bank of Ethiopia", "via IPS Telebirr", etc.
  const ipsMatch = text.match(/(?:via\s+IPS\s+|from\s+IPS\s+|through\s+IPS\s+)([A-Za-z0-9\s]+?)(?:\.|\s+Your|\s+Ref|\s+Txn|\s+on|\s*$)/i);
  if (ipsMatch && ipsMatch[1]) {
    const rawLower = ipsMatch[1].trim().toLowerCase();
    if (rawLower.includes('commercial bank') || rawLower.includes('cbe')) return 'Commercial Bank of Ethiopia (CBE)';
    if (rawLower.includes('telebirr') || rawLower.includes('tele birr')) return 'Telebirr';
    if (rawLower.includes('cbe birr') || rawLower.includes('cbebirr')) return 'CBE Birr';
    if (rawLower.includes('awash')) return 'Awash Bank';
    if (rawLower.includes('dashen')) return 'Dashen Bank';
    if (rawLower.includes('abyssinia') || rawLower.includes('boa')) return 'Bank of Abyssinia';
    if (rawLower.includes('coop') || rawLower.includes('oromia')) return 'Cooperative Bank of Oromia';
    if (rawLower.includes('zemen')) return 'Zemen Bank';
    if (rawLower.includes('hibret') || rawLower.includes('united')) return 'Hibret Bank';
    if (rawLower.includes('nib')) return 'Nib International Bank';
    if (rawLower.includes('wegagen')) return 'Wegagen Bank';
    if (rawLower.includes('amhara')) return 'Amhara Bank';
    if (rawLower.includes('enat')) return 'Enat Bank';
    if (rawLower.includes('siinqee')) return 'Siinqee Bank';
    if (rawLower.includes('tsedey')) return 'Tsedey Bank';
    if (rawLower.includes('berhan')) return 'Berhan Bank';
    if (ipsMatch[1].trim().length >= 3) return ipsMatch[1].trim();
  }

  // 2. Direct payment channel mentions
  if (lower.includes('telebirr') || lower.includes('ቴሌብር') || lower.includes('tele birr')) return 'Telebirr';
  if (lower.includes('cbe birr') || lower.includes('cbebirr')) return 'CBE Birr';
  if (lower.includes('m-pesa') || lower.includes('mpesa')) return 'M-Pesa';

  // 3. Sender account numbers
  const cbeSenderAcc = text.match(/(?:from\s+(?:account|a\/c)\s+)(1[0-9*xX]{5,20})/i);
  if (cbeSenderAcc) return 'Commercial Bank of Ethiopia (CBE)';

  const awashSenderAcc = text.match(/(?:from\s+(?:account|a\/c)\s+)(01[0-9*xX]{5,20})/i);
  if (awashSenderAcc) return 'Awash Bank';

  // 4. Receipts & signatures
  if (lower.includes('mbreciept.cbe.com.et') || lower.includes('banking with cbe') || text.match(/\bFT[0-9A-Za-z]{8,18}\b/)) {
    return 'Commercial Bank of Ethiopia (CBE)';
  }
  if (lower.includes('awashpay.awashbank.com') || lower.includes('awash bank') || lower.includes('awashbank') || text.match(/\bAWB[0-9A-Za-z]{6,16}\b/)) {
    return 'Awash Bank';
  }

  // 5. Fallback based on receiving bank
  if (bank === 'CBE') return 'Commercial Bank of Ethiopia (CBE)';
  if (bank === 'AWASH') return 'Awash Bank';

  return null;
}

function getPayerTransferBank(txn?: BankTransaction | null, getTextFn?: (en: string, am: string) => string): string | null {
  if (!txn || txn.type === 'debit') {
    return null;
  }

  const unknownText = getTextFn ? getTextFn('Unknown Bank', 'ያልታወቀ ባንክ') : 'Unknown Bank';

  if (txn.sourceBank && txn.sourceBank.trim()) {
    const sb = txn.sourceBank.trim();
    const sbl = sb.toLowerCase();
    if (sbl === 'unknown' || sbl === 'unknown bank' || sbl === 'unspecified') {
      return unknownText;
    }
    return sb;
  }

  const detected = detectPayerBankFromSms(txn.rawSms || '', txn.bank);
  if (detected) {
    return detected;
  }

  return unknownText;
}

function isGenericOrUnknownPayer(name?: string | null): boolean {
  if (!name || typeof name !== 'string') return true;
  const clean = name.trim().toLowerCase();
  if (!clean || clean === '-' || clean === '—' || clean === '.' || clean === 'null' || clean === 'undefined') {
    return true;
  }
  if (clean === 'unknown' || clean === 'unknown bank' || clean === 'unknown payer' || clean === 'unknown user' || clean === 'no name' || clean === 'n/a' || clean === 'none') {
    return true;
  }
  if (clean.includes('telebirr') || clean.includes('ቴሌብር') || clean.includes('settlement')) {
    return true;
  }
  if (clean.includes('cbe birr user') || clean.includes('cbebirr user')) {
    return true;
  }
  if (clean === 'customer' || clean === 'valued customer' || clean === 'client' || clean === 'cbe-head office' || clean === 'head office') {
    return true;
  }
  return false;
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
  const [typeFilter, setTypeFilter] = useState<string>('all')
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

  // Link Student & Suggested Matches State
  const [studentSearch, setStudentSearch] = useState('')
  const [studentList, setStudentList] = useState<Student[]>([])
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([])
  const [exactMatches, setExactMatches] = useState<any[]>([])
  const [relatedMatches, setRelatedMatches] = useState<any[]>([])
  const [payerHistory, setPayerHistory] = useState<any[]>([])
  const [rememberedMapping, setRememberedMapping] = useState<any>(null)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [linking, setLinking] = useState(false)
  const [searchingStudents, setSearchingStudents] = useState(false)

  // Approval Modal State
  interface StudentApprovalItem {
    studentId: string
    student: Student
    year: number
    month: string
    amount: number
    paymentDate: string
    description: string
  }
  const [approvingTxn, setApprovingTxn] = useState<BankTransaction | null>(null)
  const [studentApprovals, setStudentApprovals] = useState<StudentApprovalItem[]>([])
  const [approveMonth, setApproveMonth] = useState<string>('')
  const [approveYear, setApproveYear] = useState<number>(2019)
  const [approveAmount, setApproveAmount] = useState<number>(0)
  const [approveDate, setApproveDate] = useState<string>('')
  const [approveDesc, setApproveDesc] = useState<string>('')
  const [approving, setApproving] = useState<boolean>(false)

  // Existing Payment Detection State
  interface ExistingPaymentRecord {
    paymentId: string
    studentId: string
    studentName: string
    month: string
    year: number
    amount: number
    paymentDate: string
    status: string
    description: string
  }
  const [existingPaymentsWarning, setExistingPaymentsWarning] = useState<ExistingPaymentRecord[]>([])
  const [showDuplicateConfirmModal, setShowDuplicateConfirmModal] = useState<boolean>(false)
  const [checkingExisting, setCheckingExisting] = useState<boolean>(false)

  // Payment History on Payments Page State
  interface StudentPaymentRecord {
    _id: string
    studentId: string
    studentName: string
    month: string
    year: number
    amount: number
    paymentDate: string
    status: string
    description: string
  }
  const [studentPaymentHistory, setStudentPaymentHistory] = useState<Record<string, StudentPaymentRecord[]>>({})
  const [loadingPaymentHistory, setLoadingPaymentHistory] = useState<boolean>(false)

  // Delete Modal State
  const [deletingTxn, setDeletingTxn] = useState<BankTransaction | null>(null)
  const [deleteWithHistory, setDeleteWithHistory] = useState<boolean>(false)
  const [deleting, setDeleting] = useState<boolean>(false)

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
          type: typeFilter !== 'all' ? typeFilter : undefined,
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
  }, [bankFilter, statusFilter, typeFilter, searchTerm, dateFilterMode, specificDate, startDate, endDate, currentPage, getText])

  // Fetch Stats dynamically based on active filters
  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const effStart = dateFilterMode === 'single' ? specificDate : dateFilterMode === 'range' ? startDate : ''
      const effEnd = dateFilterMode === 'single' ? specificDate : dateFilterMode === 'range' ? endDate : ''
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/bank-transactions/stats`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          bank: bankFilter,
          status: statusFilter,
          type: typeFilter !== 'all' ? typeFilter : undefined,
          search: searchTerm,
          startDate: effStart || undefined,
          endDate: effEnd || undefined
        }
      })
      setStats(res.data)
    } catch {}
  }, [bankFilter, statusFilter, typeFilter, searchTerm, dateFilterMode, specificDate, startDate, endDate])

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
  }, [fetchStats])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  useEffect(() => {
    setCurrentPage(1)
  }, [bankFilter, statusFilter, typeFilter, searchTerm, dateFilterMode, specificDate, startDate, endDate])

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

  // Open Review & Link Students Modal
  const handleOpenLinkModal = async (txn: BankTransaction) => {
    setLinkingTxn(txn)
    setStudentSearch('')
    setStudentList([])

    // Initial selected students: txn.matchedStudents or txn.matchedStudent
    const initial: Student[] = []
    if (txn.matchedStudents && txn.matchedStudents.length > 0) {
      initial.push(...txn.matchedStudents)
    } else if (txn.matchedStudent) {
      initial.push(txn.matchedStudent)
    }
    setSelectedStudents(initial)
    setExactMatches([])
    setRelatedMatches([])
    setPayerHistory([])
    setRememberedMapping(null)
    setLoadingSuggestions(true)

    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/bank-transactions/${txn._id}/suggested-matches`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data) {
        const exact = res.data.exactMatches || []
        const related = res.data.relatedMatches || []
        const history = res.data.payerHistory || []
        setPayerHistory(history)
        setRememberedMapping(res.data.rememberedMapping || null)

        const isGeneric = isGenericOrUnknownPayer(txn.senderName || txn.payerName)

        if (isGeneric) {
          // USER REQUIREMENT:
          // For unknown / generic payers (e.g. Telebirr User, Unknown),
          // DO NOT automatically link or select from previous history or generic matches!
          // Make suggestions only so the user can review and manually click "Select".
          setExactMatches(exact)
          setRelatedMatches(related)
          setSelectedStudents(initial)
        } else {
          // Find students from previous payment history (only for specific real persons)
          let historyStudents: Student[] = []
          for (const past of history) {
            if (past.matchedStudents && past.matchedStudents.length > 0) {
              const valids = past.matchedStudents.filter((s: any) => s && (s._id || s.firstName))
              if (valids.length > 0) {
                historyStudents = valids
                break
              }
            } else if (past.matchedStudent && (past.matchedStudent._id || past.matchedStudent.firstName)) {
              historyStudents = [past.matchedStudent]
              break
            }
          }

          // If previous payment history exists OR exact match is from remembered history:
          const hasPreviousHistory = historyStudents.length > 0 || (exact.length > 0 && exact.some((m: any) => m.isRemembered))

          if (hasPreviousHistory) {
            const autoStudents = historyStudents.length > 0 ? historyStudents : exact.map((m: any) => m.student)
            // AUTOMATICALLY SELECT THAT ONE!
            setSelectedStudents(autoStudents)
            // DO NOT SUGGEST ANY OTHER!
            setRelatedMatches([])
            setExactMatches(autoStudents.map((st: any) => ({
              student: st,
              score: 100,
              reason: getText(
                `Automatically selected from previous payment history for "${txn.senderName || ''}"`,
                `ለ"${txn.senderName || ''}" ከቀድሞ የክፍያ ታሪክ በቀጥታ የተመረጠ`
              ),
              matchType: 'exact',
              isRemembered: true
            })))
          } else {
            setExactMatches(exact)
            setRelatedMatches(related)
            if (initial.length === 0 && exact.length > 0) {
              setSelectedStudents(exact.map((m: any) => m.student))
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to fetch suggested student matches:', e)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  // Add a student to selected list
  const handleAddStudentToSelection = (student: Student) => {
    if (!student || !student._id) return
    setSelectedStudents(prev => {
      if (prev.some(s => s._id === student._id)) return prev
      return [...prev, student]
    })
  }

  // Remove a student from selected list
  const handleRemoveStudentFromSelection = (studentId: string) => {
    setSelectedStudents(prev => prev.filter(s => s._id !== studentId))
  }

  // Save Linked Students
  const handleSaveLinkedStudents = async () => {
    if (!linkingTxn) return
    setLinking(true)
    try {
      const token = localStorage.getItem('token')
      const studentIds = selectedStudents.map(s => s._id)
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/bank-transactions/${linkingTxn._id}/link-students`,
        { studentIds },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (studentIds.length === 0) {
        toast.success(getText('Transaction unlinked', 'ማያያዝ ተሰርዟል'))
      } else {
        toast.success(getText(
          `Linked ${studentIds.length} student${studentIds.length > 1 ? 's (siblings)' : ''} successfully`,
          `${studentIds.length} ተማሪ(ዎች) በተሳካ ሁኔታ ተያይዘዋል`
        ))
      }
      setLinkingTxn(null)
      setSelectedStudents([])
      setStudentList([])
      setStudentSearch('')
      fetchTransactions()
      fetchStats()
    } catch (err: any) {
      toast.error(err.response?.data?.message || getText('Failed to link students', 'ተማሪዎችን ማያያዝ አልተሳካም'))
    } finally {
      setLinking(false)
    }
  }

  // Fetch payment history from Payments page for given student IDs
  const fetchStudentPaymentHistory = async (studentIds: string[]) => {
    if (!studentIds || studentIds.length === 0) {
      setStudentPaymentHistory({})
      return
    }
    try {
      setLoadingPaymentHistory(true)
      const token = localStorage.getItem('token')
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/bank-transactions/student-payment-history`,
        {
          params: { studentIds: studentIds.join(',') },
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      if (res.data && res.data.paymentsByStudent) {
        setStudentPaymentHistory(res.data.paymentsByStudent)
      }
    } catch (err) {
      console.warn('Failed to fetch student payment history:', err)
    } finally {
      setLoadingPaymentHistory(false)
    }
  }

  // Open Approve & Record Payment Modal
  const handleOpenApproveModal = (txn: BankTransaction) => {
    setApprovingTxn(txn)
    const defMonth = getCurrentEthiopianAcademicMonth()
    const defYear = getCurrentEthiopianYear()
    const txnDateStr = txn.transactionDate
      ? new Date(txn.transactionDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
    const isAwash = txn.bank?.toUpperCase() === 'AWASH'
    const isCbe = txn.bank?.toUpperCase() === 'CBE'
    const displayRef = getDisplayReference(txn)
    const refSuffix = displayRef !== '—' ? ` (Ref: ${displayRef})` : ''
    const payerPrefix = (isCbe && txn.senderName && txn.senderName.trim())
      ? `${txn.senderName.trim()} - `
      : ''
    const defaultDesc = isAwash
      ? `Paid Via E-School Bank payment via AWASH${refSuffix}`
      : `${payerPrefix}Bank payment via ${txn.bank}${refSuffix}`

    const targets = (txn.matchedStudents && txn.matchedStudents.length > 0)
      ? txn.matchedStudents
      : txn.matchedStudent ? [txn.matchedStudent] : []

    // Fetch existing payment records from the Payments page for these students
    if (targets.length > 0) {
      fetchStudentPaymentHistory(targets.map(st => st._id))
    } else {
      setStudentPaymentHistory({})
    }

    const count = targets.length || 1
    // Automatically divide amount based on numbers of students
    const dividedAmount = Math.round((txn.amount / count) * 100) / 100

    const items: StudentApprovalItem[] = targets.map((st, idx) => ({
      studentId: st._id,
      student: st,
      year: defYear,
      month: defMonth,
      amount: dividedAmount,
      paymentDate: txnDateStr,
      description: count > 1 ? `${defaultDesc} [Sibling ${idx + 1}/${count}]` : defaultDesc
    }))

    setStudentApprovals(items)
    setApproveMonth(defMonth)
    setApproveYear(defYear)
    setApproveAmount(txn.amount)
    setApproveDate(txnDateStr)
    setApproveDesc(defaultDesc)
    setExistingPaymentsWarning([])
    setShowDuplicateConfirmModal(false)
  }

  // Check if payment already exists for student(s) in selected month & year
  const checkExistingPaymentRecords = async (items: { studentId: string; month: string; year: number }[]) => {
    if (!items || items.length === 0) {
      setExistingPaymentsWarning([])
      return []
    }
    try {
      setCheckingExisting(true)
      const token = localStorage.getItem('token')
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/bank-transactions/check-existing-payments`,
        { items },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const found: ExistingPaymentRecord[] = res.data.existing || []
      setExistingPaymentsWarning(found)
      return found
    } catch {
      return []
    } finally {
      setCheckingExisting(false)
    }
  }

  // Real-time automatic check when student approval items or their month/year change
  useEffect(() => {
    if (!approvingTxn || studentApprovals.length === 0) {
      setExistingPaymentsWarning([])
      return
    }

    const timer = setTimeout(() => {
      const items = studentApprovals.map(sa => ({
        studentId: sa.studentId,
        month: sa.month,
        year: sa.year
      }))
      checkExistingPaymentRecords(items)
    }, 250)

    return () => clearTimeout(timer)
  }, [approvingTxn, studentApprovals])

  // Confirm Approval & Record Payment
  const handleConfirmApprove = async (bypassDuplicateCheck = false) => {
    if (!approvingTxn) return

    // If duplicate check has not been bypassed, verify whether any student already has a payment recorded for this month & year
    if (!bypassDuplicateCheck) {
      const checkItems = studentApprovals.map(sa => ({
        studentId: sa.studentId,
        month: sa.month,
        year: sa.year
      }))
      const existing = await checkExistingPaymentRecords(checkItems)
      if (existing.length > 0) {
        setShowDuplicateConfirmModal(true)
        return
      }
    }

    setApproving(true)
    try {
      const token = localStorage.getItem('token')
      const targetStudentIds = (approvingTxn.matchedStudents && approvingTxn.matchedStudents.length > 0)
        ? approvingTxn.matchedStudents.map(s => s._id)
        : approvingTxn.matchedStudent ? [approvingTxn.matchedStudent._id] : []

      const payload: any = {
        month: approveMonth,
        year: approveYear,
        amount: approveAmount,
        paymentDate: approveDate,
        description: approveDesc,
        studentIds: targetStudentIds
      }

      if (studentApprovals.length > 0) {
        payload.studentPayments = studentApprovals.map(sa => ({
          studentId: sa.studentId,
          year: sa.year,
          month: sa.month,
          amount: sa.amount,
          paymentDate: sa.paymentDate,
          description: sa.description
        }))
      }

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/bank-transactions/${approvingTxn._id}/approve-payment`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success(getText('Payment approved and recorded on the Payments page!', 'ክፍያው ጸድቆ በክፍያ ገጽ ላይ በተሳካ ሁኔታ ተመዝግቧል!'))

      // Update local transaction state
      setTransactions(prev => prev.map(t => t._id === approvingTxn._id ? { ...t, isReconciled: true } : t))
      if (showSmsModal && showSmsModal._id === approvingTxn._id) {
        setShowSmsModal(prev => prev ? { ...prev, isReconciled: true } : null)
      }
      setShowDuplicateConfirmModal(false)
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

  // Open Delete Modal
  const handleOpenDeleteModal = (txn: BankTransaction) => {
    setDeletingTxn(txn)
    setDeleteWithHistory(false)
  }

  // Confirm Delete Transaction
  const handleConfirmDelete = async () => {
    if (!deletingTxn) return
    setDeleting(true)
    try {
      const token = localStorage.getItem('token')
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/bank-transactions/${deletingTxn._id}?removeHistory=${deleteWithHistory}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success(getText(
        deleteWithHistory
          ? 'Transaction deleted and payer link history removed'
          : 'Transaction deleted (link history preserved)',
        deleteWithHistory
          ? 'ግብይቱ ተሰርዟል እንዲሁም የከፋዩ የትስስር ታሪክ ተሰርዟል'
          : 'ግብይቱ ተሰርዟል (የትስስር ታሪክ ተጠብቆ ቆይቷል)'
      ))
      setDeletingTxn(null)
      fetchTransactions()
      fetchStats()
    } catch (err: any) {
      toast.error(err.response?.data?.message || getText('Failed to delete transaction', 'ግብይቱን መሰረዝ አልተሳካም'))
    } finally {
      setDeleting(false)
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
            {/* Total Overview */}
            <div
              onClick={() => { setBankFilter('all'); setCurrentPage(1); }}
              className={`p-5 rounded-2xl shadow border transition-all cursor-pointer ${
                bankFilter === 'all'
                  ? 'ring-2 ring-blue-500/70 border-blue-400'
                  : theme === 'dark' ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-100 hover:border-gray-300'
              } ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
              title={getText('Click to show all banks', 'ሁሉንም ባንኮች ለማሳየት ጠቅ ያድርጉ')}
            >
              <div className="flex justify-between items-start">
                <div className="w-full">
                  <div className="flex items-center justify-between">
                    <p className={`text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {getText('Total Overview', 'ጠቅላላ አጠቃላይ')}
                    </p>
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      {stats?.totalCount || 0} {getText('txns', 'ግብይቶች')}
                    </span>
                  </div>

                  {/* Net Amount */}
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className={`text-2xl font-black tracking-tight ${
                      (stats?.netAmount ?? ((stats?.totalCreditAmount ?? stats?.totalAmount ?? 0) - (stats?.totalDebitAmount || 0))) >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      ETB {(stats?.netAmount ?? ((stats?.totalCreditAmount ?? stats?.totalAmount ?? 0) - (stats?.totalDebitAmount || 0))).toLocaleString()}
                    </span>
                    <span className={`text-[11px] font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      ({getText('Net', 'ተጣራ')})
                    </span>
                  </div>

                  {/* Breakdown: Credit & Debit */}
                  <div className={`mt-3 pt-2.5 border-t space-y-1.5 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <span className="text-sm font-bold">↓</span>
                        <span>{getText('Credit:', 'ገቢ፡')}</span>
                      </span>
                      <div className="text-right">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          + ETB {(stats?.totalCreditAmount ?? stats?.totalAmount ?? 0).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-gray-400 ml-1">
                          ({stats?.creditCount ?? stats?.totalCount ?? 0})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
                        <span className="text-sm font-bold">↑</span>
                        <span>{getText('Debit:', 'ወጪ፡')}</span>
                      </span>
                      <div className="text-right">
                        <span className="font-bold text-red-600 dark:text-red-400">
                          - ETB {(stats?.totalDebitAmount || 0).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-gray-400 ml-1">
                          ({stats?.debitCount || 0})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CBE Stats */}
            <div
              onClick={() => { setBankFilter(bankFilter === 'CBE' ? 'all' : 'CBE'); setCurrentPage(1); }}
              className={`p-5 rounded-2xl shadow border transition-all cursor-pointer ${
                bankFilter === 'CBE'
                  ? 'ring-2 ring-purple-500/70 border-purple-400'
                  : theme === 'dark' ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-100 hover:border-gray-300'
              } ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
              title={getText('Click to filter by CBE', 'በንግድ ባንክ ብቻ ለማጣራት ጠቅ ያድርጉ')}
            >
              <div className="flex justify-between items-start">
                <div className="w-full">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                      <p className={`text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        CBE ({getText('ንግድ ባንክ', 'ንግድ ባንክ')})
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-purple-500/10 text-purple-600 dark:text-purple-400">
                      {stats?.cbe?.totalCount ?? stats?.cbe?.count ?? 0} {getText('txns', 'ግብይቶች')}
                    </span>
                  </div>

                  {/* Net Amount */}
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className={`text-2xl font-black tracking-tight ${
                      ((stats?.cbe?.netAmount ?? ((stats?.cbe?.creditAmount ?? stats?.cbe?.amount ?? 0) - (stats?.cbe?.debitAmount || 0))) >= 0)
                        ? 'text-purple-600 dark:text-purple-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      ETB {(stats?.cbe?.netAmount ?? ((stats?.cbe?.creditAmount ?? stats?.cbe?.amount ?? 0) - (stats?.cbe?.debitAmount || 0))).toLocaleString()}
                    </span>
                    <span className={`text-[11px] font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      ({getText('Net', 'ተጣራ')})
                    </span>
                  </div>

                  {/* Breakdown: CBE Credit & Debit */}
                  <div className={`mt-3 pt-2.5 border-t space-y-1.5 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <span className="text-sm font-bold">↓</span>
                        <span>{getText('Credit:', 'ገቢ፡')}</span>
                      </span>
                      <div className="text-right">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          + ETB {(stats?.cbe?.creditAmount ?? stats?.cbe?.amount ?? 0).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-gray-400 ml-1">
                          ({stats?.cbe?.creditCount ?? stats?.cbe?.count ?? 0})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
                        <span className="text-sm font-bold">↑</span>
                        <span>{getText('Debit:', 'ወጪ፡')}</span>
                      </span>
                      <div className="text-right">
                        <span className="font-bold text-red-600 dark:text-red-400">
                          - ETB {(stats?.cbe?.debitAmount || 0).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-gray-400 ml-1">
                          ({stats?.cbe?.debitCount || 0})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Awash Stats */}
            <div
              onClick={() => { setBankFilter(bankFilter === 'AWASH' ? 'all' : 'AWASH'); setCurrentPage(1); }}
              className={`p-5 rounded-2xl shadow border transition-all cursor-pointer ${
                bankFilter === 'AWASH'
                  ? 'ring-2 ring-amber-500/70 border-amber-400'
                  : theme === 'dark' ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-100 hover:border-gray-300'
              } ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
              title={getText('Click to filter by Awash', 'በአዋሽ ባንክ ብቻ ለማጣራት ጠቅ ያድርጉ')}
            >
              <div className="flex justify-between items-start">
                <div className="w-full">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      <p className={`text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        Awash ({getText('አዋሽ ባንክ', 'አዋሽ ባንክ')})
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      {stats?.awash?.totalCount ?? stats?.awash?.count ?? 0} {getText('txns', 'ግብይቶች')}
                    </span>
                  </div>

                  {/* Net Amount */}
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className={`text-2xl font-black tracking-tight ${
                      ((stats?.awash?.netAmount ?? ((stats?.awash?.creditAmount ?? stats?.awash?.amount ?? 0) - (stats?.awash?.debitAmount || 0))) >= 0)
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      ETB {(stats?.awash?.netAmount ?? ((stats?.awash?.creditAmount ?? stats?.awash?.amount ?? 0) - (stats?.awash?.debitAmount || 0))).toLocaleString()}
                    </span>
                    <span className={`text-[11px] font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      ({getText('Net', 'ተጣራ')})
                    </span>
                  </div>

                  {/* Breakdown: Awash Credit & Debit */}
                  <div className={`mt-3 pt-2.5 border-t space-y-1.5 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <span className="text-sm font-bold">↓</span>
                        <span>{getText('Credit:', 'ገቢ፡')}</span>
                      </span>
                      <div className="text-right">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          + ETB {(stats?.awash?.creditAmount ?? stats?.awash?.amount ?? 0).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-gray-400 ml-1">
                          ({stats?.awash?.creditCount ?? stats?.awash?.count ?? 0})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
                        <span className="text-sm font-bold">↑</span>
                        <span>{getText('Debit:', 'ወጪ፡')}</span>
                      </span>
                      <div className="text-right">
                        <span className="font-bold text-red-600 dark:text-red-400">
                          - ETB {(stats?.awash?.debitAmount || 0).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-gray-400 ml-1">
                          ({stats?.awash?.debitCount || 0})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Reconciliation Status */}
            <div className={`p-5 rounded-2xl shadow border transition-all ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
              <div className="flex justify-between items-start">
                <div className="w-full">
                  <div className="flex items-center justify-between">
                    <p className={`text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {getText('Reconciliation', 'የተያያዙ ተማሪዎች')}
                    </p>
                    <div className="p-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      <ClipboardDocumentCheckIcon className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                      {stats?.matchedCount || 0}
                    </span>
                    <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      / {stats?.creditCount ?? stats?.totalCount ?? 0} {getText('credits', 'ገቢዎች')}
                    </span>
                  </div>

                  <div className={`mt-3 pt-2.5 border-t flex items-center justify-between text-xs ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      {stats?.unmatchedCount || 0} {getText('unmatched', 'ያልተያያዙ')}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {stats?.debitCount ? `${stats.debitCount} debits excluded` : ''}
                    </span>
                  </div>
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

              {/* Transaction Type Selector (Credit / Debit) */}
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
                className={`px-4 py-2.5 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <option value="all">{getText('All Types', 'ሁሉም አይነት')}</option>
                <option value="credit">{getText('Credit (ገቢ)', 'ገቢ (Credit)')}</option>
                <option value="debit">{getText('Debit (ወጪ)', 'ወጪ (Debit)')}</option>
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
                        <th className="px-3.5 py-3 w-48">{getText('Payer Name', 'የከፋይ ስም')}</th>
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
                            <td className="px-3.5 py-3 font-mono font-semibold truncate" title={getDisplayReference(txn)}>
                              {(() => {
                                const displayRef = getDisplayReference(txn)
                                const receipt = txn.receiptUrl || extractReceiptUrl(txn.rawSms)
                                if (receipt && displayRef !== '—') {
                                  return (
                                    <a
                                      href={receipt}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline inline-flex items-center gap-1 group font-mono font-semibold truncate"
                                      title={getText('Open Official Receipt', 'ይፋዊ ደረሰኝ ክፈት')}
                                    >
                                      <span className="truncate">{displayRef}</span>
                                      <span className="text-[11px] opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0">↗</span>
                                    </a>
                                  )
                                }
                                return (
                                  <span className={displayRef === '—' ? 'text-gray-400 font-normal' : ''}>
                                    {displayRef}
                                  </span>
                                )
                              })()}
                            </td>

                            {/* Date */}
                            <td className="px-3.5 py-3 text-xs">
                              {new Date(txn.transactionDate).toLocaleDateString()}
                              <span className={`block text-[11px] ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                {new Date(txn.transactionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </td>

                            {/* Amount */}
                            <td className="px-3.5 py-3 truncate">
                              {txn.type === 'debit' ? (
                                <div className="flex flex-col">
                                  <span className="font-bold text-red-600 dark:text-red-400">
                                    - ETB {txn.amount.toLocaleString()}
                                  </span>
                                  <span className="inline-block mt-0.5 px-1.5 py-0.2 text-[10px] font-bold rounded bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 w-fit">
                                    {getText('Debit', 'ወጪ')}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex flex-col">
                                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                    + ETB {txn.amount.toLocaleString()}
                                  </span>
                                  <span className="inline-block mt-0.5 px-1.5 py-0.2 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 w-fit">
                                    {getText('Credit', 'ገቢ')}
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* Payer & Originating Bank */}
                            <td className="px-3.5 py-3">
                              <div className="font-medium truncate" title={getPayerName(txn)}>
                                {getPayerName(txn)}
                              </div>
                              {getPayerTransferBank(txn, getText) && (
                                <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5 truncate" title={`${getText('From', 'ከ')}: ${getPayerTransferBank(txn, getText)}`}>
                                  <span className="font-bold text-blue-600 dark:text-blue-400">{getText('From:', 'ከ፡')}</span>
                                  <span className={`truncate ${getPayerTransferBank(txn, getText) === getText('Unknown Bank', 'ያልታወቀ ባንክ') ? 'italic opacity-80' : ''}`}>
                                    {getPayerTransferBank(txn, getText)}
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* Matched Student */}
                            <td className="px-3.5 py-3">
                              {txn.type === 'debit' ? (
                                <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 italic">
                                  <span>—</span>
                                  <span>{getText('Debit (No Link)', 'የወጪ ሂሳብ (ማያያዝ አያስፈልግም)')}</span>
                                </span>
                              ) : (txn.matchedStudents && txn.matchedStudents.length > 1) ? (
                                <div className="flex items-center justify-between gap-2">
                                  <div
                                    onClick={() => handleOpenLinkModal(txn)}
                                    className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium truncate cursor-pointer hover:underline"
                                    title={txn.matchedStudents.map(s => getStudentDisplayName(s, language)).join(', ')}
                                  >
                                    <CheckCircleIcon className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                    <span className="truncate font-bold">
                                      {txn.matchedStudents.map(s => s.firstName).join(' & ')} ({txn.matchedStudents[0]?.middleName || ''})
                                    </span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 flex-shrink-0">
                                      {txn.matchedStudents.length} {getText('Siblings', 'ወንድማማቾች')}
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
                                      title={getText('Approve & record payments', 'ክፍያዎችን አጽድቅ')}
                                    >
                                      <ClipboardDocumentCheckIcon className="w-3.5 h-3.5" />
                                      <span>{getText('Approve', 'አጽድቅ')}</span>
                                    </button>
                                  ) : null}
                                </div>
                              ) : txn.matchedStudent ? (
                                <div className="flex items-center justify-between gap-2">
                                  <div
                                    onClick={() => handleOpenLinkModal(txn)}
                                    className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium truncate cursor-pointer hover:underline"
                                    title={getStudentDisplayName(txn.matchedStudent, language)}
                                  >
                                    <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                                    <span className="truncate font-bold">
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
                                  onClick={() => handleOpenLinkModal(txn)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition"
                                >
                                  <LinkIcon className="w-3.5 h-3.5" />
                                  <span>{getText('Link', 'አያይዝ')}</span>
                                  {txn.relatedMatchesCount && txn.relatedMatchesCount > 0 ? (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 font-bold">
                                      {txn.relatedMatchesCount} {getText('suggested', 'ተቀራራቢ')}
                                    </span>
                                  ) : null}
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
                                    onClick={() => handleOpenDeleteModal(txn)}
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
                            {(() => {
                              const displayRef = getDisplayReference(txn)
                              const receipt = txn.receiptUrl || extractReceiptUrl(txn.rawSms)
                              if (receipt && displayRef !== '—') {
                                return (
                                  <a
                                    href={receipt}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline truncate inline-flex items-center gap-0.5"
                                    title={getText('Open Official Receipt', 'ይፋዊ ደረሰኝ ክፈት')}
                                  >
                                    <span className="truncate">{displayRef}</span>
                                    <span className="text-[10px] opacity-70 flex-shrink-0">↗</span>
                                  </a>
                                )
                              }
                              return (
                                <span className="font-mono text-xs font-bold text-gray-700 dark:text-gray-300 truncate" title={displayRef}>
                                  {displayRef}
                                </span>
                              )
                            })()}
                            {txn.type === 'debit' && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">
                                {getText('Debit', 'ወጪ')}
                              </span>
                            )}
                          </div>
                          <span className={`font-extrabold text-sm sm:text-base flex-shrink-0 ${
                            txn.type === 'debit' ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {txn.type === 'debit' ? '- ' : '+ '}ETB {txn.amount.toLocaleString()}
                          </span>
                        </div>

                        <div className="text-xs space-y-1 break-words">
                          <p>
                            <span className="text-gray-400">
                              {getText('Payer Name:', 'የከፋይ ስም፡')}
                            </span>{' '}
                            <span className="font-medium">
                              {getPayerName(txn)}
                            </span>
                          </p>
                          {getPayerTransferBank(txn, getText) && (
                            <p>
                              <span className="text-gray-400">{getText('From:', 'ከ፡')}</span>{' '}
                              <span className={`font-semibold ${getPayerTransferBank(txn, getText) === getText('Unknown Bank', 'ያልታወቀ ባንክ') ? 'italic opacity-80' : 'text-blue-600 dark:text-blue-400'}`}>
                                {getPayerTransferBank(txn, getText)}
                              </span>
                            </p>
                          )}
                          <p><span className="text-gray-400">{getText('Account:', 'ሂሳብ፡')}</span> <span className="font-mono">{txn.receiverAccount || '—'}</span></p>
                          <p><span className="text-gray-400">{getText('Date:', 'ቀን፡')}</span> {new Date(txn.transactionDate).toLocaleString()}</p>
                        </div>

                        <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-2">
                          {txn.type === 'debit' ? (
                            <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                              {getText('Debit (No Link)', 'የወጪ ሂሳብ (ማያያዝ አያስፈልግም)')}
                            </span>
                          ) : (txn.matchedStudents && txn.matchedStudents.length > 1) ? (
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                onClick={() => handleOpenLinkModal(txn)}
                                className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 min-w-0 truncate cursor-pointer"
                                title={txn.matchedStudents.map(s => getStudentDisplayName(s, language)).join(', ')}
                              >
                                <CheckCircleIcon className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                <span className="truncate">{txn.matchedStudents.map(s => s.firstName).join(' & ')} ({txn.matchedStudents.length} {getText('Siblings', 'ወንድማማቾች')})</span>
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
                          ) : txn.matchedStudent ? (
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                onClick={() => handleOpenLinkModal(txn)}
                                className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 min-w-0 truncate cursor-pointer"
                                title={getStudentDisplayName(txn.matchedStudent, language)}
                              >
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
                              onClick={() => handleOpenLinkModal(txn)}
                              className="text-xs px-2.5 py-1 rounded font-semibold text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300 flex items-center gap-1"
                            >
                              <span>{getText('Link', 'አያይዝ')}</span>
                              {txn.relatedMatchesCount && txn.relatedMatchesCount > 0 ? (
                                <span className="text-[10px] px-1 py-0.2 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 font-bold">
                                  {txn.relatedMatchesCount}
                                </span>
                              ) : null}
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
                                onClick={() => handleOpenDeleteModal(txn)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-2xl rounded-2xl shadow-2xl border p-3.5 sm:p-6 max-h-[94vh] sm:max-h-[90vh] overflow-y-auto ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="flex justify-between items-start pb-3 sm:pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                <Cog6ToothIcon className="w-6 h-6 text-blue-600 flex-shrink-0" />
                <h3 className="text-lg sm:text-xl font-bold truncate">
                  {getText('Bank & Account Filter Settings', 'የባንክ እና የሂሳብ ማጣሪያ ቅንብሮች')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 flex-shrink-0"
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

                {/* BlueLight Official Android Sync App Download Card */}
                <div className={`p-4 rounded-xl border mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  theme === 'dark' ? 'bg-blue-950/30 border-blue-800' : 'bg-blue-50/80 border-blue-200'
                }`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                      <span className="text-base">📱</span>
                      <span>{getText('Official Android Auto-Sync App (APK)', 'ይፋዊ የአንድሮይድ አውቶ-ሲንክ መተግበሪያ (APK)')}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                      {getText(
                        'Install directly on your Android phone. Syncs CBE & Awash bank SMS 24/7 automatically in all conditions (works offline with auto-retry and auto-starts on boot). Pre-configured with your webhook URL & secret key!',
                        'በቀጥታ በአንድሮይድ ስልክዎ ላይ ይጫኑ። በማንኛውም ሁኔታ (ኢንተርኔት በማይኖርበት ጊዜ አስቀምጦ ኢንተርኔት ሲመጣ በራሱ ወዲያውኑ ይልካል፣ ስልኩ ጠፍቶ ሲበራም በራሱ ይጀምራል)። የዌብሁክ ሊንኩና የይለፍ ቁጥሩ አስቀድሞ ተዘጋጅቶበታል!'
                      )}
                    </p>
                  </div>
                  <a
                    href="/BlueLight-SMS-Sync.apk"
                    download="BlueLight-SMS-Sync.apk"
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md flex items-center justify-center gap-2 flex-shrink-0 transition"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    <span>{getText('Download App (APK)', 'መተግበሪያውን አውርድ (APK)')}</span>
                  </a>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold text-center ${
                  theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {getText('Cancel', 'ሰርዝ')}
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="w-full sm:w-auto px-5 py-2.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition text-center"
              >
                {savingSettings ? getText('Saving...', 'በማስቀመጥ ላይ...') : getText('Save Settings', 'ቅንብሮችን መዝግብ')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Quick SMS Paste / Import */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-2xl rounded-2xl shadow-2xl border p-3.5 sm:p-6 max-h-[94vh] sm:max-h-[90vh] overflow-y-auto ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="flex justify-between items-start pb-3 sm:pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="min-w-0 flex-1 pr-2">
                <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  <PlusCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
                  <span className="truncate">{getText('Quick SMS Import & Parse', 'የባንክ ኤስኤምኤስ ማስገቢያ')}</span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                  {getText('Paste one or multiple CBE or Awash Bank SMS messages to parse and record them.', 'አንድ ወይም ከዚያ በላይ የንግድ ባንክ ወይም አዋሽ ባንክ መልእክቶችን እዚህ ይለጥፉ።')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 flex-shrink-0"
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

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold text-center ${
                  theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {getText('Close', 'ዝጋ')}
              </button>
              <button
                type="button"
                onClick={handleManualImport}
                disabled={importing}
                className="w-full sm:w-auto px-5 py-2.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition text-center"
              >
                {importing ? getText('Processing...', 'በማስገባት ላይ...') : getText('Parse & Record', 'ተንትነህ መዝግብ')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Review & Link Students Modal */}
      {linkingTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-2xl max-h-[94vh] sm:max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border p-3.5 sm:p-6 ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            {/* Header */}
            <div className="flex justify-between items-start pb-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="min-w-0 flex-1 pr-2">
                <h3 className="text-base sm:text-xl font-bold flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <LinkIcon className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                  <span className="truncate">{getText('Review & Link Student(s)', 'ተማሪዎችን ይገምግሙና ያያይዙ')}</span>
                </h3>
                <div className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-1.5 sm:gap-2 break-words">
                  <span>
                    {linkingTxn.bank} Ref:{' '}
                    {(() => {
                      const displayRef = getDisplayReference(linkingTxn)
                      const receipt = linkingTxn.receiptUrl || extractReceiptUrl(linkingTxn.rawSms)
                      if (receipt && displayRef !== '—') {
                        return (
                          <a
                            href={receipt}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-blue-600 dark:text-blue-400 hover:underline font-bold"
                            title={getText('Open Official Receipt', 'ይፋዊ ደረሰኝ ክፈት')}
                          >
                            {displayRef} ↗
                          </a>
                        )
                      }
                      return <strong className="font-mono text-gray-700 dark:text-gray-300 break-all">{displayRef}</strong>
                    })()}
                  </span>
                  <span>•</span>
                  <span>Amount: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">ETB {linkingTxn.amount.toLocaleString()}</strong></span>
                  {linkingTxn.senderName && (
                    <>
                      <span>•</span>
                      <span className="break-words">Payer: <strong className="text-blue-600 dark:text-blue-400 font-semibold">{linkingTxn.senderName}</strong></span>
                    </>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLinkingTxn(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg flex-shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="py-3 sm:py-4 space-y-3 sm:space-y-4 overflow-y-auto flex-1 pr-1 text-xs min-h-0">
              {/* Remembered Payer Association Banner */}
              {rememberedMapping && (
                <div className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 ${
                  theme === 'dark' ? 'bg-purple-950/40 border-purple-800 text-purple-200' : 'bg-purple-50 border-purple-200 text-purple-900'
                }`}>
                  <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                    <span className="text-xl flex-shrink-0">🔒</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs">
                        {getText('Exact Previous Link Found', 'ትክክለኛ የቀድሞ ትስስር ተገኝቷል')}
                      </p>
                      <p className="text-[11px] opacity-80 mt-0.5 break-words">
                        {getText(
                          `This exact payer (${rememberedMapping.payerName}) was previously linked or paid. Exactly linked to that previous transaction link (no other suggestions shown).`,
                          `ይህ ከፋይ (${rememberedMapping.payerName}) ቀደም ሲል የተያያዘ/የከፈለ በመሆኑ በቀጥታ ከዛኑ ተማሪ ጋር ተያይዟል (ሌላ አማራጭ አልቀረበም)።`
                        )}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-200 text-purple-800 dark:bg-purple-800 dark:text-purple-200 flex-shrink-0 self-start sm:self-auto">
                    {rememberedMapping.linkCount}x {getText('linked', 'ተያይዟል')}
                  </span>
                </div>
              )}

              {/* SECTION 1: Selected Students to Link */}
              <div className={`p-3 sm:p-3.5 rounded-xl border ${
                selectedStudents.length > 0
                  ? theme === 'dark' ? 'bg-blue-950/30 border-blue-800' : 'bg-blue-50/70 border-blue-200'
                  : theme === 'dark' ? 'bg-gray-900/40 border-gray-700' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
                  <span className="font-bold text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <span>✓</span>
                    <span>{getText('Currently Selected for this Transaction:', 'ለዚህ ግብይት የተመረጡ ተማሪዎች፡')}</span>
                    <span className="px-2 py-0.2 rounded-full font-extrabold text-[11px] bg-blue-600 text-white ml-1">
                      {selectedStudents.length}
                    </span>
                  </span>
                  {selectedStudents.length > 1 && (
                    <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                      ({selectedStudents.length} {getText('Siblings / ወንድማማቾች', 'ወንድማማቾች')})
                    </span>
                  )}
                </div>

                {selectedStudents.length > 0 ? (
                  <div className="space-y-2">
                    {selectedStudents.map((st) => (
                      <div
                        key={st._id}
                        className={`p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 ${
                          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-blue-100 shadow-sm'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <span className="font-bold text-sm text-blue-600 dark:text-blue-400 break-words">
                              {getStudentDisplayName(st, language)}
                            </span>
                            <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 flex-shrink-0">
                              {st.class} {st.section ? `- ${st.section}` : ''}
                            </span>
                            <span className="text-[10px] font-mono text-gray-400 flex-shrink-0">
                              ID: {st.studentId || '—'}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                            {st.fatherName && <span className="break-words"><strong className="text-gray-400">{getText('Father:', 'አባት፡')}</strong> {st.fatherName}</span>}
                            {st.motherName && <span className="break-words"><strong className="text-gray-400">{getText('Mother:', 'እናት፡')}</strong> {st.motherName}</span>}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveStudentFromSelection(st._id)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800 transition flex items-center justify-center gap-1 flex-shrink-0 w-full sm:w-auto"
                          title={getText('Remove from selection', 'ከምርጫው አስወግድ')}
                        >
                          <XCircleIcon className="w-3.5 h-3.5" />
                          <span>{getText('Remove', 'አስወግድ')}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 italic text-xs py-1">
                    {getText(
                      'No students currently selected. Please select from exact matches, related suggestions below, or search.',
                      'ምንም ተማሪ አልተመረጠም። ከዚህ በታች ካሉት ተመሳሳይ ወይም ተቀራራቢ ስሞች ይምረጡ ወይም ፈልገው ያክሉ።'
                    )}
                  </p>
                )}
              </div>

              {/* Loading Suggestions Indicator */}
              {loadingSuggestions && (
                <div className="p-4 rounded-xl border border-dashed flex items-center justify-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>{getText('Analyzing payer name & searching siblings / related students...', 'ከፋዩን ከተማሪዎችና ወላጆች ስም ጋር በማነጻጸር ላይ...')}</span>
                </div>
              )}

              {/* Generic / Unknown Payer Notice Banner */}
              {!loadingSuggestions && linkingTxn && isGenericOrUnknownPayer(linkingTxn.senderName || linkingTxn.payerName) && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">💡</span>
                    <div>
                      <p className="font-bold">
                        {getText(
                          'Generic or Unknown Payer (e.g. Telebirr User) — Showing suggestions only',
                          'ያልታወቀ ወይም አጠቃላይ ከፋይ (ለምሳሌ የቴሌብር ተጠቃሚ) — ጥቆማዎች ብቻ ቀርበዋል'
                        )}
                      </p>
                      <p className="text-[11px] opacity-80 mt-0.5">
                        {getText(
                          'Transactions from unknown payers are not auto-linked to avoid mixing students. Please review the suggestions below or search to select manually.',
                          'ተማሪዎች እንዳይደባለቁ ከማይታወቁ ከፋዮች የሚመጡ ክፍያዎች በራስ-ሰር አይያያዙም። እባክዎ ከዚህ በታች ያሉትን ጥቆማዎች ገምግመው በእጅ ይምረጡ።'
                        )}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 flex-shrink-0">
                    {getText('Manual Review', 'በእጅ መገምገም')}
                  </span>
                </div>
              )}

              {/* Remembered / Previous Link Info Banner */}
              {!loadingSuggestions && exactMatches.some(m => m.isRemembered) && (
                <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 text-xs flex items-center justify-between animate-fade-in">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📜</span>
                    <div>
                      <p className="font-bold">
                        {getText(
                          'Previous payment link found for this payer — automatically selected!',
                          'ለዚህ ከፋይ የቀድሞ የክፍያ ትስስር ተገኝቷል — በራስ-ሰር ተመርጧል!'
                        )}
                      </p>
                      <p className="text-[11px] opacity-80 mt-0.5">
                        {getText(
                          'Other suggestions are hidden to preserve your exact link history.',
                          'የትስስር ታሪክ እንዳይዛባ ሌሎች አማራጮች ተደብቀዋል።'
                        )}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-200 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-200 flex-shrink-0">
                    {getText('Auto Selected', 'በራስ-ሰር ተመርጧል')}
                  </span>
                </div>
              )}

              {/* SECTION 2: Exact Full Name Matches (Siblings) */}
              {!loadingSuggestions && exactMatches.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <span>✓</span>
                      <span>{getText('Exact Full Name Matches / Siblings:', 'ተመሳሳይ ሙሉ ስም ያላቸው / ወንድማማቾች፡')}</span>
                      <span className="px-1.5 py-0.2 rounded-full font-bold text-[10px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200">
                        {exactMatches.length}
                      </span>
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {getText('Matches parent or student full name', 'ከወላጅ ወይም ከተማሪው ሙሉ ስም ጋር የሚዛመድ')}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {exactMatches.map(({ student: st, reason }) => {
                      const isAlreadySelected = selectedStudents.some(s => s._id === st._id)
                      return (
                        <div
                          key={st._id}
                          className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 transition ${
                            isAlreadySelected
                              ? 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800'
                              : theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                              <span className="font-bold text-sm text-gray-900 dark:text-white break-words">
                                {getStudentDisplayName(st, language)}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 flex-shrink-0">
                                {st.class} {st.section ? `- ${st.section}` : ''}
                              </span>
                              <span className="text-[10px] font-mono text-gray-400 flex-shrink-0">ID: {st.studentId || '—'}</span>
                            </div>
                            <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium mt-0.5 break-words">
                              {reason}
                            </p>
                            <div className="text-[11px] text-gray-400 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                              {st.fatherName && <span className="break-words">Father: {st.fatherName}</span>}
                              {st.motherName && <span className="break-words">Mother: {st.motherName}</span>}
                            </div>
                          </div>

                          {isAlreadySelected ? (
                            <span className="px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-900/60 dark:text-emerald-200 flex items-center justify-center gap-1 flex-shrink-0 w-full sm:w-auto">
                              <CheckCircleIcon className="w-4 h-4" />
                              <span>{getText('Selected', 'ተመርጧል')}</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddStudentToSelection(st)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition flex items-center justify-center gap-1 flex-shrink-0 shadow-sm w-full sm:w-auto"
                            >
                              <PlusCircleIcon className="w-4 h-4" />
                              <span>{getText('Add / Select', 'ምረጥ')}</span>
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* SECTION 3: Related Name Suggestions (Partial / Shared names) */}
              {!loadingSuggestions && relatedMatches.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="font-bold text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <span>🔍</span>
                      <span>{getText('Related Name Matches (Review & Select):', 'ተቀራራቢ ስሞች ያላቸው ተማሪዎች (ገምግመው ይምረጡ)፡')}</span>
                      <span className="px-1.5 py-0.2 rounded-full font-bold text-[10px] bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200">
                        {relatedMatches.length}
                      </span>
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {getText('Shared first or father name with payer', 'ከከፋዩ ጋር የአባት ወይም የመጀመሪያ ስም የሚጋሩ')}
                    </span>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {relatedMatches.map(({ student: st, reason, score }) => {
                      const isAlreadySelected = selectedStudents.some(s => s._id === st._id)
                      return (
                        <div
                          key={st._id}
                          className={`p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 transition ${
                            isAlreadySelected
                              ? 'border-blue-300 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800'
                              : theme === 'dark' ? 'bg-gray-800/80 border-gray-700' : 'bg-gray-50/80 border-gray-200'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                              <span className="font-bold text-sm text-gray-900 dark:text-white break-words">
                                {getStudentDisplayName(st, language)}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 flex-shrink-0">
                                {st.class} {st.section ? `- ${st.section}` : ''}
                              </span>
                              <span className="text-[10px] font-mono text-gray-400 flex-shrink-0">ID: {st.studentId || '—'}</span>
                            </div>
                            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5 break-words">
                              {reason}
                            </p>
                            <div className="text-[11px] text-gray-400 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                              {st.fatherName && <span className="break-words">Father: {st.fatherName}</span>}
                              {st.motherName && <span className="break-words">Mother: {st.motherName}</span>}
                            </div>
                          </div>

                          {isAlreadySelected ? (
                            <span className="px-3 py-1.5 rounded-lg text-xs font-bold text-blue-700 bg-blue-100 dark:bg-blue-900/60 dark:text-blue-200 flex items-center justify-center gap-1 flex-shrink-0 w-full sm:w-auto">
                              <CheckCircleIcon className="w-4 h-4" />
                              <span>{getText('Selected', 'ተመርጧል')}</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddStudentToSelection(st)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-200 transition flex items-center justify-center gap-1 flex-shrink-0 w-full sm:w-auto"
                            >
                              <PlusCircleIcon className="w-4 h-4" />
                              <span>{getText('Select', 'ምረጥ')}</span>
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* SECTION: Previous Payment History from this Payer */}
              {payerHistory.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="font-bold text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                      <span>📜</span>
                      <span>{getText('Previous Payments by this Payer:', 'የዚህ ከፋይ የቀድሞ ክፍያዎች ታሪክ፡')}</span>
                      <span className="px-1.5 py-0.2 rounded-full font-bold text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200">
                        {payerHistory.length}
                      </span>
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {getText('History from past bank SMS', 'ቀደም ሲል የተፈጸሙ ክፍያዎች')}
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {payerHistory.map((pastTxn) => {
                      const pastStudents = (pastTxn.matchedStudents && pastTxn.matchedStudents.length > 0)
                        ? pastTxn.matchedStudents
                        : pastTxn.matchedStudent ? [pastTxn.matchedStudent] : []

                      return (
                        <div
                          key={pastTxn._id}
                          className={`p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 text-xs ${
                            theme === 'dark' ? 'bg-indigo-950/20 border-indigo-900/50' : 'bg-indigo-50/40 border-indigo-100'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                              <span className="font-mono font-bold text-gray-700 dark:text-gray-300">
                                {new Date(pastTxn.transactionDate).toLocaleDateString()}
                              </span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                ETB {pastTxn.amount.toLocaleString()}
                              </span>
                              <span className="text-[10px] font-mono text-gray-400 break-all">
                                {pastTxn.bank} ({pastTxn.reference})
                              </span>
                              {pastTxn.isReconciled && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                                  ✓ {getText('Paid', 'የተከፈለ')}
                                </span>
                              )}
                            </div>

                            {pastStudents.length > 0 ? (
                              <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-indigo-700 dark:text-indigo-300 font-medium">
                                <span>{getText('Linked to:', 'የተያያዘለት፡')}</span>
                                {pastStudents.map((pst: any) => (
                                  <span key={pst._id} className="font-bold underline break-words">
                                    {pst.firstName} {pst.middleName} ({pst.class})
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-400 italic mt-0.5 block">
                                {getText('Unmatched in this past record', 'ያልተያያዘ ነበር')}
                              </span>
                            )}
                          </div>

                          {pastStudents.length > 0 && (
                            <div className="flex-shrink-0 flex flex-wrap items-center gap-1 w-full sm:w-auto">
                              {pastStudents.map((pst: any) => {
                                const isAlreadySelected = selectedStudents.some(s => s._id === pst._id)
                                if (isAlreadySelected) {
                                  return (
                                    <span key={pst._id} className="text-[10px] text-indigo-600 font-bold px-1.5 py-0.5">
                                      ✓
                                    </span>
                                  )
                                }
                                return (
                                  <button
                                    key={pst._id}
                                    type="button"
                                    onClick={() => handleAddStudentToSelection(pst)}
                                    className="px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-200 transition w-full sm:w-auto text-center"
                                    title={getText('Select this student again', 'ይህንን ተማሪ በድጋሚ ምረጥ')}
                                  >
                                    + {getText('Select Same', 'ይህኑን ምረጥ')}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* No Suggestions Notice Banner */}
              {!loadingSuggestions && exactMatches.length === 0 && relatedMatches.length === 0 && (
                <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                  theme === 'dark' ? 'bg-amber-950/20 border-amber-800/60 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}>
                  <span className="text-lg">🔍</span>
                  <div>
                    <p className="font-bold">
                      {getText('No Automatic Suggestions', 'ምንም ራስ-ሰር የተገኘ ተማሪ የለም')}
                    </p>
                    <p className="text-[11px] opacity-90 mt-0.5">
                      {getText(
                        'No automatic matches were found for this payer. Use the search box below to find students. You can search and select multiple students (e.g. 2 or 3 siblings) and link them together.',
                        'ከዚህ ከፋይ ስም ጋር በቀጥታ የሚዛመድ ተማሪ አልተገኘም። ከታች ባለው መፈለጊያ ተማሪዎችን ፈልገው ይምረጡ። ከአንድ በላይ ተማሪዎችን (ለምሳሌ 2 ወይም 3 ወንድማማቾችን) መርጠው በአንድ ላይ ማያያዝ ይችላሉ።'
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* SECTION 4: Manual Search to add other student */}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-2">
                <label className="block text-xs font-semibold">
                  {getText('Search students to link (Search & select 1 or more for siblings):', 'ተማሪ ፈልገው ለማያያዝ (ፈልገው 1 ወይም ከዚያ በላይ ወንድማማቾችን መምረጥ ይችላሉ)፡')}
                </label>
                <div className="relative">
                  <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => {
                      setStudentSearch(e.target.value)
                      searchStudents(e.target.value)
                    }}
                    placeholder={getText('Type name, father/mother name, phone, or ID...', 'ስም፣ የአባት/እናት ስም፣ ስልክ ወይም መታወቂያ...')}
                    className={`w-full pl-9 pr-8 py-2 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-blue-500 ${
                      theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'
                    }`}
                  />
                  {studentSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setStudentSearch('')
                        setStudentList([])
                      }}
                      className="absolute right-8 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs px-1"
                      title={getText('Clear search', 'ፍለጋውን አጽዳ')}
                    >
                      ✕
                    </button>
                  )}
                  {searchingStudents && (
                    <div className="absolute right-3 top-2.5">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                </div>

                {/* Search Results */}
                {studentList.length > 0 && (
                  <div className={`max-h-44 overflow-y-auto rounded-xl border p-2 space-y-1.5 ${
                    theme === 'dark' ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-gray-50'
                  }`}>
                    {studentList.map((st) => {
                      const isAlreadySelected = selectedStudents.some(s => s._id === st._id)
                      return (
                        <div
                          key={st._id}
                          className={`p-2 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-bold text-gray-900 dark:text-white break-words">
                                {getStudentDisplayName(st, language)}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex-shrink-0">
                                {st.class}
                              </span>
                              <span className="text-[10px] text-gray-400 font-mono flex-shrink-0">ID: {st.studentId || '—'}</span>
                            </div>
                            <div className="text-[11px] text-gray-400 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                              {st.fatherName && <span className="break-words">Father: {st.fatherName} </span>}
                              {st.motherName && <span className="break-words">Mother: {st.motherName}</span>}
                            </div>
                          </div>

                          {isAlreadySelected ? (
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 px-2 py-1 text-center w-full sm:w-auto">
                              ✓ {getText('Added', 'ተመርጧል')}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddStudentToSelection(st)}
                              className="px-2.5 py-1.5 rounded text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800 w-full sm:w-auto text-center"
                            >
                              + {getText('Add', 'ምረጥ')}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex items-center justify-center sm:justify-start">
                {(linkingTxn.matchedStudent || (linkingTxn.matchedStudents && linkingTxn.matchedStudents.length > 0)) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStudents([])
                    }}
                    className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline px-1 py-1 text-center"
                  >
                    {getText('Clear All / Unlink', 'ሁሉንም አጽዳ / ማያያዝ ሰርዝ')}
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLinkingTxn(null)}
                  className={`px-4 py-2.5 sm:py-2 rounded-xl text-xs font-semibold text-center ${
                    theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  {getText('Cancel', 'ሰርዝ')}
                </button>
                <button
                  type="button"
                  onClick={handleSaveLinkedStudents}
                  disabled={linking}
                  className="px-5 py-2.5 sm:py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition shadow-sm flex items-center justify-center gap-1.5 text-center"
                >
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>
                    {linking
                      ? getText('Saving...', 'በማስቀመጥ ላይ...')
                      : selectedStudents.length === 0
                      ? getText('Confirm Unlink', 'ማያያዝ ሰርዝ')
                      : selectedStudents.length > 1
                      ? getText(`Confirm & Link (${selectedStudents.length} Siblings)`, `${selectedStudents.length} ወንድማማቾችን አረጋግጥና አያይዝ`)
                      : getText('Confirm & Link Student', 'ተማሪውን አረጋግጥና አያይዝ')}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: View Raw SMS Modal */}
      {showSmsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-lg max-h-[94vh] sm:max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border p-3.5 sm:p-6 ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="flex justify-between items-start pb-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="min-w-0 flex-1 pr-2">
                <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                  <span>📩</span>
                  <span className="truncate">{showSmsModal.bank} {getText('SMS Details', 'የኤስኤምኤስ ዝርዝር')}</span>
                </h3>
                {(() => {
                  const displayRef = getDisplayReference(showSmsModal)
                  const receipt = showSmsModal.receiptUrl || extractReceiptUrl(showSmsModal.rawSms)
                  if (receipt && displayRef !== '—') {
                    return (
                      <a
                        href={receipt}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-400 font-mono mt-0.5 hover:underline inline-flex items-center gap-1 break-all font-semibold"
                        title={getText('Open Official Receipt', 'ይፋዊ ደረሰኝ ክፈት')}
                      >
                        <span>{displayRef}</span>
                        <span className="text-[10px]">↗</span>
                      </a>
                    )
                  }
                  return <p className="text-xs text-gray-400 font-mono mt-0.5 break-all">{displayRef}</p>
                })()}
              </div>
              <button
                type="button"
                onClick={() => setShowSmsModal(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg flex-shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="py-3 sm:py-4 space-y-3 text-xs overflow-y-auto flex-1 pr-1 min-h-0">
              {/* Receipt Link if present */}
              {(showSmsModal.receiptUrl || extractReceiptUrl(showSmsModal.rawSms)) && (
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 block">
                      {getText('Official Bank Digital Receipt Link:', 'የባንክ ይፋዊ ዲጂታል ደረሰኝ ሊንክ፡')}
                    </span>
                    <a
                      href={showSmsModal.receiptUrl || extractReceiptUrl(showSmsModal.rawSms)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 font-mono underline break-all block mt-0.5 hover:text-blue-800"
                    >
                      {showSmsModal.receiptUrl || extractReceiptUrl(showSmsModal.rawSms)}
                    </a>
                  </div>
                  <a
                    href={showSmsModal.receiptUrl || extractReceiptUrl(showSmsModal.rawSms)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1.5 transition flex-shrink-0 shadow-sm w-full sm:w-auto text-center"
                  >
                    <span>{getText('Open Receipt ↗', 'ደረሰኝ ክፈት ↗')}</span>
                  </a>
                </div>
              )}

              <div>
                <span className="text-gray-400 block mb-1 font-semibold">{getText('Raw SMS Message Text:', 'የመጣው ሙሉ የኤስኤምኤስ ጽሑፍ፡')}</span>
                <div className={`p-3 rounded-xl border font-mono whitespace-pre-wrap break-words break-all leading-relaxed max-h-48 overflow-y-auto ${
                  theme === 'dark' ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-800'
                }`}>
                  {showSmsModal.rawSms}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="break-words">
                  <span className="text-gray-400 block">{getText('Amount:', 'መጠን፡')}</span>
                  {showSmsModal.type === 'debit' ? (
                    <span className="font-bold text-red-600 dark:text-red-400">
                      - ETB {showSmsModal.amount.toLocaleString()} ({getText('Debit', 'ወጪ')})
                    </span>
                  ) : (
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      + ETB {showSmsModal.amount.toLocaleString()} ({getText('Credit', 'ገቢ')})
                    </span>
                  )}
                </div>
                <div className="break-all">
                  <span className="text-gray-400 block">{getText('Account:', 'ሂሳብ፡')}</span>
                  <span className="font-mono">{showSmsModal.receiverAccount || '—'}</span>
                </div>
                <div className="break-words">
                  <span className="text-gray-400 block">
                    {getText('Payer Name:', 'የከፋይ ስም፡')}
                  </span>
                  <span className="font-medium break-words">
                    {getPayerName(showSmsModal)}
                  </span>
                </div>
                <div className="break-words">
                  <span className="text-gray-400 block">
                    {getText('Receiver Name:', 'የተቀባይ ስም፡')}
                  </span>
                  <span className="font-medium break-words">
                    {getReceiverName(showSmsModal)}
                  </span>
                </div>
                {getPayerTransferBank(showSmsModal, getText) && (
                  <div className="break-words">
                    <span className="text-gray-400 block">{getText('From (Originating Bank):', 'የተላከበት ባንክ / ምንጭ፡')}</span>
                    <span className={`font-bold ${getPayerTransferBank(showSmsModal, getText) === getText('Unknown Bank', 'ያልታወቀ ባንክ') ? 'italic opacity-80' : 'text-blue-600 dark:text-blue-400'}`}>
                      {getPayerTransferBank(showSmsModal, getText)}
                    </span>
                  </div>
                )}
                <div className="break-words">
                  <span className="text-gray-400 block">{getText('Transaction Date:', 'የግብይት ቀን፡')}</span>
                  <span>{new Date(showSmsModal.transactionDate).toLocaleString()}</span>
                </div>
                <div className="break-words">
                  <span className="text-gray-400 block">{getText('Received At:', 'የደረሰበት ሰዓት፡')}</span>
                  <span>{new Date(showSmsModal.createdAt).toLocaleString()}</span>
                </div>
                {showSmsModal.type !== 'debit' && (
                  <div className="col-span-1 sm:col-span-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-gray-400 block font-semibold">{getText('Matched Student(s):', 'የተያያዘ ተማሪ(ዎች)፡')}</span>
                    {(showSmsModal.matchedStudents && showSmsModal.matchedStudents.length > 1) ? (
                      <div className="space-y-1.5 mt-1">
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 inline-block mb-1">
                          {showSmsModal.matchedStudents.length} {getText('Siblings Matched / ወንድማማቾች', 'ወንድማማቾች')}
                        </span>
                        {showSmsModal.matchedStudents.map((st, idx) => (
                          <div key={st._id} className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <CheckCircleIcon className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            <span className="font-bold text-sm text-blue-600 dark:text-blue-400 break-words">
                              {getStudentDisplayName(st, language)}
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 flex-shrink-0">
                              {st.class} {st.section ? `- ${st.section}` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : showSmsModal.matchedStudent ? (
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1">
                        <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="font-bold text-sm text-blue-600 dark:text-blue-400 break-words">
                          {getStudentDisplayName(showSmsModal.matchedStudent, language)}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 flex-shrink-0">
                          {showSmsModal.matchedStudent.class} {showSmsModal.matchedStudent.section ? `- ${showSmsModal.matchedStudent.section}` : ''}
                        </span>
                      </div>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 font-medium italic mt-0.5 block">{getText('None (Unmatched)', 'ያልተያያዘ')}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              {showSmsModal.type === 'debit' ? (
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-700 bg-red-100 dark:bg-red-900/40 dark:text-red-300 w-full sm:w-auto text-center">
                    {getText('Debited Transaction (No student link required)', 'የወጪ ግብይት (የተማሪ ማያያዝ አያስፈልገውም)')}
                  </span>
                </div>
              ) : (showSmsModal.matchedStudent || (showSmsModal.matchedStudents && showSmsModal.matchedStudents.length > 0)) ? (
                showSmsModal.isReconciled ? (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                    <span className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300 flex items-center justify-center gap-1.5 text-center">
                      <CheckCircleIcon className="w-4 h-4 flex-shrink-0" />
                      <span>{getText('Approved & Recorded in Payments', 'ጸድቆ በክፍያ ዝርዝር ላይ ተመዝግቧል')}</span>
                    </span>
                    {canDo('bank-reports', 'approve') && (
                      <button
                        type="button"
                        onClick={() => handleRevokeApprove(showSmsModal._id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800 transition flex items-center justify-center gap-1 w-full sm:w-auto text-center"
                        title={getText('Remove approval & return to Approve', 'ማጽደቁን አንሳ')}
                      >
                        <XCircleIcon className="w-4 h-4" />
                        <span>{getText('Remove Approval', 'ማጽደቁን አንሳ')}</span>
                      </button>
                    )}
                  </div>
                ) : canDo('bank-reports', 'approve') ? (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => {
                        const txn = showSmsModal
                        setShowSmsModal(null)
                        handleOpenApproveModal(txn)
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md flex items-center justify-center gap-1.5 transition w-full sm:w-auto text-center"
                    >
                      <ClipboardDocumentCheckIcon className="w-4 h-4" />
                      <span>{getText('Approve & Record Payment', 'ክፍያውን አጽድቅና መዝግብ')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const txn = showSmsModal
                        setShowSmsModal(null)
                        handleOpenLinkModal(txn)
                      }}
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 transition w-full sm:w-auto text-center"
                    >
                      {getText('Edit Links', 'ተማሪዎችን ቀይር')}
                    </button>
                  </div>
                ) : null
              ) : canDo('bank-reports', 'link') ? (
                <button
                  type="button"
                  onClick={() => {
                    const txn = showSmsModal
                    setShowSmsModal(null)
                    handleOpenLinkModal(txn)
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300 flex items-center justify-center gap-1.5 transition w-full sm:w-auto text-center"
                >
                  <LinkIcon className="w-4 h-4" />
                  <span>{getText('Link Student to Approve', 'ለማጽደቅ ተማሪ አያይዝ')}</span>
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => setShowSmsModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 w-full sm:w-auto text-center"
              >
                {getText('Close', 'ዝጋ')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Approve & Record Payment Modal */}
      {approvingTxn && (approvingTxn.matchedStudent || (approvingTxn.matchedStudents && approvingTxn.matchedStudents.length > 0)) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-3xl max-h-[94vh] sm:max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border p-3.5 sm:p-6 ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="flex justify-between items-start pb-3 sm:pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="min-w-0 flex-1 pr-2">
                <h3 className="text-base sm:text-lg font-bold flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <ClipboardDocumentCheckIcon className="w-5 h-5 flex-shrink-0" />
                  <span className="truncate">{getText('Approve & Record Payment', 'ክፍያውን አጽድቅና መዝግብ')}</span>
                </h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5 break-all">
                  {approvingTxn.bank} Ref:{' '}
                  {(() => {
                    const displayRef = getDisplayReference(approvingTxn)
                    const receipt = approvingTxn.receiptUrl || extractReceiptUrl(approvingTxn.rawSms)
                    if (receipt && displayRef !== '—') {
                      return (
                        <a
                          href={receipt}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-blue-600 dark:text-blue-400 hover:underline font-bold"
                          title={getText('Open Official Receipt', 'ይፋዊ ደረሰኝ ክፈት')}
                        >
                          {displayRef} ↗
                        </a>
                      )
                    }
                    return <span>{displayRef}</span>
                  })()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setApprovingTxn(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg flex-shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="py-3 sm:py-4 space-y-3 sm:space-y-4 text-xs overflow-y-auto flex-1 pr-1 min-h-0">
              {/* Summary of division */}
              <div className={`p-2.5 sm:p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                theme === 'dark' ? 'bg-emerald-950/20 border-emerald-800 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold">{getText('Transaction Amount:', 'የግብይት መጠን፡')}</span>
                  <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                    ETB {approvingTxn.amount.toLocaleString()}
                  </span>
                </div>
                {studentApprovals.length > 1 && (
                  <span className="text-[11px] font-semibold opacity-90 break-words">
                    {getText(
                      `Divided equally among ${studentApprovals.length} students (ETB ${Math.round(approvingTxn.amount / studentApprovals.length).toLocaleString()} each). Customize below:`,
                      `ለ${studentApprovals.length} ተማሪዎች እኩል ተከፍሏል (እያንዳንዳቸው ${Math.round(approvingTxn.amount / studentApprovals.length).toLocaleString()} ብር)። ከታች ማስተካከል ይችላሉ፡`
                    )}
                  </span>
                )}
              </div>

              {/* Repeated Student Approval Fields */}
              <div className="space-y-3 sm:space-y-4">
                {studentApprovals.map((sa, idx) => {
                  const existing = existingPaymentsWarning.find(
                    p => p.studentId === sa.studentId && p.month === sa.month && Number(p.year) === Number(sa.year)
                  )
                  const historyList = studentPaymentHistory[sa.studentId] || []

                  return (
                  <div
                    key={sa.studentId}
                    className={`p-3 sm:p-4 rounded-xl border space-y-3 ${
                      existing
                        ? theme === 'dark' ? 'bg-amber-950/20 border-amber-700/80 ring-1 ring-amber-600/50' : 'bg-amber-50/50 border-amber-300 ring-1 ring-amber-300'
                        : theme === 'dark' ? 'bg-gray-900/40 border-gray-700' : 'bg-gray-50/80 border-gray-200'
                    }`}
                  >
                    <div className="flex flex-wrap sm:flex-nowrap items-start sm:items-center justify-between gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center text-[10px] flex-shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-sm text-blue-600 dark:text-blue-400 break-words">
                          {getStudentDisplayName(sa.student, language)}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 flex-shrink-0">
                          {sa.student.class} {sa.student.section ? `- ${sa.student.section}` : ''}
                        </span>
                        <span className="text-[10px] font-mono text-gray-400 flex-shrink-0">
                          ID: {sa.student.studentId || '—'}
                        </span>
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono flex-shrink-0">
                        ETB {sa.amount.toLocaleString()}
                      </span>
                    </div>

                    {/* Existing Payment Warning Banner inside card */}
                    {existing && (
                      <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5 animate-fade-in">
                        <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold flex flex-wrap items-center justify-between gap-1">
                            <span className="break-words">{getText('Payment Record Already Exists on Payments Page!', 'በክፍያ ገጽ ላይ ቀደም ሲል የተመዘገበ ክፍያ አለ!')}</span>
                            <span className="font-mono text-xs font-extrabold text-amber-700 dark:text-amber-300">
                              ETB {existing.amount?.toLocaleString()}
                            </span>
                          </div>
                          <p className="text-[11px] mt-0.5 text-amber-800 dark:text-amber-300 break-words">
                            {getText(
                              `A record for ${existing.month} ${existing.year} E.C. already exists (Recorded on: ${new Date(existing.paymentDate).toLocaleDateString()}). To record for another month, change the Academic Month below.`,
                              `ለ${existing.month} ${existing.year} ዓ.ም ቀደም ሲል ተመዝግቧል (የተመዘገበበት ቀን፡ ${new Date(existing.paymentDate).toLocaleDateString()})። ለሌላ ወር ከሆነ እባክዎ ከታች ወሩን ይቀይሩ።`
                            )}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Payment History on Payments Page */}
                    <div className={`p-2.5 sm:p-3 rounded-xl border text-xs ${
                      theme === 'dark' ? 'bg-gray-800/80 border-gray-700' : 'bg-white border-gray-200'
                    }`}>
                      <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
                        <div className="flex items-center gap-1.5 font-bold text-gray-700 dark:text-gray-300">
                          <CalendarDaysIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                          <span>{getText('Payment History on Payments Page', 'በክፍያ ገጽ ላይ የተመዘገቡ ክፍያዎች')}</span>
                          <span className="text-[11px] font-normal text-gray-400">
                            ({sa.year} E.C.)
                          </span>
                        </div>
                        {loadingPaymentHistory && (
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 flex items-center gap-1 animate-pulse">
                            <ArrowPathIcon className="w-3 h-3 animate-spin" />
                            {getText('Checking payments...', 'ክፍያዎችን በማረጋገጥ ላይ...')}
                          </span>
                        )}
                      </div>

                      {/* Monthly Payment Badges for sa.year */}
                      <div className="mb-2.5">
                        <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-1.5 flex items-center justify-between">
                          <span>{getText('Months Status (click an unpaid month to select):', 'የወራት ሁኔታ (ያልተከፈለ ወርን ጠቅ በማድረግ ይምረጡ)፡')}</span>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                            ✓ {getText('Paid', 'የተከፈለ')}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 min-[420px]:grid-cols-3 sm:grid-cols-5 gap-1 sm:gap-1.5">
                          {ETHIOPIAN_ACADEMIC_MONTHS.map(m => {
                            const paidRecord = historyList.find(
                              p => Number(p.year) === Number(sa.year) && getAcademicMonthIndex(p.month) === m.ecIndex
                            )
                            const isPaid = !!paidRecord
                            const isSelectedMonth = getAcademicMonthIndex(sa.month) === m.ecIndex

                            if (isPaid) {
                              return (
                                <div
                                  key={m.value}
                                  title={`Paid: ETB ${paidRecord.amount?.toLocaleString()} on ${paidRecord.paymentDate ? new Date(paidRecord.paymentDate).toLocaleDateString() : '—'}`}
                                  className="px-1.5 py-1 sm:px-2 sm:py-1.5 rounded-lg bg-emerald-100/80 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex flex-col items-center justify-center text-center cursor-default transition"
                                >
                                  <div className="flex items-center gap-1 font-bold text-[9px] sm:text-[10px]">
                                    <CheckCircleIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                    <span className="break-words">{language === 'am' ? m.am : m.value}</span>
                                  </div>
                                  <span className="text-[8.5px] sm:text-[9px] font-mono text-emerald-700 dark:text-emerald-300 font-semibold">
                                    ETB {paidRecord.amount?.toLocaleString()}
                                  </span>
                                </div>
                              )
                            }

                            return (
                              <button
                                type="button"
                                key={m.value}
                                onClick={() => {
                                  setStudentApprovals(prev => prev.map((item, i) => i === idx ? { ...item, month: m.value } : item))
                                }}
                                className={`px-1.5 py-1 sm:px-2 sm:py-1.5 rounded-lg border text-center transition flex flex-col items-center justify-center ${
                                  isSelectedMonth
                                    ? 'bg-blue-100 dark:bg-blue-900/50 border-blue-500 ring-2 ring-blue-400 text-blue-900 dark:text-blue-100 font-bold'
                                    : 'bg-gray-50 dark:bg-gray-700/50 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                              >
                                <span className="text-[9px] sm:text-[10px] break-words">
                                  {language === 'am' ? m.am : m.value}
                                </span>
                                <span className="text-[8.5px] sm:text-[9px] text-gray-400">
                                  {isSelectedMonth ? getText('Selected', 'የተመረጠ') : getText('Unpaid', 'ያልተከፈለ')}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Detailed Recorded Payments List */}
                      {historyList.length === 0 ? (
                        !loadingPaymentHistory ? (
                          <div className="py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-900/40 text-[11px] text-gray-400 text-center italic border border-dashed border-gray-200 dark:border-gray-700">
                            {getText('No payment records found on the Payments page for this student.', 'ለዚህ ተማሪ በክፍያ ገጽ ላይ የተመዘገበ ክፍያ አልተገኘም።')}
                          </div>
                        ) : null
                      ) : (
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center justify-between">
                            <span>{getText(`All Recorded Payments (${historyList.length}):`, `ሁሉም የተመዘገቡ ክፍያዎች (${historyList.length})፡`)}</span>
                            <span className="text-[9px] text-gray-400">
                              {getText('Sorted newest first', 'ከአዲሱ ወደ አሮጌ')}
                            </span>
                          </div>
                          <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                            {historyList.map(p => (
                              <div
                                key={p._id}
                                className={`p-1.5 rounded-lg text-[10px] flex flex-col sm:flex-row gap-1 sm:items-center justify-between border ${
                                  Number(p.year) === Number(sa.year)
                                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                                    : 'bg-gray-50/60 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                                }`}
                              >
                                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                                  <span className="font-bold text-gray-800 dark:text-gray-200">
                                    {getEthiopianMonthDisplay(p.month, language)} {p.year} E.C.
                                  </span>
                                  {p.paymentDate && (
                                    <span className="text-gray-400">
                                      ({new Date(p.paymentDate).toLocaleDateString()})
                                    </span>
                                  )}
                                  {p.description && (
                                    <span className="text-gray-400 truncate max-w-full sm:max-w-[130px]" title={p.description}>
                                      - {p.description}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
                                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                    ETB {p.amount?.toLocaleString()}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-medium">
                                    {p.status || 'paid'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                      {/* Academic Year */}
                      <div>
                        <label className="block text-xs font-semibold mb-1">
                          {getText('Academic Year (E.C.):', 'የትምህርት ዘመን (ዓ.ም)፡')} *
                        </label>
                        <select
                          value={sa.year}
                          onChange={(e) => {
                            const val = parseInt(e.target.value)
                            setStudentApprovals(prev => prev.map((item, i) => i === idx ? { ...item, year: val } : item))
                          }}
                          className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none ${
                            theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
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
                          value={sa.month}
                          onChange={(e) => {
                            const val = e.target.value
                            setStudentApprovals(prev => prev.map((item, i) => i === idx ? { ...item, month: val } : item))
                          }}
                          className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none ${
                            theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                          }`}
                        >
                          {ETHIOPIAN_ACADEMIC_MONTHS.map(m => (
                            <option key={m.value} value={m.value}>
                              {m.value} ({m.am})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Amount (ETB) */}
                      <div>
                        <label className="block text-xs font-semibold mb-1">
                          {getText('Amount (ETB):', 'መጠን (ብር)፡')} *
                        </label>
                        <input
                          type="number"
                          value={sa.amount}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0
                            setStudentApprovals(prev => prev.map((item, i) => i === idx ? { ...item, amount: val } : item))
                          }}
                          className={`w-full px-3 py-2 rounded-xl border text-xs font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-500 outline-none ${
                            theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
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
                          value={sa.paymentDate}
                          onChange={(e) => {
                            const val = e.target.value
                            setStudentApprovals(prev => prev.map((item, i) => i === idx ? { ...item, paymentDate: val } : item))
                          }}
                          className={`w-full px-3 py-2 rounded-xl border text-xs focus:ring-2 focus:ring-emerald-500 outline-none ${
                            theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                          }`}
                        />
                      </div>

                      {/* Description / Remark */}
                      <div className="col-span-1 sm:col-span-2">
                        <label className="block text-xs font-semibold mb-1">
                          {getText('Description / Remark (Optional):', 'መግለጫ / ማስታወሻ (አማራጭ)፡')}
                        </label>
                        <input
                          type="text"
                          value={sa.description}
                          onChange={(e) => {
                            const val = e.target.value
                            setStudentApprovals(prev => prev.map((item, i) => i === idx ? { ...item, description: val } : item))
                          }}
                          placeholder={getText('e.g. October monthly fee via CBE', 'ለምሳሌ፡ የጥቅምት ወር ክፍያ በባንክ')}
                          className={`w-full px-3 py-2 rounded-xl border text-xs focus:ring-2 focus:ring-emerald-500 outline-none ${
                            theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                )})}
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                <InformationCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
                <span className="break-words">
                  {getText(
                    'Approving will immediately create official Payment record(s) on the Payments page and mark this transaction as reconciled.',
                    'ማጽደቅ በክፍያ ገጽ ላይ ኦፊሴላዊ የክፍያ መዝገብ ይፈጥራል እንዲሁም ይህንን የባንክ ግብይት የተረጋገጠ ያደርገዋል።'
                  )}
                </span>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <button
                type="button"
                onClick={() => setApprovingTxn(null)}
                className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold text-center ${
                  theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {getText('Cancel', 'ሰርዝ')}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmApprove(false)}
                disabled={approving}
                className="w-full sm:w-auto px-5 py-2.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg disabled:opacity-50 transition flex items-center justify-center gap-2 text-center"
              >
                <ClipboardDocumentCheckIcon className="w-4 h-4" />
                <span>
                  {approving
                    ? getText('Recording...', 'በመመዝገብ ላይ...')
                    : studentApprovals.length > 1
                    ? getText(`Approve (${studentApprovals.length} Payments)`, `${studentApprovals.length} ክፍያዎችን አጽድቅ`)
                    : getText('Approve Payment', 'ክፍያውን አጽድቅ')}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5B: Duplicate / Existing Payment Confirmation Modal */}
      {showDuplicateConfirmModal && existingPaymentsWarning.length > 0 && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-lg max-h-[94vh] sm:max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border p-3.5 sm:p-6 ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            {/* Header */}
            <div className="flex items-start gap-3 pb-3 sm:pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                <ExclamationTriangleIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-amber-600 dark:text-amber-400 break-words">
                  {getText('Payment Record Already Exists', 'ቀደም ሲል የተመዘገበ ክፍያ ተገኝቷል')}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 break-words">
                  {getText(
                    'A payment record already exists on the Payments page for the selected year and month.',
                    'ለተመረጠው ዓመት እና ወር ቀደም ሲል በክፍያ ገጽ ላይ የተመዘገበ ክፍያ አለ።'
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDuplicateConfirmModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 flex-shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="py-3 sm:py-4 space-y-3 sm:space-y-3.5 text-xs overflow-y-auto flex-1 pr-1 min-h-0">
              <p className="font-semibold text-gray-800 dark:text-gray-200 break-words">
                {getText(
                  'Are you sure? On this year and month there is already a record on the Payments page. Do you want to update/overwrite it, or change/rename the month?',
                  'እርግጠኛ ነዎት? በዚህ ዓመት እና ወር ቀደም ሲል በክፍያ ገጽ ላይ የተመዘገበ ክፍያ አለ። ይህንን መዝገብ ማደስ/መቀየር ይፈልጋሉ ወይስ ወሩን መቀየር ይፈልጋሉ?'
                )}
              </p>

              {/* Breakdown of conflicting student records */}
              <div className="space-y-2">
                {existingPaymentsWarning.map((ep, idx) => (
                  <div
                    key={ep.paymentId || idx}
                    className={`p-2.5 sm:p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                      theme === 'dark' ? 'bg-amber-950/20 border-amber-800/60 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-900'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-bold break-words">{ep.studentName || getText('Student', 'ተማሪ')}</span>
                      <p className="text-[11px] opacity-80 mt-0.5 font-mono">
                        {ep.month} {ep.year} E.C. • {ep.paymentDate ? new Date(ep.paymentDate).toLocaleDateString() : ''}
                      </p>
                      {ep.description && (
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-full sm:max-w-xs" title={ep.description}>
                          {ep.description}
                        </p>
                      )}
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center flex-shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-amber-200/50">
                      <span className="font-extrabold font-mono text-amber-600 dark:text-amber-400 text-sm">
                        ETB {ep.amount?.toLocaleString() || 0}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
                        {ep.status || 'paid'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className={`p-3 rounded-xl text-[11px] leading-relaxed border ${
                theme === 'dark' ? 'bg-gray-900/40 border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600'
              }`}>
                {getText(
                  '💡 If this bank transaction is intended for another academic month, click "Change / Rename Month" to adjust. To update the existing payment record with this transaction, click "Yes, Overwrite & Approve".',
                  '💡 ይህ የባንክ ግብይት ለሌላ የትምህርት ወር ከሆነ "ወሩን ቀይር" የሚለውን በመጫን ያስተካክሉ። ያለውን መዝገብ በዚህ ግብይት ማደስ ከፈለጉ "አዎ፣ አድስና አጽድቅ" የሚለውን ይጫኑ።'
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowDuplicateConfirmModal(false)}
                className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl text-xs font-semibold text-center ${
                  theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                {getText('Change / Rename Month', 'ወሩን ቀይር / ተመለስ')}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmApprove(true)}
                disabled={approving}
                className="w-full sm:w-auto px-5 py-2.5 sm:py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-lg disabled:opacity-50 transition flex items-center justify-center gap-1.5 text-center"
              >
                <ClipboardDocumentCheckIcon className="w-4 h-4" />
                <span>
                  {approving
                    ? getText('Updating...', 'በማደስ ላይ...')
                    : getText('Yes, Overwrite & Approve', 'አዎ፣ አድስና አጽድቅ')}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: Delete Confirmation Modal */}
      {deletingTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-lg max-h-[94vh] sm:max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border p-3.5 sm:p-6 ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            {/* Header */}
            <div className="flex items-start gap-3 pb-3 sm:pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
                <TrashIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-red-600 dark:text-red-400 break-words">
                  {getText('Delete Transaction', 'ግብይቱን ሰርዝ')}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono break-all">
                  {deletingTxn.bank} • Ref: {getDisplayReference(deletingTxn)} • ETB {deletingTxn.amount.toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeletingTxn(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 flex-shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="py-3 sm:py-4 space-y-3 sm:space-y-3.5 text-xs overflow-y-auto flex-1 pr-1 min-h-0">
              {/* Transaction details card */}
              <div className={`p-2.5 sm:p-3 rounded-xl border space-y-1.5 ${
                theme === 'dark' ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="text-gray-400">
                    {deletingTxn.type === 'debit' ? getText('Receiver:', 'ተቀባይ፡') : getText('Payer:', 'ከፋይ፡')}
                  </span>
                  <span className="font-bold break-words">
                    {deletingTxn.senderName && deletingTxn.senderName.trim() ? deletingTxn.senderName.trim() : '—'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="text-gray-400">{getText('Transaction Date:', 'የግብይት ቀን፡')}</span>
                  <span>{new Date(deletingTxn.transactionDate).toLocaleString()}</span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="text-gray-400">{getText('Linked Student(s):', 'የተያያዘ ተማሪ፡')}</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400 break-words">
                    {deletingTxn.matchedStudents && deletingTxn.matchedStudents.length > 0
                      ? deletingTxn.matchedStudents.map(s => getStudentDisplayName(s, language)).join(', ')
                      : deletingTxn.matchedStudent
                      ? getStudentDisplayName(deletingTxn.matchedStudent, language)
                      : getText('None (Unmatched)', 'ያልተያያዘ')}
                  </span>
                </div>
              </div>

              {/* Warning if already reconciled */}
              {deletingTxn.isReconciled && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <span className="text-base flex-shrink-0">⚠️</span>
                  <span className="break-words">
                    {getText(
                      'This transaction was already approved as a fee payment. Deleting it will also remove the recorded payment(s) from the Payments page.',
                      'ይህ ግብይት ቀደም ሲል የትምህርት ክፍያ ሆኖ ጸድቋል። መሰረዝ በክፍያ ገጽ ላይ የተመዘገቡትን ክፍያዎች ጭምር ያጠፋል።'
                    )}
                  </span>
                </div>
              )}

              {/* Selection options: With History vs Only Transaction */}
              <div className="space-y-2 pt-1">
                <label className="block font-bold text-xs">
                  {getText('Select Deletion Option:', 'የመሰረዝ አማራጭ ይምረጡ፡')}
                </label>

                {/* Option 1: Delete only transaction (Keep history) */}
                <div
                  onClick={() => setDeleteWithHistory(false)}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                    !deleteWithHistory
                      ? theme === 'dark' ? 'bg-blue-950/30 border-blue-600 ring-1 ring-blue-600' : 'bg-blue-50/70 border-blue-500 ring-1 ring-blue-500'
                      : theme === 'dark' ? 'bg-gray-900/30 border-gray-700 hover:bg-gray-750' : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="deleteHistoryOption"
                    checked={!deleteWithHistory}
                    onChange={() => setDeleteWithHistory(false)}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-gray-900 dark:text-white break-words">
                      {getText('Delete Transaction Only (Keep Link History)', 'ይህንን ግብይት ብቻ ሰርዝ (የትስስር ታሪክ እንዳይጠፋ)')}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 break-words">
                      {getText(
                        'Deletes only this transaction. Keeps the remembered link history for this payer, so future payments from this payer will still automatically match.',
                        'ይህንን ግብይት ብቻ ይሰርዛል። የከፋዩ የቀድሞ የትስስር ታሪክ ስለማይጠፋ ወደፊት ከዚህ ከፋይ የሚመጡ ክፍያዎች አሁንም በራስ-ሰር ይያያዛሉ።'
                      )}
                    </p>
                  </div>
                </div>

                {/* Option 2: Delete transaction AND remove history */}
                <div
                  onClick={() => setDeleteWithHistory(true)}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                    deleteWithHistory
                      ? theme === 'dark' ? 'bg-red-950/30 border-red-600 ring-1 ring-red-600' : 'bg-red-50/70 border-red-500 ring-1 ring-red-500'
                      : theme === 'dark' ? 'bg-gray-900/30 border-gray-700 hover:bg-gray-750' : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="deleteHistoryOption"
                    checked={deleteWithHistory}
                    onChange={() => setDeleteWithHistory(true)}
                    className="mt-0.5 text-red-600 focus:ring-red-500"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="font-bold text-xs text-red-600 dark:text-red-400 break-words">
                        {getText('Delete Transaction & Remove Payer Link History', 'ግብይቱን ሰርዝ እና የከፋይ ትስስር ታሪክን አጥፋ')}
                      </p>
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300 flex-shrink-0">
                        {getText('Wipe Memory', 'ማስታወሻን አጥፋ')}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 break-words">
                      {getText(
                        'Deletes this transaction and wipes the remembered link history. Future messages from this payer will NOT auto-link unless the SMS itself mentions parent/student names.',
                        'ይህንን ግብይት ይሰርዛል እንዲሁም የከፋዩን የታወሰ የትስስር ታሪክ ሙሉ በሙሉ ያጠፋል። ወደፊት ከዚህ ከፋይ የሚመጣ መልእክት የወላጅ/ተማሪ ስም በቀጥታ ከሌለው በስተቀር በራስ-ሰር አይያያዝም።'
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <button
                type="button"
                onClick={() => setDeletingTxn(null)}
                className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl text-xs font-semibold text-center ${
                  theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                {getText('Cancel', 'ተመለስ')}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="w-full sm:w-auto px-5 py-2.5 sm:py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg disabled:opacity-50 transition flex items-center justify-center gap-2 text-center"
              >
                <TrashIcon className="w-4 h-4" />
                <span>
                  {deleting
                    ? getText('Deleting...', 'በመሰረዝ ላይ...')
                    : deleteWithHistory
                    ? getText('Delete & Wipe History', 'ሰርዝ እና ታሪክን አጥፋ')
                    : getText('Delete Transaction Only', 'ግብይቱን ብቻ ሰርዝ')}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

