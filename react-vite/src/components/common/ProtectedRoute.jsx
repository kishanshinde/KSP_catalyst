import { Navigate, useLocation } from 'react-router-dom'
import { useAuth, POST_LOGIN_REDIRECT_KEY } from '../../contexts/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <p className="text-sm font-semibold tracking-wide text-slate-400 uppercase">
            Verifying KSP Security Credentials...
          </p>
        </div>
      </div>
    )
  }

  if (!user) {
    const returnTo = `${location.pathname}${location.search}`
    if (returnTo && returnTo !== '/') {
      sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, returnTo)
    }
    return <Navigate to="/login" replace />
  }

  return children
}
