/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getAuthHeader, getSessionToken, setSessionToken, clearSessionToken } from '../services/catalystAuth'

const AuthContext = createContext(null)
export const POST_LOGIN_REDIRECT_KEY = 'ksp_lumina_post_login_redirect'

const API_BASE = import.meta.env.VITE_API_URL || ''

async function postAuthAction(action, body, authHeader = {}) {
  const response = await fetch(`${API_BASE}/authentication`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader },
    body: JSON.stringify({ action, ...body }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || 'Request failed. Please try again.')
  }
  return payload
}

async function fetchCurrentUser() {
  if (!getSessionToken()) return null

  try {
    const authHeader = await getAuthHeader()
    const response = await fetch(`${API_BASE}/getCurrentUser`, {
      headers: { Accept: 'application/json', ...authHeader },
      cache: 'no-store',
    })

    if (response.ok) {
      const payload = await response.json()
      if (payload?.user) {
        return payload.user
      }
    }

    if (response.status === 401) {
      clearSessionToken()
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

  const login = useCallback(async (email, password) => {
    const payload = await postAuthAction('login', { email, password })
    setSessionToken(payload.session_token)
    setUser(payload.user)
    return payload.user
  }, [])

  const logout = useCallback(async () => {
    try {
      const authHeader = await getAuthHeader()
      await postAuthAction('logout', {}, authHeader)
    } catch (err) {
      console.warn('[Auth] Logout request failed:', err.message)
    } finally {
      clearSessionToken()
      setUser(null)
    }
  }, [])

  const setInitialPassword = useCallback(async (email, newPassword) => {
    const payload = await postAuthAction('set-initial-password', { email, newPassword })
    return payload.message
  }, [])

  const forgotPassword = useCallback(async (email, newPassword) => {
    const payload = await postAuthAction('forgot-password', { email, newPassword })
    return payload.message
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, logout, setInitialPassword, forgotPassword }),
    [user, loading, login, logout, setInitialPassword, forgotPassword]
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
