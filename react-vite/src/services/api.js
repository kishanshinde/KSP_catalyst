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

async function requestGet(endpoint, params, options = {}) {
  const query = params ? '?' + new URLSearchParams(params).toString() : ''
  const { signal: externalSignal } = options
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  const signal = externalSignal
    ? AbortSignal.any([controller.signal, externalSignal])
    : controller.signal

  try {
    const response = await fetch(`${API_BASE}${endpoint}${query}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
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

function normalizeCrimeTrendResponse(raw) {
  if (!raw || !raw.success) {
    throw new ApiError(
      raw?.message || 'Failed to fetch crime trends',
      raw?.status || 500,
      raw
    )
  }
  return raw.data || raw
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

  getCrimeTrends(params, options = {}) {
    if (USE_MOCK) {
      const y = params.year || 2026
      const m = params.month
      const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
      const mockData = {
        year: y,
        dateRange: m ? { from: `${y}-${String(m).padStart(2,'0')}-01`, to: `${y}-${String(m).padStart(2,'0')}-28` } : { from: `${y}-01-01`, to: `${y}-12-31` },
        metadata: {
          requestId: 'mock_req',
          generatedAt: new Date().toISOString(),
          generatedBy: 'CrimeTrends',
          mode: m ? 'month' : 'year',
          timezone: 'Asia/Kolkata',
          source: 'Catalyst Datastore',
          apiVersion: '1.0',
          reportSchemaVersion: '1.0'
        },
        summary: {
          totalCrimes: 42,
          averagePerDay: 6,
          highestDay: m ? `${y}-${String(m).padStart(2,'0')}-01` : `${y}-07`,
          highestCount: 8,
          trendPercentage: m ? -12.5 : 0
        },
        analytics: {
          currentPeriodCount: 42,
          previousPeriodCount: m ? 48 : 0,
          growthRate: m ? -12.5 : 0,
          peakCrimeType: 'Theft',
          lowestCrimeType: 'Cyber Fraud',
          peakWeekday: 'Wednesday',
          busiestHour: null
        },
        chart: m
          ? Array.from({ length: 28 }, (_, i) => ({ date: `${y}-${String(m).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`, label: String(i + 1), count: Math.floor(Math.random() * 10) }))
          : monthNames.map((name, i) => ({ date: `${y}-${String(i+1).padStart(2,'0')}`, label: name, count: Math.floor(Math.random() * 50) })),
        crimeTypes: [
          { crime: 'Theft', count: 15, change: -5.2, trend: 'down' },
          { crime: 'Vehicle Theft', count: 8, change: 21.0, trend: 'up' },
          { crime: 'Cyber Fraud', count: 6, change: -12.0, trend: 'down' },
          { crime: 'Assault', count: 5, change: 8.3, trend: 'up' },
          { crime: 'Burglary', count: 4, change: 0, trend: 'same' }
        ],
        insights: [
          { type: 'highest_day', title: 'Highest Crime Activity', description: 'Wednesday recorded 18 FIRs.' },
          { type: 'crime_increase', title: 'Largest Increase', description: 'Vehicle Theft increased by 21%.' },
          { type: 'crime_decrease', title: 'Largest Reduction', description: 'Cyber Fraud reduced by 12%.' }
        ]
      }
      if (m) {
        mockData.month = m
        mockData.monthName = monthNames[m - 1]
      }
      return Promise.resolve(mockData)
    }
    return requestGet('/CrimeTrends', params, options).then(normalizeCrimeTrendResponse)
  },

  getRecentCases(options = {}) {
    if (USE_MOCK) {
      return Promise.resolve({
        success: true,
        total: 3,
        recentCases: [
          { firNumber: 'FIR-2026-0012', description: 'Organized Retail Theft Ring', status: 'Open', statusColor: '#10B981', priority: 'High', priorityColor: '#F97316', dateRegistered: '14 Apr 2026' },
          { firNumber: 'FIR-2026-0045', description: 'Financial Fraud - Crypto Mixer', status: 'Under Investigation', statusColor: '#F59E0B', priority: 'Critical', priorityColor: '#DC2626', dateRegistered: '10 Apr 2026' },
          { firNumber: 'FIR-2026-0089', description: 'Unauthorized Border Crossing', status: 'Registered', statusColor: '#3B82F6', priority: 'Medium', priorityColor: '#EAB308', dateRegistered: '05 Apr 2026' },
        ]
      })
    }
    return requestGet('/RecentCases', null, options)
  },

  async generateCrimeTrendsReport(data) {
    if (USE_MOCK) {
      return { blob: new Blob(['mock pdf'], { type: 'application/pdf' }) }
    }
    const blob = await requestBlob('/generatePDF', { reportType: 'crime_trends', ...data })
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

  getCNASummary(options = {}) {
    return request('/criminal-network-analysis', { action: 'get_summary' }, options)
  },

  searchCNANetwork({ searchType, searchQuery, depth }, options = {}) {
    return request('/criminal-network-analysis', {
      action: 'get_full_network',
      params: { search_type: searchType, search_query: searchQuery, depth },
    }, options)
  },

  getCNAFullNetwork(options = {}) {
    return request('/criminal-network-analysis', { action: 'get_full_network' }, options)
  },
}

export { ApiError }
