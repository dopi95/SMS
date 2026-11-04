'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import Select from '@/components/Select'
import { useSettings } from '@/contexts/SettingsContext'
import { usePermissions } from '@/contexts/PermissionsContext'
import axios from 'axios'
import { 
  LanguageIcon,
  SunIcon,
  ArrowDownTrayIcon,
  ArrowUpOnSquareIcon,
  PlusIcon,
  CheckCircleIcon,
  DevicePhoneMobileIcon,
  InformationCircleIcon,
  BanknotesIcon,
  TrashIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import {
  ETHIOPIAN_ACADEMIC_MONTHS,
  getCurrentEthiopianAcademicMonth,
  getCurrentEthiopianYear
} from '@/utils/dateUtils'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface FeeSetting {
  _id: string
  year: number
  month: string
  monthlyFee: number
  penaltyFee: number
  penaltyDay: number
  createdAt?: string
  updatedAt?: string
}

export default function SettingsPage() {
  const { language, theme, setLanguage, setTheme, getText } = useSettings()
  const { role, user } = usePermissions()
  const isSuperAdmin = role === 'superadmin' || user?.role === 'superadmin'

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)

  // Fee Settings state (Superadmin only)
  const currentEcYear = getCurrentEthiopianYear()
  const currentEcMonth = getCurrentEthiopianAcademicMonth()
  const [feeSettings, setFeeSettings] = useState<FeeSetting[]>([])
  const [loadingFeeSettings, setLoadingFeeSettings] = useState(false)
  const [savingFee, setSavingFee] = useState(false)

  const [formYear, setFormYear] = useState<number>(currentEcYear)
  const [formMonth, setFormMonth] = useState<string>(currentEcMonth)
  const [formMonthlyFee, setFormMonthlyFee] = useState<string>('4000')
  const [formPenaltyFee, setFormPenaltyFee] = useState<string>('20')
  const [formPenaltyDay, setFormPenaltyDay] = useState<string>('10')
  const [editingId, setEditingId] = useState<string | null>(null)

  const availableYears = [
    currentEcYear - 1,
    currentEcYear,
    currentEcYear + 1,
    currentEcYear + 2,
    currentEcYear + 3
  ]

  useEffect(() => {
    // Check if app is already running as installed standalone PWA
    const checkInstalled = () => {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true
      setIsInstalled(isStandalone)
    }

    checkInstalled()

    // Detect iOS (iPhone/iPad/iPod)
    const ua = window.navigator.userAgent.toLowerCase()
    const ios =
      /iphone|ipad|ipod/.test(ua) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)
    setIsIOS(ios)

    // Listen for Chromium beforeinstallprompt event (Android/Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
      toast.success(getText('App installed successfully!', 'መተግበሪያው በተሳካ ሁኔታ ተጭኗል!'))
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [getText])

  // Load fee settings for superadmin
  useEffect(() => {
    if (isSuperAdmin) {
      fetchFeeSettings()
    }
  }, [isSuperAdmin])

  const fetchFeeSettings = async () => {
    setLoadingFeeSettings(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/fee-settings`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setFeeSettings(res.data || [])
    } catch (error) {
      console.error('Failed to load fee settings:', error)
    } finally {
      setLoadingFeeSettings(false)
    }
  }

  const handleSaveFeeSetting = async (e: React.FormEvent) => {
    e.preventDefault()
    const monthly = Number(formMonthlyFee)
    const penalty = Number(formPenaltyFee)
    const penaltyDayNum = Number(formPenaltyDay)

    if (isNaN(monthly) || monthly < 0) {
      toast.error(getText('Please enter a valid monthly fee', 'እባክዎ ትክክለኛ ወርሃዊ ክፍያ ያስገቡ'))
      return
    }
    if (isNaN(penalty) || penalty < 0) {
      toast.error(getText('Please enter a valid penalty fee', 'እባክዎ ትክክለኛ የቅጣት ክፍያ ያስገቡ'))
      return
    }
    if (isNaN(penaltyDayNum) || penaltyDayNum < 1 || penaltyDayNum > 30) {
      toast.error(getText('Penalty day must be between 1 and 30', 'የቅጣት መጀመሪያ ቀን ከ1 እስከ 30 መሆን አለበት'))
      return
    }

    setSavingFee(true)
    try {
      const token = localStorage.getItem('token')
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/fee-settings`,
        {
          year: Number(formYear),
          month: formMonth,
          monthlyFee: monthly,
          penaltyFee: penalty,
          penaltyDay: penaltyDayNum
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      toast.success(
        getText(
          'Monthly fee setting saved successfully!',
          'የወርሃዊ ክፍያ ቅንብር በተሳካ ሁኔታ ተቀምጧል!'
        )
      )
      setEditingId(null)
      await fetchFeeSettings()
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          getText('Failed to save fee setting', 'የክፍያ ቅንብሩን ማስቀመጥ አልተሳካም')
      )
    } finally {
      setSavingFee(false)
    }
  }

  const handleDeleteFeeSetting = async (id: string, label: string) => {
    if (
      !confirm(
        getText(
          `Are you sure you want to delete fee setting for ${label}?`,
          `የ${label}ን የክፍያ ቅንብር መሰረዝ እርግጠኛ ነዎት?`
        )
      )
    ) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/fee-settings/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success(getText('Fee setting deleted!', 'የክፍያ ቅንብር ተሰርዟል!'))
      if (editingId === id) {
        setEditingId(null)
      }
      await fetchFeeSettings()
    } catch (err: any) {
      toast.error(err.response?.data?.message || getText('Failed to delete', 'መሰረዝ አልተሳካም'))
    }
  }

  const handleStartEdit = (setting: FeeSetting) => {
    setEditingId(setting._id)
    setFormYear(setting.year)
    setFormMonth(setting.month)
    setFormMonthlyFee(String(setting.monthlyFee))
    setFormPenaltyFee(String(setting.penaltyFee))
    setFormPenaltyDay(String(setting.penaltyDay))

    const monthMeta = ETHIOPIAN_ACADEMIC_MONTHS.find(m => m.value === setting.month)
    const monthLabel = monthMeta ? (language === 'am' ? monthMeta.am : monthMeta.en) : setting.month
    toast(
      getText(
        `Editing fee setting for ${monthLabel} ${setting.year}`,
        `የ${monthLabel} ${setting.year} የክፍያ ቅንብር በማረም ላይ`
      ),
      { icon: '✏️' }
    )
  }

  const handleCancelEdit = () => {
    setEditingId(null)
  }

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage)
    toast.success(newLanguage === 'en' ? 'Language changed to English' : 'ቋንቋ ወደ አማርኛ ተቀይሯል')
  }

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme)
    toast.success(`Theme changed to ${newTheme} mode`)
  }

  const handleInstallApp = async () => {
    if (!deferredPrompt) {
      toast(
        getText(
          'Open your browser menu (⋮) and tap "Install app" or "Add to Home screen".',
          'የአሳሽዎን ሜኑ (⋮) በመክፈት "Install app" ወይም "Add to Home screen" የሚለውን ይምረጡ።'
        ),
        { icon: 'ℹ️' }
      )
      return
    }

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        toast.success(getText('App installed successfully!', 'መተግበሪያው በተሳካ ሁኔታ ተጭኗል!'))
        setIsInstalled(true)
      }

      setDeferredPrompt(null)
      setIsInstallable(false)
    } catch (error) {
      console.error('Error during app installation:', error)
    }
  }

  const languageOptions = [
    {
      value: 'en',
      label: 'English',
      icon: '/uk-flag.png',
      description: 'Default language'
    },
    {
      value: 'am',
      label: 'አማርኛ',
      icon: '/et-flag.png',
      description: 'Amharic'
    }
  ]

  const themeOptions = [
    {
      value: 'light',
      label: getText('Light', 'ብሩህ'),
      description: getText('Light theme', 'ብሩህ ገጽታ')
    },
    {
      value: 'dark',
      label: getText('Dark', 'ጨለማ'),
      description: getText('Dark theme', 'ጨለማ ገጽታ')
    }
  ]

  return (
    <DashboardLayout pageTitle={getText('Settings', 'ቅንብሮች')}>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* General Preferences Card */}
          <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 sm:px-8 py-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                {getText('Settings', 'ቅንብሮች')}
              </h1>
              <p className="text-blue-100 mt-1 text-sm sm:text-base">
                {getText('Customize your app preferences', 'የመተግበሪያ ምርጫዎችዎን ያበጁ')}
              </p>
            </div>

            <div className="p-4 sm:p-8 space-y-8">
              {/* Language */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <LanguageIcon className="h-6 w-6 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {getText('Language', 'ቋንቋ')}
                  </h2>
                </div>
                
                <div className="max-w-md">
                  <Select
                    options={languageOptions}
                    value={language}
                    onChange={handleLanguageChange}
                    placeholder={getText('Select language', 'ቋንቋ ይምረጡ')}
                  />
                </div>
              </div>

              {/* Appearance */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <SunIcon className="h-6 w-6 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {getText('Appearance', 'መልክ')}
                  </h2>
                </div>
                
                <div className="max-w-md">
                  <Select
                    options={themeOptions}
                    value={theme}
                    onChange={handleThemeChange}
                    placeholder={getText('Select theme', 'ገጽታ ይምረጡ')}
                  />
                </div>
              </div>

              {/* Install App */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <ArrowDownTrayIcon className="h-6 w-6 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {getText('Install App', 'መተግበሪያ ጫን')}
                  </h2>
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-900/40">
                  <div className="flex items-start space-x-4">
                    <ArrowDownTrayIcon className="h-8 w-8 text-blue-600 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                          {getText('Install Bluelight SMS', 'ብሉላይት SMS ጫን')}
                        </h3>
                        {isInstalled && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                            <CheckCircleIcon className="w-4 h-4 mr-1 text-green-600 dark:text-green-400" />
                            {getText('Installed', 'ተጭኗል')}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                        {getText(
                          'Install this app on your device for quick access, full-screen view, and offline functionality.',
                          'ለፈጣን መዳረሻ፣ ለሙሉ ስክሪን እይታ እና ከመስመር ውጭ አገልግሎት ይህን መተግበሪያ በመሳሪያዎ ላይ ይጫኑ።'
                        )}
                      </p>

                      {isInstalled ? (
                        <div className="inline-flex items-center px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium shadow-sm">
                          <CheckCircleIcon className="h-5 w-5 mr-2" />
                          {getText('Already Installed on This Device', 'በዚህ መሳሪያ ላይ አስቀድሞ ተጭኗል')}
                        </div>
                      ) : isIOS ? (
                        <div className="space-y-4">
                          <button
                            type="button"
                            onClick={() => setShowIOSInstructions((prev) => !prev)}
                            className="inline-flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                          >
                            <DevicePhoneMobileIcon className="h-5 w-5 mr-2" />
                            {showIOSInstructions
                              ? getText('Hide Install Instructions', 'የመጫኛ መመሪያውን ደብቅ')
                              : getText('How to Install on iPhone', 'በiPhone ላይ እንዴት እንደሚጫን')}
                          </button>

                          <div className={`transition-all duration-300 ${showIOSInstructions ? 'block' : 'block sm:block'}`}>
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 border border-blue-200 dark:border-blue-800/60 shadow-sm space-y-3">
                              <div className="flex items-center text-sm font-semibold text-blue-700 dark:text-blue-300">
                                <InformationCircleIcon className="h-5 w-5 mr-1.5 flex-shrink-0" />
                                {getText('Steps to Install on iPhone / iPad (Safari):', 'በiPhone / iPad (Safari) ላይ የመጫን ቅደም ተከተል፡')}
                              </div>

                              <ol className="text-sm text-gray-700 dark:text-gray-300 space-y-2.5 pl-1">
                                <li className="flex items-start">
                                  <span className="flex items-center justify-center bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold rounded-full h-5 w-5 text-xs mr-2.5 mt-0.5 flex-shrink-0">
                                    1
                                  </span>
                                  <span>
                                    {getText('Open this website in ', 'ይህንን ድረ-ገጽ በ')}
                                    <strong className="text-gray-900 dark:text-white">Safari</strong>
                                    {getText(', then tap the ', ' ይክፈቱ፣ ከዚያ ከታች ያለውን ')}
                                    <strong className="text-gray-900 dark:text-white">
                                      {getText('Share button', 'የማጋሪያ (Share) ምልክት')}
                                    </strong>
                                    {' '}
                                    <ArrowUpOnSquareIcon className="h-4 w-4 inline text-blue-600 dark:text-blue-400 align-text-bottom mx-1" />
                                    {getText('at the bottom of your screen.', 'ይጫኑ።')}
                                  </span>
                                </li>
                                <li className="flex items-start">
                                  <span className="flex items-center justify-center bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold rounded-full h-5 w-5 text-xs mr-2.5 mt-0.5 flex-shrink-0">
                                    2
                                  </span>
                                  <span>
                                    {getText('Scroll down the menu and tap ', 'ወደ ታች ዝቅ ብለው ')}
                                    <strong className="text-gray-900 dark:text-white">
                                      {getText('"Add to Home Screen"', '"ወደ መነሻ ገጽ አክል" (Add to Home Screen)')}
                                    </strong>
                                    {' '}
                                    <PlusIcon className="h-4 w-4 inline text-blue-600 dark:text-blue-400 align-text-bottom mx-1" />
                                    {getText('.', ' የሚለውን ይምረጡ።')}
                                  </span>
                                </li>
                                <li className="flex items-start">
                                  <span className="flex items-center justify-center bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold rounded-full h-5 w-5 text-xs mr-2.5 mt-0.5 flex-shrink-0">
                                    3
                                  </span>
                                  <span>
                                    {getText('Tap ', 'ከላይ በቀኝ በኩል ')}
                                    <strong className="text-gray-900 dark:text-white">
                                      {getText('"Add"', '"አክል" (Add)')}
                                    </strong>
                                    {getText(
                                      ' in the top-right corner to complete installation.',
                                      ' የሚለውን በመንካት መጫኑን ያጠናቅቁ።'
                                    )}
                                  </span>
                                </li>
                              </ol>

                              <p className="text-xs text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-gray-700">
                                {getText(
                                  'Note: Apple iOS requires installing web apps through the Safari Share menu.',
                                  'ማስታወሻ፡ በአይፎን (iOS) ላይ ዌብ አፖችን ለመጫን በSafari የማጋሪያ (Share) ሜኑ በኩል ማከል ያስፈልጋል።'
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <button
                            type="button"
                            onClick={handleInstallApp}
                            className="inline-flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                          >
                            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                            {isInstallable
                              ? getText('Install Now', 'አሁን ጫን')
                              : getText('Install App', 'መተግበሪያ ጫን')}
                          </button>
                          {!isInstallable && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {getText(
                                'If the prompt does not open, tap your browser menu (⋮) and select "Install app" or "Add to Home screen".',
                                'የመጫኛ ምርጫው በቀጥታ ካልመጣ፣ የአሳሽዎን ሜኑ (⋮) በመክፈት "Install app" ወይም "Add to Home screen" የሚለውን ይምረጡ።'
                              )}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Superadmin Only: Monthly Fee & Penalty Configuration */}
          {isSuperAdmin && (
            <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl overflow-hidden border border-emerald-200 dark:border-emerald-800/40">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-4 sm:px-8 py-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <BanknotesIcon className="h-8 w-8 text-emerald-100" />
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-white">
                        {getText('Monthly Fee & Penalty Settings', 'የወርሃዊ ክፍያ እና የቅጣት ቅንብሮች')}
                      </h2>
                      <p className="text-emerald-100 text-xs sm:text-sm mt-0.5">
                        {getText(
                          'Configure base monthly fee and daily penalty rate per Ethiopian month (Superadmin Access Only)',
                          'ለእያንዳንዱ የኢትዮጵያ ወር ወርሃዊ ክፍያ እና የቀን ቅጣት መጠን ያዘጋጁ (ለሱፐርአድሚን ብቻ የተፈቀደ)'
                        )}
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-800/80 text-emerald-100 border border-emerald-400/40">
                    🔒 {getText('Superadmin Only', 'ሱፐርአድሚን ብቻ')}
                  </span>
                </div>
              </div>

              <div className="p-4 sm:p-8 space-y-8">
                {/* Configuration Form */}
                <form onSubmit={handleSaveFeeSetting} className="space-y-6 bg-emerald-50/50 dark:bg-emerald-950/20 p-5 sm:p-6 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                  <div className="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-800 pb-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <span>{editingId ? '✏️' : '➕'}</span>
                      {editingId
                        ? getText('Edit Monthly Fee Setting', 'የተመረጠውን ወርሃዊ ክፍያ ማረም')
                        : getText('Add / Update Monthly Fee Setting', 'አዲስ ወርሃዊ ክፍያና ቅጣት ማዋቀር')}
                    </h3>
                    {editingId && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline font-medium"
                      >
                        {getText('Cancel Edit', 'ማረምን ሰርዝ')}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Ethiopian Year */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">
                        {getText('Ethiopian Year', 'ዓመተ ምህረት')}
                      </label>
                      <select
                        value={formYear}
                        onChange={(e) => setFormYear(Number(e.target.value))}
                        className="w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                      >
                        {availableYears.map(y => (
                          <option key={y} value={y}>
                            {y} {language === 'am' ? 'ዓ.ም' : 'E.C'} {y === currentEcYear ? '• Current' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Ethiopian Month */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">
                        {getText('Ethiopian Month', 'የኢትዮጵያ ወር')}
                      </label>
                      <select
                        value={formMonth}
                        onChange={(e) => setFormMonth(e.target.value)}
                        className="w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                      >
                        {ETHIOPIAN_ACADEMIC_MONTHS.map(m => (
                          <option key={m.value} value={m.value}>
                            {language === 'am' ? `${m.am} (${m.en})` : `${m.en} (${m.am})`}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Monthly Base Fee */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">
                        {getText('Monthly Fee (ETB)', 'ወርሃዊ ክፍያ (ብር)')}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          required
                          value={formMonthlyFee}
                          onChange={(e) => setFormMonthlyFee(e.target.value)}
                          placeholder="e.g. 4000"
                          className="w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 text-sm font-semibold"
                        />
                      </div>
                    </div>

                    {/* Apply After Day */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">
                        {getText('Penalty After Day', 'ቅጣት ከስንት ቀን በኋላ')}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max="30"
                          required
                          value={formPenaltyDay}
                          onChange={(e) => setFormPenaltyDay(e.target.value)}
                          placeholder="e.g. 10"
                          className="w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 text-sm font-semibold"
                        />
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                        {getText('Accrues after this day', 'ከዚህ ቀን በኋላ ይቆጥራል')}
                      </p>
                    </div>

                    {/* Daily Penalty Fee */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">
                        {getText('Penalty (ETB/day)', 'የቀን ቅጣት (ብር/ቀን)')}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          required
                          value={formPenaltyFee}
                          onChange={(e) => setFormPenaltyFee(e.target.value)}
                          placeholder="e.g. 20"
                          className="w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 text-sm font-semibold"
                        />
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                        {getText('Added every single day', 'በየቀኑ የሚጨመር')}
                      </p>
                    </div>
                  </div>

                  {/* Summary preview & Submit */}
                  <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-emerald-200 dark:border-emerald-800">
                    <div className="text-xs text-emerald-800 dark:text-emerald-300">
                      💡 <strong>{getText('Formula', 'ስሌት')}:</strong>{' '}
                      {getText(
                        `Base fee ${Number(formMonthlyFee) || 0} ETB. If unpaid after day ${Number(formPenaltyDay) || 10} of that month, penalty increases by ${Number(formPenaltyFee) || 0} ETB every day continuously until paid.`,
                        `መደበኛ ክፍያ ${Number(formMonthlyFee) || 0} ብር። በወሩ ከ${Number(formPenaltyDay) || 10}ኛው ቀን በኋላ ካልተከፈለ፣ እስኪከፈል ድረስ በየቀኑ ${Number(formPenaltyFee) || 0} ብር እየተጨመረ ያለማቋረጥ ይቆጥራል።`
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={savingFee}
                      className="inline-flex items-center px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm disabled:opacity-60 whitespace-nowrap self-end sm:self-auto"
                    >
                      {savingFee ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                          {getText('Saving...', 'እየመዘገበ ነው...')}
                        </span>
                      ) : (
                        <span>
                          {editingId
                            ? getText('Update Fee Setting', 'ቅንብሩን አድስ')
                            : getText('Save Fee Setting', 'ቅንብሩን መዝግብ')}
                        </span>
                      )}
                    </button>
                  </div>
                </form>

                {/* Configured Settings List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {getText('Configured Monthly Fees & Penalties', 'የተመዘገቡ ወርሃዊ ክፍያዎችና ቅጣቶች')}
                    </h3>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 font-medium">
                      {feeSettings.length} {getText('configured', 'ተዋቅሯል')}
                    </span>
                  </div>

                  {loadingFeeSettings ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-emerald-600"></div>
                    </div>
                  ) : feeSettings.length === 0 ? (
                    <div className="p-8 text-center rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-sm">
                      {getText(
                        'No monthly fee settings configured yet. Use the form above to add a monthly fee and penalty rule.',
                        'እስካሁን ምንም ወርሃዊ ክፍያ ቅንብር አልተመዘገበም። ከላይ ያለውን ቅጽ በመጠቀም ወርሃዊ ክፍያ እና የቅጣት ደንብ ያስገቡ።'
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800/80">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                              {getText('Year & Month', 'ዓመት እና ወር')}
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                              {getText('Monthly Fee', 'ወርሃዊ ክፍያ')}
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                              {getText('Penalty Applies After', 'ቅጣት የሚጀምረው')}
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                              {getText('Daily Penalty Rate', 'የቀን ቅጣት መጠን')}
                            </th>
                            <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">
                              {getText('Actions', 'እርምጃዎች')}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                          {feeSettings.map((setting) => {
                            const monthMeta = ETHIOPIAN_ACADEMIC_MONTHS.find(m => m.value === setting.month)
                            const monthName = monthMeta
                              ? (language === 'am' ? `${monthMeta.am} (${monthMeta.en})` : `${monthMeta.en} (${monthMeta.am})`)
                              : setting.month

                            return (
                              <tr key={setting._id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                  <div className="flex items-center gap-2">
                                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                                    <span>{monthName}</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {setting.year} {language === 'am' ? 'ዓ.ም' : 'E.C'}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-gray-900 dark:text-white font-semibold">
                                  {setting.monthlyFee.toLocaleString()} ETB
                                </td>
                                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                    {getText(`After Day ${setting.penaltyDay}`, `ከቀን ${setting.penaltyDay} በኋላ`)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-rose-600 dark:text-rose-400 font-semibold">
                                  +{setting.penaltyFee.toLocaleString()} {getText('ETB/day', 'ብር/ቀን')}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleStartEdit(setting)}
                                      className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                                      title={getText('Edit', 'አርትዕ')}
                                    >
                                      <PencilSquareIcon className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteFeeSetting(setting._id, `${setting.month} ${setting.year}`)}
                                      className="p-1.5 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                      title={getText('Delete', 'ሰርዝ')}
                                    >
                                      <TrashIcon className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
