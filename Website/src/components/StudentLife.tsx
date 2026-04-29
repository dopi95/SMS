'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { translations } from '@/lib/translations'
const IMAGES = [
  '/img/s-1.jpg',
  '/img/sl-1.jpg',
  '/img/g-1.jpg',
  '/img/s-2.jpg',
  '/img/sl-2.jpg',
  '/img/g-2.jpg',
  '/img/s-3.jpg',
  '/img/sl-3.jpg',
  '/img/g-3.jpg',
  '/img/s-4.jpg',
  '/img/sl-4.jpg',
  '/img/g-4.jpg',
  '/img/s-5.jpg',
  '/img/sl-5.jpg',
  '/img/g-5.jpg',
  '/img/s-6.jpg',
  '/img/sl-6.jpg',
  '/img/g-6.jpg',
  '/img/s-7.jpg',
  '/img/sl-7.jpg',
  '/img/s-8.jpg',
  '/img/sl-8.jpg',
  '/img/s-9.jpg',
  '/img/sl-9.jpg',
  '/img/s-10.jpg',
  '/img/sl-10.jpg',
  '/img/sl-11.jpg',
  '/img/sl-12.jpg',
  '/img/sl-13.jpg',
  '/img/sl-14.jpg',
  '/img/sl-15.jpg',
  '/img/sl-16.jpg',
  '/img/sl-17.jpg',
]

const DURATION = 4000

type Dir = 'right' | 'left'

export default function StudentLife() {
  const { currentLang } = useLanguage()
  const t = translations[currentLang]
  const [current, setCurrent] = useState(0)
  const [prev, setPrev]       = useState<number | null>(null)
  const [dir, setDir]         = useState<Dir>('right')
  const [progKey, setProgKey] = useState(0)

  const go = useCallback((next: number, direction: Dir) => {
    setPrev(current)
    setDir(direction)
    setCurrent(next)
    setProgKey(k => k + 1)
  }, [current])

  const next  = useCallback(() => go((current + 1) % IMAGES.length, 'right'), [current, go])
  const prev_ = useCallback(() => go((current - 1 + IMAGES.length) % IMAGES.length, 'left'), [current, go])

  // Always-running interval — never pauses
  useEffect(() => {
    const id = setInterval(() => {
      setCurrent(c => {
        const n = (c + 1) % IMAGES.length
        setPrev(c)
        setDir('right')
        setProgKey(k => k + 1)
        return n
      })
    }, DURATION)
    return () => clearInterval(id)
  }, [])

  const enterClass = dir === 'right' ? 'sl-enter-right' : 'sl-enter-left'
  const exitClass  = dir === 'right' ? 'sl-exit-left'  : 'sl-exit-right'

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-10 sm:mb-12">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-semibold uppercase tracking-widest mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            School Life
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 mb-4 sm:mb-5">
            <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              {t.studentLifeTitle}
            </span>
          </h2>
          <p className="max-w-2xl mx-auto text-sm sm:text-base lg:text-lg text-gray-500 leading-7">
            {t.studentLifeSubtitle}
          </p>
          <div className="w-16 sm:w-24 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 mx-auto rounded-full mt-6 sm:mt-8" />
        </div>

        {/* Slider */}
        <div
          className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl select-none h-[260px] sm:h-[380px] md:h-[460px] lg:h-[520px]"
        >

          {/* Slides */}
          {IMAGES.map((src, i) => {
            const isActive = i === current
            const isExiting = i === prev
            if (!isActive && !isExiting) return null
            return (
              <div
                key={src}
                className={`absolute inset-0 ${isActive ? enterClass : exitClass}`}
              >
                {/* Blurred background fill */}
                <img
                  src={src}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover object-center scale-110"
                  style={{ filter: 'blur(18px)', opacity: 0.7 }}
                  draggable={false}
                  aria-hidden
                />
                <div className="absolute inset-0 bg-black/20" />
                {/* Main image */}
                <img
                  src={src}
                  alt={`Slide ${i + 1}`}
                  className="relative w-full h-full object-contain object-center"
                  draggable={false}
                />
              </div>
            )
          })}

          {/* Counter + Arrow controls */}
          <div className="absolute bottom-4 left-0 right-0 px-4 sm:px-5 z-10 flex items-center justify-between">            
            <p className="text-white/70 text-xs sm:text-sm font-semibold tabular-nums tracking-widest drop-shadow">
              {String(current + 1).padStart(2, '0')}
              <span className="text-white/35 mx-1">/</span>
              {String(IMAGES.length).padStart(2, '0')}
            </p>
          <div className="flex gap-2">
                <button
                  onClick={prev_}
                  aria-label="Previous"
                  className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={next}
                  aria-label="Next"
                  className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
          </div>
          </div>

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20 z-10">
            <div
              key={progKey}
              className="sl-progress h-full bg-gradient-to-r from-blue-400 to-cyan-400"
              style={{ '--sl-duration': `${DURATION}ms` } as React.CSSProperties}
            />
          </div>

          {/* Pause indicator removed — always playing */}
        </div>

      </div>
    </section>
  )
}
