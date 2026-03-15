'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/DashboardLayout';
import { useSettings } from '@/contexts/SettingsContext';

interface Teacher {
  _id: string;
  teacherId: string;
  fullName: string;
  email?: string;
  phone: string;
  role: string;
  qualification?: string;
  qualificationLevel?: string;
  experienceYears?: string;
  address?: string;
  sex: string;
  employmentDate: string;
  employmentType: string;
  teachingClass?: string;
  teachingSubject?: string;
  photo?: string;
  isActive: boolean;
  salaries?: Array<{ year: string; monthlySalary: number }>;
}

export default function ViewEmployeePage() {
  const { language, theme, getText } = useSettings();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    if (id) {
      fetchTeacher();
    }
  }, [id]);

  const fetchTeacher = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/teachers/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeacher(response.data);
    } catch (error: any) {
      toast.error(getText('Failed to load employee details', 'የሰራተኛ ዝርዝር መጫን አልተሳካም'));
      router.push('/employees');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    router.push(`/employees/edit/${id}`);
  };

  const handleDelete = async () => {
    if (!confirm(getText('Are you sure you want to delete this employee?', 'ይህን ሰራተኛ መሰርዝ እርግጠኛ ነዎት?'))) {
      return;
    }

    const loadingToast = toast.loading(getText('Deleting employee...', 'ሰራተኛን እያሰረዘ ነው...'));

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/teachers/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.dismiss(loadingToast);
      toast.success(getText('Employee deleted successfully!', 'ሰራተኛ በተሳካ ሁኔታ ተሰርዟል!'));
      router.push('/employees');
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(getText('Failed to delete employee', 'ሰራተኛን መሰርዝ አልተሳካም'));
    }
  };

  if (loading) {
    return (
      <DashboardLayout pageTitle={getText('Employee Details', 'የሰራተኛ ዝርዝር')}>
        <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!teacher) {
    return null;
  }

  return (
    <DashboardLayout pageTitle={getText('Employee Details', 'የሰራተኛ ዝርዝር')}>
      <div className={`min-h-screen p-4 sm:p-6 lg:p-8 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => router.push('/employees')}
                className={`p-2 rounded-lg hover:bg-gray-200 ${theme === 'dark' ? 'hover:bg-gray-700' : ''}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {getText('Employee Details', 'የሰራተኛ ዝርዝር')}
              </h1>
            </div>
          </div>

          {/* Profile Card */}
          <div className={`rounded-xl shadow-lg border mb-6 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className={`px-6 py-5 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {teacher.photo ? (
                  <img
                    src={teacher.photo}
                    alt={teacher.fullName}
                    className="w-24 h-24 rounded-full object-cover border-4 border-blue-500"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-blue-500 flex items-center justify-center border-4 border-blue-600">
                    <span className="text-3xl font-bold text-white">
                      {teacher.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {teacher.fullName}
                  </h2>
                  <p className="text-blue-600 font-medium">{teacher.teacherId}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${teacher.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {teacher.isActive !== false ? getText('Active', 'ንቁ') : getText('Inactive', 'ንቁ ያልሆነ')}
                    </span>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      {teacher.role}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleEdit}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${theme === 'dark' ? 'bg-blue-800 text-blue-200 hover:bg-blue-700' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                  >
                    {getText('Edit', 'አርትዕ')}
                  </button>
                  <button
                    onClick={handleDelete}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${theme === 'dark' ? 'bg-red-800 text-red-200 hover:bg-red-700' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                  >
                    {getText('Delete', 'ሰርዝ')}
                  </button>
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div className="p-6">
              <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {getText('Personal Information', 'የግል መረጃ')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {getText('Full Name', 'ሙሉ ስም')}
                  </label>
                  <p className={`mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{teacher.fullName}</p>
                </div>
                <div>
                  <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {getText('Employee ID', 'የሰራተኛ መለያ')}
                  </label>
                  <p className={`mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{teacher.teacherId}</p>
                </div>
                <div>
                  <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {getText('Gender', 'ጾታ')}
                  </label>
                  <p className={`mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{teacher.sex}</p>
                </div>
                <div>
                  <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {getText('Phone', 'ስልክ')}
                  </label>
                  <p className={`mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{teacher.phone}</p>
                </div>
                {teacher.email && (
                  <div>
                    <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {getText('Email', 'ኢሜይል')}
                    </label>
                    <p className={`mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{teacher.email}</p>
                  </div>
                )}
                {teacher.address && (
                  <div>
                    <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {getText('Address', 'አድራሻ')}
                    </label>
                    <p className={`mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{teacher.address}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Employment Information */}
          <div className={`rounded-xl shadow-lg border mb-6 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className="p-6">
              <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {getText('Employment Information', 'የስራ መረጃ')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {getText('Role', 'ሚና')}
                  </label>
                  <p className={`mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{teacher.role}</p>
                </div>
                <div>
                  <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {getText('Employment Type', 'የስራ አይነት')}
                  </label>
                  <p className={`mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{teacher.employmentType}</p>
                </div>
                <div>
                  <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {getText('Employment Date', 'የስራ ቀን')}
                  </label>
                  <p className={`mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {new Date(teacher.employmentDate).toLocaleDateString()}
                  </p>
                </div>
                {teacher.qualification && (
                  <div>
                    <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {getText('Qualification', 'ብቃት')}
                    </label>
                    <p className={`mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{teacher.qualification}</p>
                  </div>
                )}
                {teacher.qualificationLevel && (
                  <div>
                    <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {getText('Qualification Level', 'የብቃት ደረጃ')}
                    </label>
                    <p className={`mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{teacher.qualificationLevel}</p>
                  </div>
                )}
                {teacher.experienceYears && (
                  <div>
                    <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {getText('Experience Years', 'የልምድ ዓመታት')}
                    </label>
                    <p className={`mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{teacher.experienceYears}</p>
                  </div>
                )}
                {teacher.teachingClass && (
                  <div>
                    <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {getText('Teaching Class', 'የማስተማሪያ ክፍል')}
                    </label>
                    <p className={`mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{teacher.teachingClass}</p>
                  </div>
                )}
                {teacher.teachingSubject && (
                  <div>
                    <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {getText('Teaching Subject', 'የማስተማሪያ ትምህርት')}
                    </label>
                    <p className={`mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{teacher.teachingSubject}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Salary Information */}
          {teacher.salaries && teacher.salaries.length > 0 && (
            <div className={`rounded-xl shadow-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
              <div className="p-6">
                <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {getText('Salary History', 'የደመወዝ ታሪክ')}
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                        <th className={`px-4 py-3 text-left text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                          {getText('Year', 'ዓመት')}
                        </th>
                        <th className={`px-4 py-3 text-left text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                          {getText('Monthly Salary', 'ወርሃዊ ደመወዝ')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                      {teacher.salaries.map((salary, index) => (
                        <tr key={index}>
                          <td className={`px-4 py-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {salary.year}
                          </td>
                          <td className={`px-4 py-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {salary.monthlySalary.toLocaleString()} Birr
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
