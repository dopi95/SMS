'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/DashboardLayout';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useSettings } from '@/contexts/SettingsContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

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
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'inactive' | 'delete';
    studentId: string;
    studentName: string;
  }>({ isOpen: false, type: 'inactive', studentId: '', studentName: '' });
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [fileName, setFileName] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [students, searchTerm, classFilter, sectionFilter, batchFilter, typeFilter]);

  useEffect(() => {
    generateFileName();
  }, [filteredStudents, classFilter, sectionFilter, batchFilter, typeFilter, language]);

  const generateFileName = () => {
    const parts = [];
    if (classFilter) parts.push(getText(classFilter, classFilter === 'Nursery' ? 'ጀማሪ' : classFilter === 'LKG' ? 'ደረጃ1' : classFilter === 'UKG' ? 'ደረጃ2' : classFilter));
    if (sectionFilter) parts.push(`${getText('Section', 'ክፍል')}${language === 'am' ? (sectionFilter === 'A' ? 'አ' : sectionFilter === 'B' ? 'ለ' : sectionFilter === 'C' ? 'ሐ' : sectionFilter === 'D' ? 'መ' : sectionFilter) : sectionFilter}`);
    if (batchFilter) parts.push(`${batchFilter}EC`);
    
    const baseName = parts.length > 0 ? parts.join('_') : getText('All_Students', 'ሁሉም_ተማሪዎች');
    setFileName(`${baseName}_${new Date().toISOString().split('T')[0]}`);
  };

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

    if (classFilter) {
      filtered = filtered.filter(student => student.class === classFilter);
    }

    if (sectionFilter) {
      filtered = filtered.filter(student => student.section === sectionFilter);
    }

    if (batchFilter) {
      filtered = filtered.filter(student => student.joinedYear === batchFilter);
    }

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
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(response.data);
      setFilteredStudents(response.data);
    } catch (error: any) {
      toast.error(getText('Failed to load students', 'ተማሪዎችን መጫን አልተሳካም'));
    } finally {
      setLoading(false);
    }
  };

  const handleInactive = async (id: string) => {
    const student = students.find(s => s._id === id);
    const studentName = student ? 
      (language === 'am' && student.firstNameAmharic 
        ? `${student.firstNameAmharic} ${student.middleNameAmharic || ''} ${student.lastNameAmharic || ''}`.trim()
        : `${student.firstName} ${student.middleName} ${student.lastName}`
      ) : 'this student';
    
    setConfirmDialog({
      isOpen: true,
      type: 'inactive',
      studentId: id,
      studentName
    });
  };

  const handleDelete = async (id: string) => {
    const student = students.find(s => s._id === id);
    const studentName = student ? 
      (language === 'am' && student.firstNameAmharic 
        ? `${student.firstNameAmharic} ${student.middleNameAmharic || ''} ${student.lastNameAmharic || ''}`.trim()
        : `${student.firstName} ${student.middleName} ${student.lastName}`
      ) : 'this student';
    
    setConfirmDialog({
      isOpen: true,
      type: 'delete',
      studentId: id,
      studentName
    });
  };

  const executeInactive = async (id: string) => {
    const loadingToast = toast.loading(getText('Marking student as inactive...', 'ተማሪን እንደ አይሰራ እያደርግ ነው...'));
    
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/students/${id}/inactive`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.dismiss(loadingToast);
      toast.success(getText('Student marked as inactive successfully!', 'ተማሪ በተሳካ ሁኔታ እንደ አይሰራ ተድርጋል!'));
      setStudents(prev => prev.filter(s => s._id !== id));
      setFilteredStudents(prev => prev.filter(s => s._id !== id));
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(getText('Failed to mark student as inactive', 'ተማሪን እንደ አይሰራ ማድርግ አልተሳካም'));
    }
  };

  const executeDelete = async (id: string) => {
    const loadingToast = toast.loading(getText('Deleting student...', 'ተማሪን እያሰርዘ ነው...'));
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/students/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.dismiss(loadingToast);
      toast.success(getText('Student deleted successfully!', 'ተማሪ በተሳካ ሁኔታ ተሰርዟል!'));
      setStudents(prev => prev.filter(s => s._id !== id));
      setFilteredStudents(prev => prev.filter(s => s._id !== id));
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(getText('Failed to delete student', 'ተማሪን መሰርዝ አልተሳካም'));
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

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    // Title
    doc.setFontSize(18);
    doc.text(getText('Students Report', 'የተማሪዎች ሪፖርት'), 14, 20);
    
    // Subtitle with filters
    doc.setFontSize(12);
    let subtitle = '';
    if (classFilter) subtitle += `${getText('Class', 'ክፍል')}: ${getText(classFilter, classFilter === 'Nursery' ? 'ጀማሪ' : classFilter === 'LKG' ? 'ደረጃ 1' : classFilter === 'UKG' ? 'ደረጃ 2' : classFilter)} `;
    if (sectionFilter) subtitle += `${getText('Section', 'ክፍል')}: ${language === 'am' ? (sectionFilter === 'A' ? 'አ' : sectionFilter === 'B' ? 'ለ' : sectionFilter === 'C' ? 'ሐ' : sectionFilter === 'D' ? 'መ' : sectionFilter) : sectionFilter} `;
    if (batchFilter) subtitle += `${getText('Batch', 'ቡድን')}: ${batchFilter} E.C `;
    if (typeFilter) subtitle += `${getText('Type', 'አይነት')}: ${getText(typeFilter, typeFilter === 'regular' ? 'መደበኛ' : 'ልዩ')} `;
    
    if (subtitle) {
      doc.text(subtitle.trim(), 14, 28);
    }
    
    doc.text(`${getText('Generated on', 'የተፈጠረበት ቀን')}: ${new Date().toLocaleDateString()}`, 14, subtitle ? 36 : 28);
    doc.text(`${getText('Total Students', 'ጠቅላላ ተማሪዎች')}: ${filteredStudents.length}`, 14, subtitle ? 44 : 36);
    
    // Table data
    const tableData = filteredStudents.map((student, index) => [
      index + 1,
      language === 'am' ? student.studentId.replace('BLUE', 'ብሉ') : student.studentId,
      language === 'am' && student.firstNameAmharic 
        ? `${student.firstNameAmharic} ${student.middleNameAmharic || ''} ${student.lastNameAmharic || ''}`.trim()
        : `${student.firstName} ${student.middleName} ${student.lastName}`,
      getText(student.class, student.class === 'Nursery' ? 'ጀማሪ' : student.class === 'LKG' ? 'ደረጃ 1' : student.class === 'UKG' ? 'ደረጃ 2' : student.class),
      language === 'am' && student.section ? 
        (student.section === 'A' ? 'አ' : student.section === 'B' ? 'ለ' : student.section === 'C' ? 'ሐ' : student.section === 'D' ? 'መ' : student.section) 
        : (student.section || '-'),
      getText(student.gender, student.gender === 'Male' ? 'ወንድ' : student.gender === 'Female' ? 'ሴት' : student.gender),
      student.joinedYear,
      student.fatherName || '-',
      student.fatherPhone || '-',
      student.motherName || '-',
      student.motherPhone || '-',
      student.email || '-'
    ]);
    
    autoTable(doc, {
      head: [[
        '#',
        getText('Student ID', 'የተማሪ መለያ'),
        getText('Full Name', 'ሙሉ ስም'),
        getText('Class', 'ክፍል'),
        getText('Section', 'ክፍል'),
        getText('Gender', 'ጾታ'),
        getText('Batch', 'ቡድን'),
        getText('Father Name', 'የአባት ስም'),
        getText('Father Phone', 'የአባት ስልክ'),
        getText('Mother Name', 'የእናት ስም'),
        getText('Mother Phone', 'የእናት ስልክ'),
        getText('Email', 'ኢሜይል')
      ]],
      body: tableData,
      startY: subtitle ? 52 : 44,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 }
    });
    
    doc.save(`${fileName}.pdf`);
    setShowExportMenu(false);
    toast.success(getText('PDF exported successfully!', 'PDF በተሳካ ሁኔታ ወጣ!'));
  };
  
  const exportToExcel = () => {
    const worksheetData = [
      // Header row
      [
        '#',
        getText('Student ID', 'የተማሪ መለያ'),
        getText('Full Name', 'ሙሉ ስም'),
        getText('Class', 'ክፍል'),
        getText('Section', 'ክፍል'),
        getText('Gender', 'ጾታ'),
        getText('Batch', 'ቡድን'),
        getText('Date of Birth', 'የትውልድ ቀን'),
        getText('Father Name', 'የአባት ስም'),
        getText('Father Phone', 'የአባት ስልክ'),
        getText('Mother Name', 'የእናት ስም'),
        getText('Mother Phone', 'የእናት ስልክ'),
        getText('Email', 'ኢሜይል'),
        getText('Address', 'አድራሻ'),
        getText('Payment Code', 'የክፍያ ኮድ')
      ],
      // Data rows
      ...filteredStudents.map((student, index) => [
        index + 1,
        language === 'am' ? student.studentId.replace('BLUE', 'ብሉ') : student.studentId,
        language === 'am' && student.firstNameAmharic 
          ? `${student.firstNameAmharic} ${student.middleNameAmharic || ''} ${student.lastNameAmharic || ''}`.trim()
          : `${student.firstName} ${student.middleName} ${student.lastName}`,
        getText(student.class, student.class === 'Nursery' ? 'ጀማሪ' : student.class === 'LKG' ? 'ደረጃ 1' : student.class === 'UKG' ? 'ደረጃ 2' : student.class),
        language === 'am' && student.section ? 
          (student.section === 'A' ? 'አ' : student.section === 'B' ? 'ለ' : student.section === 'C' ? 'ሐ' : student.section === 'D' ? 'መ' : student.section) 
          : (student.section || ''),
        getText(student.gender, student.gender === 'Male' ? 'ወንድ' : student.gender === 'Female' ? 'ሴት' : student.gender),
        student.joinedYear,
        student.dateOfBirth || '',
        student.fatherName || '',
        student.fatherPhone || '',
        student.motherName || '',
        student.motherPhone || '',
        student.email || '',
        student.address || '',
        student.paymentCode || ''
      ])
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Set column widths
    const colWidths = [
      { wch: 5 },   // #
      { wch: 15 },  // Student ID
      { wch: 25 },  // Full Name
      { wch: 10 },  // Class
      { wch: 10 },  // Section
      { wch: 10 },  // Gender
      { wch: 10 },  // Batch
      { wch: 15 },  // DOB
      { wch: 20 },  // Father Name
      { wch: 15 },  // Father Phone
      { wch: 20 },  // Mother Name
      { wch: 15 },  // Mother Phone
      { wch: 25 },  // Email
      { wch: 30 },  // Address
      { wch: 15 }   // Payment Code
    ];
    worksheet['!cols'] = colWidths;
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, getText('Students', 'ተማሪዎች'));
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    saveAs(data, `${fileName}.xlsx`);
    setShowExportMenu(false);
    toast.success(getText('Excel exported successfully!', 'Excel በተሳካ ሁኔታ ወጣ!'));
  };

  if (loading) {
    return (
      <DashboardLayout pageTitle={getText('Students', 'ተማሪዎች')}>
        <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle={getText('Students', 'ተማሪዎች')}>
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
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('Filtered Students', 'የተፈጡ ተማሪዎች')}</p>
                  <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{filteredStudents.length}</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{getText('of', 'ከ')} {students.length} {getText('total active', 'ጠቅላላ ንቁ')}</p>
                </div>
              </div>
            </div>
            
            <div 
              className={`rounded-lg shadow-sm border p-6 cursor-pointer hover:shadow-md transition-shadow ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
              onClick={() => router.push('/students/inactive')}
            >
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('Inactive Students', 'የተከለሉ ተማሪዎች')}</p>
                  <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{inactiveStudents.length}</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{getText('Click to view', 'ለመመልከት ይጫኑ')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className={`rounded-xl shadow-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            {/* Header */}
            <div className={`px-6 py-5 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{getText('Students', 'ተማሪዎች')}</h1>
                  <p className={`mt-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('Manage and view all student information', 'የተማሪዎች ማለባ መረጃ አስተዳድር እና መመልከት')}</p>
                </div>
                <div className="flex gap-3">
                  {/* Export Button */}
                  <div className="relative">
                    <button
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {getText('Export', 'ወደ ውጭ አውጣ')}
                    </button>
                    
                    {showExportMenu && (
                      <div className={`absolute right-0 mt-2 w-80 rounded-lg shadow-lg border z-50 ${theme === 'dark' ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
                        <div className="p-4">
                          <h3 className={`text-sm font-medium mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{getText('Export Students', 'ተማሪዎችን ወደ ውጭ አውጣ')}</h3>
                          
                          {/* File Name Input */}
                          <div className="mb-4">
                            <label className={`block text-xs font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                              {getText('File Name', 'የፋይል ስም')}
                            </label>
                            <input
                              type="text"
                              value={fileName}
                              onChange={(e) => setFileName(e.target.value)}
                              className={`w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                              placeholder={getText('Enter file name', 'የፋይል ስም ያስገቡ')}
                            />
                          </div>
                          
                          {/* Export Info */}
                          <div className={`text-xs mb-4 p-2 rounded ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
                            <p>{getText('Exporting', 'እያወጣ')}: {filteredStudents.length} {getText('students', 'ተማሪዎች')}</p>
                            {(classFilter || sectionFilter || batchFilter || typeFilter) && (
                              <p className="mt-1">{getText('Filters applied', 'ፈልተሮች ተተግብረዋል')}</p>
                            )}
                          </div>
                          
                          {/* Export Buttons */}
                          <div className="flex gap-2">
                            <button
                              onClick={exportToPDF}
                              disabled={filteredStudents.length === 0}
                              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                              PDF
                            </button>
                            <button
                              onClick={exportToExcel}
                              disabled={filteredStudents.length === 0}
                              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Excel
                            </button>
                          </div>
                          
                          <button
                            onClick={() => setShowExportMenu(false)}
                            className={`w-full mt-2 px-4 py-2 text-sm rounded-md transition-colors ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                          >
                            {getText('Cancel', 'ሰርዝ')}
                          </button>
                        </div>
                      </div>
                    )}
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
                    className={`w-full px-4 py-3 pl-11 pr-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300'}`}
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className={`absolute right-3 top-4 transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  >
                    <option value="">{getText('All Classes', 'ሁሉም ክፍሎች')}</option>
                    <option value="Nursery">{getText('Nursery', 'ጀማሪ')}</option>
                    <option value="LKG">{getText('LKG', 'ደረጃ 1')}</option>
                    <option value="UKG">{getText('UKG', 'ደረጃ 2')}</option>
                  </select>

                  <select
                    value={sectionFilter}
                    onChange={(e) => setSectionFilter(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  >
                    <option value="">{getText('All Sections', 'ሁሉም ክፍሎች')}</option>
                    <option value="A">{getText('Section A', 'ክፍል አ')}</option>
                    <option value="B">{getText('Section B', 'ክፍል ለ')}</option>
                    <option value="C">{getText('Section C', 'ክፍል ሐ')}</option>
                    <option value="D">{getText('Section D', 'ክፍል መ')}</option>
                  </select>

                  <select
                    value={batchFilter}
                    onChange={(e) => setBatchFilter(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
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

                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  >
                    <option value="">{getText('All Types', 'ሁሉም አይነቶች')}</option>
                    <option value="regular">{getText('Regular', 'መደበኛ')}</option>
                    <option value="special">{getText('Special', 'ልዩ')}</option>
                  </select>
                </div>

                {/* Results Count */}
                <div className="flex items-center justify-between">
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    {getText('Showing', 'እያሳየ')} <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{filteredStudents.length}</span> {getText('of', 'ከ')} <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{students.length}</span> {getText('students', 'ተማሪዎች')}
                  </p>
                </div>
              </div>
            </div>

            {/* Desktop Table */}
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
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                            </svg>
                          </div>
                          <h3 className={`text-lg font-medium mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {searchTerm || classFilter || sectionFilter || batchFilter || typeFilter ? getText('No students found', 'ምንም ተማሪዎች አልተገኙም') : getText('No students yet', 'ከስሆን ተማሪዎች የሉም')}
                          </h3>
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {searchTerm || classFilter || sectionFilter || batchFilter || typeFilter 
                              ? getText('Try adjusting your filters', 'ፈልተሮችን ማስተካከል ይመክሩ') 
                              : getText('Add your first student', 'የመጀምረሪያውን ተማሪ ያክሉ')}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => (
                      <tr key={student._id} className={`${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
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
                            {language === 'am' ? student.studentId.replace('BLUE', 'ብሉ') : student.studentId}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {getText(student.class, student.class === 'Nursery' ? 'ጀማሪ' : student.class === 'LKG' ? 'ደረጃ 1' : student.class === 'UKG' ? 'ደረጃ 2' : student.class)}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {language === 'am' && student.section ? 
                              (student.section === 'A' ? 'አ' : student.section === 'B' ? 'ለ' : student.section === 'C' ? 'ሐ' : student.section === 'D' ? 'መ' : student.section) 
                              : (student.section || '-')
                            }
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {getText(student.gender, student.gender === 'Male' ? 'ወንድ' : student.gender === 'Female' ? 'ሴት' : student.gender)}
                          </span>
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
                              className={`text-xs px-2 py-1 rounded transition-colors ${theme === 'dark' ? 'bg-green-800 text-green-200 hover:bg-green-700' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                            >
                              {getText('View', 'ይመልከቱ')}
                            </button>
                            <button
                              onClick={() => router.push(`/students/edit/${student._id}`)}
                              className={`text-xs px-2 py-1 rounded transition-colors ${theme === 'dark' ? 'bg-blue-800 text-blue-200 hover:bg-blue-700' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                            >
                              {getText('Edit', 'ያርቱ')}
                            </button>
                            <button
                              onClick={() => handleInactive(student._id)}
                              className={`text-xs px-2 py-1 rounded transition-colors ${theme === 'dark' ? 'bg-orange-800 text-orange-200 hover:bg-orange-700' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}`}
                            >
                              {getText('Inactive', 'አይሰራ')}
                            </button>
                            <button
                              onClick={() => handleDelete(student._id)}
                              className={`text-xs px-2 py-1 rounded transition-colors ${theme === 'dark' ? 'bg-red-800 text-red-200 hover:bg-red-700' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
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
              {filteredStudents.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                    <h3 className={`text-lg font-medium mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {searchTerm || classFilter || sectionFilter || batchFilter || typeFilter ? getText('No students found', 'ምንም ተማሪዎች አልተገኙም') : getText('No students yet', 'ከስሆን ተማሪዎች የሉም')}
                    </h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {searchTerm || classFilter || sectionFilter || batchFilter || typeFilter 
                        ? getText('Try adjusting your filters', 'ፈልተሮችን ማስተካከል ይመክሩ') 
                        : getText('Add your first student', 'የመጀምረሪያውን ተማሪ ያክሉ')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 p-4">
                  {filteredStudents.map((student) => (
                    <div key={student._id} className={`rounded-lg border p-4 shadow-sm ${theme === 'dark' ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
                      <div className="flex items-start space-x-3">
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
                          <h3 className={`text-base font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {language === 'am' && student.firstNameAmharic 
                              ? `${student.firstNameAmharic} ${student.middleNameAmharic || ''} ${student.lastNameAmharic || ''}`.trim()
                              : `${student.firstName} ${student.middleName} ${student.lastName}`
                            }
                          </h3>
                          <p className="text-sm font-medium text-blue-600 mb-2">{language === 'am' ? student.studentId.replace('BLUE', 'ብሉ') : student.studentId}</p>
                          
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <p className={`text-xs font-medium uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{getText('Class', 'ክፍል')}</p>
                              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {getText(student.class, student.class === 'Nursery' ? 'ጀማሪ' : student.class === 'LKG' ? 'ደረጃ 1' : student.class === 'UKG' ? 'ደረጃ 2' : student.class)}
                              </p>
                            </div>
                            <div>
                              <p className={`text-xs font-medium uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{getText('Section', 'ክፍል')}</p>
                              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {language === 'am' && student.section ? 
                                  (student.section === 'A' ? 'አ' : student.section === 'B' ? 'ለ' : student.section === 'C' ? 'ሐ' : student.section === 'D' ? 'መ' : student.section) 
                                  : (student.section || '-')
                                }
                              </p>
                            </div>
                            <div>
                              <p className={`text-xs font-medium uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{getText('Gender', 'ጾታ')}</p>
                              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {getText(student.gender, student.gender === 'Male' ? 'ወንድ' : student.gender === 'Female' ? 'ሴት' : student.gender)}
                              </p>
                            </div>
                          </div>
                          
                          {student.email && (
                            <p className={`text-xs mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{student.email}</p>
                          )}
                          
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => router.push(`/students/view/${student._id}`)}
                              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${theme === 'dark' ? 'bg-green-800 text-green-200 hover:bg-green-700' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                            >
                              {getText('View', 'ይመልከቱ')}
                            </button>
                            <button
                              onClick={() => router.push(`/students/edit/${student._id}`)}
                              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${theme === 'dark' ? 'bg-blue-800 text-blue-200 hover:bg-blue-700' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                            >
                              {getText('Edit', 'ያርቱ')}
                            </button>
                            <button
                              onClick={() => handleInactive(student._id)}
                              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${theme === 'dark' ? 'bg-orange-800 text-orange-200 hover:bg-orange-700' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}`}
                            >
                              {getText('Inactive', 'አይሰራ')}
                            </button>
                            <button
                              onClick={() => handleDelete(student._id)}
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
      
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, type: 'inactive', studentId: '', studentName: '' })}
        onConfirm={handleConfirm}
        title={confirmDialog.type === 'inactive' ? getText('Mark Student as Inactive', 'ተማሪን እንደ አይሰራ አድርግ') : getText('Delete Student', 'ተማሪን ሰርዝ')}
        message={confirmDialog.type === 'inactive' 
          ? getText(`Are you sure you want to mark ${confirmDialog.studentName} as inactive?`, `${confirmDialog.studentName} እንደ አይሰራ ማድርግ እርጋጣ ነዎት?`)
          : getText(`Are you sure you want to permanently delete ${confirmDialog.studentName}?`, `${confirmDialog.studentName} ለመቀን መሰርዝ እርጋጣ ነዎት?`)
        }
        confirmText={confirmDialog.type === 'inactive' ? getText('Mark Inactive', 'አይሰራ አድርግ') : getText('Delete', 'ሰርዝ')}
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
    </DashboardLayout>
  );
}