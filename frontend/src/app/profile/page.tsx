'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { profileService } from '@/lib/auth'
import { User } from '@/types'
import DashboardLayout from '@/components/DashboardLayout'
import { 
  UserCircleIcon, 
  CameraIcon, 
  EyeIcon, 
  EyeSlashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface ProfileFormData {
  name: string
  email: string
  phone: string
  profilePhoto?: FileList
}

interface PasswordFormData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile')
  const [isEditing, setIsEditing] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string>('')
  const router = useRouter()

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors, isSubmitting: isProfileSubmitting },
    setValue,
    watch
  } = useForm<ProfileFormData>()

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting },
    reset: resetPasswordForm,
    watch: watchPassword
  } = useForm<PasswordFormData>()

  const watchedPhoto = watch('profilePhoto')

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await profileService.getProfile()
        const userData = response.user
        setUser(userData)
        
        setValue('name', userData.name)
        setValue('email', userData.email)
        setValue('phone', userData.phone || '')
        setProfilePhotoPreview(userData.profilePhoto || '')
      } catch (error) {
        console.error('Error fetching profile:', error)
        toast.error('Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [setValue])

  useEffect(() => {
    if (watchedPhoto && watchedPhoto[0]) {
      const file = watchedPhoto[0]
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfilePhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }, [watchedPhoto])

  const onSubmitProfile = async (data: ProfileFormData) => {
    try {
      const formData = new FormData()
      formData.append('name', data.name)
      formData.append('email', data.email)
      formData.append('phone', data.phone)
      
      if (!profilePhotoPreview && user?.profilePhoto) {
        formData.append('removePhoto', 'true')
      } else if (data.profilePhoto && data.profilePhoto[0]) {
        formData.append('profilePhoto', data.profilePhoto[0])
      }

      const response = await profileService.updateProfile(formData)
      setUser(response.user)
      setIsEditing(false)
      toast.success('Profile updated successfully!')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update profile')
    }
  }

  const onSubmitPassword = async (data: PasswordFormData) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    try {
      await profileService.changePassword(data.currentPassword, data.newPassword)
      toast.success('Password changed successfully!')
      resetPasswordForm()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to change password')
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    if (user) {
      setValue('name', user.name)
      setValue('email', user.email)
      setValue('phone', user.phone || '')
      setProfilePhotoPreview(user.profilePhoto || '')
    }
  }

  const getRoleDisplay = (role: string) => {
    return role === 'superadmin' ? 'Super Admin' : role.charAt(0).toUpperCase() + role.slice(1)
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'superadmin': return 'bg-purple-100 text-purple-800'
      case 'teacher': return 'bg-blue-100 text-blue-800'
      case 'student': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <DashboardLayout pageTitle="My Profile">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout pageTitle="My Profile">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 sm:px-8 py-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">My Profile</h1>
              <p className="text-blue-100 mt-1 text-sm sm:text-base">Manage your account settings and preferences</p>
            </div>

            <div className="border-b border-gray-200 bg-gray-50">
              <nav className="flex space-x-4 sm:space-x-8 px-4 sm:px-8 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === 'profile'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Profile Information
                </button>
                <button
                  onClick={() => setActiveTab('password')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === 'password'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Security
                </button>
              </nav>
            </div>

            <div className="p-4 sm:p-8">
              {activeTab === 'profile' && (
                <div className="space-y-6 sm:space-y-8">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
                      <div className="relative mx-auto sm:mx-0">
                        {profilePhotoPreview ? (
                          <img
                            src={profilePhotoPreview}
                            alt="Profile"
                            className="h-20 w-20 sm:h-24 sm:w-24 rounded-full object-cover ring-4 ring-blue-100"
                          />
                        ) : (
                          <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center ring-4 ring-blue-100">
                            <UserCircleIcon className="h-12 w-12 sm:h-16 sm:w-16 text-white" />
                          </div>
                        )}
                        {isEditing && (
                          <>
                            <label
                              htmlFor="profilePhoto"
                              className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2 cursor-pointer hover:bg-blue-700 transition-colors shadow-lg"
                            >
                              <CameraIcon className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                              <input
                                id="profilePhoto"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                {...registerProfile('profilePhoto')}
                              />
                            </label>
                            {profilePhotoPreview && (
                              <button
                                type="button"
                                onClick={() => {
                                  setProfilePhotoPreview('')
                                  setValue('profilePhoto', undefined)
                                }}
                                className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 cursor-pointer hover:bg-red-600 transition-colors shadow-lg"
                              >
                                <XMarkIcon className="h-3 w-3 text-white" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                      <div className="text-center sm:text-left">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{user?.name}</h2>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium mt-2 ${getRoleBadgeColor(user?.role || '')}`}>
                          {getRoleDisplay(user?.role || '')}
                        </span>
                      </div>
                    </div>
                    
                    {!isEditing ? (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                      >
                        <PencilIcon className="h-4 w-4 mr-2" />
                        Edit Profile
                      </button>
                    ) : (
                      <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                        <button
                          onClick={handleCancelEdit}
                          className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                        >
                          <XMarkIcon className="h-4 w-4 mr-2" />
                          Cancel
                        </button>
                        <button
                          onClick={handleSubmitProfile(onSubmitProfile)}
                          disabled={isProfileSubmitting}
                          className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <CheckIcon className="h-4 w-4 mr-2" />
                          {isProfileSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Full Name</label>
                      {isEditing ? (
                        <input
                          type="text"
                          {...registerProfile('name', { required: 'Name is required' })}
                          className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      ) : (
                        <p className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900">{user?.name}</p>
                      )}
                      {profileErrors.name && (
                        <p className="text-sm text-red-600">{profileErrors.name.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Email Address</label>
                      {isEditing ? (
                        <input
                          type="email"
                          {...registerProfile('email', { 
                            required: 'Email is required',
                            pattern: {
                              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                              message: 'Invalid email address'
                            }
                          })}
                          className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      ) : (
                        <p className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900">{user?.email}</p>
                      )}
                      {profileErrors.email && (
                        <p className="text-sm text-red-600">{profileErrors.email.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                      {isEditing ? (
                        <input
                          type="tel"
                          {...registerProfile('phone')}
                          className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      ) : (
                        <p className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900">{user?.phone || 'Not provided'}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Role</label>
                      <p className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900">{getRoleDisplay(user?.role || '')}</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'password' && (
                <div className="max-w-md mx-auto">
                  <h3 className="text-lg font-medium text-gray-900 mb-6 text-center sm:text-left">Change Password</h3>
                  <form onSubmit={handleSubmitPassword(onSubmitPassword)} className="space-y-6">
                    <div className="space-y-2">
                      <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          id="currentPassword"
                          {...registerPassword('currentPassword', { required: 'Current password is required' })}
                          className="block w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        >
                          {showCurrentPassword ? (
                            <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                          ) : (
                            <EyeIcon className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                      {passwordErrors.currentPassword && (
                        <p className="text-sm text-red-600">{passwordErrors.currentPassword.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          id="newPassword"
                          {...registerPassword('newPassword', {
                            required: 'New password is required',
                            minLength: { value: 6, message: 'Password must be at least 6 characters' }
                          })}
                          className="block w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? (
                            <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                          ) : (
                            <EyeIcon className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                      {passwordErrors.newPassword && (
                        <p className="text-sm text-red-600">{passwordErrors.newPassword.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          id="confirmPassword"
                          {...registerPassword('confirmPassword', {
                            required: 'Please confirm your password',
                            validate: (value) => {
                              const newPassword = watchPassword('newPassword')
                              return value === newPassword || 'Passwords do not match'
                            }
                          })}
                          className="block w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                          ) : (
                            <EyeIcon className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                      {passwordErrors.confirmPassword && (
                        <p className="text-sm text-red-600">{passwordErrors.confirmPassword.message}</p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isPasswordSubmitting}
                      className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isPasswordSubmitting ? 'Changing Password...' : 'Change Password'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}