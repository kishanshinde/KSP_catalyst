import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { generateId } from '../utils/formatters'
import { api } from '../services/api'
import { useLanguage } from '../contexts/LanguageContext'
import { MESSAGE_STATUS, LOADING_PHASES } from '../utils/constants'

function serializeMessage(message) {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    status: message.status,
    timestamp: message.timestamp,
    workspaceType: message.workspaceType ?? null,
    workspaceData: message.workspaceData ?? null,
    metadata: message.metadata ?? {},
    attachments: message.attachments?.length
      ? message.attachments.map((a) => ({
          id: a.id,
          name: a.name,
          size: a.size,
          type: a.type,
          uploaded: a.uploaded ?? false,
          fileId: a.fileId ?? null,
        }))
      : [],
  }
}

const ChatContext = createContext(null)

export function ChatProvider({ children }) {
  const { language, t } = useLanguage()

  const [conversations, setConversations] = useState([])
  const [currentId, setCurrentId] = useState(null)
  const [workspace, setWorkspace] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [loadingConversation, setLoadingConversation] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [loadingPhase, setLoadingPhase] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [attachments, setAttachments] = useState([])

  const loadedRef = useRef(false)
  const savingRef = useRef(false)
  const pendingSaveRef = useRef(null)
  const conversationsRef = useRef(conversations)
  const abortControllerRef = useRef(null)
  const streamingMsgIdRef = useRef(null)
  const loadingPhaseRef = useRef(null)
  conversationsRef.current = conversations

  // Load conversation list from backend on mount (metadata only)
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
            snippet: '',
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
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    const id = generateId()
    const chat = {
      id,
      title: 'New Investigation',
      schemaVersion: 1,
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
    setLoadingPhase(null)
    setLoading(false)
    setStreaming(false)
    return id
  }, [])

  const selectConversation = useCallback(
    async (id) => {
      setCurrentId(id)
      setError(null)
      const chat = conversationsRef.current.find((c) => c.id === id)
      if (!chat) {
        console.warn('[Chat] Conversation not found:', id)
        return false
      }

      const lastAi = chat.messages?.filter((m) => m.role === 'assistant').pop()
      if (lastAi?.workspaceData) {
        setWorkspace(lastAi.workspaceData)
      } else {
        setWorkspace(null)
      }

      // If messages already in memory, skip API call
      if (chat.messages && chat.messages.length > 0) {
        return true
      }

      // Load full conversation from backend if not loaded
      if (chat.backendId && !chat.loaded) {
        setLoadingConversation(true)
        try {
          const result = await api.getConversation(chat.backendId)
          if (result.success && result.conversation?.messages) {
            const raw = result.conversation.messages
            // Support both old format (array) and new format ({ schemaVersion, messages })
            const msgArray = Array.isArray(raw) ? raw : (raw?.messages ?? [])
            if (!Array.isArray(msgArray)) {
              console.error('[Chat] messages is not an array after normalization:', { raw, msgArray, conversationId: chat.backendId })
              return false
            }
            const loadedMessages = msgArray.map((m) => ({
              id: m.id ?? generateId(),
              ...m,
              metadata: m.metadata ?? {},
            }))
            setConversations((prev) =>
              prev.map((c) =>
                c.id === id
                  ? { ...c, messages: loadedMessages, loaded: true }
                  : c
              )
            )
            const restoredLastAi = loadedMessages.filter((m) => m.role === 'assistant').pop()
            if (restoredLastAi?.workspaceData) {
              setWorkspace(restoredLastAi.workspaceData)
            }
            return true
          }
          return false
        } catch (err) {
          console.warn('[Chat] Failed to load conversation messages:', err)
          return false
        } finally {
          setLoadingConversation(false)
        }
      }

      return true
    },
    []
  )

  const navigateHome = useCallback(() => {
    setCurrentId(null)
    setWorkspace(null)
    setError(null)
  }, [])

  const saveConversationToBackend = useCallback(
    async (chatId) => {
      // Debounce: if a save is already in progress, queue the latest chatId
      if (savingRef.current) {
        pendingSaveRef.current = chatId
        return
      }

      savingRef.current = true
      setSaving(true)
      try {
        const chat = conversationsRef.current.find((c) => c.id === chatId)
        if (!chat || !chat.messages || chat.messages.length === 0) return

        const formatted = chat.messages.map(serializeMessage)

        const payload = {
          conversation_title: chat.title,
          language,
          conversation: {
            schemaVersion: chat.schemaVersion ?? 1,
            messages: formatted,
          },
        }

        // Include existing backendId for UPDATE on subsequent saves
        if (chat.backendId) {
          payload.conversationId = chat.backendId
        }

        const response = await api.saveConversation(payload)

        if (response.success && response.conversationId) {
          setConversations((prev) =>
            prev.map((c) =>
              c.id === chatId
                ? { ...c, backendId: response.conversationId, saved: true }
                : c
            )
          )
        }
      } catch (err) {
        console.warn('[Chat] Failed to save conversation to backend:', err)
      } finally {
        savingRef.current = false
        setSaving(false)
        // Process any pending save that was queued during this one
        const pending = pendingSaveRef.current
        pendingSaveRef.current = null
        if (pending) {
          saveConversationToBackend(pending)
        }
      }
    },
    [language]
  )

  const updateBackendId = useCallback((chatId, backendId) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === chatId ? { ...c, backendId, saved: true } : c
      )
    )
  }, [])

  const exportConversationPDF = useCallback(
    async (chatId) => {
      const chat = conversationsRef.current.find((c) => c.id === chatId)
      if (!chat) return

      let targetBackendId = chat.backendId

      // Auto-save if conversation hasn't been saved yet
      if (!targetBackendId) {
        try {
          const msgs = (chat.messages || []).map(serializeMessage)

          const response = await api.saveConversation({
            conversation_title: chat.title,
            language,
            conversation: {
              schemaVersion: chat.schemaVersion ?? 1,
              messages: msgs,
            },
          })

          if (response.success && response.conversationId) {
            targetBackendId = response.conversationId
            updateBackendId(chatId, response.conversationId)
          }
        } catch (err) {
          console.error('[Chat] Failed to auto-save conversation for PDF export:', err)
          return
        }
      }

      if (!targetBackendId) return

      try {
        const { blob } = await api.generatePDF(targetBackendId)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `conversation_${targetBackendId}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch (err) {
        console.error('[Chat] PDF export failed:', err)
      }
    },
    [language, updateBackendId]
  )

  const addAttachments = useCallback((files) => {
    const newFiles = Array.from(files).map((file) => ({
      id: generateId(),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
    }))
    setAttachments((prev) => [...prev, ...newFiles])
  }, [])

  const removeAttachment = useCallback((id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const clearAttachments = useCallback(() => {
    setAttachments([])
  }, [])

  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    const streamingId = streamingMsgIdRef.current
    if (streamingId) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === currentId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === streamingId
                    ? {
                        ...m,
                        status: MESSAGE_STATUS.CANCELLED,
                        content:
                          m.content +
                          '\n\n*⚠️ ' + t('chat.generationCancelled') + '.*',
                      }
                    : m
                ),
              }
            : c
        )
      )
      streamingMsgIdRef.current = null
    }
    setLoading(false)
    setStreaming(false)
    setLoadingPhase(null)
  }, [currentId, t])

  const deleteConversation = useCallback(
    async (id) => {
      const chat = conversationsRef.current.find((c) => c.id === id)
      if (!chat) return

      const previousList = conversationsRef.current
      const wasCurrent = currentId === id

      // Optimistic removal
      setConversations((prev) => prev.filter((c) => c.id !== id))
      if (wasCurrent) {
        setCurrentId(null)
        setWorkspace(null)
      }

      // Sync with backend if the conversation was saved
      if (chat.backendId) {
        try {
          await api.deleteConversation(chat.backendId)
        } catch (err) {
          console.warn('[Chat] Failed to delete conversation on backend:', err)
          // Rollback
          setConversations(previousList)
          if (wasCurrent) {
            setCurrentId(id)
          }
        }
      }
    },
    [currentId]
  )

  const renameConversation = useCallback(
    async (id, newTitle) => {
      const chat = conversationsRef.current.find((c) => c.id === id)
      if (!chat) return

      const previousTitle = chat.title

      // Optimistic update
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
      )

      // Sync with backend if saved
      if (chat.backendId) {
        try {
          await api.renameConversation(chat.backendId, newTitle)
        } catch (err) {
          console.warn('[Chat] Failed to rename conversation on backend:', err)
          // Rollback
          setConversations((prev) =>
            prev.map((c) => (c.id === id ? { ...c, title: previousTitle } : c))
          )
        }
      }
    },
    []
  )

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

  const sendMessage = useCallback(
    async (text) => {
      let chatId = currentId
      if (!chatId) {
        chatId = newConversation()
      }

      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }

      // Clear attachments on send
      clearAttachments()

      const userMsg = {
        id: generateId(),
        role: 'user',
        content: text,
        status: MESSAGE_STATUS.COMPLETED,
        timestamp: new Date().toISOString(),
        workspaceType: null,
        workspaceData: null,
        metadata: {},
        attachments: [],
      }

      setConversations((prev) =>
        prev.map((c) =>
          c.id === chatId ? { ...c, messages: [...c.messages, userMsg] } : c
        )
      )

      const chat = conversationsRef.current.find((c) => c.id === chatId)
      if (chat && chat.messages.length === 0) {
        updateConversationTitle(chatId, text)
      }

      setError(null)

      // --- Single AI chat call ---
      setLoading(true)
      setLoadingPhase(LOADING_PHASES[0].labelKey)

      const controller = new AbortController()
      abortControllerRef.current = controller

      // Loading phase interval timer
      const phaseStartTime = Date.now()
      loadingPhaseRef.current = setInterval(() => {
        const elapsed = Date.now() - phaseStartTime
        let currentPhase = LOADING_PHASES[0].labelKey
        for (let i = LOADING_PHASES.length - 1; i >= 0; i--) {
          if (elapsed >= LOADING_PHASES[i].after) {
            currentPhase = LOADING_PHASES[i].labelKey
            break
          }
        }
        setLoadingPhase(currentPhase)
      }, 5000)

      // Placeholder assistant message with PROCESSING status
      const aiMsgId = generateId()
      streamingMsgIdRef.current = aiMsgId

      const processingMessage = {
        id: aiMsgId,
        role: 'assistant',
        content: '',
        status: MESSAGE_STATUS.PROCESSING,
        timestamp: new Date().toISOString(),
        workspaceType: null,
        workspaceData: null,
        metadata: {},
        attachments: [],
      }

      setConversations((prev) =>
        prev.map((c) =>
          c.id === chatId
            ? { ...c, messages: [...c.messages, processingMessage] }
            : c
        )
      )

      let aiResponse
      try {
        aiResponse = await api.aiChat(
          { message: text, language },
          { signal: controller.signal }
        )
        clearInterval(loadingPhaseRef.current)
        loadingPhaseRef.current = null
        setLoadingPhase(null)
      } catch (err) {
        clearInterval(loadingPhaseRef.current)
        loadingPhaseRef.current = null
        setLoadingPhase(null)
        // User-initiated cancellation — silent return (content already marked)
        if (err.name === 'AbortError' || controller.signal.aborted) {
          setLoading(false)
          setStreaming(false)
          streamingMsgIdRef.current = null
          return
        }
        const errMsg = t('chat.errorUnableToUnderstand')
        setError(errMsg)
        setConversations((prev) =>
          prev.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === aiMsgId
                      ? { ...m, content: errMsg, status: MESSAGE_STATUS.FAILED, isError: true }
                      : m
                  ),
                }
              : c
          )
        )
        setLoading(false)
        setStreaming(false)
        streamingMsgIdRef.current = null
        return
      }

      const { assistant, workspace } = aiResponse

      if (!aiResponse.success) {
        const errMsg = aiResponse.error?.message || t('chat.errorUnableToUnderstand')
        setError(errMsg)
        setConversations((prev) =>
          prev.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === aiMsgId
                      ? { ...m, content: errMsg, status: MESSAGE_STATUS.FAILED, isError: true }
                      : m
                  ),
                }
              : c
          )
        )
        setLoading(false)
        setStreaming(false)
        streamingMsgIdRef.current = null
        return
      }

      setWorkspace(workspace)

      const displayText = assistant?.content || t('chat.analysisComplete')

      // Update to STREAMING status
      setConversations((prev) =>
        prev.map((c) =>
          c.id === chatId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === aiMsgId
                    ? {
                        ...m,
                        status: MESSAGE_STATUS.STREAMING,
                        workspaceType: workspace?.type || null,
                        workspaceData: workspace || null,
                      }
                    : m
                ),
              }
            : c
        )
      )

      setStreaming(true)

      // --- Stream response word-by-word ---
      const words = displayText.split(' ')
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

      // Mark as COMPLETED
      setConversations((prev) =>
        prev.map((c) =>
          c.id === chatId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === aiMsgId ? { ...m, status: MESSAGE_STATUS.COMPLETED } : m
                ),
              }
            : c
        )
      )

      setStreaming(false)
      setLoading(false)
      streamingMsgIdRef.current = null

      // --- Save entire conversation to backend ---
      saveConversationToBackend(chatId)
    },
    [currentId, newConversation, updateConversationTitle, saveConversationToBackend, language, t, clearAttachments]
  )

  const clearError = useCallback(() => setError(null), [])

  const value = useMemo(
    () => ({
      conversations,
      currentId,
      currentConversation,
      workspace,
      loading,
      loadingHistory,
      loadingConversation,
      loadingPhase,
      streaming,
      saving,
      error,
      attachments,
      sendMessage,
      newConversation,
      selectConversation,
      navigateHome,
      deleteConversation,
      renameConversation,
      updateBackendId,
      exportConversationPDF,
      togglePin,
      clearError,
      addAttachments,
      removeAttachment,
      clearAttachments,
      cancelGeneration,
    }),
    [
      conversations,
      currentId,
      currentConversation,
      workspace,
      loading,
      loadingHistory,
      loadingConversation,
      loadingPhase,
      streaming,
      saving,
      error,
      attachments,
      sendMessage,
      newConversation,
      selectConversation,
      navigateHome,
      deleteConversation,
      renameConversation,
      updateBackendId,
      exportConversationPDF,
      togglePin,
      clearError,
      addAttachments,
      removeAttachment,
      clearAttachments,
      cancelGeneration,
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
