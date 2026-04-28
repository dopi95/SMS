'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { translations } from '@/lib/translations'

const SLIDES = [
  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1600&q=80',
  'https://images.unsplash.com/photo-1588072432836-e10032774350?w=1600&q=80',
  'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1600&q=80',
]

export default function Hero() {
  const { currentLang } = useLanguage()
  const t = translations[currentLang]
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % SLIDES.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  return (
    <section className="h-[calc(100vh-64px)] relative flex items-center overflow-hidden">

      {/* Slides */}
      {SLIDES.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 transition-opacity duration-1000"
          style={{ opacity: i === current ? 1 : 0 }}
        >
          <img
            src={src}
            alt={`Slide ${i + 1}`}
            className="w-full h-full object-cover object-center"
          />
        </div>
      ))}

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Content */}
      <div className="w-full px-5 sm:px-8 lg:px-12 relative z-10 animate-slide-up" style={{ animationFillMode: 'forwards' }}>
        <div className="max-w-2xl mx-auto text-center">

          {/* Badge */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs sm:text-sm font-medium mb-4 sm:mb-6 border border-white/25 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
            Est. 2024 · KG1 – KG3
          </span>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight mb-3 sm:mb-4 drop-shadow-md">
            <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">{t.heroTitle1}</span>{' '}
            <span>{t.heroTitle2}</span>
          </h1>

          {/* Motto */}
          <p className="text-blue-200 text-sm sm:text-base md:text-lg italic mb-3 sm:mb-4">
            &ldquo;{t.heroMotto}&rdquo;
          </p>

          {/* Subtitle */}
          <p className="text-white/75 text-xs sm:text-sm md:text-base max-w-md sm:max-w-xl mx-auto mb-6 sm:mb-8 leading-relaxed">
            {t.heroSubtitle}
          </p>

          {/* CTAs */}
          <div className="flex flex-row items-center justify-center gap-3 mb-6 sm:mb-10">
            <Link
              href="http://localhost:4500/registrationform"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 active:scale-95 transition-all duration-200 shadow-md text-sm whitespace-nowrap"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {t.getStarted}
            </Link>

            <button
              onClick={() => window.location.href = '/contact'}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-white font-semibold rounded-full border border-white/40 bg-white/10 hover:bg-white/20 backdrop-blur-sm active:scale-95 transition-all duration-200 text-sm whitespace-nowrap">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {t.learnMore}
            </button>
          </div>

          {/* Stats */}
          <div className="flex justify-center gap-6 sm:gap-10 pt-4 sm:pt-6 border-t border-white/20">
            {[
              { value: 'KG1–KG3', label: 'Programs' },
              { value: '2024', label: 'Founded' },
              { value: '100%', label: 'Dedication' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-base sm:text-xl font-bold text-white">{stat.value}</div>
                <div className="text-[10px] sm:text-xs text-white/50 uppercase tracking-wide mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Dot indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`transition-all duration-300 rounded-full ${
              i === current ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/40 hover:bg-white/70'
            }`}
          />
        ))}
      </div>

    </section>
  )
}
