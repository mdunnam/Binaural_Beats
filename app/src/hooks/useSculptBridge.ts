import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchSculptState, computeAudioTargets, DEFAULT_SCULPT_STATE } from '../lib/sculptBridge'
import type { SculptState, AudioTargets, BridgeMapping } from '../lib/sculptBridge'

interface UseSculptBridgeOptions {
  enabled: boolean
  baseCarrier: number
  baseBeat: number
  mapping: BridgeMapping
  onAudioTargets: (targets: AudioTargets) => void
}

function targetsChanged(a: AudioTargets, b: AudioTargets): boolean {
  return (
    Math.abs(a.carrier - b.carrier) > 0.01 ||
    Math.abs(a.beat - b.beat) > 0.01 ||
    Math.abs(a.binauralVolume - b.binauralVolume) > 0.005 ||
    Math.abs(a.noiseVolume - b.noiseVolume) > 0.005
  )
}

export function useSculptBridge({ enabled, baseCarrier, baseBeat, mapping, onAudioTargets }: UseSculptBridgeOptions) {
  const [connected, setConnected] = useState(false)
  const [lastState, setLastState] = useState<SculptState>(DEFAULT_SCULPT_STATE)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onAudioTargetsRef = useRef(onAudioTargets)
  const lastTargetsRef = useRef<AudioTargets | null>(null)
  onAudioTargetsRef.current = onAudioTargets

  const poll = useCallback(async () => {
    const state = await fetchSculptState()
    if (!state) {
      setConnected(false)
      return
    }
    setConnected(true)
    setLastState(state)
    const targets = computeAudioTargets(state, mapping, baseCarrier, baseBeat)
    // Only call onAudioTargets when something meaningful changed — avoids
    // hammering the audio graph 5x/second at idle with identical values.
    if (!lastTargetsRef.current || targetsChanged(lastTargetsRef.current, targets)) {
      lastTargetsRef.current = targets
      onAudioTargetsRef.current(targets)
    }
  }, [mapping, baseCarrier, baseBeat])

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      lastTargetsRef.current = null
      setConnected(false)
      return
    }
    intervalRef.current = setInterval(poll, 200)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [enabled, poll])

  return { connected, lastState }
}
