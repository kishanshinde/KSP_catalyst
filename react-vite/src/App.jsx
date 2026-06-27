import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { ChatProvider } from './context/ChatContext'
import MainLayout from './components/layout/MainLayout'
import HomePage from './pages/HomePage'
import WorkspacePage from './pages/WorkspacePage'

function PlaceholderPage({ title }) {
  return (
    <div className="flex items-center justify-center h-full text-on-surface-variant/40">
      <p className="text-lg">{title} — Coming Soon</p>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <ChatProvider>
          <MainLayout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/chat/:id" element={<WorkspacePage />} />
              <Route
                path="/analytics"
                element={<PlaceholderPage title="Analytics Dashboard" />}
              />
              <Route
                path="/reports"
                element={<PlaceholderPage title="Reports Center" />}
              />
              <Route
                path="/settings"
                element={<PlaceholderPage title="Settings" />}
              />
            </Routes>
          </MainLayout>
        </ChatProvider>
      </AppProvider>
    </BrowserRouter>
  )
}
