'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { BellIcon } from '@heroicons/react/24/outline'
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid'

export default function NotificationBell() {
  const [notificationCount, setNotificationCount] = useState(3) // Mock count
  const [isAnimating, setIsAnimating] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Hide on login page
  if (pathname === '/login') {
    return null
  }

  // Mock function to simulate new notifications
  useEffect(() => {
    // Play sound on every component mount (refresh/login) if there are notifications
    if (notificationCount > 0) {
      const timer = setTimeout(() => {
        playNotificationSound()
        animateBell()
      }, 1500) // Delay to ensure page is loaded
      
      return () => clearTimeout(timer)
    }
  }, [notificationCount]) // Trigger when notification count changes

  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate random new notifications (for demo)
      if (Math.random() > 0.8) {
        setNotificationCount(prev => prev + 1)
        playNotificationSound()
        animateBell()
      }
    }, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const playNotificationSound = () => {
    try {
      // Try to play audio file first
      const audio = new Audio('/notification.mp3')
      audio.volume = 0.5
      audio.play().catch(() => {
        // Fallback to Web Audio API beep only after user interaction
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
          
          // Check if AudioContext is suspended and resume it
          if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
              createBeepSound(audioContext)
            }).catch(() => {
              // Silently fail if can't resume
            })
          } else {
            createBeepSound(audioContext)
          }
        } catch (error) {
          // Silently fail if audio not supported
        }
      })
    } catch (error) {
      // Silently fail if audio not available
    }
  }

  const createBeepSound = (audioContext: AudioContext) => {
    try {
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.5)
    } catch (error) {
      // Silently fail
    }
  }

  const animateBell = () => {
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 1000)
  }

  const handleClick = () => {
    router.push('/notifications')
  }

  return (
    <div className="fixed top-3 right-3 sm:top-4 sm:right-4 lg:top-5 lg:right-5 z-50">
      <button
        onClick={handleClick}
        className={`relative p-2 sm:p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-105 active:scale-95 ${
          isAnimating ? 'animate-bounce' : ''
        }`}
      >
        {notificationCount > 0 ? (
          <BellSolidIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
        ) : (
          <BellIcon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600 dark:text-gray-400" />
        )}
        
        {notificationCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center animate-pulse min-w-[16px] sm:min-w-[20px]">
            <span className="text-[10px] sm:text-xs leading-none">
              {notificationCount > 99 ? '99+' : notificationCount}
            </span>
          </span>
        )}
      </button>
    </div>
  )
}