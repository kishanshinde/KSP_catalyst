import { mockDashboardResponse } from './mockData'

const USE_MOCK = false

const API_BASE = import.meta.env.VITE_API_URL || ''

const TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT ?? 300000)

class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

async function request(endpoint, body, options = {}) {
  if (USE_MOCK) {
    console.warn(`[API Mock] POST ${endpoint}`, body)
  }

  const { signal: externalSignal } = options
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  const signal = externalSignal
    ? AbortSignal.any([controller.signal, externalSignal])
    : controller.signal

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      let errorData
      try {
        errorData = await response.json()
      } catch {
        errorData = null
      }
      throw new ApiError(
        errorData?.message || `Request failed with status ${response.status}`,
        response.status,
        errorData
      )
    }

    return response.json()
  } catch (err) {
    clearTimeout(timeoutId)
    if (err instanceof ApiError) throw err
    if (err.name === 'AbortError') {
      if (externalSignal?.aborted) {
        throw err
      }
      throw new ApiError(`Request timed out after ${TIMEOUT_MS / 1000}s`, 408, null)
    }
    throw new ApiError(
      err.message || 'Network request failed',
      0,
      null
    )
  }
}

async function requestBlob(endpoint, body, options = {}) {
  const { signal: externalSignal } = options
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  const signal = externalSignal
    ? AbortSignal.any([controller.signal, externalSignal])
    : controller.signal

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      let errorData
      try {
        errorData = await response.json()
      } catch {
        errorData = null
      }
      throw new ApiError(
        errorData?.message || `Request failed with status ${response.status}`,
        response.status,
        errorData
      )
    }

    return response.blob()
  } catch (err) {
    clearTimeout(timeoutId)
    if (err instanceof ApiError) throw err
    if (err.name === 'AbortError') {
      if (externalSignal?.aborted) {
        throw err
      }
      throw new ApiError(`Request timed out after ${TIMEOUT_MS / 1000}s`, 408, null)
    }
    throw new ApiError(
      err.message || 'Network request failed',
      0,
      null
    )
  }
}

function normalizeAIResponse(raw) {
  return {
    success: raw.success !== false,

    conversation: {
      id: raw.conversation?.id ?? null,
      title: raw.conversation?.title ?? null,
    },

    assistant: raw.assistant || {
      role: 'assistant',
      content: raw.response || raw.text || '',
      timestamp: raw.timestamp || new Date().toISOString(),
    },

    workspace: raw.workspace || {
      type: raw.workspaceType || (raw.raw_data ? 'chart' : 'empty'),
      data: raw.raw_data
        ? { raw_data: raw.raw_data, data_count: raw.data_count || 0 }
        : {},
    },

    metadata: {
      language: raw.metadata?.language ?? raw.language ?? null,
      intent: raw.metadata?.intent ?? raw.intent ?? null,
      processingTime: raw.metadata?.processingTime ?? null,
      model: raw.metadata?.model ?? null,
      citations: raw.metadata?.citations ?? null,
      metrics: {
        llmLatency: raw.metadata?.metrics?.llmLatency ?? null,
        searchLatency: raw.metadata?.metrics?.searchLatency ?? null,
        translationLatency: raw.metadata?.metrics?.translationLatency ?? null,
      },
    },

    error: raw.error ?? null,
  }
}

export const api = {
  aiChat(params, options = {}) {
    if (USE_MOCK) {
      return Promise.resolve({
        success: true,
        assistant: {
          role: 'assistant',
          content: 'Based on the available records, here is the investigation summary.',
          timestamp: new Date().toISOString(),
        },
        workspace: {
          type: 'chart',
          data: { raw_data: [], data_count: 0 },
        },
        metadata: {
          intent: 'search_fir',
          language: 'en',
          processingTime: null,
          model: null,
          citations: null,
          metrics: { llmLatency: null, searchLatency: null, translationLatency: null },
        },
      })
    }
    return request('/ai-chat/', params, options).then(normalizeAIResponse)
  },

  dashboard() {
    if (USE_MOCK) {
      return Promise.resolve(mockDashboardResponse())
    }
    return request('/dashboardAggregation')
  },

  saveConversation(data) {
    if (USE_MOCK) {
      return Promise.resolve({ success: true, conversationId: `mock_${Date.now()}` })
    }
    return request('/saveConversation', data)
  },

  listConversations() {
    if (USE_MOCK) {
      return Promise.resolve({
        success: true,
        conversations: [
          { id: 'mock_1', title: 'Sample Investigation', snippet: 'search fir', createdAt: new Date().toISOString() },
        ],
      })
    }
    return request('/listConversations')
  },

  getConversation(conversationId) {
    if (USE_MOCK) {
      return Promise.resolve({
        success: true,
        conversation: {
          id: conversationId,
          title: 'Sample Investigation',
          messages: [
            { role: 'user', content: 'search fir', timestamp: new Date().toISOString() },
            { role: 'assistant', content: 'Here are the results.', timestamp: new Date().toISOString() },
          ],
        },
      })
    }
    return request('/getConversation', { conversationId })
  },

  async generatePDF(conversationId) {
    if (USE_MOCK) {
      return { blob: new Blob(['mock pdf'], { type: 'application/pdf' }) }
    }
    const blob = await requestBlob('/generatePDF', { conversationId })
    return { blob }
  },

  renameConversation(conversationId, conversation_title) {
    if (USE_MOCK) {
      return Promise.resolve({ success: true })
    }
    return request('/renameConversation', { conversationId, conversation_title })
  },

  deleteConversation(conversationId) {
    if (USE_MOCK) {
      return Promise.resolve({ success: true })
    }
    return request('/deleteConversation', { conversationId })
  },
}

export { ApiError }
