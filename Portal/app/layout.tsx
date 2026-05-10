import type { Metadata } from 'next'
import './globals.css'
import Providers from './providers'

const BASE_URL = 'https://portal.bluelight.edu.et'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Bluelight Academy Portal | Student & Teacher Login',
    template: '%s | Bluelight Academy Portal',
  },
  description:
    'Bluelight Academy student and teacher portal — access grades, attendance, schedules and more. | ብሉላይት አካዳሚ የተማሪዎች እና አስተማሪዎች ፖርታል — ውጤቶችን፣ መገኘትን እና ሌሎችን ይድረሱ።',
  keywords: [
    'Bluelight Academy',
    'Bluelight Academy Portal',
    'student portal',
    'teacher portal',
    'school portal Ethiopia',
    'ብሉላይት አካዳሚ',
    'ብሉላይት አካዳሚ ፖርታል',
    'የተማሪ ፖርታል',
    'የአስተማሪ ፖርታል',
    'ትምህርት ቤት ፖርታል ኢትዮጵያ',
  ],
  authors: [{ name: 'Bluelight Academy', url: BASE_URL }],
  creator: 'Bluelight Academy',
  publisher: 'Bluelight Academy',
  applicationName: 'Bluelight Academy Portal',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: 'website',
    url: BASE_URL,
    siteName: 'Bluelight Academy Portal',
    title: 'Bluelight Academy Portal | Student & Teacher Login',
    description:
      'Access your Bluelight Academy student or teacher portal. | ብሉላይት አካዳሚ ፖርታልዎን ይድረሱ።',
    images: [
      {
        url: '/icon-512.png',
        width: 512,
        height: 512,
        alt: 'Bluelight Academy Logo',
      },
    ],
    locale: 'en_ET',
    alternateLocale: 'am_ET',
  },
  twitter: {
    card: 'summary',
    title: 'Bluelight Academy Portal',
    description:
      'Student & Teacher Portal for Bluelight Academy | ብሉላይት አካዳሚ ፖርታል',
    images: ['/icon-512.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', type: 'image/x-icon' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
    shortcut: '/favicon.ico',
  },
  manifest: '/manifest.json',
  themeColor: '#1d4ed8',
  viewport: 'width=device-width, initial-scale=1',
  alternates: {
    canonical: BASE_URL,
    languages: {
      'en-ET': BASE_URL,
      'am-ET': BASE_URL,
    },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="am-ET">
      <head>
        {/* Capture install prompt before React hydrates */}
        <script dangerouslySetInnerHTML={{ __html: `
          window.__installPrompt = null;
          window.addEventListener('beforeinstallprompt', function(e) {
            e.preventDefault();
            window.__installPrompt = e;
          });
        `}} />
      </head>
      <body className="bg-gray-50 min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
