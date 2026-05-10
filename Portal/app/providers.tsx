'use client'

import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
    // Capture install prompt globally as early as possible
    const handler = (e: any) => {
      e.preventDefault()
      ;(window as any).__installPrompt = e
    }
    // Already captured before this component mounted
    if ((window as any).__installPrompt) return
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  return (
    <>
      {children}
      <Toaster position="top-right" />
    </>
  )
}
