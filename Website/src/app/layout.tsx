import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Shell from '@/components/Shell'
import { LanguageProvider } from '@/contexts/LanguageContext'

const inter = Inter({ subsets: ['latin'] })

// Works on Vercel preview, Vercel production, and custom domain
const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://bluelight.edu.et')

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default: 'Bluelight Academy | Best School in Addis Ababa | ብሉላይት አካዳሚ | በአዲስ አበባ ምርጥ ትምህርት ቤት',
    template: '%s | Bluelight Academy',
  },

  description:
    'Bluelight Academy — the best school in Addis Ababa, Ethiopia. KG1, KG2, KG3 programs at Summit Condominium near CMC & LG College. ብሉላይት አካዳሚ — በአዲስ አበባ ምርጥ ትምህርት ቤት። KG1፣ KG2፣ KG3 ፕሮግራሞች። ሰሚት ኮንዶሚኒየም።',

  keywords: [
    'Bluelight Academy', 'Bluelight', 'Blue light Academy',
    'best school Addis Ababa', 'best kindergarten Addis Ababa',
    'KG1 KG2 KG3 Addis Ababa', 'preschool Addis Ababa',
    'school Summit Condominium', 'school near CMC Addis Ababa',
    'school near LG College', 'kids school Addis Ababa',
    'children school Ethiopia', 'early childhood education Ethiopia',
    'nursery school Addis Ababa', 'private school Addis Ababa',
    'ብሉላይት አካዳሚ', 'ብሉላይት', 'አዲስ አበባ ምርጥ ትምህርት ቤት',
    'ሰሚት ኮንዶሚኒየም ትምህርት ቤት', 'CMC ትምህርት ቤት',
    'LG ኮሌጅ አካባቢ ትምህርት ቤት', 'KG1 KG2 KG3 አዲስ አበባ',
    'የልጆች ትምህርት ቤት', 'ቅድመ ትምህርት አዲስ አበባ',
  ],

  authors:   [{ name: 'Bluelight Academy', url: BASE_URL }],
  creator:   'Bluelight Academy',
  publisher: 'Bluelight Academy',

  alternates: {
    canonical: BASE_URL,
    languages: { 'en': BASE_URL, 'am': BASE_URL },
  },

  icons: {
    icon: [
      { url: '/favicon.ico',        sizes: 'any',     type: 'image/x-icon' },
      { url: '/icons/icon-16.png',  sizes: '16x16',   type: 'image/png' },
      { url: '/icons/icon-32.png',  sizes: '32x32',   type: 'image/png' },
      { url: '/icons/icon-48.png',  sizes: '48x48',   type: 'image/png' },
      { url: '/icons/icon-96.png',  sizes: '96x96',   type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple:    '/icons/icon-180.png',
    shortcut: '/favicon.ico',
  },

  openGraph: {
    type:        'website',
    locale:      'en_ET',
    url:         BASE_URL,
    siteName:    'Bluelight Academy',
    title:       'Bluelight Academy | Best School in Addis Ababa | ብሉላይት አካዳሚ | በአዲስ አበባ ምርጥ ትምህርት ቤት',
    description: 'Bluelight Academy — the best school in Addis Ababa. KG1–KG3 at Summit Condominium near CMC. ብሉላይት አካዳሚ — በአዲስ አበባ ምርጥ ትምህርት ቤት። ሰሚት ኮንዶሚኒየም።',
    images: [
      {
        url:    `${BASE_URL}/icons/icon-512.png`,
        width:  512,
        height: 512,
        alt:    'Bluelight Academy — Best School in Addis Ababa',
      },
    ],
  },

  twitter: {
    card:        'summary_large_image',
    title:       'Bluelight Academy | Best School in Addis Ababa | ብሉላይት አካዳሚ',
    description: 'Best school in Addis Ababa. KG1–KG3 at Summit Condominium near CMC & LG College. ብሉላይት አካዳሚ — ሰሚት ኮንዶሚኒየም።',
    images:      [`${BASE_URL}/icons/icon-512.png`],
  },

  robots: {
    index:  true,
    follow: true,
    googleBot: {
      index:               true,
      follow:              true,
      'max-image-preview': 'large',
      'max-snippet':       -1,
    },
  },

  category: 'education',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Force OG meta directly in head — overrides any cache */}
        <meta property="og:title" content="Bluelight Academy | Best School in Addis Ababa | ብሉላይት አካዳሚ | በአዲስ አበባ ምርጥ ትምህርት ቤት" />
        <meta property="og:description" content="Bluelight Academy — Best school in Addis Ababa. KG1, KG2, KG3 at Summit Condominium near CMC & LG College. ብሉላይት አካዳሚ — በአዲስ አበባ ምርጥ ትምህርት ቤት። ሰሚት ኮንዶሚኒየም።" />
        <meta property="og:image" content="https://bluelight.edu.et/icons/icon-512.png" />
        <meta property="og:image:width" content="512" />
        <meta property="og:image:height" content="512" />
        <meta property="og:image:alt" content="Bluelight Academy Logo" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Bluelight Academy" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Bluelight Academy | Best School in Addis Ababa | ብሉላይት አካዳሚ" />
        <meta name="twitter:description" content="Best school in Addis Ababa. KG1–KG3 at Summit Condominium. ብሉላይት አካዳሚ — ሰሚት ኮንዶሚኒየም።" />
        <meta name="twitter:image" content="https://bluelight.edu.et/icons/icon-512.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'School',
              name: 'Bluelight Academy',
              alternateName: ['ብሉላይት አካዳሚ', 'Bluelight', 'Blue Light Academy'],
              url: BASE_URL,
              logo: `${BASE_URL}/icons/icon-512.png`,
              image: `${BASE_URL}/icons/icon-512.png`,
              description: 'Best school in Addis Ababa offering KG1, KG2, KG3 programs at Summit Condominium near CMC and LG College.',
              telephone: '+251945409940',
              email: 'info@bluelight.edu.et',
              foundingDate: '2024',
              address: {
                '@type': 'PostalAddress',
                streetAddress: 'Summit Condominium, 3rd Gate, Block 50',
                addressLocality: 'Addis Ababa',
                addressCountry: 'ET',
              },
              geo: {
                '@type': 'GeoCoordinates',
                latitude: 8.9828257,
                longitude: 38.8608926,
              },
              openingHours: 'Mo-Fr 07:30-15:00',
              sameAs: [
                'https://www.instagram.com/bluelight__academy',
                'https://www.tiktok.com/@bluelight__academy',
                'https://youtube.com/@bluelightacademy001',
              ],
              hasMap: 'https://maps.app.goo.gl/ikQjq35ZC1Pb1PhZA',
              teaches: ['KG1', 'KG2', 'KG3'],
              audience: {
                '@type': 'EducationalAudience',
                educationalRole: 'student',
                audienceType: 'Children aged 3-6',
              },
            }),
          }}
        />
      </head>
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
