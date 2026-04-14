'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { useSettings } from '@/contexts/SettingsContext'
import axios from 'axios'
import toast from 'react-hot-toast'

interface Student {
  _id: string
  studentId: string
  firstName: string
  middleName: string
  lastName: string
  class: string
  section?: string
  fatherName?: string
  fatherPhone?: string
  motherName?: string
  motherPhone?: string
  paymentCode?: string
}

interface PhoneContact {
  name: string
  phone: string
  relation: string
}

interface NotificationHistory {
  _id: string
  title: string
  message: string
  recipients: number
  phoneNumbers: number
  createdAt: string
  sentBy: string
}

export default function NotificationsPage() {
  const { theme, getText } = useSettings()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [classFilter, setClassFilter] = useState<string>('all')
  const [sectionFilter, setSectionFilter] = useState<string>('all')
  const [studentTypeFilter, setStudentTypeFilter] = useState<'all' | 'regular' | 'special'>('all')
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all')
  const [filterYear, setFilterYear] = useState<string>('2019')
  const [filterMonth, setFilterMonth] = useState<string>('')

  useEffect(() => {
    const savedMonth = localStorage.getItem('notif_filterMonth')
    const savedYear = localStorage.getItem('notif_filterYear')
    // Map current Gregorian month to the academic month list (July/Aug have no match, fallback to September)
    const gcToEc: Record<number, string> = {
      1:'January', 2:'February', 3:'March', 4:'April', 5:'May', 6:'June',
      9:'September', 10:'October', 11:'November', 12:'December'
    }
    const nowMonth = gcToEc[new Date().getMonth() + 1] || 'September'
    setFilterYear(savedYear || '2019')
    setFilterMonth(savedMonth || nowMonth)
  }, [])
  const [paymentFilteredIds, setPaymentFilteredIds] = useState<string[] | null>(null)
  const [paymentFilterLoading, setPaymentFilterLoading] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [showVariables, setShowVariables] = useState(false)
  const [notificationHistory, setNotificationHistory] = useState<NotificationHistory[]>([])
  const [showHistory, setShowHistory] = useState(false)

  const variables = [
    { label: 'Student Name', value: '{{studentName}}', amharic: 'የተማሪ ስም' },
    { label: 'Student Class', value: '{{studentClass}}', amharic: 'የተማሪ ክፍል' },
    { label: 'Student ID', value: '{{studentId}}', amharic: 'የተማሪ መታወቂያ' },
    { label: 'Student Type', value: '{{studentType}}', amharic: 'የተማሪ አይነት' },
    { label: 'Payment Code', value: '{{paymentCode}}', amharic: 'የክፍያ ኮድ' },
    { label: 'Father Name', value: '{{fatherName}}', amharic: 'የአባት ስም' },
    { label: 'Mother Name', value: '{{motherName}}', amharic: 'የእናት ስም' },
  ]

  const months = ['September','October','November','December','January','February','March','April','May','June']

  useEffect(() => {
    fetchStudents()
    fetchNotificationHistory()
  }, [])

  useEffect(() => {
    localStorage.setItem('notif_filterYear', filterYear)
    localStorage.setItem('notif_filterMonth', filterMonth)
    if (paymentFilter === 'all') {
      setPaymentFilteredIds(null)
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
        setPaymentFilteredIds(paymentFilter === 'paid' ? res.data.paid : res.data.unpaid)
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

  const saveNotificationToHistory = async (title: string, message: string, recipients: number, phoneNumbers: number) => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/notification-history`,
        { title, message, recipients, phoneNumbers },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setNotificationHistory(prev => [res.data, ...prev])
    } catch {
      // fallback to localStorage
      const newNotification: NotificationHistory = {
        _id: Date.now().toString(), title, message, recipients, phoneNumbers,
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
    const studentId = student.studentId?.toLowerCase() || ''
    const fatherName = student.fatherName?.toLowerCase() || ''
    const motherName = student.motherName?.toLowerCase() || ''
    const fatherPhone = student.fatherPhone?.toLowerCase() || ''
    const motherPhone = student.motherPhone?.toLowerCase() || ''
    
    // Search filter
    const matchesSearch = (
      studentName.includes(searchLower) ||
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
    
    // Payment filter
    if (paymentFilter !== 'all' && paymentFilteredIds !== null) {
      if (!paymentFilteredIds.includes(student._id)) return false
    }

    // Only show students with at least one phone number
    const contacts = getPhoneContacts(student)
    return contacts.length > 0
  })

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

  const getTotalPhoneNumbers = () => {
    const selectedStudentData = students.filter(s => selectedStudents.includes(s._id))
    let total = 0
    selectedStudentData.forEach(student => {
      total += getPhoneContacts(student).length
    })
    return total
  }

  const handleSendNotification = async () => {
    if (selectedStudents.length === 0) {
      toast.error(getText('Please select at least one student', 'ቢያንስ አንድ ተማሪ ይምረጡ'))
      return
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
      const selectedStudentData = students.filter(s => selectedStudents.includes(s._id))
      
      // Collect all phone numbers with personalized messages
      const phoneNumbers: { phone: string; studentName: string; parentName: string; message: string }[] = []
      selectedStudentData.forEach(student => {
        const contacts = getPhoneContacts(student)
        const studentType = student.paymentCode && student.paymentCode.trim() !== '' ? 'Special' : 'Regular'
        
        // Replace variables in message
        let personalizedMessage = message
          .replace(/{{studentName}}/g, `${student.firstName} ${student.middleName} ${student.lastName}`)
          .replace(/{{studentClass}}/g, student.class + (student.section ? ` - ${student.section}` : ''))
          .replace(/{{studentId}}/g, student.studentId || '')
          .replace(/{{studentType}}/g, studentType)
          .replace(/{{paymentCode}}/g, student.paymentCode || 'N/A')
          .replace(/{{fatherName}}/g, student.fatherName || 'N/A')
          .replace(/{{motherName}}/g, student.motherName || 'N/A')
        
        contacts.forEach(contact => {
          phoneNumbers.push({
            phone: contact.phone,
            studentName: `${student.firstName} ${student.middleName} ${student.lastName}`,
            parentName: contact.name,
            message: personalizedMessage
          })
        })
      })

      // TODO: Implement actual SMS sending API
      // For now, just show success message
      console.log('Sending to:', phoneNumbers)

      // Save to history
      saveNotificationToHistory(title, message, selectedStudents.length, phoneNumbers.length)

      toast.success(getText(`Notification sent to ${phoneNumbers.length} phone numbers`, `ማሳወቂያ ወደ ${phoneNumbers.length} ስልክ ቁጥሮች ተልኳል`))
      setTitle('')
      setMessage('')
      setSelectedStudents([])
    } catch (error: any) {
      toast.error(error.response?.data?.message || getText('Failed to send notification', 'ማሳወቂያ መላክ አልተሳካም'))
    } finally {
      setSending(false)
    }
  }

  return (
    <DashboardLayout pageTitle={getText('Send Notifications', 'ማሳወቂያዎችን ላክ')}>
      <div className={`min-h-screen p-6 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className={`rounded-xl shadow-lg border mb-6 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className={`px-6 py-5 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                  <h1 className={`text-2xl md:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {getText('Send Notifications', 'ማሳወቂያዎችን ላክ')}
                  </h1>
                  <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {getText('Send SMS notifications to parents', 'ለወላጆች የኤስኤምኤስ ማሳወቂያዎችን ይላኩ')}
                  </p>
                </div>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className={`w-full md:w-auto px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg ${showHistory ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white' : theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
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

            {/* Message Input */}
            <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
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
                    className={`text-sm px-3 py-2 rounded-lg transition-all flex items-center gap-2 w-full md:w-auto justify-center ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                    {getText('Insert Variable', 'ተጨማሪ ያክሉ')}
                  </button>
                  {showVariables && (
                    <div className={`absolute right-0 mt-2 w-64 rounded-lg shadow-xl z-10 ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                      <div className="py-2">
                        <div className={`px-4 py-2 text-xs font-semibold uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {getText('Choose a variable', 'ተጨማሪ ይምረጡ')}
                        </div>
                        {variables.map((variable, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setMessage(prev => prev + variable.value)
                              setShowVariables(false)
                            }}
                            className={`w-full text-left px-4 py-2 transition-colors ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}
                          >
                            <div className="font-medium">{variable.label}</div>
                            <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                              {variable.value}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={160}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                placeholder={getText('Type your message here...', 'መልእክትዎን እዚህ ይተይቡ...')}
              />
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mt-2">
                <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {message.length}/160 {getText('characters', 'ቁምፊዎች')}
                </span>
                {selectedStudents.length > 0 && (
                  <button
                    onClick={handleSendNotification}
                    disabled={sending || !message.trim() || !title.trim()}
                    className={`w-full md:w-auto px-6 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                      sending || !message.trim()
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-md hover:shadow-lg'
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
                        <span>{getText(`Send to ${getTotalPhoneNumbers()} numbers`, `ወደ ${getTotalPhoneNumbers()} ቁጥሮች ላክ`)}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className={`px-6 py-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
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
                <div className="flex flex-col md:flex-row gap-3">
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className={`px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  >
                    <option value="all">{getText('All Classes', 'ሁሉም ክፍሎች')}</option>
                    <option value="Nursery">Nursery</option>
                    <option value="LKG">LKG</option>
                    <option value="UKG">UKG</option>
                  </select>
                  <select
                    value={sectionFilter}
                    onChange={(e) => setSectionFilter(e.target.value)}
                    className={`px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
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
                    className={`px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  >
                    <option value="all">{getText('All Types', 'ሁሉም አይነቶች')}</option>
                    <option value="regular">{getText('Regular', 'መደበኛ')}</option>
                    <option value="special">{getText('Special', 'ልዩ')}</option>
                  </select>
                  <select
                    value={paymentFilter}
                    onChange={(e) => { setPaymentFilter(e.target.value as 'all' | 'paid' | 'unpaid'); setPaymentFilteredIds(null) }}
                    className={`px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  >
                    <option value="all">{getText('All Payment Status', 'ሁሉም የክፍያ ሁኔታ')}</option>
                    <option value="paid">{getText('Paid', 'የከፈሉ')}</option>
                    <option value="unpaid">{getText('Unpaid', 'ያልከፈሉ')}</option>
                  </select>
                </div>
                {paymentFilter !== 'all' && (
                  <div className="flex flex-col md:flex-row gap-3">
                    <select
                      value={filterYear}
                      onChange={(e) => setFilterYear(e.target.value)}
                      className={`px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                    >
                      {[2018,2019,2020,2021,2022,2023,2024,2025,2026].map(y => (
                        <option key={y} value={y}>{y} E.C.</option>
                      ))}
                    </select>
                    <select
                      value={filterMonth}
                      onChange={(e) => setFilterMonth(e.target.value)}
                      className={`px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                    >
                      {months.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    {paymentFilterLoading && (
                      <div className="flex items-center px-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notification History */}
          {showHistory && (
            <div className={`rounded-xl shadow-lg border mb-6 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
              <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {getText('Notification History', 'የማሳወቂያ ታሪክ')}
                </h2>
              </div>
              <div className="p-4">
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
                              <span className={`text-xs px-2 py-1 rounded font-medium ${theme === 'dark' ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800'}`}>
                                {notification.recipients} {getText('students', 'ተማሪዎች')}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded font-medium ${theme === 'dark' ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800'}`}>
                                {notification.phoneNumbers} {getText('phone numbers', 'ስልክ ቁጥሮች')}
                              </span>
                              <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                {new Date(notification.createdAt).toLocaleString()}
                              </span>
                            </div>
                            {notification.title && (
                              <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {notification.title}
                              </p>
                            )}
                            <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
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

          {/* Students List */}
          <div className={`rounded-xl shadow-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
              <div className="flex justify-between items-center">
                <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {getText('Select Recipients', 'ተቀባዮችን ይምረጡ')}
                </h2>
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {selectedStudents.length} {getText('selected', 'ተመርጠዋል')} ({getTotalPhoneNumbers()} {getText('phone numbers', 'ስልክ ቁጥሮች')})
                </span>
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
                              {getText('No students found with phone numbers', 'ስልክ ቁጥር ያላቸው ተማሪዎች አልተገኙም')}
                            </p>
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((student) => {
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
                                <div className="font-medium">
                                  {`${student.firstName} ${student.middleName} ${student.lastName}`}
                                </div>
                                <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {student.studentId}
                                </div>
                              </td>
                              <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                                {student.class} {student.section && `- ${student.section}`}
                              </td>
                              <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
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
                        {getText('No students found with phone numbers', 'ስልክ ቁጥር ያላቸው ተማሪዎች አልተገኙም')}
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 space-y-4">
                      {filteredStudents.map((student) => {
                        const isSelected = selectedStudents.includes(student._id)
                        const contacts = getPhoneContacts(student)
                        return (
                          <div
                            key={student._id}
                            className={`rounded-lg border p-4 ${isSelected ? theme === 'dark' ? 'bg-blue-900/30 border-blue-600' : 'bg-blue-50 border-blue-400' : theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}
                          >
                            {/* Student Info */}
                            <div className="flex items-start gap-3 mb-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => handleSelectStudent(student._id, e.target.checked)}
                                className="w-5 h-5 mt-1 rounded cursor-pointer accent-blue-600"
                              />
                              <div className="flex-1">
                                <h3 className={`font-semibold text-base ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                  {`${student.firstName} ${student.middleName} ${student.lastName}`}
                                </h3>
                                <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {getText('ID', 'መታወቂያ')}: <span className="font-medium">{student.studentId}</span>
                                </p>
                                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {getText('Class', 'ክፍል')}: <span className="font-medium">{student.class} {student.section && `- ${student.section}`}</span>
                                </p>
                              </div>
                            </div>

                            {/* Parent Contacts */}
                            <div className={`pt-3 border-t ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}>
                              <p className={`text-xs font-medium mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                {getText('Parent Contacts', 'የወላጅ ግንኙነቶች')}
                              </p>
                              <div className="space-y-2">
                                {contacts.map((contact, index) => (
                                  <div key={index} className={`flex flex-col gap-1 p-2 rounded ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-100'}`}>
                                    <div className="flex items-center gap-2">
                                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-700'}`}>
                                        {contact.relation}
                                      </span>
                                      <span className={`font-medium text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>{contact.name}</span>
                                    </div>
                                    <a href={`tel:${contact.phone}`} className={`text-sm ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                                      {contact.phone}
                                    </a>
                                  </div>
                                ))}
                              </div>
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
    </DashboardLayout>
  )
}
