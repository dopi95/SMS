import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'School Fees 2018 E.C | Bluelight Academy Addis Ababa | የትምህርት ክፍያ',
  description: 'Bluelight Academy school fees for 2018 E.C. Transparent pricing for KG1, KG2, KG3 — 2,700 ETB/month. Family discount available. Located at Summit Condominium, Addis Ababa. የብሉላይት አካዳሚ የትምህርት ክፍያ 2018 ዓ.ም።',
  keywords: [
    'Bluelight Academy fees', 'kindergarten fees Addis Ababa', 'school fees Ethiopia 2024',
    'KG fees Addis Ababa', 'affordable kindergarten Ethiopia', 'Summit school fees',
    'ብሉላይት አካዳሚ ክፍያ', 'የትምህርት ክፍያ አዲስ አበባ', 'KG ክፍያ',
  ],
  openGraph: {
    title: 'School Fees | Bluelight Academy',
    description: 'Transparent school fees for KG1–KG3 at Bluelight Academy, Addis Ababa. 2,700 ETB/month.',
    url: 'https://bluelight.edu.et/about/school-fees',
    images: [{ url: '/icons/icon-512.png', width: 512, height: 512 }],
  },
  alternates: { canonical: 'https://bluelight.edu.et/about/school-fees' },
}

export default function SchoolFeesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
