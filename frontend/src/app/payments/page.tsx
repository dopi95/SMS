
'use client'

import { useState, useEffect, useMemo } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { useSettings } from '@/contexts/SettingsContext'
import { usePermissions } from '@/contexts/PermissionsContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  formatDateWithBothCalendars,
  ETHIOPIAN_ACADEMIC_MONTHS,
  getCurrentEthiopianAcademicMonth,
  getCurrentEthiopianYear,
  getEthiopianMonthDisplay,
  sortPaymentsByAcademicDate
} from '@/utils/dateUtils'
import Pagination from '@/components/Pagination'
import ImportPaymentsModal from '@/components/ImportPaymentsModal'

interface Student {
  _id: string
  studentId: string
  firstName: string
  middleName: string
  lastName: string
  class: string
  section?: string
  fatherName?: string
  motherName?: string
  fatherPhone?: string
  motherPhone?: string
  paymentCode?: string
}

interface Payment {
  _id: string
  studentId: string
  month: string
  year: number
  amount: number
  description: string
  paymentDate: string
  status: string
}

const CLASS_OPTIONS = [
  { value: 'Nursery', en: 'Nursery', am: 'ጀማሪ' },
  { value: 'LKG', en: 'LKG', am: 'ደረጃ 1' },
  { value: 'UKG', en: 'UKG', am: 'ደረጃ 2' },
] as const

const formatClassBoth = (className?: string): string => {
  if (!className) return '-'
  const trimmed = className.trim()
  const matched = CLASS_OPTIONS.find(c => c.value.toLowerCase() === trimmed.toLowerCase())
  if (matched) {
    return `${matched.en} (${matched.am})`
  }
  const gradeMatch = trimmed.match(/^Grade\s*(\d+)$/i)
  if (gradeMatch) {
    return `${trimmed} (${gradeMatch[1]}ኛ ክፍል)`
  }
  return trimmed
}

const SECTION_OPTIONS = [
  { value: 'A', en: 'Section A', am: 'ክፍል ሀ' },
  { value: 'B', en: 'Section B', am: 'ክፍል ለ' },
  { value: 'C', en: 'Section C', am: 'ክፍል ሐ' },
  { value: 'D', en: 'Section D', am: 'ክፍል መ' },
] as const

const formatSectionBoth = (section?: string): string => {
  if (!section) return '-'
  const trimmed = section.trim()
  const matched = SECTION_OPTIONS.find(s => s.value.toLowerCase() === trimmed.toLowerCase())
  if (matched) {
    return `${matched.en} (${matched.am})`
  }
  return trimmed
}

let cachedNyalaBase64: string | null = null

const loadNyalaFont = async (doc: any): Promise<boolean> => {
  try {
    if (!cachedNyalaBase64) {
      const res = await fetch('/fonts/nyala.ttf')
      if (!res.ok) return false
      const fontBinary = await res.arrayBuffer()
      let binary = ''
      const bytes = new Uint8Array(fontBinary)
      const chunk = 8192
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)))
      }
      cachedNyalaBase64 = btoa(binary)
    }
    doc.addFileToVFS('Nyala.ttf', cachedNyalaBase64)
    doc.addFont('Nyala.ttf', 'Nyala', 'normal')
    doc.addFont('Nyala.ttf', 'Nyala', 'bold')
    return true
  } catch (err) {
    console.warn('Could not load Nyala font:', err)
    return false
  }
}

export default function PaymentsPage() {
  const { theme, getText, language } = useSettings()
  const { role, canDo } = usePermissions()
  const canManagePayments = canDo('payments', 'add') || canDo('payments', 'delete')
  const [students, setStudents] = useState<Student[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [allPayments, setAllPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const currentEcMonth = getCurrentEthiopianAcademicMonth()
  const currentEcYear = getCurrentEthiopianYear()

  const [selectedMonth, setSelectedMonth] = useState<string>(currentEcMonth)
  const [selectedYear, setSelectedYear] = useState<number>(currentEcYear)

  const baseStartYear = 2018
  const maxYear = Math.max(currentEcYear + 5, 2026)
  const availableYears = Array.from({ length: maxYear - baseStartYear + 1 }, (_, i) => baseStartYear + i)

  // Keep month and year aligned when Ethiopian month/year changes
  useEffect(() => {
    const timer = setInterval(() => {
      const nowMonth = getCurrentEthiopianAcademicMonth()
      const nowYear = getCurrentEthiopianYear()
      setSelectedMonth(prev => prev === currentEcMonth ? nowMonth : prev)
      setSelectedYear(prev => prev === currentEcYear ? nowYear : prev)
    }, 60000)
    return () => clearInterval(timer)
  }, [currentEcMonth, currentEcYear])
  const [showModal, setShowModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [studentHistory, setStudentHistory] = useState<Payment[]>([])
  const sortedStudentHistory = useMemo(() => {
    return sortPaymentsByAcademicDate(studentHistory, 'desc')
  }, [studentHistory])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all')
  const [classFilter, setClassFilter] = useState<string>('all')
  const [sectionFilter, setSectionFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showDateFilter, setShowDateFilter] = useState(false)
  const [studentTypeFilter, setStudentTypeFilter] = useState<'all' | 'regular' | 'special'>('all')
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [selectedPaidStudents, setSelectedPaidStudents] = useState<string[]>([])
  const [showBulkPaymentModal, setShowBulkPaymentModal] = useState(false)
  const [bulkAmount, setBulkAmount] = useState('')
  const [bulkDescription, setBulkDescription] = useState('')
  const [bulkPaymentDate, setBulkPaymentDate] = useState(new Date().toISOString().split('T')[0])

  const availableClasses = useMemo(() => {
    const list: { value: string; label: string }[] = CLASS_OPTIONS.map(c => ({
      value: c.value,
      label: `${c.en} (${c.am})`
    }))

    students.forEach(s => {
      if (s.class && !list.some(item => item.value.toLowerCase() === s.class.toLowerCase())) {
        list.push({
          value: s.class,
          label: formatClassBoth(s.class)
        })
      }
    })

    return list
  }, [students])

  const availableSections = useMemo(() => {
    const list: { value: string; label: string }[] = SECTION_OPTIONS.map(s => ({
      value: s.value,
      label: `${s.en} (${s.am})`
    }))

    students.forEach(s => {
      if (s.section && !list.some(item => item.value.toLowerCase() === s.section!.toLowerCase())) {
        list.push({
          value: s.section,
          label: formatSectionBoth(s.section)
        })
      }
    })

    return list
  }, [students])

  const PAGE_SIZE = 20
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedMonth, selectedYear, paymentFilter, classFilter, sectionFilter, studentTypeFilter, dateFrom, dateTo])

  useEffect(() => {
    fetchStudents()
    fetchAllPayments()
  }, [])



  useEffect(() => {
    if (students.length > 0) {
      fetchPayments()
    }
  }, [selectedMonth, selectedYear, students])

  const fetchAllPayments = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/payments`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setAllPayments(response.data)
    } catch (error) {
      console.error('Failed to fetch all payments:', error)
    }
  }

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/students`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setStudents(response.data)
    } catch (error) {
      toast.error(getText('Failed to fetch students', 'ተማሪዎችን መጫን አልተሳካም'))
    } finally {
      setLoading(false)
    }
  }

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem('token')
      const monthQuery = selectedMonth !== 'all' ? `month=${selectedMonth}&` : ''
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/payments?${monthQuery}year=${selectedYear}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setPayments(response.data)
    } catch (error) {
      console.error('Failed to fetch payments:', error)
    }
  }

  const handleCheckboxClick = (student: Student, isChecked: boolean) => {
    if (isChecked) {
      const existingPayment = payments.find(
        p => p.studentId === student._id && p.month === selectedMonth && p.year === selectedYear
      )
      if (existingPayment) {
        return
      }
      setSelectedStudent(student)
      setShowModal(true)
    } else {
      handleDeletePayment(student._id)
    }
  }

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudent) return

    try {
      const token = localStorage.getItem('token')
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/payments`,
        {
          studentId: selectedStudent._id,
          month: selectedMonth,
          year: selectedYear,
          amount: Number(amount),
          description,
          paymentDate
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success(getText('Payment added successfully', 'ክፍያ በተሳካ ሁኔታ ታክሏል'))
      setShowModal(false)
      setSelectedStudent(null)
      setAmount('')
      setDescription('')
      setPaymentDate(new Date().toISOString().split('T')[0])
      fetchPayments()
      fetchAllPayments()
    } catch (error: any) {
      toast.error(error.response?.data?.message || getText('Failed to add payment', 'ክፍያ መጨመር አልተሳካም'))
    }
  }

  const handleDeletePayment = async (studentId: string) => {
    const payment = payments.find(
      p => {
        const paymentStudentId = typeof p.studentId === 'string' ? p.studentId : (p.studentId as any)?._id
        return paymentStudentId === studentId && p.month === selectedMonth && p.year === selectedYear
      }
    )
    if (!payment) return

    // Confirmation dialog
    if (!confirm(getText('Are you sure you want to delete this payment?', 'እርግጠኛ ነዎት ይህን ክፍያ መሰረዝ ይፈልጋሉ?'))) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/payments/${payment._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success(getText('Payment deleted successfully', 'ክፍያ በተሳካ ሁኔታ ተሰርዟል'))
      fetchPayments()
      fetchAllPayments()
    } catch (error) {
      toast.error(getText('Failed to delete payment', 'ክፍያ መሰረዝ አልተሳካም'))
    }
  }

  const getStudentPaymentsForYear = (studentId: string) => {
    return payments.filter(p => {
      const paymentStudentId = typeof p.studentId === 'string' ? p.studentId : (p.studentId as any)?._id
      return paymentStudentId === studentId && Number(p.year) === Number(selectedYear)
    })
  }

  const getStudentPaidMonths = (studentId: string): string[] => {
    const studentPayments = getStudentPaymentsForYear(studentId)
    const paidList: string[] = []
    ETHIOPIAN_ACADEMIC_MONTHS.forEach(m => {
      if (studentPayments.some(p => p.month && p.month.toLowerCase() === m.value.toLowerCase())) {
        paidList.push(m.value)
      }
    })
    return paidList
  }

  const getStudentUnpaidMonths = (studentId: string): string[] => {
    const paidList = getStudentPaidMonths(studentId).map(m => m.toLowerCase())
    return ETHIOPIAN_ACADEMIC_MONTHS
      .filter(m => !paidList.includes(m.value.toLowerCase()))
      .map(m => m.value)
  }

  const isStudentPaid = (studentId: string) => {
    if (selectedMonth === 'all') {
      return getStudentPaidMonths(studentId).length > 0
    }
    return payments.some(
      p => {
        const paymentStudentId = typeof p.studentId === 'string' ? p.studentId : (p.studentId as any)?._id
        return paymentStudentId === studentId && p.month === selectedMonth && Number(p.year) === Number(selectedYear)
      }
    )
  }

  const handleSelectStudent = (studentId: string, isChecked: boolean, isPaid: boolean) => {
    if (isPaid) {
      if (isChecked) {
        setSelectedPaidStudents(prev => [...prev, studentId])
      } else {
        setSelectedPaidStudents(prev => prev.filter(id => id !== studentId))
      }
    } else {
      if (isChecked) {
        setSelectedStudents(prev => [...prev, studentId])
      } else {
        setSelectedStudents(prev => prev.filter(id => id !== studentId))
      }
    }
  }

  const handleSelectAll = (isChecked: boolean) => {
    if (isChecked) {
      const unpaidStudents = filteredStudents.filter(s => !isStudentPaid(s._id))
      const paidStudents = filteredStudents.filter(s => isStudentPaid(s._id))
      setSelectedStudents(unpaidStudents.map(s => s._id))
      setSelectedPaidStudents(paidStudents.map(s => s._id))
    } else {
      setSelectedStudents([])
      setSelectedPaidStudents([])
    }
  }

  const handleBulkPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedStudents.length === 0) return

    try {
      const token = localStorage.getItem('token')
      const promises = selectedStudents.map(studentId =>
        axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/payments`,
          {
            studentId,
            month: selectedMonth,
            year: selectedYear,
            amount: Number(bulkAmount),
            description: bulkDescription,
            paymentDate: bulkPaymentDate
          },
          { headers: { Authorization: `Bearer ${token}` } }
        )
      )
      await Promise.all(promises)
      toast.success(getText(`${selectedStudents.length} payments added successfully`, `${selectedStudents.length} ክፍያዎች በተሳካ ሁኔታ ታክለዋል`))
      setShowBulkPaymentModal(false)
      setSelectedStudents([])
      setBulkAmount('')
      setBulkDescription('')
      setBulkPaymentDate(new Date().toISOString().split('T')[0])
      fetchPayments()
      fetchAllPayments()
    } catch (error: any) {
      toast.error(error.response?.data?.message || getText('Failed to add payments', 'ክፍያዎችን መጨመር አልተሳካም'))
    }
  }

  const handleBulkUnpaid = async () => {
    if (selectedPaidStudents.length === 0) return

    if (!confirm(getText(`Are you sure you want to mark ${selectedPaidStudents.length} students as unpaid?`, `እርግጠኛ ነዎት ${selectedPaidStudents.length} ተማሪዎችን እንደ ያልተከፈለ ምልክት ማድረግ ይፈልጋሉ?`))) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const promises = selectedPaidStudents.map(studentId => {
        const payment = payments.find(p => {
          const paymentStudentId = typeof p.studentId === 'string' ? p.studentId : (p.studentId as any)?._id
          return paymentStudentId === studentId && p.month === selectedMonth && p.year === selectedYear
        })
        if (payment) {
          return axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/payments/${payment._id}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        }
        return Promise.resolve()
      })
      await Promise.all(promises)
      toast.success(getText(`${selectedPaidStudents.length} payments removed successfully`, `${selectedPaidStudents.length} ክፍያዎች በተሳካ ሁኔታ ተወግደዋል`))
      setSelectedPaidStudents([])
      fetchPayments()
      fetchAllPayments()
    } catch (error: any) {
      toast.error(error.response?.data?.message || getText('Failed to remove payments', 'ክፍያዎችን ማስወገድ አልተሳካም'))
    }
  }

  const handleShowHistory = async (student: Student) => {
    setSelectedStudent(student)
    setShowHistoryModal(true)
    setHistoryLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/payments/student/${student._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const sorted = sortPaymentsByAcademicDate<Payment>(response.data, 'desc')
      setStudentHistory(sorted)
    } catch (error) {
      toast.error(getText('Failed to fetch payment history', 'የክፍያ ታሪክ መጫን አልተሳካም'))
    } finally {
      setHistoryLoading(false)
    }
  }

  const formatMonthNamesForExport = (months: string[]): string => {
    if (months.length === 0) return '-'
    if (months.length === ETHIOPIAN_ACADEMIC_MONTHS.length) {
      return language === 'am' ? 'ሁሉም 10 ወራት (መስከረም - ሰኔ)' : 'All 10 Months (Meskerem - Sene)'
    }
    const formatted = months.map(mVal => {
      const m = ETHIOPIAN_ACADEMIC_MONTHS.find(item => item.value.toLowerCase() === mVal.toLowerCase())
      if (!m) return mVal
      return language === 'am' ? m.am : `${m.en} (${m.am})`
    })
    return formatted.join(', ')
  }

  const exportToPDF = async (type: 'paid' | 'unpaid' | 'all') => {
    setShowExportMenu(false)
    const isAllMonths = selectedMonth === 'all'

    const doc = new jsPDF({
      orientation: isAllMonths ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4'
    })
    const hasNyala = await loadNyalaFont(doc)
    const fontName = hasNyala ? 'Nyala' : 'helvetica'
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    // Title
    doc.setFont(fontName, 'bold')
    doc.setFontSize(16)
    const titleText = isAllMonths
      ? type === 'paid'
        ? 'Bluelight Academy - Paid Students Report (All Months)'
        : type === 'unpaid'
        ? 'Bluelight Academy - Unpaid Students Report (All Months)'
        : 'Bluelight Academy - Payment Report (All Months)'
      : 'Bluelight Academy - Payment Report'
    doc.text(titleText, 14, 18)

    // Period info
    doc.setFont(fontName, 'normal')
    doc.setFontSize(11)
    const periodText = isAllMonths
      ? `Academic Year: ${selectedYear} E.C (${selectedYear} ዓ.ም)  |  Scope: All Months (ሁሉም 10 ወራት)`
      : `Period: ${getEthiopianMonthDisplay(selectedMonth, 'en')} ${selectedYear} E.C`
    doc.text(periodText, 14, 26)

    let yPosition = 33
    const extraFilters: string[] = []
    if (classFilter !== 'all') extraFilters.push(`Class: ${formatClassBoth(classFilter)}`)
    if (sectionFilter !== 'all') extraFilters.push(`Section: ${formatSectionBoth(sectionFilter)}`)
    if (extraFilters.length > 0) {
      doc.text(extraFilters.join('  |  '), 14, yPosition)
      yPosition += 7
    }
    doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 14, yPosition)
    yPosition += 10

    if (isAllMonths) {
      let yearPayments = payments
      try {
        const token = localStorage.getItem('token')
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/payments?year=${selectedYear}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (Array.isArray(res.data)) {
          yearPayments = res.data
        }
      } catch (e) {
        console.error('Failed to fetch full year payments for export:', e)
      }

      const studentAnalysis = filteredStudents.map(student => {
        const studentPays = yearPayments.filter(p => {
          const pStudentId = typeof p.studentId === 'string' ? p.studentId : (p.studentId as any)?._id
          return pStudentId === student._id && Number(p.year) === Number(selectedYear)
        })

        const paidMonthsList: string[] = []
        let totalAmountPaid = 0
        ETHIOPIAN_ACADEMIC_MONTHS.forEach(m => {
          const matchingPay = studentPays.find(pay => pay.month && pay.month.toLowerCase() === m.value.toLowerCase())
          if (matchingPay) {
            paidMonthsList.push(m.value)
            totalAmountPaid += Number(matchingPay.amount) || 0
          }
        })

        const unpaidMonthsList = ETHIOPIAN_ACADEMIC_MONTHS
          .filter(m => !paidMonthsList.some(pm => pm.toLowerCase() === m.value.toLowerCase()))
          .map(m => m.value)

        return {
          student,
          paidMonths: paidMonthsList,
          unpaidMonths: unpaidMonthsList,
          paidCount: paidMonthsList.length,
          unpaidCount: unpaidMonthsList.length,
          totalAmountPaid
        }
      })

      const paidStudentsList = studentAnalysis.filter(s => s.paidCount > 0)
      const unpaidStudentsList = studentAnalysis.filter(s => s.unpaidCount > 0)

      if (type === 'paid' || type === 'all') {
        const totalPaidCollected = paidStudentsList.reduce((sum, s) => sum + s.totalAmountPaid, 0)
        doc.setFont(fontName, 'normal')
        doc.setFontSize(11)
        doc.text(
          `Total Students with Paid Months: ${paidStudentsList.length} of ${filteredStudents.length}  |  Total Amount: ${totalPaidCollected.toLocaleString()} ETB`,
          14,
          yPosition
        )
        yPosition += 8

        if (paidStudentsList.length > 0) {
          doc.setFont(fontName, 'bold')
          doc.setFontSize(13)
          doc.setTextColor(34, 197, 94)
          doc.text('Paid Students & Months Paid (የተከፈሉ ተማሪዎችና የወራት ዝርዝር)', 14, yPosition)
          doc.setTextColor(0, 0, 0)

          const paidTableData = paidStudentsList.map((item, idx) => [
            String(idx + 1),
            item.student.studentId || '-',
            `${item.student.firstName} ${item.student.middleName} ${item.student.lastName}`,
            formatClassBoth(item.student.class),
            item.student.section ? formatSectionBoth(item.student.section) : '-',
            formatMonthNamesForExport(item.paidMonths),
            `${item.paidCount} / 10`,
            `${item.totalAmountPaid.toLocaleString()} ETB`,
            item.student.fatherPhone || item.student.motherPhone || '-'
          ])

          autoTable(doc, {
            startY: yPosition + 4,
            head: [['#', 'Student ID', 'Student Name', 'Class', 'Section', 'Paid Months (የተከፈሉ ወራት)', 'Count', 'Total Paid', 'Parent Phone']],
            body: paidTableData,
            showHead: 'firstPage',
            theme: 'grid',
            styles: { font: fontName, fontSize: 8, overflow: 'linebreak' },
            headStyles: { fillColor: [34, 197, 94], font: fontName, fontStyle: 'bold', halign: 'center' },
            margin: { left: 14, right: 14 },
            columnStyles: {
              0: { cellWidth: 10, halign: 'center' },
              1: { cellWidth: 22, halign: 'center' },
              2: { cellWidth: 42 },
              3: { cellWidth: 22 },
              4: { cellWidth: 16, halign: 'center' },
              5: { cellWidth: 85 },
              6: { cellWidth: 18, halign: 'center' },
              7: { cellWidth: 26, halign: 'right' },
              8: { cellWidth: 28, halign: 'center' }
            }
          })

          yPosition = (doc as any).lastAutoTable.finalY + 12
        } else {
          doc.setFont(fontName, 'italic')
          doc.text('No students with paid months found.', 14, yPosition + 5)
          yPosition += 15
        }
      }

      if (type === 'unpaid' || type === 'all') {
        if (type === 'all' && (doc as any).lastAutoTable) {
          doc.addPage()
          yPosition = 20
        }

        doc.setFont(fontName, 'normal')
        doc.setFontSize(11)
        doc.text(
          `Total Students with Unpaid Months: ${unpaidStudentsList.length} of ${filteredStudents.length}`,
          14,
          yPosition
        )
        yPosition += 8

        if (unpaidStudentsList.length > 0) {
          doc.setFont(fontName, 'bold')
          doc.setFontSize(13)
          doc.setTextColor(220, 38, 38)
          doc.text('Unpaid Students & Months Pending (ያልተከፈሉ ተማሪዎችና የቀሩ ወራት ዝርዝር)', 14, yPosition)
          doc.setTextColor(0, 0, 0)

          const unpaidTableData = unpaidStudentsList.map((item, idx) => [
            String(idx + 1),
            item.student.studentId || '-',
            `${item.student.firstName} ${item.student.middleName} ${item.student.lastName}`,
            formatClassBoth(item.student.class),
            item.student.section ? formatSectionBoth(item.student.section) : '-',
            formatMonthNamesForExport(item.unpaidMonths),
            `${item.unpaidCount} / 10`,
            item.student.fatherPhone || '-',
            item.student.motherPhone || '-'
          ])

          autoTable(doc, {
            startY: yPosition + 4,
            head: [['#', 'Student ID', 'Student Name', 'Class', 'Section', 'Unpaid Months (ያልተከፈሉ ወራት)', 'Count', 'Father Phone', 'Mother Phone']],
            body: unpaidTableData,
            showHead: 'firstPage',
            theme: 'grid',
            styles: { font: fontName, fontSize: 8, overflow: 'linebreak' },
            headStyles: { fillColor: [220, 38, 38], font: fontName, fontStyle: 'bold', halign: 'center' },
            margin: { left: 14, right: 14 },
            columnStyles: {
              0: { cellWidth: 10, halign: 'center' },
              1: { cellWidth: 22, halign: 'center' },
              2: { cellWidth: 42 },
              3: { cellWidth: 22 },
              4: { cellWidth: 16, halign: 'center' },
              5: { cellWidth: 85 },
              6: { cellWidth: 18, halign: 'center' },
              7: { cellWidth: 27, halign: 'center' },
              8: { cellWidth: 27, halign: 'center' }
            }
          })
        } else {
          doc.setFont(fontName, 'italic')
          doc.text('All students have fully paid all months.', 14, yPosition + 5)
        }
      }

      // Page numbers footer
      const pageCount = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFont(fontName, 'normal')
        doc.setFontSize(8)
        doc.setTextColor(156, 163, 175)
        doc.text(
          `Page ${i} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 6,
          { align: 'center' }
        )
      }

      const fileName = type === 'paid'
        ? `Paid_Students_All_Months_${selectedYear}EC.pdf`
        : type === 'unpaid'
        ? `Unpaid_Students_All_Months_${selectedYear}EC.pdf`
        : `Payment_Report_All_Months_${selectedYear}EC.pdf`

      doc.save(fileName)
      toast.success(getText('PDF exported successfully', 'ፒዲኤፍ በተሳካ ሁኔታ ወጥቷል'))
      return
    }

    // Single Month Export Logic
    const paidStudents = filteredStudents.filter(s => isStudentPaid(s._id))
    const unpaidStudents = filteredStudents.filter(s => !isStudentPaid(s._id))

    if (type === 'paid' || type === 'all') {
      doc.setFont(fontName, 'normal')
      doc.setFontSize(11)
      doc.text(`Total Paid Students: ${paidStudents.length}`, 14, yPosition)
      yPosition += 10

      if (paidStudents.length > 0) {
        doc.setFont(fontName, 'bold')
        doc.setFontSize(14)
        doc.setTextColor(0, 128, 0)
        doc.text('Paid Students', 14, yPosition)
        doc.setTextColor(0, 0, 0)

        const paidData = paidStudents.map(student => {
          const payment = payments.find(p => {
            const paymentStudentId = typeof p.studentId === 'string' ? p.studentId : (p.studentId as any)?._id
            return paymentStudentId === student._id && p.month === selectedMonth && Number(p.year) === Number(selectedYear)
          })
          return [
            student.studentId,
            `${student.firstName} ${student.middleName} ${student.lastName}`,
            formatClassBoth(student.class),
            student.section ? formatSectionBoth(student.section) : '-',
            payment?.amount ? `${payment.amount} ETB` : '-',
            payment?.paymentDate ? formatDateWithBothCalendars(payment.paymentDate) : '-',
            payment?.description || '-'
          ]
        })

        autoTable(doc, {
          startY: yPosition + 5,
          head: [['Student ID', 'Name', 'Class', 'Section', 'Amount', 'Payment Date (G.C / E.C)', 'Description']],
          body: paidData,
          showHead: 'firstPage',
          theme: 'grid',
          styles: { font: fontName, fontSize: 8 },
          headStyles: { fillColor: [34, 197, 94], font: fontName, fontStyle: 'bold' },
          margin: { left: 14, right: 14 },
          columnStyles: {
            5: { cellWidth: 50 },
            6: { cellWidth: 40 }
          }
        })

        yPosition = (doc as any).lastAutoTable.finalY + 15
      }
    }

    if (type === 'unpaid' || type === 'all') {
      if (type === 'all' && yPosition > 250) {
        doc.addPage()
        yPosition = 20
      }

      if (type === 'unpaid') {
        doc.setFont(fontName, 'normal')
        doc.setFontSize(11)
        doc.text(`Total Unpaid Students: ${unpaidStudents.length}`, 14, yPosition)
        yPosition += 10
      }

      if (unpaidStudents.length > 0) {
        doc.setFont(fontName, 'bold')
        doc.setFontSize(14)
        doc.setTextColor(220, 38, 38)
        doc.text('Unpaid Students', 14, yPosition)
        doc.setTextColor(0, 0, 0)

        const unpaidData = unpaidStudents.map(student => [
          student.studentId,
          `${student.firstName} ${student.middleName} ${student.lastName}`,
          formatClassBoth(student.class),
          student.section ? formatSectionBoth(student.section) : '-',
          student.fatherPhone || '-',
          student.motherPhone || '-'
        ])

        autoTable(doc, {
          startY: yPosition + 5,
          head: [['Student ID', 'Name', 'Class', 'Section', 'Father Phone', 'Mother Phone']],
          body: unpaidData,
          showHead: 'firstPage',
          theme: 'grid',
          styles: { font: fontName, fontSize: 8 },
          headStyles: { fillColor: [220, 38, 38], font: fontName, fontStyle: 'bold' },
          margin: { left: 14, right: 14 }
        })
      }
    }

    // Save PDF
    const fileName = type === 'paid' 
      ? `Paid_Students_${selectedMonth}_${selectedYear}.pdf`
      : type === 'unpaid'
      ? `Unpaid_Students_${selectedMonth}_${selectedYear}.pdf`
      : `Payment_Report_${selectedMonth}_${selectedYear}.pdf`

    doc.save(fileName)
    toast.success(getText('PDF exported successfully', 'ፒዲኤፍ በተሳካ ሁኔታ ወጥቷል'))
  }

  const exportToExcel = async (type: 'paid' | 'unpaid' | 'all') => {
    setShowExportMenu(false)
    const isAllMonths = selectedMonth === 'all'

    if (isAllMonths) {
      let yearPayments = payments
      try {
        const token = localStorage.getItem('token')
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/payments?year=${selectedYear}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (Array.isArray(res.data)) {
          yearPayments = res.data
        }
      } catch (e) {
        console.error('Failed to fetch payments for Excel export:', e)
      }

      const studentAnalysis = filteredStudents.map(student => {
        const studentPays = yearPayments.filter(p => {
          const pStudentId = typeof p.studentId === 'string' ? p.studentId : (p.studentId as any)?._id
          return pStudentId === student._id && Number(p.year) === Number(selectedYear)
        })

        const paidMonthsList: string[] = []
        let totalAmountPaid = 0
        ETHIOPIAN_ACADEMIC_MONTHS.forEach(m => {
          const matchingPay = studentPays.find(pay => pay.month && pay.month.toLowerCase() === m.value.toLowerCase())
          if (matchingPay) {
            paidMonthsList.push(m.value)
            totalAmountPaid += Number(matchingPay.amount) || 0
          }
        })

        const unpaidMonthsList = ETHIOPIAN_ACADEMIC_MONTHS
          .filter(m => !paidMonthsList.some(pm => pm.toLowerCase() === m.value.toLowerCase()))
          .map(m => m.value)

        return {
          student,
          paidMonths: paidMonthsList,
          unpaidMonths: unpaidMonthsList,
          paidCount: paidMonthsList.length,
          unpaidCount: unpaidMonthsList.length,
          totalAmountPaid
        }
      })

      let rows: string[][] = []
      let fileName = ''

      if (type === 'paid') {
        const list = studentAnalysis.filter(s => s.paidCount > 0)
        fileName = `Paid_Students_All_Months_${selectedYear}EC.csv`
        rows = [
          ['#', 'Student ID', 'Student Name', 'Class', 'Section', 'Paid Months', 'Paid Count', 'Total Paid (ETB)', 'Parent Phone'],
          ...list.map((item, idx) => [
            String(idx + 1),
            item.student.studentId || '',
            `${item.student.firstName} ${item.student.middleName} ${item.student.lastName}`,
            item.student.class || '',
            item.student.section || '',
            formatMonthNamesForExport(item.paidMonths),
            `${item.paidCount} / 10`,
            String(item.totalAmountPaid),
            item.student.fatherPhone || item.student.motherPhone || ''
          ])
        ]
      } else if (type === 'unpaid') {
        const list = studentAnalysis.filter(s => s.unpaidCount > 0)
        fileName = `Unpaid_Students_All_Months_${selectedYear}EC.csv`
        rows = [
          ['#', 'Student ID', 'Student Name', 'Class', 'Section', 'Unpaid Months', 'Unpaid Count', 'Father Phone', 'Mother Phone'],
          ...list.map((item, idx) => [
            String(idx + 1),
            item.student.studentId || '',
            `${item.student.firstName} ${item.student.middleName} ${item.student.lastName}`,
            item.student.class || '',
            item.student.section || '',
            formatMonthNamesForExport(item.unpaidMonths),
            `${item.unpaidCount} / 10`,
            item.student.fatherPhone || '',
            item.student.motherPhone || ''
          ])
        ]
      } else {
        fileName = `Payment_Report_All_Months_${selectedYear}EC.csv`
        rows = [
          ['#', 'Student ID', 'Student Name', 'Class', 'Section', 'Paid Months', 'Paid Count', 'Unpaid Months', 'Unpaid Count', 'Total Paid (ETB)', 'Father Phone', 'Mother Phone'],
          ...studentAnalysis.map((item, idx) => [
            String(idx + 1),
            item.student.studentId || '',
            `${item.student.firstName} ${item.student.middleName} ${item.student.lastName}`,
            item.student.class || '',
            item.student.section || '',
            formatMonthNamesForExport(item.paidMonths),
            `${item.paidCount} / 10`,
            formatMonthNamesForExport(item.unpaidMonths),
            `${item.unpaidCount} / 10`,
            String(item.totalAmountPaid),
            item.student.fatherPhone || '',
            item.student.motherPhone || ''
          ])
        ]
      }

      const csvContent = '\uFEFF' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success(getText('Excel (CSV) exported successfully', 'ኤክሴል (CSV) በተሳካ ሁኔታ ወጥቷል'))
      return
    }

    // Single Month Excel Export
    const paidStudents = filteredStudents.filter(s => isStudentPaid(s._id))
    const unpaidStudents = filteredStudents.filter(s => !isStudentPaid(s._id))
    let rows: string[][] = []
    let fileName = ''

    if (type === 'paid') {
      fileName = `Paid_Students_${selectedMonth}_${selectedYear}EC.csv`
      rows = [
        ['#', 'Student ID', 'Student Name', 'Class', 'Section', 'Month', 'Year', 'Amount (ETB)', 'Payment Date', 'Description'],
        ...paidStudents.map((s, idx) => {
          const payment = payments.find(p => {
            const paymentStudentId = typeof p.studentId === 'string' ? p.studentId : (p.studentId as any)?._id
            return paymentStudentId === s._id && p.month === selectedMonth && Number(p.year) === Number(selectedYear)
          })
          return [
            String(idx + 1),
            s.studentId || '',
            `${s.firstName} ${s.middleName} ${s.lastName}`,
            s.class || '',
            s.section || '',
            selectedMonth,
            String(selectedYear),
            payment?.amount ? String(payment.amount) : '',
            payment?.paymentDate ? payment.paymentDate.split('T')[0] : '',
            payment?.description || ''
          ]
        })
      ]
    } else if (type === 'unpaid') {
      fileName = `Unpaid_Students_${selectedMonth}_${selectedYear}EC.csv`
      rows = [
        ['#', 'Student ID', 'Student Name', 'Class', 'Section', 'Month', 'Year', 'Status', 'Father Phone', 'Mother Phone'],
        ...unpaidStudents.map((s, idx) => [
          String(idx + 1),
          s.studentId || '',
          `${s.firstName} ${s.middleName} ${s.lastName}`,
          s.class || '',
          s.section || '',
          selectedMonth,
          String(selectedYear),
          'Unpaid',
          s.fatherPhone || '',
          s.motherPhone || ''
        ])
      ]
    } else {
      fileName = `Payment_Report_${selectedMonth}_${selectedYear}EC.csv`
      rows = [
        ['#', 'Student ID', 'Student Name', 'Class', 'Section', 'Month', 'Year', 'Status', 'Amount (ETB)', 'Payment Date', 'Father Phone', 'Mother Phone'],
        ...filteredStudents.map((s, idx) => {
          const isPaid = isStudentPaid(s._id)
          const payment = payments.find(p => {
            const paymentStudentId = typeof p.studentId === 'string' ? p.studentId : (p.studentId as any)?._id
            return paymentStudentId === s._id && p.month === selectedMonth && Number(p.year) === Number(selectedYear)
          })
          return [
            String(idx + 1),
            s.studentId || '',
            `${s.firstName} ${s.middleName} ${s.lastName}`,
            s.class || '',
            s.section || '',
            selectedMonth,
            String(selectedYear),
            isPaid ? 'Paid' : 'Unpaid',
            payment?.amount ? String(payment.amount) : '',
            payment?.paymentDate ? payment.paymentDate.split('T')[0] : '',
            s.fatherPhone || '',
            s.motherPhone || ''
          ]
        })
      ]
    }

    const csvContent = '\uFEFF' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success(getText('Excel (CSV) exported successfully', 'ኤክሴል (CSV) በተሳካ ሁኔታ ወጥቷል'))
  }

  const generateAnnualPaymentReportPDF = async () => {
    if (filteredStudents.length === 0) {
      toast.error(getText('No students to generate report for', 'ሪፖርት የሚወጣላቸው ተማሪዎች የሉም'))
      return
    }

    setGeneratingReport(true)
    const toastId = toast.loading(getText('Generating annual payment report PDF...', 'ዓመታዊ የክፍያ ሪፖርት ፒዲኤፍ እየተዘጋጀ ነው...'))

    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/payments?year=${selectedYear}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const yearPayments: Payment[] = Array.isArray(res.data) ? res.data : []

      // Create landscape jsPDF instance (A4: 297mm x 210mm)
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })

      const hasNyala = await loadNyalaFont(doc)
      const fontName = hasNyala ? 'Nyala' : 'helvetica'

      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()

      // Header Banner
      doc.setFillColor(30, 58, 138)
      doc.rect(0, 0, pageWidth, 20, 'F')

      doc.setTextColor(255, 255, 255)
      doc.setFont(fontName, 'bold')
      doc.setFontSize(15)
      doc.text('Bluelight Academy', pageWidth / 2, 8, { align: 'center' })

      doc.setFontSize(10.5)
      doc.setFont(fontName, 'normal')
      doc.text(
        `Annual Student Payment Report — ${selectedYear} E.C (${selectedYear} ዓ.ም የትምህርት ክፍያ ሪፖርት)`,
        pageWidth / 2,
        15,
        { align: 'center' }
      )

      // Class info box (Class is enough, scope text removed)
      doc.setFillColor(243, 244, 246)
      doc.rect(8, 23, pageWidth - 16, 9, 'F')
      doc.setDrawColor(209, 213, 219)
      doc.rect(8, 23, pageWidth - 16, 9, 'S')

      doc.setTextColor(31, 41, 55)
      doc.setFont(fontName, 'bold')
      doc.setFontSize(9.5)

      let classInfoText = classFilter !== 'all'
        ? `Class: ${formatClassBoth(classFilter)}`
        : 'Class: All Classes (ሁሉም ክፍሎች)'
      if (sectionFilter !== 'all') {
        classInfoText += `  |  Section: ${formatSectionBoth(sectionFilter)}`
      }

      doc.text(classInfoText, 12, 29)

      doc.setFont(fontName, 'normal')
      doc.setFontSize(8.5)
      const metaRight = `Total Students: ${filteredStudents.length}  |  Generated: ${new Date().toLocaleDateString()}`
      doc.text(metaRight, pageWidth - 12, 29, { align: 'right' })

      // 10 academic months: Meskerem + Registration Fee then other 9 months in order
      const reportMonths = [
        { value: 'September', header: 'Meskerem + Registration Fee\n(መስከረም + የምዝገባ ክፍያ)' },
        { value: 'October',   header: 'Tikimt\n(ጥቅምት)' },
        { value: 'November',  header: 'Hidar\n(ህዳር)' },
        { value: 'December',  header: 'Tahsas\n(ታህሳስ)' },
        { value: 'January',   header: 'Tir\n(ጥር)' },
        { value: 'February',  header: 'Yekatit\n(የካቲት)' },
        { value: 'March',     header: 'Megabit\n(መጋቢት)' },
        { value: 'April',     header: 'Miazia\n(ሚያዚያ)' },
        { value: 'May',       header: 'Ginbot\n(ግንቦት)' },
        { value: 'June',      header: 'Sene\n(ሰኔ)' },
      ]

      const headRow = [
        '#',
        'Student Name\n(የተማሪ ስም)',
        ...reportMonths.map(m => m.header),
        'Total\n(ጠቅላላ)'
      ]

      // Month totals for summary row
      const monthTotals: number[] = new Array(reportMonths.length).fill(0)
      let grandTotal = 0

      // Build rows
      const bodyRows = filteredStudents.map((student, idx) => {
        let studentTotal = 0
        const monthCells = reportMonths.map((m, mIdx) => {
          const p = yearPayments.find(pay => {
            const pStudentId = typeof pay.studentId === 'string' ? pay.studentId : (pay.studentId as any)?._id
            return pStudentId === student._id && pay.month.toLowerCase() === m.value.toLowerCase()
          })

          if (p && p.amount) {
            const amt = Number(p.amount) || 0
            studentTotal += amt
            monthTotals[mIdx] += amt
            const dateStr = p.paymentDate
              ? new Date(p.paymentDate).toLocaleDateString('en-GB')
              : ''
            return dateStr ? `${amt.toLocaleString()} ETB\n${dateStr}` : `${amt.toLocaleString()} ETB`
          }
          return '-'
        })

        grandTotal += studentTotal

        return [
          String(idx + 1),
          `${student.firstName} ${student.middleName} ${student.lastName}`,
          ...monthCells,
          `${studentTotal.toLocaleString()} ETB`
        ]
      })

      // Summary row
      const footRow = [
        '',
        'TOTAL / ጠቅላላ',
        ...monthTotals.map(t => (t > 0 ? `${t.toLocaleString()} ETB` : '-')),
        `${grandTotal.toLocaleString()} ETB`
      ]

      autoTable(doc, {
        startY: 35,
        head: [headRow],
        body: bodyRows,
        foot: [footRow],
        showHead: 'firstPage',
        showFoot: 'lastPage',
        theme: 'grid',
        styles: {
          font: fontName,
          fontSize: 6.5,
          cellPadding: 1.5,
          valign: 'middle',
          halign: 'center',
          overflow: 'linebreak',
          lineColor: [209, 213, 219],
          lineWidth: 0.2
        },
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: 255,
          font: fontName,
          fontSize: 6.5,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          cellPadding: 2
        },
        footStyles: {
          fillColor: [243, 244, 246],
          textColor: [17, 24, 39],
          font: fontName,
          fontSize: 7.5,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle'
        },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 39, halign: 'left', fontSize: 7 },
          2: { cellWidth: 24, halign: 'center' },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 20, halign: 'center' },
          5: { cellWidth: 20, halign: 'center' },
          6: { cellWidth: 20, halign: 'center' },
          7: { cellWidth: 20, halign: 'center' },
          8: { cellWidth: 20, halign: 'center' },
          9: { cellWidth: 20, halign: 'center' },
          10: { cellWidth: 20, halign: 'center' },
          11: { cellWidth: 20, halign: 'center' },
          12: { cellWidth: 24, halign: 'right', fontStyle: 'bold', fontSize: 8 }
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251]
        },
        didParseCell: (data) => {
          if (data.section === 'body') {
            if (data.column.index >= 2 && data.column.index <= 11) {
              const txt = Array.isArray(data.cell.text) ? data.cell.text.join(' ') : String(data.cell.text)
              if (txt.includes('ETB')) {
                data.cell.styles.fontStyle = 'bold'
                data.cell.styles.fontSize = 7.5
                data.cell.styles.textColor = [17, 24, 39]
              }
            } else if (data.column.index === 12) {
              data.cell.styles.fontStyle = 'bold'
              data.cell.styles.fontSize = 8
              data.cell.styles.textColor = [17, 24, 39]
            }
          }
        },
        margin: { left: 8, right: 8, top: 10, bottom: 10 },
        didDrawPage: (data) => {
          const str = `Page ${data.pageNumber}`
          doc.setFont(fontName, 'normal')
          doc.setFontSize(8)
          doc.setTextColor(156, 163, 175)
          doc.text(str, pageWidth / 2, pageHeight - 5, { align: 'center' })
        }
      })

      const scopePart = classFilter !== 'all' ? `-${classFilter}` : ''
      const secPart = sectionFilter !== 'all' ? `-Sec${sectionFilter}` : ''
      const fileName = `Annual_Payment_Report_${selectedYear}EC${scopePart}${secPart}.pdf`

      doc.save(fileName)
      toast.success(getText('Annual payment report downloaded successfully', 'ዓመታዊ የክፍያ ሪፖርት በተሳካ ሁኔታ ወርዷል'), { id: toastId })
    } catch (err: any) {
      console.error('Failed to generate annual payment report:', err)
      toast.error(err.message || getText('Failed to generate report', 'ሪፖርት ማውጣት አልተሳካም'), { id: toastId })
    } finally {
      setGeneratingReport(false)
    }
  }

  const filteredStudents = students.filter(student => {
    const searchLower = searchTerm.toLowerCase()
    const studentName = `${student.firstName} ${student.middleName} ${student.lastName}`.toLowerCase()
    const studentId = student.studentId?.toLowerCase() || ''
    const fatherName = student.fatherName?.toLowerCase() || ''
    const motherName = student.motherName?.toLowerCase() || ''
    const fatherPhone = student.fatherPhone?.toLowerCase() || ''
    const motherPhone = student.motherPhone?.toLowerCase() || ''
    
    // Check if student has payment for current month/year and get payment details
    const studentPayment = payments.find(p => {
      const paymentStudentId = typeof p.studentId === 'string' ? p.studentId : (p.studentId as any)?._id
      if (selectedMonth === 'all') {
        return paymentStudentId === student._id && Number(p.year) === Number(selectedYear)
      }
      return paymentStudentId === student._id && p.month === selectedMonth && Number(p.year) === Number(selectedYear)
    })
    
    const paymentDescription = studentPayment?.description?.toLowerCase() || ''
    const paymentAmount = studentPayment?.amount?.toString() || ''

    // Check descriptions across all months for this student
    const anyDescriptionMatches = allPayments.some(p => {
      const paymentStudentId = typeof p.studentId === 'string' ? p.studentId : (p.studentId as any)?._id
      return paymentStudentId === student._id && p.description?.toLowerCase().includes(searchLower)
    })
    
    // Search filter
    const matchesSearch = (
      studentName.includes(searchLower) ||
      studentId.includes(searchLower) ||
      fatherName.includes(searchLower) ||
      motherName.includes(searchLower) ||
      fatherPhone.includes(searchLower) ||
      motherPhone.includes(searchLower) ||
      paymentDescription.includes(searchLower) ||
      paymentAmount.includes(searchLower) ||
      anyDescriptionMatches
    )
    
    if (!matchesSearch) return false
    
    // Payment status filter
    const isPaid = isStudentPaid(student._id)
    if (selectedMonth === 'all') {
      const paidMonthsCount = getStudentPaidMonths(student._id).length
      if (paymentFilter === 'paid' && paidMonthsCount === 0) return false
      if (paymentFilter === 'unpaid' && paidMonthsCount === ETHIOPIAN_ACADEMIC_MONTHS.length) return false
    } else {
      if (paymentFilter === 'paid' && !isPaid) return false
      if (paymentFilter === 'unpaid' && isPaid) return false
    }
    
    // Date range filter (only for paid students)
    if (isPaid && studentPayment && (dateFrom || dateTo)) {
      const paymentDate = new Date(studentPayment.paymentDate)
      paymentDate.setHours(0, 0, 0, 0) // Reset time to start of day
      
      if (dateFrom) {
        const fromDate = new Date(dateFrom)
        fromDate.setHours(0, 0, 0, 0)
        if (paymentDate < fromDate) return false
      }
      
      if (dateTo) {
        const toDate = new Date(dateTo)
        toDate.setHours(23, 59, 59, 999) // Set to end of day
        if (paymentDate > toDate) return false
      }
    }
    
    // Class filter
    if (classFilter !== 'all' && student.class?.toLowerCase() !== classFilter.toLowerCase()) {
      return false
    }

    // Section filter
    if (sectionFilter !== 'all' && student.section?.toLowerCase() !== sectionFilter.toLowerCase()) {
      return false
    }

    // Student type filter
    if (studentTypeFilter !== 'all') {
      const hasPaymentCode = student.paymentCode && student.paymentCode.trim() !== ''
      if (studentTypeFilter === 'regular' && !hasPaymentCode) return false
      if (studentTypeFilter === 'special' && hasPaymentCode) return false
    }
    
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE))
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const endIndex = Math.min(startIndex + PAGE_SIZE, filteredStudents.length)
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex)

  return (
    <DashboardLayout pageTitle={getText('Monthly Payments', 'ወርሃዊ ክፍያዎች')}>
      <div className={`min-h-screen p-6 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {/* Total Students Card */}
            <div className={`rounded-xl shadow-lg border p-6 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {getText('Total Students', 'ጠቅላላ ተማሪዎች')}
                  </p>
                  <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {filteredStudents.length}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Paid Students Card */}
            <div className={`rounded-xl shadow-lg border p-6 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {getText('Paid Students', 'የተከፈለ ተማሪዎች')}
                  </p>
                  <p className={`text-3xl font-bold mt-2 text-green-600`}>
                    {selectedMonth === 'all'
                      ? filteredStudents.filter(s => getStudentPaidMonths(s._id).length > 0).length
                      : filteredStudents.filter(s => isStudentPaid(s._id)).length}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Unpaid Students Card */}
            <div className={`rounded-xl shadow-lg border p-6 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {getText('Unpaid Students', 'ያልተከፈለ ተማሪዎች')}
                  </p>
                  <p className={`text-3xl font-bold mt-2 text-red-600`}>
                    {selectedMonth === 'all'
                      ? filteredStudents.filter(s => getStudentPaidMonths(s._id).length < ETHIOPIAN_ACADEMIC_MONTHS.length).length
                      : filteredStudents.filter(s => !isStudentPaid(s._id)).length}
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Total Amount Collected Card */}
            {role !== 'executive' && (
            <div className={`rounded-xl shadow-lg border p-6 ${theme === 'dark' ? 'bg-gradient-to-r from-green-900 to-green-800 border-green-700' : 'bg-gradient-to-r from-green-50 to-green-100 border-green-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-green-200' : 'text-green-700'}`}>
                    {getText('Total Collected', 'ጠቅላላ የተሰበሰበ')}
                  </p>
                  <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-green-100' : 'text-green-800'}`}>
                    {filteredStudents
                      .reduce((total, student) => {
                        if (selectedMonth === 'all') {
                          const studentPays = payments.filter(p => {
                            const paymentStudentId = typeof p.studentId === 'string' ? p.studentId : (p.studentId as any)?._id
                            return paymentStudentId === student._id && Number(p.year) === Number(selectedYear)
                          })
                          return total + studentPays.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
                        }
                        const payment = payments.find(p => {
                          const paymentStudentId = typeof p.studentId === 'string' ? p.studentId : (p.studentId as any)?._id
                          return paymentStudentId === student._id && p.month === selectedMonth && Number(p.year) === Number(selectedYear)
                        })
                        return total + (Number(payment?.amount) || 0)
                      }, 0).toLocaleString()} ETB
                  </p>
                </div>
                <div className={`p-3 rounded-full ${theme === 'dark' ? 'bg-green-800' : 'bg-green-200'}`}>
                  <svg className={`w-8 h-8 ${theme === 'dark' ? 'text-green-200' : 'text-green-700'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            )}
          </div>

          <div className={`rounded-xl shadow-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className={`px-6 py-5 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                  <h1 className={`text-2xl md:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {getText('Monthly Payments', 'ወርሃዊ ክፍያዎች')}
                  </h1>
                  <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {getText('Manage student monthly payments', 'የተማሪዎች ወርሃዊ ክፍያዎችን ያስተዳድሩ')}
                  </p>
                </div>
                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                  {canManagePayments && selectedMonth !== 'all' && selectedStudents.length > 0 && (
                    <button
                      onClick={() => setShowBulkPaymentModal(true)}
                      className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{getText(`Mark ${selectedStudents.length} as Paid`, `${selectedStudents.length} እንደ ተከፍሏል ምልክት አድርግ`)}</span>
                    </button>
                  )}
                  {canManagePayments && selectedMonth !== 'all' && selectedPaidStudents.length > 0 && (
                    <button
                      onClick={handleBulkUnpaid}
                      className="w-full md:w-auto bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>{getText(`Mark ${selectedPaidStudents.length} as Unpaid`, `${selectedPaidStudents.length} እንደ ያልተከፈለ ምልክት አድርግ`)}</span>
                    </button>
                  )}
                  <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto">
                    <button
                      onClick={generateAnnualPaymentReportPDF}
                      disabled={generatingReport}
                      className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white px-4 md:px-5 py-2.5 md:py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap disabled:opacity-60"
                      title={getText('Generate Annual Payment Report (10 Months Table)', 'ዓመታዊ የክፍያ ሪፖርት አውጣ (የ10 ወራት ሠንጠረዥ)')}
                    >
                      {generatingReport ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                      <span className="text-sm md:text-base font-semibold">{getText('Generate Payment Report', 'የክፍያ ሪፖርት አውጣ')}</span>
                    </button>

                    {canManagePayments && (
                      <button
                        onClick={() => setShowImportModal(true)}
                        className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-4 md:px-5 py-2.5 md:py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap"
                        title={getText('Import Payments from Excel or PDF', 'ክፍያዎችን ከ Excel ወይም PDF አስገባ')}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <span className="text-sm md:text-base font-semibold">{getText('Import Payments', 'ክፍያዎችን አስገባ')}</span>
                      </button>
                    )}

                    <div className="relative w-full sm:w-auto">
                      <button
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 md:px-5 py-2.5 md:py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-sm md:text-base">{getText('Export', 'ወደ ውጭ አውጣ')}</span>
                        <svg className={`w-4 h-4 ml-0.5 transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {showExportMenu && (
                        <>
                          {/* Desktop click-away backdrop */}
                          <div
                            className="hidden md:block fixed inset-0 z-40"
                            onClick={() => setShowExportMenu(false)}
                          />

                          {/* Desktop Dropdown */}
                          <div className={`hidden md:block absolute right-0 mt-2 w-72 rounded-xl shadow-2xl z-50 overflow-hidden border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 divide-y divide-gray-700' : 'bg-white border-gray-200 divide-y divide-gray-100'}`}>
                            {/* PDF Options */}
                            <div className="p-2">
                              <p className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                {getText('PDF Reports', 'የፒዲኤፍ ሪፖርቶች')}
                              </p>
                              <button
                                onClick={() => exportToPDF('paid')}
                                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 transition-colors text-sm ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-green-50 text-gray-700'}`}
                              >
                                <div className="w-2.5 h-2.5 bg-green-500 rounded-full flex-shrink-0"></div>
                                <span className="font-medium truncate">{getText('Export Paid Students (PDF)', 'የተከፈለ ተማሪዎች (PDF)')}</span>
                              </button>
                              <button
                                onClick={() => exportToPDF('unpaid')}
                                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 transition-colors text-sm ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-red-50 text-gray-700'}`}
                              >
                                <div className="w-2.5 h-2.5 bg-red-500 rounded-full flex-shrink-0"></div>
                                <span className="font-medium truncate">{getText('Export Unpaid Students (PDF)', 'ያልተከፈለ ተማሪዎች (PDF)')}</span>
                              </button>
                              <button
                                onClick={() => exportToPDF('all')}
                                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 transition-colors text-sm ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-blue-50 text-gray-700'}`}
                              >
                                <div className="w-2.5 h-2.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                                <span className="font-medium truncate">{getText('Export All Students (PDF)', 'ሁሉንም ተማሪዎች (PDF)')}</span>
                              </button>
                            </div>

                            {/* Excel / CSV Options */}
                            <div className="p-2">
                              <p className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                {getText('Excel (CSV) Export', 'ኤክሴል (CSV) አውጣ')}
                              </p>
                              <button
                                onClick={() => exportToExcel('paid')}
                                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 transition-colors text-sm ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-green-50 text-gray-700'}`}
                              >
                                <div className="w-2.5 h-2.5 bg-emerald-600 rounded-full flex-shrink-0"></div>
                                <span className="font-medium truncate">{getText('Export Paid (Excel)', 'የተከፈለ (Excel)')}</span>
                              </button>
                              <button
                                onClick={() => exportToExcel('unpaid')}
                                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 transition-colors text-sm ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-red-50 text-gray-700'}`}
                              >
                                <div className="w-2.5 h-2.5 bg-rose-600 rounded-full flex-shrink-0"></div>
                                <span className="font-medium truncate">{getText('Export Unpaid (Excel)', 'ያልተከፈለ (Excel)')}</span>
                              </button>
                              <button
                                onClick={() => exportToExcel('all')}
                                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 transition-colors text-sm ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-blue-50 text-gray-700'}`}
                              >
                                <div className="w-2.5 h-2.5 bg-sky-600 rounded-full flex-shrink-0"></div>
                                <span className="font-medium truncate">{getText('Export All (Excel)', 'ሁሉንም (Excel)')}</span>
                              </button>
                            </div>
                          </div>

                          {/* Mobile Bottom Sheet Modal */}
                          <div className="md:hidden fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                            {/* Backdrop */}
                            <div
                              className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                              onClick={() => setShowExportMenu(false)}
                            />

                            {/* Bottom Sheet Card */}
                            <div className={`relative w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl z-10 max-h-[85vh] overflow-y-auto border-t sm:border p-4 pb-6 sm:p-6 transition-all ${
                              theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
                            }`}>
                              {/* Grab bar */}
                              <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-3 sm:hidden" />

                              {/* Header */}
                              <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-2.5">
                                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  </div>
                                  <div>
                                    <h3 className="font-bold text-base">{getText('Export Options', 'የሪፖርት አማራጮች')}</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{getText('Select format and student status', 'ቅርጸት እና የተማሪ ሁኔታ ይምረጡ')}</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => setShowExportMenu(false)}
                                  className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                  aria-label="Close"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>

                              {/* PDF Options */}
                              <div className="mb-4">
                                <p className="px-1 py-1 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mb-2">
                                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                  {getText('PDF Reports', 'የፒዲኤፍ ሪፖርቶች')}
                                </p>
                                <div className="space-y-2">
                                  <button
                                    onClick={() => exportToPDF('paid')}
                                    className={`w-full text-left px-3.5 py-3 rounded-xl flex items-center justify-between transition-colors border ${
                                      theme === 'dark'
                                        ? 'bg-gray-700/50 hover:bg-gray-700 border-gray-700 text-gray-100 active:bg-gray-600'
                                        : 'bg-green-50/60 hover:bg-green-50 border-green-200/80 text-gray-800 active:bg-green-100'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0"></div>
                                      <span className="font-medium text-sm break-words">{getText('Export Paid Students (PDF)', 'የተከፈለ ተማሪዎች (PDF)')}</span>
                                    </div>
                                    <span className="text-xs px-2 py-0.5 rounded-md bg-green-100 dark:bg-green-900/60 text-green-700 dark:text-green-300 font-bold flex-shrink-0 ml-2">PDF</span>
                                  </button>

                                  <button
                                    onClick={() => exportToPDF('unpaid')}
                                    className={`w-full text-left px-3.5 py-3 rounded-xl flex items-center justify-between transition-colors border ${
                                      theme === 'dark'
                                        ? 'bg-gray-700/50 hover:bg-gray-700 border-gray-700 text-gray-100 active:bg-gray-600'
                                        : 'bg-red-50/60 hover:bg-red-50 border-red-200/80 text-gray-800 active:bg-red-100'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="w-3 h-3 bg-red-500 rounded-full flex-shrink-0"></div>
                                      <span className="font-medium text-sm break-words">{getText('Export Unpaid Students (PDF)', 'ያልተከፈለ ተማሪዎች (PDF)')}</span>
                                    </div>
                                    <span className="text-xs px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300 font-bold flex-shrink-0 ml-2">PDF</span>
                                  </button>

                                  <button
                                    onClick={() => exportToPDF('all')}
                                    className={`w-full text-left px-3.5 py-3 rounded-xl flex items-center justify-between transition-colors border ${
                                      theme === 'dark'
                                        ? 'bg-gray-700/50 hover:bg-gray-700 border-gray-700 text-gray-100 active:bg-gray-600'
                                        : 'bg-blue-50/60 hover:bg-blue-50 border-blue-200/80 text-gray-800 active:bg-blue-100'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0"></div>
                                      <span className="font-medium text-sm break-words">{getText('Export All Students (PDF)', 'ሁሉንም ተማሪዎች (PDF)')}</span>
                                    </div>
                                    <span className="text-xs px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold flex-shrink-0 ml-2">PDF</span>
                                  </button>
                                </div>
                              </div>

                              {/* Excel / CSV Options */}
                              <div className="mb-4">
                                <p className="px-1 py-1 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mb-2">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                  {getText('Excel (CSV) Export', 'ኤክሴል (CSV) አውጣ')}
                                </p>
                                <div className="space-y-2">
                                  <button
                                    onClick={() => exportToExcel('paid')}
                                    className={`w-full text-left px-3.5 py-3 rounded-xl flex items-center justify-between transition-colors border ${
                                      theme === 'dark'
                                        ? 'bg-gray-700/50 hover:bg-gray-700 border-gray-700 text-gray-100 active:bg-gray-600'
                                        : 'bg-emerald-50/60 hover:bg-emerald-50 border-emerald-200/80 text-gray-800 active:bg-emerald-100'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="w-3 h-3 bg-emerald-600 rounded-full flex-shrink-0"></div>
                                      <span className="font-medium text-sm break-words">{getText('Export Paid (Excel)', 'የተከፈለ (Excel)')}</span>
                                    </div>
                                    <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold flex-shrink-0 ml-2">CSV</span>
                                  </button>

                                  <button
                                    onClick={() => exportToExcel('unpaid')}
                                    className={`w-full text-left px-3.5 py-3 rounded-xl flex items-center justify-between transition-colors border ${
                                      theme === 'dark'
                                        ? 'bg-gray-700/50 hover:bg-gray-700 border-gray-700 text-gray-100 active:bg-gray-600'
                                        : 'bg-rose-50/60 hover:bg-rose-50 border-rose-200/80 text-gray-800 active:bg-rose-100'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="w-3 h-3 bg-rose-600 rounded-full flex-shrink-0"></div>
                                      <span className="font-medium text-sm break-words">{getText('Export Unpaid (Excel)', 'ያልተከፈለ (Excel)')}</span>
                                    </div>
                                    <span className="text-xs px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold flex-shrink-0 ml-2">CSV</span>
                                  </button>

                                  <button
                                    onClick={() => exportToExcel('all')}
                                    className={`w-full text-left px-3.5 py-3 rounded-xl flex items-center justify-between transition-colors border ${
                                      theme === 'dark'
                                        ? 'bg-gray-700/50 hover:bg-gray-700 border-gray-700 text-gray-100 active:bg-gray-600'
                                        : 'bg-sky-50/60 hover:bg-sky-50 border-sky-200/80 text-gray-800 active:bg-sky-100'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="w-3 h-3 bg-sky-600 rounded-full flex-shrink-0"></div>
                                      <span className="font-medium text-sm break-words">{getText('Export All (Excel)', 'ሁሉንም (Excel)')}</span>
                                    </div>
                                    <span className="text-xs px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 font-bold flex-shrink-0 ml-2">CSV</span>
                                  </button>
                                </div>
                              </div>

                              {/* Cancel Button */}
                              <button
                                onClick={() => setShowExportMenu(false)}
                                className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors border text-center ${
                                  theme === 'dark'
                                    ? 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-gray-200'
                                    : 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-700'
                                }`}
                              >
                                {getText('Cancel', 'ይቅር')}
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    {canDo('custom-payment', 'view') && (
                    <a
                      href="/payments/custom"
                      className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-4 md:px-5 py-2.5 md:py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm md:text-base">{getText('Custom Payment', 'ልዩ ክፍያ')}</span>
                    </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder={getText('Search by student name or ID...', 'በተማሪ ስም ወይም መታወቂያ ፈልግ...')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`w-full px-4 py-3 pl-11 border rounded-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className={`px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 font-medium ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
                      title={getText('Filter by Ethiopian Month', 'በኢትዮጵያ ወር አጣራ')}
                    >
                      <option value="all">
                        {language === 'am' ? 'ሁሉም ወራት (All Months)' : 'All Months (ሁሉም ወራት)'}
                      </option>
                      {ETHIOPIAN_ACADEMIC_MONTHS.map(m => {
                        const isNow = m.value === currentEcMonth
                        const label = language === 'am'
                          ? `${m.am} (${m.en})${isNow ? ' • አሁን' : ''}`
                          : `${m.en} (${m.am})${isNow ? ' • Current' : ''}`
                        return (
                          <option key={m.value} value={m.value}>
                            {label}
                          </option>
                        )
                      })}
                    </select>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className={`px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 font-medium ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
                      title={getText('Filter by Ethiopian Year', 'በኢትዮጵያ ዓመት አጣራ')}
                    >
                      {availableYears.map(y => {
                        const isNow = y === currentEcYear
                        const label = language === 'am'
                          ? `${y} ዓ.ም${isNow ? ' • አሁን' : ''}`
                          : `${y} E.C${isNow ? ' • Current' : ''}`
                        return (
                          <option key={y} value={y}>
                            {label}
                          </option>
                        )
                      })}
                    </select>
                    {(selectedMonth !== currentEcMonth || selectedYear !== currentEcYear) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMonth(currentEcMonth)
                          setSelectedYear(currentEcYear)
                        }}
                        title={getText('Reset to Ethiopian now month and year', 'ወደ የአሁኑ የኢትዮጵያ ወር እና ዓመት መልስ')}
                        className={`px-3 py-2.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap shadow-sm active:scale-95 ${
                          theme === 'dark'
                            ? 'bg-blue-900/40 hover:bg-blue-800/60 text-blue-300 border border-blue-700/50'
                            : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>{getText('Now', 'አሁን')}</span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-col md:flex-row gap-3">
                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value as 'all' | 'paid' | 'unpaid')}
                    className={`px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 font-medium ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
                  >
                    <option value="all">{getText('All Students', 'ሁሉም ተማሪዎች')}</option>
                    <option value="paid">{getText('Paid Only', 'የተከፈለ ብቻ')}</option>
                    <option value="unpaid">{getText('Unpaid Only', 'ያልተከፈለ ብቻ')}</option>
                  </select>
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className={`px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 font-medium ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
                    title={getText('Filter by Class', 'በክፍል አጣራ')}
                  >
                    <option value="all">All Classes (ሁሉም ክፍሎች)</option>
                    {availableClasses.map((cls) => (
                      <option key={cls.value} value={cls.value}>
                        {cls.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={sectionFilter}
                    onChange={(e) => setSectionFilter(e.target.value)}
                    className={`px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 font-medium ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
                    title={getText('Filter by Section', 'በሴክሽን አጣራ')}
                  >
                    <option value="all">All Sections (ሁሉም ክፍሎች)</option>
                    {availableSections.map((sec) => (
                      <option key={sec.value} value={sec.value}>
                        {sec.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={studentTypeFilter}
                    onChange={(e) => setStudentTypeFilter(e.target.value as 'all' | 'regular' | 'special')}
                    className={`px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 font-medium ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
                  >
                    <option value="all">{getText('All Types', 'ሁሉም አይነቶች')}</option>
                    <option value="regular">{getText('Regular', 'መደበኛ')}</option>
                    <option value="special">{getText('Special', 'ልዩ')}</option>
                  </select>
                  <button
                    onClick={() => setShowDateFilter(!showDateFilter)}
                    className={`px-4 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                      showDateFilter
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : theme === 'dark'
                        ? 'bg-gray-800 border border-gray-600 text-gray-300 hover:bg-gray-700'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {getText('Filter by Date', 'በቀን ማጣሪያ')}
                  </button>
                  {showDateFilter && (
                    <>
                      <div className="flex-1">
                        <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {getText('From', 'ከ')}
                        </label>
                        <input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          placeholder={getText('From Date', 'ከ ቀን')}
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                        />
                      </div>
                      <div className="flex-1">
                        <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {getText('To', 'እስከ')}
                        </label>
                        <input
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          placeholder={getText('To Date', 'እስከ ቀን')}
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                        />
                      </div>
                      {(dateFrom || dateTo) && (
                        <button
                          onClick={() => {
                            setDateFrom('')
                            setDateTo('')
                          }}
                          className={`px-4 py-3 rounded-lg transition-colors self-end ${theme === 'dark' ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                          title={getText('Clear Date Filter', 'የቀን ማጣሪያ አጽዳ')}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={`border-b ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                        <th className={`px-6 py-3 text-center text-xs font-medium uppercase ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                          {selectedMonth === 'all' ? (
                            '#'
                          ) : canManagePayments ? (
                            <input
                              type="checkbox"
                              checked={(selectedStudents.length > 0 && selectedStudents.length === filteredStudents.filter(s => !isStudentPaid(s._id)).length && filteredStudents.filter(s => !isStudentPaid(s._id)).length > 0) || (selectedPaidStudents.length > 0 && selectedPaidStudents.length === filteredStudents.filter(s => isStudentPaid(s._id)).length && filteredStudents.filter(s => isStudentPaid(s._id)).length > 0)}
                              onChange={(e) => handleSelectAll(e.target.checked)}
                              className="w-5 h-5 rounded cursor-pointer accent-blue-600"
                            />
                          ) : (
                            '#'
                          )}
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                          {getText('Student ID', 'የተማሪ መታወቂያ')}
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                          {getText('Student Name', 'የተማሪ ስም')}
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                          {getText('Class', 'ክፍል')}
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                          {getText('Section', 'ክፍል')}
                        </th>
                        <th className={`px-6 py-3 text-center text-xs font-medium uppercase ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                          {getText('Payment Status', 'የክፍያ ሁኔታ')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-600' : 'divide-gray-100'}`}>
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center">
                            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                              {getText('No students found', 'ምንም ተማሪዎች አልተገኙም')}
                            </p>
                          </td>
                        </tr>
                      ) : (
                        paginatedStudents.map((student, idx) => {
                          const isPaid = isStudentPaid(student._id)
                          const isSelected = isPaid ? selectedPaidStudents.includes(student._id) : selectedStudents.includes(student._id)
                          const paidMonths = getStudentPaidMonths(student._id)
                          const paidCount = paidMonths.length
                          const unpaidCount = ETHIOPIAN_ACADEMIC_MONTHS.length - paidCount
                          return (
                            <tr key={student._id} className={`${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} ${isSelected ? theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-50' : ''}`}>
                              <td className="px-6 py-4 text-center">
                                {selectedMonth === 'all' ? (
                                  <span className="text-xs font-medium text-gray-500">{startIndex + idx + 1}</span>
                                ) : canManagePayments ? (
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => handleSelectStudent(student._id, e.target.checked, isPaid)}
                                    className="w-5 h-5 rounded cursor-pointer accent-blue-600"
                                  />
                                ) : (
                                  <span className="text-xs font-medium text-gray-500">{startIndex + idx + 1}</span>
                                )}
                              </td>
                              <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                                <div className="font-medium">{student.studentId}</div>
                              </td>
                              <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                                <div className="font-medium">
                                  {`${student.firstName} ${student.middleName} ${student.lastName}`}
                                </div>
                              </td>
                              <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                                {formatClassBoth(student.class)}
                              </td>
                              <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                                {student.section ? formatSectionBoth(student.section) : '-'}
                              </td>
                              <td className="px-6 py-4">
                                {selectedMonth === 'all' ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="flex flex-col items-center gap-1">
                                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                        paidCount === 10
                                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                                          : paidCount > 0
                                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                          : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
                                      }`}>
                                        {paidCount === 10
                                          ? getText('10/10 Months Paid', '10/10 ወራት ተከፍሏል')
                                          : getText(`${paidCount}/10 Months Paid`, `${paidCount}/10 ወራት ተከፍሏል`)}
                                      </span>
                                      {paidCount > 0 && paidCount < 10 && (
                                        <span className="text-[11px] text-red-500 font-medium">
                                          {getText(`${unpaidCount} Pending`, `${unpaidCount} ያልተከፈለ`)}
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => handleShowHistory(student)}
                                      className={`p-2 rounded-lg transition-all hover:scale-110 ${
                                        theme === 'dark' 
                                          ? 'hover:bg-gray-600 text-gray-400 hover:text-blue-400' 
                                          : 'hover:bg-blue-50 text-gray-500 hover:text-blue-600'
                                      }`}
                                      title={getText('View Payment History', 'የክፍያ ታሪክ ይመልከቱ')}
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-3">
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={isPaid}
                                        onChange={canManagePayments ? (e) => handleCheckboxClick(student, e.target.checked) : undefined}
                                        readOnly={!canManagePayments}
                                        className={`w-5 h-5 rounded focus:ring-2 focus:ring-offset-0 transition-all ${canManagePayments ? 'cursor-pointer' : 'cursor-default'} ${
                                          isPaid 
                                            ? 'bg-green-500 border-green-500 text-white accent-green-500' 
                                            : 'border-gray-300 accent-gray-400'
                                        }`}
                                      />
                                      <span className={`text-sm font-medium ${
                                        isPaid 
                                          ? 'text-green-600' 
                                          : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                      }`}>
                                        {isPaid ? getText('Paid', 'ተከፍሏል') : getText('Unpaid', 'አልተከፈለም')}
                                      </span>
                                    </div>
                                    {isPaid && canManagePayments && (
                                      <button
                                        onClick={() => handleDeletePayment(student._id)}
                                        className={`p-2 rounded-lg transition-all hover:scale-110 ${
                                          theme === 'dark' 
                                            ? 'hover:bg-red-900/30 text-red-400 hover:text-red-300' 
                                            : 'hover:bg-red-50 text-red-500 hover:text-red-600'
                                        }`}
                                        title={getText('Remove Payment', 'ክፍያ አስወግድ')}
                                      >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleShowHistory(student)}
                                      className={`p-2 rounded-lg transition-all hover:scale-110 ${
                                        theme === 'dark' 
                                          ? 'hover:bg-gray-600 text-gray-400 hover:text-blue-400' 
                                          : 'hover:bg-blue-50 text-gray-500 hover:text-blue-600'
                                      }`}
                                      title={getText('View Payment History', 'የክፍያ ታሪክ ይመልከቱ')}
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden">
                  {filteredStudents.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                      <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                        {getText('No students found', 'ምንም ተማሪዎች አልተገኙም')}
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 space-y-4">
                      {paginatedStudents.map((student, idx) => {
                        const isPaid = isStudentPaid(student._id)
                        const isSelected = isPaid ? selectedPaidStudents.includes(student._id) : selectedStudents.includes(student._id)
                        const paidMonths = getStudentPaidMonths(student._id)
                        const paidCount = paidMonths.length
                        const unpaidCount = ETHIOPIAN_ACADEMIC_MONTHS.length - paidCount
                        return (
                          <div
                            key={student._id}
                            className={`rounded-lg border p-4 ${isSelected ? theme === 'dark' ? 'bg-blue-900/30 border-blue-600' : 'bg-blue-50 border-blue-400' : theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}
                          >
                            {/* Student Info */}
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-start gap-3 flex-1">
                                {canManagePayments && selectedMonth !== 'all' && (
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => handleSelectStudent(student._id, e.target.checked, isPaid)}
                                    className="w-5 h-5 mt-1 rounded cursor-pointer accent-blue-600"
                                  />
                                )}
                                <div className="flex-1">
                                  <h3 className={`font-semibold text-base ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                    {`${student.firstName} ${student.middleName} ${student.lastName}`}
                                  </h3>
                                  <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {getText('ID', 'መታወቂያ')}: <span className="font-medium">{student.studentId}</span>
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleShowHistory(student)}
                                className={`p-2 rounded-lg transition-all ${
                                  theme === 'dark' 
                                    ? 'hover:bg-gray-600 text-gray-400 hover:text-blue-400' 
                                    : 'hover:bg-blue-50 text-gray-500 hover:text-blue-600'
                                }`}
                                title={getText('View Payment History', 'የክፍያ ታሪክ ይመልከቱ')}
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>
                            </div>

                            {/* Class & Section */}
                            <div className={`flex gap-4 mb-3 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                <div>
                                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>{getText('Class', 'ክፍል')}: </span>
                                  <span className="font-medium">{formatClassBoth(student.class)}</span>
                                </div>
                                <div>
                                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>{getText('Section', 'ክፍል')}: </span>
                                  <span className="font-medium">{student.section ? formatSectionBoth(student.section) : '-'}</span>
                                </div>
                            </div>

                            {/* Payment Status */}
                            <div className={`flex items-center justify-between pt-3 border-t ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}>
                              <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                {getText('Payment Status', 'የክፍያ ሁኔታ')}
                              </span>
                              {selectedMonth === 'all' ? (
                                <div className="flex items-center gap-2">
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                    paidCount === 10
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                                      : paidCount > 0
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                      : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
                                  }`}>
                                    {paidCount === 10
                                      ? getText('10/10 Months Paid', '10/10 ወራት ተከፍሏል')
                                      : getText(`${paidCount}/10 Months Paid`, `${paidCount}/10 ወራት ተከፍሏል`)}
                                  </span>
                                  {paidCount > 0 && paidCount < 10 && (
                                    <span className="text-[11px] text-red-500 font-medium">
                                      ({unpaidCount} {getText('Pending', 'ቀሪ')})
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <label className={`flex items-center gap-2 ${canManagePayments ? 'cursor-pointer' : 'cursor-default'}`}>
                                    <input
                                      type="checkbox"
                                      checked={isPaid}
                                      onChange={canManagePayments ? (e) => handleCheckboxClick(student, e.target.checked) : undefined}
                                      readOnly={!canManagePayments}
                                      className={`w-5 h-5 rounded focus:ring-2 focus:ring-offset-0 transition-all ${canManagePayments ? 'cursor-pointer' : 'cursor-default'} ${
                                        isPaid 
                                          ? 'bg-green-500 border-green-500 text-white accent-green-500' 
                                          : 'border-gray-300 accent-gray-400'
                                      }`}
                                    />
                                    <span className={`text-sm font-semibold ${
                                      isPaid 
                                        ? 'text-green-600' 
                                        : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                    }`}>
                                      {isPaid ? getText('Paid', 'ተከፍሏል') : getText('Unpaid', 'አልተከፈለም')}
                                    </span>
                                  </label>
                                  {isPaid && canManagePayments && (
                                    <button
                                      onClick={() => handleDeletePayment(student._id)}
                                      className={`p-2 rounded-lg transition-all ${
                                        theme === 'dark' 
                                          ? 'hover:bg-red-900/30 text-red-400 hover:text-red-300' 
                                          : 'hover:bg-red-50 text-red-500 hover:text-red-600'
                                      }`}
                                      title={getText('Remove Payment', 'ክፍያ አስወግድ')}
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Pagination Controls */}
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredStudents.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={(page) => setCurrentPage(page)}
                  itemName={{ en: 'students', am: 'ተማሪዎች' }}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Payment Modal */}
      {showBulkPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl shadow-2xl p-6 w-full max-w-md ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {getText('Mark Students as Paid', 'ተማሪዎችን እንደ ተከፍሏል ምልክት አድርግ')}
            </h2>
            <div className={`mb-4 p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-blue-50'}`}>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                {getText('Selected Students', 'የተመረጡ ተማሪዎች')}: <span className="font-semibold">{selectedStudents.length}</span>
              </p>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                {getText('Period', 'ጊዜ')}: <span className="font-semibold">{getEthiopianMonthDisplay(selectedMonth, language)} {selectedYear} {getText('E.C', 'ዓ.ም')}</span>
              </p>
            </div>
            <form onSubmit={handleBulkPayment}>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {getText('Amount (ETB)', 'መጠን (ብር)')} *
                  </label>
                  <input
                    type="number"
                    value={bulkAmount}
                    onChange={(e) => setBulkAmount(e.target.value)}
                    required
                    min="0"
                    step="0.01"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                    placeholder="Enter amount"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {getText('Payment Date', 'የክፍያ ቀን')} *
                  </label>
                  <input
                    type="date"
                    value={bulkPaymentDate}
                    onChange={(e) => setBulkPaymentDate(e.target.value)}
                    required
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {getText('Description', 'መግለጫ')}
                  </label>
                  <textarea
                    value={bulkDescription}
                    onChange={(e) => setBulkDescription(e.target.value)}
                    rows={3}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                    placeholder="Optional notes..."
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkPaymentModal(false)
                    setBulkAmount('')
                    setBulkDescription('')
                    setBulkPaymentDate(new Date().toISOString().split('T')[0])
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                >
                  {getText('Cancel', 'ሰርዝ')}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
                >
                  {getText('Mark as Paid', 'እንደ ተከፍሏል ምልክት አድርግ')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl shadow-2xl p-6 w-full max-w-md ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {getText('Add Payment', 'ክፍያ ጨምር')}
            </h2>
            <div className={`mb-4 p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-blue-50'}`}>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                {getText('Student', 'ተማሪ')}: <span className="font-semibold">{`${selectedStudent.firstName} ${selectedStudent.middleName} ${selectedStudent.lastName}`}</span>
              </p>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                {getText('Period', 'ጊዜ')}: <span className="font-semibold">{getEthiopianMonthDisplay(selectedMonth, language)} {selectedYear} {getText('E.C', 'ዓ.ም')}</span>
              </p>
            </div>
            <form onSubmit={handleAddPayment}>
              <div className="space-y-4">
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
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                    placeholder="Enter amount"
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
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {getText('Description', 'መግለጫ')}
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                    placeholder="Optional notes..."
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setSelectedStudent(null)
                    setAmount('')
                    setDescription('')
                    setPaymentDate(new Date().toISOString().split('T')[0])
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                >
                  {getText('Cancel', 'ሰርዝ')}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
                >
                  {getText('Add Payment', 'ክፍያ ጨምር')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showHistoryModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl shadow-2xl p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {getText('Payment History', 'የክፍያ ታሪክ')}
                </h2>
                <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {`${selectedStudent.firstName} ${selectedStudent.middleName} ${selectedStudent.lastName}`} - {selectedStudent.studentId}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowHistoryModal(false)
                  setSelectedStudent(null)
                  setStudentHistory([])
                }}
                className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {historyLoading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              </div>
            ) : sortedStudentHistory.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                  {getText('No payment history found', 'ምንም የክፍያ ታሪክ አልተገኘም')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedStudentHistory.map((payment, index) => (
                  <div
                    key={payment._id}
                    className={`p-4 rounded-lg border transition-all ${
                      index === 0
                        ? theme === 'dark'
                          ? 'bg-gray-700 border-blue-500/70 ring-1 ring-blue-500/30'
                          : 'bg-blue-50/40 border-blue-300 ring-1 ring-blue-200'
                        : theme === 'dark'
                        ? 'bg-gray-700 border-gray-600'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          payment.status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {getEthiopianMonthDisplay(payment.month, language)} {payment.year} {getText('E.C', 'ዓ.ም')}
                        </span>
                        {index === 0 && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            theme === 'dark'
                              ? 'bg-blue-900/60 text-blue-300 border border-blue-700'
                              : 'bg-blue-100 text-blue-700 border border-blue-300'
                          }`}>
                            {getText('Latest', 'የቅርብ ጊዜ')}
                          </span>
                        )}
                      </div>
                      <span className={`text-lg font-bold ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                        {payment.amount} ETB
                      </span>
                    </div>
                    <div className={`grid grid-cols-1 gap-2 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      <div>
                        <span className="font-medium">{getText('Payment Date', 'የክፍያ ቀን')}:</span>
                        <div className="ml-2 mt-1">
                          <div>{formatDateWithBothCalendars(payment.paymentDate)}</div>
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">{getText('Status', 'ሁኔታ')}:</span>
                        <span className="ml-2 capitalize">{payment.status}</span>
                      </div>
                    </div>
                    {payment.description && (
                      <div className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        <span className="font-medium">{getText('Description', 'መግለጫ')}:</span>
                        <p className="mt-1">{payment.description}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Import Payments Modal (Excel / PDF) */}
      {showImportModal && (
        <ImportPaymentsModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          students={students}
          existingPayments={allPayments && allPayments.length > 0 ? allPayments : payments}
          availableYears={availableYears}
          onImportSuccess={(importedMonth?: string, importedYear?: number) => {
            const nextYear = importedYear || selectedYear
            const nextMonth = importedMonth || selectedMonth

            if (importedYear && importedYear !== selectedYear) {
              setSelectedYear(importedYear)
            }
            if (importedMonth && selectedMonth !== 'all' && importedMonth !== selectedMonth) {
              setSelectedMonth(importedMonth)
            }

            const fetchFresh = async () => {
              try {
                const token = localStorage.getItem('token')
                const mQuery = nextMonth !== 'all' ? `month=${nextMonth}&` : ''
                const res = await axios.get(
                  `${process.env.NEXT_PUBLIC_API_URL}/payments?${mQuery}year=${nextYear}`,
                  { headers: { Authorization: `Bearer ${token}` } }
                )
                setPayments(res.data)
                const resAll = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/payments`, {
                  headers: { Authorization: `Bearer ${token}` }
                })
                setAllPayments(resAll.data)
              } catch (e) {
                console.error('Failed to refresh payments:', e)
              }
            }
            fetchFresh()
          }}
        />
      )}
    </DashboardLayout>
  )
}
