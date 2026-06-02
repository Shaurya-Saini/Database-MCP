/**
 * Top header bar with database selector, LLM badge, and theme toggle.
 */
import { Cpu, ChevronDown, AlertCircle } from 'lucide-react'
import type { DatabaseConnection } from '../../types'
import type { LLMConfig } from '../../hooks/useAppState'

interface HeaderProps {
  databases: DatabaseConnection[]
  activeDatabaseId: string | null
  onDatabaseChange: (id: string) => void
  llmConfig: LLMConfig
  isLlmConfigured: boolean
  onLlmClick: () => void
}

export default function Header({
  databases,
  activeDatabaseId,
  onDatabaseChange,
  llmConfig,
  isLlmConfigured,
  onLlmClick,
}: HeaderProps) {
  const activeDb = databases.find(d => d.id === activeDatabaseId)

  return (
    <header className="app-header">
      {/* Database Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
        <select
          className="input select"
          value={activeDatabaseId || ''}
          onChange={e => onDatabaseChange(e.target.value)}
          style={{ maxWidth: 260, fontSize: 13 }}
        >
          <option value="">Select database...</option>
          {databases.map(db => (
            <option key={db.id} value={db.id}>
              {db.name} ({db.host}:{db.port}/{db.database})
            </option>
          ))}
        </select>

        {activeDb && (
          <span className={`badge ${activeDb.status === 'connected' ? 'badge-success' : 'badge-error'}`}>
            {activeDb.status}
          </span>
        )}
      </div>

      {/* LLM Provider Badge */}
      <button
        className="btn btn-secondary btn-sm"
        onClick={onLlmClick}
        style={{ gap: 6 }}
      >
        {isLlmConfigured ? (
          <>
            <Cpu size={14} />
            <span>{llmConfig.provider} / {llmConfig.model}</span>
          </>
        ) : (
          <>
            <AlertCircle size={14} style={{ color: 'var(--warning)' }} />
            <span>Configure LLM</span>
          </>
        )}
        <ChevronDown size={12} />
      </button>

    </header>
  )
}
