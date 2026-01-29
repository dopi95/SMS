import './globals.css'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import ErrorSuppressor from '@/components/ErrorSuppressor'
import Script from 'next/script'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Bluelight Academy - School Management System',
  description: 'Complete school management system for Bluelight Academy',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <Script src="/suppress-errors.js" strategy="beforeInteractive" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ErrorSuppressor>
          {children}
          <Toaster position="top-right" />
        </ErrorSuppressor>
      </body>
    </html>
  )
}