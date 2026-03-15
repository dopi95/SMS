'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface SettingsContextType {
  language: string
  theme: string
  setLanguage: (lang: string) => void
  setTheme: (theme: string) => void
  getText: (en: string, am: string) => string
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState('en')
  const [theme, setThemeState] = useState('light')

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') || 'en'
    const savedTheme = localStorage.getItem('theme') || 'light'
    
    setLanguageState(savedLanguage)
    setThemeState(savedTheme)
    
    applyTheme(savedTheme)
  }, [])

  const applyTheme = (newTheme: string) => {
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const setLanguage = (lang: string) => {
    setLanguageState(lang)
    localStorage.setItem('language', lang)
  }

  const setTheme = (newTheme: string) => {
    setThemeState(newTheme)
    localStorage.setItem('theme', newTheme)
    applyTheme(newTheme)
  }

  const getText = (en: string, am: string) => language === 'am' ? am : en

  return (
    <SettingsContext.Provider value={{ language, theme, setLanguage, setTheme, getText }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}