/**
 * Central application state management hook.
 * Manages active database, LLM configuration, theme, and active tab.
 */
import { useState, useCallback, useEffect } from 'react'

export type TabId = 'chat' | 'history' | 'saved' | 'settings'

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'groq' | 'gemini'
  model: string
  apiKey: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sqlQuery?: string
  sqlQueries?: string[]
  results?: Array<Record<string, any>>
  rowCount?: number
  executionTimeMs?: number
  error?: string
  timestamp: Date
}

const DEFAULT_LLM_CONFIG: LLMConfig = {
  provider: 'gemini',
  model: 'gemini-2.5-flash',
  apiKey: '',
}

const LLM_MODELS: Record<string, string[]> = {
  openai: ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
  groq: ['meta-llama/llama-4-scout-17b-16e-instruct', 'meta-llama/llama-4-maverick-17b-128e-instruct', 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'qwen-2.5-32b'],
  gemini: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return fallback
}

function saveToStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch { /* ignore */ }
}

export function useAppState() {
  // Active tab
  const [activeTab, setActiveTab] = useState<TabId>('chat')

  // Active database
  const [activeDatabaseId, setActiveDatabaseId] = useState<string | null>(
    loadFromStorage('activeDatabaseId', null)
  )

  // LLM config (persisted)
  const [llmConfig, setLlmConfigState] = useState<LLMConfig>(
    loadFromStorage('llmConfig', DEFAULT_LLM_CONFIG)
  )


  // Sidebar collapsed
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Chat messages
  const [messages, setMessages] = useState<ChatMessage[]>([])

  // Chat loading state
  const [isQuerying, setIsQuerying] = useState(false)

  // Persist active database
  useEffect(() => {
    saveToStorage('activeDatabaseId', activeDatabaseId)
  }, [activeDatabaseId])

  // Persist LLM config
  const setLlmConfig = useCallback((config: LLMConfig) => {
    setLlmConfigState(config)
    saveToStorage('llmConfig', config)
  }, [])

  // Enforce dark theme just in case
  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev)
  }, [])

  // Chat message helpers
  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    setMessages(prev => [...prev, {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    }])
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  // Get conversation history for the API (last N messages)
  const getConversationHistory = useCallback(() => {
    return messages.slice(-10).map(m => ({
      role: m.role,
      content: m.role === 'user' ? m.content : (m.content || ''),
    }))
  }, [messages])

  // Check if LLM is configured
  const isLlmConfigured = Boolean(llmConfig.apiKey && llmConfig.provider && llmConfig.model)

  return {
    // Tab
    activeTab,
    setActiveTab,

    // Database
    activeDatabaseId,
    setActiveDatabaseId,

    // LLM
    llmConfig,
    setLlmConfig,
    isLlmConfigured,
    llmModels: LLM_MODELS,



    // Sidebar
    sidebarCollapsed,
    toggleSidebar,

    // Chat
    messages,
    addMessage,
    clearMessages,
    getConversationHistory,
    isQuerying,
    setIsQuerying,
  }
}

export type AppState = ReturnType<typeof useAppState>
