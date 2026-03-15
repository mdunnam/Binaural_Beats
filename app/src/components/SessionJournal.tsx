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
const AVG_MOOD_EMOJIS = ['', '😔', '😐', '🙂', '😊', '😄']

function dayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── Activity Heatmap ──────────────────────────────────────────────────────────
function ActivityHeatmap({ entries }: { entries: JournalEntry[] }) {
  const countsByDay: Record<string, number> = {}
  for (const e of entries) {
    const ts = e.completedAt || new Date(e.date).getTime()
    const k = dayKey(ts)
    countsByDay[k] = (countsByDay[k] || 0) + 1
  }

  // Build 12 weeks × 7 days grid starting from Sunday of 11 weeks ago
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Find the Sunday that starts our 12-week window
  const startDay = new Date(today)
  startDay.setDate(today.getDate() - today.getDay() - 11 * 7) // go back to start Sunday

  const cols: { date: Date; count: number }[][] = []
  for (let w = 0; w < 12; w++) {
    const col: { date: Date; count: number }[] = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDay)
      date.setDate(startDay.getDate() + w * 7 + d)
      const k = dayKey(date.getTime())
      col.push({ date, count: countsByDay[k] || 0 })
    }
    cols.push(col)
  }

  // Month labels: show month name when first day of month appears in a col
  const monthLabels: (string | null)[] = cols.map(col => {
    for (const cell of col) {
      if (cell.date.getDate() === 1) {
        return cell.date.toLocaleDateString(undefined, { month: 'short' })
      }
    }
    return null
  })

  const DOW_LABELS: Record<number, string> = { 1: 'M', 3: 'W', 5: 'F' }

  return (
    <div>
      {/* Month labels row */}
      <div className="journal-heatmap-labels">
        {/* Spacer for dow labels */}
        <div style={{ width: 14, flexShrink: 0 }} />
        {monthLabels.map((label, i) => (
          <div key={i} className="journal-heatmap-month" style={{ width: 12 + 3 }}>
            {label ?? ''}
          </div>
        ))}
      </div>
      {/* Grid */}
      <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start' }}>
        {/* Day-of-week labels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginRight: 4, marginTop: 1 }}>
          {[0, 1, 2, 3, 4, 5, 6].map(d => (
            <div key={d} style={{ width: 10, height: 12, fontSize: '0.6rem', color: 'var(--text-muted)', lineHeight: '12px', textAlign: 'right' }}>
              {DOW_LABELS[d] ?? ''}
            </div>
          ))}
        </div>
        {/* Heatmap cells */}
        <div className="journal-heatmap">
          {cols.map((col, wi) => (
            <div key={wi} className="journal-heatmap-col">
              {col.map((cell, di) => {
                const level = cell.count === 0 ? 0 : cell.count === 1 ? 1 : cell.count === 2 ? 2 : 3
                const label = cell.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                return (
                  <div
                    key={di}
                    className={`journal-heatmap-cell${level > 0 ? ` journal-heatmap-cell--${level}` : ''}`}
                    title={`${label}: ${cell.count} session${cell.count !== 1 ? 's' : ''}`}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Mood Trend Chart ──────────────────────────────────────────────────────────
function MoodChart({ entries }: { entries: JournalEntry[] }) {
  const now = Date.now()
  const msIn30Days = 30 * 24 * 60 * 60 * 1000
  const recent = entries
    .filter(e => {
      const ts = e.completedAt || new Date(e.date).getTime()
      return e.mood != null && ts >= now - msIn30Days
    })
    .sort((a, b) => {
      const ta = a.completedAt || new Date(a.date).getTime()
      const tb = b.completedAt || new Date(b.date).getTime()
      return ta - tb
    })

  if (recent.length < 3) return null

  const W = 400
  const H = 80
  const PAD = 8

  const earliest = now - msIn30Days
  const latest = now

  const xOf = (ts: number) => PAD + ((ts - earliest) / (latest - earliest)) * (W - PAD * 2)
  const yOf = (mood: number) => H - PAD - ((mood - 1) / 4) * (H - PAD * 2)

  const points = recent.map(e => ({
    x: xOf(e.completedAt || new Date(e.date).getTime()),
    y: yOf(e.mood as number),
  }))

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ')

  return (
    <div className="journal-mood-chart">
      <div className="journal-mood-chart-title">Mood (last 30 days)</div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
        <polyline
          points={polyline}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill="var(--accent)" />
        ))}
      </svg>
    </div>
  )
}

// ── Trends Panel ──────────────────────────────────────────────────────────────
function TrendsPanel({ entries }: { entries: JournalEntry[] }) {
  return (
    <div className="journal-trends">
      <ActivityHeatmap entries={entries} />
      <MoodChart entries={entries} />
    </div>
  )
}

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
                style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', color: 'var(--danger)' }}
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
  const [showTrends, setShowTrends] = useState(false)

  const streak = calcStreak(entries)
  const totalMinutes = entries.reduce((acc, e) => acc + (e.durationMinutes || 0), 0)

  // Avg mood
  const moodEntries = entries.filter(e => e.mood != null)
  const avgMoodRaw = moodEntries.length > 0
    ? moodEntries.reduce((acc, e) => acc + (e.mood as number), 0) / moodEntries.length
    : null
  const avgMoodEmoji = avgMoodRaw != null ? AVG_MOOD_EMOJIS[Math.round(avgMoodRaw)] : null

  // Most used tag
  const tagCounts: Record<string, number> = {}
  for (const e of entries) {
    for (const t of e.tags) {
      tagCounts[t] = (tagCounts[t] || 0) + 1
    }
  }
  const topTag = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a])[0] ?? null

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
            <strong>📅 {entries.length}</strong>sessions
          </div>
          <div className="journal-stat">
            <strong>⏱ {totalMinutes}</strong>min
          </div>
          {avgMoodEmoji != null && (
            <div className="journal-stat">
              <strong>{avgMoodEmoji}</strong>avg mood
            </div>
          )}
          {topTag != null && (
            <div className="journal-stat">
              <strong>🏷 {topTag}</strong>top tag
            </div>
          )}
        </div>

        {/* Trends toggle + Add entry button row */}
        <div className="journal-trends-toggle" style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="soft-button"
            onClick={() => setShowTrends(v => !v)}
          >
            📊 {showTrends ? 'Hide Trends' : 'Trends'}
          </button>
          {!showAdd && (
            <button
              className="soft-button journal-add-btn"
              onClick={() => setShowAdd(true)}
            >➕ Add Entry Manually</button>
          )}
        </div>

        {/* Trends panel */}
        {showTrends && <TrendsPanel entries={entries} />}

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
