import type { GeneratedMeditation } from './meditationComposer'

export type SavedSession = {
  id: string
  savedAt: number
  prompt: string
  theme: string
  durationMinutes: number
  voice: string
  intensity: string
  soundscape: string
  carrier: number
  beat: number
  noiseType: string
  noiseVolume: number
  padEnabled: boolean
  script: string
  // audio is stored separately in IDB object store 'audio' keyed by id
}

// ---------------------------------------------------------------------------
// IndexedDB setup
// ---------------------------------------------------------------------------
const DB_NAME = 'binaural-sessions'
const DB_VERSION = 1
const META_STORE = 'sessions'
const AUDIO_STORE = 'audio'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(META_STORE)) {
        const store = db.createObjectStore(META_STORE, { keyPath: 'id' })
        store.createIndex('savedAt', 'savedAt')
      }
      if (!db.objectStoreNames.contains(AUDIO_STORE)) {
        db.createObjectStore(AUDIO_STORE) // keyed manually by session id
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function idbPut(db: IDBDatabase, storeName: string, value: unknown, key?: IDBValidKey): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const req = key !== undefined
      ? tx.objectStore(storeName).put(value, key)
      : tx.objectStore(storeName).put(value)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

function idbGetAll<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const req = tx.objectStore(storeName).getAll()
    req.onsuccess = () => resolve(req.result as T[])
    req.onerror = () => reject(req.error)
  })
}

function idbGet<T>(db: IDBDatabase, storeName: string, key: IDBValidKey): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const req = tx.objectStore(storeName).get(key)
    req.onsuccess = () => resolve(req.result as T | undefined)
    req.onerror = () => reject(req.error)
  })
}

function idbDelete(db: IDBDatabase, storeName: string, key: IDBValidKey): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const req = tx.objectStore(storeName).delete(key)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export async function saveSession(
  prompt: string,
  options: { voice: string; intensity: string; soundscape: string; durationMinutes: number },
  result: GeneratedMeditation,
): Promise<SavedSession> {
  const db = await openDb()

  const meta: SavedSession = {
    id: crypto.randomUUID(),
    savedAt: Date.now(),
    prompt,
    theme: result.config.theme,
    durationMinutes: options.durationMinutes,
    voice: options.voice,
    intensity: options.intensity,
    soundscape: options.soundscape,
    carrier: result.config.carrier,
    beat: result.config.beat,
    noiseType: result.config.noiseType,
    noiseVolume: result.config.noiseVolume,
    padEnabled: result.config.padEnabled,
    script: result.script,
  }

  await idbPut(db, META_STORE, meta)
  await idbPut(db, AUDIO_STORE, result.audioBlob, meta.id)
  db.close()
  return meta
}

export async function listSessions(): Promise<SavedSession[]> {
  const db = await openDb()
  const all = await idbGetAll<SavedSession>(db, META_STORE)
  db.close()
  return all.sort((a, b) => b.savedAt - a.savedAt)
}

export async function deleteSession(id: string): Promise<void> {
  const db = await openDb()
  await idbDelete(db, META_STORE, id)
  await idbDelete(db, AUDIO_STORE, id)
  db.close()
}

export async function getSessionBlob(id: string): Promise<Blob | undefined> {
  const db = await openDb()
  const blob = await idbGet<Blob>(db, AUDIO_STORE, id)
  db.close()
  return blob
}

// Migrate any old base64 sessions from localStorage (one-time)
export async function migrateFromLocalStorage(): Promise<void> {
  const LEGACY_KEY = 'binaural-ai-sessions-v1'
  const raw = localStorage.getItem(LEGACY_KEY)
  if (!raw) return
  try {
    type LegacySession = SavedSession & { audioDataUrl?: string }
    const legacy = JSON.parse(raw) as LegacySession[]
    const db = await openDb()
    for (const s of legacy) {
      if (!s.id || !s.audioDataUrl) continue
      const { audioDataUrl, ...meta } = s
      await idbPut(db, META_STORE, meta)
      const blob = await fetch(audioDataUrl).then((r) => r.blob())
      await idbPut(db, AUDIO_STORE, blob, s.id)
    }
    db.close()
    localStorage.removeItem(LEGACY_KEY)
  } catch {
    // silently skip bad legacy data
  }
}
