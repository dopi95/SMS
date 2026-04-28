'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { translations } from '@/lib/translations'
const IMAGES = [
  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&q=85',
  'https://images.unsplash.com/photo-1560785496-3c9d27877182?w=1200&q=85',
  'https://images.unsplash.com/photo-1544717305-2782549b5136?w=1200&q=85',
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&q=85',
  'https://images.unsplash.com/photo-1514369118554-e4b54e674e2e?w=1200&q=85',
  'https://images.unsplash.com/photo-1588072432836-e10032774350?w=1200&q=85',
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
                <img
                  src={src}
                  alt={`Slide ${i + 1}`}
                  className="w-full h-full object-cover object-center"
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
