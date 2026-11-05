'use client'

import { useState, useEffect, useMemo } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import Pagination from '@/components/Pagination'
import { useSettings } from '@/contexts/SettingsContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import { getStudentDisplayName } from '@/utils/studentUtils'
import {
  ETHIOPIAN_ACADEMIC_MONTHS,
  getCurrentEthiopianAcademicMonth,
  getCurrentEthiopianYear
} from '@/utils/dateUtils'

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
  fatherName?: string
  fatherPhone?: string
  motherName?: string
  motherPhone?: string
  paymentCode?: string
  portalUsername?: string
  portalPassword?: string
}

interface Employee {
  _id: string
  teacherId: string
  fullName: string
  email?: string
  phone: string
  role: string
  portalUsername?: string
  portalPassword?: string
  isActive?: boolean
  photo?: string
}

interface PhoneContact {
  name: string
  phone: string
  relation: string
}

const isValidParentName = (name?: string) => {
  if (!name) return false
  const trimmed = name.trim().toLowerCase()
  if (trimmed.length < 2) return false
  if (
    trimmed === '-' ||
    trimmed === '--' ||
    trimmed === '---' ||
    trimmed === 'n/a' ||
    trimmed === 'none' ||
    trimmed === 'null' ||
    trimmed === 'unknown'
  ) {
    return false
  }
  return true
}

interface FailedRecipient {
  phone: string
  studentName?: string
  parentName?: string
  error?: string
}

interface NotificationHistory {
  _id: string
  title: string
  message: string
  recipients: number
  phoneNumbers: number
  sent?: number
  failed?: number
  failedDetails?: FailedRecipient[]
  createdAt?: string
  sentAt?: string
  sentBy: string
}

export default function NotificationsPage() {
  const { theme, getText, language } = useSettings()
  const [recipientType, setRecipientType] = useState<'students' | 'employees'>('students')

  // Students state
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [classFilter, setClassFilter] = useState<string>('all')
  const [sectionFilter, setSectionFilter] = useState<string>('all')
  const [studentTypeFilter, setStudentTypeFilter] = useState<'all' | 'regular' | 'special'>('all')
  const [siblingFilter, setSiblingFilter] = useState<'all' | 'siblings' | 'non_siblings'>('all')
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid' | 'paid_but_left'>('all')
  const [paymentFinancials, setPaymentFinancials] = useState<Record<string, { paidAmount: number; expectedFee: number; leftAmount: number }> | null>(null)
  const currentEcMonth = getCurrentEthiopianAcademicMonth()
  const currentEcYear = getCurrentEthiopianYear()

  const [filterYear, setFilterYear] = useState<string>(String(currentEcYear))
  const [filterMonth, setFilterMonth] = useState<string>(currentEcMonth)

  const baseStartYear = 2018
  const maxYear = Math.max(currentEcYear + 5, 2026)
  const availableYears = Array.from({ length: maxYear - baseStartYear + 1 }, (_, i) => baseStartYear + i)
  const [paymentFilteredIds, setPaymentFilteredIds] = useState<string[] | null>(null)
  const [paymentFilterLoading, setPaymentFilterLoading] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])

  // Employees state
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(false)
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('')
  const [employeeRoleFilter, setEmployeeRoleFilter] = useState('all')

  // Composer & History state
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [showVariables, setShowVariables] = useState(false)
  const [notificationHistory, setNotificationHistory] = useState<NotificationHistory[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [selectedFailedNotification, setSelectedFailedNotification] = useState<NotificationHistory | null>(null)

  const studentVariables = [
    { label: 'Student Name', value: '{{studentName}}', amharic: 'የተማሪ ስም' },
    { label: 'Student Class', value: '{{studentClass}}', amharic: 'የተማሪ ክፍል' },
    { label: 'Student ID', value: '{{studentId}}', amharic: 'የተማሪ መታወቂያ' },
    { label: 'Username', value: '{{username}}', amharic: 'የመለያ ስም (Username)' },
    { label: 'Password', value: '{{password}}', amharic: 'የይለፍ ቃል (Password)' },
    { label: 'Student Type', value: '{{studentType}}', amharic: 'የተማሪ አይነት' },
    { label: 'Payment Code', value: '{{paymentCode}}', amharic: 'የክፍያ ኮድ' },
    { label: 'Father Name', value: '{{fatherName}}', amharic: 'የአባት ስም' },
    { label: 'Mother Name', value: '{{motherName}}', amharic: 'የእናት ስም' },
    { label: 'Left Amount', value: '{{leftAmount}}', amharic: 'ቀሪ ሂሳብ' },
    { label: 'Paid Amount', value: '{{paidAmount}}', amharic: 'የተከፈለ መጠን' },
    { label: 'Payment Month', value: '{{paymentMonth}}', amharic: 'የክፍያ ወር' },
  ]

  const employeeVariables = [
    { label: 'Employee Name', value: '{{employeeName}}', amharic: 'የሰራተኛ ስም' },
    { label: 'Username', value: '{{username}}', amharic: 'የመለያ ስም (Username)' },
    { label: 'Password', value: '{{password}}', amharic: 'የይለፍ ቃል (Password)' },
    { label: 'Role / Position', value: '{{role}}', amharic: 'የስራ ድርሻ (Role)' },
    { label: 'Phone Number', value: '{{phone}}', amharic: 'ስልክ ቁጥር' },
    { label: 'Employee ID', value: '{{employeeId}}', amharic: 'የሰራተኛ መታወቂያ' },
  ]

  const variables = recipientType === 'students' ? studentVariables : employeeVariables

  const months = ['September','October','November','December','January','February','March','April','May','June']

  // Identify real sibling students in DB based on fatherName or motherName
  const { siblingStudentIds, siblingCountMap } = useMemo(() => {
    if (!students || students.length === 0) {
      return { siblingStudentIds: new Set<string>(), siblingCountMap: new Map<string, number>() }
    }

    const n = students.length
    const parent = Array.from({ length: n }, (_, i) => i)

    const find = (i: number): number => {
      if (parent[i] === i) return i
      parent[i] = find(parent[i])
      return parent[i]
    }

    const union = (i: number, j: number) => {
      const rootI = find(i)
      const rootJ = find(j)
      if (rootI !== rootJ) {
        parent[rootI] = rootJ
      }
    }

    const fatherMap = new Map<string, number[]>()
    const motherMap = new Map<string, number[]>()

    students.forEach((s, idx) => {
      if (isValidParentName(s.fatherName)) {
        const fn = s.fatherName!.trim().toLowerCase()
        const list = fatherMap.get(fn) || []
        list.push(idx)
        fatherMap.set(fn, list)
      }

      if (isValidParentName(s.motherName)) {
        const mn = s.motherName!.trim().toLowerCase()
        const list = motherMap.get(mn) || []
        list.push(idx)
        motherMap.set(mn, list)
      }
    })

    fatherMap.forEach(indices => {
      for (let i = 1; i < indices.length; i++) {
        union(indices[0], indices[i])
      }
    })

    motherMap.forEach(indices => {
      for (let i = 1; i < indices.length; i++) {
        union(indices[0], indices[i])
      }
    })

    const componentMap = new Map<number, Student[]>()
    for (let i = 0; i < n; i++) {
      const root = find(i)
      const list = componentMap.get(root) || []
      list.push(students[i])
      componentMap.set(root, list)
    }

    const idSet = new Set<string>()
    const countMap = new Map<string, number>()

    componentMap.forEach(groupStudents => {
      if (groupStudents.length > 1) {
        groupStudents.forEach(s => {
          idSet.add(s._id)
          countMap.set(s._id, groupStudents.length)
        })
      }
    })

    return { siblingStudentIds: idSet, siblingCountMap: countMap }
  }, [students])

  useEffect(() => {
    const savedMonth = localStorage.getItem('notif_filterMonth')
    const savedYear = localStorage.getItem('notif_filterYear')
    setFilterYear(savedYear || String(currentEcYear))
    setFilterMonth(savedMonth || currentEcMonth)
  }, [currentEcMonth, currentEcYear])

  // Automatically keep month and year aligned when Ethiopian month/year changes
  useEffect(() => {
    const timer = setInterval(() => {
      const nowMonth = getCurrentEthiopianAcademicMonth()
      const nowYear = getCurrentEthiopianYear()
      setFilterMonth(prev => prev === currentEcMonth ? nowMonth : prev)
      setFilterYear(prev => prev === String(currentEcYear) ? String(nowYear) : prev)
    }, 60000)
    return () => clearInterval(timer)
  }, [currentEcMonth, currentEcYear])

  useEffect(() => {
    fetchStudents()
    fetchEmployees()
    fetchNotificationHistory()
  }, [])

  useEffect(() => {
    localStorage.setItem('notif_filterYear', filterYear)
    localStorage.setItem('notif_filterMonth', filterMonth)
    if (paymentFilter === 'all') {
      setPaymentFilteredIds(null)
      setPaymentFinancials(null)
      return
    }
    if (!filterMonth || !filterYear) return
    const fetchPaymentStatus = async () => {
      setPaymentFilterLoading(true)
      try {
        const token = localStorage.getItem('token')
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/payments/status`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { month: filterMonth, year: filterYear }
        })
        setPaymentFinancials(res.data.financials || null)
        setPaymentFilteredIds(
          paymentFilter === 'paid'
            ? res.data.paid
            : paymentFilter === 'paid_but_left'
            ? res.data.paid_but_left
            : res.data.unpaid
        )
      } catch {
        toast.error(getText('Failed to fetch payment status', 'የክፍያ ሁኔታ መጫን አልተሳካም'))
      } finally {
        setPaymentFilterLoading(false)
      }
    }
    fetchPaymentStatus()
  }, [paymentFilter, filterMonth, filterYear])

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

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true)
      const token = localStorage.getItem('token')
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/teachers`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setEmployees(response.data)
    } catch (error) {
      toast.error(getText('Failed to fetch employees', 'ሰራተኞችን መጫን አልተሳካም'))
    } finally {
      setLoadingEmployees(false)
    }
  }

  const fetchNotificationHistory = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/notification-history`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNotificationHistory(res.data)
    } catch {
      // fallback to localStorage if API fails
      const history = localStorage.getItem('notificationHistory')
      if (history) setNotificationHistory(JSON.parse(history))
    }
  }

  const saveNotificationToHistory = async (title: string, message: string, recipients: number, phoneNumbers: number, sentCount: number, failedCount: number, failedList: FailedRecipient[] = []) => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/notification-history`,
        { title, message, recipients, phoneNumbers, sent: sentCount, failed: failedCount, failedDetails: failedList },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setNotificationHistory(prev => [res.data, ...prev])
    } catch {
      // fallback to localStorage
      const newNotification: NotificationHistory = {
        _id: Date.now().toString(), title, message, recipients, phoneNumbers,
        sent: sentCount, failed: failedCount, failedDetails: failedList,
        sentAt: new Date().toISOString(), sentBy: 'Admin'
      }
      const history = localStorage.getItem('notificationHistory')
      const current = history ? JSON.parse(history) : []
      const updated = [newNotification, ...current]
      localStorage.setItem('notificationHistory', JSON.stringify(updated))
      setNotificationHistory(updated)
    }
  }

  const deleteNotificationFromHistory = async (id: string) => {
    if (!confirm(getText('Are you sure you want to delete this notification from history?', 'እርግጠኛ ነዎት ይህን ማሳወቂያ ከታሪክ መሰረዝ ይፈልጋሉ?'))) return
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/notification-history/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNotificationHistory(prev => prev.filter(n => n._id !== id))
      toast.success(getText('Notification deleted from history', 'ማሳወቂያ ከታሪክ ተሰርዟል'))
    } catch {
      toast.error(getText('Failed to delete', 'መሰረዝ አልተሳካም'))
    }
  }

  const getPhoneContacts = (student: Student): PhoneContact[] => {
    const contacts: PhoneContact[] = []
    
    if (student.fatherPhone && student.fatherPhone.trim() !== '') {
      contacts.push({
        name: student.fatherName || 'Father',
        phone: student.fatherPhone,
        relation: 'Father'
      })
    }
    
    if (student.motherPhone && student.motherPhone.trim() !== '') {
      contacts.push({
        name: student.motherName || 'Mother',
        phone: student.motherPhone,
        relation: 'Mother'
      })
    }
    
    return contacts
  }

  const filteredStudents = students.filter(student => {
    const searchLower = searchTerm.toLowerCase()
    const studentName = `${student.firstName} ${student.middleName} ${student.lastName}`.toLowerCase()
    const studentAmharicName = `${student.firstNameAmharic || ''} ${student.middleNameAmharic || ''} ${student.lastNameAmharic || ''}`.toLowerCase()
    const studentId = student.studentId?.toLowerCase() || ''
    const fatherName = student.fatherName?.toLowerCase() || ''
    const motherName = student.motherName?.toLowerCase() || ''
    const fatherPhone = student.fatherPhone?.toLowerCase() || ''
    const motherPhone = student.motherPhone?.toLowerCase() || ''
    
    // Search filter
    const matchesSearch = (
      studentName.includes(searchLower) ||
      studentAmharicName.includes(searchLower) ||
      studentId.includes(searchLower) ||
      fatherName.includes(searchLower) ||
      motherName.includes(searchLower) ||
      fatherPhone.includes(searchLower) ||
      motherPhone.includes(searchLower)
    )
    
    if (!matchesSearch) return false
    
    // Class filter
    if (classFilter !== 'all' && student.class !== classFilter) return false
    
    // Section filter
    if (sectionFilter !== 'all' && student.section !== sectionFilter) return false
    
    // Student type filter
    if (studentTypeFilter !== 'all') {
      const hasPaymentCode = student.paymentCode && student.paymentCode.trim() !== ''
      if (studentTypeFilter === 'regular' && !hasPaymentCode) return false
      if (studentTypeFilter === 'special' && hasPaymentCode) return false
    }

    // Sibling filter (select only sibling students)
    if (siblingFilter === 'siblings' && !siblingStudentIds.has(student._id)) return false
    if (siblingFilter === 'non_siblings' && siblingStudentIds.has(student._id)) return false
    
    // Payment filter
    if (paymentFilter !== 'all' && paymentFilteredIds !== null) {
      if (!paymentFilteredIds.includes(student._id)) return false
    }

    return true
  })

  const filteredEmployees = employees.filter(emp => {
    if (emp.isActive === false) return false

    const search = employeeSearchTerm.toLowerCase().trim()
    if (search) {
      const name = (emp.fullName || '').toLowerCase()
      const id = (emp.teacherId || '').toLowerCase()
      const role = (emp.role || '').toLowerCase()
      const phone = (emp.phone || '').toLowerCase()
      const username = (emp.portalUsername || '').toLowerCase()
      if (!name.includes(search) && !id.includes(search) && !role.includes(search) && !phone.includes(search) && !username.includes(search)) {
        return false
      }
    }

    if (employeeRoleFilter !== 'all' && emp.role?.trim() !== employeeRoleFilter) {
      return false
    }

    return true
  })

  // Dynamic roles computed from active employees currently stored in database
  const employeeRoles = useMemo(() => {
    const activeEmployees = employees.filter(emp => emp.isActive !== false)
    const counts: Record<string, number> = {}
    activeEmployees.forEach(emp => {
      const r = emp.role?.trim()
      if (r) counts[r] = (counts[r] || 0) + 1
    })
    return Object.entries(counts)
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => a.role.localeCompare(b.role))
  }, [employees])

  // Automatically reset to 'all' if the currently selected role no longer exists in DB
  useEffect(() => {
    if (employeeRoleFilter !== 'all' && !employeeRoles.some(r => r.role === employeeRoleFilter)) {
      setEmployeeRoleFilter('all')
    }
  }, [employeeRoles, employeeRoleFilter])

  const PAGE_SIZE = 20
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    setCurrentPage(1)
  }, [recipientType, searchTerm, classFilter, sectionFilter, studentTypeFilter, siblingFilter, paymentFilter, filterYear, filterMonth, employeeSearchTerm, employeeRoleFilter])

  const currentTotal = recipientType === 'students' ? filteredStudents.length : filteredEmployees.length
  const totalPages = Math.max(1, Math.ceil(currentTotal / PAGE_SIZE))
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const endIndex = Math.min(startIndex + PAGE_SIZE, currentTotal)
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex)
  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex)

  const handleSelectStudent = (studentId: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedStudents(prev => [...prev, studentId])
    } else {
      setSelectedStudents(prev => prev.filter(id => id !== studentId))
    }
  }

  const handleSelectAll = (isChecked: boolean) => {
    if (isChecked) {
      setSelectedStudents(filteredStudents.map(s => s._id))
    } else {
      setSelectedStudents([])
    }
  }

  const handleSelectEmployee = (empId: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedEmployees(prev => [...prev, empId])
    } else {
      setSelectedEmployees(prev => prev.filter(id => id !== empId))
    }
  }

  const handleSelectAllEmployees = (isChecked: boolean) => {
    if (isChecked) {
      setSelectedEmployees(filteredEmployees.map(e => e._id))
    } else {
      setSelectedEmployees([])
    }
  }

  const getTotalPhoneNumbers = () => {
    const selectedStudentData = students.filter(s => selectedStudents.includes(s._id))
    let total = 0
    selectedStudentData.forEach(student => {
      total += getPhoneContacts(student).length
    })
    return total
  }

  const getTotalEmployeePhoneNumbers = () => {
    const selectedEmpData = employees.filter(e => selectedEmployees.includes(e._id))
    return selectedEmpData.filter(e => e.phone && e.phone.trim()).length
  }

  const handleSendNotification = async () => {
    if (recipientType === 'students') {
      if (selectedStudents.length === 0) {
        toast.error(getText('Please select at least one student', 'ቢያንስ አንድ ተማሪ ይምረጡ'))
        return
      }
    } else {
      if (selectedEmployees.length === 0) {
        toast.error(getText('Please select at least one employee', 'ቢያንስ አንድ ሰራተኛ ይምረጡ'))
        return
      }
    }

    if (!title.trim()) {
      toast.error(getText('Please enter a message title', 'የመልእክት ርዕስ ያስገቡ'))
      return
    }

    if (!message.trim()) {
      toast.error(getText('Please enter a message', 'መልእክት ያስገቡ'))
      return
    }

    setSending(true)
    try {
      const token = localStorage.getItem('token')
      const phoneNumbers: { phone: string; studentName: string; parentName: string; message: string }[] = []

      if (recipientType === 'students') {
        const selectedStudentData = students.filter(s => selectedStudents.includes(s._id))
        selectedStudentData.forEach(student => {
          const contacts = getPhoneContacts(student)
          const studentType = student.paymentCode && student.paymentCode.trim() !== '' ? 'Special' : 'Regular'
          
          const studentUsername = student.portalUsername || student.studentId || 'N/A'
          const studentPassword = student.portalPassword || 'N/A'

          // Replace variables in message
          let personalizedMessage = message
            .replace(/{{studentName}}|{studentName}/g, getStudentDisplayName(student, language))
            .replace(/{{studentClass}}|{studentClass}/g, student.class + (student.section ? ` - ${student.section}` : ''))
            .replace(/{{studentId}}|{studentId}/g, student.studentId || '')
            .replace(/{{username}}|{username}|{{portalUsername}}|{portalUsername}/g, studentUsername)
            .replace(/{{password}}|{password}|{{portalPassword}}|{portalPassword}/g, studentPassword)
            .replace(/{{studentType}}|{studentType}/g, studentType)
            .replace(/{{paymentCode}}|{paymentCode}/g, student.paymentCode || 'N/A')
            .replace(/{{fatherName}}|{fatherName}/g, student.fatherName || 'N/A')
            .replace(/{{motherName}}|{motherName}/g, student.motherName || 'N/A')
          const fin = paymentFinancials?.[student._id]
          const leftStr = fin && fin.leftAmount > 0 ? `${fin.leftAmount.toLocaleString()} ETB` : '0 ETB'
          const paidStr = fin ? `${fin.paidAmount.toLocaleString()} ETB` : '0 ETB'
          personalizedMessage = personalizedMessage
            .replace(/{{leftAmount}}|{leftAmount}/g, leftStr)
            .replace(/{{paidAmount}}|{paidAmount}/g, paidStr)
            .replace(/{{paymentMonth}}|{paymentMonth}/g, filterMonth || '')
          
          contacts.forEach(contact => {
            phoneNumbers.push({
              phone: contact.phone,
              studentName: getStudentDisplayName(student, language),
              parentName: contact.name,
              message: personalizedMessage
            })
          })
        })
      } else {
        const selectedEmpData = employees.filter(e => selectedEmployees.includes(e._id))
        selectedEmpData.forEach(emp => {
          if (!emp.phone || !emp.phone.trim()) return
          const isTeacher = emp.role === 'Teacher'
          const username = isTeacher ? (emp.portalUsername || emp.teacherId || 'N/A') : 'N/A'
          const password = isTeacher ? (emp.portalPassword || 'N/A') : 'N/A'

          let personalizedMessage = message
            .replace(/{{employeeName}}|{employeeName}|{{name}}|{name}|{{fullName}}|{fullName}/g, emp.fullName || '')
            .replace(/{{username}}|{username}|{{portalUsername}}|{portalUsername}/g, username)
            .replace(/{{password}}|{password}|{{portalPassword}}|{portalPassword}/g, password)
            .replace(/{{role}}|{role}/g, emp.role || '')
            .replace(/{{employeeId}}|{employeeId}|{{teacherId}}|{teacherId}/g, emp.teacherId || '')
            .replace(/{{phone}}|{phone}/g, emp.phone || '')

          phoneNumbers.push({
            phone: emp.phone,
            studentName: emp.fullName,
            parentName: emp.role,
            message: personalizedMessage
          })
        })
      }

      if (phoneNumbers.length === 0) {
        toast.error(getText('None of the selected recipients have a phone number', 'ከተመረጡት ተቀባዮች ውስጥ ስልክ ቁጥር ያለው የለም'))
        setSending(false)
        return
      }

      const smsRecipients = phoneNumbers.map(p => ({
        phone: p.phone,
        message: p.message,
        studentName: p.studentName,
        parentName: p.parentName
      }))
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/sms/send`,
        { recipients: smsRecipients },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 120000 }
      )

      const { sent, failed, errors } = result.data
      const totalRecipientsCount = recipientType === 'students' ? selectedStudents.length : selectedEmployees.length

      if (sent > 0) {
        // Record in history ONLY when messages were actually sent
        saveNotificationToHistory(title, message, totalRecipientsCount, phoneNumbers.length, sent, failed, errors || [])

        if (failed > 0) {
          toast(getText(`Sent: ${sent} succeeded, ${failed} failed`, `ተልኳል: ${sent} ተሳክቷል፣ ${failed} አልተሳካም`), { icon: '⚠️', duration: 6000 })
        } else {
          toast.success(getText(`Success: All ${sent} SMS sent successfully`, `ተሳክቷል: ሁሉም ${sent} ኤስኤምኤስ በተሳካ ሁኔታ ተልኳል`))
        }

        setTitle('')
        setMessage('')
        if (recipientType === 'students') {
          setSelectedStudents([])
        } else {
          setSelectedEmployees([])
        }
      } else {
        // 0 sent: do NOT record in history! Keep text so user does not lose it.
        const errDetail = errors?.[0]?.error ? `: ${errors[0].error}` : ''
        toast.error(getText(`Failed: 0 succeeded, ${failed} failed${errDetail}`, `አልተሳካም: 0 ተሳክቷል፣ ${failed} አልተሳካም${errDetail}`), { duration: 7000 })
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || getText('Failed to send notification', 'ማሳወቂያ መላክ አልተሳካም'))
    } finally {
      setSending(false)
    }
  }

  return (
    <DashboardLayout pageTitle={getText('Send Notifications', 'ማሳወቂያዎችን ላክ')}>
      <div className={`min-h-screen p-3 sm:p-5 lg:p-6 pb-24 md:pb-6 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
          {/* Header */}
          <div className={`rounded-xl shadow-lg border mb-6 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className="p-4 sm:px-6 sm:py-5">
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
                <div>
                  <h1 className={`text-xl sm:text-2xl md:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {getText('Send Notifications', 'ማሳወቂያዎችን ላክ')}
                  </h1>
                  <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {recipientType === 'students'
                      ? getText('Send SMS notifications to student parents', 'ለተማሪ ወላጆች የኤስኤምኤስ ማሳወቂያዎችን ይላኩ')
                      : getText('Send SMS notifications to school employees', 'ለትምህርት ቤቱ ሰራተኞች የኤስኤምኤስ ማሳወቂያዎችን ይላኩ')}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                  {/* Toggle: Students | Employees */}
                  <div className={`p-1 rounded-xl border flex items-center justify-between sm:justify-start gap-1 w-full sm:w-auto ${
                    theme === 'dark' ? 'bg-gray-700/80 border-gray-600' : 'bg-gray-100 border-gray-200'
                  }`}>
                    <button
                      type="button"
                      onClick={() => { setRecipientType('students'); setCurrentPage(1); }}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-all duration-200 ${
                        recipientType === 'students'
                          ? 'bg-blue-600 text-white shadow-md'
                          : theme === 'dark' ? 'text-gray-300 hover:text-white hover:bg-gray-600/50' : 'text-gray-700 hover:text-gray-900 hover:bg-white'
                      }`}
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                      </svg>
                      <span>{getText('Students', 'ተማሪዎች')}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        recipientType === 'students' ? 'bg-white text-blue-600' : theme === 'dark' ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {students.length}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setRecipientType('employees'); setCurrentPage(1); if (employees.length === 0) fetchEmployees(); }}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-all duration-200 ${
                        recipientType === 'employees'
                          ? 'bg-blue-600 text-white shadow-md'
                          : theme === 'dark' ? 'text-gray-300 hover:text-white hover:bg-gray-600/50' : 'text-gray-700 hover:text-gray-900 hover:bg-white'
                      }`}
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span>{getText('Employees', 'ሰራተኞች')}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        recipientType === 'employees' ? 'bg-white text-blue-600' : theme === 'dark' ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {employees.length}
                      </span>
                    </button>
                  </div>

                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95 ${showHistory ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white' : theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{showHistory ? getText('Hide History', 'ታሪክ ደብቅ') : getText('View History', 'ታሪክ ይመልከቱ')}</span>
                    {notificationHistory.length > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${showHistory ? 'bg-white text-blue-600' : theme === 'dark' ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-700'}`}>
                        {notificationHistory.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Notification History (Positioned on top when opened) */}
          {showHistory && (
            <div className={`rounded-xl shadow-lg border mb-6 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
              <div className={`px-6 py-4 border-b flex justify-between items-center ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {getText('Notification History', 'የማሳወቂያ ታሪክ')}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowHistory(false)}
                  className={`text-xs px-2.5 py-1 rounded transition-colors ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                >
                  {getText('Close', 'ዝጋ')}
                </button>
              </div>
              <div className="p-4 max-h-[500px] overflow-y-auto">
                {notificationHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                      {getText('No notification history yet', 'ገና ምንም የማሳወቂያ ታሪክ የለም')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notificationHistory.map((notification) => (
                      <div
                        key={notification._id}
                        className={`rounded-lg border p-4 ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className={`text-xs px-2 py-1 rounded font-medium ${theme === 'dark' ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-800'}`}>
                                {notification.recipients} {getText('students', 'ተማሪዎች')}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded font-medium ${theme === 'dark' ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800'}`}>
                                {notification.sent !== undefined ? notification.sent : notification.phoneNumbers} {getText('sent', 'ተልኳል')}
                              </span>
                              {(notification.failed ?? 0) > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedFailedNotification(notification)}
                                  className={`text-xs px-2.5 py-1 rounded font-medium cursor-pointer transition-all hover:scale-105 flex items-center gap-1 shadow-sm ${
                                    theme === 'dark' ? 'bg-red-900/80 text-red-200 hover:bg-red-800 border border-red-700' : 'bg-red-100 text-red-800 hover:bg-red-200 border border-red-200'
                                  }`}
                                  title={getText('Click to see which students and phone numbers failed', 'ያልተሳኩ ተማሪዎችን እና ስልኮችን ለማየት ጠቅ ያድርጉ')}
                                >
                                  <span>{notification.failed} {getText('failed', 'አልተሳካም')}</span>
                                  <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </button>
                              ) : (
                                <span className={`text-xs px-2 py-1 rounded font-medium ${theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                                  0 {getText('failed', 'አልተሳካም')}
                                </span>
                              )}
                              <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                {new Date(notification.createdAt ?? notification.sentAt ?? Date.now()).toLocaleString()}
                              </span>
                            </div>
                            {notification.title && (
                              <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {notification.title}
                              </p>
                            )}
                            <p className={`text-sm break-words ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                              {notification.message}
                            </p>
                          </div>
                          <button
                            onClick={() => deleteNotificationFromHistory(notification._id)}
                            className={`p-2 rounded-lg transition-all hover:scale-110 flex-shrink-0 ${
                              theme === 'dark' 
                                ? 'hover:bg-red-900/30 text-red-400 hover:text-red-300' 
                                : 'hover:bg-red-50 text-red-500 hover:text-red-600'
                            }`}
                            title={getText('Delete from history', 'ከታሪክ ሰርዝ')}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Message Input & Filters */}
          <div className={`rounded-xl shadow-lg border mb-6 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            {/* Message Input */}
            <div id="composer-box" className={`p-4 sm:px-6 sm:py-5 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  {getText('Message Title', 'የመልእክት ርዕስ')} *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={80}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  placeholder={getText('Enter message title...', 'የመልእክት ርዕስ ያስገቡ...')}
                />
              </div>
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 mb-2">
                <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  {getText('Message', 'መልእክት')} *
                </label>
                <div className="relative">
                  <button
                    onClick={() => setShowVariables(!showVariables)}
                    className={`text-xs sm:text-sm px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 w-full sm:w-auto justify-center font-medium shadow-sm ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600' : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200'}`}
                  >
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                    <span>{getText('Insert Variable', 'ተጨማሪ ያክሉ')}</span>
                  </button>
                  {showVariables && (
                    <>
                      {/* Mobile backdrop */}
                      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs sm:hidden" onClick={() => setShowVariables(false)} />

                      {/* Dropdown on desktop / Bottom sheet on mobile */}
                      <div className={`fixed sm:absolute inset-x-3 bottom-3 sm:bottom-auto sm:inset-x-auto sm:right-0 sm:mt-2 sm:w-80 max-h-[75vh] overflow-y-auto rounded-2xl sm:rounded-xl shadow-2xl z-50 border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <div className="p-3.5 sm:p-3">
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 dark:border-gray-700">
                            <span className={`text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                              {getText('Choose a variable', 'ተጨማሪ ይምረጡ')}
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowVariables(false)}
                              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          <div className="space-y-1">
                            {variables.map((variable, index) => (
                              <button
                                key={index}
                                onClick={() => {
                                  setMessage(prev => prev + variable.value)
                                  setShowVariables(false)
                                }}
                                className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors flex items-center justify-between gap-2 ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-200 active:bg-gray-600' : 'hover:bg-blue-50 text-gray-800 active:bg-blue-100'}`}
                              >
                                <span className="font-semibold text-xs sm:text-sm">{getText(variable.label, variable.amharic)}</span>
                                <span className={`text-[11px] font-mono px-2 py-0.5 rounded-md font-bold ${theme === 'dark' ? 'bg-gray-700 text-blue-300' : 'bg-blue-50 text-blue-600 border border-blue-200'}`}>
                                  {variable.value}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={220}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                placeholder={getText('Type your message here...', 'መልእክትዎን እዚህ ይተይቡ...')}
              />
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mt-2">
                <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {message.length}/220 {getText('characters', 'ቁምፊዎች')} {message.length > 160 ? `(2 ${getText('SMS parts', 'ክፍል ኤስኤምኤስ')})` : `(1 SMS)`}
                </span>
                {((recipientType === 'students' && selectedStudents.length > 0) || (recipientType === 'employees' && selectedEmployees.length > 0)) && (
                  <button
                    onClick={handleSendNotification}
                    disabled={sending || !message.trim() || !title.trim()}
                    className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95 ${
                      sending || !message.trim() || !title.trim()
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
                    } text-white`}
                  >
                    {sending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>{getText('Sending...', 'በመላክ ላይ...')}</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        <span>
                          {recipientType === 'students'
                            ? getText(`Send to ${getTotalPhoneNumbers()} numbers`, `ወደ ${getTotalPhoneNumbers()} ቁጥሮች ላክ`)
                            : getText(`Send to ${getTotalEmployeePhoneNumbers()} employee numbers`, `ወደ ${getTotalEmployeePhoneNumbers()} የሰራተኞች ቁጥሮች ላክ`)}
                        </span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className={`p-4 sm:px-6 sm:py-5 ${theme === 'dark' ? 'bg-gray-700/60' : 'bg-gray-50'}`}>
              {recipientType === 'students' ? (
                <div className="flex flex-col gap-4">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder={getText('Search by student name, ID, parent name or phone...', 'በተማሪ ስም፣ መታወቂያ፣ የወላጅ ስም ወይም ስልክ ፈልግ...')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`w-full px-4 py-3 pl-11 border rounded-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
                    <select
                      value={classFilter}
                      onChange={(e) => setClassFilter(e.target.value)}
                      className={`w-full px-3 py-2.5 sm:px-4 sm:py-3 border rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
                    >
                      <option value="all">{getText('All Classes', 'ሁሉም ክፍሎች')}</option>
                      <option value="Nursery">Nursery</option>
                      <option value="LKG">LKG</option>
                      <option value="UKG">UKG</option>
                    </select>
                    <select
                      value={sectionFilter}
                      onChange={(e) => setSectionFilter(e.target.value)}
                      className={`w-full px-3 py-2.5 sm:px-4 sm:py-3 border rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
                    >
                      <option value="all">{getText('All Sections', 'ሁሉም ክፍሎች')}</option>
                      <option value="A">Section A</option>
                      <option value="B">Section B</option>
                      <option value="C">Section C</option>
                      <option value="D">Section D</option>
                    </select>
                    <select
                      value={studentTypeFilter}
                      onChange={(e) => setStudentTypeFilter(e.target.value as 'all' | 'regular' | 'special')}
                      className={`w-full px-3 py-2.5 sm:px-4 sm:py-3 border rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
                    >
                      <option value="all">{getText('All Types', 'ሁሉም አይነቶች')}</option>
                      <option value="regular">{getText('Regular', 'መደበኛ')}</option>
                      <option value="special">{getText('Special', 'ልዩ')}</option>
                    </select>
                    <select
                      value={siblingFilter}
                      onChange={(e) => setSiblingFilter(e.target.value as 'all' | 'siblings' | 'non_siblings')}
                      className={`w-full px-3 py-2.5 sm:px-4 sm:py-3 border rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
                    >
                      <option value="all">{getText('All Students', 'ሁሉም ተማሪዎች')}</option>
                      <option value="siblings">
                        👨‍👩‍👧‍👦 {getText('Siblings Only', 'ወንድም/እህት ብቻ')} ({siblingStudentIds.size})
                      </option>
                      <option value="non_siblings">{getText('Non-Siblings Only', 'ወንድም/እህት የሌላቸው')}</option>
                    </select>
                    <div className="col-span-2 sm:col-span-1">
                      <select
                        value={paymentFilter}
                        onChange={(e) => { setPaymentFilter(e.target.value as 'all' | 'paid' | 'unpaid' | 'paid_but_left'); setPaymentFilteredIds(null) }}
                        className={`w-full px-3 py-2.5 sm:px-4 sm:py-3 border rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
                      >
                        <option value="all">{getText('All Payment Status', 'ሁሉም የክፍያ ሁኔታ')}</option>
                        <option value="paid">{getText('Paid', 'የከፈሉ')}</option>
                        <option value="unpaid">{getText('Unpaid', 'ያልከፈሉ')}</option>
                        <option value="paid_but_left">{getText('Paid but Left', 'ተከፍሎ የቀረበት')}</option>
                      </select>
                    </div>
                    {paymentFilter === 'paid_but_left' && (
                      <div className="col-span-2 sm:col-span-3 lg:col-span-5">
                        <button
                          type="button"
                          onClick={() => {
                            const pblIds = filteredStudents.map(s => s._id)
                            const allSelected = pblIds.length > 0 && pblIds.every(id => selectedStudents.includes(id))
                            if (allSelected) {
                              setSelectedStudents(prev => prev.filter(id => !pblIds.includes(id)))
                            } else {
                              setSelectedStudents(prev => Array.from(new Set([...prev, ...pblIds])))
                            }
                          }}
                          className={`w-full px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all border flex items-center justify-center gap-2 shadow-sm active:scale-98 ${
                            filteredStudents.length > 0 && filteredStudents.every(s => selectedStudents.includes(s._id))
                              ? 'bg-amber-600 text-white border-amber-600 shadow-amber-200 dark:shadow-none'
                              : theme === 'dark' ? 'bg-gray-800 hover:bg-gray-750 text-amber-400 border-gray-600' : 'bg-white hover:bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                          title={getText('Select all students with remaining balance', 'ሁሉንም ተከፍሎ የቀረባቸውን ተማሪዎች ምረጥ')}
                        >
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>
                            {filteredStudents.length > 0 && filteredStudents.every(s => selectedStudents.includes(s._id))
                              ? getText('All Paid but Left Selected', 'ሁሉም ተከፍሎ የቀረባቸው ተመርጠዋል')
                              : getText('Select All Paid but Left', 'ሁሉንም ተከፍሎ የቀረባቸውን ምረጥ')} ({filteredStudents.length})
                          </span>
                        </button>
                      </div>
                    )}
                    {siblingFilter === 'siblings' && (
                      <div className="col-span-2 sm:col-span-3 lg:col-span-5">
                        <button
                          type="button"
                          onClick={() => {
                            const siblingIds = filteredStudents.map(s => s._id)
                            const allSelected = siblingIds.length > 0 && siblingIds.every(id => selectedStudents.includes(id))
                            if (allSelected) {
                              setSelectedStudents(prev => prev.filter(id => !siblingIds.includes(id)))
                            } else {
                              setSelectedStudents(prev => Array.from(new Set([...prev, ...siblingIds])))
                            }
                          }}
                          className={`w-full px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all border flex items-center justify-center gap-2 shadow-sm active:scale-98 ${
                            filteredStudents.length > 0 && filteredStudents.every(s => selectedStudents.includes(s._id))
                              ? 'bg-purple-600 text-white border-purple-600 shadow-purple-200 dark:shadow-none'
                              : theme === 'dark' ? 'bg-gray-800 hover:bg-gray-750 text-purple-400 border-gray-600' : 'bg-white hover:bg-purple-50 text-purple-700 border-purple-200'
                          }`}
                          title={getText('Select all sibling students', 'ሁሉንም ወንድም/እህት ተማሪዎች ምረጥ')}
                        >
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>
                            {filteredStudents.length > 0 && filteredStudents.every(s => selectedStudents.includes(s._id))
                              ? getText('All Siblings Selected', 'ሁሉም ወንድም/እህቶች ተመርጠዋል')
                              : getText('Select All Siblings', 'ሁሉንም ወንድም/እህቶች ምረጥ')} ({filteredStudents.length})
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                  {paymentFilter !== 'all' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3 items-center">
                      <select
                        value={filterYear}
                        onChange={(e) => setFilterYear(e.target.value)}
                        className={`w-full px-4 py-3 border rounded-xl font-medium focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
                        title={getText('Filter by Ethiopian Year', 'በኢትዮጵያ ዓመት አጣራ')}
                      >
                        {availableYears.map(y => {
                          const isNow = y === currentEcYear
                          const label = language === 'am'
                            ? `${y} ዓ.ም${isNow ? ' • አሁን' : ''}`
                            : `${y} E.C${isNow ? ' • Current' : ''}`
                          return (
                            <option key={y} value={String(y)}>
                              {label}
                            </option>
                          )
                        })}
                      </select>
                      <select
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                        className={`w-full px-4 py-3 border rounded-xl font-medium focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
                        title={getText('Filter by Ethiopian Month', 'በኢትዮጵያ ወር አጣራ')}
                      >
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
                      <div className="flex items-center gap-2">
                        {(filterMonth !== currentEcMonth || filterYear !== String(currentEcYear)) && (
                          <button
                            type="button"
                            onClick={() => {
                              setFilterMonth(currentEcMonth)
                              setFilterYear(String(currentEcYear))
                            }}
                            className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors flex items-center gap-1.5 shadow-sm active:scale-95 ${
                              theme === 'dark'
                                ? 'bg-blue-900/40 border-blue-700 text-blue-300 hover:bg-blue-900/60'
                                : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                            }`}
                            title={getText('Reset to current Ethiopian month and year', 'ወደ አሁኑ የኢትዮጵያ ወር እና ዓመት መልስ')}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span>{getText('Now', 'አሁን')}</span>
                          </button>
                        )}
                        {paymentFilterLoading && (
                          <div className="flex items-center gap-2 px-2 py-1 text-sm text-blue-600 dark:text-blue-400">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                            <span>{getText('Loading payments...', 'ክፍያዎችን በመጫን ላይ...')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder={getText('Search by employee name, ID, role or phone...', 'በሰራተኛ ስም፣ መታወቂያ፣ የስራ ድርሻ ወይም ስልክ ፈልግ...')}
                      value={employeeSearchTerm}
                      onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                      className={`w-full px-4 py-3 pl-11 border rounded-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                    <div className="w-full md:w-72">
                      <select
                        value={employeeRoleFilter}
                        onChange={(e) => setEmployeeRoleFilter(e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 font-medium ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
                      >
                        <option value="all">
                          {getText('All Roles', 'ሁሉም የስራ ድርሻዎች')} ({employees.filter(e => e.isActive !== false).length})
                        </option>
                        {employeeRoles.map(({ role, count }) => (
                          <option key={role} value={role}>
                            {role} ({count})
                          </option>
                        ))}
                      </select>
                    </div>

                    {employeeRoleFilter !== 'all' && (
                      <button
                        type="button"
                        onClick={() => {
                          const roleEmpIds = filteredEmployees.map(e => e._id)
                          const allSelected = roleEmpIds.length > 0 && roleEmpIds.every(id => selectedEmployees.includes(id))
                          if (allSelected) {
                            setSelectedEmployees(prev => prev.filter(id => !roleEmpIds.includes(id)))
                          } else {
                            setSelectedEmployees(prev => Array.from(new Set([...prev, ...roleEmpIds])))
                          }
                        }}
                        className={`px-3 py-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border flex items-center justify-center gap-1.5 shadow-sm ${
                          filteredEmployees.length > 0 && filteredEmployees.every(e => selectedEmployees.includes(e._id))
                            ? 'bg-blue-600 text-white border-blue-600'
                            : theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-blue-400 border-gray-600' : 'bg-white hover:bg-gray-50 text-blue-600 border-gray-300'
                        }`}
                        title={getText(`Select all ${employeeRoleFilter}s`, `ሁሉንም ${employeeRoleFilter} ምረጥ`)}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>
                          {filteredEmployees.length > 0 && filteredEmployees.every(e => selectedEmployees.includes(e._id))
                            ? getText(`All ${employeeRoleFilter}s Selected`, `ሁሉም ${employeeRoleFilter} ተመርጧል`)
                            : getText(`Select All ${employeeRoleFilter}s`, `ሁሉንም ${employeeRoleFilter} ምረጥ`)}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recipients List (Students or Employees) */}
          <div className={`rounded-xl shadow-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className={`p-4 sm:px-6 sm:py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <h2 className={`text-base sm:text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {recipientType === 'students' ? getText('Select Recipients', 'ተቀባዮችን ይምረጡ') : getText('Select Employees', 'ሰራተኞችን ይምረጡ')}
                </h2>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold self-start sm:self-auto ${
                  (recipientType === 'students' ? selectedStudents.length : selectedEmployees.length) > 0
                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                    : 'bg-gray-100 dark:bg-gray-750 text-gray-600 dark:text-gray-400'
                }`}>
                  {recipientType === 'students'
                    ? `${selectedStudents.length} ${getText('selected', 'ተመርጠዋል')} • ${getTotalPhoneNumbers()} ${getText('SMS phones', 'ስልኮች')}`
                    : `${selectedEmployees.length} ${getText('selected', 'ተመርጠዋል')} • ${getTotalEmployeePhoneNumbers()} ${getText('SMS phones', 'ስልኮች')}`}
                </span>
              </div>
            </div>

            {(recipientType === 'students' ? loading : loadingEmployees) ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                {recipientType === 'students' ? (
                  <>
                    {/* Desktop Student Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className={`border-b ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                            <th className={`px-6 py-3 text-center text-xs font-medium uppercase ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                              <input
                                type="checkbox"
                                checked={selectedStudents.length > 0 && selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                                onChange={(e) => handleSelectAll(e.target.checked)}
                                className="w-5 h-5 rounded cursor-pointer accent-blue-600"
                              />
                            </th>
                            <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                              {getText('Student', 'ተማሪ')}
                            </th>
                            <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                              {getText('Class', 'ክፍል')}
                            </th>
                            <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                              {getText('Parent Contacts', 'የወላጅ ግንኙነቶች')}
                            </th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-600' : 'divide-gray-100'}`}>
                          {filteredStudents.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-6 py-12 text-center">
                                <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                                  {getText('No students found', 'ተማሪዎች አልተገኙም')}
                                </p>
                              </td>
                            </tr>
                          ) : (
                            paginatedStudents.map((student) => {
                              const isSelected = selectedStudents.includes(student._id)
                              const contacts = getPhoneContacts(student)
                              return (
                                <tr key={student._id} className={`${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} ${isSelected ? theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-50' : ''}`}>
                                  <td className="px-6 py-4 text-center">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => handleSelectStudent(student._id, e.target.checked)}
                                      className="w-5 h-5 rounded cursor-pointer accent-blue-600"
                                    />
                                  </td>
                                  <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-medium">
                                        {getStudentDisplayName(student, language)}
                                      </span>
                                      {siblingStudentIds.has(student._id) && (
                                        <span
                                          className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-semibold"
                                          title={getText(`Has ${siblingCountMap.get(student._id) || ''} siblings in database`, `በዳታቤዝ ውስጥ ${siblingCountMap.get(student._id) || ''} ወንድም/እህት አለው`)}
                                        >
                                          👨‍👩‍👧‍👦 {getText('Sibling', 'ወንድም/እህት')}
                                        </span>
                                      )}
                                       {paymentFinancials?.[student._id] && paymentFinancials[student._id].leftAmount > 0 && (
                                         <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-800">
                                           <span>⚠️</span>
                                           <span>{getText('Left', 'ቀሪ')}: {paymentFinancials[student._id].leftAmount.toLocaleString()} ETB</span>
                                           <span className="text-[10px] opacity-75">({getText('Paid', 'ተከፍሏል')}: {paymentFinancials[student._id].paidAmount.toLocaleString()})</span>
                                         </span>
                                       )}
                                    </div>
                                    <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                      {student.studentId}
                                    </div>
                                  </td>
                                  <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                                    {student.class} {student.section && `- ${student.section}`}
                                  </td>
                                  <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                                    {contacts.length > 0 ? (
                                      <div className="space-y-1">
                                        {contacts.map((contact, index) => (
                                          <div key={index} className="flex items-center gap-2">
                                            <span className={`text-xs px-2 py-1 rounded ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'}`}>
                                              {contact.relation}
                                            </span>
                                            <span className="font-medium">{contact.name}</span>
                                            <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                                              {contact.phone}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="inline-block text-xs px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium">
                                        {getText('No phone number', 'ስልክ ቁጥር የለም')}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              )
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Student Card View */}
                    <div className="md:hidden">
                      {filteredStudents.length === 0 ? (
                        <div className="px-6 py-12 text-center">
                          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                            {getText('No students found', 'ተማሪዎች አልተገኙም')}
                          </p>
                        </div>
                      ) : (
                        <div className="p-4 space-y-4">
                          <div className={`flex items-center gap-3 px-2 py-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                            <input
                              type="checkbox"
                              checked={selectedStudents.length > 0 && selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                              onChange={(e) => handleSelectAll(e.target.checked)}
                              className="w-5 h-5 rounded cursor-pointer accent-blue-600"
                            />
                            <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                              {getText('Select All', 'ሁሉንም ምረጥ')} ({filteredStudents.length})
                            </span>
                          </div>
                          {paginatedStudents.map((student) => {
                            const isSelected = selectedStudents.includes(student._id)
                            const contacts = getPhoneContacts(student)
                            return (
                              <div
                                key={student._id}
                                className={`rounded-xl border p-3.5 sm:p-4 w-full min-w-0 overflow-hidden ${isSelected ? theme === 'dark' ? 'bg-blue-900/30 border-blue-600' : 'bg-blue-50 border-blue-400' : theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}
                              >
                                {/* Student Info with full tappable label */}
                                <label className="flex items-start gap-3 mb-3 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => handleSelectStudent(student._id, e.target.checked)}
                                    className="w-5 h-5 mt-1 rounded cursor-pointer accent-blue-600 flex-shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h3 className={`font-bold text-base ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                        {getStudentDisplayName(student, language)}
                                      </h3>
                                      {siblingStudentIds.has(student._id) && (
                                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-semibold">
                                          👨‍👩‍👧‍👦 {getText('Sibling', 'ወንድም/እህት')}
                                        </span>
                                      )}
                                       {paymentFinancials?.[student._id] && paymentFinancials[student._id].leftAmount > 0 && (
                                         <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-800">
                                           <span>⚠️</span>
                                           <span>{getText('Left', 'ቀሪ')}: {paymentFinancials[student._id].leftAmount.toLocaleString()} ETB</span>
                                           <span className="text-[10px] opacity-75">({getText('Paid', 'ተከፍሏል')}: {paymentFinancials[student._id].paidAmount.toLocaleString()})</span>
                                         </span>
                                       )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-xs">
                                      <span className={`font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {getText('ID', 'መታወቂያ')}: <span className="font-semibold text-gray-900 dark:text-gray-200">{student.studentId}</span>
                                      </span>
                                      <span className={`font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {getText('Class', 'ክፍል')}: <span className="font-semibold text-gray-900 dark:text-gray-200">{student.class} {student.section && `- ${student.section}`}</span>
                                      </span>
                                    </div>
                                  </div>
                                </label>

                                {/* Parent Contacts */}
                                <div className={`pt-3 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'} w-full min-w-0`}>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                      {getText('Parent Contacts', 'የወላጅ ግንኙነቶች')}
                                    </span>
                                    <span className="text-[11px] text-gray-400">
                                      {contacts.length} {getText('contacts', 'ግንኙነት')}
                                    </span>
                                  </div>
                                  {contacts.length > 0 ? (
                                    <div className="space-y-2 w-full min-w-0">
                                      {contacts.map((contact, index) => (
                                        <div
                                          key={index}
                                          className={`p-2.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 w-full min-w-0 overflow-hidden ${
                                            theme === 'dark' ? 'bg-gray-750/70 border-gray-700' : 'bg-gray-50 border-gray-200/80'
                                          }`}
                                        >
                                          <div className="min-w-0 flex items-center gap-2 flex-1 w-full sm:w-auto">
                                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md flex-shrink-0 ${
                                              theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-white text-gray-700 border border-gray-200'
                                            }`}>
                                              {contact.relation}
                                            </span>
                                            <span className={`font-semibold text-xs sm:text-sm truncate ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                                              {contact.name}
                                            </span>
                                          </div>
                                          <a
                                            href={`tel:${contact.phone}`}
                                            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 transition-colors shadow-sm active:scale-95 flex-shrink-0"
                                          >
                                            <span>📞</span>
                                            <span className="truncate">{contact.phone}</span>
                                          </a>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="inline-block text-xs px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-medium">
                                      {getText('No phone number', 'ስልክ ቁጥር የለም')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Desktop Employee Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className={`border-b ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                            <th className={`px-6 py-3 text-center text-xs font-medium uppercase ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                              <input
                                type="checkbox"
                                checked={selectedEmployees.length > 0 && selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0}
                                onChange={(e) => handleSelectAllEmployees(e.target.checked)}
                                className="w-5 h-5 rounded cursor-pointer accent-blue-600"
                              />
                            </th>
                            <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                              {getText('Employee', 'ሰራተኛ')}
                            </th>
                            <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                              {getText('Role / Position', 'የስራ ድርሻ')}
                            </th>
                            <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                              {getText('Phone Number', 'ስልክ ቁጥር')}
                            </th>
                            <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                              {getText('Portal Credentials', 'የፖርታል መለያ')}
                            </th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-600' : 'divide-gray-100'}`}>
                          {filteredEmployees.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-6 py-12 text-center">
                                <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                                  {getText('No employees found', 'ሰራተኞች አልተገኙም')}
                                </p>
                              </td>
                            </tr>
                          ) : (
                            paginatedEmployees.map((emp) => {
                              const isSelected = selectedEmployees.includes(emp._id)
                              const username = emp.portalUsername || emp.teacherId || 'N/A'
                              const hasPassword = !!emp.portalPassword
                              return (
                                <tr key={emp._id} className={`${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} ${isSelected ? theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-50' : ''}`}>
                                  <td className="px-6 py-4 text-center">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => handleSelectEmployee(emp._id, e.target.checked)}
                                      className="w-5 h-5 rounded cursor-pointer accent-blue-600"
                                    />
                                  </td>
                                  <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                                    <div className="font-semibold">{emp.fullName}</div>
                                    <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                      {getText('ID', 'መታወቂያ')}: <span className="font-mono">{emp.teacherId}</span>
                                    </div>
                                  </td>
                                  <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                                    <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${
                                      theme === 'dark' ? 'bg-blue-900/40 text-blue-300 border border-blue-800' : 'bg-blue-50 text-blue-700 border border-blue-200'
                                    }`}>
                                      {emp.role}
                                    </span>
                                  </td>
                                  <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'} text-sm`}>
                                    {emp.phone && emp.phone.trim() ? (
                                      <span className="font-mono">📞 {emp.phone}</span>
                                    ) : (
                                      <span className="inline-block text-xs px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium">
                                        {getText('No phone number', 'ስልክ ቁጥር የለም')}
                                      </span>
                                    )}
                                  </td>
                                  <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                                    {emp.role === 'Teacher' ? (
                                      <div className="flex flex-col gap-1 text-xs">
                                        <div>
                                          <span className="font-medium text-gray-500 dark:text-gray-400">{getText('Username', 'መለያ')}: </span>
                                          <span className="font-mono font-semibold">{username}</span>
                                        </div>
                                        <div>
                                          <span className="font-medium text-gray-500 dark:text-gray-400">{getText('Password', 'የይለፍ ቃል')}: </span>
                                          {hasPassword ? (
                                            <span className="inline-block px-2 py-0.5 rounded font-mono bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-semibold">
                                              {emp.portalPassword}
                                            </span>
                                          ) : (
                                            <span className="inline-block px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                                              {getText('Not generated', 'አልተፈጠረም')}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-gray-400 italic">
                                        {getText('N/A (Teachers only)', 'አይመለከትም (ለመምህራን ብቻ)')}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              )
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Employee Card View */}
                    <div className="md:hidden">
                      {filteredEmployees.length === 0 ? (
                        <div className="px-6 py-12 text-center">
                          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                            {getText('No employees found', 'ሰራተኞች አልተገኙም')}
                          </p>
                        </div>
                      ) : (
                        <div className="p-4 space-y-4">
                          <div className={`flex items-center gap-3 px-2 py-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                            <input
                              type="checkbox"
                              checked={selectedEmployees.length > 0 && selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0}
                              onChange={(e) => handleSelectAllEmployees(e.target.checked)}
                              className="w-5 h-5 rounded cursor-pointer accent-blue-600"
                            />
                            <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                              {getText('Select All', 'ሁሉንም ምረጥ')} ({filteredEmployees.length})
                            </span>
                          </div>
                          {paginatedEmployees.map((emp) => {
                            const isSelected = selectedEmployees.includes(emp._id)
                            const username = emp.portalUsername || emp.teacherId || 'N/A'
                            const hasPassword = !!emp.portalPassword
                            return (
                              <div
                                key={emp._id}
                                className={`rounded-xl border p-3.5 sm:p-4 w-full min-w-0 overflow-hidden ${isSelected ? theme === 'dark' ? 'bg-blue-900/30 border-blue-600' : 'bg-blue-50 border-blue-400' : theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}
                              >
                                <label className="flex items-start gap-3 mb-3 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => handleSelectEmployee(emp._id, e.target.checked)}
                                    className="w-5 h-5 mt-1 rounded cursor-pointer accent-blue-600 flex-shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <h3 className={`font-bold text-base truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                        {emp.fullName}
                                      </h3>
                                      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full flex-shrink-0 ${
                                        theme === 'dark' ? 'bg-blue-900/40 text-blue-300 border border-blue-800' : 'bg-blue-50 text-blue-700 border border-blue-200'
                                      }`}>
                                        {emp.role}
                                      </span>
                                    </div>
                                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                      {getText('ID', 'መታወቂያ')}: <span className="font-mono font-semibold">{emp.teacherId}</span>
                                    </p>
                                    <div className="mt-2">
                                      {emp.phone && emp.phone.trim() ? (
                                        <a
                                          href={`tel:${emp.phone}`}
                                          onClick={(e) => e.stopPropagation()}
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 transition-colors shadow-sm active:scale-95"
                                        >
                                          <span>📞</span>
                                          <span>{emp.phone}</span>
                                        </a>
                                      ) : (
                                        <span className="inline-block text-xs px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-medium">
                                          {getText('No phone number', 'ስልክ ቁጥር የለም')}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </label>
                                <div className={`pt-3 border-t text-xs space-y-1 ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}>
                                  {emp.role === 'Teacher' ? (
                                    <>
                                      <div>
                                        <span className="text-gray-500 dark:text-gray-400">{getText('Username', 'መለያ')}: </span>
                                        <span className="font-mono font-semibold">{username}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500 dark:text-gray-400">{getText('Password', 'የይለፍ ቃል')}: </span>
                                        {hasPassword ? (
                                          <span className="font-mono text-green-600 dark:text-green-400 font-semibold">{emp.portalPassword}</span>
                                        ) : (
                                          <span className="text-amber-600 dark:text-amber-400">{getText('Not generated', 'አልተፈጠረም')}</span>
                                        )}
                                      </div>
                                    </>
                                  ) : (
                                    <p className="text-xs text-gray-400 italic">
                                      {getText('Portal Login: N/A (Teachers only)', 'የፖርታል መለያ: አይመለከትም (ለመምህራን ብቻ)')}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Pagination Controls */}
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={recipientType === 'students' ? filteredStudents.length : filteredEmployees.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={(page) => setCurrentPage(page)}
                  itemName={recipientType === 'students' ? { en: 'students', am: 'ተማሪዎች' } : { en: 'employees', am: 'ሰራተኞች' }}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Mobile Action Bar */}
      {((recipientType === 'students' && selectedStudents.length > 0) || (recipientType === 'employees' && selectedEmployees.length > 0)) && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 p-3 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 shadow-2xl z-40">
          <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
            <div className="min-w-0">
              <span className="block text-xs font-bold text-gray-900 dark:text-white truncate">
                {recipientType === 'students'
                  ? `${selectedStudents.length} ${getText('students', 'ተማሪዎች')}`
                  : `${selectedEmployees.length} ${getText('employees', 'ሰራተኞች')}`}
              </span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                {recipientType === 'students'
                  ? `${getTotalPhoneNumbers()} ${getText('SMS phones', 'ስልኮች')}`
                  : `${getTotalEmployeePhoneNumbers()} ${getText('SMS phones', 'ስልኮች')}`}
              </span>
            </div>
            <button
              type="button"
              onClick={handleSendNotification}
              disabled={sending}
              className="flex-1 max-w-[210px] py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>{getText('Sending...', 'በመላክ ላይ...')}</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span>{getText('Send SMS Now', 'አሁን ኤስኤምኤስ ላክ')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Modal showing which student name & phone number failed */}
      {selectedFailedNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-2xl rounded-2xl shadow-2xl border p-6 max-h-[85vh] flex flex-col ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="flex justify-between items-start pb-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {getText('Failed Deliveries', 'ያልተሳኩ መላኮች')} ({selectedFailedNotification.failed ?? selectedFailedNotification.failedDetails?.length ?? 0})
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {selectedFailedNotification.title}
                </p>
              </div>
              <button
                onClick={() => setSelectedFailedNotification(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto my-4 space-y-3 flex-1 pr-1">
              {selectedFailedNotification.failedDetails && selectedFailedNotification.failedDetails.length > 0 ? (
                selectedFailedNotification.failedDetails.map((f, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                      theme === 'dark' ? 'bg-gray-700/60 border-gray-600' : 'bg-red-50/60 border-red-100'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-sm">
                        {f.studentName || getText('Student', 'ተማሪ')}
                      </p>
                      {f.parentName && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {getText('Contact', 'ተቀባይ')}: {f.parentName}
                        </p>
                      )}
                      <p className="text-xs font-mono font-medium text-blue-600 dark:text-blue-400 mt-1">
                        📞 {f.phone}
                      </p>
                    </div>
                    <div className="sm:text-right">
                      <span className="inline-block text-xs px-2.5 py-1 rounded-md font-medium bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">
                        {f.error || getText('Delivery failed', 'መላክ አልተሳካም')}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  <p>{getText('No detailed recipient records for this older entry.', 'ለዚህ የቆየ መዝገብ የተወሰነ ዝርዝር የለም።')}</p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setSelectedFailedNotification(null)}
                className="px-5 py-2 text-sm rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition"
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
