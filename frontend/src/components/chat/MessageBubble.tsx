import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronRight, Copy, Check, Clock, Rows3, AlertCircle } from 'lucide-react'
import type { ChatMessage } from '../../hooks/useAppState'
import MarkdownRenderer from './MarkdownRenderer'

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

// Utility to strip redundant SQL blocks if they match the actual executed query
function stripSQLFromContent(content: string, sqlQuery?: string): string {
  if (!sqlQuery || !content) return content
  
  // Remove markdown SQL blocks
  let cleaned = content.replace(/```sql[\s\S]*?```/gi, (match) => {
    // If the block contains something very similar to the actual query, strip it
    // otherwise keep it
    const blockContent = match.replace(/```sql|```/gi, '').trim()
    if (sqlQuery.includes(blockContent) || blockContent.includes(sqlQuery)) {
      return ''
    }
    return match
  })

  // Strip common LLM boilerplate text before the stripped query
  cleaned = cleaned.replace(/The SQL query used to retrieve this information was:?\s*/gi, '')
  cleaned = cleaned.replace(/Here is the SQL query used:?\s*/gi, '')
  cleaned = cleaned.replace(/The query used was:?\s*/gi, '')

  return cleaned.trim()
}

// Sub-component for truncated UUIDs with copy-on-hover
function TruncatedCell({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const strValue = String(value ?? '')
  
  // Basic UUID regex check
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(strValue)
  
  if (!isUuid) {
    return <span>{strValue}</span>
  }

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await navigator.clipboard.writeText(strValue)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const displayValue = `${strValue.substring(0, 8)}...`

  return (
    <div className="truncated-cell" title={strValue}>
      <span className="cell-text">{displayValue}</span>
      <button 
        className={`copy-btn ${copied ? 'copied' : ''}`}
        onClick={handleCopy}
        title="Copy full ID"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </button>
    </div>
  )
}

function AssistantMessage({ message }: { message: ChatMessage }) {
  const [sqlExpanded, setSqlExpanded] = useState(false)
  const [tableExpanded, setTableExpanded] = useState(true)
  const [copied, setCopied] = useState(false)
  
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const [hasOverflow, setHasOverflow] = useState(false)
  const [scrolledEnd, setScrolledEnd] = useState(false)

  // Cleaned content to prevent redundancy
  const cleanContent = stripSQLFromContent(message.content, message.sqlQuery)

  const handleCopySQL = async () => {
    if (!message.sqlQuery) return
    await navigator.clipboard.writeText(message.sqlQuery)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Handle horizontal scroll cues
  useEffect(() => {
    const el = tableContainerRef.current
    if (!el) return

    const checkScroll = () => {
      const isOverflowing = el.scrollWidth > el.clientWidth
      setHasOverflow(isOverflowing)
      
      // Check if scrolled to the end (allow 2px margin of error)
      const isAtEnd = el.scrollWidth - el.scrollLeft - el.clientWidth <= 2
      setScrolledEnd(isAtEnd)
    }

    checkScroll()
    el.addEventListener('scroll', checkScroll)
    window.addEventListener('resize', checkScroll)
    
    return () => {
      el.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [message.results, tableExpanded])

  return (
    <div className="message-bubble message-assistant">
      {/* Error display */}
      {message.error && (
        <div style={{
          display: 'flex',
          gap: 8,
          padding: '10px 14px',
          background: 'var(--error-bg)',
          borderRadius: 12,
          marginBottom: 12,
          fontSize: 13,
          color: 'var(--error)',
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{message.error}</span>
        </div>
      )}

      {/* Natural language response parsed as markdown */}
      {cleanContent && (
        <MarkdownRenderer content={cleanContent} />
      )}

      {/* SQL Query Block */}
      {message.sqlQuery && (
        <div className="code-block" style={{ marginTop: cleanContent ? 16 : 0 }}>
          <div className="code-block-header">
            <button
              onClick={() => setSqlExpanded(!sqlExpanded)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 500,
                padding: 0,
              }}
            >
              {sqlExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              SQL QUERY
            </button>
            <button
              onClick={handleCopySQL}
              className="btn btn-ghost btn-sm"
              style={{ padding: '2px 8px', fontSize: 11, height: 24 }}
              title="Copy SQL"
            >
              {copied ? <Check size={12} style={{ color: 'var(--success)' }} /> : <Copy size={12} />}
              <span style={{ color: copied ? 'var(--success)' : 'inherit' }}>
                {copied ? 'Copied' : 'Copy'}
              </span>
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
        <div style={{ marginTop: 12 }}>
          <button
            onClick={() => setTableExpanded(!tableExpanded)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
              padding: '4px 0',
              marginBottom: 4,
            }}
          >
            {tableExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            RESULTS TABLE
          </button>

          {tableExpanded && (
            <div 
              className={`results-table-wrapper ${hasOverflow ? 'has-overflow' : ''} ${scrolledEnd ? 'scrolled-end' : ''}`}
            >
              <div 
                className="results-table-container" 
                ref={tableContainerRef}
                style={{ maxHeight: 320 }}
              >
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
                          <td key={j}>
                            <TruncatedCell value={val as string} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Metadata badges */}
      {(message.rowCount !== undefined || message.executionTimeMs !== undefined) && (
        <div style={{
          display: 'flex',
          gap: 8,
          marginTop: 14,
          flexWrap: 'wrap',
        }}>
          {message.rowCount !== undefined && (
            <span className="badge badge-info">
              <Rows3 size={10} style={{ opacity: 0.8 }} />
              {message.rowCount} rows
            </span>
          )}
          {message.executionTimeMs !== undefined && (
            <span className="badge badge-info">
              <Clock size={10} style={{ opacity: 0.8 }} />
              {message.executionTimeMs.toFixed(0)}ms
            </span>
          )}
        </div>
      )}
    </div>
  )
}
