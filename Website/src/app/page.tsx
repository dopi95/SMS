'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { translations } from '@/lib/translations'
import Hero from '@/components/Hero'
import About from '@/components/About'

export default function Home() {
  return (
    <>
      <Hero />
      <About />
    </>
  )
}