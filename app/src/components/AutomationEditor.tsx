import React, { useCallback, useRef } from 'react'
import type { AutomationLanes, AutomationPoint } from '../types'

const LANE_HEIGHT = 60
const POINT_RADIUS = 6

interface LaneConfig {
  key: keyof AutomationLanes
  label: string
  min: number
  max: number
  unit: string
}

const LANES: LaneConfig[] = [
  { key: 'volume', label: 'Volume', min: 0, max: 1, unit: '' },
  { key: 'filterCutoff', label: 'Filter Cutoff', min: 20, max: 20000, unit: ' Hz' },
  { key: 'beatFrequency', label: 'Beat Frequency', min: 0, max: 40, unit: ' Hz' },
]

function normalize(value: number, min: number, max: number): number {
  return (value - min) / (max - min)
}

function denormalize(n: number, min: number, max: number): number {
  return min + n * (max - min)
}

function pointToSvg(pt: AutomationPoint, width: number, min: number, max: number): [number, number] {
  const x = pt.time * width
  const y = LANE_HEIGHT - normalize(pt.value, min, max) * LANE_HEIGHT
  return [x, y]
}

function svgToPoint(x: number, y: number, width: number, min: number, max: number): AutomationPoint {
  const time = Math.max(0, Math.min(1, x / width))
  const valueNorm = Math.max(0, Math.min(1, 1 - y / LANE_HEIGHT))
  const value = denormalize(valueNorm, min, max)
  return { time, value }
}

interface LaneEditorProps {
  config: LaneConfig
  points: AutomationPoint[]
  onChange: (points: AutomationPoint[]) => void
  sessionMinutes?: number
}

export function LaneEditor({ config, points, onChange, sessionMinutes: _sessionMinutes }: LaneEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const draggingIdx = useRef<number | null>(null)
  const width = 800 // will be overridden by CSS width

  const getWidth = () => svgRef.current?.clientWidth ?? width

  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const w = rect.width

    // Check if clicking near an existing point
    for (let i = 0; i < points.length; i++) {
      const [px, py] = pointToSvg(points[i], w, config.min, config.max)
      if (Math.abs(x - px) < POINT_RADIUS * 2 && Math.abs(y - py) < POINT_RADIUS * 2) {
        draggingIdx.current = i
        e.preventDefault()
        return
      }
    }

    // Add new point
    const newPt = svgToPoint(x, y, w, config.min, config.max)
    const newPoints = [...points, newPt].sort((a, b) => a.time - b.time)
    onChange(newPoints)
  }, [points, config, onChange])

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingIdx.current === null) return
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const w = rect.width
    const newPt = svgToPoint(x, y, w, config.min, config.max)
    const newPoints = [...points]
    newPoints[draggingIdx.current] = newPt
    newPoints.sort((a, b) => a.time - b.time)
    onChange(newPoints)
  }, [points, config, onChange])

  const handleMouseUp = useCallback(() => {
    draggingIdx.current = null
  }, [])

  const handleContextMenu = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    e.preventDefault()
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const w = rect.width
    // Remove nearest point
    let nearest = -1
    let nearestDist = Infinity
    for (let i = 0; i < points.length; i++) {
      const [px, py] = pointToSvg(points[i], w, config.min, config.max)
      const dist = Math.hypot(x - px, y - py)
      if (dist < nearestDist) { nearestDist = dist; nearest = i }
    }
    if (nearest >= 0 && nearestDist < POINT_RADIUS * 3) {
      const newPoints = points.filter((_, i) => i !== nearest)
      onChange(newPoints)
    }
  }, [points, config, onChange])

  const w = getWidth()
  const sorted = [...points].sort((a, b) => a.time - b.time)
  const polylinePoints = sorted.map((pt) => pointToSvg(pt, w, config.min, config.max).join(',')).join(' ')

  return (
    <div className="automation-lane">
      <div className="automation-lane-label">
        {config.label}
        <span className="automation-lane-hint">click to add · drag to move · right-click to remove</span>
      </div>
      <svg
        ref={svgRef}
        className="automation-svg"
        height={LANE_HEIGHT}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
        style={{ cursor: 'crosshair', userSelect: 'none' }}
      >
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((t) => (
          <line key={t} x1={`${t * 100}%`} y1={0} x2={`${t * 100}%`} y2={LANE_HEIGHT}
            stroke="#d7dfd9" strokeWidth={1} strokeDasharray="3,3" />
        ))}
        {[0.25, 0.5, 0.75].map((v) => (
          <line key={v} x1={0} y1={v * LANE_HEIGHT} x2="100%" y2={v * LANE_HEIGHT}
            stroke="#d7dfd9" strokeWidth={1} strokeDasharray="3,3" />
        ))}

        {/* Line connecting points */}
        {sorted.length > 1 && (
          <polyline points={polylinePoints} fill="none" stroke="#3e8f72" strokeWidth={2} />
        )}

        {/* Points */}
        {sorted.map((pt, i) => {
          const [px, py] = pointToSvg(pt, w, config.min, config.max)
          const valLabel = config.key === 'volume'
            ? `${Math.round(pt.value * 100)}%`
            : `${pt.value.toFixed(config.key === 'filterCutoff' ? 0 : 1)}${config.unit}`
          return (
            <g key={i}>
              <circle cx={px} cy={py} r={POINT_RADIUS} fill="#3e8f72" stroke="#fff" strokeWidth={2} />
              <text x={px + 8} y={py - 4} fontSize={10} fill="#244336">{valLabel}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

interface AutomationEditorProps {
  lanes: AutomationLanes
  onChange: (lanes: AutomationLanes) => void
  sessionMinutes: number
}

export function AutomationEditor({ lanes, onChange, sessionMinutes }: AutomationEditorProps) {
  return (
    <div className="automation-editor">
      <div className="automation-time-axis">
        <span>0</span>
        <span>{Math.round(sessionMinutes * 0.25)}m</span>
        <span>{Math.round(sessionMinutes * 0.5)}m</span>
        <span>{Math.round(sessionMinutes * 0.75)}m</span>
        <span>{sessionMinutes}m</span>
      </div>
      {LANES.map((lc) => (
        <LaneEditor
          key={lc.key}
          config={lc}
          points={lanes[lc.key]}
          onChange={(pts) => onChange({ ...lanes, [lc.key]: pts })}
        />
      ))}
    </div>
  )
}
