'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { translations } from '@/lib/translations'

export default function Header() {
  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { currentLang } = useLanguage()

  const t = translations[currentLang]

  return (
    <>
      <header className="bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4 relative">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Text */}
            <Link href="/" className="flex items-center space-x-3">
              <img src="/icons/icon.png" alt="Bluelight Academy" className="w-12 h-12" />
              <span className="text-xl font-bold text-gray-900">{t.siteName}</span>
            </Link>

            {/* Desktop Navigation — centered */}
            <nav className="hidden md:flex items-center space-x-8 absolute left-1/2 -translate-x-1/2">
              <Link href="/" className="text-gray-700 hover:text-primary-600 transition-colors">
                {t.home}
              </Link>
              
              {/* About Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsAboutOpen(!isAboutOpen)}
                  className="flex items-center text-gray-700 hover:text-primary-600 transition-colors"
                  suppressHydrationWarning
                >
                  {t.about}
                  <svg
                    className={`ml-1 h-4 w-4 transition-transform ${isAboutOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Dropdown Menu */}
                <div className={`absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border transition-all duration-200 ${
                  isAboutOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'
                }`}>
                  <Link
                    href="/about/our-story"
                    onClick={() => setIsAboutOpen(false)}
                    className="block px-4 py-3 text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors rounded-t-lg"
                  >
                    {t.ourStory}
                  </Link>
                  <Link
                    href="/about/school-fees"
                    onClick={() => setIsAboutOpen(false)}
                    className="block px-4 py-3 text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors rounded-b-lg"
                  >
                    {t.schoolFees}
                  </Link>
                </div>
              </div>

              <Link href="/facilities" className="text-gray-700 hover:text-primary-600 transition-colors">
                {t.facilities}
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              suppressHydrationWarning
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div className={`fixed inset-0 z-40 transition-all duration-300 md:hidden ${
        isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
      }`}>
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black bg-opacity-50"
          onClick={() => setIsMobileMenuOpen(false)}
        />
        
        {/* Mobile Menu */}
        <div className={`absolute top-16 left-1/2 transform -translate-x-1/2 w-80 max-w-sm bg-white rounded-2xl shadow-2xl transition-all duration-300 ${
          isMobileMenuOpen ? 'translate-y-4 scale-100' : '-translate-y-4 scale-95'
        }`}>
          {/* Close Button */}
          <div className="flex justify-end p-4">
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <nav className="px-6 pb-6 space-y-4">
            <Link 
              href="/" 
              className="block px-4 py-3 text-gray-700 hover:bg-primary-50 hover:text-primary-600 rounded-xl transition-colors font-medium"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {t.home}
            </Link>
            
            {/* Mobile About Dropdown */}
            <div>
              <button
                onClick={() => setIsAboutOpen(!isAboutOpen)}
                className="flex items-center justify-between w-full px-4 py-3 text-gray-700 hover:bg-primary-50 hover:text-primary-600 rounded-xl transition-colors font-medium"
              >
                {t.about}
                <svg
                  className={`h-4 w-4 transition-transform ${isAboutOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className={`ml-4 space-y-2 transition-all duration-200 overflow-hidden ${
                isAboutOpen ? 'max-h-32 opacity-100 mt-2' : 'max-h-0 opacity-0'
              }`}>
                <Link 
                  href="/about/our-story" 
                  className="block px-4 py-2 text-gray-600 hover:bg-primary-50 hover:text-primary-600 rounded-lg transition-colors"
                  onClick={() => { setIsMobileMenuOpen(false); setIsAboutOpen(false) }}
                >
                  {t.ourStory}
                </Link>
                <Link 
                  href="/about/school-fees" 
                  className="block px-4 py-2 text-gray-600 hover:bg-primary-50 hover:text-primary-600 rounded-lg transition-colors"
                  onClick={() => { setIsMobileMenuOpen(false); setIsAboutOpen(false) }}
                >
                  {t.schoolFees}
                </Link>
              </div>
            </div>

            <Link 
              href="/facilities" 
              className="block px-4 py-3 text-gray-700 hover:bg-primary-50 hover:text-primary-600 rounded-xl transition-colors font-medium"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {t.facilities}
            </Link>


          </nav>
        </div>
      </div>
    </>
  )
}