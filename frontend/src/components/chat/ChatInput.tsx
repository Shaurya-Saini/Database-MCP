/**
 * Chat text input with send button.
 */
import { useState, useRef, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  loading?: boolean
  placeholder?: string
}

export default function ChatInput({ onSend, disabled, loading, placeholder }: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 160) + 'px'
    }
  }, [value])

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled || loading) return
    onSend(trimmed)
    setValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const isDisabled = disabled || loading
  const canSend = value.trim().length > 0 && !isDisabled

  return (
    <div className="chat-input-area">
      <div style={{
        display: 'flex',
        gap: 8,
        alignItems: 'flex-end',
        maxWidth: 900,
        margin: '0 auto',
      }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <textarea
            ref={textareaRef}
            className="input textarea"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || 'Ask a question about your database...'}
            disabled={isDisabled}
            rows={1}
            maxLength={5000}
            style={{
              paddingRight: 12,
              minHeight: 42,
              maxHeight: 160,
            }}
          />
          {value.length > 4000 && (
            <span style={{
              position: 'absolute',
              bottom: 6,
              right: 10,
              fontSize: 11,
              color: value.length > 4800 ? 'var(--error)' : 'var(--text-tertiary)',
            }}>
              {value.length}/5000
            </span>
          )}
        </div>

        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={!canSend}
          title="Send message (Enter)"
          style={{ height: 42, width: 42, padding: 0, flexShrink: 0 }}
        >
          {loading ? (
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <Send size={18} />
          )}
        </button>
      </div>

      {disabled && !loading && (
        <p style={{
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--text-tertiary)',
          margin: '8px 0 0',
        }}>
          Select a database and configure an LLM provider to start chatting
        </p>
      )}
    </div>
  )
}
