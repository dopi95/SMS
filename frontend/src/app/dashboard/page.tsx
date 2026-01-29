'use client'

import DashboardLayout from '@/components/DashboardLayout'
import {
  AcademicCapIcon,
  UserGroupIcon,
  CreditCardIcon,
  BellIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline'

export default function Dashboard() {
  return (
    <DashboardLayout pageTitle="Dashboard">
      <div className="p-4 lg:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Welcome section */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 lg:text-3xl">Welcome back!</h1>
            <p className="text-gray-600 mt-1">Here's what's happening at Bluelight Academy today.</p>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <AcademicCapIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold text-gray-900">1,234</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <UserGroupIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Employees</p>
                  <p className="text-2xl font-bold text-gray-900">89</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <CreditCardIcon className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending Payments</p>
                  <p className="text-2xl font-bold text-gray-900">45</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <BellIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Notifications</p>
                  <p className="text-2xl font-bold text-gray-900">12</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button className="p-4 text-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <AcademicCapIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-900">Add Student</span>
              </button>
              <button className="p-4 text-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <UserGroupIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-900">Add Employee</span>
              </button>
              <button className="p-4 text-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <BellIcon className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-900">Send Notice</span>
              </button>
              <button className="p-4 text-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <ClipboardDocumentListIcon className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-900">View Reports</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}