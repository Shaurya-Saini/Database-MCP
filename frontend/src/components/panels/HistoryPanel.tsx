/**
 * Query history panel shown in sidebar.
 */
import { useState } from 'react'
import { Search, Trash2, Clock, CheckCircle, XCircle, RotateCcw } from 'lucide-react'
import { useQueryHistory, useClearHistory } from '../../hooks/useApi'
import type { QueryHistoryEntry } from '../../types'

interface HistoryPanelProps {
  activeDatabaseId: string | null
  onRerunQuery: (query: string) => void
}

export default function HistoryPanel({ activeDatabaseId, onRerunQuery }: HistoryPanelProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const { data: historyData, isLoading } = useQueryHistory(activeDatabaseId)
  const clearHistory = useClearHistory()

  const queries = historyData?.queries || []

  const filtered = searchTerm
    ? queries.filter(q =>
        q.query.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.sql_query.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : queries

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Query History
          </h2>
          {queries.length > 0 && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => clearHistory.mutate(activeDatabaseId || undefined)}
              disabled={clearHistory.isPending}
              style={{ color: 'var(--error)' }}
            >
              <Trash2 size={14} />
              Clear
            </button>
          )}
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{
            position: 'absolute',
            left: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-tertiary)',
          }} />
          <input
            className="input"
            placeholder="Search history..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: 32, fontSize: 13 }}
          />
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
        {isLoading ? (
          <div className="empty-state">
            <div className="spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Clock size={40} className="empty-state-icon" />
            <p style={{ fontSize: 14 }}>No query history yet</p>
            <p style={{ fontSize: 12 }}>Your queries will appear here</p>
          </div>
        ) : (
          filtered.map(entry => (
            <HistoryItem key={entry.id} entry={entry} onRerun={onRerunQuery} />
          ))
        )}
      </div>
    </div>
  )
}

function HistoryItem({ entry, onRerun }: { entry: QueryHistoryEntry; onRerun: (q: string) => void }) {
  return (
    <div
      className="card"
      style={{
        marginBottom: 8,
        padding: '10px 12px',
        cursor: 'pointer',
        transition: 'all var(--transition-fast)',
      }}
      onClick={() => onRerun(entry.query)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        {entry.success ? (
          <CheckCircle size={14} style={{ color: 'var(--success)', marginTop: 2, flexShrink: 0 }} />
        ) : (
          <XCircle size={14} style={{ color: 'var(--error)', marginTop: 2, flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="truncate" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
            {entry.query}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: 11, color: 'var(--text-tertiary)' }}>
            <span>{entry.database_name}</span>
            {entry.row_count !== null && entry.row_count !== undefined && <span>· {entry.row_count} rows</span>}
            {entry.execution_time_ms !== null && entry.execution_time_ms !== undefined && <span>· {entry.execution_time_ms.toFixed(0)}ms</span>}
            <span>· {new Date(entry.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
        <button
          className="btn btn-ghost btn-icon btn-sm"
          onClick={e => { e.stopPropagation(); onRerun(entry.query) }}
          title="Re-run query"
        >
          <RotateCcw size={12} />
        </button>
      </div>
    </div>
  )
}
