'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import DashboardLayout from '@/components/DashboardLayout'
import {
  AcademicCapIcon,
  UserGroupIcon,
  UsersIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

interface DashboardStats {
  totalStudents: number
  totalTeachers: number
  totalInactive: number
  classCounts: { [key: string]: number }
  genderCounts: { male: number; female: number }
}

export default function Dashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalInactive: 0,
    classCounts: {},
    genderCounts: { male: 0, female: 0 }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token')
      const [studentsRes, inactiveRes, teachersRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/students`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/students/inactive`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] })),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/teachers`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] }))
      ])
      
      const students = studentsRes.data
      const inactive = inactiveRes.data
      const teachers = teachersRes.data
      
      // Calculate statistics
      const classCounts: { [key: string]: number } = {}
      const genderCounts = { male: 0, female: 0 }
      
      students.forEach((student: any) => {
        classCounts[student.class] = (classCounts[student.class] || 0) + 1
        if (student.gender === 'Male') genderCounts.male++
        else if (student.gender === 'Female') genderCounts.female++
      })
      
      setStats({
        totalStudents: students.length,
        totalTeachers: teachers.length,
        totalInactive: inactive.length,
        classCounts,
        genderCounts
      })
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout pageTitle="Dashboard">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout pageTitle="Dashboard">
      <div className="p-4 lg:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 lg:text-3xl">
              Welcome back!
            </h1>
            <p className="text-gray-600 mt-1">
              Here's what's happening at Bluelight today.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transform hover:scale-105 transition-transform duration-200">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <AcademicCapIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Active Students
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalStudents.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transform hover:scale-105 transition-transform duration-200">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <UserGroupIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Teachers
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalTeachers.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transform hover:scale-105 transition-transform duration-200">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <UsersIcon className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Inactive Students
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalInactive.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transform hover:scale-105 transition-transform duration-200">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <ChartBarIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Total Classes
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Object.keys(stats.classCounts).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Gender Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Gender Distribution
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-blue-500 rounded-full mr-3"></div>
                    <span className="text-gray-600">Male Students</span>
                  </div>
                  <span className="font-semibold text-gray-900">{stats.genderCounts.male}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-pink-500 rounded-full mr-3"></div>
                    <span className="text-gray-600">Female Students</span>
                  </div>
                  <span className="font-semibold text-gray-900">{stats.genderCounts.female}</span>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 font-medium">Total</span>
                    <span className="font-bold text-gray-900">{stats.totalStudents}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Students by Class
              </h3>
              <div className="space-y-3">
                {Object.entries(stats.classCounts).map(([className, count]) => (
                  <div key={className} className="flex items-center justify-between">
                    <span className="text-gray-600">{className}</span>
                    <span className="font-semibold text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button 
                onClick={() => router.push('/students/add')}
                className="p-4 text-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors transform hover:scale-105"
              >
                <AcademicCapIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-900">
                  Add Student
                </span>
              </button>
              <button 
                onClick={() => router.push('/students')}
                className="p-4 text-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors transform hover:scale-105"
              >
                <UsersIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-900">
                  View Students
                </span>
              </button>
              <button 
                onClick={() => router.push('/inactive-students')}
                className="p-4 text-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors transform hover:scale-105"
              >
                <UserGroupIcon className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-900">
                  Inactive Students
                </span>
              </button>
              <button className="p-4 text-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors transform hover:scale-105">
                <ChartBarIcon className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-900">
                  View Reports
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}