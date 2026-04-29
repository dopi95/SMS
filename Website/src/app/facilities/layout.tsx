import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Facilities | Bluelight Academy — Modern Kindergarten Addis Ababa | መገልገያዎች',
  description: 'Explore Bluelight Academy\'s world-class facilities — bright classrooms, outdoor play area, first aid room, music room and more. Best kindergarten at Summit Condominium, Addis Ababa. የብሉላይት አካዳሚ መገልገያዎች።',
  keywords: [
    'Bluelight Academy facilities', 'kindergarten facilities Addis Ababa', 'best school facilities Ethiopia',
    'modern kindergarten Ethiopia', 'safe school Addis Ababa', 'Summit school facilities',
    'ብሉላይት አካዳሚ መገልገያዎች', 'አዲስ አበባ ትምህርት ቤት', 'ምርጥ ትምህርት ቤት',
  ],
  openGraph: {
    title: 'Facilities | Bluelight Academy',
    description: 'Modern, safe and stimulating facilities at Bluelight Academy, Addis Ababa.',
    url: 'https://bluelight.edu.et/facilities',
    images: [{ url: '/icons/icon-512.png', width: 512, height: 512 }],
  },
  alternates: { canonical: 'https://bluelight.edu.et/facilities' },
}

export default function FacilitiesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
