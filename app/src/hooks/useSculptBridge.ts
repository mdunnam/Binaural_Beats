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

export function useSculptBridge({ enabled, baseCarrier, baseBeat, mapping, onAudioTargets }: UseSculptBridgeOptions) {
  const [connected, setConnected] = useState(false)
  const [lastState, setLastState] = useState<SculptState>(DEFAULT_SCULPT_STATE)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onAudioTargetsRef = useRef(onAudioTargets)
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
    onAudioTargetsRef.current(targets)
  }, [mapping, baseCarrier, baseBeat])

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setConnected(false)
      return
    }
    intervalRef.current = setInterval(poll, 200)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [enabled, poll])

  return { connected, lastState }
}
