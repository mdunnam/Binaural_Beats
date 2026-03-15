import { useState, useRef } from 'react'
import type { JournalEntry, MoodRating } from '../types'

interface Props {
  entries: JournalEntry[]
  onClose: () => void
  addEntry: (entry: JournalEntry) => void
  updateEntry: (id: string, patch: Partial<JournalEntry>) => void
  deleteEntry: (id: string) => void
}

function calcStreak(entries: JournalEntry[]): number {
  if (entries.length === 0) return 0
  const days = new Set(
    entries.map(e => {
      const d = new Date(e.completedAt ? e.completedAt : e.date)
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    })
  )
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    if (days.has(key)) {
      streak++
    } else if (i > 0) {
      break
    }
  }
  return streak
}

function formatDate(entry: JournalEntry): string {
  try {
    const d = new Date(entry.completedAt ? entry.completedAt : entry.date)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return entry.date
  }
}

const MOOD_EMOJIS = ['😞', '😕', '😐', '🙂', '😄']

interface AddFormState {
  presetName: string
  durationMinutes: string
  notes: string
  mood: MoodRating | null
  tagInput: string
  tags: string[]
}

function AddEntryForm({ onAdd, onCancel }: { onAdd: (e: JournalEntry) => void; onCancel: () => void }) {
  const [form, setForm] = useState<AddFormState>({
    presetName: '',
    durationMinutes: '10',
    notes: '',
    mood: null,
    tagInput: '',
    tags: [],
  })

  const handleTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && form.tagInput.trim()) {
      setForm(f => ({ ...f, tags: [...f.tags, f.tagInput.trim()], tagInput: '' }))
    }
  }

  const submit = () => {
    const entry: JournalEntry = {
      id: Date.now().toString(),
      date: new Date().toLocaleString(),
      presetName: form.presetName.trim() || 'Manual Entry',
      durationMinutes: parseInt(form.durationMinutes) || 0,
      notes: form.notes,
      mood: form.mood,
      tags: form.tags,
      completedAt: Date.now(),
    }
    onAdd(entry)
  }

  return (
    <div className="journal-entry" style={{ marginBottom: '1.25rem' }}>
      <div style={{ fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>➕ New Entry</div>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        Preset / Session Name
        <input
          className="journal-search"
          style={{ marginBottom: 0, marginTop: '0.25rem' }}
          value={form.presetName}
          onChange={e => setForm(f => ({ ...f, presetName: e.target.value }))}
          placeholder="e.g. Deep Focus"
        />
      </label>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        Duration (minutes)
        <input
          className="journal-search"
          style={{ marginBottom: 0, marginTop: '0.25rem' }}
          type="number"
          min={1}
          value={form.durationMinutes}
          onChange={e => setForm(f => ({ ...f, durationMinutes: e.target.value }))}
        />
      </label>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Mood</div>
      <div className="journal-mood-row" style={{ marginBottom: '0.5rem' }}>
        {MOOD_EMOJIS.map((em, i) => (
          <button
            key={i}
            type="button"
            className={`journal-mood-btn${form.mood === (i + 1) ? ' journal-mood-btn--active' : ''}`}
            onClick={() => setForm(f => ({ ...f, mood: (i + 1) as MoodRating }))}
          >{em}</button>
        ))}
      </div>
      <textarea
        className="journal-notes-area"
        placeholder="Notes about this session..."
        value={form.notes}
        onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
      />
      <div className="journal-tags" style={{ marginBottom: '0.5rem' }}>
        {form.tags.map(tag => (
          <span key={tag} className="journal-tag">
            {tag}
            <button
              type="button"
              className="journal-tag-remove"
              onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))}
            >×</button>
          </span>
        ))}
        <input
          className="journal-tag-input"
          placeholder="+ tag"
          value={form.tagInput}
          onChange={e => setForm(f => ({ ...f, tagInput: e.target.value }))}
          onKeyDown={handleTag}
        />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button className="soft-button" style={{ flex: 1 }} onClick={submit}>Save Entry</button>
        <button className="soft-button" style={{ flex: 1 }} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

function EntryCard({
  entry,
  onUpdate,
  onDelete,
}: {
  entry: JournalEntry
  onUpdate: (id: string, patch: Partial<JournalEntry>) => void
  onDelete: (id: string) => void
}) {
  const [tagInput, setTagInput] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const notesRef = useRef<HTMLTextAreaElement>(null)

  const handleTagKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      const newTag = tagInput.trim()
      if (!entry.tags.includes(newTag)) {
        onUpdate(entry.id, { tags: [...entry.tags, newTag] })
      }
      setTagInput('')
    }
  }

  return (
    <div className="journal-entry">
      <div className="journal-entry-header">
        <div className="journal-entry-meta">
          <span className="journal-entry-preset">{entry.presetName}</span>
          <span className="journal-entry-duration">{entry.durationMinutes} min</span>
          <span className="journal-entry-date">{formatDate(entry)}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {confirmDelete ? (
            <>
              <button
                type="button"
                className="soft-button"
                style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', color: 'var(--error, #e57373)' }}
                onClick={() => onDelete(entry.id)}
              >Confirm</button>
              <button
                type="button"
                className="soft-button"
                style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                onClick={() => setConfirmDelete(false)}
              >Cancel</button>
            </>
          ) : (
            <button
              type="button"
              className="soft-button"
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.9rem' }}
              title="Delete entry"
              onClick={() => setConfirmDelete(true)}
            >🗑</button>
          )}
        </div>
      </div>

      {/* Mood */}
      <div className="journal-mood-row">
        {MOOD_EMOJIS.map((em, i) => (
          <button
            key={i}
            type="button"
            className={`journal-mood-btn${entry.mood === (i + 1) ? ' journal-mood-btn--active' : ''}`}
            onClick={() => onUpdate(entry.id, { mood: (i + 1) as MoodRating })}
            title={`Mood ${i + 1}`}
          >{em}</button>
        ))}
      </div>

      {/* Notes */}
      <textarea
        ref={notesRef}
        className="journal-notes-area"
        placeholder="Add notes about this session..."
        defaultValue={entry.notes}
        onBlur={e => {
          if (e.target.value !== entry.notes) {
            onUpdate(entry.id, { notes: e.target.value })
          }
        }}
      />

      {/* Tags */}
      <div className="journal-tags">
        {entry.tags.map(tag => (
          <span key={tag} className="journal-tag">
            {tag}
            <button
              type="button"
              className="journal-tag-remove"
              onClick={() => onUpdate(entry.id, { tags: entry.tags.filter(t => t !== tag) })}
            >×</button>
          </span>
        ))}
        <input
          className="journal-tag-input"
          placeholder="+ tag"
          value={tagInput}
          onChange={e => setTagInput(e.target.value)}
          onKeyDown={handleTagKey}
        />
      </div>
    </div>
  )
}

export function SessionJournal({ entries, onClose, addEntry, updateEntry, deleteEntry }: Props) {
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const streak = calcStreak(entries)
  const totalMinutes = entries.reduce((acc, e) => acc + (e.durationMinutes || 0), 0)

  const filtered = entries
    .slice()
    .sort((a, b) => {
      const ta = a.completedAt || new Date(a.date).getTime()
      const tb = b.completedAt || new Date(b.date).getTime()
      return tb - ta
    })
    .filter(e => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        e.presetName.toLowerCase().includes(q) ||
        e.notes.toLowerCase().includes(q) ||
        e.tags.some(t => t.toLowerCase().includes(q))
      )
    })

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: 600, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="modal-title" style={{ margin: 0 }}>📓 Session Journal</h2>
          <button className="soft-button" onClick={onClose}>✕ Close</button>
        </div>

        {/* Stats bar */}
        <div className="journal-stats-bar">
          <div className="journal-stat">
            <strong>🔥 {streak}</strong>day streak
          </div>
          <div className="journal-stat">
            <strong>{entries.length}</strong>sessions
          </div>
          <div className="journal-stat">
            <strong>{totalMinutes}</strong>total min
          </div>
        </div>

        {/* Add entry button */}
        {!showAdd && (
          <button
            className="soft-button journal-add-btn"
            onClick={() => setShowAdd(true)}
          >➕ Add Entry Manually</button>
        )}

        {/* Add entry form */}
        {showAdd && (
          <AddEntryForm
            onAdd={entry => { addEntry(entry); setShowAdd(false) }}
            onCancel={() => setShowAdd(false)}
          />
        )}

        {/* Search */}
        <input
          className="journal-search"
          placeholder="🔍 Search by preset, notes, or tags..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {/* Entries */}
        {filtered.length === 0 ? (
          <div className="journal-empty">
            {entries.length === 0
              ? '🌱 No entries yet. Complete a session or add one manually!'
              : '🔍 No entries match your search.'}
          </div>
        ) : (
          filtered.map(entry => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onUpdate={updateEntry}
              onDelete={deleteEntry}
            />
          ))
        )}
      </div>
    </div>
  )
}
