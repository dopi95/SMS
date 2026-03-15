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
  canAccess: (page: string) => boolean
  canDo: (page: string, action: string) => boolean
  loading: boolean
}

const PermissionsContext = createContext<PermissionsContextType>({
  role: '',
  permissions: [],
  canAccess: () => true,
  canDo: () => true,
  loading: true,
})

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState('')
  const [permissions, setPermissions] = useState<PagePermission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) { setLoading(false); return }
    authService.getCurrentUser()
      .then(data => {
        setRole(data.user.role)
        setPermissions(data.user.permissions || [])
      })
      .catch(() => {})
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
    <PermissionsContext.Provider value={{ role, permissions, canAccess, canDo, loading }}>
      {children}
    </PermissionsContext.Provider>
  )
}

export const usePermissions = () => useContext(PermissionsContext)
