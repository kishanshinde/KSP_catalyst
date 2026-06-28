import { useEffect, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useChat } from '../../context/ChatContext'
import ChatMessage from './ChatMessage'
import TypingIndicator from './TypingIndicator'
import ChatInput from './ChatInput'

export default function ChatWindow() {
  const { currentConversation, sendMessage, loading, streaming, loadingIntent } = useChat()
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentConversation?.messages, loading])

  function handleSend(text) {
    sendMessage(text)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <AnimatePresence>
          {currentConversation?.messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
        </AnimatePresence>

        {loading && streaming && <TypingIndicator phase={loadingIntent ? 'intent' : 'query'} />}

        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 px-4 py-3 border-t border-slate-200/30 bg-surface/80 backdrop-blur-sm">
        <ChatInput onSend={handleSend} disabled={loading} placeholder="Ask a follow-up question..." />
      </div>
    </div>
  )
}
