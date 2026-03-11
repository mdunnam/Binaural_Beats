import { useState } from 'react'

interface ApiKeySettingsProps {
  onClose: () => void
  onSaved: (key: string) => void
  currentKey: string
}

export function ApiKeySettings({ onClose, onSaved, currentKey }: ApiKeySettingsProps) {
  const [key, setKey] = useState(currentKey)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    localStorage.setItem('binaural-openai-key', key.trim())
    onSaved(key.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="settings-panel" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="ai-panel-card">
        <h2 style={{ margin: '0 0 1rem', fontSize: '1.2rem' }}>⚙ API Key Settings</h2>
        <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>
          OpenAI API Key
          <input
            className="api-key-input"
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="sk-…"
            autoComplete="off"
          />
        </label>
        <p className="api-key-note">
          🔒 Your key is stored locally on this device only — never sent anywhere except OpenAI.
          {' '}<a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">Get a key →</a>
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button className="ai-generate-btn" onClick={handleSave}>
            {saved ? '✓ Saved!' : 'Save Key'}
          </button>
          <button className="soft-button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
