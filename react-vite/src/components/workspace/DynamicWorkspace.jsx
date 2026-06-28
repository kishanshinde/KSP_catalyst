import { motion, AnimatePresence } from 'framer-motion'
import { workspaceRegistry } from './registry'

export default function DynamicWorkspace({ workspace }) {
  if (!workspace || !workspace.type) {
    return (
      <div className="flex items-center justify-center h-full text-on-surface-variant/40">
        <p className="text-sm">Select a conversation to view analysis</p>
      </div>
    )
  }

  const Component = workspaceRegistry[workspace.type]

  if (!Component) {
    return (
      <div className="flex items-center justify-center h-full text-on-surface-variant/40">
        <p className="text-sm">Unknown workspace type: {workspace.type}</p>
      </div>
    )
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={workspace.type + (workspace.title || '')}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.3 }}
        className="h-full overflow-y-auto"
      >
        {workspace.title && (
          <div className="px-5 pt-5 pb-3">
            <h2 className="text-base font-semibold text-on-surface">{workspace.title}</h2>
          </div>
        )}
        <div className="px-5 pb-5">
          <Component data={workspace.data} />
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
