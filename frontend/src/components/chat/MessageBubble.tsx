/**
 * Individual chat message bubble.
 * User messages are styled on the right; assistant messages on the left
 * with optional SQL query block and results table.
 */
import { useState } from 'react'
import { ChevronDown, ChevronRight, Copy, Check, Clock, Rows3, AlertCircle } from 'lucide-react'
import type { ChatMessage } from '../../hooks/useAppState'

interface MessageBubbleProps {
  message: ChatMessage
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  if (message.role === 'user') {
    return (
      <div className="message-bubble message-user">
        {message.content}
      </div>
    )
  }

  return <AssistantMessage message={message} />
}

function AssistantMessage({ message }: { message: ChatMessage }) {
  const [sqlExpanded, setSqlExpanded] = useState(false)
  const [tableExpanded, setTableExpanded] = useState(true)
  const [copied, setCopied] = useState(false)

  const handleCopySQL = async () => {
    if (!message.sqlQuery) return
    await navigator.clipboard.writeText(message.sqlQuery)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="message-bubble message-assistant">
      {/* Error display */}
      {message.error && (
        <div style={{
          display: 'flex',
          gap: 8,
          padding: '8px 12px',
          background: 'var(--error-bg)',
          borderRadius: 8,
          marginBottom: 8,
          fontSize: 13,
          color: 'var(--error)',
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{message.error}</span>
        </div>
      )}

      {/* Natural language response */}
      <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {message.content}
      </div>

      {/* SQL Query Block */}
      {message.sqlQuery && (
        <div className="code-block" style={{ marginTop: 12 }}>
          <div className="code-block-header">
            <button
              onClick={() => setSqlExpanded(!sqlExpanded)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 12,
                padding: 0,
              }}
            >
              {sqlExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              SQL Query
            </button>
            <button
              onClick={handleCopySQL}
              className="btn btn-ghost btn-sm"
              style={{ padding: '2px 6px', fontSize: 11 }}
              title="Copy SQL"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          {sqlExpanded && (
            <div className="code-block-content">
              {message.sqlQuery}
            </div>
          )}
        </div>
      )}

      {/* Results Table */}
      {message.results && message.results.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <button
            onClick={() => setTableExpanded(!tableExpanded)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 12,
              padding: '4px 0',
              marginBottom: 4,
            }}
          >
            {tableExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            Results Table
          </button>

          {tableExpanded && (
            <div className="results-table-container" style={{ maxHeight: 300, overflowY: 'auto' }}>
              <table className="results-table">
                <thead>
                  <tr>
                    {Object.keys(message.results[0]).map(key => (
                      <th key={key}>{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {message.results.map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).map((val, j) => (
                        <td key={j}>{String(val ?? '')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Metadata badges */}
      {(message.rowCount !== undefined || message.executionTimeMs !== undefined) && (
        <div style={{
          display: 'flex',
          gap: 8,
          marginTop: 10,
          flexWrap: 'wrap',
        }}>
          {message.rowCount !== undefined && (
            <span className="badge badge-info" style={{ gap: 3 }}>
              <Rows3 size={10} />
              {message.rowCount} rows
            </span>
          )}
          {message.executionTimeMs !== undefined && (
            <span className="badge badge-info" style={{ gap: 3 }}>
              <Clock size={10} />
              {message.executionTimeMs.toFixed(0)}ms
            </span>
          )}
        </div>
      )}
    </div>
  )
}
