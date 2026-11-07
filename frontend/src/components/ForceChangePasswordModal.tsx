'use client'

import { useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useSettings } from '@/contexts/SettingsContext'
import { LockClosedIcon, EyeIcon, EyeSlashIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'

interface Props {
  user: any
  onSuccess?: () => void
}

export default function ForceChangePasswordModal({ user, onSuccess }: Props) {
  const { theme, getText } = useSettings()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!user || !user.mustChangePassword) return null

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!newPassword || newPassword.length < 6) {
      setError(getText('Password must be at least 6 characters long', 'የይለፍ ቃል ቢያንስ 6 ቁምፊዎች መሆን አለበት'))
      return
    }

    if (newPassword !== confirmPassword) {
      setError(getText('Passwords do not match', 'የይለፍ ቃሎች አይመሳሰሉም'))
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/force-change-password`,
        { newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      // Update cached user object in localStorage
      try {
        const cached = localStorage.getItem('user')
        if (cached) {
          const parsed = JSON.parse(cached)
          parsed.mustChangePassword = false
          localStorage.setItem('user', JSON.stringify(parsed))
        }
      } catch {}

      toast.success(getText('Password changed successfully! Welcome to Bluelight Academy.', 'የይለፍ ቃል በተሳካ ሁኔታ ተቀይሯል! እንኳን ወደ Bluelight Academy በደህና መጡ።'))
      
      if (onSuccess) {
        onSuccess()
      } else {
        window.location.reload()
      }
    } catch (err: any) {
      setError(err.response?.data?.message || getText('Failed to change password. Please try again.', 'የይለፍ ቃል መቀየር አልተሳካም። እባክዎ እንደገና ይሞክሩ።'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div
        className={`w-full max-w-md rounded-2xl shadow-2xl border p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200 ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header Icon */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 shadow-sm">
            <LockClosedIcon className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold">
            {getText('Password Change Required', 'የይለፍ ቃል መቀየር ያስፈልጋል')}
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
            {getText(
              'You are logging in with a temporary password. For security, you must set a new password before accessing your account.',
              'በጊዜያዊ የይለፍ ቃል እየገቡ ነው። ለደህንነትዎ፣ መለያዎን ከመጠቀምዎ በፊት አዲስ የይለፍ ቃል ማዘጋጀት አለብዎት።'
            )}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs sm:text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-gray-600 dark:text-gray-300">
              {getText('New Password', 'አዲስ የይለፍ ቃል')}
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder={getText('At least 6 characters', 'ቢያንስ 6 ቁምፊዎች')}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
                required
                minLength={6}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                {showPass ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-gray-600 dark:text-gray-300">
              {getText('Confirm New Password', 'አዲሱን የይለፍ ቃል ያረጋግጡ')}
            </label>
            <input
              type={showPass ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder={getText('Re-enter new password', 'አዲሱን የይለፍ ቃል እንደገና ያስገቡ')}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
              required
              minLength={6}
            />
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <LockClosedIcon className="w-4 h-4" />
              )}
              <span>{getText('Set New Password & Continue', 'አዲሱን የይለፍ ቃል አዘጋጅና ቀጥል')}</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className={`w-full py-2.5 text-xs font-medium rounded-xl border transition-colors flex items-center justify-center gap-1.5 ${
                theme === 'dark' ? 'border-gray-700 text-gray-400 hover:bg-gray-700/60' : 'border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4 text-red-500" />
              <span>{getText('Log Out Instead', 'ይልቅ ውጣ')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

