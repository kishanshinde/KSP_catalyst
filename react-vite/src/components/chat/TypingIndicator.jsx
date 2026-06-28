import { motion } from 'framer-motion'
import { Bot, Search } from 'lucide-react'

export default function TypingIndicator({ phase }) {
  const isIntentPhase = phase === 'intent' || !phase

  return (
    <div className="flex gap-3 mb-4">
      <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0 mt-1">
        {isIntentPhase ? <Bot size={16} className="text-on-primary" /> : <Search size={16} className="text-on-primary" />}
      </div>
      <div className="bg-white border border-outline-variant/50 text-on-surface rounded-xl rounded-tl-md px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs text-on-surface-variant/70">{isIntentPhase ? 'Understanding your query...' : 'Searching crime database...'}</span>
          <div className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-1.5 h-1.5 bg-on-surface-variant/40 rounded-full"
                animate={{ y: [0, -3, 0] }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
