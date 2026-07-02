export const APP_NAME = 'KSP Crime Intelligence Platform'
export const APP_TITLE = 'KSP Crime Intelligence Platform'
export const WELCOME_MESSAGE = 'Welcome Officer.'
export const WELCOME_SUBTITLE = 'How can I assist your investigation today?'
export const INPUT_PLACEHOLDER = 'Ask anything about FIRs, Accused, Victims, Investigation, Crime Patterns...'

export const ROUTES = {
  HOME: '/',
  CHAT: '/chat/:id',
  ANALYTICS: '/analytics',
  REPORTS: '/reports',
  SETTINGS: '/settings',
}

export const WORKSPACE_TYPES = {
  HEATMAP: 'heatmap',
  NETWORK: 'network',
  TIMELINE: 'timeline',
  CHART: 'chart',
  PROFILE: 'profile',
  FINANCIAL: 'financial',
  TREND: 'trend',
  ALERT: 'alert',
}

export const MESSAGE_STATUS = {
  SENDING: 'sending',
  PROCESSING: 'processing',
  STREAMING: 'streaming',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  FAILED: 'failed',
}

export const LOADING_PHASES = [
  { after: 0,      labelKey: 'chat.phaseUnderstanding' },
  { after: 15000,  labelKey: 'chat.phaseSearching' },
  { after: 30000,  labelKey: 'chat.phaseGenerating' },
  { after: 45000,  labelKey: 'chat.phaseTranslating' },
  { after: 60000,  labelKey: 'chat.phaseFinalizing' },
]

export const DEFAULT_DASHBOARD_WIDGETS = [
  { id: 'heatmap-preview', type: 'heatmap', title: 'Crime Heatmap Preview', cols: 2, rows: 1 },
  { id: 'trend-preview', type: 'trend', title: 'Crime Trend Preview', cols: 1, rows: 1 },
  { id: 'recent-alerts', type: 'alert', title: 'Recent Alerts', cols: 1, rows: 1 },
  { id: 'network-preview', type: 'network', title: 'Criminal Network Preview', cols: 2, rows: 1 },
  { id: 'investigation-summary', type: 'profile', title: 'Investigation Summary', cols: 1, rows: 1 },
  { id: 'ai-queries', type: 'chart', title: 'AI Suggested Queries', cols: 1, rows: 1 },
]
