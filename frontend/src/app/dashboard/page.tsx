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
  activeTeachers: number
  inactiveTeachers: number
  totalInactive: number
  classCounts: { [key: string]: number }
  genderCounts: { male: number; female: number }
  classDetails: {
    [key: string]: {
      total: number
      male: number
      female: number
      sections: {
        [key: string]: {
          total: number
          male: number
          female: number
        }
      }
    }
  }
}

export default function Dashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalTeachers: 0,
    activeTeachers: 0,
    inactiveTeachers: 0,
    totalInactive: 0,
    classCounts: {},
    genderCounts: { male: 0, female: 0 },
    classDetails: {}
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
      
      // Calculate teacher statistics
      const activeTeachers = teachers.filter((t: any) => t.isActive !== false).length
      const inactiveTeachers = teachers.filter((t: any) => t.isActive === false).length
      
      // Calculate statistics
      const classCounts: { [key: string]: number } = {}
      const genderCounts = { male: 0, female: 0 }
      const classDetails: { [key: string]: any } = {}
      
      students.forEach((student: any) => {
        classCounts[student.class] = (classCounts[student.class] || 0) + 1
        if (student.gender === 'Male') genderCounts.male++
        else if (student.gender === 'Female') genderCounts.female++
        
        // Build detailed class statistics
        if (!classDetails[student.class]) {
          classDetails[student.class] = {
            total: 0,
            male: 0,
            female: 0,
            sections: {}
          }
        }
        
        classDetails[student.class].total++
        if (student.gender === 'Male') classDetails[student.class].male++
        else if (student.gender === 'Female') classDetails[student.class].female++
        
        // Track section statistics
        if (student.section) {
          if (!classDetails[student.class].sections[student.section]) {
            classDetails[student.class].sections[student.section] = {
              total: 0,
              male: 0,
              female: 0
            }
          }
          classDetails[student.class].sections[student.section].total++
          if (student.gender === 'Male') classDetails[student.class].sections[student.section].male++
          else if (student.gender === 'Female') classDetails[student.class].sections[student.section].female++
        }
      })
      
      setStats({
        totalStudents: students.length,
        totalTeachers: teachers.length,
        activeTeachers,
        inactiveTeachers,
        totalInactive: inactive.length,
        classCounts,
        genderCounts,
        classDetails
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
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <AcademicCapIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Active Total Students
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalStudents.toLocaleString()}
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
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <UserGroupIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Active Total Employees
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.activeTeachers.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transform hover:scale-105 transition-transform duration-200">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <UserGroupIcon className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Inactive Employees
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.inactiveTeachers.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Gender Distribution & Students by Class - Visual Graphs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Gender Distribution Graph */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Gender Distribution
              </h3>
              <div className="space-y-6">
                {/* Male Students Bar */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-blue-500 rounded-full mr-3"></div>
                      <span className="text-gray-700 font-medium">Male Students</span>
                    </div>
                    <span className="font-bold text-blue-600 text-lg">{stats.genderCounts.male}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-blue-400 to-blue-600 h-8 rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-3"
                      style={{ 
                        width: stats.totalStudents > 0 ? `${(stats.genderCounts.male / stats.totalStudents) * 100}%` : '0%',
                        animation: 'slideIn 1s ease-out'
                      }}
                    >
                      <span className="text-white text-sm font-semibold">
                        {stats.totalStudents > 0 ? Math.round((stats.genderCounts.male / stats.totalStudents) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Female Students Bar */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-pink-500 rounded-full mr-3"></div>
                      <span className="text-gray-700 font-medium">Female Students</span>
                    </div>
                    <span className="font-bold text-pink-600 text-lg">{stats.genderCounts.female}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-pink-400 to-pink-600 h-8 rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-3"
                      style={{ 
                        width: stats.totalStudents > 0 ? `${(stats.genderCounts.female / stats.totalStudents) * 100}%` : '0%',
                        animation: 'slideIn 1s ease-out 0.2s backwards'
                      }}
                    >
                      <span className="text-white text-sm font-semibold">
                        {stats.totalStudents > 0 ? Math.round((stats.genderCounts.female / stats.totalStudents) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Total */}
                <div className="pt-4 border-t-2 border-gray-300">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 font-bold text-lg">Total Students</span>
                    <span className="font-bold text-gray-900 text-2xl">{stats.totalStudents}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Students by Class - Circular Graph */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Students by Class
              </h3>
              <div className="flex flex-col items-center">
                {/* Circular Chart */}
                <div className="relative w-64 h-64 mb-6">
                  <svg className="w-64 h-64 transform -rotate-90" viewBox="0 0 200 200">
                    {(() => {
                      const colors = [
                        '#9333ea', '#22c55e', '#eab308', '#ef4444', 
                        '#6366f1', '#f97316', '#14b8a6', '#06b6d4',
                        '#84cc16', '#f43f5e'
                      ];
                      const total = Object.values(stats.classCounts).reduce((a, b) => a + b, 0);
                      let currentAngle = 0;
                      
                      return Object.entries(stats.classCounts).map(([className, count], index) => {
                        const percentage = (count / total) * 100;
                        const angle = (count / total) * 360;
                        const startAngle = currentAngle;
                        currentAngle += angle;
                        
                        // Calculate path for donut segment
                        const radius = 80;
                        const innerRadius = 50;
                        const startRad = (startAngle * Math.PI) / 180;
                        const endRad = (currentAngle * Math.PI) / 180;
                        
                        const x1 = 100 + radius * Math.cos(startRad);
                        const y1 = 100 + radius * Math.sin(startRad);
                        const x2 = 100 + radius * Math.cos(endRad);
                        const y2 = 100 + radius * Math.sin(endRad);
                        const x3 = 100 + innerRadius * Math.cos(endRad);
                        const y3 = 100 + innerRadius * Math.sin(endRad);
                        const x4 = 100 + innerRadius * Math.cos(startRad);
                        const y4 = 100 + innerRadius * Math.sin(startRad);
                        
                        const largeArc = angle > 180 ? 1 : 0;
                        
                        const pathData = [
                          `M ${x1} ${y1}`,
                          `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
                          `L ${x3} ${y3}`,
                          `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}`,
                          'Z'
                        ].join(' ');
                        
                        return (
                          <path
                            key={className}
                            d={pathData}
                            fill={colors[index % colors.length]}
                            className="transition-all duration-500 hover:opacity-80"
                            style={{
                              animation: `fadeIn 0.8s ease-out ${index * 0.1}s backwards`
                            }}
                          >
                            <title>{className}: {count} students ({percentage.toFixed(1)}%)</title>
                          </path>
                        );
                      });
                    })()}
                  </svg>
                  
                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-3xl font-bold text-gray-900">{stats.totalStudents}</div>
                    <div className="text-sm text-gray-600">Total Students</div>
                  </div>
                </div>
                
                {/* Legend */}
                <div className="grid grid-cols-2 gap-3 w-full">
                  {Object.entries(stats.classCounts).map(([className, count], index) => {
                    const colors = [
                      'bg-purple-600', 'bg-green-500', 'bg-yellow-500', 'bg-red-500',
                      'bg-indigo-500', 'bg-orange-500', 'bg-teal-500', 'bg-cyan-500',
                      'bg-lime-500', 'bg-rose-500'
                    ];
                    const percentage = stats.totalStudents > 0 ? ((count / stats.totalStudents) * 100).toFixed(1) : 0;
                    
                    return (
                      <div 
                        key={className} 
                        className="flex items-center space-x-2"
                        style={{
                          animation: `slideUp 0.5s ease-out ${index * 0.1}s backwards`
                        }}
                      >
                        <div className={`w-4 h-4 rounded-full ${colors[index % colors.length]} flex-shrink-0`}></div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{className}</div>
                          <div className="text-xs text-gray-600">{count} ({percentage}%)</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <style jsx>{`
            @keyframes slideIn {
              from {
                width: 0%;
                opacity: 0;
              }
              to {
                opacity: 1;
              }
            }
            @keyframes fadeIn {
              from {
                opacity: 0;
                transform: scale(0.8);
              }
              to {
                opacity: 1;
                transform: scale(1);
              }
            }
            @keyframes slideUp {
              from {
                opacity: 0;
                transform: translateY(10px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}</style>

          {/* All Active Students Class Statistics */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              All Active Students Class Statistics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(stats.classDetails).map(([className, details]) => (
                <div key={className} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-blue-600 mb-3">{className}</h3>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Active Students:</span>
                      <span className="font-bold text-gray-900">{details.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Male Students:</span>
                      <span className="font-semibold text-blue-600">{details.male}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Female Students:</span>
                      <span className="font-semibold text-pink-600">{details.female}</span>
                    </div>
                  </div>

                  {Object.keys(details.sections).length > 0 && (
                    <div className="border-t border-gray-200 pt-3">
                      <h4 className="font-semibold text-gray-700 mb-2">Sections:</h4>
                      <div className="space-y-3">
                        {Object.entries(details.sections).map(([sectionName, sectionData]: [string, any]) => (
                          <div key={sectionName} className="bg-gray-50 rounded p-3">
                            <h5 className="font-semibold text-gray-800 mb-2">Section {sectionName}:</h5>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Total:</span>
                                <span className="font-semibold text-gray-900">{sectionData.total}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Male:</span>
                                <span className="font-semibold text-blue-600">{sectionData.male}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Female:</span>
                                <span className="font-semibold text-pink-600">{sectionData.female}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
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
              <button 
                onClick={() => router.push('/payments')}
                className="p-4 text-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors transform hover:scale-105"
              >
                <ChartBarIcon className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-900">
                  View Payments
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}