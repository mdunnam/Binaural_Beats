import type { JournalEntry } from '../types'

interface Props {
  entries: JournalEntry[]
  onClose: () => void
}

export function SessionJournal({ entries, onClose }: Props) {
  return (
    <div className="journal-panel">
      <div className="journal-header">
        <h2 className="journal-title">Session Journal</h2>
        <button className="soft-button" onClick={onClose}>✕ Close</button>
      </div>
      {entries.length === 0 ? (
        <p className="journal-empty">No journal entries yet. Complete a session to add one.</p>
      ) : (
        <div className="journal-list">
          {entries.map((e) => (
            <div key={e.id} className="journal-entry">
              <div className="journal-entry-meta">
                <span className="journal-entry-preset">{e.presetName}</span>
                <span className="journal-entry-duration">{e.durationMinutes} min</span>
                <span className="journal-entry-date">{e.date}</span>
              </div>
              {e.notes && <p className="journal-entry-notes">{e.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
