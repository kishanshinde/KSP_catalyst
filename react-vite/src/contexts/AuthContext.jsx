/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const AuthContext = createContext(null)
const LOCAL_STORAGE_KEY = 'ksp_lumina_auth_user'

function getCatalystAuth() {
  return window.catalyst?.auth ?? null
}

async function fetchCurrentUser() {
  // Try API Gateway endpoint /getCurrentUser
  try {
    let response = await fetch('/server/getCurrentUser', {
      headers: { Accept: 'application/json' },
      credentials: 'include',
      cache: 'no-store',
    })

    if (!response.ok && response.status === 404) {
      response = await fetch('/server/getCurrentUser/', {
        headers: { Accept: 'application/json' },
        credentials: 'include',
        cache: 'no-store',
      })
    }

    if (response.ok) {
      const payload = await response.json()
      if (payload?.user) {
        return payload.user
      }
    }
  } catch (err) {
    console.warn('[AuthContext] Session check error:', err.message)
  }

  return null
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function checkUserSession() {
      try {
        const currentUser = await fetchCurrentUser()
        if (mounted) setUser(currentUser)
      } catch {
        if (mounted) setUser(null)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    checkUserSession()

    return () => {
      mounted = false
    }
  }, [])

  const login = useCallback(() => {
    const loginUrl =
      import.meta.env.VITE_AUTH_LOGIN_URL ||
      import.meta.env.VITE_CATALYST_LOGIN_URL ||
      `https://${import.meta.env.VITE_CATALYST_DOMAIN || 'techsonic-crime-intelligence-60073436832.development'}.catalystserverless.in/__catalyst/auth/login`

    window.location.href = loginUrl
  }, [])

  const devLogin = useCallback(async ({ badgeId, name, role }) => {
    try {
      // Try posting to /server/authentication/
      const res = await fetch('/server/authentication/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', badgeId, name, role }),
      })
      if (res.ok) {
        const payload = await res.json()
        if (payload?.user) {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload.user))
          setUser(payload.user)
          return payload.user
        }
      }
    } catch (err) {
      console.warn('[Auth] devLogin backend call failed, falling back to local session:', err.message)
    }

    // Fallback officer profile creation
    const officerName = name?.trim() || 'Officer'
    const nameParts = officerName.split(' ')
    const officerUser = {
      user_id: badgeId || `KSP_${Math.floor(100000 + Math.random() * 900000)}`,
      zuid: `DEV_${Date.now()}`,
      first_name: nameParts[0] || 'Officer',
      last_name: nameParts.slice(1).join(' ') || 'KSP',
      email: `${(badgeId || 'officer').toLowerCase()}@ksp.gov.in`,
      role: role || 'Senior Officer (CID)',
      app_role: role || 'Senior Officer (CID)',
      status: 'ACTIVE',
      confirmed: true,
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(officerUser))
    setUser(officerUser)
    return officerUser
  }, [])

  const logout = useCallback(async () => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY)
      const auth = getCatalystAuth()
      if (auth && typeof auth.sign_out === 'function') {
        await auth.sign_out()
      }
      setUser(null)
    } catch (err) {
      console.error('[Auth] Sign-out failed:', err)
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, devLogin, logout }),
    [user, loading, login, devLogin, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider')
  }
  return context
}
