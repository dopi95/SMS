'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { translations } from '@/lib/translations'

const MAPS_URL = 'https://maps.app.goo.gl/ikQjq35ZC1Pb1PhZA'

const SOCIALS = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/bluelight__academy?igsh=MTg1emk3MDVlY2VzOA==',
    color: '#E1306C',
    icon: (
      <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
  },
  {
    label: 'TikTok',
    href: 'https://www.tiktok.com/@bluelight__academy?_r=1&_t=ZS-95v2geW0HUC',
    color: '#010101',
    icon: (
      <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z"/>
      </svg>
    ),
  },
  {
    label: 'YouTube',
    href: 'https://youtube.com/@bluelightacademy001?si=WjRWO_n615cS7us8',
    color: '#FF0000',
    icon: (
      <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
  },
]

/* ── Animated Success Popup ── */
function SuccessPopup({ onClose, lang }: { onClose: () => void; lang: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: 'fadeIn 0.3s ease' }}
      />

      {/* Card */}
      <div
        className="relative bg-white rounded-3xl shadow-2xl p-8 sm:p-10 max-w-sm w-full text-center z-10"
        style={{ animation: 'popIn 0.4s cubic-bezier(0.22,1,0.36,1)' }}
      >
        {/* Animated check circle */}
        <div className="flex items-center justify-center mb-5">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 opacity-20 animate-ping" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-200">
              <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                style={{ animation: 'drawCheck 0.5s ease 0.3s both' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
          {lang === 'en' ? 'Message Sent!' : 'መልዕክት ተልኳል!'}
        </h3>
        <p className="text-sm sm:text-base text-gray-500 leading-6 mb-6">
          {lang === 'en'
            ? 'Thank you for reaching out. We will get back to you as soon as possible.'
            : 'ስለ ደወሉልን እናመሰግናለን። በቅርቡ እናገኝዎታለን።'}
        </p>

        <button
          onClick={onClose}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all duration-200 text-sm"
        >
          {lang === 'en' ? 'Done' : 'ዝጋ'}
        </button>
      </div>
    </div>
  )
}

export default function ContactPage() {
  const { currentLang } = useLanguage()
  const t = translations[currentLang]

  const [form, setForm]       = useState({ name: '', phone: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      setForm({ name: '', phone: '', message: '' })
      setShowPopup(true)
    } catch {
      setError(currentLang === 'en' ? 'Something went wrong. Please try again.' : 'ስህተት ተፈጥሯል። እንደገና ይሞክሩ።')
    } finally {
      setLoading(false)
    }
  }

  const contactItems = [
    {
      label: t.contactPhone,
      value: t.locationPhone,
      href: `tel:${t.locationPhone}`,
      gradient: 'from-blue-500 to-cyan-500',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      ),
    },
    {
      label: t.contactEmail,
      value: t.locationEmail,
      href: `mailto:${t.locationEmail}`,
      gradient: 'from-violet-500 to-purple-600',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      label: t.contactAddress,
      value: t.locationAddress,
      href: MAPS_URL,
      gradient: 'from-amber-400 to-orange-500',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ]

  return (
    <main className="bg-white">

      {/* Success Popup */}
      {showPopup && <SuccessPopup lang={currentLang} onClose={() => setShowPopup(false)} />}

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
            {t.contactHero}
          </h1>
          <p className="text-white/80 text-sm sm:text-base lg:text-lg max-w-xl mx-auto leading-7 px-2">
            {t.contactHeroSub}
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

          {/* Contact Info */}
          <div className="flex flex-col gap-4">
            {contactItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target={item.href.startsWith('http') ? '_blank' : undefined}
                rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="group flex items-start gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 p-4 sm:p-5"
              >
                <div className={`flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform duration-300`}>
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">{item.label}</p>
                  <p className="text-sm sm:text-base font-semibold text-gray-800 whitespace-pre-line leading-snug">{item.value}</p>
                </div>
                <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-400 flex-shrink-0 mt-1 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </a>
            ))}

            {/* Map preview */}
            <a href={MAPS_URL} target="_blank" rel="noopener noreferrer"
              className="group relative rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 mt-2"
              style={{ height: 180 }}
            >
              <iframe
                src="https://maps.google.com/maps?q=8.9828257,38.8608926&z=17&output=embed"
                className="w-full h-full border-0 pointer-events-none"
                title="Bluelight Academy location"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <div className="absolute inset-0 bg-blue-900/0 group-hover:bg-blue-900/20 transition-all duration-300 flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0 flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow text-blue-700 font-semibold text-xs sm:text-sm">
                  {t.locationOpenMap}
                </span>
              </div>
            </a>

            {/* Social Media */}
            <div className="pt-1">
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">Follow Us</p>
              <div className="flex items-center gap-4">
                {SOCIALS.map(s => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                    className="group hover:scale-110 active:scale-95 transition-all duration-200"
                  >
                    <span className="block transition-colors duration-200 group-hover:text-blue-500" style={{ color: s.color }}>
                      {s.icon}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-gray-100 shadow-sm">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
                {currentLang === 'en' ? 'Send us a message' : 'መልዕክት ላኩልን'}
              </h3>
              <div className="w-10 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full mb-2" />

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t.contactFormName}</label>
                <input
                  type="text" required value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                  placeholder={t.contactFormName}
                  suppressHydrationWarning
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t.contactFormPhone}</label>
                <input
                  type="tel" required value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                  placeholder={t.contactFormPhone}
                  suppressHydrationWarning
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t.contactFormMessage}</label>
                <textarea
                  required rows={4} value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition resize-none"
                  placeholder={t.contactFormMessage}
                />
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                suppressHydrationWarning
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all duration-200 text-sm mt-1 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    {currentLang === 'en' ? 'Sending...' : 'እየተላከ...'}
                  </>
                ) : t.contactFormSend}
              </button>
            </form>
          </div>

        </div>
      </section>

    </main>
  )
}
