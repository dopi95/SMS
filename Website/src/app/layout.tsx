import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Shell from '@/components/Shell'
import { LanguageProvider } from '@/contexts/LanguageContext'

const inter = Inter({ subsets: ['latin'] })

const BASE_URL = 'https://bluelight.edu.et'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default: 'Bluelight Academy | Best School in Addis Ababa | ብሉላይት አካዳሚ | በአዲስ አበባ ምርጥ ትምህርት ቤት',
    template: '%s | Bluelight Academy',
  },

  description:
    'Bluelight Academy — the best school in Addis Ababa, Ethiopia. Offering KG1, KG2, KG3 programs at Summit Condominium near CMC & LG College. Nurturing young minds to learn, grow, and shine. ብሉላይት አካዳሚ — በአዲስ አበባ ምርጥ ትምህርት ቤት። KG1፣ KG2፣ KG3 ፕሮግራሞች። ሰሚት ኮንዶሚኒየም፣ አዲስ አበባ።',

  keywords: [
    // English keywords
    'Bluelight Academy',
    'Bluelight',
    'Blue light Academy',
    'best kindergarten Addis Ababa',
    'kindergarten Ethiopia',
    'KG1 KG2 KG3 Addis Ababa',
    'preschool Addis Ababa',
    'best school Addis Ababa',
    'school Summit Condominium',
    'school near CMC Addis Ababa',
    'school near LG College',
    'Summit school Ethiopia',
    'kids school Addis Ababa',
    'children school Ethiopia',
    'early childhood education Ethiopia',
    'nursery school Addis Ababa',
    'top kindergarten Ethiopia',
    'private school Addis Ababa',
    'academy Addis Ababa',
    'bluelight school',
    'bluelight kids',
    'bluelight children',
    // Amharic keywords
    'ብሉላይት አካዳሚ',
    'ብሉላይት',
    'አዲስ አበባ መዋዕለ ሕፃናት',
    'ምርጥ ትምህርት ቤት አዲስ አበባ',
    'ሰሚት ኮንዶሚኒየም ትምህርት ቤት',
    'CMC ትምህርት ቤት',
    'LG ኮሌጅ አካባቢ ትምህርት ቤት',
    'KG1 KG2 KG3 አዲስ አበባ',
    'የልጆች ትምህርት ቤት',
    'ቅድመ ትምህርት አዲስ አበባ',
  ],

  authors: [{ name: 'Bluelight Academy', url: BASE_URL }],
  creator: 'Bluelight Academy',
  publisher: 'Bluelight Academy',

  alternates: {
    canonical: BASE_URL,
    languages: {
      'en': BASE_URL,
      'am': BASE_URL,
    },
  },

  icons: {
    icon: [
      { url: '/favicon.ico',        sizes: 'any',    type: 'image/x-icon' },
      { url: '/icons/icon-16.png',  sizes: '16x16',  type: 'image/png' },
      { url: '/icons/icon-32.png',  sizes: '32x32',  type: 'image/png' },
      { url: '/icons/icon-48.png',  sizes: '48x48',  type: 'image/png' },
      { url: '/icons/icon-96.png',  sizes: '96x96',  type: 'image/png' },
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
    title:       'Bluelight Academy | Best School in Addis Ababa | ብሉላይት አካዳሚ',
    description: 'Bluelight Academy — nurturing, inspiring KG1–KG3 education at Summit Condominium, Addis Ababa. በአዲስ አበባ ምርጥ ትምህርት ቤት። Every child learns, grows, and shines.',
    images: [
      {
        url:    '/icons/icon-512.png',
        width:  512,
        height: 512,
        alt:    'Bluelight Academy Logo',
      },
    ],
  },

  twitter: {
    card:        'summary',
    title:       'Bluelight Academy | Best Kindergarten in Addis Ababa',
    description: 'Nurturing KG1–KG3 education at Summit Condominium, Addis Ababa, Ethiopia.',
    images:      ['/icons/icon-512.png'],
  },

  robots: {
    index:               true,
    follow:              true,
    googleBot: {
      index:             true,
      follow:            true,
      'max-image-preview': 'large',
      'max-snippet':     -1,
    },
  },

  verification: {
    google: 'add-your-google-search-console-verification-code-here',
  },

  category: 'education',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* JSON-LD Structured Data for Google */}
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
              description: 'Best kindergarten school in Addis Ababa offering KG1, KG2, KG3 programs. Located at Summit Condominium, near CMC and LG College.',
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
              educationalCredentialAwarded: 'Kindergarten Certificate',
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
