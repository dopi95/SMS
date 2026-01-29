'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/DashboardLayout';
import ConfirmDialog from '@/components/ConfirmDialog';

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
  const router = useRouter();

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [students, searchTerm, classFilter, sectionFilter, batchFilter, typeFilter]);

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
      toast.error('Failed to load students');
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
    const loadingToast = toast.loading('Marking student as inactive...');
    
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/students/${id}/inactive`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.dismiss(loadingToast);
      toast.success('Student marked as inactive successfully!');
      setStudents(prev => prev.filter(s => s._id !== id));
      setFilteredStudents(prev => prev.filter(s => s._id !== id));
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error('Failed to mark student as inactive');
    }
  };

  const executeDelete = async (id: string) => {
    const loadingToast = toast.loading('Deleting student...');
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/students/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.dismiss(loadingToast);
      toast.success('Student deleted successfully!');
      setStudents(prev => prev.filter(s => s._id !== id));
      setFilteredStudents(prev => prev.filter(s => s._id !== id));
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error('Failed to delete student');
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
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Filtered Students</p>
                  <p className="text-2xl font-bold text-gray-900">{filteredStudents.length}</p>
                  <p className="text-xs text-gray-500">of {students.length} total active</p>
                </div>
              </div>
            </div>
            
            <div 
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push('/students/inactive')}
            >
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Inactive Students</p>
                  <p className="text-2xl font-bold text-gray-900">{inactiveStudents.length}</p>
                  <p className="text-xs text-gray-500">Click to view</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Students</h1>
                  <p className="text-gray-600 mt-1">Manage and view all student information</p>
                </div>
                <button
                  onClick={() => router.push('/students/add')}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add New Student
                </button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
              <div className="flex flex-col gap-4">
                {/* Search Bar */}
                <div className="relative max-w-md">
                  <input
                    type="text"
                    placeholder="Search by name, ID, phone, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 pl-11 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm"
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
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm"
                  >
                    <option value="">All Classes</option>
                    <option value="Nursery">Nursery</option>
                    <option value="LKG">LKG</option>
                    <option value="UKG">UKG</option>
                  </select>

                  <select
                    value={sectionFilter}
                    onChange={(e) => setSectionFilter(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm"
                  >
                    <option value="">All Sections</option>
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                    <option value="D">Section D</option>
                  </select>

                  <select
                    value={batchFilter}
                    onChange={(e) => setBatchFilter(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm"
                  >
                    <option value="">All Batches</option>
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm"
                  >
                    <option value="">All Types</option>
                    <option value="regular">Regular</option>
                    <option value="special">Special</option>
                  </select>
                </div>

                {/* Results Count */}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing <span className="font-semibold text-gray-900">{filteredStudents.length}</span> of <span className="font-semibold text-gray-900">{students.length}</span> students
                  </p>
                </div>
              </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Student</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 uppercase">ID</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 uppercase">Class</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 uppercase">Gender</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 uppercase">Phone</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-medium text-gray-900 mb-1">
                            {searchTerm || classFilter || sectionFilter || batchFilter || typeFilter ? 'No students found' : 'No students yet'}
                          </h3>
                          <p className="text-gray-500 text-sm">
                            {searchTerm || classFilter || sectionFilter || batchFilter || typeFilter 
                              ? 'Try adjusting your filters' 
                              : 'Add your first student'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => (
                      <tr key={student._id} className="hover:bg-gray-50">
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
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {student.firstName} {student.middleName} {student.lastName}
                              </div>
                              {student.email && (
                                <div className="text-xs text-gray-500 truncate">{student.email}</div>
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
                          <span className="text-sm text-gray-900">
                            {student.class}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-sm text-gray-900">
                            {student.gender}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="text-xs text-gray-600">
                            {student.fatherPhone && (
                              <div>F: {student.fatherPhone}</div>
                            )}
                            {student.motherPhone && (
                              <div>M: {student.motherPhone}</div>
                            )}
                            {!student.fatherPhone && !student.motherPhone && (
                              <span className="text-gray-400">-</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() => router.push(`/students/view/${student._id}`)}
                              className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                            >
                              View
                            </button>
                            <button
                              onClick={() => router.push(`/students/edit/${student._id}`)}
                              className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleInactive(student._id)}
                              className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded hover:bg-orange-200"
                            >
                              Inactive
                            </button>
                            <button
                              onClick={() => handleDelete(student._id)}
                              className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200"
                            >
                              Delete
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
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      {searchTerm || classFilter || sectionFilter || batchFilter || typeFilter ? 'No students found' : 'No students yet'}
                    </h3>
                    <p className="text-gray-500 text-sm">
                      {searchTerm || classFilter || sectionFilter || batchFilter || typeFilter 
                        ? 'Try adjusting your filters' 
                        : 'Add your first student'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 p-4">
                  {filteredStudents.map((student) => (
                    <div key={student._id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
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
                          <h3 className="text-base font-semibold text-gray-900">
                            {student.firstName} {student.middleName} {student.lastName}
                          </h3>
                          <p className="text-sm font-medium text-blue-600 mb-2">{student.studentId}</p>
                          
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase">Class</p>
                              <p className="text-sm font-medium text-gray-900">{student.class}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase">Gender</p>
                              <p className="text-sm font-medium text-gray-900">{student.gender}</p>
                            </div>
                          </div>
                          
                          {student.email && (
                            <p className="text-xs text-gray-500 mb-3">{student.email}</p>
                          )}
                          
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => router.push(`/students/view/${student._id}`)}
                              className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-md hover:bg-green-200 font-medium"
                            >
                              View
                            </button>
                            <button
                              onClick={() => router.push(`/students/edit/${student._id}`)}
                              className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-md hover:bg-blue-200 font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleInactive(student._id)}
                              className="text-xs bg-orange-100 text-orange-700 px-3 py-1.5 rounded-md hover:bg-orange-200 font-medium"
                            >
                              Inactive
                            </button>
                            <button
                              onClick={() => handleDelete(student._id)}
                              className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-md hover:bg-red-200 font-medium"
                            >
                              Delete
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
        title={confirmDialog.type === 'inactive' ? 'Mark Student as Inactive' : 'Delete Student'}
        message={confirmDialog.type === 'inactive' 
          ? `Are you sure you want to mark ${confirmDialog.studentName} as inactive?`
          : `Are you sure you want to permanently delete ${confirmDialog.studentName}?`
        }
        confirmText={confirmDialog.type === 'inactive' ? 'Mark Inactive' : 'Delete'}
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