import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'
import { ChatProvider } from './context/ChatContext'
import { AuthProvider } from './contexts/AuthContext'
import { SidebarProvider } from './contexts/SidebarContext'
import MainLayout from './components/layout/MainLayout'
import HomePage from './pages/HomePage'
import WorkspacePage from './pages/WorkspacePage'
import ErrorBoundary from './components/common/ErrorBoundary'
import ProtectedRoute from './components/common/ProtectedRoute'
import LoginPage from './components/auth/LoginPage'
import SetInitialPasswordPage from './components/auth/SetInitialPasswordPage'

function PlaceholderPage({ titleKey }) {
  const { t } = useLanguage()
  return (
    <div className="flex items-center justify-center h-full text-on-surface-variant/40 dark:text-on-surface-variant/40">
      <p className="text-lg">{t(titleKey)} — {t('page.comingSoon')}</p>
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/set-password" element={<SetInitialPasswordPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <SidebarProvider>
              <ChatProvider>
                <MainLayout>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/chat/:id" element={<ErrorBoundary><WorkspacePage /></ErrorBoundary>} />
                    <Route
                      path="/analytics"
                      element={<PlaceholderPage titleKey="page.analytics" />}
                    />
                    <Route
                      path="/reports"
                      element={<PlaceholderPage titleKey="page.reports" />}
                    />
                  </Routes>
                </MainLayout>
              </ChatProvider>
            </SidebarProvider>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
