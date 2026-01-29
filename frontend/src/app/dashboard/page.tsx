'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import DashboardLayout from '@/components/DashboardLayout'
import { useSettings } from '@/contexts/SettingsContext'
import {
  AcademicCapIcon,
  UserGroupIcon,
  CreditCardIcon,
  BellIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
)

interface Student {
  _id: string
  class: string
  section?: string
  gender: string
  status?: string
}

interface DashboardStats {
  totalStudents: number
  totalTeachers: number
  totalInactive: number
  classCounts: { [key: string]: number }
  genderCounts: { male: number; female: number }
  classGenderStats: { [key: string]: { male: number; female: number; sections: { [key: string]: number } } }
}

export default function Dashboard() {
  const { getText, theme } = useSettings()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalInactive: 0,
    classCounts: {},
    genderCounts: { male: 0, female: 0 },
    classGenderStats: {}
  })
  const [loading, setLoading] = useState(true)
  const [animatedCounts, setAnimatedCounts] = useState({
    students: 0,
    teachers: 0,
    inactive: 0
  })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  useEffect(() => {
    // Animate counters
    const duration = 2000
    const steps = 60
    const stepDuration = duration / steps
    
    let currentStep = 0
    const timer = setInterval(() => {
      currentStep++
      const progress = currentStep / steps
      
      setAnimatedCounts({
        students: Math.floor(stats.totalStudents * progress),
        teachers: Math.floor(stats.totalTeachers * progress),
        inactive: Math.floor(stats.totalInactive * progress)
      })
      
      if (currentStep >= steps) {
        clearInterval(timer)
        setAnimatedCounts({
          students: stats.totalStudents,
          teachers: stats.totalTeachers,
          inactive: stats.totalInactive
        })
      }
    }, stepDuration)
    
    return () => clearInterval(timer)
  }, [stats])

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
      
      const students: Student[] = studentsRes.data
      const inactive: Student[] = inactiveRes.data
      const teachers = teachersRes.data
      
      // Calculate statistics
      const classCounts: { [key: string]: number } = {}
      const genderCounts = { male: 0, female: 0 }
      const classGenderStats: { [key: string]: { male: number; female: number; sections: { [key: string]: number } } } = {}
      
      students.forEach(student => {
        // Class counts
        classCounts[student.class] = (classCounts[student.class] || 0) + 1
        
        // Gender counts
        if (student.gender === 'Male') genderCounts.male++
        else if (student.gender === 'Female') genderCounts.female++
        
        // Class-Gender-Section stats
        if (!classGenderStats[student.class]) {
          classGenderStats[student.class] = { male: 0, female: 0, sections: {} }
        }
        
        if (student.gender === 'Male') classGenderStats[student.class].male++
        else if (student.gender === 'Female') classGenderStats[student.class].female++
        
        if (student.section) {
          const sectionKey = `${student.class}-${student.section}`
          classGenderStats[student.class].sections[student.section] = 
            (classGenderStats[student.class].sections[student.section] || 0) + 1
        }
      })
      
      setStats({
        totalStudents: students.length,
        totalTeachers: teachers.length,
        totalInactive: inactive.length,
        classCounts,
        genderCounts,
        classGenderStats
      })
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getClassDisplayName = (className: string) => {
    const classMap: { [key: string]: string } = {
      'Nursery': getText('Nursery', 'ጀማሪ'),
      'LKG': getText('LKG', 'ደረጃ 1'),
      'UKG': getText('UKG', 'ደረጃ 2'),
      'Grade 1': getText('Grade 1', 'ክፍል 1'),
      'Grade 2': getText('Grade 2', 'ክፍል 2'),
      'Grade 3': getText('Grade 3', 'ክፍል 3'),
      'Grade 4': getText('Grade 4', 'ክፍል 4'),
      'Grade 5': getText('Grade 5', 'ክፍል 5'),
      'Grade 6': getText('Grade 6', 'ክፍል 6'),
      'Grade 7': getText('Grade 7', 'ክፍል 7'),
      'Grade 8': getText('Grade 8', 'ክፍል 8')
    }
    return classMap[className] || className
  }

  // Chart configurations
  const classChartData = {
    labels: Object.keys(stats.classCounts).map(getClassDisplayName),
    datasets: [
      {
        label: getText('Male', 'ወንድ'),
        data: Object.keys(stats.classCounts).map(className => 
          stats.classGenderStats[className]?.male || 0
        ),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1
      },
      {
        label: getText('Female', 'ሴት'),
        data: Object.keys(stats.classCounts).map(className => 
          stats.classGenderStats[className]?.female || 0
        ),
        backgroundColor: 'rgba(236, 72, 153, 0.8)',
        borderColor: 'rgba(236, 72, 153, 1)',
        borderWidth: 1
      }
    ]
  }

  const genderChartData = {
    labels: [getText('Male', 'ወንድ'), getText('Female', 'ሴት')],
    datasets: [
      {
        data: [stats.genderCounts.male, stats.genderCounts.female],
        backgroundColor: ['rgba(59, 130, 246, 0.8)', 'rgba(236, 72, 153, 0.8)'],
        borderColor: ['rgba(59, 130, 246, 1)', 'rgba(236, 72, 153, 1)'],
        borderWidth: 2
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: theme === 'dark' ? '#e5e7eb' : '#374151'
        }
      },
      title: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: theme === 'dark' ? '#9ca3af' : '#6b7280',
          stepSize: 1,
          callback: function(value: any) {
            return Number.isInteger(value) ? value : '';
          }
        },
        grid: {
          color: theme === 'dark' ? '#374151' : '#e5e7eb'
        }
      },
      x: {
        ticks: {
          color: theme === 'dark' ? '#9ca3af' : '#6b7280'
        },
        grid: {
          color: theme === 'dark' ? '#374151' : '#e5e7eb'
        }
      }
    },
    animation: {
      duration: 1500,
      easing: 'easeOutQuart' as const,
      delay: (context: any) => {
        let delay = 0;
        if (context.type === 'data' && context.mode === 'default') {
          delay = context.dataIndex * 100 + context.datasetIndex * 50;
        }
        return delay;
      }
    },
    animations: {
      y: {
        easing: 'easeOutQuart',
        from: (ctx: any) => {
          if (ctx.type === 'data') {
            return ctx.chart.scales.y.getPixelForValue(0);
          }
        },
        duration: 1200,
        delay: (context: any) => context.dataIndex * 80
      }
    },
    interaction: {
      intersect: false,
      mode: 'index' as const
    },
    hover: {
      animationDuration: 300
    }
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: theme === 'dark' ? '#e5e7eb' : '#374151',
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} students (${percentage}%)`;
          },
          afterLabel: function(context: any) {
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            return `Total: ${total} students`;
          }
        },
        displayColors: true,
        backgroundColor: theme === 'dark' ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        titleColor: theme === 'dark' ? '#e5e7eb' : '#374151',
        bodyColor: theme === 'dark' ? '#e5e7eb' : '#374151',
        borderColor: theme === 'dark' ? '#4b5563' : '#d1d5db',
        borderWidth: 1
      },
      datalabels: {
        display: false
      }
    },
    elements: {
      arc: {
        borderWidth: 0
      }
    },
    animation: {
      duration: 2500,
      easing: 'easeOutQuart' as const,
      animateRotate: true,
      animateScale: false
    },
    animations: {
      circumference: {
        duration: 2500,
        easing: 'easeOutQuart',
        from: 0,
        to: (ctx: any) => {
          const angle = (ctx.parsed / ctx.dataset.data.reduce((a: number, b: number) => a + b, 0)) * 2 * Math.PI;
          return angle;
        },
        delay: (context: any) => context.dataIndex * 500
      },
      rotation: {
        duration: 2000,
        easing: 'easeOutQuart',
        from: -Math.PI / 2
      }
    },
    cutout: '65%',
    radius: '90%',
    hover: {
      animationDuration: 300
    },
    onHover: (event: any, elements: any, chart: any) => {
      chart.canvas.style.cursor = elements.length > 0 ? 'pointer' : 'default';
    }
  }

  if (loading) {
    return (
      <DashboardLayout pageTitle={getText('Dashboard', 'ዳሽቦርድ')}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

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

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transform hover:scale-105 transition-transform duration-200">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <AcademicCapIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {getText('Active Students', 'ንቁ ተማሪዎች')}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {animatedCounts.students.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transform hover:scale-105 transition-transform duration-200">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <UserGroupIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {getText('Teachers', 'መምህራን')}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {animatedCounts.teachers.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transform hover:scale-105 transition-transform duration-200">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                  <UsersIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {getText('Inactive Students', 'የተከለሉ ተማሪዎች')}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {animatedCounts.inactive.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transform hover:scale-105 transition-transform duration-200">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                  <ChartBarIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {getText('Total Classes', 'ጠቅላላ ክፍሎች')}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {Object.keys(stats.classCounts).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Gender Distribution Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {getText('Gender Distribution', 'የጾታ ስርጭት')}
              </h3>
              <div className="h-64">
                <Doughnut data={genderChartData} options={doughnutOptions} />
              </div>
              <div className="mt-4 text-center space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {getText('Total:', 'ጠቅላላ:')} {stats.totalStudents} {getText('students', 'ተማሪዎች')}
                </p>
                <div className="flex justify-center space-x-6 text-sm">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                    <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                      {getText('Male:', 'ወንድ:')} {stats.genderCounts.male}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-pink-500 rounded-full mr-2"></div>
                    <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                      {getText('Female:', 'ሴት:')} {stats.genderCounts.female}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Class Statistics Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {getText('Students by Class & Gender', 'በክፍል እና ጾታ ተማሪዎች')}
              </h3>
              <div className="h-48 mb-3">
                <Bar data={classChartData} options={chartOptions} />
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex justify-center space-x-6 text-sm">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                    <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                      {getText('Total Male:', 'ጠቅላላ ወንድ:')} {stats.genderCounts.male}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-pink-500 rounded-full mr-2"></div>
                    <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                      {getText('Total Female:', 'ጠቅላላ ሴት:')} {stats.genderCounts.female}
                    </span>
                  </div>
                </div>
                <div className={`border-t pt-3 ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}>
                  <h4 className={`text-sm font-medium mb-3 text-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    {getText('Class & Section Breakdown:', 'የክፍል እና ክፍል እይታ:')}
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(stats.classGenderStats).map(([className, classData]) => (
                      <div key={className} className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <div className={`font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {getClassDisplayName(className)} ({classData.male + classData.female})
                          <span className={`ml-2 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            <span className="text-blue-600">♂ {classData.male}</span> | 
                            <span className="text-pink-600 ml-1">♀ {classData.female}</span>
                          </span>
                        </div>
                        {Object.keys(classData.sections).length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {Object.entries(classData.sections).map(([section, count]) => {
                              const sectionMale = Math.round((classData.male / (classData.male + classData.female)) * count);
                              const sectionFemale = count - sectionMale;
                              return (
                                <div key={section} className={`p-2 rounded text-xs ${theme === 'dark' ? 'bg-gray-600' : 'bg-white'}`}>
                                  <div className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                    {getText(`Section ${section}`, `ክፍል ${section === 'A' ? 'ሀ' : section === 'B' ? 'ለ' : section === 'C' ? 'ሐ' : 'መ'}`)} ({count})
                                  </div>
                                  <div className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                    <span className="text-blue-600">♂ {sectionMale}</span> | 
                                    <span className="text-pink-600 ml-1">♀ {sectionFemale}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Class Statistics */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {getText('Detailed Class Statistics', 'ዝርዝር የክፍል ስታቲስቲክስ')}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                    <th className={`text-left py-3 px-4 font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      {getText('Class', 'ክፍል')}
                    </th>
                    <th className={`text-left py-3 px-4 font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      {getText('Male', 'ወንድ')}
                    </th>
                    <th className={`text-left py-3 px-4 font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      {getText('Female', 'ሴት')}
                    </th>
                    <th className={`text-left py-3 px-4 font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      {getText('Total', 'ጠቅላላ')}
                    </th>
                    <th className={`text-left py-3 px-4 font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      {getText('Sections', 'ክፍሎች')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(stats.classGenderStats).map(([className, data]) => (
                    <tr key={className} className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                      <td className={`py-3 px-4 font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {getClassDisplayName(className)}
                      </td>
                      <td className={`py-3 px-4 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                        {data.male}
                      </td>
                      <td className={`py-3 px-4 ${theme === 'dark' ? 'text-pink-400' : 'text-pink-600'}`}>
                        {data.female}
                      </td>
                      <td className={`py-3 px-4 font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {data.male + data.female}
                      </td>
                      <td className={`py-3 px-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        {Object.keys(data.sections).length > 0 
                          ? Object.entries(data.sections).map(([section, count]) => 
                              `${section}(${count})`
                            ).join(', ')
                          : '-'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {getText('Quick Actions', 'ፈጣን እርምጃዎች')}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button 
                onClick={() => router.push('/students/add')}
                className="p-4 text-center rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors transform hover:scale-105"
              >
                <AcademicCapIcon className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {getText('Add Student', 'ተማሪ ጨምር')}
                </span>
              </button>
              <button 
                onClick={() => router.push('/students')}
                className="p-4 text-center rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors transform hover:scale-105"
              >
                <UsersIcon className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {getText('View Students', 'ተማሪዎች ይመልከቱ')}
                </span>
              </button>
              <button 
                onClick={() => router.push('/inactive-students')}
                className="p-4 text-center rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors transform hover:scale-105"
              >
                <UserGroupIcon className="h-8 w-8 text-orange-600 dark:text-orange-400 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {getText('Inactive Students', 'የተከለሉ ተማሪዎች')}
                </span>
              </button>
              <button className="p-4 text-center rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors transform hover:scale-105">
                <ClipboardDocumentListIcon className="h-8 w-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
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