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
    'Bluelight Academy Portal — a secure online platform for students and teachers to access academic records, attendance, schedules, and school updates. | ብሉላይት አካዳሚ ፖርታል — ለተማሪዎች እና አስተማሪዎች ውጤቶችን፣ መገኘትን፣ የጊዜ ሰሌዳ እና ሌሎችን ለማግኘት።',
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
      'Bluelight Academy Portal — a secure online platform for students and teachers to access academic records, attendance, schedules, and school updates. | ብሉላይት አካዳሚ ፖርታል — ለተማሪዎች እና አስተማሪዎች።',
    images: [
      {
        url: 'https://portal.bluelight.edu.et/icon-512.png',
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
      'Bluelight Academy Portal — secure access for students and teachers to academic records, attendance, and school updates. | ብሉላይት አካዳሚ ፖርታል',
    images: ['https://portal.bluelight.edu.et/icon-512.png'],
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
        <meta property="og:image" content="https://portal.bluelight.edu.et/icon-512.png" />
        <meta property="og:image:width" content="512" />
        <meta property="og:image:height" content="512" />
        <meta property="og:image:alt" content="Bluelight Academy Portal" />
        <meta name="twitter:image" content="https://portal.bluelight.edu.et/icon-512.png" />
        {/* Capture install prompt before React hydrates */}
        <script dangerouslySetInnerHTML={{ __html: `
          window.__installPrompt = null;
          window.addEventListener('beforeinstallprompt', function(e) {
            e.preventDefault();
            window.__installPrompt = e;
          });
        `}} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Bluelight Academy Portal',
              url: 'https://portal.bluelight.edu.et',
              logo: 'https://portal.bluelight.edu.et/icon-512.png',
              image: 'https://portal.bluelight.edu.et/icon-512.png',
              description: 'Bluelight Academy Portal — a secure online platform for students and teachers to access academic records, attendance, schedules, and school updates.',
              applicationCategory: 'EducationApplication',
              operatingSystem: 'All',
              publisher: {
                '@type': 'Organization',
                name: 'Bluelight Academy',
                url: 'https://bluelight.edu.et',
                logo: 'https://bluelight.edu.et/icons/icon-512.png',
              },
            }),
          }}
        />
      </head>
      <body className="bg-gray-50 min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
