import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Shell from '@/components/Shell'
import { LanguageProvider } from '@/contexts/LanguageContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Bluelight Academy | ብሉላይት አካዳሚ',
  description: 'Educational platform for Bluelight Academy',
  icons: {
    icon: '/img/logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <LanguageProvider>
          <Shell>
            {children}
          </Shell>
        </LanguageProvider>
      </body>
    </html>
  )
}