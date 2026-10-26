
'use client'

import React, { useState, useMemo } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { useSettings } from '@/contexts/SettingsContext'
import { ETHIOPIAN_ACADEMIC_MONTHS, getEthiopianMonthDisplay } from '@/utils/dateUtils'

export interface StudentItem {
  _id: string
  studentId: string
  firstName: string
  middleName: string
  lastName: string
  class: string
  section?: string
  paymentCode?: string
}

export interface ExistingPaymentItem {
  _id: string
  studentId: string | any
  month: string
  year: number
  amount: number
  paymentDate?: string
}

export interface ParsedPaymentRow {
  id: string
  rawIndex: number
  studentId: string | null
  student?: {
    _id: string
    studentId: string
    name: string
    class: string
    section?: string
    paymentCode?: string
  } | null
  matchType?: string
  amount: number
  month: string
  year: number
  paymentDate: string
  description: string
  isDuplicate: boolean
  existingPayment?: any
  status: 'matched' | 'duplicate' | 'unmatched'
  selected: boolean
}

interface ImportPaymentsModalProps {
  isOpen: boolean
  onClose: () => void
  selectedYear: number
  selectedMonth: string
  students: StudentItem[]
  existingPayments: ExistingPaymentItem[]
  availableYears: number[]
  onImportSuccess: (importedMonth?: string, importedYear?: number) => void
}

export default function ImportPaymentsModal({
  isOpen,
  onClose,
  selectedYear,
  selectedMonth,
  students,
  existingPayments,
  availableYears,
  onImportSuccess
}: ImportPaymentsModalProps) {
  const { theme, getText, language } = useSettings()

  const [step, setStep] = useState<'upload' | 'preview'>('upload')
  const [importYear, setImportYear] = useState<number>(selectedYear || 2017)
  const [importMonth, setImportMonth] = useState<string>(
    selectedMonth && selectedMonth !== 'all' ? selectedMonth : 'September'
  )
  const [batchMonth, setBatchMonth] = useState<string>(
    selectedMonth && selectedMonth !== 'all' ? selectedMonth : 'September'
  )
  const [duplicateMode, setDuplicateMode] = useState<'skip' | 'overwrite'>('skip')
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Step 2 state
  const [rows, setRows] = useState<ParsedPaymentRow[]>([])
  const [previewFilter, setPreviewFilter] = useState<'all' | 'matched' | 'unmatched' | 'duplicate'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [reassigningRowId, setReassigningRowId] = useState<string | null>(null)

  // Reset state when opened or closed
  React.useEffect(() => {
    if (isOpen) {
      setImportYear(selectedYear || 2017)
      const initM = selectedMonth && selectedMonth !== 'all' ? selectedMonth : 'September'
      setImportMonth(initM)
      setBatchMonth(initM)
      setStep('upload')
      setFile(null)
      setRows([])
      setSearchTerm('')
      setPreviewFilter('all')
      setReassigningRowId(null)
    }
  }, [isOpen, selectedYear, selectedMonth])

  // Download sample template
  const handleDownloadTemplate = () => {
    try {
      const sampleData = [
        {
          'Student ID': 'BLUE001/2017',
          'Student Name': 'Abebe Kebede Tesfaye',
          'Amount': 1500,
          'Date': new Date().toISOString().split('T')[0],
          'Month': 'September',
          'Description': 'Tuition fee Meskerem',
          'Payment Code': 'PC-1001'
        },
        {
          'Student ID': 'BLUE002/2017',
          'Student Name': 'Tigist Haile Worku',
          'Amount': 1500,
          'Date': new Date().toISOString().split('T')[0],
          'Month': 'September',
          'Description': 'Bank deposit CBE FT240901',
          'Payment Code': ''
        },
        {
          'Student ID': 'BLUE003/2017',
          'Student Name': 'Dawit Alemu Mengistu',
          'Amount': 1800,
          'Date': new Date().toISOString().split('T')[0],
          'Month': 'Tikimt',
          'Description': 'Monthly fee payment',
          'Payment Code': 'PC-1003'
        }
      ]

      const ws = XLSX.utils.json_to_sheet(sampleData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Payments')
      XLSX.writeFile(wb, `Payment_Import_Template_${importYear}EC.xlsx`)
      toast.success(getText('Sample Excel template downloaded', 'የናሙና ኤክሴል አብነት ወርዷል'))
    } catch (err: any) {
      toast.error(getText('Failed to download template', 'አብነቱን ማውረድ አልተሳካም'))
    }
  }

  // Handle Drag & Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0])
    }
  }

  const validateAndSetFile = (selected: File) => {
    const ext = selected.name.split('.').pop()?.toLowerCase()
    if (!ext || !['xlsx', 'xls', 'csv', 'pdf'].includes(ext)) {
      toast.error(
        getText(
          'Please select a supported file (.xlsx, .xls, .csv, .pdf)',
          'እባክዎ የተደገፈ ፋይል ይምረጡ (.xlsx, .xls, .csv, .pdf)'
        )
      )
      return
    }
    setFile(selected)
  }

  // Parse file on server
  const handleAnalyzeFile = async () => {
    if (!file) {
      toast.error(getText('Please select an Excel or PDF file', 'እባክዎ የ Excel ወይም PDF ፋይል ይምረጡ'))
      return
    }

    setParsing(true)
    const toastId = toast.loading(
      getText('Analyzing file & matching students...', 'ፋይሉን እየመረመረ እና ተማሪዎችን እያዛመደ ነው...')
    )

    try {
      const token = localStorage.getItem('token')
      const formData = new FormData()
      formData.append('file', file)
      formData.append('defaultYear', String(importYear))
      formData.append('defaultMonth', importMonth)

      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/payments/parse-import`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })

      toast.dismiss(toastId)
      const { rows: parsedRows = [] } = res.data

      if (parsedRows.length === 0) {
        toast.error(
          getText(
            'No valid payment entries found in the file.',
            'በፋይሉ ውስጥ ምንም ትክክለኛ የክፍያ መረጃዎች አልተገኙም።'
          )
        )
        return
      }

      const targetM = importMonth || batchMonth || 'September'
      setBatchMonth(targetM)

      const normalizedRows: ParsedPaymentRow[] = parsedRows.map((r: ParsedPaymentRow) => {
        const m = r.month || targetM
        const isDup = r.studentId
          ? existingPayments.some(
              p =>
                (typeof p.studentId === 'string' ? p.studentId : p.studentId?._id) === r.studentId &&
                p.month === m &&
                Number(p.year) === Number(r.year || importYear)
            )
          : false
        return {
          ...r,
          month: m,
          isDuplicate: isDup,
          status: isDup ? 'duplicate' : (r.studentId ? 'matched' : 'unmatched'),
          selected: isDup ? duplicateMode === 'overwrite' : Boolean(r.studentId)
        }
      })

      setRows(normalizedRows)
      setStep('preview')

      const matchedCount = normalizedRows.filter((r: ParsedPaymentRow) => r.status === 'matched').length
      const unmatchedCount = normalizedRows.filter((r: ParsedPaymentRow) => r.status === 'unmatched').length
      const dupCount = normalizedRows.filter((r: ParsedPaymentRow) => r.status === 'duplicate').length
      toast.success(
        getText(
          `Extracted ${normalizedRows.length} records for ${getEthiopianMonthDisplay(targetM, language)} (${matchedCount} matched, ${dupCount} duplicates, ${unmatchedCount} unmatched)`,
          `${normalizedRows.length} መረጃዎች ለ ${getEthiopianMonthDisplay(targetM, language)} ወጥተዋል (${matchedCount} ተዛምደዋል፣ ${dupCount} ተደጋጋሚ፣ ${unmatchedCount} አልተዛመዱም)`
        )
      )
    } catch (err: any) {
      toast.dismiss(toastId)
      const msg = err.response?.data?.message || err.message || getText('Failed to analyze file', 'ፋይሉን መተንተን አልተሳካም')
      toast.error(msg)
    } finally {
      setParsing(false)
    }
  }

  // Manual student assignment for an unmatched row
  const handleAssignStudent = (rowId: string, targetStudentId: string) => {
    const student = students.find(s => s._id === targetStudentId)
    setRows(prev =>
      prev.map(r => {
        if (r.id !== rowId) return r
        if (!student) {
          return {
            ...r,
            studentId: null,
            student: null,
            status: 'unmatched',
            isDuplicate: false,
            selected: false
          }
        }

        // Check if duplicate for student + month + year
        const isDup = existingPayments.some(
          p =>
            (typeof p.studentId === 'string' ? p.studentId : p.studentId?._id) === student._id &&
            p.month === r.month &&
            Number(p.year) === Number(r.year || importYear)
        )

        return {
          ...r,
          studentId: student._id,
          student: {
            _id: student._id,
            studentId: student.studentId,
            name: `${student.firstName} ${student.middleName} ${student.lastName}`.trim(),
            class: student.class,
            section: student.section,
            paymentCode: student.paymentCode
          },
          status: isDup ? 'duplicate' : 'matched',
          isDuplicate: isDup,
          selected: isDup ? duplicateMode === 'overwrite' : true
        }
      })
    )
    setReassigningRowId(null)
  }

  // Row field modifications
  const handleRowChange = (rowId: string, field: keyof ParsedPaymentRow, value: any) => {
    setRows(prev =>
      prev.map(r => {
        if (r.id !== rowId) return r
        const updated = { ...r, [field]: value }

        // If month or year changed, re-check duplicate status
        if (field === 'month' || field === 'year') {
          if (updated.studentId) {
            const isDup = existingPayments.some(
              p =>
                (typeof p.studentId === 'string' ? p.studentId : p.studentId?._id) === updated.studentId &&
                p.month === updated.month &&
                Number(p.year) === Number(updated.year || importYear)
            )
            updated.isDuplicate = isDup
            updated.status = isDup ? 'duplicate' : (updated.studentId ? 'matched' : 'unmatched')
            if (isDup && duplicateMode === 'skip') {
              updated.selected = false
            }
          }
        }

        return updated
      })
    )
  }

  // Toggle selection
  const handleToggleRow = (rowId: string) => {
    setRows(prev => prev.map(r => (r.id === rowId ? { ...r, selected: !r.selected } : r)))
  }

  const handleToggleAll = (select: boolean) => {
    const visibleIds = new Set(filteredRows.map(r => r.id))
    setRows(prev =>
      prev.map(r => {
        if (visibleIds.has(r.id)) {
          return { ...r, selected: select && Boolean(r.studentId) }
        }
        return r
      })
    )
  }

  const applyMonthToAll = (targetM: string, notify: boolean = false) => {
    setBatchMonth(targetM)
    setRows(prev =>
      prev.map(r => {
        const isDup = r.studentId
          ? existingPayments.some(
              p =>
                (typeof p.studentId === 'string' ? p.studentId : p.studentId?._id) === r.studentId &&
                p.month === targetM &&
                Number(p.year) === Number(r.year || importYear)
            )
          : false
        return {
          ...r,
          month: targetM,
          isDuplicate: isDup,
          status: isDup ? 'duplicate' : (r.studentId ? 'matched' : 'unmatched'),
          selected: isDup ? duplicateMode === 'overwrite' : Boolean(r.studentId)
        }
      })
    )
    if (notify) {
      toast.success(
        getText(
          `Applied ${getEthiopianMonthDisplay(targetM, language)} to all rows`,
          `ሁሉም ረድፎች ወደ ${getEthiopianMonthDisplay(targetM, language)} ተቀይረዋል`
        )
      )
    }
  }

  const handleApplyBatchMonth = () => {
    applyMonthToAll(batchMonth, true)
  }

  // Filtered rows for Step 2
  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      // Filter tab
      if (previewFilter !== 'all' && r.status !== previewFilter) {
        return false
      }
      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const sName = r.student?.name?.toLowerCase() || ''
        const sId = r.student?.studentId?.toLowerCase() || ''
        const desc = r.description?.toLowerCase() || ''
        const amt = String(r.amount)
        const pCode = r.student?.paymentCode?.toLowerCase() || ''
        return sName.includes(q) || sId.includes(q) || desc.includes(q) || amt.includes(q) || pCode.includes(q)
      }
      return true
    })
  }, [rows, previewFilter, searchTerm])

  // Summary counts
  const summary = useMemo(() => {
    const total = rows.length
    const matched = rows.filter(r => r.status === 'matched').length
    const unmatched = rows.filter(r => r.status === 'unmatched').length
    const duplicate = rows.filter(r => r.status === 'duplicate').length
    const selectedRows = rows.filter(r => r.selected && r.studentId)
    const selectedCount = selectedRows.length
    const selectedAmount = selectedRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
    const totalAmount = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
    return { total, matched, unmatched, duplicate, selectedCount, selectedAmount, totalAmount }
  }, [rows])

  // Submit bulk import
  const handleConfirmImport = async () => {
    const selectedRows = rows.filter(r => r.selected && r.studentId)
    if (selectedRows.length === 0) {
      toast.error(
        getText(
          'Please select at least one matched record to import',
          'እባክዎ ለማስገባት ቢያንስ አንድ የተዛመደ መረጃ ይምረጡ'
        )
      )
      return
    }

    setSubmitting(true)
    const toastId = toast.loading(getText('Importing payments to system...', 'ክፍያዎችን ወደ ሲስተሙ እያስገባ ነው...'))

    try {
      const token = localStorage.getItem('token')
      const payload = selectedRows.map(r => ({
        studentId: r.studentId,
        month: r.month,
        year: Number(r.year || importYear),
        amount: Number(r.amount),
        description: r.description || '',
        paymentDate: r.paymentDate
      }))

      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/payments/bulk-import`,
        {
          payments: payload,
          mode: duplicateMode,
          year: importYear
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      toast.dismiss(toastId)
      const { created = 0, updated = 0, skipped = 0 } = res.data

      if (created === 0 && updated === 0) {
        toast(
          getText(
            `0 payments recorded. All ${skipped} records were skipped as duplicates because payments already exist for ${rows[0]?.month || importMonth} ${importYear}. Try changing the month using "Apply to All", or choose "Overwrite existing".`,
            `ምንም ክፍያ አልተመዘገበም። ሁሉም ${skipped} ክፍያዎች ለ ${rows[0]?.month || importMonth} ${importYear} አስቀድመው ስለተከፈሉ እንደ ተደጋጋሚ ታልፈዋል። ወሩን ለመቀየር ከላይ ያለውን "ለሁሉም ተግብር" ይጠቀሙ ወይም "ነባሮችን አዘምን" የሚለውን ይምረጡ።`
          ),
          { icon: '⚠️', duration: 8000 }
        )
        return
      }

      toast.success(
        getText(
          `Import successful: ${created} created, ${updated} updated, ${skipped} skipped`,
          `ማስገባት ተሳክቷል፡ ${created} አዲስ ተጨምረዋል፣ ${updated} ተሻሽለዋል፣ ${skipped} ታልፈዋል`
        ),
        { duration: 5000 }
      )

      const targetMonth = selectedRows[0]?.month || importMonth
      const targetYear = Number(selectedRows[0]?.year || importYear)
      onImportSuccess(targetMonth, targetYear)
      onClose()
    } catch (err: any) {
      toast.dismiss(toastId)
      const msg = err.response?.data?.message || err.message || getText('Failed to import payments', 'ክፍያዎችን ማስገባት አልተሳካም')
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div
        className={`relative w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
        }`}
      >
        {/* Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between flex-shrink-0 ${
            theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'bg-white/90 border-gray-100'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">
                  {getText('Import Payments', 'ክፍያዎችን አስገባ')}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                  {importYear} {getText('E.C', 'ዓ.ም')}
                </span>
              </div>
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {step === 'upload'
                  ? getText('Upload Excel or PDF statement to import payments', 'ክፍያዎችን ለማስገባት የ Excel ወይም PDF መግለጫ ይጫኑ')
                  : getText('Review extracted payments, verify student matching & import', 'የወጡትን ክፍያዎች ይገምግሙ፣ የተማሪዎችን መዛመድ ያረጋግጡና ያስገቡ')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark' ? 'hover:bg-gray-700 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-800'
            }`}
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {step === 'upload' ? (
            <div className="space-y-6">
              {/* Year & Month Config Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {getText('Target Academic Year', 'የትምህርት ዘመን (ዓ.ም)')}
                  </label>
                  <select
                    value={importYear}
                    onChange={(e) => setImportYear(Number(e.target.value))}
                    className={`w-full px-4 py-2.5 rounded-lg border font-medium focus:ring-2 focus:ring-blue-500 transition-colors ${
                      theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-800'
                    }`}
                  >
                    {availableYears.map(y => (
                      <option key={y} value={y}>
                        {y} {getText('E.C', 'ዓ.ም')}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    {getText('Payments will be recorded for this academic year', 'ክፍያዎች በዚህ የትምህርት ዘመን ይመዘገባሉ')}
                  </p>
                </div>

                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {getText('Default Academic Month', 'ነባሪ የትምህርት ወር')}
                  </label>
                  <select
                    value={importMonth}
                    onChange={(e) => {
                      const val = e.target.value
                      setImportMonth(val)
                      setBatchMonth(val)
                    }}
                    className={`w-full px-4 py-2.5 rounded-lg border font-medium focus:ring-2 focus:ring-blue-500 transition-colors ${
                      theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-800'
                    }`}
                  >
                    {ETHIOPIAN_ACADEMIC_MONTHS.map(m => (
                      <option key={m.value} value={m.value}>
                        {language === 'am' ? `${m.am} (${m.en})` : `${m.en} (${m.am})`}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    {getText('Used when row or statement does not specify month', 'መግለጫው ወር ካልጠቀሰ ይህ ወር ጥቅም ላይ ይውላል')}
                  </p>
                </div>
              </div>

              {/* Duplicate Handling Mode */}
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  {getText('Duplicate Handling (If already paid)', 'ተደጋጋሚ ክፍያዎች አያያዝ (አስቀድሞ ከተከፈለ)')}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setDuplicateMode('skip')}
                    className={`cursor-pointer p-3.5 rounded-xl border flex items-start gap-3 transition-all ${
                      duplicateMode === 'skip'
                        ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-900/30 ring-1 ring-blue-500'
                        : theme === 'dark'
                        ? 'border-gray-700 hover:bg-gray-750'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="duplicateMode"
                      checked={duplicateMode === 'skip'}
                      onChange={() => setDuplicateMode('skip')}
                      className="mt-1 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {getText('Skip duplicates (Recommended)', 'ተደጋጋሚዎችን እለፍ (የሚመከር)')}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {getText('Preserves existing payments without modification', 'ነባር ክፍያዎችን ሳይቀይር ያልተከፈሉትን ብቻ ያስገባል')}
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => setDuplicateMode('overwrite')}
                    className={`cursor-pointer p-3.5 rounded-xl border flex items-start gap-3 transition-all ${
                      duplicateMode === 'overwrite'
                        ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-900/30 ring-1 ring-blue-500'
                        : theme === 'dark'
                        ? 'border-gray-700 hover:bg-gray-750'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="duplicateMode"
                      checked={duplicateMode === 'overwrite'}
                      onChange={() => setDuplicateMode('overwrite')}
                      className="mt-1 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {getText('Overwrite / Update existing', 'ነባሮችን አዘምን / ይተኩ')}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {getText('Updates amount and date with file values', 'ነባር ክፍያዎችን በፋይሉ ውስጥ ባለው መጠን እና ቀን ያሻሽላል')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload Drop Zone */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={`block text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {getText('Upload File (Excel or PDF)', 'ፋይል ይጫኑ (Excel ወይም PDF)')}
                  </label>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>{getText('Download Sample Excel Template', 'የናሙና ኤክሴል አብነት አውርድ')}</span>
                  </button>
                </div>

                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all ${
                    dragActive
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 scale-[1.01]'
                      : file
                      ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20'
                      : theme === 'dark'
                      ? 'border-gray-600 hover:border-gray-500 bg-gray-700/30'
                      : 'border-gray-300 hover:border-gray-400 bg-gray-50/50'
                  }`}
                >
                  {file ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-bold text-base text-gray-900 dark:text-white break-all">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {(file.size / 1024).toFixed(1)} KB • {file.name.split('.').pop()?.toUpperCase()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <label className="cursor-pointer text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                          {getText('Change File', 'ፋይል ቀይር')}
                          <input
                            type="file"
                            accept=".xlsx,.xls,.csv,.pdf"
                            onChange={handleFileInput}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setFile(null)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
                        >
                          {getText('Remove', 'አስወግድ')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl mb-3">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <p className="text-base font-semibold text-gray-800 dark:text-gray-200">
                        {getText('Drag & drop your file here, or', 'ፋይልዎን እዚህ ይጎትቱ እና ይጣሉ፣ ወይም')}
                      </p>
                      <label className="mt-2 inline-block cursor-pointer px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all active:scale-95">
                        <span>{getText('Browse File', 'ፋይል ምረጥ')}</span>
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv,.pdf"
                          onChange={handleFileInput}
                          className="hidden"
                        />
                      </label>
                      <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-xs text-gray-500 dark:text-gray-400">
                        <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 font-mono">.XLSX</span>
                        <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 font-mono">.XLS</span>
                        <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 font-mono">.CSV</span>
                        <span className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 font-mono">.PDF</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tips & Guidance Box */}
              <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
                theme === 'dark' ? 'bg-gray-750/70 border-gray-700 text-gray-300' : 'bg-blue-50/50 border-blue-100 text-gray-600'
              }`}>
                <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{getText('Supported Information Extraction', 'የሚደገፍ የመረጃ አወጣጥ')}:</span>
                </p>
                <ul className="list-disc list-inside space-y-1 ml-1 text-gray-500 dark:text-gray-400">
                  <li>{getText('Extracts Amount, Payment Date, Description, and Student details automatically.', 'የክፍያ መጠን፣ ቀን፣ መግለጫ እና የተማሪ መረጃዎችን በራሱ ያወጣል።')}</li>
                  <li>{getText('Smart matching: matches student by Student ID (e.g. BLUE001), Payment Code, Full Name, or from Bank transfer narratives/descriptions (CBE, Telebirr, etc.).', 'ብልህ ማዛመድ፡ ተማሪውን በመታወቂያ ቁጥር (ምሳሌ፡ BLUE001)፣ በክፍያ ኮድ፣ በሙሉ ስም ወይም በባንክ ማስታወሻ መግለጫ በኩል ያዛምዳል።')}</li>
                  <li>{getText('You will review and can edit/reassign every row before committing.', 'ክፍያዎቹ ከመመዝገባቸው በፊት እያንዳንዱን ረድፍ አይተው ማስተካከል ይችላሉ።')}</li>
                </ul>
              </div>
            </div>
          ) : (
            /* Step 2: Preview & Match Table */
            <div className="space-y-4">
              {/* Stat Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <p className="text-xs text-gray-400">{getText('Total Records', 'ጠቅላላ መረጃዎች')}</p>
                  <p className="text-xl font-bold mt-0.5 text-blue-600 dark:text-blue-400">{summary.total}</p>
                </div>
                <div className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'}`}>
                  <p className="text-xs text-green-600 dark:text-green-400">{getText('Matched', 'የተዛመዱ')}</p>
                  <p className="text-xl font-bold mt-0.5 text-green-600 dark:text-green-400">{summary.matched}</p>
                </div>
                <div className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-amber-900/20 border-amber-800' : 'bg-amber-50 border-amber-200'}`}>
                  <p className="text-xs text-amber-600 dark:text-amber-400">{getText('Unmatched', 'ያልተዛመዱ')}</p>
                  <p className="text-xl font-bold mt-0.5 text-amber-600 dark:text-amber-400">{summary.unmatched}</p>
                </div>
                <div className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-purple-900/20 border-purple-800' : 'bg-purple-50 border-purple-200'}`}>
                  <p className="text-xs text-purple-600 dark:text-purple-400">{getText('Duplicates', 'ተደጋጋሚ')}</p>
                  <p className="text-xl font-bold mt-0.5 text-purple-600 dark:text-purple-400">{summary.duplicate}</p>
                </div>
                <div className={`p-3 rounded-xl border col-span-2 sm:col-span-1 ${theme === 'dark' ? 'bg-emerald-900/20 border-emerald-800' : 'bg-emerald-50 border-emerald-200'}`}>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">{getText('Total Amount', 'ጠቅላላ መጠን')}</p>
                  <p className="text-lg font-bold mt-0.5 text-emerald-600 dark:text-emerald-400 truncate">
                    {summary.totalAmount.toLocaleString()} ETB
                  </p>
                </div>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      previewFilter === 'all'
                        ? 'bg-blue-600 text-white'
                        : theme === 'dark'
                        ? 'bg-gray-750 text-gray-300 hover:bg-gray-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {getText('All', 'ሁሉም')} ({summary.total})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('matched')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      previewFilter === 'matched'
                        ? 'bg-green-600 text-white'
                        : theme === 'dark'
                        ? 'bg-gray-750 text-gray-300 hover:bg-gray-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {getText('Matched', 'የተዛመዱ')} ({summary.matched})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('unmatched')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      previewFilter === 'unmatched'
                        ? 'bg-amber-600 text-white'
                        : theme === 'dark'
                        ? 'bg-gray-750 text-gray-300 hover:bg-gray-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {getText('Unmatched', 'ያልተዛመዱ')} ({summary.unmatched})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('duplicate')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      previewFilter === 'duplicate'
                        ? 'bg-purple-600 text-white'
                        : theme === 'dark'
                        ? 'bg-gray-750 text-gray-300 hover:bg-gray-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {getText('Duplicates', 'ተደጋጋሚ')} ({summary.duplicate})
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:w-64">
                    <input
                      type="text"
                      placeholder={getText('Search rows...', 'ረድፎችን ፈልግ...')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border focus:ring-1 focus:ring-blue-500 ${
                        theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
                    />
                    <svg className="w-4 h-4 text-gray-400 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleAll(true)}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 whitespace-nowrap font-medium"
                  >
                    {getText('Select All', 'ሁሉንም ምረጥ')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleAll(false)}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 whitespace-nowrap font-medium"
                  >
                    {getText('Deselect', 'ሰርዝ')}
                  </button>
                </div>
              </div>

              {/* Batch Month Bar */}
              <div className={`p-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
                theme === 'dark' ? 'bg-gray-750/70 border-gray-700' : 'bg-blue-50/60 border-blue-100'
              }`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    {getText('Apply Month to All Records:', 'ወር ለሁሉም መረጃዎች ተግብር:')}
                  </span>
                  <select
                    value={batchMonth}
                    onChange={(e) => applyMonthToAll(e.target.value, true)}
                    className={`py-1 px-2.5 rounded-lg border font-medium focus:ring-1 focus:ring-blue-500 ${
                      theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                    }`}
                  >
                    {ETHIOPIAN_ACADEMIC_MONTHS.map(m => (
                      <option key={m.value} value={m.value}>
                        {language === 'am' ? `${m.am} (${m.en})` : `${m.en} (${m.am})`}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleApplyBatchMonth}
                    className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-all active:scale-95"
                  >
                    {getText('Apply to All', 'ለሁሉም ተግብር')}
                  </button>
                </div>
                <div className="text-gray-500 dark:text-gray-400 text-[11px]">
                  {getText('Updates month and re-evaluates duplicate status', 'ወርን ይቀይራል እና ተደጋጋሚነትን በድጋሚ ይፈትሻል')}
                </div>
              </div>

              {/* Rows Table */}
              <div className={`rounded-xl border overflow-hidden ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="overflow-x-auto max-h-[46vh]">
                  <table className="w-full text-left text-xs">
                    <thead className={`sticky top-0 z-10 uppercase tracking-wider font-semibold ${
                      theme === 'dark' ? 'bg-gray-750 text-gray-300 border-b border-gray-700' : 'bg-gray-100 text-gray-600 border-b border-gray-200'
                    }`}>
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={filteredRows.length > 0 && filteredRows.every(r => r.selected || !r.studentId)}
                            onChange={(e) => handleToggleAll(e.target.checked)}
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                        </th>
                        <th className="py-2.5 px-2 w-10">#</th>
                        <th className="py-2.5 px-3 w-28">{getText('Status', 'ሁኔታ')}</th>
                        <th className="py-2.5 px-3 min-w-[200px]">{getText('Student Match', 'የተማሪ መዛመድ')}</th>
                        <th className="py-2.5 px-3 w-32">{getText('Month', 'ወር')}</th>
                        <th className="py-2.5 px-3 w-28">{getText('Amount', 'መጠን')}</th>
                        <th className="py-2.5 px-3 w-32">{getText('Payment Date', 'ቀን')}</th>
                        <th className="py-2.5 px-3 min-w-[200px]">{getText('Description / Particulars', 'መግለጫ / ዝርዝር')}</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700/60' : 'divide-gray-100'}`}>
                      {filteredRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-gray-400">
                            {getText('No matching rows found in preview.', 'ምንም ተዛማጅ ረድፎች አልተገኙም።')}
                          </td>
                        </tr>
                      ) : (
                        filteredRows.map((row) => {
                          const isAssigned = Boolean(row.studentId)
                          const isReassigning = reassigningRowId === row.id

                          return (
                            <tr
                              key={row.id}
                              className={`transition-colors ${
                                row.selected
                                  ? theme === 'dark'
                                    ? 'bg-blue-950/20 hover:bg-blue-950/30'
                                    : 'bg-blue-50/40 hover:bg-blue-50/70'
                                  : theme === 'dark'
                                  ? 'hover:bg-gray-750/50'
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              {/* Checkbox */}
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={row.selected}
                                  disabled={!isAssigned}
                                  onChange={() => handleToggleRow(row.id)}
                                  className="rounded text-blue-600 focus:ring-blue-500 disabled:opacity-30"
                                />
                              </td>

                              {/* Row Index */}
                              <td className="py-2.5 px-2 text-gray-400 font-mono text-[11px]">
                                {row.rawIndex}
                              </td>

                              {/* Status Badge */}
                              <td className="py-2.5 px-3">
                                {row.status === 'matched' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                    {getText('Matched', 'ተዛምዷል')}
                                  </span>
                                ) : row.status === 'duplicate' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300" title={getText('Already paid for this month', 'ለዚህ ወር ተከፍሏል')}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                    {getText('Duplicate', 'ተደጋጋሚ')}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                    {getText('Unmatched', 'ያልተዛመደ')}
                                  </span>
                                )}
                              </td>

                              {/* Student Column */}
                              <td className="py-2.5 px-3">
                                {isAssigned && !isReassigning ? (
                                  <div className="flex items-center justify-between gap-2">
                                    <div>
                                      <p className="font-semibold text-gray-900 dark:text-white">
                                        {row.student?.name}
                                      </p>
                                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                                        <span className="font-mono text-blue-600 dark:text-blue-400">{row.student?.studentId}</span>
                                        {row.student?.class && (
                                          <span>• {row.student.class}{row.student.section ? ` (${row.student.section})` : ''}</span>
                                        )}
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setReassigningRowId(row.id)}
                                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline px-1.5 py-0.5 rounded"
                                    >
                                      {getText('Change', 'ቀይር')}
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <select
                                      defaultValue={row.studentId || ''}
                                      onChange={(e) => handleAssignStudent(row.id, e.target.value)}
                                      className={`w-full py-1 px-2 rounded border text-xs font-medium focus:ring-1 focus:ring-blue-500 ${
                                        theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                                      }`}
                                    >
                                      <option value="">{getText('Select a student to match...', 'ለማዛመድ ተማሪ ይምረጡ...')}</option>
                                      {students.map(s => (
                                        <option key={s._id} value={s._id}>
                                          {s.studentId} - {s.firstName} {s.middleName} ({s.class}{s.section ? `-${s.section}` : ''})
                                        </option>
                                      ))}
                                    </select>
                                    {isReassigning && (
                                      <button
                                        type="button"
                                        onClick={() => setReassigningRowId(null)}
                                        className="text-xs text-gray-400 hover:text-gray-200 px-1"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* Month Selector */}
                              <td className="py-2.5 px-3">
                                <select
                                  value={row.month}
                                  onChange={(e) => handleRowChange(row.id, 'month', e.target.value)}
                                  className={`w-full py-1 px-2 rounded border text-xs font-medium focus:ring-1 focus:ring-blue-500 ${
                                    theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                                  }`}
                                >
                                  {ETHIOPIAN_ACADEMIC_MONTHS.map(m => (
                                    <option key={m.value} value={m.value}>
                                      {language === 'am' ? m.am : m.en}
                                    </option>
                                  ))}
                                </select>
                              </td>

                              {/* Amount Input */}
                              <td className="py-2.5 px-3">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={row.amount}
                                  onChange={(e) => handleRowChange(row.id, 'amount', Number(e.target.value))}
                                  className={`w-full py-1 px-2 rounded border text-xs font-semibold focus:ring-1 focus:ring-blue-500 ${
                                    theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                                  }`}
                                />
                              </td>

                              {/* Payment Date Input */}
                              <td className="py-2.5 px-3">
                                <input
                                  type="date"
                                  value={row.paymentDate ? row.paymentDate.split('T')[0] : ''}
                                  onChange={(e) => handleRowChange(row.id, 'paymentDate', e.target.value)}
                                  className={`w-full py-1 px-2 rounded border text-xs font-medium focus:ring-1 focus:ring-blue-500 ${
                                    theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                                  }`}
                                />
                              </td>

                              {/* Description Text */}
                              <td className="py-2.5 px-3">
                                <input
                                  type="text"
                                  value={row.description}
                                  onChange={(e) => handleRowChange(row.id, 'description', e.target.value)}
                                  className={`w-full py-1 px-2 rounded border text-xs focus:ring-1 focus:ring-blue-500 truncate ${
                                    theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-700'
                                  }`}
                                  title={row.description}
                                />
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className={`px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0 ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'
          }`}
        >
          {step === 'upload' ? (
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={onClose}
                className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-colors border ${
                  theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-gray-300'
                    : 'bg-white hover:bg-gray-100 border-gray-300 text-gray-700'
                }`}
              >
                {getText('Cancel', 'ይቅር')}
              </button>

              <button
                type="button"
                onClick={handleAnalyzeFile}
                disabled={!file || parsing}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {parsing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{getText('Analyzing File...', 'ፋይሉን እየመረመረ ነው...')}</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span>{getText('Analyze & Preview Records', 'መርምር እና መረጃዎችን እይ')}</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className={`px-4 py-2 rounded-xl font-medium text-xs sm:text-sm transition-colors border flex items-center gap-1.5 ${
                    theme === 'dark'
                      ? 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-gray-300'
                      : 'bg-white hover:bg-gray-100 border-gray-300 text-gray-700'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>{getText('Back to Upload', 'ወደ ጫን ተመለስ')}</span>
                </button>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {getText('Selected', 'የተመረጡ')}:{' '}
                  <span className="font-bold text-gray-900 dark:text-white">
                    {summary.selectedCount} {getText('records', 'መረጃዎች')}
                  </span>{' '}
                  ({summary.selectedAmount.toLocaleString()} ETB)
                </p>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-xl font-medium text-xs sm:text-sm transition-colors border ${
                    theme === 'dark'
                      ? 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-gray-300'
                      : 'bg-white hover:bg-gray-100 border-gray-300 text-gray-700'
                  }`}
                >
                  {getText('Cancel', 'ይቅር')}
                </button>

                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={summary.selectedCount === 0 || submitting}
                  className="flex-1 sm:flex-none bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-6 py-2.5 rounded-xl font-semibold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>{getText('Importing...', 'እያስገባ ነው...')}</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>
                        {getText(
                          `Confirm & Import (${summary.selectedCount})`,
                          `አረጋግጥና አስገባ (${summary.selectedCount})`
                        )}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
