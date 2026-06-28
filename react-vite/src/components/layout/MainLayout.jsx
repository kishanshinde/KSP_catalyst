import Sidebar from '../sidebar/Sidebar'
import Header from './Header'

export default function MainLayout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background dark:bg-slate-950 transition-colors">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
