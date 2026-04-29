'use client'

import { usePathname } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

const HIDDEN_ROUTES = ['/message']

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hide = HIDDEN_ROUTES.some(r => pathname.startsWith(r))

  return (
    <>
      {!hide && <Header />}
      {children}
      {!hide && <Footer />}
    </>
  )
}
