import type { AudioGraph, LfoTarget, GraphParams, FilterType } from '../types'
import { createNoiseBuffer } from './noiseGen'

export function scaledLfoDepth(wobbleDepth: number, target: LfoTarget): number {
  return target === 'amplitude' ? wobbleDepth / 60 : wobbleDepth
}

export function reconnectLfo(graph: AudioGraph, newTarget: LfoTarget, wobbleDepth: number): void {
  try { graph.lfoDepth.disconnect() } catch { /* already disconnected */ }
  if (graph.dcOffset) {
    try { graph.dcOffset.stop() } catch { /* ignore */ }
    try { graph.dcOffset.disconnect() } catch { /* ignore */ }
    graph.dcOffset = null
  }
  graph.amGain.gain.cancelScheduledValues(graph.context.currentTime)
  graph.amGain.gain.setValueAtTime(1, graph.context.currentTime)
  graph.lfoTarget = newTarget
  graph.lfoDepth.gain.setValueAtTime(scaledLfoDepth(wobbleDepth, newTarget), graph.context.currentTime)
  if (newTarget === 'detune') {
    graph.lfoDepth.connect(graph.leftOsc.detune)
    graph.lfoDepth.connect(graph.rightOsc.detune)
  } else if (newTarget === 'amplitude') {
    const dc = graph.context.createConstantSource()
    dc.offset.value = 1
    dc.connect(graph.amGain.gain)
    dc.start()
    graph.dcOffset = dc
    graph.lfoDepth.connect(graph.amGain.gain)
  } else {
    graph.lfoDepth.connect(graph.rightOsc.detune)
  }
}

export function applyFilterType(node: BiquadFilterNode, type: FilterType): void {
  if (type === 'lowpass') {
    node.type = 'lowpass'
  } else if (type === 'highpass') {
    node.type = 'highpass'
  }
}

export function createAudioGraph(
  params: GraphParams,
  sharedContext?: AudioContext,
  binauralDestination?: AudioNode,
): AudioGraph {
  const {
    leftFrequency, rightFrequency, wobbleRate, wobbleDepth,
    wobbleWaveform, wobbleTarget, phaseOffset,
    volume, binauralVolume, noiseType, noiseVolume,
    filterType, filterFrequency, filterQ,
  } = params

  const context = sharedContext ?? new AudioContext()
  const now = context.currentTime

  const leftOsc = context.createOscillator()
  const rightOsc = context.createOscillator()
  leftOsc.type = 'sine'
  rightOsc.type = 'sine'
  leftOsc.frequency.value = leftFrequency
  rightOsc.frequency.value = rightFrequency

  const leftGain = context.createGain()
  const rightGain = context.createGain()
  leftGain.gain.value = binauralVolume
  rightGain.gain.value = binauralVolume

  const merger = context.createChannelMerger(2)
  const amGain = context.createGain()
  amGain.gain.value = 1

  // Binaural filter
  const filterNode = context.createBiquadFilter()
  if (filterType !== 'off') {
    filterNode.type = filterType === 'lowpass' ? 'lowpass' : 'highpass'
  } else {
    filterNode.type = 'allpass'
  }
  filterNode.frequency.value = filterFrequency
  filterNode.Q.value = filterType !== 'off' ? filterQ : 0

  // Automation gain
  const automationGain = context.createGain()
  automationGain.gain.value = 1

  const masterGain = context.createGain()
  masterGain.gain.value = sharedContext ? 1 : volume

  // Determine output destination:
  // If a binauralDestination (binauralBus) is provided, route there.
  // Otherwise fall back to context.destination (backward compat).
  const outputDestination: AudioNode = binauralDestination ?? context.destination

  // Signal path: oscs → per-ch gain → merger → amGain → filter → automationGain → masterGain → outputDestination
  leftOsc.connect(leftGain)
  rightOsc.connect(rightGain)
  leftGain.connect(merger, 0, 0)
  rightGain.connect(merger, 0, 1)
  merger.connect(amGain)
  amGain.connect(filterNode)
  filterNode.connect(automationGain)
  automationGain.connect(masterGain)
  masterGain.connect(outputDestination)

  const lfo = context.createOscillator()
  lfo.type = wobbleWaveform
  lfo.frequency.value = wobbleRate
  const lfoDepth = context.createGain()
  lfoDepth.gain.value = scaledLfoDepth(wobbleDepth, wobbleTarget)
  lfo.connect(lfoDepth)

  let dcOffset: ConstantSourceNode | null = null
  if (wobbleTarget === 'detune') {
    lfoDepth.connect(leftOsc.detune)
    lfoDepth.connect(rightOsc.detune)
  } else if (wobbleTarget === 'amplitude') {
    const dc = context.createConstantSource()
    dc.offset.value = 1
    dc.connect(amGain.gain)
    dc.start(now)
    dcOffset = dc
    lfoDepth.connect(amGain.gain)
  } else {
    lfoDepth.connect(rightOsc.detune)
  }

  const noiseGain = context.createGain()
  noiseGain.gain.value = noiseType !== 'none' ? noiseVolume : 0
  // Noise goes to same outputDestination as binaural (via masterGain chain) — or directly if standalone
  noiseGain.connect(masterGain)

  let noiseSource: AudioBufferSourceNode | null = null
  if (noiseType !== 'none') {
    noiseSource = createNoiseBuffer(context, noiseType)
    noiseSource.connect(noiseGain)
  }

  const phaseDelay = phaseOffset > 0 ? (phaseOffset / 360) / rightFrequency : 0
  leftOsc.start(now)
  rightOsc.start(Math.max(0, now - phaseDelay))
  lfo.start(now)

  return {
    context, leftOsc, rightOsc, leftGain, rightGain, merger,
    amGain, dcOffset, filterNode, automationGain, masterGain,
    lfo, lfoDepth, lfoTarget: wobbleTarget, noiseSource, noiseGain,
  }
}

export function stopAudioGraph(graph: AudioGraph | null): void {
  if (!graph) return
  if (graph.noiseSource) {
    try { graph.noiseSource.stop() } catch { /* ignore */ }
    graph.noiseSource.disconnect()
  }
  if (graph.dcOffset) {
    try { graph.dcOffset.stop() } catch { /* ignore */ }
    graph.dcOffset.disconnect()
  }
  try { graph.lfo.stop() } catch { /* ignore */ }
  try { graph.leftOsc.stop() } catch { /* ignore */ }
  try { graph.rightOsc.stop() } catch { /* ignore */ }
  // Only close context if we own it (no shared context) — App.tsx handles context.close()
}
