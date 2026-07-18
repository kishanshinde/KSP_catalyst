import { useState, useCallback, useRef, useEffect } from 'react'

const SpeechRecognitionAPI = typeof window !== 'undefined'
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null

export default function useSpeechRecognition({ lang = 'en-IN', onResult } = {}) {
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState(null)
  const recognitionRef = useRef(null)
  const finalTranscriptRef = useRef('')
  const onResultRef = useRef(onResult)

  onResultRef.current = onResult

  const isSupported = !!SpeechRecognitionAPI

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
        recognitionRef.current = null
      }
    }
  }, [])

  const start = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      setError('not-supported')
      return
    }

    if (recognitionRef.current) {
      recognitionRef.current.abort()
    }

    const recognition = new SpeechRecognitionAPI()
    recognition.lang = lang
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.continuous = false

    recognition.onstart = () => {
      setIsRecording(true)
      setError(null)
      finalTranscriptRef.current = ''
    }

    recognition.onresult = (event) => {
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript
        }
      }
      if (transcript) {
        finalTranscriptRef.current = transcript
      }
    }

    recognition.onend = () => {
      setIsRecording(false)
      recognitionRef.current = null
      if (finalTranscriptRef.current) {
        onResultRef.current?.(finalTranscriptRef.current)
      }
    }

    recognition.onerror = (event) => {
      if (event.error === 'aborted') return
      console.error('[SpeechRecognition] Error:', event.error)
      setError(event.error)
      setIsRecording(false)
      recognitionRef.current = null
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [lang])

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }, [])

  return {
    isSupported,
    isRecording,
    error,
    start,
    stop,
  }
}
