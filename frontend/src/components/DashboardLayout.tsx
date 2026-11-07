'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import NotificationBell from './NotificationBell'
import ForceChangePasswordModal from './ForceChangePasswordModal'
import Image from 'next/image'
import { useSettings } from '@/contexts/SettingsContext'
import { usePermissions } from '@/contexts/PermissionsContext'
import {
  HomeIcon,
  AcademicCapIcon,
  UserGroupIcon,
  CreditCardIcon,
  BanknotesIcon,
  BellIcon,
  ShieldCheckIcon,
  ClipboardDocumentListIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  CogIcon,
  BriefcaseIcon,
  ReceiptPercentIcon,
  ChatBubbleLeftRightIcon,
  MegaphoneIcon,
  AdjustmentsHorizontalIcon,
  BuildingLibraryIcon,
  ClockIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import { Cog6ToothIcon } from '@heroicons/react/24/solid'

interface NavSingleLink {
  type: 'link'
  id: string
  name: string
  icon: any
  href: string
  page: string
}

interface NavChildItem {
  id: string
  name: string
  icon: any
  href: string
  page: string
}

interface NavGroup {
  type: 'group'
  id: string
  name: string
  icon: any
  children: NavChildItem[]
}

type NavItem = NavSingleLink | NavGroup

export default function DashboardLayout({
  children,
  pageTitle,
  hideBell,
}: {
  children: React.ReactNode
  pageTitle?: string
  hideBell?: boolean
}) {
  const { language, theme, getText } = useSettings()
  const { canAccess, role, loading: permLoading, user } = usePermissions()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const isSuperAdmin = role === 'superadmin'

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => (prev[groupId] ? {} : { [groupId]: true }))
  }

  const isHrefActive = (href: string) => {
    if (href.includes('?settings=true')) {
      if (typeof window !== 'undefined') {
        return pathname === '/bank-reports' && window.location.search.includes('settings=true')
      }
      return false
    }
    if (href === '/bank-reports') {
      if (typeof window !== 'undefined' && window.location.search.includes('settings=true')) {
        return false
      }
      return pathname.startsWith('/bank-reports')
    }
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    if (href === '/payments') {
      return pathname === '/payments'
    }
    if (href === '/payments/custom') {
      return pathname.startsWith('/payments/custom')
    }
    if (href === '/students') {
      return pathname.startsWith('/students') || pathname === '/pending-students' || pathname === '/inactive-students'
    }
    if (href === '/employees') {
      return pathname.startsWith('/employees') || pathname === '/pending-employees' || pathname === '/employeesform'
    }
    if (href === '/admins') {
      return pathname.startsWith('/admins')
    }
    if (href === '/notifications') {
      return pathname.startsWith('/notifications')
    }
    if (href === '/notice') {
      return pathname.startsWith('/notice')
    }
    if (href === '/settings') {
      return pathname.startsWith('/settings')
    }
    if (href === '/activity-logs') {
      return pathname.startsWith('/activity-logs')
    }
    if (href === '/profile') {
      return pathname.startsWith('/profile')
    }
    return pathname === href
  }

  const isChildPermitted = (child: NavChildItem) => {
    if (isSuperAdmin) return true
    if (child.id === 'system-settings') {
      return canAccess('settings')
    }
    if (child.id === 'bank-settings') {
      return canAccess('bank-settings')
    }
    if (child.id === 'custom-payments') {
      return canAccess('custom-payment') || canAccess('payments')
    }
    if (child.id === 'portal-notifications') {
      return canAccess('notice') || canAccess('notifications')
    }
    return canAccess(child.page)
  }

  const isLinkPermitted = (item: NavSingleLink) => {
    if (isSuperAdmin) return true
    if (item.id === 'profile') return true
    return canAccess(item.page)
  }

  // 1. Dashboard
  // 2. Users (Students, Employees, Admins)
  // 3. Payments (Monthly Payments, Custom Payments, Transaction Reports)
  // 4. Notifications (SMS Notifications, Portal Notifications)
  // 5. Settings (System Settings, Bank Settings)
  // 6. Activity Log
  // 7. My Profile
  const rawNavItems: NavItem[] = [
    {
      type: 'link',
      id: 'dashboard',
      name: getText('Dashboard', 'ዳሽቦርድ'),
      icon: HomeIcon,
      href: '/dashboard',
      page: 'dashboard',
    },
    {
      type: 'group',
      id: 'users',
      name: getText('Users', 'ተጠቃሚዎች'),
      icon: UserGroupIcon,
      children: [
        {
          id: 'students',
          name: getText('Students', 'ተማሪዎች'),
          icon: AcademicCapIcon,
          href: '/students',
          page: 'students',
        },
        {
          id: 'employees',
          name: getText('Employees', 'ሰራተኞች'),
          icon: BriefcaseIcon,
          href: '/employees',
          page: 'employees',
        },
        {
          id: 'admins',
          name: getText('Admins', 'አስተዳዳሪዎች'),
          icon: ShieldCheckIcon,
          href: '/admins',
          page: 'admins',
        },
      ],
    },
    {
      type: 'group',
      id: 'payments',
      name: getText('Payments', 'ክፍያዎች'),
      icon: CreditCardIcon,
      children: [
        {
          id: 'monthly-payments',
          name: getText('Monthly Payments', 'ወርሃዊ ክፍያዎች'),
          icon: CreditCardIcon,
          href: '/payments',
          page: 'payments',
        },
        {
          id: 'custom-payments',
          name: getText('Custom Payments', 'ልዩ ክፍያዎች'),
          icon: ReceiptPercentIcon,
          href: '/payments/custom',
          page: 'payments',
        },
        {
          id: 'transaction-reports',
          name: getText('Transaction Reports', 'የግብይት ሪፖርት'),
          icon: BanknotesIcon,
          href: '/bank-reports',
          page: 'bank-reports',
        },
      ],
    },
    {
      type: 'group',
      id: 'notifications',
      name: getText('Notifications', 'ማሳወቂያዎች'),
      icon: BellIcon,
      children: [
        {
          id: 'sms-notifications',
          name: getText('SMS Notifications', 'የኤስኤምኤስ ማሳወቂያዎች'),
          icon: ChatBubbleLeftRightIcon,
          href: '/notifications',
          page: 'notifications',
        },
        {
          id: 'portal-notifications',
          name: getText('Portal Notifications', 'የፖርታል ማስታወቂያዎች'),
          icon: MegaphoneIcon,
          href: '/notice',
          page: 'notice',
        },
      ],
    },
    {
      type: 'group',
      id: 'settings',
      name: getText('Settings', 'ቅንብሮች'),
      icon: Cog6ToothIcon,
      children: [
        {
          id: 'system-settings',
          name: getText('System Settings', 'የስርዓት ቅንብሮች'),
          icon: AdjustmentsHorizontalIcon,
          href: '/settings',
          page: 'settings',
        },
        {
          id: 'bank-settings',
          name: getText('Bank Settings', 'የባንክ ቅንብሮች'),
          icon: BuildingLibraryIcon,
          href: '/bank-reports?settings=true',
          page: 'bank-reports',
        },
      ],
    },
    {
      type: 'link',
      id: 'activity-logs',
      name: getText('Activity Logs', 'የእንቅስቃሴ ምዝገባ'),
      icon: ClockIcon,
      href: '/activity-logs',
      page: 'activity-logs',
    },
    {
      type: 'link',
      id: 'profile',
      name: getText('My Profile', 'የእኔ መገለጫ'),
      icon: UserCircleIcon,
      href: '/profile',
      page: 'profile',
    },
  ]

  // Filter based on user permissions
  const navItems: NavItem[] = rawNavItems
    .map(item => {
      if (item.type === 'group') {
        const permittedChildren = item.children.filter(isChildPermitted)
        if (permittedChildren.length === 0) return null
        return {
          ...item,
          children: permittedChildren,
        }
      }
      return isLinkPermitted(item) ? item : null
    })
    .filter((item): item is NavItem => item !== null)

  // Automatically close all groups by default and whenever navigating from page to page
  useEffect(() => {
    setOpenGroups({})
  }, [pathname])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.dispatchEvent(new StorageEvent('storage', { key: 'token' }))
    router.push('/login')
  }

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) router.push('/login')
  }, [router])

  if (permLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50'}`}>
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen flex ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex flex-col h-full">
          {/* Logo and close button */}
          <div className={`flex flex-col lg:flex-row lg:items-center lg:justify-between h-auto lg:h-16 px-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex flex-col lg:flex-row lg:items-center min-w-0 flex-1">
              <Link
                href="/settings"
                className={`self-start mb-2 lg:hidden p-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                title={getText('Settings', 'ቅንብሮች')}
              >
                <Cog6ToothIcon className="h-5 w-5" />
              </Link>
              <div className="flex items-center justify-between w-full lg:w-auto">
                <div className="flex items-center">
                  <Image
                    src="/log.png"
                    alt="Bluelight"
                    width={32}
                    height={32}
                    className="mr-2 flex-shrink-0"
                  />
                  <span className={`text-base sm:text-lg font-semibold whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {getText('Bluelight', 'ብሉላይት')} SMS
                  </span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="lg:hidden ml-4 p-2 rounded-full bg-red-50 border border-red-100 text-red-500 hover:text-white hover:bg-red-500 hover:border-red-500 hover:shadow-md hover:scale-110 active:scale-95 transition-all duration-300 ease-out"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="hidden lg:flex items-center space-x-1 ml-2">
              <Link
                href="/settings"
                className={`p-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                title={getText('Settings', 'ቅንብሮች')}
              >
                <Cog6ToothIcon className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* User profile section */}
          <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
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
              <div className="ml-3 min-w-0 flex-1">
                <p className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{user?.name}</p>
                <p className={`text-xs capitalize truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {user?.role === 'superadmin' ? getText('Super Admin', 'ዋና አስተዳዳሪ') : getText(user?.role, user?.role)}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation with Dropdown Groups */}
          <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {navItems.map((item) => {
              if (item.type === 'link') {
                const active = isHrefActive(item.href)
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => {
                      setSidebarOpen(false)
                      setOpenGroups({})
                    }}
                    className={`group flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? theme === 'dark'
                          ? 'bg-blue-600 text-white font-semibold shadow-sm'
                          : 'bg-blue-600 text-white font-semibold shadow-sm'
                        : theme === 'dark'
                          ? 'text-gray-300 hover:bg-gray-700/70 hover:text-white'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <item.icon
                      className={`h-5 w-5 mr-3 flex-shrink-0 transition-colors ${
                        active
                          ? 'text-white'
                          : theme === 'dark'
                            ? 'text-gray-400 group-hover:text-gray-200'
                            : 'text-gray-500 group-hover:text-gray-700'
                      }`}
                    />
                    <span className="truncate">{item.name}</span>
                  </Link>
                )
              }

              // Group Item with Dropdown
              const isOpen = Boolean(openGroups[item.id])
              const hasActiveChild = item.children.some(child => isHrefActive(child.href))

              return (
                <div key={item.id} className="pt-0.5">
                  {/* Group Header Button */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(item.id)}
                    className={`w-full group flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors select-none ${
                      hasActiveChild
                        ? theme === 'dark'
                          ? 'text-blue-400 bg-blue-950/30'
                          : 'text-blue-700 bg-blue-50/70'
                        : theme === 'dark'
                          ? 'text-gray-300 hover:text-white hover:bg-gray-700/70'
                          : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center min-w-0 flex-1">
                      <item.icon
                        className={`h-5 w-5 mr-3 flex-shrink-0 transition-colors ${
                          hasActiveChild
                            ? theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                            : theme === 'dark' ? 'text-gray-400 group-hover:text-gray-200' : 'text-gray-500 group-hover:text-gray-700'
                        }`}
                      />
                      <span className="truncate">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      {hasActiveChild && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                      )}
                      <ChevronDownIcon
                        className={`h-4 w-4 transition-transform duration-200 ${
                          isOpen ? 'transform rotate-0' : 'transform -rotate-90'
                        } ${
                          hasActiveChild
                            ? theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                            : theme === 'dark' ? 'text-gray-400 group-hover:text-gray-200' : 'text-gray-400 group-hover:text-gray-600'
                        }`}
                      />
                    </div>
                  </button>

                  {/* Dropdown Children */}
                  {isOpen && (
                    <div className="mt-1 ml-4 pl-3.5 border-l-2 border-gray-200 dark:border-gray-700 space-y-1">
                      {item.children.map(child => {
                        const childActive = isHrefActive(child.href)
                        return (
                          <Link
                            key={child.id}
                            href={child.href}
                            onClick={() => {
                              setSidebarOpen(false)
                              setOpenGroups({})
                            }}
                            className={`group flex items-center px-2.5 py-1.5 text-xs sm:text-[13px] font-medium rounded-lg transition-colors ${
                              childActive
                                ? theme === 'dark'
                                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                                  : 'bg-blue-600 text-white font-semibold shadow-sm'
                                : theme === 'dark'
                                  ? 'text-gray-300 hover:bg-gray-700/70 hover:text-white'
                                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                          >
                            <child.icon
                              className={`h-4 w-4 mr-2.5 flex-shrink-0 transition-colors ${
                                childActive
                                  ? 'text-white'
                                  : theme === 'dark'
                                    ? 'text-gray-400 group-hover:text-gray-200'
                                    : 'text-gray-400 group-hover:text-gray-600'
                              }`}
                            />
                            <span className="truncate">{child.name}</span>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          {/* Logout button */}
          <div className={`p-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <button
              onClick={handleLogout}
              className={`w-full flex items-center px-3 py-2.5 text-xs sm:text-sm font-medium rounded-xl transition-colors ${
                theme === 'dark' ? 'text-red-400 hover:bg-gray-700/80' : 'text-red-600 hover:bg-red-50'
              }`}
            >
              <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5" />
              {getText('Logout', 'ውጭ')}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 w-full max-w-full overflow-x-hidden lg:ml-64">
        {/* Top bar for mobile */}
        <div className={`fixed top-0 left-0 right-0 shadow-sm border-b lg:hidden z-40 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className={`p-2 rounded-md transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-500 hover:bg-gray-100'}`}
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            <h1 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{pageTitle || getText('Dashboard', 'ዳሽቦርድ')}</h1>
            <div className="w-10" />
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 pt-16 lg:pt-0 min-w-0 w-full max-w-full overflow-x-hidden">
          {!hideBell && <NotificationBell />}
          {user?.mustChangePassword && <ForceChangePasswordModal user={user} />}
          {children}
        </main>
      </div>
    </div>
  )
}
