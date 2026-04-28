'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { translations } from '@/lib/translations'
import Hero from '@/components/Hero'
import About from '@/components/About'
import StudentLife from '@/components/StudentLife'
import FAQ from '@/components/FAQ'
import Location from '@/components/Location'

export default function Home() {
  return (
    <>
      <Hero />
      <About />
      <StudentLife />
      <FAQ />
      <Location />
    </>
  )
}