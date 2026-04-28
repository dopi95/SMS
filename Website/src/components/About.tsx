'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { translations } from '@/lib/translations'

/* ── Professional inline SVG icons ── */
const VisionIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    {/* Telescope / far-sight */}
    <circle cx="12" cy="12" r="3" />
    <path d="M3 7l4.5 2.5M21 7l-4.5 2.5" />
    <path d="M5.5 9.5L3 17h4l1.5-4" />
    <path d="M18.5 9.5L21 17h-4l-1.5-4" />
    <path d="M9.5 13.5L8 17h8l-1.5-3.5" />
    <line x1="12" y1="15" x2="12" y2="19" />
    <line x1="9" y1="19" x2="15" y2="19" />
  </svg>
)

const MissionIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    {/* Compass */}
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <path d="M16.5 7.5l-2.8 4.8-4.8 2.8 2.8-4.8 4.8-2.8z" fill="currentColor" stroke="none" opacity="0.9" />
    <line x1="12" y1="3" x2="12" y2="5" />
    <line x1="12" y1="19" x2="12" y2="21" />
    <line x1="3" y1="12" x2="5" y2="12" />
    <line x1="19" y1="12" x2="21" y2="12" />
  </svg>
)

const ValuesIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    {/* Shield with star */}
    <path d="M12 2l7 3v5c0 4.5-3 8.5-7 10C5 18.5 2 14.5 2 10V5l7-3z" />
    <path d="M12 7l1.2 2.5H16l-2.2 1.6.8 2.6L12 12.2l-2.6 1.5.8-2.6L8 9.5h2.8L12 7z" fill="currentColor" stroke="none" opacity="0.9" />
  </svg>
)

const ProgramsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    {/* Graduation cap */}
    <path d="M12 3L2 8l10 5 10-5-10-5z" />
    <path d="M6 10.5v5c0 2 2.7 3.5 6 3.5s6-1.5 6-3.5v-5" />
    <line x1="20" y1="8" x2="20" y2="14" />
    <circle cx="20" cy="14.5" r="0.8" fill="currentColor" stroke="none" />
  </svg>
)

const cards = [
  {
    key: 'vision' as const,
    Icon: VisionIcon,
    gradient: 'from-amber-400 to-orange-500',
    ring: 'group-hover:ring-amber-300',
    accent: 'bg-amber-50 group-hover:bg-amber-100',
    bar: 'from-amber-400 to-orange-500',
  },
  {
    key: 'mission' as const,
    Icon: MissionIcon,
    gradient: 'from-blue-500 to-cyan-500',
    ring: 'group-hover:ring-blue-300',
    accent: 'bg-blue-50 group-hover:bg-blue-100',
    bar: 'from-blue-500 to-cyan-500',
  },
  {
    key: 'values' as const,
    Icon: ValuesIcon,
    gradient: 'from-violet-500 to-purple-600',
    ring: 'group-hover:ring-violet-300',
    accent: 'bg-violet-50 group-hover:bg-violet-100',
    bar: 'from-violet-500 to-purple-600',
  },
]

export default function About() {
  const { currentLang } = useLanguage()
  const t = translations[currentLang]

  const cardLabels = {
    vision:  { title: t.visionTitle,  text: t.visionText  },
    mission: { title: t.missionTitle, text: t.missionText },
    values:  { title: t.valuesTitle,  text: t.valuesText  },
  }

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-slate-50 to-blue-50 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-blue-100/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-100/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Header */}
        <div className="text-center mb-10 sm:mb-14 lg:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 mb-5 sm:mb-7">
            <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              {t.aboutTitle}
            </span>
          </h2>
          <div className="max-w-3xl lg:max-w-5xl mx-auto px-1">
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-7 sm:leading-8 lg:leading-9 font-normal text-left sm:text-center">
              {t.aboutStoryText}
            </p>
          </div>
          <div className="w-16 sm:w-24 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 mx-auto rounded-full mt-7 sm:mt-10" />
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6 lg:gap-8 mb-8 sm:mb-10 lg:mb-12">
          {cards.map(({ key, Icon, gradient, ring, accent, bar }) => (
            <div
              key={key}
              className="about-card group relative bg-white rounded-2xl p-5 sm:p-6 lg:p-8 shadow-md border border-gray-100 cursor-default overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2"
            >
              {/* Animated top accent bar */}
              <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${bar} scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left rounded-t-2xl`} />

              {/* Icon */}
              <div className="mb-5">
                <div className={`card-icon-wrap w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg ring-2 ring-transparent ${ring} transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                  <Icon />
                </div>
              </div>

              {/* Title */}
              <h4 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 mb-2 tracking-tight">
                {cardLabels[key].title}
              </h4>

              {/* Divider */}
              <div className={`w-8 h-0.5 bg-gradient-to-r ${bar} rounded-full mb-3 transition-all duration-300 group-hover:w-14`} />

              {/* Text */}
              <p className="text-sm sm:text-base text-gray-500 leading-relaxed">
                {cardLabels[key].text}
              </p>

              {/* Subtle bg glow on hover */}
              <div className={`absolute inset-0 rounded-2xl ${accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10`} />
            </div>
          ))}
        </div>

        {/* Programs banner */}
        <div className="relative bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 text-white shadow-2xl overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full pointer-events-none" />
          <div className="absolute -bottom-10 -left-6 w-28 h-28 bg-white/10 rounded-full pointer-events-none" />

          <div className="relative flex items-center gap-4 mb-4 sm:mb-6">
            <div className="card-icon-wrap w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ring-white/30">
              <ProgramsIcon />
            </div>
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold">{t.programsTitle}</h3>
          </div>
          <p className="relative text-sm sm:text-base lg:text-lg text-blue-50 leading-7 sm:leading-8">
            {t.programsText}
          </p>
        </div>

      </div>
    </section>
  )
}
