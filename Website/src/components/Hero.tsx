'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { translations } from '@/lib/translations'

export default function Hero() {
  const { currentLang } = useLanguage()
  const t = translations[currentLang]

  return (
    <section className="relative min-h-[600px] md:min-h-[700px] lg:min-h-[800px] flex items-start bg-gradient-to-br from-blue-50 via-blue-100 to-sky-100 overflow-hidden mb-16">
      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-sky-200/30 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 md:pt-32 pb-12 md:pb-16">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Content */}
          <div className="relative z-10 text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-4 leading-tight">
              <span className="text-blue-600">{t.heroTitle1}</span>
              <br />
              <span className="text-gray-800">{t.heroTitle2}</span>
            </h1>
            
            <p className="text-lg sm:text-xl md:text-2xl text-blue-700 font-medium mb-6 italic">
              "{t.heroMotto}"
            </p>
            
            <p className="text-base sm:text-lg text-gray-700 mb-8 max-w-xl mx-auto lg:mx-0">
              {t.heroSubtitle}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button className="px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl">
                {t.getStarted}
              </button>
              <button className="px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg border-2 border-blue-600 hover:bg-blue-50 transition-all duration-300">
                {t.learnMore}
              </button>
            </div>
          </div>

          {/* Education Image */}
          <div className="relative z-10 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-md lg:max-w-lg">
              <div className="absolute inset-0 bg-blue-300/20 rounded-full blur-2xl"></div>
              <svg className="relative w-full h-auto" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Book */}
                <rect x="150" y="200" width="200" height="180" rx="8" fill="#3B82F6" />
                <rect x="150" y="200" width="100" height="180" rx="8" fill="#2563EB" />
                <line x1="250" y1="200" x2="250" y2="380" stroke="#1E40AF" strokeWidth="3" />
                
                {/* Graduation Cap */}
                <path d="M250 120 L400 170 L250 220 L100 170 Z" fill="#1E40AF" />
                <rect x="240" y="220" width="20" height="80" fill="#1E40AF" />
                <circle cx="250" cy="310" r="8" fill="#FCD34D" />
                <path d="M380 170 L380 240 Q380 260 360 270 Q340 280 250 280 Q160 280 140 270 Q120 260 120 240 L120 170" stroke="#1E40AF" strokeWidth="8" fill="none" />
                
                {/* Decorative Elements */}
                <circle cx="80" cy="100" r="15" fill="#60A5FA" opacity="0.6" />
                <circle cx="420" cy="300" r="20" fill="#93C5FD" opacity="0.6" />
                <circle cx="100" cy="350" r="12" fill="#DBEAFE" opacity="0.8" />
                <circle cx="400" cy="120" r="18" fill="#BFDBFE" opacity="0.7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}