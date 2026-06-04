/**
 * Main application component — single-page layout with sidebar navigation.
 */
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { useAppState } from './hooks/useAppState'
import { useDatabases, useExecuteQuery } from './hooks/useApi'
import Sidebar from './components/layout/Sidebar'
import Header from './components/layout/Header'
import ChatContainer from './components/chat/ChatContainer'
import HistoryPanel from './components/panels/HistoryPanel'
import SavedQueriesPanel from './components/panels/SavedQueriesPanel'
import SettingsPanel from './components/panels/SettingsPanel'
import './App.css'

function App() {
  const state = useAppState()
  const { data: databases = [] } = useDatabases()
  const executeQuery = useExecuteQuery()

  const isReady = Boolean(state.activeDatabaseId && state.isLlmConfigured)

  const handleSendMessage = async (message: string) => {
    if (!state.activeDatabaseId || !state.isLlmConfigured) {
      toast.error('Please select a database and configure an LLM provider first')
      state.setActiveTab('settings')
      return
    }

    // Add user message
    state.addMessage({ role: 'user', content: message })
    state.setIsQuerying(true)

    try {
      const response = await executeQuery.mutateAsync({
        database_id: state.activeDatabaseId,
        query: message,
        llm_provider: state.llmConfig.provider,
        llm_model: state.llmConfig.model,
        api_key: state.llmConfig.apiKey,
        conversation_history: state.getConversationHistory(),
      })

      // Add assistant message
      state.addMessage({
        role: 'assistant',
        content: response.natural_language_response,
        sqlQuery: response.sql_query,
        sqlQueries: response.sql_queries,
        results: response.results,
        rowCount: response.row_count,
        executionTimeMs: response.execution_time_ms,
        error: response.error || undefined,
      })
    } catch (err: any) {
      state.addMessage({
        role: 'assistant',
        content: 'Sorry, an error occurred while processing your query.',
        error: err.message || 'Unknown error',
      })
      toast.error('Query failed: ' + (err.message || 'Unknown error'))
    } finally {
      state.setIsQuerying(false)
    }
  }

  const handleRerunQuery = (query: string) => {
    state.setActiveTab('chat')
    handleSendMessage(query)
  }

  const handleLlmClick = () => {
    state.setActiveTab('settings')
  }

  return (
    <div className="app-layout">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            fontSize: 13,
          },
        }}
      />

      {/* Sidebar */}
      <Sidebar
        activeTab={state.activeTab}
        onTabChange={state.setActiveTab}
        collapsed={state.sidebarCollapsed}
        onToggle={state.toggleSidebar}
      />

      {/* Main Area */}
      <div className="app-main">
        <Header
          databases={databases}
          activeDatabaseId={state.activeDatabaseId}
          onDatabaseChange={state.setActiveDatabaseId}
          llmConfig={state.llmConfig}
          isLlmConfigured={state.isLlmConfigured}
          onLlmClick={handleLlmClick}
        />

        <div className="app-content">
          {state.activeTab === 'chat' && (
            <ChatContainer
              messages={state.messages}
              onSend={handleSendMessage}
              isQuerying={state.isQuerying}
              isReady={isReady}
            />
          )}

          {state.activeTab === 'history' && (
            <HistoryPanel
              activeDatabaseId={state.activeDatabaseId}
              onRerunQuery={handleRerunQuery}
            />
          )}

          {state.activeTab === 'saved' && (
            <SavedQueriesPanel
              activeDatabaseId={state.activeDatabaseId}
              onRunQuery={handleRerunQuery}
            />
          )}

          {state.activeTab === 'settings' && (
            <SettingsPanel
              llmConfig={state.llmConfig}
              onLlmConfigChange={state.setLlmConfig}
              llmModels={state.llmModels}
              activeDatabaseId={state.activeDatabaseId}
              onDatabaseChange={state.setActiveDatabaseId}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default App
