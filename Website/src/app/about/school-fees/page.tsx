'use client'

import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { translations } from '@/lib/translations'

const CheckIcon = () => (
  <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
)

export default function SchoolFeesPage() {
  const { currentLang } = useLanguage()
  const t = translations[currentLang]

  return (
    <main className="bg-white">

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-blue-600 to-cyan-500 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12),transparent_60%)] pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-white" style={{ clipPath: 'ellipse(55% 100% at 50% 100%)' }} />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-28 sm:pt-20 sm:pb-32 text-center relative z-10">
          <Link href="/" className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-6 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {t.home}
          </Link>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-sm">
            {t.feesPageHero}
          </h1>
          <p className="text-white/80 text-base sm:text-lg max-w-xl mx-auto leading-7">
            {t.feesPageHeroSub}
          </p>
        </div>
      </section>

      {/* Year badge + unified fee card */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-10 mb-14 sm:mb-20">
        <div className="max-w-3xl mx-auto">

          {/* Academic year badge */}
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-semibold">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {t.feesPageYearLabel}: {t.feesPageYear}
            </span>
          </div>

          {/* Single monthly fee highlight */}
          <div className="bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl sm:rounded-3xl p-7 sm:p-10 text-white text-center shadow-2xl mb-6 relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/10 rounded-full pointer-events-none" />
            <p className="text-white/70 text-xs sm:text-sm uppercase tracking-widest mb-2 relative">{t.feesPageMonthlyLabel}</p>
            <div className="text-5xl sm:text-6xl lg:text-7xl font-bold relative mb-1">2,700</div>
            <div className="text-white/80 text-lg sm:text-xl font-medium relative mb-4">ETB / month</div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 border border-white/20 text-white/90 text-xs sm:text-sm relative">
              All Levels · KG1 – KG3
            </div>
          </div>

          {/* Per-level cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {t.feesPagePrograms.map((p) => (
              <div key={p.level} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                <div className={`bg-gradient-to-r ${p.color} px-5 py-3 flex items-center justify-between`}>
                  <span className="text-white font-bold text-lg">{p.level}</span>
                  <span className="text-white/80 text-xs">{p.age}</span>
                </div>
                <div className="px-5 py-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 uppercase tracking-wide">{t.feesPageRegLabel}</span>
                    <span className="text-sm font-semibold text-gray-700">{p.registration}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 uppercase tracking-wide">{t.feesPageMonthlyLabel}</span>
                    <span className={`text-sm font-bold bg-gradient-to-r ${p.color} bg-clip-text text-transparent`}>{p.monthly}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Note */}
          <p className="text-center text-xs sm:text-sm text-gray-400 mt-5 leading-6">
            * {t.feesPageNote}
          </p>

          {/* Family Discount Banner */}
          <div className="mt-6 relative bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl p-5 sm:p-6 text-white overflow-hidden">
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full pointer-events-none" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/10 rounded-full pointer-events-none" />
            <div className="relative flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-base sm:text-lg">
                    {currentLang === 'en' ? 'Family Discount' : 'የቤተሰብ ቅናሽ'}
                  </span>
                  <span className="bg-white text-orange-500 text-xs font-bold px-2 py-0.5 rounded-full">10% OFF</span>
                </div>
                <p className="text-white/90 text-xs sm:text-sm leading-6">
                  {currentLang === 'en'
                    ? '2 or more students from the same family enrolled at Bluelight Academy receive a 10% discount on monthly fees for each child.'
                    : 'ከአንድ ቤተሰብ 2 ወይም ከዚያ በላይ ተማሪዎች ሲመዘገቡ፣ ለእያንዳንዱ ልጅ 10% የወር ክፍያ ቅናሽ ያገኛሉ።'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What's included */}
      <section className="bg-gradient-to-br from-slate-50 to-blue-50 py-14 sm:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  {t.feesIncluded}
                </span>
              </h2>
              <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 mx-auto rounded-full mt-4" />
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 flex flex-col gap-4">
              {t.feesIncludedItems.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckIcon />
                  <span className="text-sm sm:text-base text-gray-600 leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 sm:py-20">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm sm:text-base text-gray-500 mb-6">{t.feesPageContact}</p>
          <a
            href={`tel:${t.locationPhone}`}
            className="inline-flex items-center gap-2 px-7 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-full shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            {t.feesPageContactBtn}
          </a>
        </div>
      </section>

    </main>
  )
}
