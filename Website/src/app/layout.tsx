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
  description: 'Bluelight Academy — A nurturing kindergarten in Addis Ababa offering KG1–KG3 programs. Empowering young minds to learn, grow, and shine.',
  icons: {
    icon: [
      { url: '/icons/favicon.ico',  sizes: 'any' },
      { url: '/icons/icon-16.png',  sizes: '16x16',  type: 'image/png' },
      { url: '/icons/icon-32.png',  sizes: '32x32',  type: 'image/png' },
      { url: '/icons/icon-96.png',  sizes: '96x96',  type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/icon-180.png',
    shortcut: '/icons/icon-32.png',
  },
  openGraph: {
    title: 'Bluelight Academy',
    description: 'A nurturing kindergarten in Addis Ababa offering KG1–KG3 programs.',
    url: 'https://bluelight.edu.et',
    siteName: 'Bluelight Academy',
    images: [{ url: '/icons/icon-512.png', width: 512, height: 512 }],
    locale: 'en_ET',
    type: 'website',
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