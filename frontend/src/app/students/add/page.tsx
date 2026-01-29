'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/DashboardLayout';

import { useSettings } from '@/contexts/SettingsContext';

interface Class {
  _id: string;
  name: string;
  sections?: string[];
}

export default function AddStudentPage() {
  const { language, theme, getText } = useSettings();
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    firstNameAmharic: '',
    middleNameAmharic: '',
    lastNameAmharic: '',
    paymentCode: '',
    gender: '',
    email: '',
    dateOfBirth: '',
    joinedYear: new Date().getFullYear().toString(),
    class: '',
    section: '',
    address: '',
    fatherName: '',
    fatherPhone: '',
    motherName: '',
    motherPhone: '',
    photo: null as File | null
  });

  const [sections] = useState<string[]>(['A', 'B', 'C', 'D']);
  const [classes] = useState<string[]>(['Nursery', 'LKG', 'UKG']);
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const router = useRouter();

  useEffect(() => {}, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, photo: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.middleName || !formData.lastName || !formData.gender) {
      toast.error(getText('⚠️ Please fill in all required fields marked with *', '⚠️ በ * የተመለከቱ አስፈላጊ መስኮች ሁሉንም ይሙሉ'));
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading(getText('💾 Adding new student...', '💾 አዲስ ተማሪ እየተጨመረ ነው...'));
    
    try {
      const token = localStorage.getItem('token');
      const submitData = new FormData();
      
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'photo' && value) {
          submitData.append(key, value);
        } else if (key !== 'photo' && value) {
          submitData.append(key, value.toString());
        }
      });

      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/students`, submitData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.dismiss(loadingToast);
      toast.success(getText('✅ Student added successfully! Redirecting...', '✅ ተማሪ በተሳካ ሁኔታ ተጨምሯል! እየተዛወረ ነው...'));
      
      setTimeout(() => {
        router.push('/students');
      }, 1500);
    } catch (error: any) {
      toast.dismiss(loadingToast);
      const errorMessage = error.response?.data?.message || getText('Failed to add student', 'ተማሪን ማከል አልተሳካም');
      toast.error(`❌ ${errorMessage}. ${getText('Please try again.', 'እባክዎ እንደገና ይሞክሩ።')}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout pageTitle="Add Student">
      <div className={`min-h-screen p-2 sm:p-4 lg:p-8 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-4xl mx-auto">
          <div className={`rounded-lg shadow-sm border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`px-4 sm:px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center gap-3 sm:gap-4">
                <button
                  onClick={() => router.back()}
                  className={`hover:text-gray-900 transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600'}`}
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div>
                  <h1 className={`text-xl sm:text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{getText('Add New Student', 'አዲስ ተማሪ ጨምር')}</h1>
                  <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{getText('Fill in the student information below', 'የተማሪውን መረጃ ከታች ይሙሉ')}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6 sm:space-y-8">
              {/* Photo Upload */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden ${theme === 'dark' ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-50'}`}>
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>4x4 Photo</p>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                <p className={`text-xs sm:text-sm mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{getText('Click to upload photo', 'ፎቶ ለመስቀል ይጫኑ')}</p>
              </div>

              {/* Student Information */}
              <div>
                <h3 className={`text-base sm:text-lg font-semibold mb-3 sm:mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{getText('Student Information', 'የተማሪ መረጃ')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="sm:col-span-2">
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {getText('Payment Code', 'የክፍላ ኮድ')}
                    </label>
                    <input
                      type="text"
                      name="paymentCode"
                      value={formData.paymentCode}
                      onChange={handleInputChange}
                      placeholder={getText('Enter payment code', 'የክፍላ ኮድ ያስገቡ')}
                      className={`w-full px-3 py-2.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {getText('First Name', 'የመጀመሪያ ስም')} *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      className={`w-full px-3 py-2.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {getText('Middle Name (Father Name)', 'የአባት ስም')} *
                    </label>
                    <input
                      type="text"
                      name="middleName"
                      value={formData.middleName}
                      onChange={handleInputChange}
                      required
                      className={`w-full px-3 py-2.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {getText('Last Name', 'የአያት ስም')} *
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                      className={`w-full px-3 py-2.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {getText('Gender', 'ጾታ')} *
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      required
                      className={`w-full px-3 py-2.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                    >
                      <option value="">{getText('Select Gender', 'ጾታ ይመረጡ')}</option>
                      <option value="Male">{getText('Male', 'ወንድ')}</option>
                      <option value="Female">{getText('Female', 'ሴት')}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Amharic Names */}
              <div>
                <h3 className={`text-base sm:text-lg font-semibold mb-3 sm:mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{getText('Names in Amharic', 'በአማርኛ ስሞች')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      የመጀመሪያ ስም
                    </label>
                    <input
                      type="text"
                      name="firstNameAmharic"
                      value={formData.firstNameAmharic}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      የአባት ስም
                    </label>
                    <input
                      type="text"
                      name="middleNameAmharic"
                      value={formData.middleNameAmharic}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      የአያት ስም
                    </label>
                    <input
                      type="text"
                      name="lastNameAmharic"
                      value={formData.lastNameAmharic}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                    />
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div>
                <h3 className={`text-base sm:text-lg font-semibold mb-3 sm:mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{getText('Additional Information', 'ተጨማሪ መረጃ')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {getText('Email', 'ኢሜይል')}
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {getText('Date of Birth', 'የተወልድ ቀን')}
                    </label>
                    <input
                      type="text"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      placeholder="dd/mm/yyyy"
                      className={`w-full px-3 py-2.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {getText('Joined Year', 'የተገባ ዓመት')}
                    </label>
                    <input
                      type="number"
                      name="joinedYear"
                      value={formData.joinedYear}
                      onChange={handleInputChange}
                      placeholder="e.g., 2024"
                      className={`w-full px-3 py-2.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {getText('Class', 'ክፍል')}
                    </label>
                    <select
                      name="class"
                      value={formData.class}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                    >
                      <option value="">{getText('Select Class', 'ክፍል ይመረጡ')}</option>
                      {classes.map((cls) => (
                        <option key={cls} value={cls}>{getText(cls, cls === 'Nursery' ? 'ጀማሪ' : cls === 'LKG' ? 'ደረጃ 1' : cls === 'UKG' ? 'ደረጃ 2' : cls)}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {getText('Section (Optional)', 'ክፍል (አስፈላጊ አይደለም)')}
                    </label>
                    <select
                      name="section"
                      value={formData.section}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                    >
                      <option value="">{getText('Select Section (Optional)', 'ክፍል ይመረጡ (አስፈላጊ አይደለም)')}</option>
                      {sections.map((section) => (
                        <option key={section} value={section}>{getText(`Section ${section}`, `ክፍል ${section === 'A' ? 'አ' : section === 'B' ? 'ለ' : section === 'C' ? 'ሐ' : section === 'D' ? 'መ' : section}`)}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {getText('Address', 'አድራሻ')}
                    </label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows={3}
                      className={`w-full px-3 py-2.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                    />
                  </div>
                </div>
              </div>

              {/* Parent Information */}
              <div>
                <h3 className={`text-base sm:text-lg font-semibold mb-3 sm:mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{getText('Parent Information', 'የወላፃ መረጃ')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {getText('Father Name', 'የአባት ስም')}
                    </label>
                    <input
                      type="text"
                      name="fatherName"
                      value={formData.fatherName}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {getText('Father Phone', 'የአባት ስልክ')}
                    </label>
                    <input
                      type="tel"
                      name="fatherPhone"
                      value={formData.fatherPhone}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {getText('Mother Name', 'የእናት ስም')}
                    </label>
                    <input
                      type="text"
                      name="motherName"
                      value={formData.motherName}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {getText('Mother Phone', 'የእናት ስልክ')}
                    </label>
                    <input
                      type="tel"
                      name="motherPhone"
                      value={formData.motherPhone}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className={`flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-6 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className={`w-full sm:w-auto px-6 py-2.5 sm:py-2 border rounded-lg transition-colors ${theme === 'dark' ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  {getText('Cancel', 'ይሰርዙ')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  {loading ? getText('Adding Student...', 'ተማሪ እየተጨመረ ነው...') : getText('Add Student', 'ተማሪ ጨምር')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}