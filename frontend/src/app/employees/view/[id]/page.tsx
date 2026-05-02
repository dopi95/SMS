'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/DashboardLayout';
import { useSettings } from '@/contexts/SettingsContext';
import { usePermissions } from '@/contexts/PermissionsContext';

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
  const { role } = usePermissions();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [credential, setCredential] = useState<{username:string|null;password:string|null}|null>(null);
  const [credLoading, setCredLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [generatingSingle, setGeneratingSingle] = useState(false);
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    if (id) {
      fetchTeacher();
    }
  }, [id]);

  useEffect(() => {
    if (id && role === 'superadmin') fetchCredential();
  }, [id, role]);

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

  const fetchCredential = async () => {
    setCredLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/teachers/${id}/credential`, {
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
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/teachers/${id}/generate-credential`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCredential({ username: res.data.username, password: res.data.password });
      toast.success('Credential generated!');
    } catch {
      toast.error('Failed to generate credential');
    } finally {
      setGeneratingSingle(false);
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
                  {role !== 'executive' && (
                  <>
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
                  </>
                  )}
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

          {/* Portal Credentials - superadmin only */}
          {role === 'superadmin' && (teacher.role === 'Teacher' || teacher.role === 'Principal') && (
            <div className={`rounded-xl shadow-lg border mb-6 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-semibold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Portal Credentials
                  </h3>
                  <div className="flex gap-2">
                    {credential?.username && (
                      <button onClick={async () => {
                        const { default: jsPDF } = await import('jspdf');
                        const { default: autoTable } = await import('jspdf-autotable');
                        const doc = new (jsPDF as any)({ orientation: 'portrait', unit: 'mm', format: 'a5' });
                        const W = doc.internal.pageSize.getWidth();
                        doc.setFillColor(30,58,95); doc.rect(0,0,W,18,'F');
                        doc.setTextColor(255,255,255); doc.setFontSize(11); doc.setFont('helvetica','bold');
                        doc.text('Bluelight Academy', W/2, 9, {align:'center'});
                        doc.setFontSize(7); doc.setFont('helvetica','normal');
                        doc.text('Employee Portal Credential', W/2, 15, {align:'center'});
                        autoTable(doc, {
                          startY: 22,
                          head: [['Field','Value']],
                          body: [['Name', teacher.fullName],['Role', teacher.role],['Username', credential.username || ''],['Password', credential.password || '']],
                          styles: { fontSize: 9, cellPadding: 4 },
                          headStyles: { fillColor: [30,58,95], textColor: 255 },
                          columnStyles: { 0: { cellWidth: 30, fontStyle: 'bold' }, 1: { font: 'courier' } },
                          margin: { left: 10, right: 10 }
                        });
                        doc.save(`credential_${teacher.teacherId}.pdf`);
                        toast.success('PDF downloaded!');
                      }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
                        Download PDF
                      </button>
                    )}
                    <button onClick={handleGenerateCredential} disabled={generatingSingle}
                      className="bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {generatingSingle ? 'Generating...' : 'Regenerate'}
                    </button>
                  </div>
                </div>
                {credLoading ? (
                  <div className="flex items-center gap-2 py-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-rose-600"></div>
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Loading...</span>
                  </div>
                ) : credential?.username ? (
                  <div className={`rounded-xl border p-5 space-y-4 ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-rose-50 border-rose-200'}`}>
                    <div className={`text-xs px-3 py-2 rounded-lg ${theme === 'dark' ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-50 text-yellow-800 border border-yellow-200'}`}>
                      Keep these credentials secure. Share only with the employee.
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-xs font-semibold uppercase tracking-wide mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Username</label>
                        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border font-mono text-sm ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-blue-300' : 'bg-white border-rose-200 text-blue-700'}`}>
                          <span className="font-semibold">{credential.username}</span>
                        </div>
                      </div>
                      <div>
                        <label className={`block text-xs font-semibold uppercase tracking-wide mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Password</label>
                        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border font-mono text-sm ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-green-300' : 'bg-white border-rose-200 text-green-700'}`}>
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
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No credentials generated yet. Click Regenerate to create.</p>
                  </div>
                )}
              </div>
            </div>
          )}

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
