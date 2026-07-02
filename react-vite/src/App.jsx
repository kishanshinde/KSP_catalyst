import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'
import { ChatProvider } from './context/ChatContext'
import { SidebarProvider } from './contexts/SidebarContext'
import MainLayout from './components/layout/MainLayout'
import HomePage from './pages/HomePage'
import WorkspacePage from './pages/WorkspacePage'
import ErrorBoundary from './components/common/ErrorBoundary'

function PlaceholderPage({ titleKey }) {
  const { t } = useLanguage()
  return (
    <div className="flex items-center justify-center h-full text-on-surface-variant/40 dark:text-on-surface-variant/40">
      <p className="text-lg">{t(titleKey)} — {t('page.comingSoon')}</p>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
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
                <Route
                  path="/settings"
                  element={<PlaceholderPage titleKey="page.settings" />}
                />
              </Routes>
            </MainLayout>
          </ChatProvider>
          </SidebarProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
