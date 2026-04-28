'use client'

import { useState, useRef, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { translations } from '@/lib/translations'

function FAQItem({ q, a, index, open, onToggle }: {
  q: string; a: string; index: number
  open: boolean; onToggle: () => void
}) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    if (bodyRef.current) setHeight(bodyRef.current.scrollHeight)
  }, [a])

  return (
    <div
      className={`faq-item group rounded-2xl border transition-all duration-300 overflow-hidden
        ${open
          ? 'border-blue-200 bg-blue-50/60 shadow-md shadow-blue-100/50'
          : 'border-gray-100 bg-white hover:border-blue-100 hover:shadow-sm'
        }`}
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 sm:px-6 py-4 sm:py-5 text-left"
      >
        {/* Number badge */}
        <span className={`flex-shrink-0 w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-all duration-300
          ${open ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
          {String(index + 1).padStart(2, '0')}
        </span>

        {/* Question */}
        <span className={`flex-1 text-sm sm:text-base font-semibold leading-snug transition-colors duration-200
          ${open ? 'text-blue-700' : 'text-gray-800'}`}>
          {q}
        </span>

        {/* Chevron */}
        <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300
          ${open ? 'bg-blue-600 rotate-180' : 'bg-gray-100 group-hover:bg-blue-100'}`}>
          <svg className={`w-3.5 h-3.5 transition-colors duration-200 ${open ? 'text-white' : 'text-gray-400 group-hover:text-blue-600'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {/* Answer — smooth height animation */}
      <div
        style={{ maxHeight: open ? height : 0, transition: 'max-height 0.38s cubic-bezier(0.22,1,0.36,1)' }}
        className="overflow-hidden"
      >
        <div ref={bodyRef} className="px-5 sm:px-6 pb-5 pt-0">
          <div className="ml-11 border-l-2 border-blue-200 pl-4">
            <p className="text-sm sm:text-base text-gray-500 leading-7">{a}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FAQ() {
  const { currentLang } = useLanguage()
  const t = translations[currentLang]
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-slate-50 to-blue-50 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 bg-blue-100/20 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-100/20 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Header */}
        <div className="text-center mb-10 sm:mb-12">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-semibold uppercase tracking-widest mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            FAQ
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              {t.faqTitle}
            </span>
          </h2>
          <p className="max-w-xl mx-auto text-sm sm:text-base text-gray-500 leading-7">
            {t.faqSubtitle}
          </p>
          <div className="w-16 sm:w-24 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 mx-auto rounded-full mt-6" />
        </div>

        {/* Accordion */}
        <div className="max-w-3xl mx-auto flex flex-col gap-3">
          {t.faqItems.map((item, i) => (
            <FAQItem
              key={i}
              index={i}
              q={item.q}
              a={item.a}
              open={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </div>

      </div>
    </section>
  )
}
