import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Our Story | Bluelight Academy — Best Kindergarten Addis Ababa',
  description: 'Discover how Bluelight Academy was founded in 2024 in Addis Ababa with a vision to nurture every child. KG1–KG3 programs at Summit Condominium near CMC & LG College. ብሉላይት አካዳሚ እንዴት ተጀመረ — የእኛ ታሪክ።',
  keywords: [
    'Bluelight Academy story', 'about Bluelight Academy', 'kindergarten Addis Ababa',
    'best school Ethiopia 2024', 'Summit Condominium school', 'CMC school Addis Ababa',
    'ብሉላይት አካዳሚ ታሪክ', 'ስለ ብሉላይት አካዳሚ', 'አዲስ አበባ ትምህርት ቤት',
  ],
  openGraph: {
    title: 'Our Story | Bluelight Academy',
    description: 'How Bluelight Academy was founded — nurturing young minds in Addis Ababa since 2024.',
    url: 'https://bluelight.edu.et/about/our-story',
    images: [{ url: '/icons/icon-512.png', width: 512, height: 512 }],
  },
  alternates: { canonical: 'https://bluelight.edu.et/about/our-story' },
}

export default function OurStoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
