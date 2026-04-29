import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact Us | Bluelight Academy Addis Ababa | ያግኙን',
  description: 'Contact Bluelight Academy — the best kindergarten in Addis Ababa. Located at Summit Condominium, 3rd Gate, Block 50, near LG College. Call +251945409940. ብሉላይት አካዳሚን ያግኙ — ሰሚት ኮንዶሚኒየም፣ አዲስ አበባ።',
  keywords: [
    'contact Bluelight Academy', 'Bluelight Academy phone', 'kindergarten Addis Ababa contact',
    'Summit Condominium school contact', 'CMC school phone Ethiopia', 'LG College school',
    'ብሉላይት አካዳሚ ያግኙ', 'ብሉላይት አካዳሚ ስልክ', 'ሰሚት ትምህርት ቤት',
  ],
  openGraph: {
    title: 'Contact Us | Bluelight Academy',
    description: 'Get in touch with Bluelight Academy. Summit Condominium, Addis Ababa. +251945409940.',
    url: 'https://bluelight.edu.et/contact',
    images: [{ url: '/icons/icon-512.png', width: 512, height: 512 }],
  },
  alternates: { canonical: 'https://bluelight.edu.et/contact' },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
