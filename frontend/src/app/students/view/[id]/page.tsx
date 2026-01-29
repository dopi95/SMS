'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/DashboardLayout';

import { useSettings } from '@/contexts/SettingsContext';

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
  motherName?: string;
  motherPhone?: string;
}

export default function ViewStudentPage() {
  const { language, theme, getText } = useSettings();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    fetchStudent();
  }, []);

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
                    <h4 className={`font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{getText('Father', 'አባት')}</h4>
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
                  <div>
                    <h4 className={`font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{getText('Mother', 'እናት')}</h4>
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

              {/* Address */}
              {student.address && (
                <div>
                  <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{getText('Address', 'አድራሻ')}</h3>
                  <p className={`p-3 rounded-lg ${theme === 'dark' ? 'text-gray-200 bg-gray-700' : 'text-gray-900 bg-gray-50'}`}>{student.address}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className={`flex justify-end gap-4 pt-6 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <button
                  onClick={() => router.push(`/students/edit/${student._id}`)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {getText('Edit Student', 'ተማሪ ያርትዑ')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}