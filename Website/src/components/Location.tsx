'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { translations } from '@/lib/translations'

// Real coordinates — Summit Condominium, Block 50, near LG College, Addis Ababa
const LAT  = 8.9828257
const LNG  = 38.8608926
const MAPS_URL = 'https://www.google.com/maps/place/Bluelight+Academy/@8.982831,38.8583177,17z/data=!3m1!4b1!4m6!3m5!1s0x164b9b007408752d:0x6f3a94420fe41a9f!8m2!3d8.9828257!4d38.8608926!16s%2Fg%2F11ww92j9x4?entry=tts&g_ep=EgoyMDI2MDQyMi4wIPu8ASoASAFQAw%3D%3D&skid=e3ae8f55-1be3-4f30-a161-d8383cb01bf6'

// Google Maps embed — shows the real satellite/road map at the exact pin
const GMAPS_EMBED = `https://maps.google.com/maps?q=${LAT},${LNG}&z=17&output=embed`

const InfoRow = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <div className="flex items-start gap-3">
    <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
      {icon}
    </span>
    <span className="text-sm sm:text-base text-gray-600 leading-snug pt-1.5 whitespace-pre-line">{text}</span>
  </div>
)

export default function Location() {
  const { currentLang } = useLanguage()
  const t = translations[currentLang]

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-white relative overflow-hidden">
      <div className="absolute top-0 left-0 w-72 h-72 bg-blue-50/60 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Header */}
        <div className="text-center mb-10 sm:mb-12">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-semibold uppercase tracking-widest mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Location
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              {t.locationTitle}
            </span>
          </h2>
          <p className="max-w-xl mx-auto text-sm sm:text-base text-gray-500 leading-7">
            {t.locationSubtitle}
          </p>
          <div className="w-16 sm:w-24 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 mx-auto rounded-full mt-6" />
        </div>

        {/* Card */}
        <div className="max-w-5xl mx-auto rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl border border-gray-100 bg-white">

          {/* Map — click opens Google Maps */}
          <a
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group block relative overflow-hidden"
            aria-label={t.locationOpenMap}
          >
            <iframe
              src={GMAPS_EMBED}
              className="w-full h-[220px] sm:h-[300px] lg:h-[360px] border-0 pointer-events-none"
              title="Bluelight Academy location"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-blue-900/0 group-hover:bg-blue-900/20 transition-all duration-300 flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 flex items-center gap-2 px-5 py-2.5 bg-white rounded-full shadow-lg text-blue-700 font-semibold text-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {t.locationOpenMap}
              </span>
            </div>
          </a>

          {/* Info strip */}
          <div className="p-5 sm:p-7 lg:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 border-t border-gray-100">

            <InfoRow
              text={t.locationAddress}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />

            <InfoRow
              text={t.locationPhone}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              }
            />

            <InfoRow
              text={t.locationEmail}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              }
            />



          </div>

          {/* CTA button */}
          <div className="px-5 sm:px-7 lg:px-8 pb-5 sm:pb-7 lg:pb-8">
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-semibold rounded-full shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {t.locationOpenMap}
            </a>
          </div>

        </div>
      </div>
    </section>
  )
}
