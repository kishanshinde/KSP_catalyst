import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useChat } from '../context/ChatContext'
import { useLanguage } from '../contexts/LanguageContext'
import VoiceButton from '../components/common/VoiceButton'
import useSpeechRecognition from '../hooks/useSpeechRecognition'
import SuggestedThreads from '../components/landing/SuggestedThreads'
import RecentCases from '../components/dashboard/RecentCases'
import LiveHotspots from '../components/landing/LiveHotspots'
import CrimeTrends from '../components/dashboard/CrimeTrends'
import CriminalNetworkViz from '../components/landing/CriminalNetworkViz'
import SystemFooter from '../components/landing/SystemFooter'
import ToastContainer from '../components/common/Toast'

export default function HomePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useLanguage()
  const { sendMessage } = useChat()

  const { language } = useLanguage()
  const { isSupported: isVoiceSupported, isRecording, start, stop } = useSpeechRecognition({
    lang: language === 'kn' ? 'kn-IN' : 'en-IN',
    onResult: (transcript) => {
      sendMessage(transcript)
      navigate('/chat/current')
    },
  })

  // Sidebar nav items link here as `/#<section-id>` — scroll to the
  // matching section whenever the hash changes (including on first mount).
  // No hash means the "AI Assistant" hero section, at the top.
  useEffect(() => {
    const targetId = location.hash ? location.hash.slice(1) : 'ai-assistant'
    const el = document.getElementById(targetId)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location.hash])

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
      <section id="ai-assistant" className="max-w-4xl mx-auto py-10 text-center">
        <h2 className="text-3xl font-extrabold mb-10 text-slate-900 dark:text-white tracking-tight">
          {t('landing.welcome')} {t('landing.subtitle')}
        </h2>
        <form onSubmit={handleQuery} className="relative glass-panel rounded-full p-2 pl-8 flex items-center border-white/50 dark:border-slate-700/50">
          <span className="material-symbols-outlined text-primary mr-4 text-3xl">smart_toy</span>
          <input
            className="flex-1 bg-transparent border-none focus:ring-0 text-lg font-medium text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-500 py-4 outline-none"
            placeholder={t('landing.searchPlaceholder')}
            type="text"
          />
          <div className="flex items-center gap-2 pr-2">
            <VoiceButton
              disabled={!isVoiceSupported}
              isRecording={isRecording}
              onClick={() => isRecording ? stop() : start()}
              title={!isVoiceSupported ? t('common.voiceNotSupported') : isRecording ? t('common.stopRecording') : t('common.voiceInput')}
              className="rounded-full"
            />
            <button
              type="submit"
              className="bg-primary text-on-primary font-bold px-10 py-4 rounded-full hover:shadow-lg hover:shadow-primary/20 transition-all flex items-center gap-2"
            >
              <span>{t('landing.executeQuery')}</span>
              <span className="material-symbols-outlined">bolt</span>
            </button>
          </div>
        </form>
        <SuggestedThreads onSelect={handleSuggested} />
      </section>

      {/* Intelligence Workspace */}
      <section className="max-w-[1600px] mx-auto space-y-8 px-6">
        <div id="fir-explorer"><RecentCases /></div>
        <div id="hotspots"><LiveHotspots /></div>
        <div id="crime-analytics"><CrimeTrends /></div>
        <div id="criminal-networks"><CriminalNetworkViz /></div>
      </section>

      <SystemFooter />
      <ToastContainer />
    </div>
  )
}
