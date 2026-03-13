'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { useSettings } from '@/contexts/SettingsContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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

export default function PaymentsPage() {
  const { theme, getText, language } = useSettings()
  const [students, setStudents] = useState<Student[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedMonth') || 'September'
    }
    return 'September'
  })
  const [selectedYear, setSelectedYear] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedYear = localStorage.getItem('selectedYear')
      return savedYear ? Number(savedYear) : 2019
    }
    return 2019
  })
  const [showModal, setShowModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [studentHistory, setStudentHistory] = useState<Payment[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showDateFilter, setShowDateFilter] = useState(false)
  const [studentTypeFilter, setStudentTypeFilter] = useState<'all' | 'regular' | 'special'>('all')
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [showBulkPaymentModal, setShowBulkPaymentModal] = useState(false)
  const [bulkAmount, setBulkAmount] = useState('')
  const [bulkDescription, setBulkDescription] = useState('')
  const [bulkPaymentDate, setBulkPaymentDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    fetchStudents()
  }, [])

  useEffect(() => {
    // Save to localStorage when changed
    localStorage.setItem('selectedMonth', selectedMonth)
    localStorage.setItem('selectedYear', selectedYear.toString())
  }, [selectedMonth, selectedYear])

  useEffect(() => {
    if (students.length > 0) {
      fetchPayments()
    }
  }, [selectedMonth, selectedYear, students])

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
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/payments?month=${selectedMonth}&year=${selectedYear}`,
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
    } catch (error: any) {
      toast.error(error.response?.data?.message || getText('Failed to add payment', 'ክፍያ መጨመር አልተሳካም'))
    }
  }

  const handleDeletePayment = async (studentId: string) => {
    const payment = payments.find(
      p => p.studentId === studentId && p.month === selectedMonth && p.year === selectedYear
    )
    if (!payment) return

    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/payments/${payment._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success(getText('Payment removed', 'ክፍያ ተወግዷል'))
      fetchPayments()
    } catch (error) {
      toast.error(getText('Failed to remove payment', 'ክፍያ ማስወገድ አልተሳካም'))
    }
  }

  const isStudentPaid = (studentId: string) => {
    return payments.some(
      p => {
        const paymentStudentId = typeof p.studentId === 'string' ? p.studentId : (p.studentId as any)?._id
        return paymentStudentId === studentId && p.month === selectedMonth && p.year === selectedYear
      }
    )
  }

  const handleSelectStudent = (studentId: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedStudents(prev => [...prev, studentId])
    } else {
      setSelectedStudents(prev => prev.filter(id => id !== studentId))
    }
  }

  const handleSelectAll = (isChecked: boolean) => {
    if (isChecked) {
      const unpaidStudents = filteredStudents.filter(s => !isStudentPaid(s._id))
      setSelectedStudents(unpaidStudents.map(s => s._id))
    } else {
      setSelectedStudents([])
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
    } catch (error: any) {
      toast.error(error.response?.data?.message || getText('Failed to add payments', 'ክፍያዎችን መጨመር አልተሳካም'))
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
      setStudentHistory(response.data)
    } catch (error) {
      toast.error(getText('Failed to fetch payment history', 'የክፍያ ታሪክ መጫን አልተሳካም'))
    } finally {
      setHistoryLoading(false)
    }
  }

  const exportToPDF = (type: 'paid' | 'unpaid' | 'all') => {
    const doc = new jsPDF()
    
    // Title
    doc.setFontSize(18)
    doc.text('Bluelight Academy - Payment Report', 14, 20)
    
    // Period info
    doc.setFontSize(12)
    doc.text(`Period: ${selectedMonth} ${selectedYear} E.C`, 14, 30)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 37)
    
    // Separate paid and unpaid students
    const paidStudents = filteredStudents.filter(s => isStudentPaid(s._id))
    const unpaidStudents = filteredStudents.filter(s => !isStudentPaid(s._id))
    
    let yPosition = 47
    
    if (type === 'paid' || type === 'all') {
      // Summary for paid
      doc.setFontSize(11)
      doc.text(`Total Paid Students: ${paidStudents.length}`, 14, yPosition)
      yPosition += 10
      
      if (paidStudents.length > 0) {
        doc.setFontSize(14)
        doc.setTextColor(0, 128, 0)
        doc.text('Paid Students', 14, yPosition)
        doc.setTextColor(0, 0, 0)
        
        const paidData = paidStudents.map(student => {
          const payment = payments.find(p => {
            const paymentStudentId = typeof p.studentId === 'string' ? p.studentId : (p.studentId as any)?._id
            return paymentStudentId === student._id
          })
          return [
            student.studentId,
            `${student.firstName} ${student.middleName} ${student.lastName}`,
            student.class,
            student.section || '-',
            payment?.amount ? `${payment.amount} ETB` : '-',
            payment?.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : '-',
            payment?.description || '-'
          ]
        })
        
        autoTable(doc, {
          startY: yPosition + 5,
          head: [['Student ID', 'Name', 'Class', 'Section', 'Amount', 'Payment Date', 'Description']],
          body: paidData,
          theme: 'grid',
          headStyles: { fillColor: [34, 197, 94] },
          margin: { left: 14, right: 14 },
          columnStyles: {
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
        doc.setFontSize(11)
        doc.text(`Total Unpaid Students: ${unpaidStudents.length}`, 14, yPosition)
        yPosition += 10
      }
      
      if (unpaidStudents.length > 0) {
        doc.setFontSize(14)
        doc.setTextColor(220, 38, 38)
        doc.text('Unpaid Students', 14, yPosition)
        doc.setTextColor(0, 0, 0)
        
        const unpaidData = unpaidStudents.map(student => [
          student.studentId,
          `${student.firstName} ${student.middleName} ${student.lastName}`,
          student.class,
          student.section || '-',
          student.fatherPhone || '-',
          student.motherPhone || '-'
        ])
        
        autoTable(doc, {
          startY: yPosition + 5,
          head: [['Student ID', 'Name', 'Class', 'Section', 'Father Phone', 'Mother Phone']],
          body: unpaidData,
          theme: 'grid',
          headStyles: { fillColor: [220, 38, 38] },
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
    setShowExportMenu(false)
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
      return paymentStudentId === student._id && p.month === selectedMonth && p.year === selectedYear
    })
    
    const paymentDescription = studentPayment?.description?.toLowerCase() || ''
    const paymentAmount = studentPayment?.amount?.toString() || ''
    
    // Search filter
    const matchesSearch = (
      studentName.includes(searchLower) ||
      studentId.includes(searchLower) ||
      fatherName.includes(searchLower) ||
      motherName.includes(searchLower) ||
      fatherPhone.includes(searchLower) ||
      motherPhone.includes(searchLower) ||
      paymentDescription.includes(searchLower) ||
      paymentAmount.includes(searchLower)
    )
    
    if (!matchesSearch) return false
    
    // Payment status filter
    const isPaid = isStudentPaid(student._id)
    if (paymentFilter === 'paid' && !isPaid) return false
    if (paymentFilter === 'unpaid' && isPaid) return false
    
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
    
    // Student type filter
    if (studentTypeFilter !== 'all') {
      const hasPaymentCode = student.paymentCode && student.paymentCode.trim() !== ''
      if (studentTypeFilter === 'regular' && !hasPaymentCode) return false
      if (studentTypeFilter === 'special' && hasPaymentCode) return false
    }
    
    return true
  })

  return (
    <DashboardLayout pageTitle={getText('Monthly Payments', 'ወርሃዊ ክፍያዎች')}>
      <div className={`min-h-screen p-6 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
                    {filteredStudents.filter(s => isStudentPaid(s._id)).length}
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
                    {filteredStudents.filter(s => !isStudentPaid(s._id)).length}
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
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
                <div className="flex gap-3">
                  {selectedStudents.length > 0 && (
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
                  <div className="relative">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="w-full md:w-auto bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>{getText('Export PDF', 'ፒዲኤፍ አውጣ')}</span>
                  </button>
                  {showExportMenu && (
                    <div className={`absolute right-0 mt-2 w-56 rounded-lg shadow-xl z-10 ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                      <div className="py-2">
                        <button
                          onClick={() => exportToPDF('paid')}
                          className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-green-50 text-gray-700'}`}
                        >
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="font-medium">{getText('Export Paid Students', 'የተከፈለ ተማሪዎች አውጣ')}</span>
                        </button>
                        <button
                          onClick={() => exportToPDF('unpaid')}
                          className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-red-50 text-gray-700'}`}
                        >
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span className="font-medium">{getText('Export Unpaid Students', 'ያልተከፈለ ተማሪዎች አውጣ')}</span>
                        </button>
                        <button
                          onClick={() => exportToPDF('all')}
                          className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-blue-50 text-gray-700'}`}
                        >
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="font-medium">{getText('Export All Students', 'ሁሉንም ተማሪዎች አውጣ')}</span>
                        </button>
                      </div>
                    </div>
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
                  <div className="flex gap-3">
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className={`px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                    >
                      <option value="September">September</option>
                      <option value="October">October</option>
                      <option value="November">November</option>
                      <option value="December">December</option>
                      <option value="January">January</option>
                      <option value="February">February</option>
                      <option value="March">March</option>
                      <option value="April">April</option>
                      <option value="May">May</option>
                      <option value="June">June</option>
                    </select>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className={`px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
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
                <div className="flex flex-col md:flex-row gap-3">
                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value as 'all' | 'paid' | 'unpaid')}
                    className={`px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  >
                    <option value="all">{getText('All Students', 'ሁሉም ተማሪዎች')}</option>
                    <option value="paid">{getText('Paid Only', 'የተከፈለ ብቻ')}</option>
                    <option value="unpaid">{getText('Unpaid Only', 'ያልተከፈለ ብቻ')}</option>
                  </select>
                  <select
                    value={studentTypeFilter}
                    onChange={(e) => setStudentTypeFilter(e.target.value as 'all' | 'regular' | 'special')}
                    className={`px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
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
                          <input
                            type="checkbox"
                            checked={selectedStudents.length > 0 && selectedStudents.length === filteredStudents.filter(s => !isStudentPaid(s._id)).length && filteredStudents.filter(s => !isStudentPaid(s._id)).length > 0}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="w-5 h-5 rounded cursor-pointer accent-blue-600"
                          />
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
                        filteredStudents.map((student) => {
                          const isPaid = isStudentPaid(student._id)
                          const isSelected = selectedStudents.includes(student._id)
                          return (
                            <tr key={student._id} className={`${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} ${isSelected ? theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-50' : ''}`}>
                              <td className="px-6 py-4 text-center">
                                {!isPaid && (
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => handleSelectStudent(student._id, e.target.checked)}
                                    className="w-5 h-5 rounded cursor-pointer accent-blue-600"
                                  />
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
                                {student.class}
                              </td>
                              <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                                {student.section || '-'}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-center gap-3">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={isPaid}
                                      onChange={(e) => handleCheckboxClick(student, e.target.checked)}
                                      className={`w-5 h-5 rounded focus:ring-2 focus:ring-offset-0 cursor-pointer transition-all ${
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
                      {filteredStudents.map((student) => {
                        const isPaid = isStudentPaid(student._id)
                        const isSelected = selectedStudents.includes(student._id)
                        return (
                          <div
                            key={student._id}
                            className={`rounded-lg border p-4 ${isSelected ? theme === 'dark' ? 'bg-blue-900/30 border-blue-600' : 'bg-blue-50 border-blue-400' : theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}
                          >
                            {/* Student Info */}
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-start gap-3 flex-1">
                                {!isPaid && (
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => handleSelectStudent(student._id, e.target.checked)}
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
                                <span className="font-medium">{student.class}</span>
                              </div>
                              <div>
                                <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>{getText('Section', 'ክፍል')}: </span>
                                <span className="font-medium">{student.section || '-'}</span>
                              </div>
                            </div>

                            {/* Payment Status */}
                            <div className={`flex items-center justify-between pt-3 border-t ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}>
                              <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                {getText('Payment Status', 'የክፍያ ሁኔታ')}
                              </span>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isPaid}
                                  onChange={(e) => handleCheckboxClick(student, e.target.checked)}
                                  className={`w-5 h-5 rounded focus:ring-2 focus:ring-offset-0 cursor-pointer transition-all ${
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
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
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
                {getText('Period', 'ጊዜ')}: <span className="font-semibold">{selectedMonth} {selectedYear} E.C</span>
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
                {getText('Period', 'ጊዜ')}: <span className="font-semibold">{selectedMonth} {selectedYear} E.C</span>
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
            ) : studentHistory.length === 0 ? (
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
                {studentHistory.map((payment) => (
                  <div
                    key={payment._id}
                    className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          payment.status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {payment.month} {payment.year} E.C
                        </span>
                      </div>
                      <span className={`text-lg font-bold ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                        {payment.amount} ETB
                      </span>
                    </div>
                    <div className={`grid grid-cols-2 gap-2 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      <div>
                        <span className="font-medium">{getText('Payment Date', 'የክፍያ ቀን')}:</span>
                        <span className="ml-2">{new Date(payment.paymentDate).toLocaleDateString()}</span>
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
    </DashboardLayout>
  )
}
