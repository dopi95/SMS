'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import Select from '@/components/Select'
import { useSettings } from '@/contexts/SettingsContext'
import { 
  LanguageIcon,
  SunIcon,
  ArrowDownTrayIcon
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

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage)
    toast.success(newLanguage === 'en' ? 'Language changed to English' : 'ቋንቋ ወደ አማርኛ ተቀይሯል')
  }

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme)
    toast.success(`Theme changed to ${newTheme} mode`)
  }

  const handleInstallApp = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      toast.success('App installed successfully!')
    }
    
    setDeferredPrompt(null)
    setIsInstallable(false)
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
                
                <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
                  <div className="flex items-start space-x-4">
                    <ArrowDownTrayIcon className="h-8 w-8 text-blue-600 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                        {getText('Install Bluelight SMS', 'ብሉላይት SMS ጫን')}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                        {getText(
                          'Install this app on your device for quick access and offline functionality.',
                          'ለፈጣን መዳረሻ እና ከመስመር ውጭ ተግባር ይህን መተግበሪያ በመሳሪያዎ ላይ ይጫኑ።'
                        )}
                      </p>
                      <button
                        onClick={handleInstallApp}
                        disabled={!isInstallable}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                        {isInstallable ? getText('Install Now', 'አሁን ጫን') : getText('Already Installed', 'አስቀድሞ ተጫኗል')}
                      </button>
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