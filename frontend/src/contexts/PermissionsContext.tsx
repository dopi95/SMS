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
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { setLoading(false); return }

    // Immediately load from localStorage so sidebar shows instantly
    const cached = localStorage.getItem('user')
    if (cached) {
      try {
        const u = JSON.parse(cached)
        setRole(u.role || '')
        setPermissions(u.permissions || [])
        setUser(u)
        setLoading(false)
      } catch {}
    }

    // Refresh from API in background to get latest data
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
