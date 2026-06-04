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

// Utility to strip redundant SQL blocks if they match any of the executed queries
function stripSQLFromContent(content: string, sqlQueries: string[]): string {
  if (!sqlQueries.length || !content) return content
  
  // Remove markdown SQL blocks that match any executed query
  let cleaned = content.replace(/```sql[\s\S]*?```/gi, (match) => {
    const blockContent = match.replace(/```sql|```/gi, '').trim()
    const matchesAny = sqlQueries.some(
      q => q.includes(blockContent) || blockContent.includes(q)
    )
    return matchesAny ? '' : match
  })

  // Strip common LLM boilerplate text before the stripped query
  cleaned = cleaned.replace(/The SQL query used to retrieve this information was:?\s*/gi, '')
  cleaned = cleaned.replace(/Here is the SQL query used:?\s*/gi, '')
  cleaned = cleaned.replace(/The query used was:?\s*/gi, '')
  cleaned = cleaned.replace(/Here are the SQL queries I used:?\s*/gi, '')
  cleaned = cleaned.replace(/The queries used were:?\s*/gi, '')

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

  // Build the full list of queries: prefer sqlQueries array, fall back to single sqlQuery
  const allQueries: string[] = (message.sqlQueries && message.sqlQueries.length > 0)
    ? message.sqlQueries
    : (message.sqlQuery ? [message.sqlQuery] : [])

  // Cleaned content to prevent redundancy
  const cleanContent = stripSQLFromContent(message.content, allQueries)

  const handleCopySQL = async () => {
    if (!allQueries.length) return
    const textToCopy = allQueries.length === 1
      ? allQueries[0]
      : allQueries.map((q, i) => `-- Query ${i + 1}\n${q}`).join('\n\n')
    await navigator.clipboard.writeText(textToCopy)
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

      {/* SQL Queries Block */}
      {allQueries.length > 0 && (
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
              {allQueries.length === 1
                ? 'SQL QUERY'
                : `SQL QUERIES (${allQueries.length})`}
            </button>
            <button
              onClick={handleCopySQL}
              className="btn btn-ghost btn-sm"
              style={{ padding: '2px 8px', fontSize: 11, height: 24 }}
              title={allQueries.length > 1 ? 'Copy all SQL' : 'Copy SQL'}
            >
              {copied ? <Check size={12} style={{ color: 'var(--success)' }} /> : <Copy size={12} />}
              <span style={{ color: copied ? 'var(--success)' : 'inherit' }}>
                {copied ? 'Copied' : 'Copy'}
              </span>
            </button>
          </div>
          {sqlExpanded && (
            <div>
              {allQueries.map((q, idx) => (
                <div key={idx}>
                  {allQueries.length > 1 && (
                    <div style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: 'var(--text-tertiary)',
                      padding: '8px 14px 2px',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                    }}>
                      Query {idx + 1} of {allQueries.length}
                    </div>
                  )}
                  <div className="code-block-content"
                    style={allQueries.length > 1 && idx < allQueries.length - 1 ? {
                      borderBottom: '1px solid var(--border)',
                      marginBottom: 0,
                    } : undefined}
                  >
                    {q}
                  </div>
                </div>
              ))}
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
