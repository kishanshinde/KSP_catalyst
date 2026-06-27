import Sidebar from './Sidebar'
import Header from './Header'

export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="ml-sidebar-width min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </div>
    </div>
  )
}
