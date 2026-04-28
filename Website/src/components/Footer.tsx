'use client'

import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { translations } from '@/lib/translations'

const MAPS_URL = 'https://maps.app.goo.gl/ikQjq35ZC1Pb1PhZA'

export default function Footer() {
  const { currentLang } = useLanguage()
  const t = translations[currentLang]

  return (
    <footer className="bg-gray-950 text-white">

      {/* Main footer */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-3 mb-4">
              <img src="/img/logo.png" alt="Bluelight Academy" className="w-12 h-10 object-contain" />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                {t.siteName}
              </span>
            </Link>
            <p className="text-gray-400 text-sm leading-7 max-w-sm mb-6">
              {t.footerTagline}
            </p>
            {/* Motto badge */}
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400 text-xs italic">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
              &ldquo;Be the light, lead the way!&rdquo;
            </span>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-widest mb-5">
              {t.footerQuickLinks}
            </h4>
            <ul className="space-y-3">
              {[
                { label: t.home,        href: '/' },
                { label: t.about,       href: '/#about' },
                { label: t.facilities,  href: '/facilities' },
                { label: t.schoolFees,  href: '/about/school-fees' },
                { label: t.getStarted,  href: 'http://localhost:4500/registrationform' },
              ].map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-gray-400 hover:text-white text-sm transition-colors duration-200 flex items-center gap-2 group"
                  >
                    <span className="w-1 h-1 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-widest mb-5">
              {t.footerContact}
            </h4>
            <ul className="space-y-4">
              <li>
                <a
                  href={MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 text-gray-400 hover:text-white text-sm transition-colors duration-200 group"
                >
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="whitespace-pre-line">{t.locationAddress}</span>
                </a>
              </li>
              <li>
                <a
                  href={`tel:${t.locationPhone}`}
                  className="flex items-center gap-3 text-gray-400 hover:text-white text-sm transition-colors duration-200"
                >
                  <svg className="w-4 h-4 flex-shrink-0 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {t.locationPhone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${t.locationEmail}`}
                  className="flex items-center gap-3 text-gray-400 hover:text-white text-sm transition-colors duration-200"
                >
                  <svg className="w-4 h-4 flex-shrink-0 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {t.locationEmail}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${t.locationEmail2}`}
                  className="flex items-center gap-3 text-gray-400 hover:text-white text-sm transition-colors duration-200"
                >
                  <svg className="w-4 h-4 flex-shrink-0 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {t.locationEmail2}
                </a>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-white/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-gray-500 text-xs">{t.footerRights}</p>
          <p className="text-gray-600 text-xs">{t.footerMadeWith}</p>
        </div>
      </div>

    </footer>
  )
}
