'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/DashboardLayout';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useSettings } from '@/contexts/SettingsContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import * as XLSX from 'xlsx';
import XLSXStyle from 'xlsx-js-style';
import { saveAs } from 'file-saver';
import { calcAgeFromDOB } from '@/utils/dateUtils';
import Pagination from '@/components/Pagination';

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
  motherName?: string;
  motherPhone?: string;
  createdAt?: string;
}

const isValidParentName = (name?: string) => {
  if (!name) return false;
  const trimmed = name.trim().toLowerCase();
  if (trimmed.length < 2) return false;
  if (
    trimmed === '-' ||
    trimmed === '--' ||
    trimmed === '---' ||
    trimmed === 'n/a' ||
    trimmed === 'none' ||
    trimmed === 'null' ||
    trimmed === 'unknown'
  ) {
    return false;
  }
  return true;
};

export default function StudentsPage() {
  const { language, theme, getText } = useSettings();
  const { canDo, role } = usePermissions();
  const [students, setStudents] = useState<Student[]>([]);
  const [inactiveStudents, setInactiveStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkClass, setBulkClass] = useState('');
  const [bulkSection, setBulkSection] = useState('');
  const [bulkPaymentCode, setBulkPaymentCode] = useState('');
  const [bulkPaymentAction, setBulkPaymentAction] = useState<'set'|'remove'>('set');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [studentTypeFilter, setStudentTypeFilter] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'inactive' | 'delete';
    studentId: string;
    studentName: string;
  }>({ isOpen: false, type: 'inactive', studentId: '', studentName: '' });
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [fileName, setFileName] = useState('');
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceLang, setAttendanceLang] = useState<'am' | 'en'>('am');
  const [attendanceClass, setAttendanceClass] = useState('');
  const [attendanceSection, setAttendanceSection] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [sectionClass, setSectionClass] = useState('');
  const [numSections, setNumSections] = useState(2);
  const [studentsPerSection, setStudentsPerSection] = useState('');
  const [customPerSection, setCustomPerSection] = useState<string[]>([]);
  const [sectionMode, setSectionMode] = useState<'auto' | 'custom'>('auto');
  const [sectionPreview, setSectionPreview] = useState<{id:string;name:string;section:string}[]>([]);
  const [assigningSection, setAssigningSection] = useState(false);
  const [showCredModal, setShowCredModal] = useState(false);
  const [credResults, setCredResults] = useState<{studentId:string;name:string;username:string;password:string}[]>([]);
  const [generatingCreds, setGeneratingCreds] = useState(false);
  const [singleCredResult, setSingleCredResult] = useState<{studentId:string;name:string;username:string;password:string}|null>(null);
  const [siblingsModal, setSiblingsModal] = useState<{student: Student; siblings: Student[]} | null>(null);
  const [showAllSiblingsModal, setShowAllSiblingsModal] = useState(false);
  const router = useRouter();

  const allSiblingGroups = useMemo(() => {
    if (!students || students.length === 0) return [];

    const n = students.length;
    const parent = Array.from({ length: n }, (_, i) => i);

    const find = (i: number): number => {
      if (parent[i] === i) return i;
      parent[i] = find(parent[i]);
      return parent[i];
    };

    const union = (i: number, j: number) => {
      const rootI = find(i);
      const rootJ = find(j);
      if (rootI !== rootJ) {
        parent[rootI] = rootJ;
      }
    };

    // Group student indices by fatherName
    const fatherMap = new Map<string, number[]>();
    // Group student indices by motherName
    const motherMap = new Map<string, number[]>();

    students.forEach((s, idx) => {
      if (isValidParentName(s.fatherName)) {
        const fn = s.fatherName!.trim().toLowerCase();
        const list = fatherMap.get(fn) || [];
        list.push(idx);
        fatherMap.set(fn, list);
      }

      if (isValidParentName(s.motherName)) {
        const mn = s.motherName!.trim().toLowerCase();
        const list = motherMap.get(mn) || [];
        list.push(idx);
        motherMap.set(mn, list);
      }
    });

    // Union all students sharing same full fatherName
    fatherMap.forEach(indices => {
      for (let i = 1; i < indices.length; i++) {
        union(indices[0], indices[i]);
      }
    });

    // Union all students sharing same full motherName
    motherMap.forEach(indices => {
      for (let i = 1; i < indices.length; i++) {
        union(indices[0], indices[i]);
      }
    });

    // Collect connected sibling components
    const componentMap = new Map<number, Student[]>();
    for (let i = 0; i < n; i++) {
      const root = find(i);
      const list = componentMap.get(root) || [];
      list.push(students[i]);
      componentMap.set(root, list);
    }

    const groups: { fatherName: string; motherName: string; students: Student[] }[] = [];

    componentMap.forEach(groupStudents => {
      if (groupStudents.length > 1) {
        const fatherNames = Array.from(
          new Set(
            groupStudents
              .map(s => s.fatherName?.trim())
              .filter((name): name is string => Boolean(name && isValidParentName(name)))
          )
        );
        const motherNames = Array.from(
          new Set(
            groupStudents
              .map(s => s.motherName?.trim())
              .filter((name): name is string => Boolean(name && isValidParentName(name)))
          )
        );

        const sortedStudents = [...groupStudents].sort((a, b) => {
          const classOrder: { [k: string]: number } = { 'Nursery': 1, 'LKG': 2, 'UKG': 3 };
          const aOrder = classOrder[a.class] || 99;
          const bOrder = classOrder[b.class] || 99;
          if (aOrder !== bOrder) return aOrder - bOrder;
          return `${a.firstName} ${a.middleName}`.localeCompare(`${b.firstName} ${b.middleName}`);
        });

        groups.push({
          fatherName: fatherNames.join(' / ') || '—',
          motherName: motherNames.join(' / ') || '—',
          students: sortedStudents,
        });
      }
    });

    groups.sort((a, b) => {
      const cmp = a.fatherName.localeCompare(b.fatherName);
      if (cmp !== 0) return cmp;
      return a.motherName.localeCompare(b.motherName);
    });

    return groups;
  }, [students]);

  const siblingStudentIds = useMemo(() => {
    const idSet = new Set<string>();
    allSiblingGroups.forEach(g => {
      g.students.forEach(s => idSet.add(s._id));
    });
    return idSet;
  }, [allSiblingGroups]);

  const filteredSiblingGroups = useMemo(() => {
    if (typeFilter !== 'siblings') return [];
    const filteredIds = new Set(filteredStudents.map(s => s._id));
    return allSiblingGroups
      .map(g => ({
        ...g,
        students: g.students.filter(s => filteredIds.has(s._id))
      }))
      .filter(g => g.students.length > 0);
  }, [typeFilter, filteredStudents, allSiblingGroups]);

  const PAGE_SIZE = 20;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, classFilter, sectionFilter, batchFilter, typeFilter, studentTypeFilter]);

  const totalItems = typeFilter === 'siblings' ? filteredSiblingGroups.length : filteredStudents.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalItems);
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);
  const paginatedSiblingGroups = filteredSiblingGroups.slice(startIndex, endIndex);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [students, searchTerm, classFilter, sectionFilter, batchFilter, typeFilter, studentTypeFilter, allSiblingGroups]);

  useEffect(() => {
    generateFileName();
  }, [filteredStudents, classFilter, sectionFilter, batchFilter, typeFilter, studentTypeFilter, language]);

  const generateFileName = () => {
    const parts = [];
    if (classFilter) parts.push(getText(classFilter, classFilter === 'Nursery' ? 'ጀማሪ' : classFilter === 'LKG' ? 'ደረጃ1' : classFilter === 'UKG' ? 'ደረጃ2' : classFilter));
    if (sectionFilter) parts.push(`${getText('Section', 'ክፍል')}${language === 'am' ? (sectionFilter === 'A' ? 'አ' : sectionFilter === 'B' ? 'ለ' : sectionFilter === 'C' ? 'ሐ' : sectionFilter === 'D' ? 'መ' : sectionFilter) : sectionFilter}`);
    if (batchFilter) parts.push(`${batchFilter}EC`);
    if (typeFilter) {
      if (typeFilter === 'regular') parts.push(getText('Regular', 'መደበኛ'));
      else if (typeFilter === 'special') parts.push(getText('Special', 'ልዩ'));
      else if (typeFilter === 'siblings') parts.push(getText('Siblings', 'ወንድም_እህት'));
    }
    
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
      } else if (typeFilter === 'siblings') {
        const orderedSiblings: Student[] = [];
        allSiblingGroups.forEach(g => {
          g.students.forEach(s => {
            if (filtered.some(f => f._id === s._id)) {
              orderedSiblings.push(s);
            }
          });
        });
        filtered = orderedSiblings;
      }
    }

    if (studentTypeFilter) {
      filtered = filtered.filter(student => student.studentType === studentTypeFilter);
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
        }).catch(() => ({ data: [] }))
      ]);
      setStudents(activeResponse.data);
      setInactiveStudents(inactiveResponse.data);
      setFilteredStudents(activeResponse.data);
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

  const toggleSelectStudent = (id: string) => {
    setSelectedStudents(prev => {
      const next = prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id];
      if (next.length > 0) setShowBulkActions(true);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
      setShowBulkActions(false);
    } else {
      setSelectedStudents(filteredStudents.map(s => s._id));
      setShowBulkActions(true);
    }
  };

  const handleBulkUpdatePaymentCode = async () => {
    const code = bulkPaymentAction === 'remove' ? '' : bulkPaymentCode.trim();
    if (bulkPaymentAction === 'set' && !code) {
      toast.error(getText('Please enter a payment code', 'የክፍያ ኮድ ያስገቡ'));
      return;
    }
    const count = selectedStudents.length;
    const ids = [...selectedStudents];
    const action = bulkPaymentAction;
    const loadingToast = toast.loading(getText('Updating payment codes...', 'የክፍያ ኮዶችን እያዘመነ ነው...'));
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/students/bulk/update-payment-code`, {
        studentIds: ids,
        paymentCode: code
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.dismiss(loadingToast);
      // Update locally — no refetch, no page jump
      setStudents(prev => prev.map(s => ids.includes(s._id) ? { ...s, paymentCode: code } : s));
      setSelectedStudents([]);
      setShowBulkActions(false);
      setBulkPaymentCode('');
      setBulkPaymentAction('set');
      const msg = action === 'remove'
        ? getText(`Payment code removed from ${count} students successfully!`, `${count} ተማሪዎች የክፍያ ኮድ በተሳካ ሁኔታ ተወግዷል!`)
        : getText(`Payment code set for ${count} students successfully!`, `${count} ተማሪዎች የክፍያ ኮድ በተሳካ ሁኔታ ተቀናብሯል!`);
      toast.success(msg);
    } catch {
      toast.dismiss(loadingToast);
      toast.error(getText('Failed to update payment codes', 'የክፍያ ኮዶችን ማዘመን አልተሳካም'));
    }
  };

  const handleBulkUpdateClass = async () => {
    if (!bulkClass && !bulkSection) {
      toast.error(getText('Please select class or section to update', 'እባክዎ ለማዘመን ክፍል ወይም ክፍል ይምረጡ'));
      return;
    }
    
    const loadingToast = toast.loading(getText('Updating students...', 'ተማሪዎችን እያዘመነ ነው...'));
    
    try {
      const token = localStorage.getItem('token');
      const updateData: any = {
        studentIds: selectedStudents
      };
      
      if (bulkClass) updateData.classValue = bulkClass;
      if (bulkSection) updateData.section = bulkSection;
      
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/students/bulk/update-class`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.dismiss(loadingToast);
      toast.success(getText(`${selectedStudents.length} students updated successfully!`, `${selectedStudents.length} ተማሪዎች በተሳካ ሁኔታ ተዘምነዋል!`));
      setSelectedStudents([]);
      setShowBulkActions(false);
      setBulkClass('');
      setBulkSection('');
      fetchStudents();
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(getText('Failed to update students', 'ተማሪዎችን ማዘመን አልተሳካም'));
    }
  };

  const handleBulkInactive = async () => {
    if (selectedStudents.length === 0) return;
    
    const loadingToast = toast.loading(getText('Marking students as inactive...', 'ተማሪዎችን እንደ አይሰራ እያደረገ ነው...'));
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/students/bulk/inactive`, {
        studentIds: selectedStudents
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.dismiss(loadingToast);
      toast.success(getText(`${selectedStudents.length} students marked as inactive!`, `${selectedStudents.length} ተማሪዎች እንደ አይሰራ ተደርገዋል!`));
      setSelectedStudents([]);
      setShowBulkActions(false);
      fetchStudents();
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(getText('Failed to mark students as inactive', 'ተማሪዎችን እንደ አይሰራ ማድርግ አልተሳካም'));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedStudents.length === 0) return;
    
    if (!confirm(getText(`Are you sure you want to delete ${selectedStudents.length} students?`, `${selectedStudents.length} ተማሪዎችን መሰርዝ እርግጠኛ ነዎት?`))) {
      return;
    }
    
    const loadingToast = toast.loading(getText('Deleting students...', 'ተማሪዎችን እያሰረዘ ነው...'));
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/students/bulk/delete`, {
        studentIds: selectedStudents
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.dismiss(loadingToast);
      toast.success(getText(`${selectedStudents.length} students deleted successfully!`, `${selectedStudents.length} ተማሪዎች በተሳካ ሁኔታ ተሰርዘዋል!`));
      setSelectedStudents([]);
      setShowBulkActions(false);
      fetchStudents();
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(getText('Failed to delete students', 'ተማሪዎችን መሰርዝ አልተሳካም'));
    }
  };

  const normalizeRow = (raw: Record<string, any>) => {
    const get = (...keys: string[]) => {
      for (const k of keys) {
        const found = Object.keys(raw).find(rk => rk.toLowerCase().replace(/[^a-z]/g, '') === k.toLowerCase().replace(/[^a-z]/g, ''));
        if (found && raw[found] !== undefined && raw[found] !== null && String(raw[found]).trim() !== '') return String(raw[found]).trim();
      }
      return '';
    };
    return {
      firstName: get('firstname', 'first name', 'fname'),
      middleName: get('middlename', 'middle name', 'mname', 'fathername'),
      lastName: get('lastname', 'last name', 'lname', 'grandfathername'),
      firstNameAmharic: get('firstnameamharic', 'first name amharic', 'fname amharic'),
      middleNameAmharic: get('middlenameamharic', 'middle name amharic'),
      lastNameAmharic: get('lastnameamharic', 'last name amharic'),
      gender: get('gender', 'sex'),
      dateOfBirth: get('dateofbirth', 'date of birth', 'dob', 'birthdate'),
      joinedYear: get('joinedyear', 'joined year', 'batch', 'year'),
      class: get('class', 'grade', 'level'),
      section: get('section', 'sec'),
      email: get('email'),
      address: get('address'),
      paymentCode: get('paymentcode', 'payment code', 'code'),
      fatherName: get('fathername', 'father name', 'father'),
      fatherPhone: get('fatherphone', 'father phone', 'fathercontact'),
      motherName: get('mothername', 'mother name', 'mother'),
      motherPhone: get('motherphone', 'mother phone', 'mothercontact'),
    };
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportErrors([]);
    setImportPreview([]);

    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
      console.log('Raw Excel data:', raw);
      const rows = raw.map(normalizeRow);
      console.log('Normalized rows:', rows);
      setImportPreview(rows);
    } else if (ext === 'pdf') {
      toast.error(getText('PDF import: please use Excel/CSV for best results. PDF text extraction is limited.', 'PDF ማስገቢያ: Excel/CSV ይጠቀሙ። PDF ጽሑፍ ማውጣት ውስን ነው።'));
      setImportErrors([getText('PDF import is not supported. Please export your data as Excel (.xlsx) or CSV and import that instead.', 'PDF ማስገቢያ አይደገፍም። ውሂቡን እንደ Excel (.xlsx) ወይም CSV ወደ ውጭ አውጥተው ያስገቡ።')]);
    } else {
      setImportErrors([getText('Unsupported file type. Please use .xlsx, .xls, or .csv', 'ያልተደገፈ የፋይል አይነት። .xlsx፣ .xls ወይም .csv ይጠቀሙ')]);
    }
    e.target.value = '';
  };

  const handleImportConfirm = async () => {
    if (importPreview.length === 0) return;
    setImporting(true);
    const loadingToast = toast.loading(getText('Importing students...', 'ተማሪዎችን እያስገባ ነው...'));
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/students/bulk/import`, { students: importPreview }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.dismiss(loadingToast);
      const { created, failed } = res.data;
      toast.success(getText(`${created} students imported successfully!`, `${created} ተማሪዎች በተሳካ ሁኔታ ገብተዋል!`));
      if (failed.length > 0) {
        toast.error(failed[0]?.reason ? "Row failed: " + failed[0].reason : failed.length + " rows failed");
        console.error('Import failures:', failed);
      }
      setShowImportModal(false);
      setImportPreview([]);
      fetchStudents();
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(getText('Import failed', 'ማስገቢያ አልተሳካም'));
    } finally {
      setImporting(false);
    }
  };

  const formatDOB = (dob?: string) => {
    if (!dob) return '-';
    // Already in dd/mm/yyyy format
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dob.trim())) return dob.trim();
    // ISO date string — convert to dd/mm/yyyy
    const d = new Date(dob);
    if (isNaN(d.getTime())) return dob;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };


  const generateSectionPreview = () => {
    if (!sectionClass) return toast.error(getText('Please select a class', 'ክፍል ይምረጡ'));
    const classStudents = students.filter(s => s.class === sectionClass);
    if (classStudents.length === 0) return toast.error(getText('No students in this class', 'በዚህ ክፍል ምንም ተማሪ የለም'));
    const sections = ['A','B','C','D','E'];
    const sorted = [...classStudents].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    let preview: {id:string;name:string;section:string}[];
    if (sectionMode === 'custom' && customPerSection.length > 0) {
      preview = [];
      let idx = 0;
      for (let sec = 0; sec < numSections; sec++) {
        const limit = parseInt(customPerSection[sec] || '0') || 0;
        const end = idx + limit;
        sorted.slice(idx, end).forEach(s => preview.push({
          id: s._id,
          name: language === 'am' && s.firstNameAmharic ? `${s.firstNameAmharic} ${s.middleNameAmharic||''}`.trim() : `${s.firstName} ${s.middleName}`,
          section: sections[sec]
        }));
        idx = end;
      }
    } else {
      const limit = studentsPerSection ? parseInt(studentsPerSection) : Math.ceil(classStudents.length / numSections);
      preview = sorted.map((s, i) => ({
        id: s._id,
        name: language === 'am' && s.firstNameAmharic ? `${s.firstNameAmharic} ${s.middleNameAmharic||''}`.trim() : `${s.firstName} ${s.middleName}`,
        section: sections[Math.min(Math.floor(i / limit), numSections - 1)]
      }));
    }
    setSectionPreview(preview);
  };

  const handleAssignSections = async () => {
    if (!sectionClass || sectionPreview.length === 0) return;
    setAssigningSection(true);
    const loadingToast = toast.loading(getText('Assigning sections...', 'ክፍሎችን እየሰጠ ነው...'));
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/students/bulk/assign-sections`, {
        classValue: sectionClass,
        numSections,
        studentsPerSection: studentsPerSection ? parseInt(studentsPerSection) : undefined
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.dismiss(loadingToast);
      toast.success(getText(`Sections assigned for ${sectionPreview.length} students!`, `${sectionPreview.length} ተማሪዎች ክፍሎች ተሰጥቷቸዋል!`));
      setShowSectionModal(false);
      setSectionPreview([]);
      setSectionClass('');
      fetchStudents();
    } catch {
      toast.dismiss(loadingToast);
      toast.error(getText('Failed to assign sections', 'ክፍሎችን መስጠት አልተሳካም'));
    } finally {
      setAssigningSection(false);
    }
  };

  const handleGenerateAllCredentials = async () => {
    setGeneratingCreds(true);
    const loadingToast = toast.loading(getText('Generating credentials...', 'ምስክርነቶችን እየፈጠረ ነው...'));
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/students/generate-credentials`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.dismiss(loadingToast);
      setCredResults(res.data.credentials);
      setShowCredModal(true);
      toast.success(getText(`Credentials generated for ${res.data.credentials.length} students!`, `${res.data.credentials.length} ተማሪዎች ምስክርነቶች ተፈጥረዋል!`));
    } catch {
      toast.dismiss(loadingToast);
      toast.error(getText('Failed to generate credentials', 'ምስክርነቶችን መፍጠር አልተሳካም'));
    } finally {
      setGeneratingCreds(false);
    }
  };

  const downloadCredentialsPDF = async (list: {studentId:string;name:string;username:string;password:string;class?:string;section?:string}[]) => {
    if (list.length === 0) return toast.error(getText('No credentials to download', 'ምስክርነቶች የሉም'));
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new (jsPDF as any)({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, W, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Bluelight Academy', W / 2, 9, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Student Portal Credentials', W / 2, 15, { align: 'center' });
    doc.setFillColor(254, 252, 232);
    doc.rect(10, 21, W - 20, 7, 'F');
    doc.setTextColor(133, 77, 14);
    doc.setFontSize(7);
    doc.text('CONFIDENTIAL — Keep secure. Share only with the respective student.', W / 2, 26, { align: 'center' });
    autoTable(doc, {
      startY: 31,
      head: [['#', 'Full Name', 'Class', 'Sec.', 'Username', 'Password']],
      body: list.map((c, i) => [i + 1, c.name, c.class || '', c.section || '', c.username, c.password]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [30, 58, 95], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [239, 246, 255] },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 55 },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 12, halign: 'center' },
        4: { cellWidth: 38 },
        5: { cellWidth: 38 }
      },
      margin: { left: 10, right: 10 },
    });
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`Generated: ${new Date().toLocaleDateString()}  |  Page ${i} of ${pageCount}`, W / 2, doc.internal.pageSize.getHeight() - 5, { align: 'center' });
    }
    doc.save(`student_credentials_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success(getText('PDF downloaded!', 'PDF ወጣ!'));
  };

  const handleDownloadCredentialsPDF = async () => {
    const loadingToast = toast.loading(getText('Loading credentials...', 'ምስክርነቶችን እየጠበቀ ነው...'));
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/students/all-credentials`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.dismiss(loadingToast);
      if (res.data.credentials.length === 0) {
        return toast.error(getText('No credentials found. Generate credentials first.', 'ምስክርነቶች አልተገኙም። መጀመሪያ ምስክርነቶችን ፍጠር።'));
      }
      await downloadCredentialsPDF(res.data.credentials);
    } catch {
      toast.dismiss(loadingToast);
      toast.error(getText('Failed to load credentials', 'ምስክርነቶችን መጫን አልተሳካም'));
    }
  };

  const handleGenerateSingleCredential = async (studentId: string) => {
    const loadingToast = toast.loading(getText('Generating...', 'እየፈጠረ ነው...'));
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/students/${studentId}/generate-credential`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.dismiss(loadingToast);
      setSingleCredResult(res.data);
    } catch {
      toast.dismiss(loadingToast);
      toast.error(getText('Failed to generate credential', 'ምስክርነት መፍጠር አልተሳካም'));
    }
  };

  const getAttendanceStudents = () => {
    let list = students;
    if (attendanceClass) list = list.filter(s => s.class === attendanceClass);
    if (attendanceSection) list = list.filter(s => s.section === attendanceSection);
    return [...list].sort((a, b) => {
      const nameA = attendanceLang === 'am' && a.firstNameAmharic
        ? `${a.firstNameAmharic} ${a.middleNameAmharic || ''}`.trim()
        : `${a.firstName} ${a.middleName}`;
      const nameB = attendanceLang === 'am' && b.firstNameAmharic
        ? `${b.firstNameAmharic} ${b.middleNameAmharic || ''}`.trim()
        : `${b.firstName} ${b.middleName}`;
      return nameA.localeCompare(nameB);
    });
  };

  const getStudentName = (s: Student, lang: 'am' | 'en') =>
    lang === 'am' && s.firstNameAmharic
      ? `${s.firstNameAmharic} ${s.middleNameAmharic || ''} ${s.lastNameAmharic || ''}`.trim()
      : `${s.firstName} ${s.middleName} ${s.lastName}`;

  const showSiblings = (student: Student) => {
    const familyGroup = allSiblingGroups.find(g => g.students.some(s => s._id === student._id));

    if (!familyGroup || familyGroup.students.length <= 1) {
      return toast(getText('No siblings found', 'ወንድም/እህት አልተገኘም'), { icon: 'ℹ️' });
    }

    setSiblingsModal({ student, siblings: familyGroup.students });
  };

  const getAge = (dob?: string) => {
    if (!dob) return '-';
    const age = calcAgeFromDOB(dob);
    return age !== null ? String(age) : '-';
  };



  const downloadAttendanceExcel = () => {
    const list = getAttendanceStudents();
    const isAm = attendanceLang === 'am';
    const totalCols = 4 + 22;

    // ── Style helpers ──────────────────────────────────────────────
    const thinBlack  = { style: 'thin',   color: { rgb: '000000' } };
    const thinGray   = { style: 'thin',   color: { rgb: 'CCCCCC' } };
    const medBlack   = { style: 'medium', color: { rgb: '000000' } };
    const border     = { top: thinBlack, bottom: thinBlack, left: thinBlack, right: thinBlack };
    const borderMed  = { top: medBlack,  bottom: medBlack,  left: medBlack,  right: medBlack  };
    const borderInfo = { top: thinGray,  bottom: thinGray,  left: thinGray,  right: thinGray  };
    const center     = { horizontal: 'center', vertical: 'center', wrapText: true };
    const left       = { horizontal: 'left',   vertical: 'center', wrapText: true };

    const ws: any = {};
    const merges: any[] = [];
    let R = 0;

    const sc = (r: number, c: number, v: any, s: any = {}) => {
      ws[XLSXStyle.utils.encode_cell({ r, c })] = { v: v ?? '', t: typeof v === 'number' ? 'n' : 's', s };
    };
    const fillMerge = (r: number, fromC: number, toC: number, s: any = {}) => {
      for (let c = fromC; c <= toC; c++) sc(r, c, '', s);
    };

    // ── Row 0: School title bar ────────────────────────────────────
    const titleStyle = {
      font:      { bold: true, sz: isAm ? 14 : 15, color: { rgb: '000000' } },
      fill:      { fgColor: { rgb: 'FFFFFF' } },
      alignment: center,
      border:    borderMed,
    };
    const title = isAm
      ? '\u12e8\u1265\u1209 \u120b\u12ed\u1275 \u12a0\u12ab\u12f3\u121a  —  \u12e8\u1270\u121b\u122a\u12ce\u127d \u1201\u1294\u1273 \u1218\u1246\u1323\u1320\u122a\u12eb'
      : 'Bluelight Academy  —  Student Attendance Sheet';
    sc(R, 0, title, titleStyle);
    fillMerge(R, 1, totalCols - 1, titleStyle);
    merges.push({ s: { r: R, c: 0 }, e: { r: R, c: totalCols - 1 } });
    R++;

    // ── Row 1: blank spacer ────────────────────────────────────────
    R++;

    // ── Shared info-row style ──────────────────────────────────────
    const infoLabelStyle = {
      font:      { bold: true, sz: isAm ? 11 : 10, color: { rgb: '000000' } },
      fill:      { fgColor: { rgb: 'FFFFFF' } },
      alignment: left,
      border:    borderInfo,
    };

    // ── Row 2: Teacher Name | Date ─────────────────────────────────
    const teacherLabel = isAm ? '\u12e8\u1218\u121d\u1205\u1229 \u1235\u121d:  _______________________________' : 'Teacher Name:  _______________________________';
    const dateLabel    = isAm ? '\u1240\u1295:  ___________________________'                                 : 'Date:  ___________________________';
    sc(R, 0, teacherLabel, infoLabelStyle);
    fillMerge(R, 1, 12, infoLabelStyle);
    merges.push({ s: { r: R, c: 0 }, e: { r: R, c: 12 } });
    sc(R, 13, dateLabel, infoLabelStyle);
    fillMerge(R, 14, totalCols - 1, infoLabelStyle);
    merges.push({ s: { r: R, c: 13 }, e: { r: R, c: totalCols - 1 } });
    R++;

    // ── Row 3: Class / Section | Subject ──────────────────────────
    const classVal   = attendanceClass   || '_____________';
    const sectionVal = attendanceSection || '_____________';
    const classLabel   = isAm
      ? `\u12ad\u134d\u120d:  ${classVal}          \u12ad\u134d\u120d \u1245\u1345:  ${sectionVal}`
      : `Class:  ${classVal}          Section:  ${sectionVal}`;
    const subjectLabel = isAm ? '\u12e8\u1275\u121d\u1205\u122d\u1275 \u12a0\u12ed\u1290\u1275:  ___________________________' : 'Subject:  ___________________________';
    sc(R, 0, classLabel, infoLabelStyle);
    fillMerge(R, 1, 12, infoLabelStyle);
    merges.push({ s: { r: R, c: 0 }, e: { r: R, c: 12 } });
    sc(R, 13, subjectLabel, infoLabelStyle);
    fillMerge(R, 14, totalCols - 1, infoLabelStyle);
    merges.push({ s: { r: R, c: 13 }, e: { r: R, c: totalCols - 1 } });
    R++;

    // ── Row 4: blank spacer ────────────────────────────────────────
    R++;

    // ── Row 5: Column headers ──────────────────────────────────────
    // font sizes: Ethiopic needs larger sz to avoid overlap
    const fSz     = isAm ? 11 : 10;
    const fSzHdr  = isAm ? 11 : 10;
    const rowH    = isAm ? 26 : 18;  // taller rows for Ethiopic glyphs
    const hdrH    = isAm ? 28 : 22;
    const infoH   = isAm ? 24 : 20;
    const nameW   = isAm ? 42 : 32;  // wider name col for Ethiopic
    const genderW = isAm ? 10 : 8;
    const dayW    = isAm ? 5  : 4;   // slightly wider day cols for Ethiopic

    const headerStyle = {
      font:      { bold: true, sz: fSzHdr, color: { rgb: '000000' } },
      fill:      { fgColor: { rgb: 'FFFFFF' } },
      alignment: center,
      border,
    };
    const headerNameStyle = { ...headerStyle, alignment: left };
    const headers = isAm
      ? ['\u1270.\u1241', '\u12e8\u1270\u121b\u122a\u12cd \u1235\u121d', '\u12d5\u12f5\u121c', '\u133e\u1273']
      : ['No.', 'Student Name', 'Age', 'Gender'];
    const days = Array.from({ length: 22 }, (_, i) => String(i + 1));
    [...headers, ...days].forEach((h, c) => {
      sc(R, c, h, c === 1 ? headerNameStyle : headerStyle);
    });
    R++;

    // ── Student data rows ──────────────────────────────────────────
    const whiteFill = { fgColor: { rgb: 'FFFFFF' } };
    list.forEach((s, i) => {
      const cellStyle = { font: { sz: fSz }, fill: whiteFill, alignment: center, border };
      const nameStyle = { font: { sz: fSz }, fill: whiteFill, alignment: left,   border };
      const name   = getStudentName(s, attendanceLang);
      const age    = getAge(s.dateOfBirth);
      const gender = isAm
        ? (s.gender === 'Male' ? '\u12c8\u1295\u12f5' : s.gender === 'Female' ? '\u1234\u1275' : s.gender)
        : (s.gender === 'Male' ? 'M' : s.gender === 'Female' ? 'F' : s.gender);
      sc(R, 0, i + 1, cellStyle);
      sc(R, 1, name,  nameStyle);
      sc(R, 2, age,   cellStyle);
      sc(R, 3, gender,cellStyle);
      for (let c = 4; c < totalCols; c++) sc(R, c, '', cellStyle);
      R++;
    });

    // ── Blank spacer ───────────────────────────────────────────────
    R++;

    // ── Legend row ─────────────────────────────────────────────────
    const legendStyle = {
      font:      { bold: false, sz: isAm ? 10 : 9, italic: true, color: { rgb: '000000' } },
      fill:      { fgColor: { rgb: 'FFFFFF' } },
      alignment: left,
      border:    { top: thinGray, bottom: thinGray, left: thinGray, right: thinGray },
    };
    const legend = isAm
      ? '\u121b\u1235\u1273\u12c8\u123b\u1361   \u2713 = \u12e8\u1270\u1308\u1298     \u2718 = \u12eb\u120d\u1270\u1308\u1298     P = \u1348\u1243\u12f5'
      : 'Legend:   \u2713 = Present     \u2718 = Absent     P = Permission';
    sc(R, 0, legend, legendStyle);
    fillMerge(R, 1, totalCols - 1, legendStyle);
    merges.push({ s: { r: R, c: 0 }, e: { r: R, c: totalCols - 1 } });

    // ── Sheet metadata ─────────────────────────────────────────────
    ws['!cols'] = [
      { wch: 5 },        // No.
      { wch: nameW },    // Name
      { wch: 6 },        // Age
      { wch: genderW },  // Gender
      ...Array(22).fill({ wch: dayW }),
    ];
    ws['!rows'] = [
      { hpt: 30 },              // title
      { hpt: 6  },              // spacer
      { hpt: infoH },           // teacher/date
      { hpt: infoH },           // class/subject
      { hpt: 6  },              // spacer
      { hpt: hdrH },            // header
      ...Array(list.length).fill({ hpt: rowH }),
      { hpt: 6  },              // spacer
      { hpt: rowH },            // legend
    ];
    ws['!merges'] = merges;
    ws['!ref'] = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: R, c: totalCols - 1 } });

    const wb = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(wb, ws, isAm ? '\u1201\u1294\u1273' : 'Attendance');
    const buf = XLSXStyle.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const cls = attendanceClass   ? '_' + attendanceClass   : '';
    const sec = attendanceSection ? '_' + attendanceSection : '';
    saveAs(blob, 'Attendance' + cls + sec + '_' + new Date().toISOString().split('T')[0] + '.xlsx');
    toast.success(getText('Attendance Excel downloaded!', '\u12e8\u1201\u1294\u1273 Excel \u12c8\u1323!'));
  };

  const exportToPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new (jsPDF as any)({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();

    // Header bar
    doc.setFillColor(29, 78, 216);
    doc.rect(0, 0, W, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Bluelight Academy — Student List', 14, 11);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Exported: ${new Date().toLocaleString()}   |   Total: ${filteredStudents.length} student${filteredStudents.length !== 1 ? 's' : ''}`, W - 14, 11, { align: 'right' });

    autoTable(doc, {
      startY: 22,
      head: [['#', 'Student ID', 'Full Name', 'Class', 'Sec.', 'Gender', 'Batch', 'Date of Birth', 'Father Name', 'Father Phone', 'Mother Name', 'Mother Phone', 'Payment Code', 'Reg. Date']],
      body: filteredStudents.map((s, i) => [
        i + 1,
        s.studentId,
        `${s.firstName} ${s.middleName} ${s.lastName}`,
        s.class,
        s.section || '—',
        s.gender,
        s.joinedYear,
        formatDOB(s.dateOfBirth),
        s.fatherName || '—',
        s.fatherPhone || '—',
        s.motherName || '—',
        s.motherPhone || '—',
        s.paymentCode || '—',
        s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—',
      ]),
      styles: { fontSize: 7, cellPadding: 2.5, textColor: [30, 30, 30] },
      headStyles: { fillColor: [29, 78, 216], textColor: 255, fontStyle: 'bold', fontSize: 7 },
      alternateRowStyles: { fillColor: [245, 247, 255] },
      columnStyles: {
        0:  { cellWidth: 8,  halign: 'center' },
        1:  { cellWidth: 22 },
        2:  { cellWidth: 38 },
        3:  { cellWidth: 16 },
        4:  { cellWidth: 10, halign: 'center' },
        5:  { cellWidth: 14 },
        6:  { cellWidth: 12 },
        7:  { cellWidth: 20 },
        8:  { cellWidth: 28 },
        9:  { cellWidth: 22 },
        10: { cellWidth: 28 },
        11: { cellWidth: 22 },
        12: { cellWidth: 20 },
        13: { cellWidth: 22 },
      },
      margin: { left: 10, right: 10 },
      didDrawPage: (data: any) => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(`Page ${data.pageNumber} of ${pageCount}`, W / 2, doc.internal.pageSize.getHeight() - 5, { align: 'center' });
      },
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
        getText('Payment Code', 'የክፍያ ኮድ'),
        getText('Registration Date', 'የምዝገባ ቀን')
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
        formatDOB(student.dateOfBirth),
        student.fatherName || '',
        student.fatherPhone || '',
        student.motherName || '',
        student.motherPhone || '',
        student.email || '',
        student.address || '',
        student.paymentCode || '',
        student.createdAt ? new Date(student.createdAt).toLocaleString() : ''
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
      { wch: 15 },  // Payment Code
      { wch: 22 }   // Registration Date
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className={`rounded-lg shadow-sm border p-6 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('Total Students', 'ጠቅላላ ተማሪዎች')}</p>
                  <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{students.length}</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{getText('Active students', 'ንቁ ተማሪዎች')}</p>
                  <button
                    onClick={() => setShowAllSiblingsModal(true)}
                    className="mt-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    {getText('Show Siblings', 'ወንድም/እህት አሳይ')}
                  </button>
                </div>
              </div>
            </div>

            <div className={`rounded-lg shadow-sm border p-6 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('Filtered Students', 'የተፈጡ ተማሪዎች')}</p>
                  <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{filteredStudents.length}</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{getText('Based on filters', 'በፈልተሮች ላይ የተመሰረተ')}</p>
                </div>
              </div>
            </div>
            
            <div className={`rounded-lg shadow-sm border p-6 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('Inactive Students', 'የተከለሉ ተማሪዎች')}</p>
                    <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{inactiveStudents.length}</p>
                  </div>
                </div>
                {canDo('students', 'inactive') && (
                  <button
                    onClick={() => router.push('/inactive-students')}
                    className="text-red-600 hover:text-red-700 text-sm font-medium transition-colors flex items-center gap-1"
                  >
                    {getText('Show Inactives', 'የተከለሉ አሳይ')}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className={`rounded-xl shadow-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            {/* Header */}
            <div className={`px-6 py-5 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{getText('Students', 'ተማሪዎች')}</h1>
                    <p className={`text-sm mt-0.5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('Manage and view all student information', 'የተማሪዎች ማለባ መረጃ አስተዳድር እና መመልከት')}</p>
                  </div>
                  {canDo('students', 'add') && (
                    <button
                      onClick={() => router.push('/students/add')}
                      className="w-full sm:w-auto shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-5 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      {getText('Add Student', 'ተማሪ ጨምር')}
                    </button>
                  )}
                </div>

                {/* Action buttons — 2-col grid on mobile, flex-wrap on sm+ */}
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2">
                  {/* Bulk Actions */}
                  {selectedStudents.length > 0 && (
                    <button
                      onClick={() => setShowBulkActions(!showBulkActions)}
                      className="col-span-2 sm:col-span-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      {getText('Bulk', 'ጅምላ')} ({selectedStudents.length})
                    </button>
                  )}

                  {/* Export */}
                  <div className="relative">
                    <button
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {getText('Export', 'ወደ ውጭ')}
                    </button>
                    {showExportMenu && (
                      <div className={`absolute left-0 mt-2 w-72 rounded-lg shadow-lg border z-50 ${theme === 'dark' ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
                        <div className="p-4">
                          <h3 className={`text-sm font-medium mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{getText('Export Students', 'ተማሪዎችን ወደ ውጭ አውጣ')}</h3>
                          <div className="mb-3">
                            <label className={`block text-xs font-medium mb-1.5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{getText('File Name', 'የፋይል ስም')}</label>
                            <input
                              type="text"
                              value={fileName}
                              onChange={(e) => setFileName(e.target.value)}
                              className={`w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                              placeholder={getText('Enter file name', 'የፋይል ስም ያስገቡ')}
                            />
                          </div>
                          <div className={`text-xs mb-3 p-2 rounded ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
                            {getText('Exporting', 'እያወጣ')}: {filteredStudents.length} {getText('students', 'ተማሪዎች')}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={exportToExcel}
                              disabled={filteredStudents.length === 0}
                              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Excel
                            </button>
                            <button
                              onClick={exportToPDF}
                              disabled={filteredStudents.length === 0}
                              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                              PDF
                            </button>
                          </div>
                          <button onClick={() => setShowExportMenu(false)} className={`w-full mt-2 px-4 py-2 text-sm rounded-md transition-colors ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
                            {getText('Cancel', 'ሰርዝ')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Attendance */}
                  <button
                    onClick={() => setShowAttendanceModal(true)}
                    className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    {getText('Attendance Sheet', 'የattendance ዝርዝር')}
                  </button>

                  {/* Generate Sections — visible to all admin roles */}
                  {canDo('students', 'view') && (
                    <button
                      onClick={() => { setShowSectionModal(true); setSectionPreview([]); setSectionMode('auto'); setStudentsPerSection(''); setCustomPerSection([]); }}
                      className="bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h8m-8 4h4" />
                      </svg>
                      {getText('Gen. Sections', 'ክፍሎች ፍጠር')}
                    </button>
                  )}

                  {/* Import */}
                  {canDo('students', 'add') && (
                    <button
                      onClick={() => setShowImportModal(true)}
                      className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      {getText('Import', 'አስገባ')}
                    </button>
                  )}

                  {/* Generate Credentials — superadmin only */}
                  {role === 'superadmin' && (
                    <button
                      onClick={handleGenerateAllCredentials}
                      disabled={generatingCreds}
                      className="col-span-2 sm:col-span-1 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 disabled:opacity-60 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      {getText('Gen. Credentials', 'ምስክርነቶች')}
                    </button>
                  )}

                  {/* Download Credentials PDF — superadmin only */}
                  {role === 'superadmin' && (
                    <button
                      onClick={handleDownloadCredentialsPDF}
                      className="col-span-2 sm:col-span-1 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {getText('Cred. PDF', 'ምስክርነት PDF')}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
              {/* Bulk Actions Panel */}
              {showBulkActions && selectedStudents.length > 0 && (
                <div className={`mb-4 p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
                  <h3 className={`text-sm font-medium mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {getText('Bulk Actions', 'የጅምላ ተግባሮች')} - {selectedStudents.length} {getText('selected', 'ተመርጠዋል')}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Update Class Section */}
                    <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <h4 className={`text-xs font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {getText('Update Class & Section', 'ክፍል እና ክፍል ያዘምኑ')}
                      </h4>
                      <div className="flex gap-2 mb-2">
                        <select
                          value={bulkClass}
                          onChange={(e) => setBulkClass(e.target.value)}
                          className={`flex-1 px-3 py-2 text-sm border rounded-md ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                        >
                          <option value="">{getText('Select Class', 'ክፍል ይምረጡ')}</option>
                          <option value="Nursery">{getText('Nursery', 'ጀማሪ')}</option>
                          <option value="LKG">{getText('LKG', 'ደረጃ 1')}</option>
                          <option value="UKG">{getText('UKG', 'ደረጃ 2')}</option>
                        </select>
                        <select
                          value={bulkSection}
                          onChange={(e) => setBulkSection(e.target.value)}
                          className={`flex-1 px-3 py-2 text-sm border rounded-md ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                        >
                          <option value="">{getText('Select Section', 'ክፍል ይምረጡ')}</option>
                          <option value="A">{getText('Section A', 'ክፍል አ')}</option>
                          <option value="B">{getText('Section B', 'ክፍል ለ')}</option>
                          <option value="C">{getText('Section C', 'ክፍል ሐ')}</option>
                          <option value="D">{getText('Section D', 'ክፍል መ')}</option>
                        </select>
                      </div>
                      <button
                        onClick={handleBulkUpdateClass}
                        disabled={!bulkClass && !bulkSection}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                      >
                        {getText('Update', 'ያዘምኑ')}
                      </button>
                    </div>
                    
                    {/* Payment Code */}
                    <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <h4 className={`text-xs font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {getText('Payment Code', 'የክፍያ ኮድ')}
                      </h4>
                      <div className="flex gap-2 mb-2">
                        <button
                          onClick={() => setBulkPaymentAction('set')}
                          className={`flex-1 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                            bulkPaymentAction === 'set'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : theme === 'dark' ? 'bg-gray-600 text-gray-300 border-gray-500' : 'bg-white text-gray-600 border-gray-300'
                          }`}
                        >
                          {getText('Set Code', 'ኮድ አድርግ')}
                        </button>
                        <button
                          onClick={() => setBulkPaymentAction('remove')}
                          className={`flex-1 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                            bulkPaymentAction === 'remove'
                              ? 'bg-red-600 text-white border-red-600'
                              : theme === 'dark' ? 'bg-gray-600 text-gray-300 border-gray-500' : 'bg-white text-gray-600 border-gray-300'
                          }`}
                        >
                          {getText('Remove Code', 'ኮድ አስወግድ')}
                        </button>
                      </div>
                      {bulkPaymentAction === 'set' && (
                        <input
                          type="text"
                          value={bulkPaymentCode}
                          onChange={e => setBulkPaymentCode(e.target.value)}
                          placeholder={getText('Enter payment code', 'የክፍያ ኮድ ያስገቡ')}
                          className={`w-full px-3 py-2 text-sm border rounded-md mb-2 ${
                            theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'
                          }`}
                        />
                      )}
                      <button
                        onClick={handleBulkUpdatePaymentCode}
                        className={`w-full py-2 rounded-md text-sm font-medium text-white transition-colors ${
                          bulkPaymentAction === 'remove' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {bulkPaymentAction === 'remove' ? getText('Remove Payment Code', 'የክፍያ ኮድ አስወግድ') : getText('Set Payment Code', 'የክፍያ ኮድ አድርግ')}
                      </button>
                    </div>

                    {/* Other Actions */}
                    <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <h4 className={`text-xs font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {getText('Other Actions', 'ሌሎች ተግባሮች')}
                      </h4>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={handleBulkInactive}
                          className="w-full bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                          {getText('Mark as Inactive', 'እንደ አይሰራ አድርግ')}
                        </button>
                        <button
                          onClick={handleBulkDelete}
                          className="w-full bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          {getText('Delete Selected', 'ተመርጠውን ሰርዝ')}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedStudents([]);
                            setShowBulkActions(false);
                            setBulkClass('');
                            setBulkSection('');
                          }}
                          className={`w-full px-3 py-2 rounded-md text-sm font-medium transition-colors ${theme === 'dark' ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                        >
                          {getText('Cancel', 'ሰርዝ')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
                    onChange={(e) => {
                      const val = e.target.value;
                      setTypeFilter(val);
                      if (val === 'siblings') {
                        setShowAllSiblingsModal(true);
                      }
                    }}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  >
                    <option value="">{getText('All Types', 'ሁሉም አይነቶች')}</option>
                    <option value="regular">{getText('Regular', 'መደበኛ')}</option>
                    <option value="special">{getText('Special', 'ልዩ')}</option>
                    <option value="siblings">{getText('Siblings', 'ወንድም/እህት')}</option>
                  </select>

                  <select
                    value={studentTypeFilter}
                    onChange={(e) => setStudentTypeFilter(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  >
                    <option value="">{getText('All Student Types', 'ሁሉም የተማሪ አይነቶች')}</option>
                    <option value="new">{getText('New', 'አዲስ')}</option>
                    <option value="existing">{getText('Existing', 'ነባር')}</option>
                  </select>
                </div>

                {/* Results Count */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    {getText('Showing', 'እያሳየ')} <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{totalItems === 0 ? 0 : `${startIndex + 1}-${endIndex}`}</span> {getText('of', 'ከ')} <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{totalItems}</span> {typeFilter === 'siblings' ? getText('family groups', 'የቤተሰብ ቡድኖች') : getText('students', 'ተማሪዎች')}
                    {typeFilter === 'siblings' && (
                      <span className="ml-2 font-medium text-blue-600 dark:text-blue-400">
                        ({filteredSiblingGroups.length} {getText('family groups in order', 'የቤተሰብ ቡድኖች በቅደም ተከተል')})
                      </span>
                    )}
                  </p>
                  {typeFilter === 'siblings' && (
                    <button
                      type="button"
                      onClick={() => setShowAllSiblingsModal(true)}
                      className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium underline flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                      {getText('View all in modal', 'ሁሉንም በሞዳል ይመልከቱ')}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                    <th className={`px-4 py-3 text-left ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-xs font-medium">
                          {selectedStudents.length === filteredStudents.length && filteredStudents.length > 0
                            ? getText('Deselect All', 'ሁሉንም አትምረጥ')
                            : getText('Select All', 'ሁሉንም ምረጥ')}
                        </span>
                      </div>
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
                            {searchTerm || classFilter || sectionFilter || batchFilter || typeFilter || studentTypeFilter ? getText('No students found', 'ምንም ተማሪዎች አልተገኙም') : getText('No students yet', 'ከስሆን ተማሪዎች የሉም')}
                          </h3>
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {searchTerm || classFilter || sectionFilter || batchFilter || typeFilter || studentTypeFilter
                              ? getText('Try adjusting your filters', 'ፈልተሮችን ማስተካከል ይመክሩ') 
                              : getText('Add your first student', 'የመጀምረሪያውን ተማሪ ያክሉ')}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedStudents.map((student) => (
                      <tr key={student._id} className={`${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(student._id)}
                            onChange={() => toggleSelectStudent(student._id)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            <button onClick={() => router.push(`/students/view/${student._id}`)} className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 hover:ring-2 hover:ring-blue-400 transition-all">
                              {student.photo ? (
                                <img src={student.photo} alt="" className="h-8 w-8 rounded-full object-cover" />
                              ) : (
                                <span className="text-xs font-medium text-white">
                                  {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                                </span>
                              )}
                            </button>
                            <div className="ml-3 min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <div className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                  {language === 'am' && student.firstNameAmharic 
                                    ? `${student.firstNameAmharic} ${student.middleNameAmharic || ''} ${student.lastNameAmharic || ''}`.trim()
                                    : `${student.firstName} ${student.middleName} ${student.lastName}`
                                  }
                                </div>
                                {siblingStudentIds.has(student._id) && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); showSiblings(student); }}
                                    title={getText('Click to view siblings', 'ወንድም/እህት ለማየት ይጫኑ')}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:hover:bg-purple-800/60 transition-colors"
                                  >
                                    👨‍👩‍👧‍👦 {getText('Sibling', 'ወንድም/እህት')}
                                  </button>
                                )}
                              </div>
                              {student.email && (
                                <div className={`text-xs truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{student.email}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <button onClick={() => router.push(`/students/view/${student._id}`)} className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors">
                            {language === 'am' ? student.studentId.replace('BLUE', 'ብሉ') : student.studentId}
                          </button>
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
                              <div>F: <a href={`tel:${student.fatherPhone}`} className="text-blue-500 hover:text-blue-700 hover:underline">{student.fatherPhone}</a></div>
                            )}
                            {student.motherPhone && (
                              <div>M: <a href={`tel:${student.motherPhone}`} className="text-blue-500 hover:text-blue-700 hover:underline">{student.motherPhone}</a></div>
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
                            {canDo('students', 'edit') && (
                            <button
                              onClick={() => router.push(`/students/edit/${student._id}`)}
                              className={`text-xs px-2 py-1 rounded transition-colors ${theme === 'dark' ? 'bg-blue-800 text-blue-200 hover:bg-blue-700' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                            >
                              {getText('Edit', 'ያርቱ')}
                            </button>
                            )}
                            {canDo('students', 'inactive') && (
                            <button
                              onClick={() => handleInactive(student._id)}
                              className={`text-xs px-2 py-1 rounded transition-colors ${theme === 'dark' ? 'bg-orange-800 text-orange-200 hover:bg-orange-700' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}`}
                            >
                              {getText('Inactive', 'አይሰራ')}
                            </button>
                            )}
                            {canDo('students', 'delete') && (
                            <button
                              onClick={() => handleDelete(student._id)}
                              className={`text-xs px-2 py-1 rounded transition-colors ${theme === 'dark' ? 'bg-red-800 text-red-200 hover:bg-red-700' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                            >
                              {getText('Delete', 'ሰርዝ')}
                            </button>
                            )}
                            {role === 'superadmin' && (
                            <button
                              onClick={() => handleGenerateSingleCredential(student._id)}
                              className={`text-xs px-2 py-1 rounded transition-colors ${theme === 'dark' ? 'bg-rose-800 text-rose-200 hover:bg-rose-700' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'}`}
                              title={getText('Generate Credential', 'ምስክርነት ፍጠር')}
                            >
                              🔑
                            </button>
                            )}
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
                      {searchTerm || classFilter || sectionFilter || batchFilter || typeFilter || studentTypeFilter ? getText('No students found', 'ምንም ተማሪዎች አልተገኙም') : getText('No students yet', 'ከስሆን ተማሪዎች የሉም')}
                    </h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {searchTerm || classFilter || sectionFilter || batchFilter || typeFilter || studentTypeFilter 
                        ? getText('Try adjusting your filters', 'ፈልተሮችን ማስተካከል ይመክሩ') 
                        : getText('Add your first student', 'የመጀምረሪያውን ተማሪ ያክሉ')}
                    </p>
                  </div>
                </div>
              ) : typeFilter === 'siblings' ? (
                <div className="space-y-4 p-4">
                  {/* Select All Checkbox for Mobile */}
                  <div className={`flex items-center p-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                    <input
                      type="checkbox"
                      checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                      onChange={toggleSelectAll}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <label className={`ml-3 text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {selectedStudents.length === filteredStudents.length && filteredStudents.length > 0
                        ? getText('Deselect All', 'ሁሉንም አትምረጥ')
                        : getText('Select All', 'ሁሉንም ምረጥ')}
                      {selectedStudents.length > 0 && ` (${selectedStudents.length})`}
                    </label>
                  </div>

                  {paginatedSiblingGroups.map((group, gIdx) => (
                    <div key={`m-group-${gIdx}`} className={`rounded-xl border overflow-hidden shadow-sm ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-blue-200 bg-blue-50/20'}`}>
                      <div className={`px-4 py-2.5 flex items-center justify-between ${theme === 'dark' ? 'bg-gray-700' : 'bg-blue-100/70'}`}>
                        <span className={`text-xs font-bold ${theme === 'dark' ? 'text-blue-300' : 'text-blue-900'}`}>
                          👨‍👩‍👧‍👦 {getText('Sibling Family', 'የወንድም/እህት ቤተሰብ')} #{gIdx + 1}: &nbsp;
                          {group.fatherName} &bull; {group.motherName}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${theme === 'dark' ? 'bg-gray-800 text-blue-300' : 'bg-white text-blue-800 shadow-sm'}`}>
                          {group.students.length} {getText('siblings', 'ወንድም/እህት')}
                        </span>
                      </div>
                      <div className="p-3 space-y-3">
                        {group.students.map((student) => (
                          <div key={student._id} className={`rounded-lg border p-4 shadow-sm ${theme === 'dark' ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
                            <div className="flex items-start space-x-3">
                              <input
                                type="checkbox"
                                checked={selectedStudents.includes(student._id)}
                                onChange={() => toggleSelectStudent(student._id)}
                                className="w-5 h-5 mt-1 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                              />
                              <button onClick={() => router.push(`/students/view/${student._id}`)} className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 hover:ring-2 hover:ring-blue-400 transition-all">
                                {student.photo ? (
                                  <img src={student.photo} alt="" className="h-12 w-12 rounded-full object-cover" />
                                ) : (
                                  <span className="text-sm font-medium text-white">
                                    {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                                  </span>
                                )}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h3 className={`text-base font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                    {language === 'am' && student.firstNameAmharic 
                                      ? `${student.firstNameAmharic} ${student.middleNameAmharic || ''} ${student.lastNameAmharic || ''}`.trim()
                                      : `${student.firstName} ${student.middleName} ${student.lastName}`
                                    }
                                  </h3>
                                  {siblingStudentIds.has(student._id) && (
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); showSiblings(student); }}
                                      title={getText('Click to view siblings', 'ወንድም/እህት ለማየት ይጫኑ')}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:hover:bg-purple-800/60 transition-colors"
                                    >
                                      👨‍👩‍👧‍👦 {getText('Sibling', 'ወንድም/እህት')}
                                    </button>
                                  )}
                                </div>
                                <button onClick={() => router.push(`/students/view/${student._id}`)} className="text-sm font-medium text-blue-600 hover:underline mb-2 block">{language === 'am' ? student.studentId.replace('BLUE', 'ብሉ') : student.studentId}</button>
                                
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
                                  <p className={`text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{student.email}</p>
                                )}
                                {(student.fatherPhone || student.motherPhone) && (
                                  <div className={`text-xs mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                                    {student.fatherPhone && (
                                      <span className="mr-3">F: <a href={`tel:${student.fatherPhone}`} className="text-blue-500 hover:text-blue-700 hover:underline">{student.fatherPhone}</a></span>
                                    )}
                                    {student.motherPhone && (
                                      <span>M: <a href={`tel:${student.motherPhone}`} className="text-blue-500 hover:text-blue-700 hover:underline">{student.motherPhone}</a></span>
                                    )}
                                  </div>
                                )}

                                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                  <button
                                    onClick={() => router.push(`/students/view/${student._id}`)}
                                    className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${theme === 'dark' ? 'bg-green-800 text-green-200 hover:bg-green-700' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                                  >
                                    {getText('View', 'ይመልከቱ')}
                                  </button>
                                  {canDo('students', 'edit') && (
                                  <button
                                    onClick={() => router.push(`/students/edit/${student._id}`)}
                                    className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${theme === 'dark' ? 'bg-blue-800 text-blue-200 hover:bg-blue-700' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                                  >
                                    {getText('Edit', 'ያርቱ')}
                                  </button>
                                  )}
                                  {canDo('students', 'inactive') && (
                                  <button
                                    onClick={() => handleInactive(student._id)}
                                    className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${theme === 'dark' ? 'bg-orange-800 text-orange-200 hover:bg-orange-700' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}`}
                                  >
                                    {getText('Inactive', 'አይሰራ')}
                                  </button>
                                  )}
                                  {canDo('students', 'delete') && (
                                  <button
                                    onClick={() => handleDelete(student._id)}
                                    className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${theme === 'dark' ? 'bg-red-800 text-red-200 hover:bg-red-700' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                                  >
                                    {getText('Delete', 'ሰርዝ')}
                                  </button>
                                  )}
                                  {role === 'superadmin' && (
                                  <button
                                    onClick={() => handleGenerateSingleCredential(student._id)}
                                    className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${theme === 'dark' ? 'bg-rose-800 text-rose-200 hover:bg-rose-700' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'}`}
                                    title={getText('Generate Credential', 'ምስክርነት ፍጠር')}
                                  >
                                    🔑
                                  </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3 p-4">
                  {/* Select All Checkbox for Mobile */}
                  <div className={`flex items-center p-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                    <input
                      type="checkbox"
                      checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                      onChange={toggleSelectAll}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <label className={`ml-3 text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {selectedStudents.length === filteredStudents.length && filteredStudents.length > 0
                        ? getText('Deselect All', 'ሁሉንም አትምረጥ')
                        : getText('Select All', 'ሁሉንም ምረጥ')}
                      {selectedStudents.length > 0 && ` (${selectedStudents.length})`}
                    </label>
                  </div>

                  {paginatedStudents.map((student) => (
                    <div key={student._id} className={`rounded-lg border p-4 shadow-sm ${theme === 'dark' ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student._id)}
                          onChange={() => toggleSelectStudent(student._id)}
                          className="w-5 h-5 mt-1 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <button onClick={() => router.push(`/students/view/${student._id}`)} className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 hover:ring-2 hover:ring-blue-400 transition-all">
                          {student.photo ? (
                            <img src={student.photo} alt="" className="h-12 w-12 rounded-full object-cover" />
                          ) : (
                            <span className="text-sm font-medium text-white">
                              {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                            </span>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className={`text-base font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {language === 'am' && student.firstNameAmharic 
                                ? `${student.firstNameAmharic} ${student.middleNameAmharic || ''} ${student.lastNameAmharic || ''}`.trim()
                                : `${student.firstName} ${student.middleName} ${student.lastName}`
                              }
                            </h3>
                            {siblingStudentIds.has(student._id) && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); showSiblings(student); }}
                                title={getText('Click to view siblings', 'ወንድም/እህት ለማየት ይጫኑ')}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:hover:bg-purple-800/60 transition-colors"
                              >
                                👨‍👩‍👧‍👦 {getText('Sibling', 'ወንድም/እህት')}
                              </button>
                            )}
                          </div>
                          <button onClick={() => router.push(`/students/view/${student._id}`)} className="text-sm font-medium text-blue-600 hover:underline mb-2 block">{language === 'am' ? student.studentId.replace('BLUE', 'ብሉ') : student.studentId}</button>
                          
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
                            <p className={`text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{student.email}</p>
                          )}
                          {(student.fatherPhone || student.motherPhone) && (
                            <div className={`text-xs mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                              {student.fatherPhone && (
                                <span className="mr-3">F: <a href={`tel:${student.fatherPhone}`} className="text-blue-500 hover:text-blue-700 hover:underline">{student.fatherPhone}</a></span>
                              )}
                              {student.motherPhone && (
                                <span>M: <a href={`tel:${student.motherPhone}`} className="text-blue-500 hover:text-blue-700 hover:underline">{student.motherPhone}</a></span>
                              )}
                            </div>
                          )}
                          
                          <div className="flex flex-wrap gap-2">
                            <button onClick={() => router.push(`/students/view/${student._id}`)} className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${theme === 'dark' ? 'bg-green-800 text-green-200 hover:bg-green-700' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>{getText('View', 'ይመልከቱ')}</button>
                            {canDo('students','edit') && <button onClick={() => router.push(`/students/edit/${student._id}`)} className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${theme === 'dark' ? 'bg-blue-800 text-blue-200 hover:bg-blue-700' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}>{getText('Edit', 'ያርቱ')}</button>}
                            {canDo('students','inactive') && <button onClick={() => handleInactive(student._id)} className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${theme === 'dark' ? 'bg-orange-800 text-orange-200 hover:bg-orange-700' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}`}>{getText('Inactive', 'አይሰራ')}</button>}
                            {canDo('students','delete') && <button onClick={() => handleDelete(student._id)} className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${theme === 'dark' ? 'bg-red-800 text-red-200 hover:bg-red-700' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>{getText('Delete', 'ሰርዝ')}</button>}
                            {role === 'superadmin' && <button onClick={() => handleGenerateSingleCredential(student._id)} className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${theme === 'dark' ? 'bg-rose-800 text-rose-200 hover:bg-rose-700' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'}`} title={getText('Generate Credential', 'ምስክርነት ፍጠር')}>🔑 {getText('Cred.', 'ምስክርነት')}</button>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={PAGE_SIZE}
              onPageChange={(page) => setCurrentPage(page)}
              itemName={typeFilter === 'siblings' ? { en: 'family groups', am: 'የቤተሰብ ቡድኖች' } : { en: 'students', am: 'ተማሪዎች' }}
            />
          </div>
        </div>
      </div>
      
      {/* Attendance Modal */}
      {showAttendanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl shadow-2xl w-full max-w-md ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {getText('Download Attendance Sheet', 'የattendance ዝርዝር አውርድ')}
              </h2>
              <button onClick={() => setShowAttendanceModal(false)} className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Language */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                  {getText('Language', 'ቋንቋ')}
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setAttendanceLang('am')}
                    className={`flex-1 py-2.5 rounded-lg border-2 font-medium text-sm transition-all ${
                      attendanceLang === 'am'
                        ? 'border-teal-600 bg-teal-50 text-teal-700'
                        : theme === 'dark' ? 'border-gray-600 text-gray-300' : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    🇪🇹 አማርኛ
                  </button>
                  <button
                    onClick={() => setAttendanceLang('en')}
                    className={`flex-1 py-2.5 rounded-lg border-2 font-medium text-sm transition-all ${
                      attendanceLang === 'en'
                        ? 'border-teal-600 bg-teal-50 text-teal-700'
                        : theme === 'dark' ? 'border-gray-600 text-gray-300' : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    🇬🇧 English
                  </button>
                </div>
              </div>

              {/* Class */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                  {getText('Class', 'ክፍል')} ({getText('optional', 'አማራጭ')})
                </label>
                <select
                  value={attendanceClass}
                  onChange={e => setAttendanceClass(e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-teal-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                >
                  <option value="">{getText('All Classes', 'ሁሉም ክፍሎች')}</option>
                  <option value="Nursery">{getText('Nursery', 'ጀማሪ')}</option>
                  <option value="LKG">{getText('LKG', 'ደረጃ 1')}</option>
                  <option value="UKG">{getText('UKG', 'ደረጃ 2')}</option>
                </select>
              </div>

              {/* Section */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                  {getText('Section', 'ክፍል')} ({getText('optional', 'አማራጭ')})
                </label>
                <select
                  value={attendanceSection}
                  onChange={e => setAttendanceSection(e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-teal-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                >
                  <option value="">{getText('All Sections', 'ሁሉም ክፍሎች')}</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </div>

              {/* Preview count */}
              <div className={`text-sm px-3 py-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-teal-50 text-teal-800'}`}>
                {getText('Students in sheet', 'ተማሪዎች')}: <strong>{getAttendanceStudents().length}</strong>
              </div>

              {/* Download buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { downloadAttendanceExcel(); setShowAttendanceModal(false); }}
                  disabled={getAttendanceStudents().length === 0}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Excel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{getText('Import Students', 'ተማሪዎችን አስገባ')}</h2>
              <button onClick={() => { setShowImportModal(false); setImportPreview([]); setImportErrors([]); }} className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
              {importPreview.length === 0 ? (
                <div className="text-center py-12">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${theme === 'dark' ? 'bg-indigo-900' : 'bg-indigo-100'}`}>
                    <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                  </div>
                  <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{getText('Upload Student List', 'የተማሪዎች ዝርዝር ይስቀሉ')}</h3>
                  <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{getText('Supported formats: Excel (.xlsx, .xls), CSV', 'የሚደገፉ ቅርጸቶች: Excel (.xlsx, .xls), CSV')}</p>
                  
                  {importErrors.length > 0 && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-left max-w-md mx-auto">
                      <h4 className="text-sm font-semibold text-red-800 mb-2">{getText('Errors', 'ስህተቶች')}:</h4>
                      {importErrors.map((err, i) => <p key={i} className="text-xs text-red-700">{err}</p>)}
                    </div>
                  )}
                  
                  <label className="inline-block cursor-pointer">
                    <input type="file" accept=".xlsx,.xls,.csv,.pdf" onChange={handleImportFile} className="hidden" />
                    <span className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      {getText('Choose File', 'ፋይል ምረጥ')}
                    </span>
                  </label>
                  <div className="mt-3">
                    <a href="/student-import-template.csv" download className={`text-sm underline ${theme === 'dark' ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}>
                      {getText('Download sample template', 'የሞደል ቅርዓት አውርድ')}
                    </a>
                  </div>
                  
                  <div className={`mt-8 p-4 rounded-lg text-left max-w-2xl mx-auto ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <h4 className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{getText('Required Columns', 'የሚያስፈልጉ አምዶች')}:</h4>
                    <ul className={`text-xs space-y-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      <li>• <strong>firstName</strong>, <strong>middleName</strong>, <strong>lastName</strong> ({getText('required', 'ያስፈልጋል')})</li>
                      <li>• <strong>gender</strong> (Male/Female) ({getText('required', 'ያስፈልጋል')})</li>
                      <li>• <strong>class</strong> (Nursery/LKG/UKG) ({getText('required', 'ያስፈልጋል')})</li>
                      <li>• <strong>joinedYear</strong> (e.g. 2017) ({getText('required', 'ያስፈልጋል')})</li>
                      <li>• <strong>section</strong> (A/B/C/D), <strong>email</strong>, <strong>dateOfBirth</strong>, <strong>address</strong>, <strong>paymentCode</strong>, <strong>fatherName</strong>, <strong>fatherPhone</strong>, <strong>motherName</strong>, <strong>motherPhone</strong> ({getText('optional', 'አማራጭ')})</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('Preview', 'ቅድመ እይታ')}: <strong>{importPreview.length}</strong> {getText('rows', 'ረድፎች')}</p>
                    <label className="cursor-pointer">
                      <input type="file" accept=".xlsx,.xls,.csv,.pdf" onChange={handleImportFile} className="hidden" />
                      <span className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>{getText('Choose Different File', 'ሌላ ፋይል ምረጥ')}</span>
                    </label>
                  </div>
                  
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-xs">
                      <thead className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <tr>
                          <th className={`px-2 py-2 text-left font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>#</th>
                          <th className={`px-2 py-2 text-left font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('First Name', 'የመጀመሪያ ስም')}</th>
                          <th className={`px-2 py-2 text-left font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('Middle Name', 'የአባት ስም')}</th>
                          <th className={`px-2 py-2 text-left font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('Last Name', 'የአያት ስም')}</th>
                          <th className={`px-2 py-2 text-left font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('Gender', 'ጾታ')}</th>
                          <th className={`px-2 py-2 text-left font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('Class', 'ክፍል')}</th>
                          <th className={`px-2 py-2 text-left font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('Section', 'ክፍል')}</th>
                          <th className={`px-2 py-2 text-left font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('Batch', 'ቡድን')}</th>
                          <th className={`px-2 py-2 text-left font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('Father Phone', 'የአባት ስልክ')}</th>
                          <th className={`px-2 py-2 text-left font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('Mother Phone', 'የእናት ስልክ')}</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                        {importPreview.slice(0, 100).map((row, i) => (
                          <tr key={i} className={theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                            <td className={`px-2 py-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{i + 1}</td>
                            <td className={`px-2 py-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{row.firstName || '-'}</td>
                            <td className={`px-2 py-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{row.middleName || '-'}</td>
                            <td className={`px-2 py-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{row.lastName || '-'}</td>
                            <td className={`px-2 py-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{row.gender || '-'}</td>
                            <td className={`px-2 py-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{row.class || '-'}</td>
                            <td className={`px-2 py-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{row.section || '-'}</td>
                            <td className={`px-2 py-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{row.joinedYear || '-'}</td>
                            <td className={`px-2 py-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{row.fatherPhone || '-'}</td>
                            <td className={`px-2 py-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{row.motherPhone || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {importPreview.length > 100 && (
                    <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{getText('Showing first 100 rows. All rows will be imported.', 'የመጀመሪያዎቹ 100 ረድፎች እየታዩ ነው። ሁሉም ረድፎች ይገባሉ።')}</p>
                  )}
                </div>
              )}
            </div>
            
            {importPreview.length > 0 && (
              <div className={`px-6 py-4 border-t flex justify-end gap-3 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <button onClick={() => { setShowImportModal(false); setImportPreview([]); }} className={`px-4 py-2 rounded-lg font-medium transition-colors ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>{getText('Cancel', 'ሰርዝ')}</button>
                <button onClick={handleImportConfirm} disabled={importing} className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
                  {importing ? getText('Importing...', 'እያስገባ ነው...') : getText('Import Students', 'ተማሪዎችን አስገባ')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Generate Sections Modal */}
      {showSectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {getText('Generate Sections', 'ክፍሎች ፍጠር')}
              </h2>
              <button onClick={() => setShowSectionModal(false)} className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                    {getText('Select Class', 'ክፍል ይምረጡ')}
                  </label>
                  <select
                    value={sectionClass}
                    onChange={e => { setSectionClass(e.target.value); setSectionPreview([]); }}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-violet-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  >
                    <option value="">{getText('Select Class', 'ክፍል ይምረጡ')}</option>
                    <option value="Nursery">{getText('Nursery', 'ጀማሪ')}</option>
                    <option value="LKG">{getText('LKG', 'ደሬጃ 1')}</option>
                    <option value="UKG">{getText('UKG', 'ደሬጃ 2')}</option>
                  </select>
                  {sectionClass && (
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {students.filter(s => s.class === sectionClass).length} {getText('students in this class', 'ተማሪዎች በዚህ ክፍል')}
                    </p>
                  )}
                </div>
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                    {getText('Number of Sections', 'የክፍሎች ብዛት')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={numSections}
                    onChange={e => { const n = parseInt(e.target.value) || 1; setNumSections(n); setSectionPreview([]); if (sectionMode === 'custom') setCustomPerSection(prev => Array.from({ length: n }, (_, i) => prev[i] || '')); }}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-violet-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                    {getText('Students per Section', 'በክፍል የተማሪ ብዛት')}
                  </label>
                  <div className="flex gap-2 mb-2">
                    <button
                      onClick={() => { setSectionMode('auto'); setStudentsPerSection(''); setSectionPreview([]); }}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                        sectionMode === 'auto'
                          ? 'border-violet-600 bg-violet-50 text-violet-700'
                          : theme === 'dark' ? 'border-gray-600 text-gray-300 bg-gray-700' : 'border-gray-200 text-gray-600 bg-white'
                      }`}
                    >
                      {getText('Auto', 'ቤኖ')}
                    </button>
                    <button
                      onClick={() => { setSectionMode('custom'); setCustomPerSection(Array(numSections).fill('')); setSectionPreview([]); }}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                        sectionMode === 'custom'
                          ? 'border-violet-600 bg-violet-50 text-violet-700'
                          : theme === 'dark' ? 'border-gray-600 text-gray-300 bg-gray-700' : 'border-gray-200 text-gray-600 bg-white'
                      }`}
                    >
                      {getText('Custom', 'ብጁ')}
                    </button>
                  </div>
                  {sectionMode === 'auto' ? (
                    <p className={`text-xs px-3 py-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                      {sectionClass
                        ? getText(
                            `~${Math.ceil(students.filter(s => s.class === sectionClass).length / numSections)} students per section`,
                            `በእያንዳንዱ ክፍል ~${Math.ceil(students.filter(s => s.class === sectionClass).length / numSections)} ተማሪዎች`
                          )
                        : getText('Distributes students equally across sections', 'ተማሪዎችን በእኩል ያሰራጫል')}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {Array.from({ length: numSections }, (_, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className={`text-xs font-semibold w-20 shrink-0 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                            {getText('Section', 'ክፍል')} {['A','B','C','D','E'][i]}
                          </span>
                          <input
                            type="number"
                            min={1}
                            value={customPerSection[i] || ''}
                            onChange={e => {
                              const next = [...customPerSection];
                              next[i] = e.target.value;
                              setCustomPerSection(next);
                              setSectionPreview([]);
                            }}
                            placeholder={getText('# students', 'ተማሪ ብዛት')}
                            className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-white border-gray-300'}`}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={generateSectionPreview}
                  disabled={!sectionClass}
                  className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-gray-400 text-white py-2.5 rounded-lg font-medium transition-colors"
                >
                  {getText('Generate Preview', 'ቅድመ እይታ ፍጠር')}
                </button>

                {sectionPreview.length > 0 && (
                  <div>
                    <div className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                      {getText('Preview', 'ቅድመ እይታ')} — {sectionPreview.length} {getText('students', 'ተማሪዎች')}
                    </div>
                    <div className={`rounded-lg border overflow-hidden max-h-64 overflow-y-auto ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}>
                      <table className="w-full text-xs">
                        <thead className={`sticky top-0 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                          <tr>
                            <th className={`px-3 py-2 text-left font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>#</th>
                            <th className={`px-3 py-2 text-left font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('Name', 'ስም')}</th>
                            <th className={`px-3 py-2 text-left font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('Section', 'ክፍል')}</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-100'}`}>
                          {sectionPreview.map((row, i) => (
                            <tr key={row.id} className={theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                              <td className={`px-3 py-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{i + 1}</td>
                              <td className={`px-3 py-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{row.name}</td>
                              <td className="px-3 py-2">
                                <span className={`inline-block px-2 py-0.5 rounded font-semibold text-xs ${
                                  row.section === 'A' ? 'bg-blue-100 text-blue-700' :
                                  row.section === 'B' ? 'bg-green-100 text-green-700' :
                                  row.section === 'C' ? 'bg-orange-100 text-orange-700' :
                                  row.section === 'D' ? 'bg-purple-100 text-purple-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>{row.section}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className={`px-6 py-4 border-t flex justify-end gap-3 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={() => setShowSectionModal(false)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
              >
                {getText('Cancel', 'ሰርዘ')}
              </button>
              <button
                onClick={handleAssignSections}
                disabled={sectionPreview.length === 0 || assigningSection}
                className="bg-violet-600 hover:bg-violet-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {assigningSection ? getText('Assigning...', 'እየሰጠ ነው...') : getText('Assign Sections', 'ክፍሎች ስጥ')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Credentials Modal */}
      {showCredModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                🔑 {getText('Generated Credentials', 'ተፈጥረው ምስክርነቶች')} ({credResults.length})
              </h2>
              <button onClick={() => setShowCredModal(false)} className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className={`px-4 py-2 text-xs ${theme === 'dark' ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-50 text-yellow-800'}`}>
              {getText('Save these credentials now — passwords cannot be recovered later.', 'እነዚህን ምስክርነቶች አሁን ያከምቱ — ሽረት በኊላ መመለስ አይቻልም።')}
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 160px)' }}>
              <table className="w-full text-sm">
                <thead className={`sticky top-0 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <tr>
                    <th className={`px-4 py-2 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>#</th>
                    <th className={`px-4 py-2 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('Name', 'ስም')}</th>
                    <th className={`px-4 py-2 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('Username (ID)', 'መለያ (መለያ)')}</th>
                    <th className={`px-4 py-2 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('Password', 'ሽርት')}</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-100'}`}>
                  {credResults.map((c, i) => (
                    <tr key={c.studentId} className={theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                      <td className={`px-4 py-2 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{i + 1}</td>
                      <td className={`px-4 py-2 text-xs font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{c.name}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs font-mono px-2 py-0.5 rounded ${theme === 'dark' ? 'bg-gray-600 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>{c.username}</span>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`text-xs font-mono px-2 py-0.5 rounded ${theme === 'dark' ? 'bg-gray-600 text-green-300' : 'bg-green-50 text-green-700'}`}>{c.password}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={`px-6 py-3 border-t flex justify-between items-center ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={() => downloadCredentialsPDF(credResults)}
                className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {getText('Download PDF', 'PDF አውርድ')}
              </button>
              <button onClick={() => setShowCredModal(false)} className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
                {getText('Close', 'የረስት')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Credential Modal */}
      {singleCredResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl shadow-2xl w-full max-w-sm ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>🔑 {getText('Credential Generated', 'ምስክርነት ተፈጥሮ')}</h2>
              <button onClick={() => setSingleCredResult(null)} className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className={`text-xs px-3 py-2 rounded-lg ${theme === 'dark' ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-50 text-yellow-800'}`}>
                {getText('Save this password — it cannot be recovered later.', 'ይህንን ሽርት አሁን ያከምቱ — በኊላ መመለስ አይቻልም።')}
              </div>
              <div>
                <p className={`text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{getText('Student', 'ተማሪ')}</p>
                <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{singleCredResult.name}</p>
              </div>
              <div>
                <p className={`text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{getText('Username (Student ID)', 'መለያ (የተማሪ መለያ)')}</p>
                <span className={`font-mono text-sm px-3 py-1.5 rounded-lg inline-block ${theme === 'dark' ? 'bg-gray-700 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>{singleCredResult.username}</span>
              </div>
              <div>
                <p className={`text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{getText('Password', 'ሽርት')}</p>
                <span className={`font-mono text-sm px-3 py-1.5 rounded-lg inline-block ${theme === 'dark' ? 'bg-gray-700 text-green-300' : 'bg-green-50 text-green-700'}`}>{singleCredResult.password}</span>
              </div>
            </div>
            <div className={`px-6 py-3 border-t flex justify-end ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <button onClick={() => setSingleCredResult(null)} className="bg-gray-600 hover:bg-gray-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
                {getText('Close', 'የረስት')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* All Siblings Groups Modal */}
      {showAllSiblingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <div>
                <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {getText('Sibling Groups', 'የወንድም/እህት ቡድኖች')} ({allSiblingGroups.length})
                </h2>
                <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {getText('Students sharing the same father full name and mother full name', 'ተመሳሳይ የአባት እና የእናት ሙሉ ስም ያላቸው ተማሪዎች')}
                </p>
              </div>
              <button onClick={() => setShowAllSiblingsModal(false)} className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-4" style={{ maxHeight: 'calc(85vh - 100px)' }}>
              {allSiblingGroups.length === 0 ? (
                <p className={`text-center py-8 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{getText('No sibling groups found', 'የወንድም/እህት ቡድኖች አልተገኙም')}</p>
              ) : allSiblingGroups.map((g, gi) => (
                <div key={gi} className={`rounded-lg border ${theme === 'dark' ? 'border-gray-600 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
                  <div className={`px-4 py-2.5 rounded-t-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-blue-50'}`}>
                    <p className={`text-xs font-semibold ${theme === 'dark' ? 'text-gray-200' : 'text-blue-800'}`}>
                      👨‍👩‍👧‍👦 {getText('Father', 'አባት')}: <span className="font-bold">{g.fatherName}</span> &nbsp;|&nbsp; {getText('Mother', 'እናት')}: <span className="font-bold">{g.motherName}</span> &nbsp;&mdash;&nbsp; {g.students.length} {getText('students', 'ተማሪዎች')}
                    </p>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {g.students.map(s => (
                      <div key={s._id} className={`px-4 py-2.5 flex items-center justify-between cursor-pointer ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-white'}`} onClick={() => { setShowAllSiblingsModal(false); router.push(`/students/view/${s._id}`); }}>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {language === 'am' && s.firstNameAmharic ? `${s.firstNameAmharic} ${s.middleNameAmharic || ''} ${s.lastNameAmharic || ''}`.trim() : `${s.firstName} ${s.middleName} ${s.lastName}`}
                          </span>
                        </div>
                        <span className="text-xs text-blue-600 font-medium">{language === 'am' ? s.studentId.replace('BLUE', 'ብሉ') : s.studentId} &bull; {s.class}{s.section ? `/${s.section}` : ''} &bull; {getText(s.gender, s.gender === 'Male' ? 'ወንድ' : 'ሴት')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Siblings Modal */}
      {siblingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl shadow-2xl w-full max-w-xl overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${theme === 'dark' ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-blue-50/60'}`}>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">👨‍👩‍👧‍👦</span>
                  <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {getText('Family Siblings', 'የቤተሰብ ወንድም/እህትማማቾች')} ({siblingsModal.siblings.length})
                  </h2>
                </div>
                <div className={`mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  <span>
                    <strong className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>{getText('Father Full Name', 'የአባት ሙሉ ስም')}:</strong> {siblingsModal.student.fatherName || '—'}
                  </span>
                  <span>&bull;</span>
                  <span>
                    <strong className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>{getText('Mother Full Name', 'የእናት ሙሉ ስም')}:</strong> {siblingsModal.student.motherName || '—'}
                  </span>
                </div>
              </div>
              <button onClick={() => setSiblingsModal(null)} className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 120px)' }}>
              <table className="w-full text-sm">
                <thead className={`sticky top-0 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <tr>
                    <th className={`px-4 py-2.5 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>#</th>
                    <th className={`px-4 py-2.5 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('Student Name', 'የተማሪ ስም')}</th>
                    <th className={`px-4 py-2.5 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('ID', 'መለያ')}</th>
                    <th className={`px-4 py-2.5 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('Class', 'ክፍል')}</th>
                    <th className={`px-4 py-2.5 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('Gender', 'ጾታ')}</th>
                    <th className={`px-4 py-2.5 text-right text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('Action', 'ተግባር')}</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-100'}`}>
                  {siblingsModal.siblings.map((s, i) => {
                    const isCurrent = s._id === siblingsModal.student._id;
                    return (
                      <tr
                        key={s._id}
                        className={`transition-colors ${isCurrent ? (theme === 'dark' ? 'bg-blue-950/40' : 'bg-blue-50/70') : ''} ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}
                      >
                        <td className={`px-4 py-2.5 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{i + 1}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div>
                              <div className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {language === 'am' && s.firstNameAmharic
                                  ? `${s.firstNameAmharic} ${s.middleNameAmharic || ''} ${s.lastNameAmharic || ''}`.trim()
                                  : `${s.firstName} ${s.middleName} ${s.lastName}`}
                              </div>
                              <div className={`text-[11px] ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                <span>F: {s.fatherName || '—'}</span> &bull; <span>M: {s.motherName || '—'}</span>
                              </div>
                            </div>
                            {isCurrent && (
                              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                                ● {getText('Selected', 'የተመረጠ')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-blue-600 font-medium">{language === 'am' ? s.studentId.replace('BLUE', 'ብሉ') : s.studentId}</td>
                        <td className={`px-4 py-2.5 text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{s.class}{s.section ? ` / ${s.section}` : ''}</td>
                        <td className={`px-4 py-2.5 text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{getText(s.gender, s.gender === 'Male' ? 'ወንድ' : 'ሴት')}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            onClick={() => { setSiblingsModal(null); router.push(`/students/view/${s._id}`); }}
                            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${theme === 'dark' ? 'bg-blue-800 text-blue-200 hover:bg-blue-700' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                          >
                            {getText('View', 'ይመልከቱ')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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