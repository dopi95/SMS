'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/DashboardLayout';
import { useSettings } from '@/contexts/SettingsContext';

export default function EditEmployeePage() {
  const { language, theme, getText } = useSettings();
  const router = useRouter();
  const { id } = useParams();
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: '',
    qualification: '',
    qualificationLevel: '',
    experienceYears: '',
    address: '',
    sex: '',
    employmentDate: '',
    employmentType: '',
    teachingClass: '',
    teachingSubject: ''
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [existingPhoto, setExistingPhoto] = useState<string>('');
  const [teacherId, setTeacherId] = useState('');
  const [salaries, setSalaries] = useState<Array<{ year: string; monthlySalary: string }>>([]);
  const [currentYear, setCurrentYear] = useState('');
  const [currentSalary, setCurrentSalary] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const fetchTeacher = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/teachers/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const t = res.data;
        setTeacherId(t.teacherId);
        setFormData({
          fullName: t.fullName || '',
          email: t.email || '',
          phone: t.phone || '',
          role: t.role || '',
          qualification: t.qualification || '',
          qualificationLevel: t.qualificationLevel || '',
          experienceYears: t.experienceYears || '',
          address: t.address || '',
          sex: t.sex || '',
          employmentDate: t.employmentDate ? t.employmentDate.split('T')[0] : '',
          employmentType: t.employmentType || '',
          teachingClass: t.teachingClass || '',
          teachingSubject: t.teachingSubject || ''
        });
        if (t.photo) {
          setExistingPhoto(t.photo);
          setPhotoPreview(t.photo);
        }
        if (t.salaries?.length) {
          setSalaries(t.salaries.map((s: any) => ({ year: s.year, monthlySalary: s.monthlySalary.toString() })));
        }
      } catch {
        toast.error(getText('Failed to load employee', 'ሰራተኛን መጫን አልተሳካም'));
        router.push('/employees');
      } finally {
        setFetching(false);
      }
    };
    fetchTeacher();
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhoto(null);
    setPhotoPreview('');
    setExistingPhoto('');
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const handleAddSalary = () => {
    if (!currentYear || !currentSalary) {
      toast.error(getText('Please select year and enter salary', 'እባክዎ ዓመት ይምረጡ እና ደመወዝ ያስገቡ'));
      return;
    }
    if (salaries.some(s => s.year === currentYear)) {
      toast.error(getText('Salary for this year already exists', 'ለዚህ ዓመት ደመወዝ አስቀድሞ ተጨምሯል'));
      return;
    }
    setSalaries([...salaries, { year: currentYear, monthlySalary: currentSalary }]);
    setCurrentYear('');
    setCurrentSalary('');
  };

  const handleRemoveSalary = (year: string) => {
    setSalaries(salaries.filter(s => s.year !== year));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phone || !formData.role || !formData.sex || !formData.employmentDate || !formData.employmentType) {
      toast.error(getText('Please fill in all required fields', 'እባክዎ ሁሉንም አስፈላጊ መስኮች ይሙሉ'));
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading(getText('Updating employee...', 'ሰራተኛ እየተዘመነ ነው...'));

    try {
      const token = localStorage.getItem('token');
      const fd = new FormData();

      fd.append('fullName', formData.fullName);
      if (formData.email) fd.append('email', formData.email);
      fd.append('phone', formData.phone);
      fd.append('role', formData.role);
      fd.append('sex', formData.sex);
      fd.append('employmentDate', formData.employmentDate);
      fd.append('employmentType', formData.employmentType);
      if (formData.qualification) fd.append('qualification', formData.qualification);
      if (formData.qualificationLevel) fd.append('qualificationLevel', formData.qualificationLevel);
      if (formData.experienceYears) fd.append('experienceYears', formData.experienceYears);
      if (formData.address) fd.append('address', formData.address);
      if (formData.teachingClass) fd.append('teachingClass', formData.teachingClass);
      if (formData.teachingSubject) fd.append('teachingSubject', formData.teachingSubject);
      if (salaries.length > 0) {
        fd.append('salaries', JSON.stringify(salaries.map(s => ({ year: s.year, monthlySalary: parseFloat(s.monthlySalary) }))));
      }
      // If photo removed and no new photo, send empty string to clear it
      if (photo) {
        fd.append('photo', photo);
      } else if (!existingPhoto) {
        fd.append('photo', '');
      }

      await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/teachers/${id}`, fd, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });

      toast.dismiss(loadingToast);
      toast.success(getText('Employee updated successfully!', 'ሰራተኛ በተሳካ ሁኔታ ተዘምኗል!'));
      setTimeout(() => router.push('/employees'), 1500);
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(error.response?.data?.message || getText('Failed to update employee', 'ሰራተኛን ማዘመን አልተሳካም'));
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <DashboardLayout pageTitle={getText('Edit Employee', 'ሰራተኛ አርትዕ')}>
        <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  const inputCls = `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`;
  const labelCls = `block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`;

  return (
    <DashboardLayout pageTitle={getText('Edit Employee', 'ሰራተኛ አርትዕ')}>
      <div className={`min-h-screen p-4 sm:p-6 lg:p-8 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-4xl mx-auto">
          <div className={`rounded-lg shadow-sm border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center gap-4">
                <button onClick={() => router.back()} className={`transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'}`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div>
                  <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{getText('Edit Employee', 'ሰራተኛ አርትዕ')}</h1>
                  <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{teacherId}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Photo */}
              <div>
                <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{getText('Photo', 'ፎቶ')}</h3>
                <div className="flex items-center gap-6">
                  {photoPreview && (
                    <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-300 flex-shrink-0">
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                  <div className="flex-1">
                    <label className={labelCls}>{getText('Upload New Photo', 'አዲስ ፎቶ ይስቀሉ')}</label>
                    <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className={inputCls} />
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div>
                <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{getText('Personal Information', 'የግል መረጃ')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="sm:col-span-2">
                    <label className={labelCls}>{getText('Full Name', 'ሙሉ ስም')} *</label>
                    <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} required className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{getText('Email', 'ኢሜይል')}</label>
                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{getText('Phone', 'ስልክ')} *</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} required className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{getText('Sex', 'ጾታ')} *</label>
                    <select name="sex" value={formData.sex} onChange={handleInputChange} required className={inputCls}>
                      <option value="">{getText('Select', 'ይምረጡ')}</option>
                      <option value="Male">{getText('Male', 'ወንድ')}</option>
                      <option value="Female">{getText('Female', 'ሴት')}</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>{getText('Address', 'አድራሻ')}</label>
                    <textarea name="address" value={formData.address} onChange={handleInputChange} rows={2} className={inputCls} />
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div>
                <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{getText('Professional Information', 'ሙያዊ መረጃ')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className={labelCls}>{getText('Role', 'ሚና')} *</label>
                    <select name="role" value={formData.role} onChange={handleInputChange} required className={inputCls}>
                      <option value="">{getText('Select Role', 'ሚና ይምረጡ')}</option>
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
                  <div>
                    <label className={labelCls}>{getText('Qualification', 'ብቃት')}</label>
                    <input type="text" name="qualification" value={formData.qualification} onChange={handleInputChange} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{getText('Qualification Level', 'የብቃት ደረጃ')}</label>
                    <select name="qualificationLevel" value={formData.qualificationLevel} onChange={handleInputChange} className={inputCls}>
                      <option value="">{getText('Select Level', 'ደረጃ ይምረጡ')}</option>
                      <option value="High School">{getText('High School', 'ሁለተኛ ደረጃ')}</option>
                      <option value="Diploma">{getText('Diploma', 'ዲፕሎማ')}</option>
                      <option value="Bachelor">{getText('Bachelor', 'የመጀመሪያ ዲግሪ')}</option>
                      <option value="Master">{getText('Master', 'ማስተርስ')}</option>
                      <option value="PhD">{getText('PhD', 'ዶክትሬት')}</option>
                      <option value="Other">{getText('Other', 'ሌላ')}</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>{getText('Experience (Years)', 'ልምድ (ዓመታት)')}</label>
                    <input type="number" name="experienceYears" value={formData.experienceYears} onChange={handleInputChange} min="0" className={inputCls} />
                  </div>

                  {formData.role === 'Teacher' && (
                    <>
                      <div>
                        <label className={labelCls}>{getText('Teaching Class', 'የሚያስተምር ክፍል')} *</label>
                        <select name="teachingClass" value={formData.teachingClass} onChange={handleInputChange} required className={inputCls}>
                          <option value="">{getText('Select Class', 'ክፍል ይምረጡ')}</option>
                          <option value="Nursery">{getText('Nursery', 'ነርሰሪ')}</option>
                          <option value="LKG">{getText('LKG', 'ኤልኬጂ')}</option>
                          <option value="UKG">{getText('UKG', 'ዩኬጂ')}</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>{getText('Teaching Subject', 'የሚያስተምር ትምህርት')} *</label>
                        <select name="teachingSubject" value={formData.teachingSubject} onChange={handleInputChange} required className={inputCls}>
                          <option value="">{getText('Select Subject', 'ትምህርት ይምረጡ')}</option>
                          <option value="English">{getText('English', 'እንግሊዝኛ')}</option>
                          <option value="Mathematics">{getText('Mathematics', 'ሂሳብ')}</option>
                          <option value="Science">{getText('Science', 'ሳይንስ')}</option>
                          <option value="Amharic">{getText('Amharic', 'አማርኛ')}</option>
                          <option value="Art">{getText('Art', 'አርት')}</option>
                          <option value="Music">{getText('Music', 'ሙዚቃ')}</option>
                          <option value="Physical Education">{getText('Physical Education', 'የሰውነት ትምህርት')}</option>
                          <option value="General">{getText('General', 'ጠቅላላ')}</option>
                        </select>
                      </div>
                    </>
                  )}

                  <div>
                    <label className={labelCls}>{getText('Employment Date', 'የቅጥር ቀን')} *</label>
                    <input type="date" name="employmentDate" value={formData.employmentDate} onChange={handleInputChange} required className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{getText('Employment Type', 'የቅጥር አይነት')} *</label>
                    <select name="employmentType" value={formData.employmentType} onChange={handleInputChange} required className={inputCls}>
                      <option value="">{getText('Select', 'ይምረጡ')}</option>
                      <option value="Full-time">{getText('Full-time', 'ሙሉ ጊዜ')}</option>
                      <option value="Part-time">{getText('Part-time', 'ከፊል ጊዜ')}</option>
                      <option value="Contract">{getText('Contract', 'ውል')}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Salary Information */}
              <div>
                <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{getText('Salary Information', 'የደመወዝ መረጃ')}</h3>
                <div className={`p-4 rounded-lg mb-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className={labelCls}>{getText('Year', 'ዓመት')}</label>
                      <select value={currentYear} onChange={(e) => setCurrentYear(e.target.value)} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'border-gray-300'}`}>
                        <option value="">{getText('Select Year', 'ዓመት ይምረጡ')}</option>
                        {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(y => (
                          <option key={y} value={y.toString()}>{y}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>{getText('Monthly Salary', 'ወርሃዊ ደመወዝ')}</label>
                      <input type="number" value={currentSalary} onChange={(e) => setCurrentSalary(e.target.value)} min="0" step="0.01" placeholder="0.00" className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'border-gray-300'}`} />
                    </div>
                    <div className="flex items-end">
                      <button type="button" onClick={handleAddSalary} className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        {getText('Add', 'ጨምር')}
                      </button>
                    </div>
                  </div>
                </div>
                {salaries.length > 0 && (
                  <div className="space-y-2">
                    {salaries.map((salary) => (
                      <div key={salary.year} className={`flex items-center justify-between p-3 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-center gap-4">
                          <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{getText('Year', 'ዓመት')}: {salary.year}</span>
                          <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>{getText('Salary', 'ደመወዝ')}: {parseFloat(salary.monthlySalary).toLocaleString()} {getText('Birr/month', 'ብር/ወር')}</span>
                        </div>
                        <button type="button" onClick={() => handleRemoveSalary(salary.year)} className="text-red-500 hover:text-red-700 transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className={`flex flex-col sm:flex-row justify-end gap-4 pt-6 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <button type="button" onClick={() => router.back()} className={`w-full sm:w-auto px-6 py-2 border rounded-lg transition-colors ${theme === 'dark' ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                  {getText('Cancel', 'ሰርዝ')}
                </button>
                <button type="submit" disabled={loading} className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                  {loading ? getText('Saving...', 'እየተቀመጠ ነው...') : getText('Save Changes', 'ለውጦችን አስቀምጥ')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
