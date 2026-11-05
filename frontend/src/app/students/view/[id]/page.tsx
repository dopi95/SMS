'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/DashboardLayout';

import { useSettings } from '@/contexts/SettingsContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import {
  calcAgeFromDOB,
  ETHIOPIAN_ACADEMIC_MONTHS,
  getCurrentEthiopianAcademicMonth,
  getCurrentEthiopianYear,
  calculateMonthlyFeePenalty
} from '@/utils/dateUtils';

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
  studentType?: string;
  photo?: string;
  fatherName?: string;
  fatherPhone?: string;
  fatherPhoto?: string;
  motherName?: string;
  motherPhone?: string;
  motherPhoto?: string;
  clearedBalanceMonths?: { year: number; month: string }[];
  createdAt?: string;
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
  balanceCleared?: boolean;
}


interface FeeSetting {
  _id: string;
  year: number;
  month: string;
  monthlyFee: number;
  penaltyAssignTo?: 'all' | 'regular' | 'special' | 'none';
  applyFor?: 'all' | 'regular' | 'special' | 'none';
  penaltyFee: number;
  penaltyDay: number;
  siblingDiscount?: number;
}

interface SiblingStudent {
  _id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  studentId: string;
  class: string;
  section?: string;
  paymentCode?: string;
  photo?: string;
  fatherName?: string;
  motherName?: string;
  joinedYear?: string;
}

interface Credential {
  username: string | null;
  password: string | null;
}

const toTitleCase = (str?: string): string => {
  if (!str) return '';
  const s = String(str).trim().replace(/\s+/g, ' ');
  if (!s) return '';
  return s
    .toLowerCase()
    .replace(/(?:^|[^\p{L}\p{N}])(\p{L})/gu, (match, letter) =>
      match.slice(0, -letter.length) + letter.toUpperCase()
    );
};


const getInitials = (firstName?: string, middleName?: string, lastName?: string) => {
  const f = firstName?.trim().charAt(0) || '';
  const m = middleName?.trim().charAt(0) || lastName?.trim().charAt(0) || '';
  return `${f}${m}`.toUpperCase();
};

export default function ViewStudentPage() {
  const { language, theme, getText } = useSettings();
  const { role } = usePermissions();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([])
  const [feeSettings, setFeeSettings] = useState<FeeSetting[]>([]);

  useEffect(() => {
    fetchFeeSettings();
    fetchSiblings();
  }, []);
  const [siblings, setSiblings] = useState<SiblingStudent[]>([]);
  const [loadingSiblings, setLoadingSiblings] = useState(false);

  const fetchSiblings = async () => {
    if (!params.id) return;
    setLoadingSiblings(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/students/${params.id}/siblings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSiblings(res.data?.siblings || []);
    } catch (err) {
      console.error('Failed to fetch siblings:', err);
      setSiblings([]);
    } finally {
      setLoadingSiblings(false);
    }
  };


  const fetchFeeSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/fee-settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeeSettings(res.data || []);
    } catch (error) {
      console.error('Failed to fetch fee settings:', error);
    }
  };

  const [credential, setCredential] = useState<Credential | null>(null);
  const [credLoading, setCredLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [generatingSingle, setGeneratingSingle] = useState(false);
  const currentEcYear = getCurrentEthiopianYear();
  const currentEcMonth = getCurrentEthiopianAcademicMonth();
  const [selectedYear, setSelectedYear] = useState<number>(currentEcYear);

  const baseStartYear = 2018;
  const maxYear = Math.max(currentEcYear + 5, 2026);
  const availableYears = Array.from({ length: maxYear - baseStartYear + 1 }, (_, i) => baseStartYear + i);

  // Keep year aligned if calendar year rolls over
  useEffect(() => {
    const timer = setInterval(() => {
      const nowYear = getCurrentEthiopianYear();
      setSelectedYear(prev => prev === currentEcYear ? nowYear : prev);
    }, 60000);
    return () => clearInterval(timer);
  }, [currentEcYear]);
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
      : [toTitleCase(student.firstName), toTitleCase(student.middleName), toTitleCase(student.lastName)].filter(Boolean).join(' ');

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

  const [clearingMonth, setClearingMonth] = useState<string | null>(null);

  const handleSetLeftToZero = async (month: string) => {
    if (role !== 'superadmin') {
      toast.error(getText('Only superadmin can make the left balance 0.', 'ቀሪውን 0 ማድረግ የሚችለው ሱፐርአድሚን ብቻ ነው።'));
      return;
    }

    const monthMeta = ETHIOPIAN_ACADEMIC_MONTHS.find(m => m.value === month);
    const displayName = language === 'am' ? (monthMeta?.am || month) : (monthMeta?.en || month);

    const confirmed = window.confirm(
      getText(
        `Are you sure you want to set the left balance for ${displayName} ${selectedYear} to 0 ETB? (Original paid amount on payments page will NOT be changed)`,
        `የ${displayName} ${selectedYear} ቀሪ ሂሳብን ወደ 0 ብር መቀየር እርግጠኛ ነዎት? (በክፍያ ገጽ ላይ የተመዘገበው ክፍያ ሳይቀየር እንዳለ ይቆያል)`
      )
    );
    if (!confirmed) return;

    setClearingMonth(month);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/payments/clear-balance`,
        {
          studentId: params.id,
          month,
          year: selectedYear
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(
        getText(
          `Left balance for ${displayName} set to 0 ETB!`,
          `የ${displayName} ቀሪ ሂሳብ ወደ 0 ብር ተቀይሯል!`
        )
      );

      await Promise.all([fetchPayments(), fetchStudent()]);
    } catch (err: any) {
      console.error('Failed to clear balance:', err);
      toast.error(
        err.response?.data?.message ||
        getText('Failed to set balance to 0.', 'ቀሪውን ወደ 0 መቀየር አልተሳካም።')
      );
    } finally {
      setClearingMonth(null);
    }
  };

  
  const isRegularStudent = Boolean(student?.paymentCode && student.paymentCode.trim() !== '');
  const studentCategory: 'regular' | 'special' = isRegularStudent ? 'regular' : 'special';
  const hasSiblings = siblings.length > 0;
  const totalSiblingsInFamily = hasSiblings ? siblings.length + 1 : 1;

  // Active sibling discount for the year or global
  const activeSiblingDiscount = (() => {
    const yearSettingWithDiscount = feeSettings.find(fs => fs.year === selectedYear && fs.siblingDiscount && fs.siblingDiscount > 0);
    if (yearSettingWithDiscount) return yearSettingWithDiscount.siblingDiscount || 0;
    const anyWithDiscount = feeSettings.find(fs => fs.siblingDiscount && fs.siblingDiscount > 0);
    return anyWithDiscount?.siblingDiscount || 0;
  })();

  const findMatchingFeeSetting = (year: number, month: string): FeeSetting | null => {
    // 1. Direct match for this specific month & year
    const exact = feeSettings.find(fs => fs.year === year && fs.month === month);
    if (exact) return exact;

    // 2. Fallback: If superadmin configured any monthly fee in this year, reuse that base fee
    const anyInYear = feeSettings.find(fs => fs.year === year);
    if (anyInYear) {
      return {
        _id: 'inherited_' + year + '_' + month,
        year,
        month,
        monthlyFee: anyInYear.monthlyFee,
        penaltyAssignTo: anyInYear.penaltyAssignTo || anyInYear.applyFor || 'all',
        penaltyFee: anyInYear.penaltyFee,
        penaltyDay: anyInYear.penaltyDay,
        siblingDiscount: anyInYear.siblingDiscount ?? activeSiblingDiscount
      };
    }

    // 3. Fallback: If superadmin configured any fee setting overall in settings
    if (feeSettings.length > 0) {
      const fallback = feeSettings[0];
      return {
        _id: 'default_' + month,
        year,
        month,
        monthlyFee: fallback.monthlyFee,
        penaltyAssignTo: fallback.penaltyAssignTo || fallback.applyFor || 'all',
        penaltyFee: fallback.penaltyFee,
        penaltyDay: fallback.penaltyDay,
        siblingDiscount: fallback.siblingDiscount ?? activeSiblingDiscount
      };
    }

    return null;
  };

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
                  <p className={`mt-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    {getText('Complete information for', 'ሙሉ መረጃ ለ')}{' '}
                    {language === 'am' && student.firstNameAmharic 
                      ? `${student.firstNameAmharic} ${student.middleNameAmharic || ''}`.trim() 
                      : [toTitleCase(student.firstName), toTitleCase(student.middleName)].filter(Boolean).join(' ')}
                  </p>
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
                        {getInitials(student.firstName, student.middleName, student.lastName)}
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
                          : [toTitleCase(student.firstName), toTitleCase(student.middleName), toTitleCase(student.lastName)].filter(Boolean).join(' ')
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
                      <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{getText('Date of Birth (E.C)', 'የተወልድ ቀን')}</label>
                      <p className={`${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>{student.dateOfBirth && student.dateOfBirth !== 'Invalid Date' ? student.dateOfBirth : '-'}</p>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{getText('Age', 'ዕድሜ')}</label>
                      <p className={`${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                        {student.dateOfBirth && student.dateOfBirth !== 'Invalid Date' && calcAgeFromDOB(student.dateOfBirth) !== null
                          ? `${calcAgeFromDOB(student.dateOfBirth)} yrs`
                          : '-'}
                      </p>
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
                  <div>
                    <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{getText('Student Type', 'የተማሪ አይነት')}</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                      student.studentType === 'new'
                        ? 'bg-green-100 text-green-700'
                        : student.studentType === 'existing'
                        ? 'bg-blue-100 text-blue-700'
                        : theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {student.studentType === 'new' ? 'New · አዲስ' : student.studentType === 'existing' ? 'Existing · ነባር' : student.studentType || '-'}
                    </span>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{getText('Registration Date', 'የምዝገባ ቀን')}</label>
                    <p className={`${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                      {student.createdAt ? new Date(student.createdAt).toLocaleString() : '-'}
                    </p>
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
                          <p className={`${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>{student.fatherName ? toTitleCase(student.fatherName) : '-'}</p>
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
                          <p className={`${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>{student.motherName ? toTitleCase(student.motherName) : '-'}</p>
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
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{getText('Payment Status', 'የክፍያ ሁኔታ')}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 font-medium">
                      {getText('Ethiopian Calendar', 'የኢትዮጵያ ዘመን አቆጣጠር')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-medium ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
                      title={getText('Filter by Ethiopian Year', 'በኢትዮጵያ ዓመት አጣራ')}
                    >
                      {availableYears.map(y => {
                        const isNow = y === currentEcYear;
                        const label = language === 'am'
                          ? `${y} ዓ.ም${isNow ? ' • አሁን' : ''}`
                          : `${y} E.C${isNow ? ' • Current' : ''}`;
                        return (
                          <option key={y} value={y}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                    {selectedYear !== currentEcYear && (
                      <button
                        type="button"
                        onClick={() => setSelectedYear(currentEcYear)}
                        title={getText('Reset to Ethiopian current year', 'ወደ የአሁኑ የኢትዮጵያ ዓመት መልስ')}
                        className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap shadow-sm active:scale-95 ${
                          theme === 'dark'
                            ? 'bg-blue-900/40 hover:bg-blue-800/60 text-blue-300 border border-blue-700/50'
                            : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>{getText('Now', 'አሁን')}</span>
                      </button>
                    )}
                  </div>
                </div>
                {/* Sibling Group Family Card (if student has siblings) */}
                {hasSiblings && (
                  <div className="mb-5 p-4 sm:p-5 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-gradient-to-r from-indigo-50/90 to-blue-50/70 dark:from-indigo-950/30 dark:to-blue-950/20 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">👨‍👩‍👧‍👦</span>
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-white text-base">
                            {getText('Sibling Family Group', 'የወንድማማቾች ቤተሰብ ቡድን')}
                          </h4>
                          <p className="text-xs text-indigo-700 dark:text-indigo-300">
                            {totalSiblingsInFamily} {getText('siblings enrolled in academy', 'ወንድማማች ተማሪዎች ተመዝግበዋል')}
                          </p>
                        </div>
                      </div>

                      {activeSiblingDiscount > 0 ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border border-green-300 dark:border-green-700">
                          🎉 {activeSiblingDiscount}% {getText('Sibling Discount Applied', 'የወንድም/እህት ቅናሽ ተሰልቷል')}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {getText('No sibling discount configured in settings', 'በቅንብሮች ውስጥ የወንድም/እህት ቅናሽ አልተዘጋጀም')}
                        </span>
                      )}
                    </div>

                    {/* Sibling members list */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      <div className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                        <span>⭐</span>
                        <span>{student.firstName} {student.middleName} ({student.class}{student.section ? '-' + student.section : ''})</span>
                        <span className="opacity-80 text-[10px]">({getText('Current', 'የአሁኑ')})</span>
                      </div>
                      {siblings.map(sib => (
                        <a
                          key={sib._id}
                          href={`/students/view/${sib._id}`}
                          className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 text-gray-800 dark:text-gray-200 border border-indigo-200 dark:border-indigo-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
                        >
                          <span>👤</span>
                          <span>{sib.firstName} {sib.middleName} ({sib.class}{sib.section ? '-' + sib.section : ''})</span>
                          <span className="text-[10px] text-gray-400">({sib.studentId})</span>
                        </a>
                      ))}
                    </div>

                    {/* Family combined fee and discount calculation */}
                    {(() => {
                      const sampleSetting = findMatchingFeeSetting(selectedYear, 'September') || feeSettings[0];
                      if (!sampleSetting) return null;
                      const baseFee = sampleSetting.monthlyFee;
                      const combinedBase = baseFee * totalSiblingsInFamily;
                      const combinedDiscount = (combinedBase * activeSiblingDiscount) / 100;
                      const combinedNet = combinedBase - combinedDiscount;

                      return (
                        <div className="mt-3 pt-3 border-t border-indigo-200/80 dark:border-indigo-800/50 text-xs space-y-1.5 text-gray-700 dark:text-gray-300">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div className="p-2.5 rounded-lg bg-white/80 dark:bg-gray-800/80 border border-indigo-100 dark:border-indigo-900">
                              <span className="block text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                {getText('Combined Monthly Total', 'የወንድማማቾች ድምር ክፍያ')}
                              </span>
                              <span className="text-sm font-bold text-gray-900 dark:text-white">
                                {combinedBase.toLocaleString()} ETB <span className="text-[11px] font-normal text-gray-500">({totalSiblingsInFamily} × {baseFee.toLocaleString()})</span>
                              </span>
                            </div>
                            <div className="p-2.5 rounded-lg bg-white/80 dark:bg-gray-800/80 border border-green-200 dark:border-green-800">
                              <span className="block text-[11px] text-green-700 dark:text-green-400 uppercase tracking-wide">
                                {getText(`Family Discount (-${activeSiblingDiscount}%)`, `የቤተሰብ ቅናሽ (-${activeSiblingDiscount}%)`)}
                              </span>
                              <span className="text-sm font-bold text-green-700 dark:text-green-400">
                                -{combinedDiscount.toLocaleString()} ETB {getText('off total', 'ከድምሩ')}
                              </span>
                            </div>
                            <div className="p-2.5 rounded-lg bg-white/80 dark:bg-gray-800/80 border border-indigo-300 dark:border-indigo-700">
                              <span className="block text-[11px] text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">
                                {getText('Net Family Monthly Due', 'የቤተሰብ የተጣራ ወርሃዊ')}
                              </span>
                              <span className="text-sm font-bold text-indigo-900 dark:text-indigo-100">
                                {combinedNet.toLocaleString()} ETB / {getText('month', 'ወር')}
                              </span>
                            </div>
                          </div>
                          <p className="text-[11px] text-indigo-900/80 dark:text-indigo-300/80 italic pt-1">
                            💡 {getText(
                              `The ${activeSiblingDiscount}% sibling discount is subtracted from the siblings total (saving ${combinedDiscount.toLocaleString()} ETB each month). This student's individual share is ${(baseFee - combinedDiscount / totalSiblingsInFamily).toLocaleString()} ETB/month.`,
                              `የ${activeSiblingDiscount}% የወንድም/እህት ቅናሽ ከወንድማማቾች አጠቃላይ ድምር ላይ ተቀንሷል (በወር ${combinedDiscount.toLocaleString()} ብር ቅናሽ)። የዚህ ተማሪ ድርሻ በወር ${(baseFee - combinedDiscount / totalSiblingsInFamily).toLocaleString()} ብር ነው።`
                            )}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Summary of configured fees & accrued penalties for selectedYear */}
                {(() => {
                  const monthlyCalculations = ETHIOPIAN_ACADEMIC_MONTHS.map(m => {
                    const monthPayment = payments.find(p => p.month === m.value && p.year === selectedYear);
                    const isMarkedPaidInPaymentPage = Boolean(monthPayment && (monthPayment.status ? monthPayment.status === 'paid' : true));
                    const paidAmount = monthPayment ? (Number(monthPayment.amount) || 0) : 0;
                    const isBalanceCleared = Boolean(monthPayment?.balanceCleared || (student?.clearedBalanceMonths || []).some(c => c.year === selectedYear && c.month === m.value));
                    const setting = findMatchingFeeSetting(selectedYear, m.value);
                    const baseAmount = setting ? setting.monthlyFee : 0;
                    const targetPenalty = setting ? (setting.penaltyAssignTo || setting.applyFor || 'all') : 'all';
                    const isPenaltyAssigned = targetPenalty === 'all' || targetPenalty === studentCategory;

                    const effectiveDiscount = setting?.siblingDiscount ?? activeSiblingDiscount;
                    const discountPercent = hasSiblings ? Math.max(0, Math.min(100, Number(effectiveDiscount) || 0)) : 0;
                    const discountAmount = (baseAmount * discountPercent) / 100;
                    const expectedFee = Math.max(0, baseAmount - discountAmount);

                    const calc = setting ? calculateMonthlyFeePenalty({
                      monthlyFee: setting.monthlyFee,
                      penaltyFee: setting.penaltyFee,
                      penaltyDay: setting.penaltyDay,
                      penaltyAssignTo: targetPenalty as any,
                      isPenaltyAssigned,
                      feeYear: selectedYear,
                      feeMonth: m.value,
                      isPaid: isMarkedPaidInPaymentPage,
                      hasSiblings,
                      siblingDiscountPercent: effectiveDiscount
                    }) : null;

                    const accruedPenalty = (!isMarkedPaidInPaymentPage && isPenaltyAssigned && calc?.isOverdue) ? (calc.accruedPenalty || 0) : 0;
                    const totalDueForMonth = isMarkedPaidInPaymentPage ? expectedFee : (expectedFee + accruedPenalty);
                    const leftAmount = isBalanceCleared ? 0 : Math.max(0, totalDueForMonth - paidAmount);
                    const isFullyPaid = isMarkedPaidInPaymentPage && (leftAmount === 0 || baseAmount === 0);
                    const isPartiallyPaid = isMarkedPaidInPaymentPage && leftAmount > 0;

                    return {
                      month: m,
                      setting,
                      baseAmount,
                      discountAmount,
                      expectedFee,
                      paidAmount,
                      leftAmount,
                      accruedPenalty,
                      totalDueForMonth,
                      isMarkedPaidInPaymentPage,
                      isFullyPaid,
                      isPartiallyPaid,
                      calc,
                      isPenaltyAssigned,
                      targetPenalty
                    };
                  });

                  const unpaidMonths = monthlyCalculations.filter(d => d.leftAmount > 0 && d.baseAmount > 0);
                  const totalUnpaidNet = unpaidMonths.reduce((sum, d) => sum + Math.max(0, d.expectedFee - d.paidAmount), 0);
                  const totalPenalty = monthlyCalculations.filter(d => d.leftAmount > 0).reduce((sum, d) => sum + d.accruedPenalty, 0);
                  const totalLeftToPay = monthlyCalculations.reduce((sum, d) => sum + d.leftAmount, 0);
                  const totalPaidAmount = monthlyCalculations.reduce((sum, d) => sum + d.paidAmount, 0);

                  const hasAnySettings = feeSettings.length > 0;
                  if (!hasAnySettings) return null;

                  return (
                    <div className={`p-4 sm:p-5 rounded-xl border mb-5 ${
                      unpaidMonths.length > 0
                        ? theme === 'dark'
                          ? 'bg-amber-950/20 border-amber-800/60 text-amber-200'
                          : 'bg-amber-50 border-amber-200 text-amber-900'
                        : theme === 'dark'
                          ? 'bg-emerald-950/20 border-emerald-800/60 text-emerald-200'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    }`}>
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{unpaidMonths.length > 0 ? '⚠️' : '✅'}</span>
                          <h4 className="font-bold text-base">
                            {getText(`Monthly Fee & Balance Summary (${selectedYear} E.C)`, `የወርሃዊ ክፍያ እና የሂሳብ መረጃ (${selectedYear} ዓ.ም)`)}
                          </h4>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                            isRegularStudent
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                          }`}>
                            {isRegularStudent
                              ? getText('Regular Student', 'መደበኛ ተማሪ')
                              : getText('Special Student', 'ልዩ ተማሪ')}
                          </span>
                        </div>
                        <span className="text-xs px-2.5 py-1 rounded-full bg-white/70 dark:bg-black/30 font-medium">
                          {getText('Tracking & Calculation Display', 'መረጃዊ የሂሳብ ስሌት')}
                        </span>
                      </div>

                      {unpaidMonths.length > 0 ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="p-3 rounded-lg bg-white/80 dark:bg-gray-800/80 border border-green-200 dark:border-green-800/40">
                              <span className="block text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-400">
                                {getText('Total Paid So Far', 'እስካሁን የተከፈለ')}
                              </span>
                              <span className="text-lg font-bold text-green-700 dark:text-green-400">
                                {totalPaidAmount.toLocaleString()} ETB
                              </span>
                            </div>
                            <div className="p-3 rounded-lg bg-white/80 dark:bg-gray-800/80 border border-amber-200/60 dark:border-amber-800/40">
                              <span className="block text-xs font-semibold uppercase tracking-wide opacity-75">
                                {getText('Unpaid Fees Due', 'ያልተከፈለ ወርሃዊ')}
                              </span>
                              <span className="text-lg font-bold text-gray-900 dark:text-white">
                                {totalUnpaidNet.toLocaleString()} ETB
                              </span>
                            </div>
                            <div className="p-3 rounded-lg bg-white/80 dark:bg-gray-800/80 border border-rose-200 dark:border-rose-800/40">
                              <span className="block text-xs font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400">
                                {getText('Accrued Penalty', 'የተጠራቀመ ቅጣት')}
                              </span>
                              <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
                                +{totalPenalty.toLocaleString()} ETB
                              </span>
                            </div>
                            <div className="p-3 rounded-lg bg-white/80 dark:bg-gray-800/80 border border-amber-300 dark:border-amber-700">
                              <span className="block text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                                {getText('Total Left to Pay', 'አጠቃላይ የሚቀረው')}
                              </span>
                              <span className="text-xl font-extrabold text-red-600 dark:text-red-400">
                                {totalLeftToPay.toLocaleString()} ETB
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <span>🎉</span>
                          <span>
                            {getText(
                              'All monthly fees for this academic year are fully paid! Total Paid: ' + totalPaidAmount.toLocaleString() + ' ETB | Left: 0 ETB.',
                              'ለዚህ ዓመተ ምህረት ወርሃዊ ክፍያዎች በሙሉ ተከፍለዋል! የተከፈለ፡ ' + totalPaidAmount.toLocaleString() + ' ብር | የሚቀረው፡ 0 ብር።'
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 10 Ethiopian Academic Months Grid — showing Paid & Left for EVERY month */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {ETHIOPIAN_ACADEMIC_MONTHS.map((m) => {
                    const monthPayment = payments.find(p => p.month === m.value && p.year === selectedYear);
                    const isMarkedPaidInPaymentPage = Boolean(monthPayment && (monthPayment.status ? monthPayment.status === 'paid' : true));
                    const paidAmount = monthPayment ? (Number(monthPayment.amount) || 0) : 0;
                    const isBalanceCleared = Boolean(monthPayment?.balanceCleared || (student?.clearedBalanceMonths || []).some(c => c.year === selectedYear && c.month === m.value));
                    const isCurrent = m.value === currentEcMonth && selectedYear === currentEcYear;
                    const setting = findMatchingFeeSetting(selectedYear, m.value);
                    const baseAmount = setting ? setting.monthlyFee : 0;
                    const targetPenalty = setting ? (setting.penaltyAssignTo || setting.applyFor || 'all') : 'all';
                    const isPenaltyAssigned = targetPenalty === 'all' || targetPenalty === studentCategory;

                    const effectiveDiscount = setting?.siblingDiscount ?? activeSiblingDiscount;
                    const discountPercent = hasSiblings ? Math.max(0, Math.min(100, Number(effectiveDiscount) || 0)) : 0;
                    const discountAmount = (baseAmount * discountPercent) / 100;
                    const expectedFee = Math.max(0, baseAmount - discountAmount);

                    const calc = setting ? calculateMonthlyFeePenalty({
                      monthlyFee: setting.monthlyFee,
                      penaltyFee: setting.penaltyFee,
                      penaltyDay: setting.penaltyDay,
                      penaltyAssignTo: targetPenalty as any,
                      isPenaltyAssigned,
                      feeYear: selectedYear,
                      feeMonth: m.value,
                      isPaid: isMarkedPaidInPaymentPage,
                      hasSiblings,
                      siblingDiscountPercent: effectiveDiscount
                    }) : null;

                    const accruedPenalty = (!isMarkedPaidInPaymentPage && isPenaltyAssigned && calc?.isOverdue) ? (calc.accruedPenalty || 0) : 0;
                    const totalDueForMonth = isMarkedPaidInPaymentPage ? expectedFee : (expectedFee + accruedPenalty);
                    const leftAmount = isBalanceCleared ? 0 : Math.max(0, totalDueForMonth - paidAmount);

                    return (
                      <div
                        key={m.value}
                        className={`p-3 rounded-lg border-2 transition-all relative flex flex-col justify-between shadow-xs ${
                          isMarkedPaidInPaymentPage
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : calc?.isOverdue
                            ? 'border-red-400 bg-red-50/50 dark:bg-red-950/30 dark:border-red-800'
                            : theme === 'dark'
                            ? 'border-gray-600 bg-gray-700'
                            : 'border-gray-300 bg-gray-50'
                        }`}
                      >
                        {isCurrent && (
                          <span className="absolute -top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white shadow-sm">
                            {getText('Now', 'አሁን')}
                          </span>
                        )}

                        <div>
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className={`text-sm font-semibold ${
                                isMarkedPaidInPaymentPage
                                  ? 'text-green-700 dark:text-green-400'
                                  : calc?.isOverdue
                                  ? 'text-red-700 dark:text-red-300'
                                  : theme === 'dark'
                                  ? 'text-gray-200'
                                  : 'text-gray-800'
                              }`}>
                                {language === 'am' ? m.am : m.en}
                              </span>
                              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                {language === 'am' ? m.en : m.am}
                              </span>
                            </div>
                            {isMarkedPaidInPaymentPage ? (
                              <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>

                          <p className={`text-xs mt-1.5 font-medium ${
                            isMarkedPaidInPaymentPage
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {isMarkedPaidInPaymentPage ? getText('Paid', 'ተከፍሏል') : getText('Unpaid', 'አልተከፈለም')}
                          </p>
                        </div>

                        {/* Breakdown: Paid & Left */}
                        <div className={`mt-2.5 pt-2 border-t text-xs space-y-1 ${
                          isMarkedPaidInPaymentPage
                            ? 'border-green-200 dark:border-green-800/60'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}>
                          <div className={`flex justify-between items-center font-semibold ${
                            paidAmount > 0
                              ? 'text-green-700 dark:text-green-400'
                              : isMarkedPaidInPaymentPage
                              ? 'text-green-600 dark:text-green-500'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            <span>{getText('Paid', 'የተከፈለ')}:</span>
                            <span>{paidAmount.toLocaleString()} ETB</span>
                          </div>

                          <div
                            className={`flex justify-between items-center font-bold pt-0.5 border-t ${
                              isMarkedPaidInPaymentPage
                                ? 'border-green-200/60 dark:border-green-800/40'
                                : 'border-gray-200/80 dark:border-gray-700'
                            }`}
                            title={getText(
                              `Expected: ${expectedFee.toLocaleString()} ETB | Paid: ${paidAmount.toLocaleString()} ETB`,
                              `የሚጠበቅ፡ ${expectedFee.toLocaleString()} ብር | የተከፈለ፡ ${paidAmount.toLocaleString()} ብር`
                            )}
                          >
                            <span className="text-gray-600 dark:text-gray-300">
                              {getText('Left', 'የሚቀረው')}:
                            </span>
                            <span className={`text-sm ${
                              leftAmount === 0
                                ? 'text-green-700 dark:text-green-400 font-extrabold'
                                : 'text-red-600 dark:text-red-400 font-extrabold'
                            }`}>
                              {leftAmount.toLocaleString()} ETB
                            </span>
                          </div>

                          {/* Only superadmin can make the left to 0, and only when marked as paid with a left balance */}
                          {role === 'superadmin' && isMarkedPaidInPaymentPage && leftAmount > 0 && (
                            <button
                              type="button"
                              onClick={() => handleSetLeftToZero(m.value)}
                              disabled={clearingMonth === m.value}
                              className="mt-1.5 w-full py-1.5 px-2 text-[11px] font-semibold rounded-md bg-green-600 hover:bg-green-700 active:scale-95 text-white transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                              title={getText('Superadmin only: Make left to 0 ETB', 'ሱፐርአድሚን ብቻ፡ ቀሪውን ወደ 0 ብር ቀይር')}
                            >
                              {clearingMonth === m.value ? (
                                <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <>
                                  <span>✓</span>
                                  <span>{getText('Make Left 0', 'ቀሪውን 0 አድርግ')}</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
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