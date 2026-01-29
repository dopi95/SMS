'use client'

import DashboardLayout from '@/components/DashboardLayout'
import { useSettings } from '@/contexts/SettingsContext'
import {
  AcademicCapIcon,
  UserGroupIcon,
  CreditCardIcon,
  BellIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline'

export default function Dashboard() {
  const { getText } = useSettings()

  return (
    <DashboardLayout pageTitle={getText('Dashboard', 'ዳሽቦርድ')}>
      <div className="p-4 lg:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white lg:text-3xl">
              {getText('Welcome back!', 'እንኳን ደህና መጡ!')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {getText("Here's what's happening at Bluelight today.", 'ዛሬ በብሉላይት ምን እየተከሰተ እንዳለ ይህ ነው።')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <AcademicCapIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {getText('Total Students', 'ጠቅላላ ተማሪዎች')}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">1,234</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <UserGroupIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {getText('Total Employees', 'ጠቅላላ ሰራተኞች')}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">89</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                  <CreditCardIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {getText('Pending Payments', 'በመጠባበቅ ላይ ያሉ ክፍያዎች')}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">45</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                  <BellIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {getText('Notifications', 'ማሳወቂያዎች')}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">12</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {getText('Quick Actions', 'ፈጣን እርምጃዎች')}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button className="p-4 text-center rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <AcademicCapIcon className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {getText('Add Student', 'ተማሪ ጨምር')}
                </span>
              </button>
              <button className="p-4 text-center rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <UserGroupIcon className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {getText('Add Employee', 'ሰራተኛ ጨምር')}
                </span>
              </button>
              <button className="p-4 text-center rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <BellIcon className="h-8 w-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {getText('Send Notice', 'ማሳወቂያ ላክ')}
                </span>
              </button>
              <button className="p-4 text-center rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <ClipboardDocumentListIcon className="h-8 w-8 text-orange-600 dark:text-orange-400 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {getText('View Reports', 'ሪፖርቶች ይመልከቱ')}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}