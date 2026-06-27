import {
  mockClassifyIntentResponse,
  mockQueryResponse,
  mockDashboardResponse,
} from './mockData'

const USE_MOCK = false

const API_BASE = import.meta.env.VITE_API_URL || ''

const TIMEOUT_MS = 10000

class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

async function request(endpoint, body) {
  if (USE_MOCK) {
    console.warn(`[API Mock] POST ${endpoint}`, body)
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
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
      throw new ApiError('Request timed out after 10 seconds', 408, null)
    }
    throw new ApiError(
      err.message || 'Network request failed',
      0,
      null
    )
  }
}

async function requestBlob(endpoint, body) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
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
      throw new ApiError('Request timed out after 10 seconds', 408, null)
    }
    throw new ApiError(
      err.message || 'Network request failed',
      0,
      null
    )
  }
}

export const api = {
  classifyIntent(params) {
    if (USE_MOCK) {
      return Promise.resolve(mockClassifyIntentResponse(params))
    }
    return request('/test-llm', {
      question: params.question || params.message,
    })
  },

  query(params) {
    if (USE_MOCK) {
      return Promise.resolve(mockQueryResponse(params))
    }
    return request('/query', params)
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
}

export { ApiError }
