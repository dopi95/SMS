'use client'

import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { translations } from '@/lib/translations'

const icons: Record<string, React.ReactNode> = {
  classroom: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <path d="M9 22V12h6v10" />
    </svg>
  ),
  outdoor: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3" />
      <path d="M12 2v1M12 13v9M4.22 4.22l.7.7M18.36 5.64l.7-.7M2 12h1M21 12h1M6 18l1.5-1.5M16.5 16.5L18 18" />
    </svg>
  ),
  reading: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  art: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.1 0 2-.9 2-2v-.5c0-.55-.22-1.05-.59-1.41-.36-.36-.59-.86-.59-1.41 0-1.1.9-2 2-2h2c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8z" />
      <circle cx="8.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="12.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  safety: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l7 3v5c0 4.5-3 8.5-7 10C5 18.5 2 14.5 2 10V5l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  restroom: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2a2 2 0 100 4 2 2 0 000-4zM18 2a2 2 0 100 4 2 2 0 000-4z" />
      <path d="M4 8h4l1 6H5l1 8M20 8h-4l-1 6h4l-1 8M14 8v6" />
    </svg>
  ),
}

const gradients = [
  'from-blue-500 to-cyan-500',
  'from-violet-500 to-purple-600',
  'from-amber-400 to-orange-500',
  'from-emerald-400 to-teal-500',
  'from-rose-400 to-pink-500',
  'from-indigo-500 to-blue-600',
]

export default function FacilitiesPage() {
  const { currentLang } = useLanguage()
  const t = translations[currentLang]

  return (
    <main className="bg-white">

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-blue-600 to-cyan-500 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12),transparent_60%)] pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-12 sm:h-16 bg-white" style={{ clipPath: 'ellipse(55% 100% at 50% 100%)' }} />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24 sm:pt-20 sm:pb-32 text-center relative z-10">
          <Link href="/" className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-xs sm:text-sm mb-5 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {t.home}
          </Link>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white mb-3 sm:mb-4 drop-shadow-sm">
            {t.facilitiesHero}
          </h1>
          <p className="text-white/80 text-sm sm:text-base lg:text-lg max-w-xl mx-auto leading-7 px-2">
            {t.facilitiesHeroSub}
          </p>
        </div>
      </section>

      {/* Facilities Grid */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {t.facilitiesList.map((f, i) => (
            <div
              key={i}
              className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 overflow-hidden"
            >
              {/* Top accent bar */}
              <div className={`h-1 bg-gradient-to-r ${gradients[i % gradients.length]} scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`} />

              <div className="p-5 sm:p-6">
                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradients[i % gradients.length]} flex items-center justify-center text-white shadow-md mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                  {icons[f.icon]}
                </div>
                <h3 className="font-bold text-gray-900 text-base sm:text-lg mb-2">{f.title}</h3>
                <div className={`w-7 h-0.5 bg-gradient-to-r ${gradients[i % gradients.length]} rounded-full mb-3 group-hover:w-12 transition-all duration-300`} />
                <p className="text-sm sm:text-base text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-blue-600 to-cyan-500 py-12 sm:py-16 text-center relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/10 rounded-full pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-3 sm:mb-4">
            {currentLang === 'en' ? 'Come see it for yourself' : 'እራስዎ ይጎብኙ'}
          </h2>
          <p className="text-white/75 text-sm sm:text-base mb-6 max-w-md mx-auto">
            {currentLang === 'en' ? 'Schedule a visit and experience our facilities in person.' : 'ጉብኝት ይያዙ እና መገልገያዎቻችንን በአካል ይመልከቱ።'}
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 bg-white text-blue-600 font-semibold rounded-full shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 text-sm"
          >
            {t.contact}
          </Link>
        </div>
      </section>

    </main>
  )
}
