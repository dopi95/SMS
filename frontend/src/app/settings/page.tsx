'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import Select from '@/components/Select'
import { useSettings } from '@/contexts/SettingsContext'
import { 
  LanguageIcon,
  SunIcon,
  ArrowDownTrayIcon,
  ArrowUpOnSquareIcon,
  PlusIcon,
  CheckCircleIcon,
  DevicePhoneMobileIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function SettingsPage() {
  const { language, theme, setLanguage, setTheme, getText } = useSettings()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)

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
        <div className="max-w-4xl mx-auto">
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

                      {/* State 1: App is already installed (standalone mode) */}
                      {isInstalled ? (
                        <div className="inline-flex items-center px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium shadow-sm">
                          <CheckCircleIcon className="h-5 w-5 mr-2" />
                          {getText('Already Installed on This Device', 'በዚህ መሳሪያ ላይ አስቀድሞ ተጭኗል')}
                        </div>
                      ) : isIOS ? (
                        /* State 2: iOS Device (iPhone / iPad) */
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

                          {/* iOS Step-by-Step Instructions Card */}
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
                                    {getText(
                                      ', then tap the ',
                                      ' ይክፈቱ፣ ከዚያ ከታች ያለውን '
                                    )}
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
                        /* State 3: Android / Windows / Mac Chrome / Edge */
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
        </div>
      </div>
    </DashboardLayout>
  )
}