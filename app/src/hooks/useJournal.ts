import { useState, useCallback } from 'react'
import type { JournalEntry } from '../types'

const KEY = 'liminal-journal-entries'

function load(): JournalEntry[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}

export function useJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>(load)

  const addEntry = useCallback((entry: JournalEntry) => {
    setEntries(prev => {
      const next = [entry, ...prev]
      localStorage.setItem(KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const updateEntry = useCallback((id: string, patch: Partial<JournalEntry>) => {
    setEntries(prev => {
      const next = prev.map(e => e.id === id ? { ...e, ...patch } : e)
      localStorage.setItem(KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const deleteEntry = useCallback((id: string) => {
    setEntries(prev => {
      const next = prev.filter(e => e.id !== id)
      localStorage.setItem(KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return { entries, addEntry, updateEntry, deleteEntry }
}
