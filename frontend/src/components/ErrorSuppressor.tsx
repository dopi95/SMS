'use client'

import { useEffect } from 'react'

export default function ErrorSuppressor({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    // Complete console suppression
    console.error = () => {}
    console.warn = () => {}
    console.log = () => {}
    
    // Suppress React DevTools warnings
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (e) => {
        e.preventDefault()
      })
      
      window.addEventListener('error', (e) => {
        e.preventDefault()
      })
    }
  }, [])

  return <>{children}</>
}