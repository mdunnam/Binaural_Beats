import { useState } from 'react'
import { brushTypeToBeat } from '../lib/sculptBridge'
import type { BridgeMapping, SculptState } from '../lib/sculptBridge'

interface SculptBridgePanelProps {
  enabled: boolean
  onToggle: (v: boolean) => void
  connected: boolean
  lastState: SculptState
  mapping: BridgeMapping
  onMappingChange: (m: BridgeMapping) => void
  mode: 'flow' | 'instrument'
  onModeChange: (m: 'flow' | 'instrument') => void
}

export function SculptBridgePanel({ enabled, onToggle, connected, lastState, mapping, onMappingChange, mode, onModeChange }: SculptBridgePanelProps) {
  const [showMapping, setShowMapping] = useState(false)

  return (
    <div className="sculpt-bridge-panel">
      {/* Header */}
      <div className="sculpt-bridge-header">
        <div className="sculpt-bridge-title">
          <span>🗿 ZBrush Bridge</span>
          <span className={`bridge-status-dot ${connected ? 'bridge-status-dot--on' : enabled ? 'bridge-status-dot--waiting' : ''}`} />
          <span className="bridge-status-label">
            {!enabled ? 'Off' : connected ? 'Connected' : 'Waiting for ZBrush…'}
          </span>
        </div>
        <button
          className={`soft-button soft-button--sm ${enabled ? 'soft-button--accent' : ''}`}
          onClick={() => onToggle(!enabled)}
        >
          {enabled ? 'Disable' : 'Enable Bridge'}
        </button>
      </div>

      {enabled && (
        <>
          {/* Mode selector */}
          <div className="bridge-mode-row">
            <button className={`bridge-mode-btn ${mode === 'flow' ? 'active' : ''}`} onClick={() => onModeChange('flow')}>
              🌊 Flow State
            </button>
            <button className={`bridge-mode-btn ${mode === 'instrument' ? 'active' : ''}`} onClick={() => onModeChange('instrument')}>
              🎹 Instrument
            </button>
          </div>
          <div className="bridge-mode-desc">
            {mode === 'flow'
              ? 'Liminal adapts to your sculpting energy. Music follows your creative state automatically.'
              : 'Each stroke triggers a note. Sculpt to compose.'}
          </div>

          {/* Live state readout */}
          {connected && (
            <div className="bridge-live-state">
              <div className="bridge-live-row">
                <span>Pressure</span>
                <div className="bridge-bar-wrap"><div className="bridge-bar" style={{ width: `${lastState.pressure * 100}%` }} /></div>
              </div>
              <div className="bridge-live-row">
                <span>Speed</span>
                <div className="bridge-bar-wrap"><div className="bridge-bar" style={{ width: `${lastState.speed * 100}%` }} /></div>
              </div>
              <div className="bridge-live-row">
                <span>Brush</span>
                <strong>{lastState.brushType} → {brushTypeToBeat(lastState.brushType)} Hz</strong>
              </div>
              <div className="bridge-live-row">
                <span>State</span>
                <strong>{lastState.idle ? '😴 Idle' : `🎨 Sculpting (${lastState.strokesPerSecond}/s)`}</strong>
              </div>
            </div>
          )}

          {/* Mapping toggles */}
          <button className="bridge-mapping-toggle" onClick={() => setShowMapping(v => !v)}>
            {showMapping ? '▲' : '▼'} Mapping settings
          </button>
          {showMapping && (
            <div className="bridge-mapping-grid">
              {(Object.keys(mapping) as (keyof BridgeMapping)[]).map(key => (
                <label key={key} className="bridge-mapping-row">
                  <input type="checkbox" checked={mapping[key]} onChange={e => onMappingChange({ ...mapping, [key]: e.target.checked })} />
                  <span>{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                </label>
              ))}
            </div>
          )}

          {/* Setup instructions */}
          {!connected && (
            <div className="bridge-setup-hint">
              <p>Install the XMD Bridge companion from <strong>xmdsource.com</strong> and open ZBrush to connect.</p>
              <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>Listening on localhost:7842</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
