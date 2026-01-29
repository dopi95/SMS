'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/DashboardLayout';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useSettings } from '@/contexts/SettingsContext';

interface Student {
  _id: string;
  studentId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  email?: string;
  gender: string;
  class: string;
  fatherPhone?: string;
  motherPhone?: string;
  fatherName?: string;
  motherName?: string;
  photo?: string;
}

export default function InactiveStudentsPage() {
  const { language, theme, getText } = useSettings();
  const [students, setStudents] = useState<Student[]>([]);
  const [activeStudents, setActiveStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'activate' | 'delete';
    studentId: string;
    studentName: string;
  }>({ isOpen: false, type: 'activate', studentId: '', studentName: '' });
  const router = useRouter();

  useEffect(() => {
    fetchInactiveStudents();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [students, searchTerm]);

  const filterStudents = () => {
    let filtered = students;
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(student => {
        const fullName = `${student.firstName} ${student.middleName} ${student.lastName}`.toLowerCase();
        const parentNames = `${student.fatherName || ''} ${student.motherName || ''}`.toLowerCase();
        const phones = `${student.fatherPhone || ''} ${student.motherPhone || ''}`.toLowerCase();
        
        return (
          fullName.includes(searchLower) ||
          parentNames.includes(searchLower) ||
          phones.includes(searchLower) ||
          student.studentId.toLowerCase().includes(searchLower) ||
          (student.email && student.email.toLowerCase().includes(searchLower))
        );
      });
    }
    setFilteredStudents(filtered);
  };

  const fetchInactiveStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const [inactiveResponse, activeResponse] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/students/inactive`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/students`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] }))
      ]);
      setStudents(inactiveResponse.data);
      setActiveStudents(activeResponse.data);
      setFilteredStudents(inactiveResponse.data);
    } catch (error: any) {
      toast.error(getText('❌ Failed to load inactive students', '❌ የቦዝኖ ተማሪዎችን መጫን አልተሳካም'));
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (id: string) => {
    const student = students.find(s => s._id === id);
    const studentName = student ? `${student.firstName} ${student.lastName}` : 'this student';
    
    setConfirmDialog({
      isOpen: true,
      type: 'activate',
      studentId: id,
      studentName
    });
  };

  const handleDelete = async (id: string) => {
    const student = students.find(s => s._id === id);
    const studentName = student ? `${student.firstName} ${student.lastName}` : 'this student';
    
    setConfirmDialog({
      isOpen: true,
      type: 'delete',
      studentId: id,
      studentName
    });
  };

  const executeActivate = async (id: string) => {
    const loadingToast = toast.loading(getText('🔄 Activating...', '🔄 እየተንቃ ነው...'));
    
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/students/${id}/activate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.dismiss(loadingToast);
      toast.success(getText('✅ Student activated!', '✅ ተማሪ ተንቃ!'));
      setStudents(prev => prev.filter(s => s._id !== id));
      setFilteredStudents(prev => prev.filter(s => s._id !== id));
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(getText('❌ Failed to activate', '❌ ማንቃት አልተሳካም'));
    }
  };

  const executeDelete = async (id: string) => {
    const loadingToast = toast.loading(getText('🗑️ Deleting...', '🗑️ እየተሰረዘ ነው...'));
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/students/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.dismiss(loadingToast);
      toast.success(getText('✅ Student deleted!', '✅ ተማሪ ተሰርዟ!'));
      setStudents(prev => prev.filter(s => s._id !== id));
      setFilteredStudents(prev => prev.filter(s => s._id !== id));
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(getText('❌ Failed to delete', '❌ መሰረዝ አልተሳካም'));
    }
  };

  const handleConfirm = () => {
    if (confirmDialog.type === 'activate') {
      executeActivate(confirmDialog.studentId);
    } else {
      executeDelete(confirmDialog.studentId);
    }
    setConfirmDialog({ isOpen: false, type: 'activate', studentId: '', studentName: '' });
  };

  if (loading) {
    return (
      <DashboardLayout pageTitle="Inactive Students">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle="Inactive Students">
      <div className={`min-h-screen p-4 sm:p-6 lg:p-8 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-6">
            <div className={`rounded-lg shadow-sm border p-6 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('Inactive Students', 'የተከለሉ ተማሪዎች')}</p>
                  <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{students.length}</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{getText('Total inactive students', 'ጠቅላላ የተከለሉ ተማሪዎች')}</p>
                </div>
              </div>
            </div>
          </div>
          <div className={`rounded-xl shadow-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className={`px-6 py-5 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{getText('Inactive Students', 'የተከለሉ ተማሪዎች')}</h1>
                  <p className={`mt-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('Manage inactive student records', 'የተከለሉ ተማሪዎች መዝገብ አስተዳድር')}</p>
                </div>
                <button
                  onClick={() => router.push('/students')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  {getText('Back to Active Students', 'ወደ ንቁ ተማሪዎች ተመለስ')}
                </button>
              </div>
            </div>

            <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
              <div className="relative max-w-md">
                <input
                  type="text"
                  placeholder={getText('Search by name, ID, phone, or email...', 'በስም፣ መለያ፣ ስልክ ወይም ኢሜይል ይፈልጉ...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full px-4 py-3 pl-11 pr-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                {getText('Showing', 'እያሳየ')} <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{filteredStudents.length}</span> {getText('of', 'ከ')} <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{students.length}</span> {getText('inactive students', 'የተከለሉ ተማሪዎች')}
              </p>
            </div>

            {/* Desktop Table - Hidden on mobile */}
            <div className="hidden lg:block overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                    <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('Student', 'ተማሪ')}</th>
                    <th className={`px-3 py-3 text-left text-xs font-medium uppercase ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('ID', 'መለያ')}</th>
                    <th className={`px-3 py-3 text-left text-xs font-medium uppercase ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('Class', 'ክፍል')}</th>
                    <th className={`px-3 py-3 text-left text-xs font-medium uppercase ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('Section', 'ክፍል')}</th>
                    <th className={`px-3 py-3 text-left text-xs font-medium uppercase ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('Gender', 'ጾታ')}</th>
                    <th className={`px-3 py-3 text-left text-xs font-medium uppercase ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('Phone', 'ስልክ')}</th>
                    <th className={`px-3 py-3 text-left text-xs font-medium uppercase ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('Actions', 'ተግባሮች')}</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-600' : 'divide-gray-100'}`}>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                            </svg>
                          </div>
                          <h3 className={`text-lg font-medium mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {searchTerm ? getText('No inactive students found', 'ምንም የተከለሉ ተማሪዎች አልተገኙም') : getText('No inactive students', 'ምንም የተከለሉ ተማሪዎች የሉም')}
                          </h3>
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {searchTerm ? getText('Try adjusting your search', 'ፍለጋዎን ማስተካከል ይሞክሩ') : getText('All students are currently active', 'ሁሉም ተማሪዎች አሁን ንቁ ናቸው')}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => {
                      const getClassDisplay = (classValue: string) => {
                        const classMap: { [key: string]: string } = {
                          'Nursery': language === 'am' ? 'ጀማሪ' : 'Nursery',
                          'LKG': language === 'am' ? 'ደረጃ 1' : 'LKG', 
                          'UKG': language === 'am' ? 'ደረጃ 2' : 'UKG',
                          'Grade 1': language === 'am' ? 'ክፍል 1' : 'Grade 1',
                          'Grade 2': language === 'am' ? 'ክፍል 2' : 'Grade 2',
                          'Grade 3': language === 'am' ? 'ክፍል 3' : 'Grade 3',
                          'Grade 4': language === 'am' ? 'ክፍል 4' : 'Grade 4',
                          'Grade 5': language === 'am' ? 'ክፍል 5' : 'Grade 5',
                          'Grade 6': language === 'am' ? 'ክፍል 6' : 'Grade 6',
                          'Grade 7': language === 'am' ? 'ክፍል 7' : 'Grade 7',
                          'Grade 8': language === 'am' ? 'ክፍል 8' : 'Grade 8'
                        };
                        return classMap[classValue] || classValue;
                      };
                      
                      return (
                      <tr key={student._id} className={`${theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-50'}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-gray-400 flex items-center justify-center flex-shrink-0">
                              {student.photo ? (
                                <img src={student.photo} alt="" className="h-8 w-8 rounded-full object-cover opacity-60" />
                              ) : (
                                <span className="text-xs font-medium text-white">
                                  {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                                </span>
                              )}
                            </div>
                            <div className="ml-3 min-w-0 flex-1">
                              <div className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                                {language === 'am' && student.firstNameAmharic 
                                  ? `${student.firstNameAmharic} ${student.middleNameAmharic || ''} ${student.lastNameAmharic || ''}`.trim()
                                  : `${student.firstName} ${student.middleName} ${student.lastName}`
                                }
                              </div>
                              {student.email && (
                                <div className="text-xs text-gray-400 truncate">{student.email}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {student.studentId}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                            {getClassDisplay(student.class)}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                            {language === 'am' && student.section ? 
                              (student.section === 'A' ? 'ሀ' : student.section === 'B' ? 'ለ' : student.section === 'C' ? 'ሐ' : student.section === 'D' ? 'መ' : student.section) 
                              : (student.section || '-')
                            }
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-2 ${student.gender === 'Male' ? 'bg-blue-500' : 'bg-pink-500'}`}></div>
                            <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                              {getText(student.gender, student.gender === 'Male' ? 'ወንድ' : student.gender === 'Female' ? 'ሴት' : student.gender)}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {student.fatherPhone && (
                              <div>F: {student.fatherPhone}</div>
                            )}
                            {student.motherPhone && (
                              <div>M: {student.motherPhone}</div>
                            )}
                            {!student.fatherPhone && !student.motherPhone && (
                              <span className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>-</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() => router.push(`/students/view/${student._id}`)}
                              className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                            >
                              {getText('View', 'ይመልከቱ')}
                            </button>
                            <button
                              onClick={() => handleActivate(student._id)}
                              className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                            >
                              {getText('Activate', 'አንቃ')}
                            </button>
                            <button
                              onClick={() => handleDelete(student._id)}
                              className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200"
                            >
                              {getText('Delete', 'ሰርዝ')}
                            </button>
                          </div>
                        </td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards - Visible on mobile only */}
            <div className="lg:hidden">
              {filteredStudents.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                      </svg>
                    </div>
                    <h3 className={`text-lg font-medium mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {searchTerm ? getText('No inactive students found', 'ምንም የተከለሉ ተማሪዎች አልተገኙም') : getText('No inactive students', 'ምንም የተከለሉ ተማሪዎች የሉም')}
                    </h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {searchTerm ? getText('Try adjusting your search', 'ፍለጋዎን ማስተካከል ይሞክሩ') : getText('All students are currently active', 'ሁሉም ተማሪዎች አሁን ንቁ ናቸው')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 p-4">
                  {filteredStudents.map((student) => {
                    const getClassDisplay = (classValue: string) => {
                      const classMap: { [key: string]: string } = {
                        'Nursery': language === 'am' ? 'ጀማሪ' : 'Nursery',
                        'LKG': language === 'am' ? 'ደረጃ 1' : 'LKG', 
                        'UKG': language === 'am' ? 'ደረጃ 2' : 'UKG',
                        'Grade 1': language === 'am' ? 'ክፍል 1' : 'Grade 1',
                        'Grade 2': language === 'am' ? 'ክፍል 2' : 'Grade 2',
                        'Grade 3': language === 'am' ? 'ክፍል 3' : 'Grade 3',
                        'Grade 4': language === 'am' ? 'ክፍል 4' : 'Grade 4',
                        'Grade 5': language === 'am' ? 'ክፍል 5' : 'Grade 5',
                        'Grade 6': language === 'am' ? 'ክፍል 6' : 'Grade 6',
                        'Grade 7': language === 'am' ? 'ክፍል 7' : 'Grade 7',
                        'Grade 8': language === 'am' ? 'ክፍል 8' : 'Grade 8'
                      };
                      return classMap[classValue] || classValue;
                    };
                    
                    return (
                    <div key={student._id} className={`rounded-lg border p-4 ${theme === 'dark' ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'} shadow-sm`}>
                      <div className="flex items-start space-x-3">
                        <div className="h-12 w-12 rounded-full bg-gray-400 flex items-center justify-center flex-shrink-0">
                          {student.photo ? (
                            <img src={student.photo} alt="" className="h-12 w-12 rounded-full object-cover opacity-60" />
                          ) : (
                            <span className="text-sm font-medium text-white">
                              {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className={`text-base font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {language === 'am' && student.firstNameAmharic 
                                  ? `${student.firstNameAmharic} ${student.middleNameAmharic || ''} ${student.lastNameAmharic || ''}`.trim()
                                  : `${student.firstName} ${student.middleName} ${student.lastName}`
                                }
                              </h3>
                              <p className="text-sm font-medium text-blue-600 mb-2">{student.studentId}</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wide`}>{getText('Class', 'ክፍል')}</p>
                              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {getClassDisplay(student.class)}
                              </p>
                            </div>
                            <div>
                              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wide`}>{getText('Section', 'ክፍል')}</p>
                              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {language === 'am' && student.section ? 
                                  (student.section === 'A' ? 'ሀ' : student.section === 'B' ? 'ለ' : student.section === 'C' ? 'ሐ' : student.section === 'D' ? 'መ' : student.section) 
                                  : (student.section || '-')
                                }
                              </p>
                            </div>
                            <div>
                              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wide`}>{getText('Gender', 'ጾታ')}</p>
                              <div className="flex items-center">
                                <div className={`w-2 h-2 rounded-full mr-2 ${student.gender === 'Male' ? 'bg-blue-500' : 'bg-pink-500'}`}></div>
                                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                  {getText(student.gender, student.gender === 'Male' ? 'ወንድ' : student.gender === 'Female' ? 'ሴት' : student.gender)}
                                </span>
                              </div>
                            </div>
                            <div>
                              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wide`}>{getText('Phone', 'ስልክ')}</p>
                              <div className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                                {student.fatherPhone && (
                                  <div>F: {student.fatherPhone}</div>
                                )}
                                {student.motherPhone && (
                                  <div>M: {student.motherPhone}</div>
                                )}
                                {!student.fatherPhone && !student.motherPhone && (
                                  <span className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>-</span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {student.email && (
                            <p className={`text-xs mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{student.email}</p>
                          )}
                          
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => router.push(`/students/view/${student._id}`)}
                              className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-md hover:bg-green-200 font-medium"
                            >
                              {getText('View', 'ይመልከቱ')}
                            </button>
                            <button
                              onClick={() => handleActivate(student._id)}
                              className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-md hover:bg-blue-200 font-medium"
                            >
                              {getText('Activate', 'አንቃ')}
                            </button>
                            <button
                              onClick={() => handleDelete(student._id)}
                              className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-md hover:bg-red-200 font-medium"
                            >
                              {getText('Delete', 'ሰርዝ')}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, type: 'activate', studentId: '', studentName: '' })}
        onConfirm={handleConfirm}
        title={confirmDialog.type === 'activate' ? getText('Activate Student', 'ተማሪ አንቃ') : getText('Delete Student', 'ተማሪ ሰርዝ')}
        message={confirmDialog.type === 'activate' 
          ? getText(`Are you sure you want to activate ${confirmDialog.studentName}? They will be moved back to the active students list.`, `${confirmDialog.studentName} ማንቃት እርጋጠኛ ነዎት? ወደ ንቁ ተማሪዎች ዝርዝር ይመለሳሉ።`)
          : getText(`Are you sure you want to permanently delete ${confirmDialog.studentName}? This action cannot be undone.`, `${confirmDialog.studentName} ለመቀን መሰረዝ እርጋጠኛ ነዎት? ይህ እርምጃ ማትረካት አይችልም።`)
        }
        confirmText={confirmDialog.type === 'activate' ? getText('Activate', 'አንቃ') : getText('Delete', 'ሰርዝ')}
        confirmColor={confirmDialog.type === 'activate' ? 'blue' : 'red'}
        icon={
          confirmDialog.type === 'activate' ? (
            <div className="bg-blue-100 rounded-full p-2">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          ) : (
            <div className="bg-red-100 rounded-full p-2">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
          )
        }
      />
    </DashboardLayout>
  );
}