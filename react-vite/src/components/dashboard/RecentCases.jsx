import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useRecentCases from '../../hooks/useRecentCases'
import { useLanguage } from '../../contexts/LanguageContext'

const priorityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 }
const INITIAL_COUNT = 6
const CARD_DURATION = 0.25

function getStatusDot(color) {
  return <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
}

const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
}

function SkeletonCard() {
  return (
    <div className="glass-panel p-6 rounded-xl animate-pulse">
      <div className="flex justify-between mb-3">
        <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
      <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded mt-3" />
      <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded mt-2" />
      <div className="flex gap-2 mt-4">
        <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
        <div className="h-5 w-24 bg-slate-200 dark:bg-slate-700 rounded-full" />
      </div>
    </div>
  )
}

export default function RecentCases() {
  const { t } = useLanguage()
  const { data, loading, error, refresh } = useRecentCases()
  const [expanded, setExpanded] = useState(false)

  const sorted = useMemo(() => {
    const raw = data?.recentCases ?? []
    return [...raw].sort((a, b) => {
      const pa = priorityOrder[a.priority] ?? 99
      const pb = priorityOrder[b.priority] ?? 99
      return pa - pb
    })
  }, [data])

  const visibleCases = expanded ? sorted : sorted.slice(0, INITIAL_COUNT)
  const remaining = Math.max(0, sorted.length - INITIAL_COUNT)
  const showToggle = sorted.length > INITIAL_COUNT

  const toggle = useCallback(() => setExpanded((v) => !v), [])

  return (
    <section className="glass-panel p-8 rounded-2xl">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-2xl">folder_open</span>
          {t('landing.activeCases')}
        </h3>
        <div className="flex items-center gap-3">
          <button
            onClick={refresh}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-primary transition-all disabled:opacity-50 rounded-full hover:bg-primary/5"
            title="Refresh"
          >
            <span className={`material-symbols-outlined text-lg ${loading ? 'animate-spin' : ''}`}>refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <span className="material-symbols-outlined text-4xl text-red-400 mb-3">error_outline</span>
          <p className="text-sm text-red-500 font-medium mb-2">{t('common.error') || 'Failed to load cases'}</p>
          <p className="text-xs text-slate-400 mb-4">{error.message}</p>
          <button
            onClick={refresh}
            className="text-xs font-bold text-primary hover:text-primary/80 transition-colors"
          >
            {t('common.retry') || 'Retry'}
          </button>
        </div>
      )}

      {!error && loading && !data && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!error && !loading && sorted.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-3">inbox</span>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{t('landing.noCases') || 'No recent cases'}</p>
        </div>
      )}

      {sorted.length > 0 && (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" id="recent-cases-grid">
          <AnimatePresence initial={false} mode="popLayout">
            {visibleCases.map((c) => (
              <motion.div
                key={c.firNumber}
                layout
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
                variants={cardVariants}
                transition={{ duration: CARD_DURATION, ease: 'easeInOut' }}
                className="glass-panel p-6 rounded-xl hover:border-primary/20 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none transition-all duration-200 ease-out group"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-bold text-primary">{c.firNumber}</span>
                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 shrink-0 ml-2">{c.dateRegistered}</span>
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 line-clamp-2 leading-snug">
                  {c.description}
                </p>
                <div className="flex items-center gap-2 mt-4 flex-wrap">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                    style={{
                      color: c.priorityColor,
                      backgroundColor: `${c.priorityColor}18`,
                      border: `1px solid ${c.priorityColor}40`,
                    }}
                  >
                    {c.priority}
                  </span>
                  <span
                    className="text-[10px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5"
                    style={{
                      color: c.statusColor,
                      backgroundColor: `${c.statusColor}12`,
                      border: `1px solid ${c.statusColor}30`,
                    }}
                  >
                    {getStatusDot(c.statusColor)}
                    {c.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {showToggle && !loading && !error && (
        <motion.button
          layout
          onClick={toggle}
          aria-expanded={expanded}
          aria-controls="recent-cases-grid"
          whileHover={{ y: -2, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
          whileTap={{ scale: 0.98 }}
          className="
            mx-auto mt-8 flex items-center justify-center gap-2
            h-11 px-7 rounded-full
            bg-white/70 dark:bg-slate-800/70
            backdrop-blur-sm
            border border-white/80 dark:border-slate-700/80
            text-sm font-bold text-slate-700 dark:text-slate-200
            hover:bg-white/90 dark:hover:bg-slate-800/90
            hover:shadow-lg hover:shadow-primary/5
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
            transition-colors
            cursor-pointer select-none
          "
          style={{ width: 'fit-content' }}
        >
          <span>{expanded ? t('landing.showLess') : t('landing.viewMore', { count: remaining })}</span>
          <motion.span
            className="material-symbols-outlined text-lg"
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            keyboard_arrow_down
          </motion.span>
        </motion.button>
      )}
    </section>
  )
}
