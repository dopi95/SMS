'use client'

import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { translations } from '@/lib/translations'

export default function OurStoryPage() {
  const { currentLang } = useLanguage()
  const t = translations[currentLang]

  const chapters = [
    { title: t.storyPageChapter1Title, text: t.storyPageChapter1, num: '01' },
    { title: t.storyPageChapter2Title, text: t.storyPageChapter2, num: '02' },
    { title: t.storyPageChapter3Title, text: t.storyPageChapter3, num: '03' },
  ]

  const stats = [
    { label: t.storyPageFoundedLabel,    value: t.storyPageFoundedYear },
    { label: t.storyPageProgramsLabel,   value: t.storyPageProgramsValue },
    { label: t.storyPageDedicationLabel, value: t.storyPageDedicationValue },
  ]

  return (
    <main className="bg-white">

      {/* ── Hero ── */}
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
            {t.storyPageHero}
          </h1>
          <p className="text-white/80 text-sm sm:text-base lg:text-lg max-w-xl mx-auto leading-7 px-2">
            {t.storyPageHeroSub}
          </p>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 -mt-6 sm:-mt-8 relative z-10 mb-12 sm:mb-20">
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-2 sm:gap-6">
          {stats.map(s => (
            <div key={s.label} className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-3 sm:p-6 text-center">
              <div className="text-base sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-0.5 sm:mb-1 leading-tight">
                {s.value}
              </div>
              <div className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wide leading-tight">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Chapters ── */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 mb-12 sm:mb-20">
        <div className="max-w-3xl mx-auto flex flex-col gap-8 sm:gap-14">
          {chapters.map((ch) => (
            <div key={ch.num} className="flex gap-4 sm:gap-8 items-start">
              <div className="flex-shrink-0 w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-md mt-0.5">
                <span className="text-white text-[10px] sm:text-sm font-bold">{ch.num}</span>
              </div>
              <div className="flex-1">
                <h2 className="text-base sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2 sm:mb-3 leading-snug">{ch.title}</h2>
                <div className="w-7 sm:w-8 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full mb-2 sm:mb-3" />
                <p className="text-sm sm:text-base text-gray-500 leading-7">{ch.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CEO Message ── */}
      <section className="bg-gradient-to-br from-slate-50 to-blue-50 py-12 sm:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">

            <div className="text-center mb-8 sm:mb-10">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-3 sm:mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                {currentLang === 'en' ? 'From the Founder' : 'ከመስራቹ'}
              </span>
              <h2 className="text-xl sm:text-3xl lg:text-4xl font-bold text-gray-900 px-2">
                <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  {currentLang === 'en' ? 'A Message from Our Founder & CEO' : 'የመስራቹ መልዕክት'}
                </span>
              </h2>
              <div className="w-14 sm:w-16 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 mx-auto rounded-full mt-3 sm:mt-4" />
            </div>

            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-md border border-gray-100 p-5 sm:p-8 lg:p-10 relative overflow-hidden">
              {/* Decorative quote */}
              <div className="absolute top-2 right-4 sm:top-4 sm:right-6 text-6xl sm:text-8xl font-serif text-blue-100 leading-none select-none pointer-events-none">&rdquo;</div>

              <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-7 sm:leading-8 lg:leading-9 italic relative z-10 mb-6 sm:mb-8">
                &ldquo;{currentLang === 'en'
                  ? "Dear Parents and Guardians, it is with great pride and deep gratitude that I welcome you to Bluelight Academy. Building this school was not just a professional decision — it was a calling. I have always believed that the foundation we lay in a child's earliest years shapes everything that follows. Every classroom, every teacher, and every moment at Bluelight Academy has been designed with one purpose: to give your child the best possible start in life. We do not simply teach — we nurture, we inspire, and we celebrate every child's unique journey. To the families who have placed their trust in us, I want you to know that your child is not just a student here — they are part of our family. I personally commit to upholding the highest standards of care, learning, and excellence every single day. Together, let us illuminate the path for the next generation."
                  : 'የማዘነው ወላጅዎች እና አሳዳጂዎች፣ ብሉላይት አካዳሚን በዘረተው ሴረት እና በካህነት አክብሮት እየገበት። ይህንን ትምህርት ቤት መገንባት ጥሪ ነበር። የልጁን ቅድሚያ ዓመታት የሚሰሩትን ሁሉም ነገር ይቀርጣል። እያንዳንዱ ክፍል፣ እያንዳንዱ አስተማሪ እና እያንዳንዱ ቀን በአንድ ዓላማ ተደርግቷል — ልጅዎ በሕይወቱ ምርጥ ጅምር እንዲኖረው። ልጃቸውን ለእኛ ያሳደጉ ወላጅዎች፣ ልጃቸው እዚህ ብቻ ተማሪ አይደለም — የቤተሰባችን አካል ነው። አብረን ለሚቀጥለው ትውልድ መንገድ እናብራ።'
                }&rdquo;
              </p>

              {/* Signature */}
              <div className="flex items-center gap-3 sm:gap-4 pt-4 sm:pt-5 border-t border-gray-100">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-md">
                  <span className="text-white font-bold text-base sm:text-lg">Y</span>
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-sm sm:text-base lg:text-lg leading-tight">Yenealem Atalay</div>
                  <div className="text-[11px] sm:text-sm text-blue-600 font-medium mt-0.5">
                    {currentLang === 'en' ? 'Founder & CEO, Bluelight Academy' : 'መስራች እና ዋና ስራ አስፈፃሚ፣ ብሉላይት አካዳሚ'}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="bg-white py-12 sm:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
              <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                {t.storyPageTeamTitle}
              </span>
            </h2>
            <div className="w-14 sm:w-16 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 mx-auto rounded-full mt-3 sm:mt-4" />
          </div>
          <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
            {t.storyPageValues.map((v, i) => (
              <div key={i} className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-center gap-3 mb-2 sm:mb-3">
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex-shrink-0" />
                  <h3 className="font-bold text-gray-900 text-sm sm:text-base lg:text-lg">{v.title}</h3>
                </div>
                <p className="text-xs sm:text-sm lg:text-base text-gray-500 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-gradient-to-r from-blue-600 to-cyan-500 py-12 sm:py-16 text-center relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/10 rounded-full pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10">
          <p className="text-white/70 text-xs sm:text-sm uppercase tracking-widest mb-2 sm:mb-3">{t.heroMotto}</p>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-5 sm:mb-6">
            {currentLang === 'en' ? 'Ready to join our family?' : 'ለቤተሰባችን ለመቀላቀል ዝግጁ ነዎት?'}
          </h2>
          <Link
            href="https://bluelight.edu.et/registrationform"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 bg-white text-blue-600 font-semibold rounded-full shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 text-sm"
          >
            {t.getStarted}
          </Link>
        </div>
      </section>

    </main>
  )
}
