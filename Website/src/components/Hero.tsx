'use client'

import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { translations } from '@/lib/translations'

const EduElements = () => (
  <>
    {/* Open book — top left */}
    <div className="edu-float absolute pointer-events-none select-none" style={{ top: '10%', left: '5%', animationDelay: '0s' }}>
      <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="rgba(147,197,253,0.25)" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 6s1.5-2 5-2 5 2 5 2v14s-1.5-1-5-1-5 1-5 1V6z"/>
        <path d="M12 6s1.5-2 5-2 5 2 5 2v14s-1.5-1-5-1-5 1-5 1V6z"/>
        <line x1="12" y1="6" x2="12" y2="20"/>
      </svg>
    </div>

    {/* Pencil — top right */}
    <div className="edu-float-r absolute pointer-events-none select-none" style={{ top: '7%', right: '7%', animationDelay: '1.2s' }}>
      <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="rgba(253,224,71,0.22)" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
        <line x1="15" y1="5" x2="19" y2="9"/>
      </svg>
    </div>

    {/* Balloon — mid left */}
    <div className="edu-float absolute pointer-events-none select-none" style={{ top: '38%', left: '4%', animationDelay: '2.5s' }}>
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="rgba(249,168,212,0.25)" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="9" r="7"/>
        <path d="M12 16v2"/>
        <path d="M10 18c0 1.1.9 2 2 2s2-.9 2-2"/>
        <path d="M9 9c0-1.7 1.3-3 3-3"/>
      </svg>
    </div>

    {/* Star — mid right */}
    <div className="edu-float-r absolute pointer-events-none select-none" style={{ top: '35%', right: '5%', animationDelay: '0.6s' }}>
      <svg width="46" height="46" viewBox="0 0 24 24" fill="rgba(251,191,36,0.1)" stroke="rgba(251,191,36,0.25)" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    </div>

    {/* ABC block — bottom left */}
    <div className="edu-float absolute pointer-events-none select-none" style={{ bottom: '20%', left: '6%', animationDelay: '3.2s' }}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(103,232,249,0.22)" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="3"/>
        <text x="5.5" y="16" fontSize="9" fill="rgba(103,232,249,0.4)" stroke="none" fontFamily="serif" fontWeight="bold">ABC</text>
      </svg>
    </div>

    {/* Music note — bottom right */}
    <div className="edu-float-r absolute pointer-events-none select-none" style={{ bottom: '18%', right: '6%', animationDelay: '1.8s' }}>
      <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="rgba(216,180,254,0.25)" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13"/>
        <circle cx="6" cy="18" r="3"/>
        <circle cx="18" cy="16" r="3"/>
      </svg>
    </div>

    {/* Graduation cap — top center */}
    <div className="edu-float absolute pointer-events-none select-none" style={{ top: '14%', left: '42%', animationDelay: '4s' }}>
      <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="rgba(147,197,253,0.2)" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3L2 8l10 5 10-5-10-5z"/>
        <path d="M6 10.5v5c0 2 2.7 3.5 6 3.5s6-1.5 6-3.5v-5"/>
        <line x1="20" y1="8" x2="20" y2="14"/>
      </svg>
    </div>

    {/* Notebook — top center-right */}
    <div className="edu-float-r absolute pointer-events-none select-none" style={{ top: '18%', right: '22%', animationDelay: '3.8s' }}>
      <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="rgba(196,181,253,0.22)" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
        <line x1="8" y1="7" x2="16" y2="7"/>
        <line x1="8" y1="11" x2="16" y2="11"/>
        <line x1="8" y1="15" x2="12" y2="15"/>
      </svg>
    </div>

    {/* Crayon — bottom center */}
    <div className="edu-float absolute pointer-events-none select-none" style={{ bottom: '10%', left: '38%', animationDelay: '2.2s' }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(52,211,153,0.22)" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19l-7-7 7-7 7 7-7 7z"/>
        <path d="M12 5V2"/>
        <path d="M5 12H2"/>
      </svg>
    </div>

    {/* Traveling light lines */}
    <div className="edu-line absolute pointer-events-none" style={{ top: '28%', left: 0, width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(96,165,250,0.12), transparent)', animationDelay: '0s' }} />
    <div className="edu-line absolute pointer-events-none" style={{ top: '65%', left: 0, width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.1), transparent)', animationDelay: '4s' }} />
  </>
)

export default function Hero() {
  const { currentLang } = useLanguage()
  const t = translations[currentLang]

  return (
    <section className="h-[calc(100vh-64px)] relative flex items-center overflow-hidden">

      {/* Base gradient */}
      <div className="hero-bg absolute inset-0" style={{
        background: 'linear-gradient(135deg, #060d1f 0%, #0d2257 25%, #0b4080 50%, #0a6b8a 75%, #071525 100%)',
      }} />

      {/* Orb 1 — large blue, top-right */}
      <div className="hero-orb-1 absolute pointer-events-none" style={{
        width: 700, height: 700, top: '-200px', right: '-180px',
        background: 'radial-gradient(circle at 35% 35%, rgba(59,130,246,0.3) 0%, rgba(37,99,235,0.1) 45%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(60px)',
      }} />

      {/* Orb 2 — cyan, bottom-left */}
      <div className="hero-orb-2 absolute pointer-events-none" style={{
        width: 600, height: 600, bottom: '-160px', left: '-140px',
        background: 'radial-gradient(circle at 65% 65%, rgba(6,182,212,0.28) 0%, rgba(8,145,178,0.1) 50%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(60px)',
      }} />

      {/* Orb 3 — indigo, center */}
      <div className="hero-orb-3 absolute pointer-events-none" style={{
        width: 400, height: 400, top: '20%', right: '20%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 65%)',
        borderRadius: '50%', filter: 'blur(45px)',
      }} />

      {/* Orb 4 — bright cyan, top-left */}
      <div className="hero-orb-4 absolute pointer-events-none" style={{
        width: 300, height: 300, top: '8%', left: '12%',
        background: 'radial-gradient(circle, rgba(34,211,238,0.2) 0%, transparent 65%)',
        borderRadius: '50%', filter: 'blur(35px)',
      }} />

      {/* Orb 5 — violet, bottom center */}
      <div className="hero-orb-5 absolute pointer-events-none" style={{
        width: 350, height: 350, bottom: '0%', left: '38%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 65%)',
        borderRadius: '50%', filter: 'blur(40px)',
      }} />

      {/* Pulse rings */}
      {[480, 720, 1000].map((size, i) => (
        <div key={size}
          className={`absolute rounded-full border pointer-events-none ${['hero-ring-1','hero-ring-2','hero-ring-3'][i]}`}
          style={{
            width: size, height: size, top: '50%', left: '50%',
            borderColor: ['rgba(96,165,250,0.18)','rgba(34,211,238,0.1)','rgba(139,92,246,0.07)'][i],
          }}
        />
      ))}

      {/* Child-friendly educational elements */}
      <EduElements />

      {/* Floating particles */}
      {[
        { s:4, t:'18%', l:'28%', d:'0s',   c:'rgba(147,197,253,0.7)' },
        { s:3, t:'62%', l:'72%', d:'1.4s', c:'rgba(103,232,249,0.6)' },
        { s:5, t:'35%', l:'82%', d:'2.6s', c:'rgba(167,139,250,0.55)' },
        { s:3, t:'78%', l:'22%', d:'0.7s', c:'rgba(147,197,253,0.5)' },
        { s:4, t:'14%', l:'58%', d:'1.9s', c:'rgba(249,168,212,0.5)' },
        { s:2, t:'52%', l:'48%', d:'3.2s', c:'rgba(251,191,36,0.5)' },
        { s:3, t:'88%', l:'60%', d:'2.1s', c:'rgba(103,232,249,0.4)' },
      ].map((p, i) => (
        <div key={i} className="hero-particle absolute rounded-full pointer-events-none"
          style={{ width:p.s, height:p.s, top:p.t, left:p.l, background:p.c, animationDelay:p.d, boxShadow:`0 0 ${p.s*4}px ${p.c}` }}
        />
      ))}

      {/* Dot grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)',
        backgroundSize: '38px 38px',
      }} />

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(6,13,31,0.5), transparent)' }}
      />

      {/* Content */}
      <div className="w-full px-5 sm:px-8 lg:px-12 relative z-10 animate-slide-up" style={{ animationFillMode: 'forwards' }}>
        <div className="max-w-2xl mx-auto text-center">

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-xs sm:text-sm font-medium mb-4 sm:mb-6 border border-white/15 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0 animate-pulse" />
            Est. 2024 · KG1 – KG3
          </span>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight mb-3 sm:mb-4">
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">{t.heroTitle1}</span>{' '}
            <span>{t.heroTitle2}</span>
          </h1>

          <p className="text-cyan-200/70 text-sm sm:text-base md:text-lg italic mb-3 sm:mb-4">
            &ldquo;{t.heroMotto}&rdquo;
          </p>

          <p className="text-white/55 text-xs sm:text-sm md:text-base max-w-md sm:max-w-xl mx-auto mb-6 sm:mb-8 leading-relaxed">
            {t.heroSubtitle}
          </p>

          <div className="flex flex-row items-center justify-center gap-3 mb-6 sm:mb-10">
            <Link
              href="https://admission.bluelight.edu.et/registrationform"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-full active:scale-95 transition-all duration-200 shadow-lg shadow-blue-500/30 text-sm whitespace-nowrap"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {t.getStarted}
            </Link>

            <button
              onClick={() => window.location.href = '/contact'}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-white font-semibold rounded-full border border-white/20 bg-white/8 hover:bg-white/15 backdrop-blur-sm active:scale-95 transition-all duration-200 text-sm whitespace-nowrap"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {t.learnMore}
            </button>
          </div>

          <div className="flex justify-center gap-6 sm:gap-10 pt-4 sm:pt-6 border-t border-white/10">
            {[
              { value: 'KG1–KG3', label: 'Programs'  },
              { value: '2024',    label: 'Founded'    },
              { value: '100%',    label: 'Dedication' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-base sm:text-xl font-bold text-white">{stat.value}</div>
                <div className="text-[10px] sm:text-xs text-white/35 uppercase tracking-wide mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>

        </div>
      </div>

    </section>
  )
}
