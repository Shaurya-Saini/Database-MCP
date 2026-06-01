/**
 * Saved queries panel shown in sidebar.
 */
import { useState } from 'react'
import { Bookmark, Play, Trash2, Plus, Tag } from 'lucide-react'
import { useSavedQueries, useCreateSavedQuery, useDeleteSavedQuery } from '../../hooks/useApi'
import type { SavedQuery } from '../../types'

interface SavedQueriesPanelProps {
  activeDatabaseId: string | null
  onRunQuery: (query: string) => void
}

export default function SavedQueriesPanel({ activeDatabaseId, onRunQuery }: SavedQueriesPanelProps) {
  const [showSaveForm, setShowSaveForm] = useState(false)
  const { data: savedQueries, isLoading } = useSavedQueries()
  const createSavedQuery = useCreateSavedQuery()
  const deleteSavedQuery = useDeleteSavedQuery()

  const queries = savedQueries || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Saved Queries
        </h2>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setShowSaveForm(!showSaveForm)}
        >
          <Plus size={14} />
          Save New
        </button>
      </div>

      {/* Save Form */}
      {showSaveForm && (
        <SaveForm
          databaseId={activeDatabaseId}
          onSave={(data) => {
            createSavedQuery.mutate(data, {
              onSuccess: () => setShowSaveForm(false),
            })
          }}
          onCancel={() => setShowSaveForm(false)}
          isPending={createSavedQuery.isPending}
        />
      )}

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
        {isLoading ? (
          <div className="empty-state">
            <div className="spinner" />
          </div>
        ) : queries.length === 0 ? (
          <div className="empty-state">
            <Bookmark size={40} className="empty-state-icon" />
            <p style={{ fontSize: 14 }}>No saved queries</p>
            <p style={{ fontSize: 12 }}>Save frequently used queries for quick access</p>
          </div>
        ) : (
          queries.map(q => (
            <SavedQueryItem
              key={q.id}
              query={q}
              onRun={() => onRunQuery(q.query)}
              onDelete={() => deleteSavedQuery.mutate(q.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function SavedQueryItem({ query, onRun, onDelete }: { query: SavedQuery; onRun: () => void; onDelete: () => void }) {
  return (
    <div className="card" style={{ marginBottom: 8, padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            {query.name}
          </p>
          {query.description && (
            <p className="truncate" style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
              {query.description}
            </p>
          )}
          <p className="truncate" style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 0', fontStyle: 'italic' }}>
            "{query.query}"
          </p>
          {query.tags.length > 0 && (
            <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
              {query.tags.map(tag => (
                <span key={tag} className="badge badge-info" style={{ fontSize: 10 }}>
                  <Tag size={8} />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onRun} title="Run query">
            <Play size={13} />
          </button>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onDelete} title="Delete" style={{ color: 'var(--error)' }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

function SaveForm({
  databaseId,
  onSave,
  onCancel,
  isPending,
}: {
  databaseId: string | null
  onSave: (data: { name: string; description: string; query: string; tags: string[]; database_id?: string }) => void
  onCancel: () => void
  isPending: boolean
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [query, setQuery] = useState('')
  const [tags, setTags] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !query.trim()) return
    onSave({
      name: name.trim(),
      description: description.trim(),
      query: query.trim(),
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      database_id: databaseId || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input className="input" placeholder="Query name *" value={name} onChange={e => setName(e.target.value)} style={{ fontSize: 13 }} required />
        <input className="input" placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} style={{ fontSize: 13 }} />
        <textarea className="input textarea" placeholder="Natural language query *" value={query} onChange={e => setQuery(e.target.value)} rows={2} style={{ fontSize: 13 }} required />
        <input className="input" placeholder="Tags (comma separated)" value={tags} onChange={e => setTags(e.target.value)} style={{ fontSize: 13 }} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={isPending || !name.trim() || !query.trim()}>
            {isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </form>
  )
}
