'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/DashboardLayout';
import { useSettings } from '@/contexts/SettingsContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

export default function InactiveEmployeesPage() {
  const { language, theme, getText } = useSettings();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchTeachers();
  }, []);

  useEffect(() => {
    filterTeachers();
  }, [teachers, searchTerm, roleFilter]);

  const filterTeachers = () => {
    let filtered = teachers.filter(t => t.isActive === false);

    if (roleFilter) {
      filtered = filtered.filter(teacher => teacher.role === roleFilter);
    }

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(teacher => {
        return (
          teacher.fullName.toLowerCase().includes(searchLower) ||
          teacher.teacherId.toLowerCase().includes(searchLower) ||
          teacher.role.toLowerCase().includes(searchLower) ||
          (teacher.email && teacher.email.toLowerCase().includes(searchLower)) ||
          (teacher.phone && teacher.phone.toLowerCase().includes(searchLower)) ||
          (teacher.teachingClass && teacher.teachingClass.toLowerCase().includes(searchLower))
        );
      });
    }
    
    setFilteredTeachers(filtered);
  };

  const fetchTeachers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/teachers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeachers(response.data);
    } catch (error: any) {
      toast.error(getText('Failed to load teachers', 'መምህራንን መጫን አልተሳካም'));
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (id: string) => {
    if (!confirm(getText('Are you sure you want to activate this employee?', 'ይህን ሰራተኛ ማንቃት እርግጠኛ ነዎት?'))) {
      return;
    }
    
    const loadingToast = toast.loading(getText('Activating employee...', 'ሰራተኛ እያነቃ ነው...'));
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/teachers/${id}`, 
        { isActive: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.dismiss(loadingToast);
      toast.success(getText('Employee activated successfully!', 'ሰራተኛ በተሳካ ሁኔታ ነቅቷል!'));
      
      setTeachers(prev => prev.map(t => t._id === id ? { ...t, isActive: true } : t));
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(getText('Failed to activate employee', 'ሰራተኛን ማንቃት አልተሳካም'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(getText('Are you sure you want to delete this teacher?', 'ይህን መምህር መሰርዝ እርግጠኛ ነዎት?'))) {
      return;
    }
    
    const loadingToast = toast.loading(getText('Deleting teacher...', 'መምህርን እያሰረዘ ነው...'));
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/teachers/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.dismiss(loadingToast);
      toast.success(getText('Teacher deleted successfully!', 'መምህር በተሳካ ሁኔታ ተሰርዟል!'));
      setTeachers(prev => prev.filter(t => t._id !== id));
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(getText('Failed to delete teacher', 'መምህርን መሰርዝ አልተሳካም'));
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text('Inactive Employees Report', 14, 22);
    
    // Add date
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
    
    // Prepare table data
    const tableData = filteredTeachers.map(teacher => [
      teacher.teacherId,
      teacher.fullName,
      teacher.phone,
      teacher.role,
      teacher.teachingClass || '-',
      teacher.sex,
      new Date(teacher.employmentDate).toLocaleDateString()
    ]);
    
    // Add table
    autoTable(doc, {
      head: [['ID', 'Full Name', 'Phone', 'Role', 'Teaching Class', 'Gender', 'Employment Date']],
      body: tableData,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [220, 38, 38] }
    });
    
    // Save the PDF
    doc.save(`inactive-employees-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success(getText('PDF exported successfully!', 'ፒዲኤፍ በተሳካ ሁኔታ ወጥቷል!'));
  };

  if (loading) {
    return (
      <DashboardLayout pageTitle={getText('Inactive Employees', 'ንቁ ያልሆኑ ሰራተኞች')}>
        <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle={getText('Inactive Employees', 'ንቁ ያልሆኑ ሰራተኞች')}>
      <div className={`min-h-screen p-4 sm:p-6 lg:p-8 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto">
          <div className={`rounded-xl shadow-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            {/* Header */}
            <div className={`px-6 py-5 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => router.push('/employees')}
                      className={`p-2 rounded-lg hover:bg-gray-100 ${theme === 'dark' ? 'hover:bg-gray-700' : ''}`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{getText('Inactive Employees', 'ንቁ ያልሆኑ ሰራተኞች')}</h1>
                  </div>
                  <p className={`mt-1 ml-14 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    {getText('View and manage inactive employees', 'ንቁ ያልሆኑ ሰራተኞችን ይመልከቱ እና ያስተዳድሩ')}
                  </p>
                </div>
                <button
                  onClick={exportToPDF}
                  className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {getText('Export PDF', 'ፒዲኤፍ አውጣ')}
                </button>
              </div>
            </div>

            {/* Search and Filter */}
            <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder={getText('Search by name, ID, role, class, or phone...', 'በስም፣ መለያ፣ ሚና፣ ክፍል ወይም ስልክ ይፈልጉ...')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full px-4 py-3 pl-11 pr-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300'}`}
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div className="w-full sm:w-64">
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  >
                    <option value="">{getText('All Roles', 'ሁሉም ሚናዎች')}</option>
                    <option value="Teacher">{getText('Teacher', 'መምህር')}</option>
                    <option value="Assistant">{getText('Assistant', 'አስተዋዋይ')}</option>
                    <option value="Principal">{getText('Principal', 'ዳይሬክተር')}</option>
                    <option value="Director">{getText('Director', 'ዳይሬክተር')}</option>
                    <option value="Secretary">{getText('Secretary', 'ሰክሬተር')}</option>
                    <option value="ICT Expert">{getText('ICT Expert', 'የአይሲቲ ቀጣይ')}</option>
                    <option value="Admin Staff">{getText('Admin Staff', 'የአስተዳደር ሰራተኛ')}</option>
                    <option value="Janitor">{getText('Janitor', 'ጽዳት ሰራተኛ')}</option>
                    <option value="Security">{getText('Security', 'ጸጥታ')}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                    <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('ID', 'መለያ')}</th>
                    <th className={`px-3 py-3 text-left text-xs font-medium uppercase ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('Full Name', 'ሙሉ ስም')}</th>
                    <th className={`px-3 py-3 text-left text-xs font-medium uppercase ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('Phone', 'ስልክ')}</th>
                    <th className={`px-3 py-3 text-left text-xs font-medium uppercase ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('Role', 'ሚና')}</th>
                    <th className={`px-3 py-3 text-left text-xs font-medium uppercase ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('Teaching Class', 'የማስተማሪያ ክፍል')}</th>
                    <th className={`px-3 py-3 text-left text-xs font-medium uppercase ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('Actions', 'ተግባሮች')}</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-600' : 'divide-gray-100'}`}>
                  {filteredTeachers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </div>
                          <h3 className={`text-lg font-medium mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {getText('No inactive employees found', 'ምንም ንቁ ያልሆኑ ሰራተኞች አልተገኙም')}
                          </h3>
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {searchTerm ? getText('Try adjusting your search', 'ፍለጋዎን ማስተካከል ይሞክሩ') : getText('All employees are active', 'ሁሉም ሰራተኞች ንቁ ናቸው')}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTeachers.map((teacher) => (
                      <tr key={teacher._id} className={`${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-blue-600">{teacher.teacherId}</span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center">
                            {teacher.photo ? (
                              <img 
                                src={teacher.photo} 
                                alt={teacher.fullName}
                                className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-medium text-white">
                                  {teacher.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </span>
                              </div>
                            )}
                            <div className="ml-3">
                              <div className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {teacher.fullName}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{teacher.phone}</span>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{teacher.role}</span>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{teacher.teachingClass || '-'}</span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() => router.push(`/employees/view/${teacher._id}`)}
                              className={`text-xs px-2 py-1 rounded transition-colors ${theme === 'dark' ? 'bg-blue-800 text-blue-200 hover:bg-blue-700' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                              title={getText('View', 'ይመልከቱ')}
                            >
                              {getText('View', 'ይመልከቱ')}
                            </button>
                            <button
                              onClick={() => handleActivate(teacher._id)}
                              className={`text-xs px-2 py-1 rounded transition-colors ${theme === 'dark' ? 'bg-green-800 text-green-200 hover:bg-green-700' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                              title={getText('Activate', 'አንቃ')}
                            >
                              {getText('Activate', 'አንቃ')}
                            </button>
                            <button
                              onClick={() => handleDelete(teacher._id)}
                              className={`text-xs px-2 py-1 rounded transition-colors ${theme === 'dark' ? 'bg-red-800 text-red-200 hover:bg-red-700' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                              title={getText('Delete', 'ሰርዝ')}
                            >
                              {getText('Delete', 'ሰርዝ')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden">
              {filteredTeachers.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 className={`text-lg font-medium mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {getText('No inactive employees found', 'ምንም ንቁ ያልሆኑ ሰራተኞች አልተገኙም')}
                    </h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {searchTerm ? getText('Try adjusting your search', 'ፍለጋዎን ማስተካከል ይሞክሩ') : getText('All employees are active', 'ሁሉም ሰራተኞች ንቁ ናቸው')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 p-4">
                  {filteredTeachers.map((teacher) => (
                    <div key={teacher._id} className={`rounded-lg border p-4 shadow-sm ${theme === 'dark' ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
                      <div className="flex items-start space-x-3">
                        {teacher.photo ? (
                          <img 
                            src={teacher.photo} 
                            alt={teacher.fullName}
                            className="h-12 w-12 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-medium text-white">
                              {teacher.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-base font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {teacher.fullName}
                          </h3>
                          <p className="text-sm font-medium text-blue-600 mb-2">{teacher.teacherId}</p>
                          
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <p className={`text-xs font-medium uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{getText('Role', 'ሚና')}</p>
                              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{teacher.role}</p>
                            </div>
                            <div>
                              <p className={`text-xs font-medium uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{getText('Phone', 'ስልክ')}</p>
                              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{teacher.phone}</p>
                            </div>
                            {teacher.teachingClass && (
                              <div>
                                <p className={`text-xs font-medium uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{getText('Class', 'ክፍል')}</p>
                                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{teacher.teachingClass}</p>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => router.push(`/employees/view/${teacher._id}`)}
                              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${theme === 'dark' ? 'bg-blue-800 text-blue-200 hover:bg-blue-700' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                            >
                              {getText('View', 'ይመልከቱ')}
                            </button>
                            <button
                              onClick={() => handleActivate(teacher._id)}
                              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${theme === 'dark' ? 'bg-green-800 text-green-200 hover:bg-green-700' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                            >
                              {getText('Activate', 'አንቃ')}
                            </button>
                            <button
                              onClick={() => handleDelete(teacher._id)}
                              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${theme === 'dark' ? 'bg-red-800 text-red-200 hover:bg-red-700' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                            >
                              {getText('Delete', 'ሰርዝ')}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
