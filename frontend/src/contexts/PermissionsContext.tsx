'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authService } from '@/lib/auth'

export interface PagePermission {
  page: string
  actions: string[]
}

interface PermissionsContextType {
  role: string
  permissions: PagePermission[]
  user: any
  canAccess: (page: string) => boolean
  canDo: (page: string, action: string) => boolean
  loading: boolean
}

const PermissionsContext = createContext<PermissionsContextType>({
  role: '',
  permissions: [],
  user: null,
  canAccess: () => false,
  canDo: () => false,
  loading: true,
})

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState('')
  const [permissions, setPermissions] = useState<PagePermission[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUser = () => {
      const token = localStorage.getItem('token')
      if (!token) {
        setRole('')
        setPermissions([])
        setUser(null)
        setLoading(false)
        return
      }

      // Load cached user immediately
      try {
        const cached = localStorage.getItem('user')
        if (cached) {
          const u = JSON.parse(cached)
          setRole(u.role || '')
          setPermissions(u.permissions || [])
          setUser(u)
          setLoading(false)
        }
      } catch {}

      // Refresh from API in background
      authService.getCurrentUser()
        .then(data => {
          setRole(data.user.role)
          setPermissions(data.user.permissions || [])
          setUser(data.user)
          localStorage.setItem('user', JSON.stringify(data.user))
        })
        .catch(() => {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        })
        .finally(() => setLoading(false))
    }

    loadUser()

    // Re-run whenever another tab or the login page writes to localStorage
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'user' || e.key === 'token') loadUser()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const isSuperAdmin = role === 'superadmin'

  const canAccess = (page: string) => {
    if (isSuperAdmin) return true
    return permissions.some(p => p.page === page)
  }

  const canDo = (page: string, action: string) => {
    if (isSuperAdmin) return true
    const p = permissions.find(p => p.page === page)
    return p ? p.actions.includes(action) : false
  }

  return (
    <PermissionsContext.Provider value={{ role, permissions, user, canAccess, canDo, loading }}>
      {children}
    </PermissionsContext.Provider>
  )
}

export const usePermissions = () => useContext(PermissionsContext)
