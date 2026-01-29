'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { authService } from '@/lib/auth'
import { useSettings } from '@/contexts/SettingsContext'
import NotificationBell from './NotificationBell'
import Image from 'next/image'
import {
  HomeIcon,
  AcademicCapIcon,
  UserGroupIcon,
  CreditCardIcon,
  UserMinusIcon,
  BellIcon,
  ShieldCheckIcon,
  ClipboardDocumentListIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  CogIcon
} from '@heroicons/react/24/outline'
import { Cog6ToothIcon } from '@heroicons/react/24/solid'

interface NavItem {
  name: string
  icon: any
  href: string
}

export default function DashboardLayout({
  children,
  pageTitle,
}: {
  children: React.ReactNode
  pageTitle?: string
}) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { getText } = useSettings()
  const router = useRouter()
  const pathname = usePathname()

  const getNavigationItems = () => [
    { name: getText('Dashboard', 'ዳሽቦርድ'), icon: HomeIcon, href: '/dashboard' },
    { name: getText('Students', 'ተማሪዎች'), icon: AcademicCapIcon, href: '/students' },
    { name: getText('Employees', 'ሰራተኞች'), icon: UserGroupIcon, href: '/employees' },
    { name: getText('Payments', 'ክፍያዎች'), icon: CreditCardIcon, href: '/payments' },
    { name: getText('Inactive Students', 'ያልተነቃ ተማሪዎች'), icon: UserMinusIcon, href: '/inactive-students' },
    { name: getText('Inactive Employees', 'ያልተነቃ ሰራተኞች'), icon: UserMinusIcon, href: '/inactive-employees' },
    { name: getText('Send Notifications', 'ማሳወቂያዎች ላክ'), icon: BellIcon, href: '/notifications' },
    { name: getText('Admins', 'አስተዳዳሪዎች'), icon: ShieldCheckIcon, href: '/admins' },
    { name: getText('Activity Logs', 'እንቅስቃሴ ምዝገባዎች'), icon: ClipboardDocumentListIcon, href: '/activity-logs' },
    { name: getText('My Profile', 'የእኔ መገለጫ'), icon: UserCircleIcon, href: '/profile' },
  ]

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    const fetchUser = async () => {
      try {
        const userData = await authService.getCurrentUser()
        setUser(userData.user)
      } catch (error) {
        localStorage.removeItem('token')
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo and close button */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between h-auto lg:h-16 px-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col lg:flex-row lg:items-center min-w-0 flex-1">
              <Link
                href="/settings"
                className="self-start mb-2 lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-105 active:scale-95"
                title={getText('Settings', 'ቅንብሮች')}
              >
                <Cog6ToothIcon className="h-5 w-5" />
              </Link>
              <div className="flex items-center justify-between w-full lg:w-auto">
                <div className="flex items-center">
                  <Image
                    src="/log.png"
                    alt={getText('Bluelight', 'ብሉላይት')}
                    width={32}
                    height={32}
                    className="mr-2 flex-shrink-0"
                  />
                  <span className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                    {getText('Bluelight', 'ብሉላይት')} SMS
                  </span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="lg:hidden ml-4 p-2 rounded-full bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 text-red-500 hover:text-white dark:text-red-400 dark:hover:text-white hover:bg-red-500 dark:hover:bg-red-600 hover:border-red-500 dark:hover:border-red-600 hover:shadow-md hover:scale-110 active:scale-95 transition-all duration-300 ease-out"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="hidden lg:flex items-center space-x-1 ml-2">
              <Link
                href="/settings"
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-105 active:scale-95"
                title={getText('Settings', 'ቅንብሮች')}
              >
                <Cog6ToothIcon className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* User profile section */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              {user?.profilePhoto ? (
                <img
                  src={user.profilePhoto}
                  alt={user.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
              )}
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                  {user?.role === 'superadmin' ? 'Super Admin' : user?.role}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {getNavigationItems().map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                  pathname === item.href
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-700 dark:border-blue-500'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <item.icon
                  className={`mr-3 h-5 w-5 flex-shrink-0 ${
                    pathname === item.href ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                  }`}
                />
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Logout button */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-2 py-2 text-sm font-medium text-red-600 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5" />
              {getText('Logout', 'ውጣ')}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Top bar */}
        <div className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 lg:hidden z-40">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{pageTitle || getText('Dashboard', 'ዳሽቦርድ')}</h1>
            <div className="w-10" />
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 pt-16 lg:pt-0">
          <NotificationBell />
          {children}
        </main>
      </div>
    </div>
  )
}