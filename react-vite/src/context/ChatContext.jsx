import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { generateId } from '../utils/formatters'
import { api } from '../services/api'
import { getWorkspaceTypeFromIntent } from '../utils/helpers'
import { useLanguage } from '../contexts/LanguageContext'

const ChatContext = createContext(null)

function formatResultsToText(results, t) {
  if (!results || (Array.isArray(results) && results.length === 0)) {
    return t('chat.noResultsFound')
  }
  const rows = Array.isArray(results) ? results : [results]
  const lines = rows.map((r) => {
    if (typeof r === 'string') return r
    return Object.entries(r)
      .filter((entry) => entry[1] !== null && entry[1] !== undefined)
      .map(([k, v]) => {
        const label = k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        const val = typeof v === 'object' ? JSON.stringify(v) : String(v)
        return `${label}: ${val}`
      })
      .join(', ')
  })
  return lines.join('\n')
}

export function ChatProvider({ children }) {
  const { language, t } = useLanguage()

  const [conversations, setConversations] = useState([])
  const [currentId, setCurrentId] = useState(null)
  const [workspace, setWorkspace] = useState(null)
  const [loadingIntent, setLoadingIntent] = useState(false)
  const [loadingQuery, setLoadingQuery] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState(null)

  const loadedRef = useRef(false)

  // Load conversation history from backend on mount
  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true

    async function loadHistory() {
      try {
        const result = await api.listConversations()
        if (result.success && result.conversations) {
          const convs = result.conversations.map((c) => ({
            id: `backend_${c.id}`,
            backendId: c.id,
            title: c.title || 'Untitled',
            snippet: c.snippet || '',
            messages: [],
            pinned: false,
            saved: true,
            createdAt: c.createdAt || new Date().toISOString(),
            loaded: false,
          }))
          setConversations(convs)
        }
      } catch (err) {
        console.warn('[Chat] Failed to load conversation history:', err)
      } finally {
        setLoadingHistory(false)
      }
    }

    loadHistory()
  }, [])

  const currentConversation = useMemo(
    () => conversations.find((c) => c.id === currentId) || null,
    [conversations, currentId]
  )

  const newConversation = useCallback(() => {
    const id = generateId()
    const chat = {
      id,
      title: 'New Investigation',
      messages: [],
      pinned: false,
      saved: false,
      backendId: null,
      createdAt: new Date().toISOString(),
    }
    setConversations((prev) => [chat, ...prev])
    setCurrentId(id)
    setWorkspace(null)
    setError(null)
    return id
  }, [])

  const selectConversation = useCallback(
    async (id) => {
      setCurrentId(id)
      setError(null)
      const chat = conversations.find((c) => c.id === id)
      if (!chat) return

      const lastAi = chat.messages?.filter((m) => m.role === 'assistant').pop()
      if (lastAi?.workspaceData) {
        setWorkspace(lastAi.workspaceData)
      } else {
        setWorkspace(null)
      }

      // Load full conversation from backend if not loaded
      if (chat.backendId && !chat.loaded) {
        try {
          const result = await api.getConversation(chat.backendId)
          if (result.success && result.conversation?.messages) {
            setConversations((prev) =>
              prev.map((c) =>
                c.id === id
                  ? { ...c, messages: result.conversation.messages, loaded: true }
                  : c
              )
            )
            const restoredLastAi = result.conversation.messages.filter((m) => m.role === 'assistant').pop()
            if (restoredLastAi?.workspaceData) {
              setWorkspace(restoredLastAi.workspaceData)
            }
          }
        } catch (err) {
          console.warn('[Chat] Failed to load conversation messages:', err)
        }
      }
    },
    [conversations]
  )

  const navigateHome = useCallback(() => {
    setCurrentId(null)
    setWorkspace(null)
    setError(null)
  }, [])

  const deleteConversation = useCallback((id) => {
    setConversations((prev) => prev.filter((c) => c.id !== id))
    setCurrentId((prev) => (prev === id ? null : prev))
  }, [])

  const togglePin = useCallback((id) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c))
    )
  }, [])

  const updateConversationTitle = useCallback((id, firstMsg) => {
    const title = firstMsg.length > 40 ? firstMsg.slice(0, 40) + '...' : firstMsg
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c))
    )
  }, [])

  const saveConversationToBackend = useCallback(
    async (chatId, messages, title) => {
      if (!messages || messages.length === 0) return

      const conversation = messages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        workspaceType: m.workspaceType,
        workspaceData: m.workspaceData,
      }))

      try {
        const response = await api.saveConversation({
          conversation_title: title,
          language,
          conversation,
        })

        if (response.success && response.conversationId) {
          setConversations((prev) =>
            prev.map((c) =>
              c.id === chatId ? { ...c, backendId: response.conversationId, saved: true } : c
            )
          )
        }
      } catch (err) {
        console.warn('[Chat] Failed to save conversation to backend:', err)
      }
    },
    [language]
  )

  const sendMessage = useCallback(
    async (text) => {
      let chatId = currentId
      if (!chatId) {
        chatId = newConversation()
      }

      const userMsg = {
        id: generateId(),
        role: 'user',
        content: text,
        timestamp: new Date().toISOString(),
      }

      setConversations((prev) =>
        prev.map((c) =>
          c.id === chatId ? { ...c, messages: [...c.messages, userMsg] } : c
        )
      )

      if (currentConversation?.messages.length === 0) {
        updateConversationTitle(chatId, text)
      }

      setError(null)

      // --- Step 1: Intent classification via test-llm ---
      setLoadingIntent(true)

      let intentResult
      try {
        intentResult = await api.classifyIntent({ question: text, language })
      } catch (err) {
        const errMsg = t('chat.errorUnableToUnderstand')
        setError(errMsg)
        setConversations((prev) =>
          prev.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  messages: [
                    ...c.messages,
                    {
                      id: generateId(),
                      role: 'assistant',
                      content: errMsg,
                      timestamp: new Date().toISOString(),
                      isError: true,
                    },
                  ],
                }
              : c
          )
        )
        setLoadingIntent(false)
        return
      } finally {
        setLoadingIntent(false)
      }

      const {
        intent = 'search_fir',
        accused_name,
        fir_number,
        victim_name,
        location_name,
      } = intentResult

      // --- Step 2: Data query ---
      setLoadingQuery(true)

      let queryResult
      try {
        queryResult = await api.query({
          intent,
          language,
          ...(accused_name && { accused_name }),
          ...(fir_number && { fir_number }),
          ...(victim_name && { victim_name }),
          ...(location_name && { location_name }),
        })
      } catch (err) {
        const errMsg = t('chat.errorUnableToRetrieve')
        setError(errMsg)
        setConversations((prev) =>
          prev.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  messages: [
                    ...c.messages,
                    {
                      id: generateId(),
                      role: 'assistant',
                      content: errMsg,
                      timestamp: new Date().toISOString(),
                      isError: true,
                    },
                  ],
                }
              : c
          )
        )
        setLoadingQuery(false)
        return
      } finally {
        setLoadingQuery(false)
      }

      // --- Build workspace ---
      const workspaceType = getWorkspaceTypeFromIntent(intent)

      const rawData = queryResult.rows || queryResult.results || queryResult.data || queryResult
      const normalizedData = Array.isArray(rawData) && rawData.length === 1 ? rawData[0] : rawData

      const workspaceData = {
        type: workspaceType,
        title: queryResult.summary || 'Analysis Result',
        data: normalizedData,
      }

      setWorkspace(workspaceData)

      // --- Build response text ---
      const responseText =
        queryResult.text ||
        queryResult.summary ||
        formatResultsToText(queryResult.rows || queryResult.results, t) ||
        t('chat.analysisComplete')

      // --- Stream response ---
      setStreaming(true)

      const aiMsgId = generateId()
      const aiMessage = {
        id: aiMsgId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        workspaceType,
        workspaceData,
      }

      setConversations((prev) =>
        prev.map((c) =>
          c.id === chatId
            ? { ...c, messages: [...c.messages, aiMessage] }
            : c
        )
      )

      const words = responseText.split(' ')
      let accumulated = ''
      for (let i = 0; i < words.length; i++) {
        await new Promise((r) => setTimeout(r, 30))
        accumulated += (i > 0 ? ' ' : '') + words[i]
        setConversations((prev) =>
          prev.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === aiMsgId ? { ...m, content: accumulated } : m
                  ),
                }
              : c
          )
        )
      }

      setStreaming(false)

      // --- Save entire conversation to backend ---
      const title = conversations.find((c) => c.id === chatId)?.title || text

      setTimeout(() => {
        setConversations((prev) => {
          const chat = prev.find((c) => c.id === chatId)
          if (!chat) return prev
          saveConversationToBackend(chatId, chat.messages, title)
          return prev
        })
      }, 100)
    },
    [currentId, currentConversation, conversations, newConversation, updateConversationTitle, saveConversationToBackend]
  )

  const clearError = useCallback(() => setError(null), [])

  const value = useMemo(
    () => ({
      conversations,
      currentId,
      currentConversation,
      workspace,
      loadingIntent,
      loadingQuery,
      loading: loadingIntent || loadingQuery,
      loadingHistory,
      streaming,
      error,
      sendMessage,
      newConversation,
      selectConversation,
      navigateHome,
      deleteConversation,
      togglePin,
      clearError,
    }),
    [
      conversations,
      currentId,
      currentConversation,
      workspace,
      loadingIntent,
      loadingQuery,
      loadingHistory,
      streaming,
      error,
      sendMessage,
      newConversation,
      selectConversation,
      navigateHome,
      deleteConversation,
      togglePin,
      clearError,
    ]
  )

  return (
    <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
  )
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used within ChatProvider')
  return ctx
}
