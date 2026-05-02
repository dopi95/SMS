'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/DashboardLayout';

import { useSettings } from '@/contexts/SettingsContext';
import { usePermissions } from '@/contexts/PermissionsContext';

interface Student {
  _id: string;
  studentId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  firstNameAmharic?: string;
  middleNameAmharic?: string;
  lastNameAmharic?: string;
  email?: string;
  gender: string;
  dateOfBirth?: string;
  joinedYear: string;
  class: string;
  section?: string;
  address?: string;
  paymentCode?: string;
  photo?: string;
  fatherName?: string;
  fatherPhone?: string;
  fatherPhoto?: string;
  motherName?: string;
  motherPhone?: string;
  motherPhoto?: string;
}

interface Payment {
  _id: string;
  studentId: string;
  month: string;
  year: number;
  amount: number;
  description: string;
  paymentDate: string;
  status: string;
}

interface Credential {
  username: string | null;
  password: string | null;
}

export default function ViewStudentPage() {
  const { language, theme, getText } = useSettings();
  const { role } = usePermissions();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([])
  const [credential, setCredential] = useState<Credential | null>(null);
  const [credLoading, setCredLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [generatingSingle, setGeneratingSingle] = useState(false);
  const [selectedYear, setSelectedYear] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedYear = localStorage.getItem('studentDetailYear')
      return savedYear ? Number(savedYear) : 2019
    }
    return 2019
  })
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    fetchStudent();
  }, []);

  useEffect(() => {
    if (role === 'superadmin') fetchCredential();
  }, [role]);

  useEffect(() => {
    fetchPayments();
    // Save to localStorage when changed
    localStorage.setItem('studentDetailYear', selectedYear.toString())
  }, [selectedYear]);

  const fetchCredential = async () => {
    setCredLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/students/${params.id}/credential`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCredential(res.data);
    } catch {
      setCredential({ username: null, password: null });
    } finally {
      setCredLoading(false);
    }
  };

  const handleGenerateCredential = async () => {
    setGeneratingSingle(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/students/${params.id}/generate-credential`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCredential({ username: res.data.username, password: res.data.password });
      toast.success(getText('Credential generated!', 'ምስክርነት ተፈጥሯል!'));
    } catch {
      toast.error(getText('Failed to generate credential', 'ምስክርነት መፍጠር አልተሳካም'));
    } finally {
      setGeneratingSingle(false);
    }
  };

  const downloadCredentialPDF = async () => {
    if (!student || !credential?.username) return;
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });

    const fullName = language === 'am' && student.firstNameAmharic
      ? `${student.firstNameAmharic} ${student.middleNameAmharic || ''} ${student.lastNameAmharic || ''}`.trim()
      : `${student.firstName} ${student.middleName} ${student.lastName}`;

    const W = doc.internal.pageSize.getWidth();

    // Header bar
    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, W, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Bluelight Academy', W / 2, 10, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Student Portal Credentials', W / 2, 17, { align: 'center' });

    // Card background
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(10, 28, W - 20, 90, 4, 4, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(10, 28, W - 20, 90, 4, 4, 'S');

    // Student name
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(fullName, W / 2, 42, { align: 'center' });

    // Student ID
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`ID: ${student.studentId}  |  Class: ${student.class}${student.section ? '  Section: ' + student.section : ''}`, W / 2, 50, { align: 'center' });

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.line(18, 55, W - 18, 55);

    // Username box
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(14, 60, W - 28, 18, 3, 3, 'F');
    doc.setDrawColor(147, 197, 253);
    doc.roundedRect(14, 60, W - 28, 18, 3, 3, 'S');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('USERNAME', 18, 66);
    doc.setTextColor(29, 78, 216);
    doc.setFontSize(12);
    doc.setFont('courier', 'bold');
    doc.text(credential.username, 18, 74);

    // Password box
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(14, 83, W - 28, 18, 3, 3, 'F');
    doc.setDrawColor(134, 239, 172);
    doc.roundedRect(14, 83, W - 28, 18, 3, 3, 'S');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('PASSWORD', 18, 89);
    doc.setTextColor(21, 128, 61);
    doc.setFontSize(12);
    doc.setFont('courier', 'bold');
    doc.text(credential.password || '', 18, 97);

    // Warning note
    doc.setFillColor(254, 252, 232);
    doc.roundedRect(10, 122, W - 20, 12, 2, 2, 'F');
    doc.setTextColor(133, 77, 14);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Keep this document confidential. Do not share with others.', W / 2, 129, { align: 'center' });

    // Footer
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, W / 2, 142, { align: 'center' });

    doc.save(`credential_${student.studentId.replace('/', '_')}.pdf`);
    toast.success(getText('PDF downloaded!', 'PDF ወጣ!'));
  };

  const fetchStudent = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/students/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudent(response.data);
    } catch (error) {
      toast.error(getText('❌ Failed to load student details', '❌ የተማሪ ዝርዝሮች መጫን አልተሳካም'));
      router.push('/students');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/payments/student/${params.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setPayments(response.data)
    } catch (error) {
      console.error('Failed to fetch payments:', error)
    }
  }

  const months = ['September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May', 'June']

  const isMonthPaid = (month: string) => {
    return payments.some(p => p.month === month && p.year === selectedYear)
  }

  if (loading) {
    return (
      <DashboardLayout pageTitle="Student Details">
        <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!student) {
    return (
      <DashboardLayout pageTitle="Student Details">
        <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <div className="text-center">
            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{getText('Student not found', 'ተማሪ አልተገኘም')}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle="Student Details">
      <div className={`min-h-screen p-4 sm:p-6 lg:p-8 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-4xl mx-auto">
          <div className={`rounded-lg shadow-sm border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.back()}
                  className={`hover:text-gray-900 transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600'}`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div>
                  <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{getText('Student Details', 'የተማሪ ዝርዝሮች')}</h1>
                  <p className={`mt-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('Complete information for', 'ሙሉ መረጃ ለ')} {language === 'am' && student.firstNameAmharic ? `${student.firstNameAmharic} ${student.lastNameAmharic || ''}` : `${student.firstName} ${student.lastName}`}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-8">
              {/* Photo and Basic Info */}
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0">
                  <div className="w-32 h-32 rounded-lg bg-gray-200 flex items-center justify-center overflow-hidden">
                    {student.photo ? (
                      <img src={student.photo} alt="Student" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-medium text-gray-600">
                        {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{getText('Basic Information', 'መበረታዊ መረጃ')}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{getText('Student ID', 'የተማሪ መለያ')}</label>
                      <p className={`${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>{language === 'am' ? student.studentId.replace('BLUE', 'ብሉ') : student.studentId}</p>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{getText('Payment Code', 'የክፍላ ኮድ')}</label>
                      <p className={`${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>{student.paymentCode || '-'}</p>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{getText('Full Name', 'ሙሉ ስም')}</label>
                      <p className={`${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                        {language === 'am' && student.firstNameAmharic 
                          ? `${student.firstNameAmharic} ${student.middleNameAmharic || ''} ${student.lastNameAmharic || ''}`.trim()
                          : `${student.firstName} ${student.middleName} ${student.lastName}`
                        }
                      </p>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{getText('Gender', 'ጾታ')}</label>
                      <p className={`${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>{getText(student.gender, student.gender === 'Male' ? 'ወንድ' : student.gender === 'Female' ? 'ሴት' : student.gender)}</p>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{getText('Email', 'ኢሜይል')}</label>
                      <p className={`${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>{student.email || '-'}</p>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{getText('Date of Birth', 'የተወልድ ቀን')}</label>
                      <p className={`${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>{student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Amharic Names */}
              {(student.firstNameAmharic || student.middleNameAmharic || student.lastNameAmharic) && (
                <div>
                  <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{getText('Names in Amharic', 'በአማርኛ ስሞች')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">የመጀመሪያ ስም</label>
                      <p className={`${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>{student.firstNameAmharic || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">የአባት ስም</label>
                      <p className={`${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>{student.middleNameAmharic || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">የአያት ስም</label>
                      <p className={`${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>{student.lastNameAmharic || '-'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Academic Information */}
              <div>
                <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{getText('Academic Information', 'የትምህርት መረጃ')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{getText('Class', 'ክፍል')}</label>
                    <p className={`${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>{getText(student.class, student.class === 'Nursery' ? 'ጀማሪ' : student.class === 'LKG' ? 'ደረጃ 1' : student.class === 'UKG' ? 'ደረጃ 2' : student.class)}</p>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{getText('Section', 'ክፍል')}</label>
                    <p className={`${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                      {language === 'am' && student.section ? 
                        (student.section === 'A' ? 'ሀ' : student.section === 'B' ? 'ለ' : student.section === 'C' ? 'ሐ' : student.section === 'D' ? 'መ' : student.section) 
                        : (student.section || '-')
                      }
                    </p>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{getText('Joined Year', 'የተገባ ዓመት')}</label>
                    <p className={`${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>{student.joinedYear}</p>
                  </div>
                </div>
              </div>

              {/* Parent Information */}
              <div>
                <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{getText('Parent Information', 'የወላፃ መረጃ')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className={`font-medium mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{getText('Father', 'አባት')}</h4>
                    <div className="flex items-start gap-4">
                      <div className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center border ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-200'}`}>
                        {student.fatherPhoto
                          ? <img src={student.fatherPhoto} alt="Father" className="w-full h-full object-cover" />
                          : <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        }
                      </div>
                      <div className="space-y-2">
                        <div>
                          <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{getText('Name', 'ስም')}</label>
                          <p className={`${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>{student.fatherName || '-'}</p>
                        </div>
                        <div>
                          <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{getText('Phone', 'ስልክ')}</label>
                          <p className={`${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>{student.fatherPhone || '-'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className={`font-medium mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{getText('Mother', 'እናት')}</h4>
                    <div className="flex items-start gap-4">
                      <div className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center border ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-200'}`}>
                        {student.motherPhoto
                          ? <img src={student.motherPhoto} alt="Mother" className="w-full h-full object-cover" />
                          : <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        }
                      </div>
                      <div className="space-y-2">
                        <div>
                          <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{getText('Name', 'ስም')}</label>
                          <p className={`${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>{student.motherName || '-'}</p>
                        </div>
                        <div>
                          <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{getText('Phone', 'ስልክ')}</label>
                          <p className={`${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>{student.motherPhone || '-'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Address */}
              {student.address && (
                <div>
                  <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{getText('Address', 'አድራሻ')}</h3>
                  <p className={`p-3 rounded-lg ${theme === 'dark' ? 'text-gray-200 bg-gray-700' : 'text-gray-900 bg-gray-50'}`}>{student.address}</p>
                </div>
              )}

              {/* Payment Status */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{getText('Payment Status', 'የክፍያ ሁኔታ')}</h3>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {months.map((month) => {
                    const isPaid = isMonthPaid(month)
                    return (
                      <div
                        key={month}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          isPaid
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : theme === 'dark'
                            ? 'border-gray-600 bg-gray-700'
                            : 'border-gray-300 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${
                            isPaid
                              ? 'text-green-700 dark:text-green-400'
                              : theme === 'dark'
                              ? 'text-gray-300'
                              : 'text-gray-700'
                          }`}>
                            {month.substring(0, 3)}
                          </span>
                          {isPaid ? (
                            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-red-500 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <p className={`text-xs mt-1 ${
                          isPaid
                            ? 'text-green-600 dark:text-green-500'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {isPaid ? getText('Paid', 'ተከፍሏል') : getText('Unpaid', 'አልተከፈለም')}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Portal Credentials — superadmin only */}
              {role === 'superadmin' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-lg font-semibold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      🔑 {getText('Portal Credentials', 'የፖርታል ምስክርነቶች')}
                    </h3>
                    <div className="flex gap-2">
                      {credential?.username && (
                        <button
                          onClick={downloadCredentialPDF}
                          className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          PDF
                        </button>
                      )}
                      <button
                        onClick={handleGenerateCredential}
                        disabled={generatingSingle}
                        className="bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {generatingSingle ? getText('Generating...', 'እየፈጠረ ነው...') : getText('Regenerate', 'ዳግሞ ፍጠር')}
                      </button>
                    </div>
                  </div>

                  {credLoading ? (
                    <div className="flex items-center gap-2 py-4">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-rose-600"></div>
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{getText('Loading...', 'እየጠበቀ ነው...')}</span>
                    </div>
                  ) : credential?.username ? (
                    <div className={`rounded-xl border p-5 space-y-4 ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-rose-50 border-rose-200'}`}>
                      <div className={`text-xs px-3 py-2 rounded-lg flex items-center gap-2 ${theme === 'dark' ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-50 text-yellow-800 border border-yellow-200'}`}>
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {getText('Keep these credentials secure. Share only with the student.', 'እነዚህን ምስክርነቶች በስጥርት ይደብቁ። ለተማሪው ብቻ ይጋሩ።')}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={`block text-xs font-semibold uppercase tracking-wide mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {getText('Username (Student ID)', 'መለያ (የተማሪ መለያ)')}
                          </label>
                          <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border font-mono text-sm ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-blue-300' : 'bg-white border-rose-200 text-blue-700'}`}>
                            <svg className="w-4 h-4 shrink-0 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            <span className="font-semibold">{credential.username}</span>
                          </div>
                        </div>
                        <div>
                          <label className={`block text-xs font-semibold uppercase tracking-wide mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {getText('Password', 'ሽርት')}
                          </label>
                          <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border font-mono text-sm ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-green-300' : 'bg-white border-rose-200 text-green-700'}`}>
                            <svg className="w-4 h-4 shrink-0 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                            <span className="flex-1 font-semibold">{showPassword ? credential.password : '•'.repeat(credential.password?.length || 8)}</span>
                            <button onClick={() => setShowPassword(p => !p)} className="opacity-60 hover:opacity-100 transition-opacity">
                              {showPassword
                                ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              }
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={`rounded-xl border border-dashed p-6 text-center ${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'}`}>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {getText('No credentials generated yet. Click Regenerate to create.', 'ምስክርነቶች ተፈጥረዋል። ፍጠር ለመፍጠር ዳግሞ ፍጠርን ይጫኑ።')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              {role !== 'executive' && (
              <div className={`flex justify-end gap-4 pt-6 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <button
                  onClick={() => router.push(`/students/edit/${student._id}`)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {getText('Edit Student', 'ተማሪ ያርትዑ')}
                </button>
              </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}