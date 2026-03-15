'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { BellIcon } from '@heroicons/react/24/outline'
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid'
import axios from 'axios'

export default function NotificationBell() {
  const [count, setCount] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const fetchCount = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/pending-students/count`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const newCount = res.data.count
      if (newCount > count && count > 0) {
        setIsAnimating(true)
        setTimeout(() => setIsAnimating(false), 1000)
      }
      setCount(newCount)
    } catch {
      // silently fail
    }
  }

  useEffect(() => {
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [])

  if (pathname === '/login') return null

  return (
    <div className="fixed top-3 right-3 sm:top-4 sm:right-4 lg:top-5 lg:right-5 z-50">
      <button
        onClick={() => router.push('/pending-students')}
        className={`relative p-2 sm:p-3 bg-white rounded-full shadow-lg border border-gray-200 hover:bg-gray-50 transition-all duration-200 hover:scale-105 active:scale-95 ${isAnimating ? 'animate-bounce' : ''}`}
      >
        {count > 0
          ? <BellSolidIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
          : <BellIcon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
        }
        {count > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] sm:text-xs font-bold rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center animate-pulse min-w-[16px] sm:min-w-[20px]">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>
    </div>
  )
}
