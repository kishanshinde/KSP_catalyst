import { useNavigate } from 'react-router-dom'
import { useChat } from '../context/ChatContext'
import SuggestedThreads from '../components/landing/SuggestedThreads'
import ActiveCases from '../components/landing/ActiveCases'
import LiveHotspots from '../components/landing/LiveHotspots'
import WeeklyTrends from '../components/landing/WeeklyTrends'
import PriorityAlerts from '../components/landing/PriorityAlerts'
import CriminalNetworkViz from '../components/landing/CriminalNetworkViz'
import SystemFooter from '../components/landing/SystemFooter'
import { INPUT_PLACEHOLDER } from '../utils/constants'

export default function HomePage() {
  const navigate = useNavigate()
  const { sendMessage } = useChat()

  function handleQuery(e) {
    e.preventDefault()
    const form = e.target
    const input = form.querySelector('input')
    const text = input?.value?.trim()
    if (!text) return
    sendMessage(text)
    navigate('/chat/current')
  }

  function handleSuggested(text) {
    sendMessage(text)
    navigate('/chat/current')
  }

  return (
    <div className="p-10 space-y-10 flex-1 overflow-y-auto">
      {/* Hero AI Interaction */}
      <section className="max-w-4xl mx-auto py-10 text-center">
        <h2 className="text-3xl font-extrabold mb-10 text-slate-900 tracking-tight">
          Welcome, Officer. How can I assist your investigation today?
        </h2>
        <form onSubmit={handleQuery} className="relative glass-panel rounded-full p-2 pl-8 flex items-center border-white/50">
          <span className="material-symbols-outlined text-primary mr-4 text-3xl">smart_toy</span>
          <input
            className="flex-1 bg-transparent border-none focus:ring-0 text-lg font-medium text-slate-900 placeholder:text-slate-300 py-4 outline-none"
            placeholder={INPUT_PLACEHOLDER}
            type="text"
          />
          <div className="flex items-center gap-2 pr-2">
            <button type="button" className="p-3 text-slate-400 hover:text-primary transition-all rounded-full">
              <span className="material-symbols-outlined">attach_file</span>
            </button>
            <button type="button" className="p-3 text-slate-400 hover:text-primary transition-all rounded-full">
              <span className="material-symbols-outlined">mic</span>
            </button>
            <button
              type="submit"
              className="bg-primary text-on-primary font-bold px-10 py-4 rounded-full hover:shadow-lg hover:shadow-primary/20 transition-all flex items-center gap-2"
            >
              <span>Execute Query</span>
              <span className="material-symbols-outlined">bolt</span>
            </button>
          </div>
        </form>
        <SuggestedThreads onSelect={handleSuggested} />
      </section>

      {/* Intelligence Workspace */}
      <section className="max-w-5xl mx-auto space-y-6">
        <ActiveCases />
        <LiveHotspots />
        <WeeklyTrends />
        <PriorityAlerts />
      </section>

      {/* Bottom Data Panel */}
      <div className="max-w-5xl mx-auto">
        <CriminalNetworkViz />
      </div>

      <SystemFooter />
    </div>
  )
}
