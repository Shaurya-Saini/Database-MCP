/**
 * Main chat container with message list, empty state, and input area.
 */
import { useRef, useEffect } from 'react'
import { MessageSquare, Database, Cpu, Sparkles } from 'lucide-react'
import ChatInput from './ChatInput'
import MessageBubble from './MessageBubble'
import type { ChatMessage } from '../../hooks/useAppState'

interface ChatContainerProps {
  messages: ChatMessage[]
  onSend: (message: string) => void
  isQuerying: boolean
  isReady: boolean  // true when both DB and LLM are configured
}

const EXAMPLE_QUERIES = [
  'Show me all tables in the database',
  'What are the top 10 rows from the largest table?',
  'How many records are in each table?',
  'Describe the schema of the database',
]

export default function ChatContainer({ messages, onSend, isQuerying, isReady }: ChatContainerProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.length === 0 ? (
          <EmptyState isReady={isReady} onExampleClick={onSend} />
        ) : (
          <>
            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {/* Loading indicator */}
            {isQuerying && (
              <div className="message-bubble message-assistant" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="spinner" />
                <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                  Querying database via MCP...
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <ChatInput
        onSend={onSend}
        disabled={!isReady}
        loading={isQuerying}
      />
    </div>
  )
}

function EmptyState({ isReady, onExampleClick }: { isReady: boolean; onExampleClick: (q: string) => void }) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      gap: 24,
    }}>
      {/* Hero icon */}
      <div style={{
        width: 72,
        height: 72,
        borderRadius: 20,
        background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: 'var(--shadow-glow)',
      }}>
        <MessageSquare size={32} color="#fff" />
      </div>

      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
          Universal Database Chat Assistant
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Ask questions about your PostgreSQL database in natural language.
          Powered by MCP (Model Context Protocol) for secure, tool-based database access.
        </p>
      </div>

      {/* Feature cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12,
        width: '100%',
        maxWidth: 560,
      }}>
        {[
          { icon: Database, label: 'Multi-Database', desc: 'Connect to multiple PostgreSQL instances' },
          { icon: Cpu, label: 'Multi-LLM', desc: 'OpenAI, Anthropic, or Groq' },
          { icon: Sparkles, label: 'MCP Protocol', desc: 'Secure tool-based query execution' },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="card" style={{ textAlign: 'center', padding: 14 }}>
            <Icon size={20} style={{ color: 'var(--primary)', marginBottom: 6 }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{desc}</div>
          </div>
        ))}
      </div>

      {/* Example queries */}
      {isReady && (
        <div style={{ width: '100%', maxWidth: 560 }}>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8, textAlign: 'center' }}>
            Try an example:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
            {EXAMPLE_QUERIES.map(q => (
              <button
                key={q}
                className="btn btn-secondary btn-sm"
                onClick={() => onExampleClick(q)}
                style={{ fontSize: 12 }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
