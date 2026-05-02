'use client'

import { useEffect } from 'react'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  return (
    <html lang="en">
      <head>
        <title>Bluelight Academy Portal</title>
        <meta name="description" content="Student & Teacher Portal" />
        <meta name="theme-color" content="#1d4ed8" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="BL Portal" />
        <meta name="application-name" content="BL Portal" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body className="bg-gray-50 min-h-screen">
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
