'use client'
import { useEffect, useState } from 'react'

export default function InstallApp() {
  const [ready, setReady] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
      return
    }

    // Check immediately
    if ((window as any).__installPrompt) {
      setReady(true)
      return
    }

    // Poll every 500ms for up to 10s waiting for browser to fire the event
    const interval = setInterval(() => {
      if ((window as any).__installPrompt) {
        setReady(true)
        clearInterval(interval)
      }
    }, 500)

    window.addEventListener('appinstalled', () => {
      setInstalled(true)
      setReady(false)
    })

    return () => clearInterval(interval)
  }, [])

  const handleInstall = async () => {
    const prompt = (window as any).__installPrompt
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') {
      setInstalled(true)
      setReady(false)
      ;(window as any).__installPrompt = null
    }
  }

  if (installed) {
    return (
      <div className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-green-600 bg-green-50">
        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>App Installed ✓</span>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 select-none">
        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12v6m0 0l-3-3m3 3l3-3M12 3v9" />
        </svg>
        <span className="text-xs">Install App <span className="text-gray-300">(loading...)</span></span>
      </div>
    )
  }

  return (
    <button
      onClick={handleInstall}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all text-blue-600 bg-blue-50 hover:bg-blue-100 active:scale-95"
    >
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12v6m0 0l-3-3m3 3l3-3M12 3v9" />
      </svg>
      <span>Install App</span>
    </button>
  )
}
