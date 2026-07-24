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
