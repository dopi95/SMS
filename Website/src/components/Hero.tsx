'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { translations } from '@/lib/translations'

export default function Hero() {
  const { currentLang } = useLanguage()
  const t = translations[currentLang]
  const isAm = currentLang === 'am'
  const [videoLoaded, setVideoLoaded] = useState(false)

  return (
    <section className="relative min-h-[calc(100vh-64px)] w-full flex items-center justify-center overflow-hidden py-12 sm:py-16 md:py-20 lg:py-24">
      {/* ── 1. Video Background (Crisp & Fully Visible) ── */}
      <div className="absolute inset-0 w-full h-full overflow-hidden z-0 bg-slate-950">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster="https://assets.mixkit.co/videos/36046/36046-thumb-360-0.jpg"
          onCanPlay={() => setVideoLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover object-center pointer-events-none transition-opacity duration-700 ${
            videoLoaded ? 'opacity-100' : 'opacity-90'
          }`}
        >
          <source
            src="https://assets.mixkit.co/videos/36046/36046-720.mp4"
            type="video/mp4"
          />
          <source
            src="https://assets.mixkit.co/videos/35954/35954-720.mp4"
            type="video/mp4"
          />
        </video>

        {/* Balanced slight blue tint: crystal clear video visibility with an elegant Bluelight Academy blue ambiance */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(135deg, rgba(8, 22, 52, 0.52) 0%, rgba(14, 42, 90, 0.30) 45%, rgba(6, 18, 42, 0.58) 100%)',
          }}
        />

        {/* Soft bottom edge transition into the following section */}
        <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none bg-gradient-to-t from-slate-950 to-transparent" />
      </div>

      {/* ── 4. Main Content (Center Aligned, Perfectly Responsive) ── */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center animate-slide-up">
        {/* Main Heading */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.12] mb-4 sm:mb-5 drop-shadow-[0_4px_16px_rgba(0,0,0,0.85)]">
          <span className="bg-gradient-to-r from-blue-300 via-cyan-300 to-sky-200 bg-clip-text text-transparent drop-shadow-sm">
            {t.heroTitle1}
          </span>{' '}
          <span className="text-white drop-shadow-md">
            {t.heroTitle2}
          </span>
        </h1>

        {/* Motto with Quotation */}
        <div className="flex items-center justify-center gap-2 mb-4 sm:mb-5">
          <span className="h-px w-6 sm:w-12 bg-gradient-to-r from-transparent to-cyan-400/80" />
          <p className="text-amber-300 sm:text-lg md:text-xl font-medium tracking-wide italic drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            &ldquo;{t.heroMotto}&rdquo;
          </p>
          <span className="h-px w-6 sm:w-12 bg-gradient-to-l from-transparent to-cyan-400/80" />
        </div>

        {/* Subtitle Description */}
        <p className="text-slate-100 text-sm sm:text-base md:text-lg max-w-xl sm:max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed font-normal drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">
          {t.heroSubtitle}
        </p>

        {/* CTA Buttons - Simple, side-by-side & responsive on mobile */}
        <div className="flex flex-row items-center justify-center gap-2 sm:gap-4 mb-8 sm:mb-12 max-w-sm sm:max-w-none mx-auto w-full px-2 sm:px-0">
          {/* Primary CTA: Register Now */}
          <Link
            href="https://admission.bluelight.edu.et/registrationform"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 sm:gap-2.5 px-3.5 sm:px-8 py-2.5 sm:py-3.5 bg-cyan-500 hover:bg-cyan-400 text-white font-semibold sm:font-bold rounded-full shadow-md sm:shadow-lg shadow-cyan-500/35 hover:shadow-cyan-400/45 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 text-xs sm:text-base group whitespace-nowrap"
          >
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 transition-transform group-hover:scale-110"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>{t.getStarted}</span>
            <span className="hidden xs:inline transition-transform group-hover:translate-x-1">→</span>
          </Link>

          {/* Secondary CTA: Contact Us */}
          <Link
            href="/contact"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 sm:gap-2.5 px-3.5 sm:px-8 py-2.5 sm:py-3.5 text-white font-semibold rounded-full border border-white/25 bg-white/10 hover:bg-white/20 backdrop-blur-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 text-xs sm:text-base group whitespace-nowrap"
          >
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-cyan-300 transition-transform group-hover:rotate-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span>{t.learnMore}</span>
          </Link>
        </div>

        {/* ── 5. Feature Highlights (No BG on mobile, pure clean responsive text) ── */}
        <div className="grid grid-cols-3 gap-2 sm:gap-6 max-w-lg mx-auto pt-4 sm:pt-6 border-t border-white/15">
          {/* Card 1: Programs */}
          <div className="p-1 sm:p-4 rounded-xl sm:rounded-2xl bg-transparent sm:bg-white/10 hover:bg-transparent sm:hover:bg-white/15 sm:backdrop-blur-md border-0 sm:border sm:border-white/15 transition-all text-center group">
            <div className="text-base sm:text-2xl font-extrabold text-white group-hover:text-cyan-300 transition-colors">
              KG1–KG3
            </div>
            <div className="text-[10px] sm:text-xs text-cyan-200/80 font-medium uppercase tracking-wider mt-0.5 sm:mt-1">
              {isAm ? 'የትምህርት ደረጃዎች' : 'Programs'}
            </div>
          </div>

          {/* Card 2: Founded */}
          <div className="p-1 sm:p-4 rounded-xl sm:rounded-2xl bg-transparent sm:bg-white/10 hover:bg-transparent sm:hover:bg-white/15 sm:backdrop-blur-md border-0 sm:border sm:border-white/15 transition-all text-center group">
            <div className="text-base sm:text-2xl font-extrabold text-white group-hover:text-cyan-300 transition-colors">
              2024
            </div>
            <div className="text-[10px] sm:text-xs text-cyan-200/80 font-medium uppercase tracking-wider mt-0.5 sm:mt-1">
              {isAm ? 'የተመሰረተበት' : 'Founded'}
            </div>
          </div>

          {/* Card 3: Care & Learning */}
          <div className="p-1 sm:p-4 rounded-xl sm:rounded-2xl bg-transparent sm:bg-white/10 hover:bg-transparent sm:hover:bg-white/15 sm:backdrop-blur-md border-0 sm:border sm:border-white/15 transition-all text-center group">
            <div className="text-base sm:text-2xl font-extrabold text-white group-hover:text-cyan-300 transition-colors">
              100%
            </div>
            <div className="text-[10px] sm:text-xs text-cyan-200/80 font-medium uppercase tracking-wider mt-0.5 sm:mt-1">
              {isAm ? 'ትጋትና ፍቅር' : 'Dedication'}
            </div>
          </div>
        </div>
      </div>

      {/* ── 6. Scroll Down Floating Indicator ── */}
      <a
        href="#about"
        aria-label="Scroll to about section"
        className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 text-white/50 hover:text-white transition-colors animate-bounce p-1 hidden sm:block"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </a>
    </section>
  )
}
