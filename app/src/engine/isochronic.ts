import type { MasterBus } from './masterBus'

export type IsochronicGraph = {
  osc: OscillatorNode
  gainNode: GainNode
  context: AudioContext
  intervalId: ReturnType<typeof setInterval>
  params: IsochronicParams
}

export type IsochronicParams = {
  carrier: number
  beatFrequency: number
  volume: number
  waveform: OscillatorType
  dutyCycle: number
  rampMs: number
}

export function createIsochronicTone(
  params: IsochronicParams,
  masterBus: MasterBus,
): IsochronicGraph {
  const context = masterBus.context
  const osc = context.createOscillator()
  const gainNode = context.createGain()

  osc.type = params.waveform
  osc.frequency.value = params.carrier
  gainNode.gain.value = 0

  osc.connect(gainNode)
  gainNode.connect(masterBus.binauralBus)
  osc.start()

  const cycleDuration = 1 / params.beatFrequency
  const rampSec = Math.max(params.rampMs, 20) / 1000
  let nextCycleTime = context.currentTime

  function schedulePulses(): void {
    while (nextCycleTime < context.currentTime + 2.0) {
      const onDuration = cycleDuration * params.dutyCycle
      const offAt = nextCycleTime + onDuration
      const endAt = nextCycleTime + cycleDuration

      // Attack
      gainNode.gain.setValueAtTime(0, nextCycleTime)
      gainNode.gain.linearRampToValueAtTime(params.volume, nextCycleTime + rampSec)
      // Release
      gainNode.gain.setValueAtTime(params.volume, Math.max(nextCycleTime + rampSec, offAt - rampSec))
      gainNode.gain.linearRampToValueAtTime(0, offAt)
      gainNode.gain.setValueAtTime(0, endAt)

      nextCycleTime = endAt
    }
  }

  schedulePulses()
  const intervalId = setInterval(schedulePulses, 500)

  return { osc, gainNode, context, intervalId, params }
}

export function stopIsochronicTone(graph: IsochronicGraph): void {
  clearInterval(graph.intervalId)
  graph.gainNode.gain.cancelScheduledValues(graph.context.currentTime)
  graph.gainNode.gain.setValueAtTime(graph.gainNode.gain.value, graph.context.currentTime)
  graph.gainNode.gain.linearRampToValueAtTime(0, graph.context.currentTime + 0.05)
  try { graph.osc.stop(graph.context.currentTime + 0.1) } catch { /* ignore */ }
}

export function updateIsochronicParams(
  _graph: IsochronicGraph,
  _params: Partial<IsochronicParams>,
): void {
  // No-op: caller should stopIsochronicTone + createIsochronicTone for param changes
}
