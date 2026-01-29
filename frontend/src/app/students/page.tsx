'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/DashboardLayout';
import ConfirmDialog from '@/components/ConfirmDialog';
import BulkEditDialog from '@/components/BulkEditDialog';
import { exportToPDF, exportToExcel } from '@/utils/exportUtils';
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

export default function StudentsPage() {
  const { language, theme, getText } = useSettings();
  const [students, setStudents] = useState<Student[]>([]);
  const [inactiveStudents, setInactiveStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [bulkEditDialog, setBulkEditDialog] = useState<{
    isOpen: boolean;
    type: 'inactive' | 'edit';
    bulkClass?: string;
    bulkSection?: string;
  }>({ isOpen: false, type: 'inactive' });
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'inactive' | 'delete';
    studentId: string;
    studentName: string;
  }>({ isOpen: false, type: 'inactive', studentId: '', studentName: '' });
  const router = useRouter();

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [students, searchTerm, classFilter, sectionFilter, batchFilter, typeFilter]);

  const filterStudents = () => {
    let filtered = students;

    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(student => {
        const fullName = `${student.firstName} ${student.middleName} ${student.lastName}`.toLowerCase();
        const amharicName = `${student.firstNameAmharic || ''} ${student.middleNameAmharic || ''} ${student.lastNameAmharic || ''}`.toLowerCase();
        const parentNames = `${student.fatherName || ''} ${student.motherName || ''}`.toLowerCase();
        const phones = `${student.fatherPhone || ''} ${student.motherPhone || ''}`.toLowerCase();
        
        return (
          fullName.includes(searchLower) ||
          amharicName.includes(searchLower) ||
          parentNames.includes(searchLower) ||
          phones.includes(searchLower) ||
          student.studentId.toLowerCase().includes(searchLower) ||
          (student.email && student.email.toLowerCase().includes(searchLower))
        );
      });
    }

    // Filter by class
    if (classFilter) {
      filtered = filtered.filter(student => student.class === classFilter);
    }

    // Filter by section
    if (sectionFilter) {
      filtered = filtered.filter(student => student.section === sectionFilter);
    }

    // Filter by batch (joined year)
    if (batchFilter) {
      filtered = filtered.filter(student => student.joinedYear === batchFilter);
    }

    // Filter by student type
    if (typeFilter) {
      if (typeFilter === 'regular') {
        filtered = filtered.filter(student => student.paymentCode && student.paymentCode.trim() !== '');
      } else if (typeFilter === 'special') {
        filtered = filtered.filter(student => !student.paymentCode || student.paymentCode.trim() === '');
      }
    }
    
    setFilteredStudents(filtered);
  };

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const [activeResponse, inactiveResponse] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/students`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/students/inactive`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] })) // Fallback if endpoint doesn't exist
      ]);
      setStudents(activeResponse.data);
      setInactiveStudents(inactiveResponse.data);
      setFilteredStudents(activeResponse.data);
    } catch (error: any) {
      toast.error(getText('❌ Failed to load students. Please try again.', '❌ ተማሪዎችን መጫን አልተሳካም። እባክዎ እንደገና ይሞክሩ።'));
    } finally {
      setLoading(false);
    }
  };

  const handleInactive = async (id: string) => {
    const student = students.find(s => s._id === id);
    const studentName = student ? `${student.firstName} ${student.lastName}` : 'this student';
    
    setConfirmDialog({
      isOpen: true,
      type: 'inactive',
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

  const executeInactive = async (id: string) => {
    const loadingToast = toast.loading(getText('📝 Marking student as inactive...', '📝 ተማሪ እንደ ቦዝኖ እየተመለከተ ነው...'));
    
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/students/${id}/inactive`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.dismiss(loadingToast);
      toast.success(getText('✅ Student marked as inactive successfully!', '✅ ተማሪ በተሳካ ሁኔታ እንደ ቦዝኖ ተመልክቷል!'));
      // Remove the inactive student from current lists and update inactive count
      setStudents(prev => prev.filter(s => s._id !== id));
      setFilteredStudents(prev => prev.filter(s => s._id !== id));
      // Update inactive students count
      fetchStudents();
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(getText('❌ Failed to mark student as inactive. Please try again.', '❌ ተማሪን እንደ ቦዝኖ ማመልከት አልተሳካም። እባክዎ እንደገና ይሞክሩ።'));
    }
  };

  const executeDelete = async (id: string) => {
    const loadingToast = toast.loading(getText('🗑️ Deleting student...', '🗑️ ተማሪ እየተሰረዘ ነው...'));
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/students/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.dismiss(loadingToast);
      toast.success(getText('✅ Student deleted successfully!', '✅ ተማሪ በተሳካ ሁኔታ ተሰርዟል!'));
      setStudents(prev => prev.filter(s => s._id !== id));
      setFilteredStudents(prev => prev.filter(s => s._id !== id));
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(getText('❌ Failed to delete student. Please try again.', '❌ ተማሪን መሰረዝ አልተሳካም። እባክዎ እንደገና ይሞክሩ።'));
    }
  };

  const handleExportPDF = () => {
    const filters = { searchTerm, classFilter, sectionFilter, batchFilter, typeFilter };
    exportToPDF(filteredStudents, filters);
  };

  const handleExportExcel = () => {
    const filters = { searchTerm, classFilter, sectionFilter, batchFilter, typeFilter };
    exportToExcel(filteredStudents, filters);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(filteredStudents.map(s => s._id));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleConfirm = () => {
    if (confirmDialog.type === 'inactive') {
      executeInactive(confirmDialog.studentId);
    } else {
      executeDelete(confirmDialog.studentId);
    }
    setConfirmDialog({ isOpen: false, type: 'inactive', studentId: '', studentName: '' });
  };

  const handleSelectStudent = (studentId: string, checked: boolean) => {
    if (checked) {
      setSelectedStudents(prev => [...prev, studentId]);
    } else {
      setSelectedStudents(prev => prev.filter(id => id !== studentId));
    }
  };

  const handleBulkInactive = () => {
    setBulkEditDialog({ isOpen: true, type: 'inactive' });
  };

  const handleBulkEdit = () => {
    setBulkEditDialog({ isOpen: true, type: 'edit', bulkClass: '', bulkSection: '' });
  };

  const executeBulkInactive = async () => {
    const loadingToast = toast.loading(getText(`📝 Marking ${selectedStudents.length} students as inactive...`, `📝 ${selectedStudents.length} ተማሪዎች እንደ ቦዝኖ እየተመለከቱ ነው...`));
    
    try {
      const token = localStorage.getItem('token');
      await Promise.all(
        selectedStudents.map(id => 
          axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/students/${id}/inactive`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          })
        )
      );
      toast.dismiss(loadingToast);
      toast.success(getText(`✅ ${selectedStudents.length} students marked as inactive!`, `✅ ${selectedStudents.length} ተማሪዎች እንደ ቦዝኖ ተመልክተዋል!`));
      setStudents(prev => prev.filter(s => !selectedStudents.includes(s._id)));
      setFilteredStudents(prev => prev.filter(s => !selectedStudents.includes(s._id)));
      setSelectedStudents([]);
      // Update inactive students count
      fetchStudents();
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(getText('❌ Failed to mark students as inactive', '❌ ተማሪዎችን እንደ ቦዝኖ ማመልከት አልተሳካም'));
    }
  };

  const executeBulkEdit = async (bulkClass: string, bulkSection: string) => {
    const loadingToast = toast.loading(getText(`📝 Updating ${selectedStudents.length} students...`, `📝 ${selectedStudents.length} ተማሪዎች እየተዘመኑ ነው...`));
    
    try {
      const token = localStorage.getItem('token');
      const updateData: any = {};
      if (bulkClass) updateData.class = bulkClass;
      if (bulkSection) {
        if (bulkSection === 'REMOVE') {
          updateData.section = null;
        } else {
          updateData.section = bulkSection;
        }
      }
      
      await Promise.all(
        selectedStudents.map(id => 
          axios.put(`${process.env.NEXT_PUBLIC_API_URL}/students/${id}`, updateData, {
            headers: { Authorization: `Bearer ${token}` }
          })
        )
      );
      toast.dismiss(loadingToast);
      toast.success(getText(`✅ ${selectedStudents.length} students updated!`, `✅ ${selectedStudents.length} ተማሪዎች ተዘምነዋል!`));
      fetchStudents();
      setSelectedStudents([]);
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(getText('❌ Failed to update students', '❌ ተማሪዎችን ማዘመን አልተሳካም'));
    }
  };

  if (loading) {
    return (
      <DashboardLayout pageTitle="Students">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle="Students">
      <div className={`min-h-screen p-4 sm:p-6 lg:p-8 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className={`rounded-lg shadow-sm border p-6 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    {getText('Filtered Students', 'የተመረጡ ተማሪዎች')}
                  </p>
                  <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{filteredStudents.length}</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {getText(`of ${students.length} total active`, `ከ ${students.length} ንቁ ተማሪዎች`)}
                  </p>
                </div>
              </div>
            </div>
            
            <div 
              className={`rounded-lg shadow-sm border p-6 cursor-pointer hover:shadow-md transition-shadow ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
              onClick={() => router.push('/inactive-students')}
            >
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    {getText('Inactive Students', 'የተከለሉ ተማሪዎች')}
                  </p>
                  <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{inactiveStudents.length}</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {getText('Click to view', 'ለማየት ይጥቅጡ')}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className={`rounded-xl shadow-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            {/* Header */}
            <div className={`px-6 py-5 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {getText('Students', 'ተማሪዎች')}
                  </h1>
                  <p className={`mt-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    {getText('Manage and view all student information', 'የተማሪዎች መረጃ አስተዳድር እና ማየት')}
                  </p>
                </div>
                <button
                  onClick={() => router.push('/students/add')}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {getText('Add New Student', 'አዲስ ተማሪ ከምር')}
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {getText('Export', 'አውጣ')}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showExportMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                      <button
                        onClick={() => {
                          handleExportPDF();
                          setShowExportMenu(false);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700"
                      >
                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {getText('Export as PDF', 'PDF አውጣ')}
                      </button>
                      <button
                        onClick={() => {
                          handleExportExcel();
                          setShowExportMenu(false);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700 border-t border-gray-100"
                      >
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {getText('Export as Excel', 'Excel አውጣ')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
              <div className="flex flex-col gap-4">
                {/* Search Bar */}
                <div className="relative max-w-md">
                  <input
                    type="text"
                    placeholder={getText('Search by name, ID, phone, or email...', 'በስም፣ መለያ፣ ስልክ ወይም ኢሜይል ይፈልጉ...')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full px-4 py-3 pl-11 pr-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-4 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="relative">
                    <select
                      value={classFilter}
                      onChange={(e) => setClassFilter(e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm appearance-none cursor-pointer ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                    >
                      <option value="">{getText('All Classes', 'ሁሉም ክፍሎች')}</option>
                      <option value="Nursery">{getText('Nursery', 'ጀማሪ')}</option>
                      <option value="LKG">{getText('LKG', 'ደረጃ 1')}</option>
                      <option value="UKG">{getText('UKG', 'ደረጃ 2')}</option>
                    </select>
                    <svg className="w-4 h-4 text-gray-400 absolute right-3 top-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  <div className="relative">
                    <select
                      value={sectionFilter}
                      onChange={(e) => setSectionFilter(e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm appearance-none cursor-pointer ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                    >
                      <option value="">{getText('All Sections', 'ሁሉም ክፍሎች')}</option>
                      <option value="A">{getText('Section A', 'ክፍል ሀ')}</option>
                      <option value="B">{getText('Section B', 'ክፍል ለ')}</option>
                      <option value="C">{getText('Section C', 'ክፍል ሐ')}</option>
                      <option value="D">{getText('Section D', 'ክፍል መ')}</option>
                    </select>
                    <svg className="w-4 h-4 text-gray-400 absolute right-3 top-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  <div className="relative">
                    <select
                      value={batchFilter}
                      onChange={(e) => setBatchFilter(e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm appearance-none cursor-pointer ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                    >
                      <option value="">{getText('All Batches', 'ሁሉም ቡድኖች')}</option>
                      <option value="2017">2017 E.C</option>
                      <option value="2018">2018 E.C</option>
                      <option value="2019">2019 E.C</option>
                      <option value="2020">2020 E.C</option>
                      <option value="2021">2021 E.C</option>
                      <option value="2022">2022 E.C</option>
                      <option value="2023">2023 E.C</option>
                      <option value="2024">2024 E.C</option>
                      <option value="2025">2025 E.C</option>
                      <option value="2026">2026 E.C</option>
                    </select>
                    <svg className="w-4 h-4 text-gray-400 absolute right-3 top-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  <div className="relative">
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm appearance-none cursor-pointer ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                    >
                      <option value="">{getText('All Types', 'ሁሉም ዓይነቶች')}</option>
                      <option value="regular">{getText('Regular', 'መደበኛ')}</option>
                      <option value="special">{getText('Special', 'ልዩ')}</option>
                    </select>
                    <svg className="w-4 h-4 text-gray-400 absolute right-3 top-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Active Filters Display */}
                {(searchTerm || classFilter || sectionFilter || batchFilter || typeFilter) && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('Active filters:', 'ንቁ ፍልተሮች:')}</span>
                    {searchTerm && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                        Search: "{searchTerm}"
                        <button onClick={() => setSearchTerm('')} className="ml-1 hover:text-blue-900">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    )}
                    {classFilter && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                        Class: {classFilter}
                        <button onClick={() => setClassFilter('')} className="ml-1 hover:text-green-900">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    )}
                    {sectionFilter && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
                        Section: {sectionFilter}
                        <button onClick={() => setSectionFilter('')} className="ml-1 hover:text-purple-900">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    )}
                    {batchFilter && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 text-sm rounded-full">
                        Batch: {batchFilter} E.C
                        <button onClick={() => setBatchFilter('')} className="ml-1 hover:text-orange-900">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    )}
                    {typeFilter && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-800 text-sm rounded-full">
                        Type: {typeFilter}
                        <button onClick={() => setTypeFilter('')} className="ml-1 hover:text-indigo-900">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    )}
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setClassFilter('');
                        setSectionFilter('');
                        setBatchFilter('');
                        setTypeFilter('');
                      }}
                      className="text-sm text-gray-500 hover:text-gray-700 underline"
                    >
                      {getText('Clear all', 'ሁሉንም አጽዳ')}
                    </button>
                  </div>
                )}

                {/* Bulk Actions */}
                {selectedStudents.length > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <span className="text-sm font-medium text-blue-900">
                      {selectedStudents.length} {getText('student', 'ተማሪ')}{selectedStudents.length > 1 ? getText('s', 'ዎች') : ''} {getText('selected', 'ተመርጠዋል')}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={handleBulkInactive}
                        className="text-xs bg-orange-100 text-orange-700 px-3 py-1.5 rounded hover:bg-orange-200 font-medium"
                      >
                        {getText('Mark Inactive', 'ቦዝኖ አድርግ')}
                      </button>
                      <button
                        onClick={handleBulkEdit}
                        className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded hover:bg-blue-200 font-medium"
                      >
                        {getText('Edit Class/Section', 'ክፍል/ክፍል ያርትዑ')}
                      </button>
                      <button
                        onClick={() => setSelectedStudents([])}
                        className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-200 font-medium"
                      >
                        {getText('Clear Selection', 'ምርጫ አጽዳ')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Results Count */}
                <div className="flex items-center justify-between">
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    {getText('Showing', 'እያሳየ')} <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{filteredStudents.length}</span> {getText('of', 'ከ')} <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{students.length}</span> {getText('students', 'ተማሪዎች')}
                  </p>
                </div>
              </div>
            </div>

            {/* Desktop Table - Hidden on mobile */}
            <div className="hidden lg:block overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
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
                      <td colSpan={8} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                            </svg>
                          </div>
                          <h3 className={`text-lg font-medium mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {searchTerm || classFilter || sectionFilter || batchFilter || typeFilter ? getText('No students found', 'ምንም ተማሪዎች አልተገኙም') : getText('No students yet', 'ገና ተማሪዎች የሉም')}
                          </h3>
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {searchTerm || classFilter || sectionFilter || batchFilter || typeFilter 
                              ? getText('Try adjusting your filters', 'ፍልተሮችዎን ማስተካከል ይሞክሩ') 
                              : getText('Add your first student', 'የመጀመሪያ ተማሪዎን ይጨምሩ')}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => (
                      <tr key={student._id} className={`${theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-50'}`}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(student._id)}
                            onChange={(e) => handleSelectStudent(student._id, e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                              {student.photo ? (
                                <img src={student.photo} alt="" className="h-8 w-8 rounded-full object-cover" />
                              ) : (
                                <span className="text-xs font-medium text-white">
                                  {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                                </span>
                              )}
                            </div>
                            <div className="ml-3 min-w-0 flex-1">
                              <div className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {language === 'am' && student.firstNameAmharic 
                                  ? `${student.firstNameAmharic} ${student.middleNameAmharic || ''} ${student.lastNameAmharic || ''}`.trim()
                                  : `${student.firstName} ${student.middleName} ${student.lastName}`
                                }
                              </div>
                              {student.email && (
                                <div className={`text-xs truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{student.email}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-sm font-medium text-blue-600">
                            {student.studentId}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {getText(student.class, student.class === 'Nursery' ? 'ጀማሪ' : student.class === 'LKG' ? 'ደረጃ 1' : student.class === 'UKG' ? 'ደረጃ 2' : student.class)}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {language === 'am' && student.section ? 
                              (student.section === 'A' ? 'ሀ' : student.section === 'B' ? 'ለ' : student.section === 'C' ? 'ሐ' : student.section === 'D' ? 'መ' : student.section) 
                              : (student.section || '-')
                            }
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-2 ${student.gender === 'Male' ? 'bg-blue-500' : 'bg-pink-500'}`}></div>
                            <span className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {getText(student.gender, student.gender === 'Male' ? 'ወንድ' : student.gender === 'Female' ? 'ሴት' : student.gender)}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
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
                              onClick={() => router.push(`/students/edit/${student._id}`)}
                              className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                            >
                              {getText('Edit', 'ያርትዑ')}
                            </button>
                            <button
                              onClick={() => handleInactive(student._id)}
                              className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded hover:bg-orange-200"
                              title="Mark as Inactive"
                            >
                              {getText('Inactive', 'ቦዝኖ')}
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
                    ))
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                    <h3 className={`text-lg font-medium mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {searchTerm || classFilter || sectionFilter || batchFilter || typeFilter ? getText('No students found', 'ምንም ተማሪዎች አልተገኙም') : getText('No students yet', 'ገና ተማሪዎች የሉም')}
                    </h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {searchTerm || classFilter || sectionFilter || batchFilter || typeFilter 
                        ? getText('Try adjusting your filters', 'ፍልተሮችዎን ማስተካከል ይሞክሩ') 
                        : getText('Add your first student', 'የመጀመሪያ ተማሪዎን ይጨምሩ')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 p-4">
                  {/* Select All for Mobile */}
                  <div className="flex items-center justify-between mb-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        {getText('Select All', 'ሁሉንም ምረጥ')}
                      </span>
                    </label>
                  </div>
                  
                  {filteredStudents.map((student) => (
                    <div key={student._id} className={`rounded-lg border p-4 ${theme === 'dark' ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'} shadow-sm`}>
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student._id)}
                          onChange={(e) => handleSelectStudent(student._id, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1"
                        />
                        <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                          {student.photo ? (
                            <img src={student.photo} alt="" className="h-12 w-12 rounded-full object-cover" />
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
                                {getText(student.class, student.class === 'Nursery' ? 'ጀማሪ' : student.class === 'LKG' ? 'ደረጃ 1' : student.class === 'UKG' ? 'ደረጃ 2' : student.class)}
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
                              onClick={() => router.push(`/students/edit/${student._id}`)}
                              className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-md hover:bg-blue-200 font-medium"
                            >
                              {getText('Edit', 'ያርትዑ')}
                            </button>
                            <button
                              onClick={() => handleInactive(student._id)}
                              className="text-xs bg-orange-100 text-orange-700 px-3 py-1.5 rounded-md hover:bg-orange-200 font-medium"
                            >
                              {getText('Inactive', 'ቦዝኖ')}
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
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, type: 'inactive', studentId: '', studentName: '' })}
        onConfirm={handleConfirm}
        title={confirmDialog.type === 'inactive' ? getText('Mark Student as Inactive', 'ተማሪ እንደ ቦዝኖ አድርግ') : getText('Delete Student', 'ተማሪ ሰርዝ')}
        message={confirmDialog.type === 'inactive' 
          ? getText(`Are you sure you want to mark ${confirmDialog.studentName} as inactive? They will be moved to the inactive students list.`, `${confirmDialog.studentName} እንደ ቦዝኖ ማመልከት እርጋጠኛ ነዎት? ወደ የቦዝኖ ተማሪዎች ዝርዝር ይዛወራሉ።`)
          : getText(`Are you sure you want to permanently delete ${confirmDialog.studentName}? This action cannot be undone.`, `${confirmDialog.studentName} ለመቀን መሰረዝ እርጋጠኛ ነዎት? ይህ እርምጃ ማትረካት አይችልም።`)
        }
        confirmText={confirmDialog.type === 'inactive' ? getText('Mark Inactive', 'ቦዝኖ አድርግ') : getText('Delete', 'ሰርዝ')}
        confirmColor={confirmDialog.type === 'inactive' ? 'orange' : 'red'}
        icon={
          confirmDialog.type === 'inactive' ? (
            <div className="bg-orange-100 rounded-full p-2">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
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
      
      <BulkEditDialog
        isOpen={bulkEditDialog.isOpen}
        onClose={() => setBulkEditDialog({ isOpen: false, type: 'inactive' })}
        onConfirm={(bulkClass, bulkSection) => {
          if (bulkEditDialog.type === 'inactive') {
            executeBulkInactive();
          } else {
            executeBulkEdit(bulkClass, bulkSection);
          }
          setBulkEditDialog({ isOpen: false, type: 'inactive' });
        }}
        type={bulkEditDialog.type}
        selectedCount={selectedStudents.length}
      />
    </DashboardLayout>
  );
}