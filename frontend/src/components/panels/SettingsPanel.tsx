/**
 * Settings panel — database management and LLM configuration.
 */
import { useState } from 'react'
import {
  Database, Plus, Trash2, RefreshCw, Wifi, WifiOff,
  Key, Cpu, ChevronDown, ChevronRight
} from 'lucide-react'
import { useDatabases, useAddDatabase, useDeleteDatabase, useTestDatabase } from '../../hooks/useApi'
import type { LLMConfig } from '../../hooks/useAppState'
import type { DatabaseConnectionCreate } from '../../types'

interface SettingsPanelProps {
  llmConfig: LLMConfig
  onLlmConfigChange: (config: LLMConfig) => void
  llmModels: Record<string, string[]>
  activeDatabaseId: string | null
  onDatabaseChange: (id: string) => void
}

export default function SettingsPanel({
  llmConfig,
  onLlmConfigChange,
  llmModels,
  activeDatabaseId,
  onDatabaseChange,
}: SettingsPanelProps) {
  const [dbFormOpen, setDbFormOpen] = useState(false)
  const [dbSectionOpen, setDbSectionOpen] = useState(true)
  const [llmSectionOpen, setLlmSectionOpen] = useState(true)

  return (
    <div style={{ overflowY: 'auto', height: '100%' }}>
      <div style={{ padding: '16px 20px' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px' }}>
          Settings
        </h2>

        {/* LLM Configuration */}
        <SettingsSection
          title="LLM Provider"
          icon={Cpu}
          open={llmSectionOpen}
          onToggle={() => setLlmSectionOpen(!llmSectionOpen)}
        >
          <LLMConfigSection
            config={llmConfig}
            onChange={onLlmConfigChange}
            models={llmModels}
          />
        </SettingsSection>

        {/* Database Connections */}
        <SettingsSection
          title="Database Connections"
          icon={Database}
          open={dbSectionOpen}
          onToggle={() => setDbSectionOpen(!dbSectionOpen)}
          action={
            <button className="btn btn-primary btn-sm" onClick={() => setDbFormOpen(!dbFormOpen)}>
              <Plus size={14} />
              Add
            </button>
          }
        >
          {dbFormOpen && (
            <AddDatabaseForm
              onClose={() => setDbFormOpen(false)}
            />
          )}
          <DatabaseList
            activeDatabaseId={activeDatabaseId}
            onSelect={onDatabaseChange}
          />
        </SettingsSection>
      </div>
    </div>
  )
}

/* ─── Section Wrapper ──────────────────────────────────────────── */

function SettingsSection({
  title, icon: Icon, open, onToggle, action, children,
}: {
  title: string
  icon: typeof Database
  open: boolean
  onToggle: () => void
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="card" style={{ marginBottom: 12, padding: 0, overflow: 'hidden' }}>
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px',
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        <Icon size={16} style={{ color: 'var(--primary)' }} />
        <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{title}</span>
        {action && <div onClick={e => e.stopPropagation()}>{action}</div>}
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </div>
      {open && <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border)' }}>{children}</div>}
    </div>
  )
}

/* ─── LLM Config Section ───────────────────────────────────────── */

function LLMConfigSection({
  config, onChange, models,
}: {
  config: LLMConfig
  onChange: (c: LLMConfig) => void
  models: Record<string, string[]>
}) {
  const [showKey, setShowKey] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 12 }}>
      <div>
        <label className="input-label">Provider</label>
        <select
          className="input select"
          value={config.provider}
          onChange={e => {
            const provider = e.target.value as LLMConfig['provider']
            onChange({
              ...config,
              provider,
              model: models[provider]?.[0] || '',
            })
          }}
          style={{ fontSize: 13 }}
        >
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
          <option value="groq">Groq (Free Tier)</option>
          <option value="gemini">Google Gemini (Free Tier)</option>
        </select>
      </div>

      <div>
        <label className="input-label">Model</label>
        <select
          className="input select"
          value={config.model}
          onChange={e => onChange({ ...config, model: e.target.value })}
          style={{ fontSize: 13 }}
        >
          {(models[config.provider] || []).map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="input-label">API Key</label>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            className="input"
            type={showKey ? 'text' : 'password'}
            placeholder="Enter API key..."
            value={config.apiKey}
            onChange={e => onChange({ ...config, apiKey: e.target.value })}
            style={{ fontSize: 13 }}
          />
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowKey(!showKey)}
            type="button"
          >
            <Key size={14} />
          </button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
          {config.provider === 'groq' ? 'Free API key at console.groq.com' : config.provider === 'gemini' ? 'Free API key at aistudio.google.com' : 'Stored locally in your browser only'}
        </p>
      </div>
    </div>
  )
}

/* ─── Database List ────────────────────────────────────────────── */

function DatabaseList({
  activeDatabaseId,
  onSelect,
}: {
  activeDatabaseId: string | null
  onSelect: (id: string) => void
}) {
  const { data: databases, isLoading } = useDatabases()
  const deleteDb = useDeleteDatabase()
  const testDb = useTestDatabase()

  if (isLoading) return <div style={{ padding: '12px 0' }}><div className="spinner" /></div>

  if (!databases || databases.length === 0) {
    return (
      <p style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: '12px 0', textAlign: 'center' }}>
        No databases configured. Click "Add" to connect one.
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 10 }}>
      {databases.map(db => (
        <div
          key={db.id}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
            borderRadius: 8, border: '1px solid var(--border)',
            background: db.id === activeDatabaseId ? 'var(--primary-light)' : 'transparent',
            cursor: 'pointer', transition: 'all var(--transition-fast)',
          }}
          onClick={() => onSelect(db.id)}
        >
          {db.status === 'connected' ? (
            <Wifi size={14} style={{ color: 'var(--success)', flexShrink: 0 }} />
          ) : (
            <WifiOff size={14} style={{ color: 'var(--error)', flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="truncate" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
              {db.name}
            </div>
            <div className="truncate" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              {db.host}:{db.port}/{db.database}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
            <button
              className="btn btn-ghost btn-icon btn-sm"
              onClick={e => { e.stopPropagation(); testDb.mutate(db.id) }}
              title="Test connection"
            >
              <RefreshCw size={12} />
            </button>
            <button
              className="btn btn-ghost btn-icon btn-sm"
              onClick={e => { e.stopPropagation(); deleteDb.mutate(db.id) }}
              title="Delete"
              style={{ color: 'var(--error)' }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── Add Database Form ────────────────────────────────────────── */

function AddDatabaseForm({ onClose }: { onClose: () => void }) {
  const addDb = useAddDatabase()
  const [form, setForm] = useState<DatabaseConnectionCreate>({
    name: '',
    host: 'localhost',
    port: 5432,
    database: '',
    username: '',
    password: '',
    ssl_enabled: false,
  })

  const update = (field: string, value: string | number | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addDb.mutate(form, {
      onSuccess: () => onClose(),
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        padding: '12px 0',
        borderBottom: '1px solid var(--border)',
        marginBottom: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <input className="input" placeholder="Connection name *" value={form.name} onChange={e => update('name', e.target.value)} style={{ fontSize: 13 }} required />
      <div style={{ display: 'flex', gap: 8 }}>
        <input className="input" placeholder="Host *" value={form.host} onChange={e => update('host', e.target.value)} style={{ flex: 2, fontSize: 13 }} required />
        <input className="input" type="number" placeholder="Port" value={form.port} onChange={e => update('port', parseInt(e.target.value) || 5432)} style={{ flex: 1, fontSize: 13 }} />
      </div>
      <input className="input" placeholder="Database name *" value={form.database} onChange={e => update('database', e.target.value)} style={{ fontSize: 13 }} required />
      <div style={{ display: 'flex', gap: 8 }}>
        <input className="input" placeholder="Username *" value={form.username} onChange={e => update('username', e.target.value)} style={{ flex: 1, fontSize: 13 }} required />
        <input className="input" type="password" placeholder="Password *" value={form.password} onChange={e => update('password', e.target.value)} style={{ flex: 1, fontSize: 13 }} required />
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
        <input type="checkbox" checked={form.ssl_enabled} onChange={e => update('ssl_enabled', e.target.checked)} />
        Enable SSL
      </label>

      {addDb.isError && (
        <p style={{ fontSize: 12, color: 'var(--error)', margin: 0 }}>
          {addDb.error?.message || 'Failed to add connection'}
        </p>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={addDb.isPending}>
          {addDb.isPending ? 'Connecting...' : 'Add Connection'}
        </button>
      </div>
    </form>
  )
}
