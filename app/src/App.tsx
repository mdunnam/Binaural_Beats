import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import type {
  NoiseType, LfoWaveform, LfoTarget, FilterType, PadWaveform,
  AudioGraph, AutomationLanes, AutomationPoint, SessionPreset, JournalEntry, PadSynthGraph,
} from './types'
import { createAudioGraph, stopAudioGraph, reconnectLfo, scaledLfoDepth } from './engine/audioGraph'
import { createNoiseBuffer } from './engine/noiseGen'
import {
  createPadSynth, stopPadSynth,
  updatePadVolume, updatePadReverbMix, updatePadBreatheRate, updatePadWaveform, updatePadRoot,
} from './engine/padSynth'
import { createVoiceBus, stopVoiceBus, setVoiceVolume as setVoiceVolume_bus, setVoiceReverb as setVoiceReverb_bus } from './engine/voiceBus'
import type { VoiceBus } from './engine/voiceBus'
import { encodeWav, downloadBlob } from './engine/wavExport'
import { AutomationEditor } from './components/AutomationEditor'
import { SoundscapeMixer } from './components/SoundscapeMixer'
import type { LayerGains, SoundscapeMixerNodes } from './engine/soundscapeMixer'
import { DEFAULT_GAINS, SOUND_LAYERS, SOUNDSCAPE_SCENES, createSoundscapeMixer, stopSoundscapeMixer, updateLayerGain } from './engine/soundscapeMixer'
import { SessionJournal } from './components/SessionJournal'
import { AiMeditationPanel } from './components/AiMeditationPanel'
import type { AiMeditationConfig } from './components/AiMeditationPanel'
import { ApiKeySettings } from './components/ApiKeySettings'
import { TabNav } from './components/TabNav'
import { createMasterBus, setMasterVolume } from './engine/masterBus'
import type { MasterBus } from './engine/masterBus'
import { createIsochronicTone, stopIsochronicTone } from './engine/isochronic'
import type { IsochronicGraph } from './engine/isochronic'
import { PlayerTab } from './components/PlayerTab'
import { VisualTab } from './components/VisualTab'
import { JourneyBuilder, BUILT_IN_JOURNEYS } from './components/JourneyBuilder'
import { OnboardingFlow } from './components/OnboardingFlow'
import type { OnboardingConfig } from './components/OnboardingFlow'
import type { Journey, ActiveJourney } from './engine/journeyEngine'
import { startJourney, stopJourney } from './engine/journeyEngine'

const PRESET_STORAGE_KEY = 'binaural-presets-v1'
const JOURNAL_STORAGE_KEY = 'binaural-journal-v1'

const TABS = [
  { id: 'dashboard', icon: '🏠', label: 'Home'      },
  { id: 'tones',     icon: '🎵', label: 'Tones'     },
  { id: 'sound',     icon: '🌊', label: 'Sound'     },
  { id: 'session',   icon: '⏱',  label: 'Session'  },
  { id: 'journey',   icon: '🗺',  label: 'Journey'  },
  { id: 'player',   icon: '🎛',  label: 'Player'   },
  { id: 'visual',   icon: '👁',  label: 'Visual'   },
  { id: 'ai',        icon: '🧘', label: 'Meditate'  },
  { id: 'journal',   icon: '📓', label: 'Journal'   },
]

// ---------------------------------------------------------------------------
// Solfeggio + Brainwave data
// ---------------------------------------------------------------------------
const SOLFEGGIO = [
  { hz: 174, label: 'Foundation' },
  { hz: 285, label: 'Healing' },
  { hz: 396, label: 'Liberation' },
  { hz: 417, label: 'Change' },
  { hz: 432, label: 'Harmony' },
  { hz: 528, label: 'Transformation' },
  { hz: 639, label: 'Connection' },
  { hz: 741, label: 'Expression' },
  { hz: 852, label: 'Intuition' },
  { hz: 963, label: 'Oneness' },
]

const BRAINWAVE_PRESETS = [
  { name: 'Delta', hz: 2, label: 'Sleep' },
  { name: 'Theta', hz: 6, label: 'Meditation' },
  { name: 'Alpha', hz: 10, label: 'Relaxed Focus' },
  { name: 'Beta', hz: 18, label: 'Alert' },
  { name: 'Gamma', hz: 40, label: 'Peak' },
]

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------
function readSavedPresets(): SessionPreset[] {
  const raw = localStorage.getItem(PRESET_STORAGE_KEY)
  if (!raw) return []
  try { return JSON.parse(raw) as SessionPreset[] } catch { return [] }
}
function writeSavedPresets(presets: SessionPreset[]): void {
  localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets))
}
function readJournal(): JournalEntry[] {
  const raw = localStorage.getItem(JOURNAL_STORAGE_KEY)
  if (!raw) return []
  try { return JSON.parse(raw) as JournalEntry[] } catch { return [] }
}
function writeJournal(entries: JournalEntry[]): void {
  localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(entries))
}

// ---------------------------------------------------------------------------
// End chime
// ---------------------------------------------------------------------------
function playEndChime(): void {
  const ctx = new AudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = 432
  gain.gain.value = 0.18
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start()
  gain.gain.setValueAtTime(0.18, ctx.currentTime)
  gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 2.2)
  osc.stop(ctx.currentTime + 2.3)
  osc.onended = () => { void ctx.close() }
}

// ---------------------------------------------------------------------------
// Default automation lanes
// ---------------------------------------------------------------------------
function defaultLanes(): AutomationLanes {
  return { volume: [], filterCutoff: [], beatFrequency: [] }
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
function App() {
  // Tab navigation
  const [activeTab, setActiveTab] = useState('dashboard')

  // Dark mode
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('binaural-theme') === 'dark'
  })
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
    localStorage.setItem('binaural-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  // Frequency
  const [useIndependentTuning, setUseIndependentTuning] = useState(false)
  const [carrier, setCarrier] = useState(432)
  const [beat, setBeat] = useState(6)
  const [leftFrequency, setLeftFrequency] = useState(432)
  const [rightFrequency, setRightFrequency] = useState(438)

  // LFO
  const [wobbleRate, setWobbleRate] = useState(0.4)
  const [wobbleDepth, setWobbleDepth] = useState(8)
  const [wobbleWaveform, setWobbleWaveform] = useState<LfoWaveform>('sine')
  const [wobbleTarget, setWobbleTarget] = useState<LfoTarget>('detune')

  const [phaseOffset, setPhaseOffset] = useState(0)
  const [volume, setVolume] = useState(0.2)
  const [binauralVolume, setBinauralVolume] = useState(0.15)
  const [voiceVolume, setVoiceVolume] = useState(0.8)
  const [voiceReverb, setVoiceReverb] = useState(0.3)

  // Session
  const [sessionMinutes, setSessionMinutes] = useState(10)
  const [fadeInSeconds, setFadeInSeconds] = useState(5)
  const [fadeOutSeconds, setFadeOutSeconds] = useState(5)

  // Noise
  const [noiseType, setNoiseType] = useState<NoiseType>('none')
  const [noiseVolume, setNoiseVolume] = useState(0.15)

  // Soundscape mixer
  const [layerGains, setLayerGains] = useState<LayerGains>({ ...DEFAULT_GAINS })
  const [soundsceneId, setSoundsceneId] = useState<string>('off')
  const mixerNodesRef = useRef<SoundscapeMixerNodes | null>(null)

  // Filter
  const [filterType, setFilterType] = useState<FilterType>('off')
  const [filterFrequency, setFilterFrequency] = useState(1000)
  const [filterQ, setFilterQ] = useState(1)

  // Pad synth
  const [padEnabled, setPadEnabled] = useState(false)
  const [padVolume, setPadVolume] = useState(0.15)
  const [padReverbMix, setPadReverbMix] = useState(0.5)
  const [padWaveform, setPadWaveform] = useState<PadWaveform>('sine')
  const [padBreatheRate, setPadBreatheRate] = useState(0.1)

  // Automation
  const [automationLanes, setAutomationLanes] = useState<AutomationLanes>(defaultLanes)

  // Presets
  const [presetName, setPresetName] = useState('My Session')
  const [savedPresets, setSavedPresets] = useState<SessionPreset[]>([])
  const [selectedPresetName, setSelectedPresetName] = useState('')

  // Session state
  const [isRunning, setIsRunning] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [sessionTotalSeconds, setSessionTotalSeconds] = useState(0)

  // Journal
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([])
  const [showJournalModal, setShowJournalModal] = useState(false)
  const [showJournalList, setShowJournalList] = useState(false)
  const [pendingJournalEntry, setPendingJournalEntry] = useState<Omit<JournalEntry, 'id' | 'notes'> | null>(null)

  // WAV export
  const [isExporting, setIsExporting] = useState(false)

  // AI Meditation
  const [aiApiKey, setAiApiKey] = useState<string>('')
  const [showApiSettings, setShowApiSettings] = useState(false)

  const masterBusRef = useRef<MasterBus | null>(null)
  const graphRef = useRef<AudioGraph | null>(null)
  const padRef = useRef<PadSynthGraph | null>(null)
  const voiceBusRef = useRef<VoiceBus | null>(null)
  const isoGraphRef = useRef<IsochronicGraph | null>(null)

  // Isochronic tone state
  const [isoEnabled, setIsoEnabled] = useState(false)
  const [isoVolume, setIsoVolume] = useState(0.15)
  const [isoWaveform, setIsoWaveform] = useState<OscillatorType>('sine')
  const [isoDutyCycle, setIsoDutyCycle] = useState(0.5)
  const pendingAiSessionRef = useRef<AiMeditationConfig | null>(null)
  const pendingAiObjectUrlRef = useRef<string | null>(null)
  const fadeStopTimeoutRef = useRef<number | null>(null)
  const countdownIntervalRef = useRef<number | null>(null)
  const sessionEndTimeoutRef = useRef<number | null>(null)
  const sessionStartTimeRef = useRef<number>(0)

  // Journey
  const [journey, setJourney] = useState<Journey | null>(null)
  const [activeStageIndex, setActiveStageIndex] = useState(-1)
  const activeJourneyRef = useRef<ActiveJourney | null>(null)

  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('binaural-onboarded')
  })

  // Stable refs for use in closures
  const sessionMinutesRef = useRef(sessionMinutes)
  const presetNameRef = useRef(presetName)
  useEffect(() => { sessionMinutesRef.current = sessionMinutes }, [sessionMinutes])
  useEffect(() => { presetNameRef.current = presetName }, [presetName])

  // ---------------------------------------------------------------------------
  // Onboarding handlers
  // ---------------------------------------------------------------------------
  const handleOnboardingComplete = useCallback((config: OnboardingConfig) => {
    setCarrier(config.carrier)
    setBeat(config.beat)
    setWobbleRate(config.wobbleRate)
    setSoundsceneId(config.soundsceneId)
    setSessionMinutes(config.sessionMinutes)
    if (config.journeyId) {
      const j = BUILT_IN_JOURNEYS.find(j => j.id === config.journeyId)
      if (j) setJourney({ ...j })
    }
    localStorage.setItem('binaural-onboarded', '1')
    setShowOnboarding(false)
    setActiveTab('player')
  }, [])

  const handleOnboardingSkip = useCallback(() => {
    localStorage.setItem('binaural-onboarded', '1')
    setShowOnboarding(false)
  }, [])

  // ---------------------------------------------------------------------------
  // Timer helpers
  // ---------------------------------------------------------------------------
  const clearSessionTimers = (): void => {
    if (fadeStopTimeoutRef.current !== null) { window.clearTimeout(fadeStopTimeoutRef.current); fadeStopTimeoutRef.current = null }
    if (countdownIntervalRef.current !== null) { window.clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null }
    if (sessionEndTimeoutRef.current !== null) { window.clearTimeout(sessionEndTimeoutRef.current); sessionEndTimeoutRef.current = null }
  }

  const stopSession = useCallback((useFade: boolean, withChime = false, natural = false): void => {
    const graph = graphRef.current
    if (!graph) return
    clearSessionTimers()
    setRemainingSeconds(0)

    // Stop journey if running
    if (activeJourneyRef.current) {
      stopJourney(activeJourneyRef.current)
      activeJourneyRef.current = null
      setActiveStageIndex(-1)
    }
    const now = graph.context.currentTime
    const fadeOut = useFade ? Math.max(0, fadeOutSeconds) : 0

    if (natural) {
      const mins = sessionMinutesRef.current
      const name = presetNameRef.current
      setPendingJournalEntry({
        date: new Date().toLocaleString(),
        presetName: name || 'Unnamed',
        durationMinutes: mins,
      })
      setShowJournalModal(true)
    }

    // Fade pad out
    if (padRef.current) {
      void stopPadSynth(padRef.current, Math.max(1, fadeOut))
      padRef.current = null
    }

    // Stop soundscape mixer
    if (mixerNodesRef.current) {
      stopSoundscapeMixer(mixerNodesRef.current)
      mixerNodesRef.current = null
    }

    // Fade voice bus out
    if (voiceBusRef.current) {
      stopVoiceBus(voiceBusRef.current, Math.max(1, fadeOut))
      voiceBusRef.current = null
    }

    // Revoke object URL
    if (pendingAiObjectUrlRef.current) {
      URL.revokeObjectURL(pendingAiObjectUrlRef.current)
      pendingAiObjectUrlRef.current = null
    }

    const doStop = (): void => {
      if (isoGraphRef.current) {
        stopIsochronicTone(isoGraphRef.current)
        isoGraphRef.current = null
      }
      stopAudioGraph(graph)
      graphRef.current = null
      // Close the shared AudioContext owned by masterBus
      void masterBusRef.current?.context.close()
      masterBusRef.current = null
      setIsRunning(false)
      if (withChime) playEndChime()
    }

    if (fadeOut <= 0) {
      doStop()
      return
    }
    const bus = masterBusRef.current
    if (bus) {
      const masterNow = bus.context.currentTime
      const currentGain = bus.masterGain.gain.value
      bus.masterGain.gain.cancelScheduledValues(masterNow)
      bus.masterGain.gain.setValueAtTime(currentGain, masterNow)
      bus.masterGain.gain.linearRampToValueAtTime(0.0001, masterNow + fadeOut)
    } else {
      const currentGain = graph.masterGain.gain.value
      graph.masterGain.gain.cancelScheduledValues(now)
      graph.masterGain.gain.setValueAtTime(currentGain, now)
      graph.masterGain.gain.linearRampToValueAtTime(0.0001, now + fadeOut)
    }
    fadeStopTimeoutRef.current = window.setTimeout(() => {
      doStop()
      fadeStopTimeoutRef.current = null
    }, Math.ceil(fadeOut * 1000))
  }, [fadeOutSeconds])

  // ---------------------------------------------------------------------------
  // Automation scheduling
  // ---------------------------------------------------------------------------
  const scheduleAutomation = (graph: AudioGraph, lanes: AutomationLanes, totalSec: number, startTime: number): void => {
    const ctx = graph.context
    const now = ctx.currentTime

    if (lanes.volume.length > 0) {
      const sorted = [...lanes.volume].sort((a, b) => a.time - b.time)
      graph.automationGain.gain.cancelScheduledValues(now)
      graph.automationGain.gain.setValueAtTime(graph.automationGain.gain.value, now)
      sorted.forEach((pt) => {
        const t = startTime + pt.time * totalSec
        if (t > now) graph.automationGain.gain.linearRampToValueAtTime(pt.value, t)
      })
    }

    if (lanes.filterCutoff.length > 0) {
      const sorted = [...lanes.filterCutoff].sort((a, b) => a.time - b.time)
      graph.filterNode.frequency.cancelScheduledValues(now)
      graph.filterNode.frequency.setValueAtTime(graph.filterNode.frequency.value, now)
      sorted.forEach((pt) => {
        const t = startTime + pt.time * totalSec
        if (t > now) graph.filterNode.frequency.linearRampToValueAtTime(pt.value, t)
      })
    }

    if (lanes.beatFrequency.length > 0) {
      const sorted = [...lanes.beatFrequency].sort((a, b) => a.time - b.time)
      const lf = graph.leftOsc.frequency.value
      graph.rightOsc.frequency.cancelScheduledValues(now)
      graph.rightOsc.frequency.setValueAtTime(graph.rightOsc.frequency.value, now)
      sorted.forEach((pt) => {
        const t = startTime + pt.time * totalSec
        if (t > now) graph.rightOsc.frequency.linearRampToValueAtTime(lf + pt.value, t)
      })
    }
  }

  const startSessionTimers = useCallback((graph: AudioGraph, lanes: AutomationLanes): void => {
    const totalSeconds = Math.max(0, Math.round(sessionMinutes * 60))
    setRemainingSeconds(totalSeconds)
    setSessionTotalSeconds(totalSeconds)
    if (totalSeconds <= 0) return

    scheduleAutomation(graph, lanes, totalSeconds, graph.context.currentTime)

    let secondsLeft = totalSeconds
    countdownIntervalRef.current = window.setInterval(() => {
      secondsLeft -= 1
      setRemainingSeconds(Math.max(0, secondsLeft))
      if (secondsLeft <= 0 && countdownIntervalRef.current !== null) {
        window.clearInterval(countdownIntervalRef.current)
        countdownIntervalRef.current = null
      }
    }, 1000)
    const fadeOutStartMs = Math.max(totalSeconds - Math.max(0, fadeOutSeconds), 0) * 1000
    sessionEndTimeoutRef.current = window.setTimeout(() => {
      stopSession(true, true, true)
    }, Math.ceil(fadeOutStartMs))
  }, [sessionMinutes, fadeOutSeconds, stopSession])

  // ---------------------------------------------------------------------------
  // Toggle session
  // ---------------------------------------------------------------------------
  const toggleAudio = async (): Promise<void> => {
    if (graphRef.current) { stopSession(true); return }
    clearSessionTimers()

    const aiConfig = pendingAiSessionRef.current
    const activeNoiseType = aiConfig ? aiConfig.noiseType : noiseType
    const activeNoiseVolume = aiConfig ? aiConfig.noiseVolume : noiseVolume

    // 1. Create master bus (owns the AudioContext)
    const bus = createMasterBus(volume)
    masterBusRef.current = bus

    if (bus.context.state !== 'running') await bus.context.resume()

    // 2. Create audio graph (binaural), share context, connect to binauralBus
    const graph = createAudioGraph({
      leftFrequency, rightFrequency, wobbleRate, wobbleDepth,
      wobbleWaveform, wobbleTarget, phaseOffset, volume, binauralVolume,
      noiseType: activeNoiseType, noiseVolume: activeNoiseVolume, filterType, filterFrequency, filterQ,
    }, bus.context, bus.binauralBus)

    const now = bus.context.currentTime
    sessionStartTimeRef.current = now
    const safeVolume = Math.max(0.0001, volume)
    if (fadeInSeconds > 0) {
      bus.masterGain.gain.setValueAtTime(0.0001, now)
      bus.masterGain.gain.linearRampToValueAtTime(safeVolume, now + fadeInSeconds)
    } else {
      bus.masterGain.gain.setValueAtTime(safeVolume, now)
    }

    graphRef.current = graph

    // If a journey is loaded, start it
    if (journey && graphRef.current) {
      const activeJourney = startJourney(
        journey,
        graphRef.current,
        30,
        (stageIndex, stage) => {
          setActiveStageIndex(stageIndex)
          setCarrier(stage.carrier)
          setBeat(stage.beat)
          setWobbleRate(stage.wobbleRate)
          setSoundsceneId(stage.soundsceneId)
        },
      )
      activeJourneyRef.current = activeJourney
    }

    // 3. Create soundscape player, connect to soundscapeBus
    const mixerNodes = createSoundscapeMixer(bus.context, bus.soundscapeBus, layerGains)
    mixerNodesRef.current = mixerNodes

    if (padEnabled) {
      const pad = createPadSynth(bus.context, carrier, padVolume, padReverbMix, padWaveform, padBreatheRate, bus.masterGain)
      padRef.current = pad
    }

    // 4. Voice bus created when AI session starts, connects to bus.voiceBus
    if (pendingAiSessionRef.current) {
      const pendingConfig = pendingAiSessionRef.current
      pendingAiSessionRef.current = null
      createVoiceBus(bus.context, pendingConfig.audioBlob, bus.voiceBus, voiceVolume).then((vb) => {
        voiceBusRef.current = vb
      }).catch((err) => {
        console.error('Voice bus failed:', err)
      })
    }

    setIsRunning(true)
    if (isoEnabled) {
      isoGraphRef.current = createIsochronicTone({
        carrier,
        beatFrequency: beat,
        volume: isoVolume,
        waveform: isoWaveform,
        dutyCycle: isoDutyCycle,
        rampMs: 20,
      }, bus)
    }
    startSessionTimers(graph, automationLanes)
  }

  // ---------------------------------------------------------------------------
  // Preset helpers
  // ---------------------------------------------------------------------------
  const buildCurrentPreset = (): SessionPreset => ({
    name: presetName.trim() || `Preset ${savedPresets.length + 1}`,
    useIndependentTuning, carrier, beat, leftFrequency, rightFrequency,
    wobbleRate, wobbleDepth, wobbleWaveform, wobbleTarget,
    phaseOffset, volume, sessionMinutes, fadeInSeconds, fadeOutSeconds,
    noiseType, noiseVolume,
  })

  const savePreset = (): void => {
    const next = buildCurrentPreset()
    const idx = savedPresets.findIndex((p) => p.name === next.name)
    const list = [...savedPresets]
    if (idx >= 0) list[idx] = next; else list.push(next)
    setSavedPresets(list); setSelectedPresetName(next.name); writeSavedPresets(list)
  }

  const loadSelectedPreset = (): void => {
    const preset = savedPresets.find((p) => p.name === selectedPresetName)
    if (!preset) return
    setUseIndependentTuning(preset.useIndependentTuning)
    setCarrier(preset.carrier); setBeat(preset.beat)
    setLeftFrequency(preset.leftFrequency); setRightFrequency(preset.rightFrequency)
    setWobbleRate(preset.wobbleRate); setWobbleDepth(preset.wobbleDepth)
    setWobbleWaveform(preset.wobbleWaveform ?? 'sine')
    setWobbleTarget(preset.wobbleTarget ?? 'detune')
    setPhaseOffset(preset.phaseOffset ?? 0)
    setVolume(preset.volume); setSessionMinutes(preset.sessionMinutes)
    setFadeInSeconds(preset.fadeInSeconds); setFadeOutSeconds(preset.fadeOutSeconds)
    setNoiseType(preset.noiseType ?? 'none'); setNoiseVolume(preset.noiseVolume ?? 0.15)
    setPresetName(preset.name)
  }

  const deleteSelectedPreset = (): void => {
    if (!selectedPresetName) return
    const list = savedPresets.filter((p) => p.name !== selectedPresetName)
    setSavedPresets(list); writeSavedPresets(list)
    setSelectedPresetName(list.length > 0 ? list[0].name : '')
  }

  // ---------------------------------------------------------------------------
  // WAV Export
  // ---------------------------------------------------------------------------
  const exportWav = async (): Promise<void> => {
    setIsExporting(true)
    try {
      const totalSec = sessionMinutes * 60
      const sampleRate = 44100
      const offCtx = new OfflineAudioContext(2, Math.ceil(sampleRate * totalSec), sampleRate)
      const now = offCtx.currentTime

      const lOsc = offCtx.createOscillator(); lOsc.type = 'sine'; lOsc.frequency.value = leftFrequency
      const rOsc = offCtx.createOscillator(); rOsc.type = 'sine'; rOsc.frequency.value = rightFrequency
      const lGain = offCtx.createGain(); const rGain = offCtx.createGain()
      lGain.gain.value = 1; rGain.gain.value = 1
      const merger = offCtx.createChannelMerger(2)
      const amGain = offCtx.createGain(); amGain.gain.value = 1
      const filterNode = offCtx.createBiquadFilter()
      if (filterType !== 'off') {
        filterNode.type = filterType === 'lowpass' ? 'lowpass' : 'highpass'
        filterNode.frequency.value = filterFrequency; filterNode.Q.value = filterQ
      } else { filterNode.type = 'allpass' }
      const autoGain = offCtx.createGain(); autoGain.gain.value = 1
      const masterGain = offCtx.createGain(); masterGain.gain.value = volume

      lOsc.connect(lGain); rOsc.connect(rGain)
      lGain.connect(merger, 0, 0); rGain.connect(merger, 0, 1)
      merger.connect(amGain); amGain.connect(filterNode)
      filterNode.connect(autoGain); autoGain.connect(masterGain)
      masterGain.connect(offCtx.destination)

      if (fadeInSeconds > 0) {
        masterGain.gain.setValueAtTime(0.0001, now)
        masterGain.gain.linearRampToValueAtTime(Math.max(0.0001, volume), now + fadeInSeconds)
      }
      const fadeOutStart = Math.max(totalSec - fadeOutSeconds, fadeInSeconds)
      masterGain.gain.setValueAtTime(Math.max(0.0001, volume), now + fadeOutStart)
      masterGain.gain.linearRampToValueAtTime(0.0001, now + totalSec)

      if (automationLanes.volume.length > 0) {
        const sorted = [...automationLanes.volume].sort((a, b) => a.time - b.time)
        sorted.forEach((pt) => { autoGain.gain.linearRampToValueAtTime(pt.value, now + pt.time * totalSec) })
      }
      if (automationLanes.filterCutoff.length > 0) {
        const sorted = [...automationLanes.filterCutoff].sort((a, b) => a.time - b.time)
        sorted.forEach((pt) => { filterNode.frequency.linearRampToValueAtTime(pt.value, now + pt.time * totalSec) })
      }
      if (automationLanes.beatFrequency.length > 0) {
        const sorted = [...automationLanes.beatFrequency].sort((a, b) => a.time - b.time)
        sorted.forEach((pt) => { rOsc.frequency.linearRampToValueAtTime(leftFrequency + pt.value, now + pt.time * totalSec) })
      }

      lOsc.start(now); rOsc.start(now)

      if (noiseType !== 'none') {
        const noiseSrc = createNoiseBuffer(offCtx as unknown as AudioContext, noiseType)
        const nGain = offCtx.createGain(); nGain.gain.value = noiseVolume
        noiseSrc.connect(nGain); nGain.connect(masterGain)
      }

      const renderedBuffer = await offCtx.startRendering()
      const blob = encodeWav(renderedBuffer)
      downloadBlob(blob, `binaural-session-${presetName.replace(/\s+/g, '-')}.wav`)
    } catch (err) {
      console.error('WAV export failed', err)
    }
    setIsExporting(false)
  }

  // ---------------------------------------------------------------------------
  // Journal
  // ---------------------------------------------------------------------------
  const saveJournalEntry = (notes: string): void => {
    if (!pendingJournalEntry) return
    const entry: JournalEntry = {
      id: Date.now().toString(),
      ...pendingJournalEntry,
      notes,
    }
    const list = [entry, ...journalEntries]
    setJournalEntries(list)
    writeJournal(list)
    setShowJournalModal(false)
    setPendingJournalEntry(null)
  }

  // ---------------------------------------------------------------------------
  // AI Session handler
  // ---------------------------------------------------------------------------
  const handleAiSessionReady = useCallback((config: AiMeditationConfig): void => {
    if (graphRef.current) {
      stopSession(false)
    }

    setCarrier(config.carrier)
    setBeat(config.beat)
    setNoiseType(config.noiseType)
    setNoiseVolume(config.noiseVolume)
    setPadEnabled(config.padEnabled)
    setSessionMinutes(config.sessionMinutes)
    setUseIndependentTuning(false)

    pendingAiSessionRef.current = config
    if (pendingAiObjectUrlRef.current) {
      URL.revokeObjectURL(pendingAiObjectUrlRef.current)
    }
    pendingAiObjectUrlRef.current = URL.createObjectURL(config.audioBlob)

    setTimeout(() => {
      void toggleAudio()
    }, 100)
  }, [stopSession]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------
  useEffect(() => {
    setSavedPresets(readSavedPresets())
    setJournalEntries(readJournal())
    const key = localStorage.getItem('binaural-openai-key') ?? ''
    setAiApiKey(key)
  }, [])

  useEffect(() => {
    if (useIndependentTuning) return
    setLeftFrequency(carrier)
    setRightFrequency(carrier + beat)
  }, [carrier, beat, useIndependentTuning])

  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return
    graph.leftOsc.frequency.cancelScheduledValues(graph.context.currentTime)
    graph.rightOsc.frequency.cancelScheduledValues(graph.context.currentTime)
    graph.leftOsc.frequency.setValueAtTime(leftFrequency, graph.context.currentTime)
    graph.rightOsc.frequency.setValueAtTime(rightFrequency, graph.context.currentTime)
  }, [leftFrequency, rightFrequency])

  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return
    graph.lfo.frequency.setValueAtTime(wobbleRate, graph.context.currentTime)
    graph.lfoDepth.gain.setValueAtTime(scaledLfoDepth(wobbleDepth, graph.lfoTarget), graph.context.currentTime)
  }, [wobbleRate, wobbleDepth])

  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return
    graph.lfo.type = wobbleWaveform
    graph.lfoDepth.gain.cancelScheduledValues(graph.context.currentTime)
    graph.lfoDepth.gain.setValueAtTime(scaledLfoDepth(wobbleDepth, graph.lfoTarget), graph.context.currentTime)
  }, [wobbleWaveform, wobbleDepth])

  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return
    reconnectLfo(graph, wobbleTarget, wobbleDepth)
  }, [wobbleTarget]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const bus = masterBusRef.current
    if (!bus) return
    setMasterVolume(bus, volume)
  }, [volume])

  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return
    graph.leftGain.gain.setTargetAtTime(Math.max(0.0001, binauralVolume), graph.context.currentTime, 0.05)
    graph.rightGain.gain.setTargetAtTime(Math.max(0.0001, binauralVolume), graph.context.currentTime, 0.05)
  }, [binauralVolume])

  useEffect(() => {
    const vb = voiceBusRef.current
    if (!vb) return
    setVoiceVolume_bus(vb, voiceVolume)
  }, [voiceVolume])

  useEffect(() => {
    const vb = voiceBusRef.current
    if (!vb) return
    setVoiceReverb_bus(vb, voiceReverb)
  }, [voiceReverb])

  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return
    if (graph.noiseSource) {
      try { graph.noiseSource.stop() } catch { /* ignore */ }
      graph.noiseSource.disconnect(); graph.noiseSource = null
    }
    if (noiseType !== 'none') {
      const source = createNoiseBuffer(graph.context, noiseType)
      source.connect(graph.noiseGain)
      graph.noiseSource = source
    }
    graph.noiseGain.gain.setValueAtTime(noiseType !== 'none' ? noiseVolume : 0, graph.context.currentTime)
  }, [noiseType]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const graph = graphRef.current; if (!graph) return
    graph.noiseGain.gain.setTargetAtTime(noiseType !== 'none' ? Math.max(0.0001, noiseVolume) : 0, graph.context.currentTime, 0.05)
  }, [noiseVolume, noiseType])

  useEffect(() => {
    const graph = graphRef.current; if (!graph) return
    if (filterType === 'off') {
      graph.filterNode.type = 'allpass'
    } else {
      graph.filterNode.type = filterType === 'lowpass' ? 'lowpass' : 'highpass'
    }
  }, [filterType])

  useEffect(() => {
    const graph = graphRef.current; if (!graph) return
    graph.filterNode.frequency.cancelScheduledValues(graph.context.currentTime)
    graph.filterNode.frequency.setValueAtTime(filterFrequency, graph.context.currentTime)
  }, [filterFrequency])

  useEffect(() => {
    const graph = graphRef.current; if (!graph) return
    graph.filterNode.Q.cancelScheduledValues(graph.context.currentTime)
    graph.filterNode.Q.setValueAtTime(filterQ, graph.context.currentTime)
  }, [filterQ])

  useEffect(() => {
    const graph = graphRef.current
    if (!graph || !isRunning) return
    const totalSec = sessionMinutes * 60
    scheduleAutomation(graph, automationLanes, totalSec, sessionStartTimeRef.current)
  }, [automationLanes, isRunning]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { const pad = padRef.current; if (!pad) return; updatePadVolume(pad, padVolume) }, [padVolume])
  useEffect(() => { const pad = padRef.current; if (!pad) return; updatePadReverbMix(pad, padReverbMix) }, [padReverbMix])
  useEffect(() => { const pad = padRef.current; if (!pad) return; updatePadBreatheRate(pad, padBreatheRate) }, [padBreatheRate])
  useEffect(() => { const pad = padRef.current; if (!pad) return; updatePadWaveform(pad, padWaveform) }, [padWaveform])
  useEffect(() => { const pad = padRef.current; if (!pad) return; updatePadRoot(pad, carrier) }, [carrier])

  // Live-update isochronic tone when carrier or beat changes
  useEffect(() => {
    if (!isRunning || !isoEnabled || !isoGraphRef.current || !masterBusRef.current) return
    stopIsochronicTone(isoGraphRef.current)
    isoGraphRef.current = createIsochronicTone({
      carrier, beatFrequency: beat, volume: isoVolume,
      waveform: isoWaveform, dutyCycle: isoDutyCycle, rampMs: 20,
    }, masterBusRef.current)
  }, [carrier, beat]) // eslint-disable-line react-hooks/exhaustive-deps

  // Live-update soundscape layer gains
  useEffect(() => {
    const nodes = mixerNodesRef.current
    if (!nodes) return
    SOUND_LAYERS.forEach(layer => {
      updateLayerGain(nodes, layer.id, layerGains[layer.id])
    })
  }, [layerGains])

  useEffect(() => {
    return () => {
      clearSessionTimers()
      stopAudioGraph(graphRef.current)
      graphRef.current = null
      void masterBusRef.current?.context.close()
      masterBusRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------
  const beatDifference = rightFrequency - leftFrequency
  const progressFraction = sessionTotalSeconds > 0 && remainingSeconds > 0
    ? 1 - remainingSeconds / sessionTotalSeconds : 0
  const timerDisplay = remainingSeconds > 0
    ? `${String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:${String(remainingSeconds % 60).padStart(2, '0')}`
    : '00:00'
  const wobbleDepthLabel = wobbleTarget === 'amplitude'
    ? `${Math.round((wobbleDepth / 60) * 100)}% AM depth`
    : `${wobbleDepth.toFixed(1)} cents`

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <>
      {showOnboarding && (
        <OnboardingFlow
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}
    <main className="app-shell">
      <section className="hero" style={{ position: 'relative' }}>
        <p className="eyebrow">Solfeggio + Binaural Beats</p>
        <h1>Binaural Engine</h1>
        <p className="subtitle">
          Tune any carrier frequency, shape beat difference, and add wobble modulation. Headphones recommended.
        </p>
        <button
          className="theme-toggle"
          onClick={() => setDarkMode(d => !d)}
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle dark mode"
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
      </section>

      <section className="panel">
        {/* ── Readout ── */}
        <div className="readout">
          <div><span>Left</span><strong>{leftFrequency.toFixed(2)} Hz</strong></div>
          <div><span>Right</span><strong>{rightFrequency.toFixed(2)} Hz</strong></div>
          <div><span>Beat</span><strong>{beatDifference.toFixed(2)} Hz</strong></div>
          <div><span>Timer</span><strong>{timerDisplay}</strong></div>
        </div>

        {isRunning && sessionTotalSeconds > 0 && (
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${Math.min(1, progressFraction) * 100}%` }} />
          </div>
        )}

        {/* ── Session start/stop — always visible ── */}
        <div className="session-start-row">
          <button className="start-button" onClick={() => void toggleAudio()}>
            {isRunning ? 'Stop Session (Fade Out)' : 'Start Session'}
          </button>
        </div>

        {/* ── Tab navigation ── */}
        <TabNav tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

        <div className="tab-content">
          {/* ──────────────── DASHBOARD TAB ──────────────── */}
          {activeTab === 'dashboard' && (
            <div className="dashboard">
              {/* Hero state card */}
              <div className={`dash-state-card ${graphRef.current ? 'dash-state-card--active' : ''}`}>
                <div className="dash-state-icon">{graphRef.current ? '🎧' : '🧘'}</div>
                <div className="dash-state-label">{graphRef.current ? 'Session Active' : 'Ready to Begin'}</div>
                <div className="dash-state-sub">
                  {graphRef.current
                    ? `${carrier.toFixed(1)} Hz carrier · ${beat.toFixed(2)} Hz beat`
                    : 'Configure your session and press Start'}
                </div>
              </div>

              {/* Quick-start scene cards */}
              <div className="section-label" style={{ marginTop: '1rem' }}>Quick Start</div>
              <div className="dash-quick-grid">
                {[
                  { emoji: '😴', label: 'Deep Sleep',    carrier: 174, beat: 2.0,  scene: 'ocean'  },
                  { emoji: '🎯', label: 'Focus',          carrier: 396, beat: 14.0, scene: 'forest' },
                  { emoji: '🧘', label: 'Meditation',     carrier: 528, beat: 6.0,  scene: 'cave'   },
                  { emoji: '💡', label: 'Creative Flow',  carrier: 741, beat: 10.0, scene: 'storm'  },
                  { emoji: '✨', label: 'Lucid Dream',    carrier: 936, beat: 4.0,  scene: 'space'  },
                  { emoji: '🌅', label: 'Morning Rise',   carrier: 396, beat: 18.0, scene: 'forest' },
                ].map(({ emoji, label, carrier: c, beat: b, scene: s }) => (
                  <button key={label} className="dash-quick-card" onClick={() => {
                    setCarrier(c); setBeat(b)
                    const scn = SOUNDSCAPE_SCENES.find(sc => sc.id === s)
                    if (scn) {
                      const gains = { ...DEFAULT_GAINS }
                      Object.entries(scn.gains).forEach(([k, v]) => { (gains as Record<string, number>)[k] = v as number })
                      setLayerGains(gains); setSoundsceneId(s)
                    }
                    setActiveTab('tones')
                  }}>
                    <span className="dash-quick-emoji">{emoji}</span>
                    <span className="dash-quick-label">{label}</span>
                    <span className="dash-quick-meta">{c} Hz · {b} Hz beat</span>
                  </button>
                ))}
              </div>

              {/* Current settings summary */}
              <div className="section-label" style={{ marginTop: '1.25rem' }}>Current Setup</div>
              <div className="dash-summary">
                <div className="dash-summary-row"><span>Carrier</span><strong>{carrier.toFixed(1)} Hz</strong></div>
                <div className="dash-summary-row"><span>Beat</span><strong>{beat.toFixed(2)} Hz</strong></div>
                <div className="dash-summary-row"><span>Brainwave</span><strong>
                  {beat < 4 ? 'Delta (deep sleep)' : beat < 8 ? 'Theta (meditation)' : beat < 14 ? 'Alpha (relax)' : beat < 30 ? 'Beta (focus)' : 'Gamma (peak)'}
                </strong></div>
                <div className="dash-summary-row"><span>Soundscape</span><strong>{soundsceneId === 'off' ? 'None' : SOUNDSCAPE_SCENES.find(s => s.id === soundsceneId)?.label ?? 'Custom'}</strong></div>
                <div className="dash-summary-row"><span>Pad Synth</span><strong>{padEnabled ? 'On' : 'Off'}</strong></div>
                <div className="dash-summary-row"><span>Session</span><strong>{sessionMinutes} min</strong></div>
              </div>

              {/* Recent journal entries preview */}
              {journalEntries.length > 0 && (<>
                <div className="section-label" style={{ marginTop: '1.25rem' }}>Recent Sessions</div>
                <div className="dash-recent">
                  {journalEntries.slice(0, 3).map(entry => (
                    <div key={entry.id} className="dash-recent-row">
                      <span className="dash-recent-date">{new Date(entry.startedAt).toLocaleDateString()}</span>
                      <span className="dash-recent-note">{entry.notes?.slice(0, 60) || `${entry.carrier?.toFixed(0)} Hz · ${entry.beat?.toFixed(1)} Hz beat`}</span>
                    </div>
                  ))}
                </div>
              </>)}

              {/* Nav hints */}
              <div className="dash-nav-hints">
                <button className="dash-hint-btn" onClick={() => setActiveTab('tones')}>🎵 Tones</button>
                <button className="dash-hint-btn" onClick={() => setActiveTab('sound')}>🌊 Sound</button>
                <button className="dash-hint-btn" onClick={() => setActiveTab('ai')}>🧘 Meditate</button>
              </div>
            </div>
          )}

          {/* ──────────────── TONES TAB ──────────────── */}
          {activeTab === 'tones' && (
            <div className="grid">
              {/* Solfeggio quick-select */}
              <div className="preset-freq-section">
                <div className="preset-freq-label">Solfeggio Frequencies</div>
                <div className="solfeggio-grid">
                  {SOLFEGGIO.map((s) => (
                    <button key={s.hz} type="button" className="freq-preset-btn"
                      onClick={() => {
                        if (useIndependentTuning) { setLeftFrequency(s.hz) }
                        else { setCarrier(s.hz) }
                      }}>
                      <span className="freq-preset-hz">{s.hz}</span>
                      <span className="freq-preset-label">{s.label}</span>
                    </button>
                  ))}
                </div>
                <div className="preset-freq-label" style={{ marginTop: '0.6rem' }}>Brainwave Presets</div>
                <div className="brainwave-grid">
                  {BRAINWAVE_PRESETS.map((b) => (
                    <button key={b.name} type="button" className="beat-preset-btn"
                      onClick={() => setBeat(b.hz)}>
                      <span className="beat-preset-name">{b.name}</span>
                      <span className="beat-preset-hz">{b.hz} Hz</span>
                      <span className="beat-preset-label">{b.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Frequency */}
              <div className="section-label">Frequency</div>
              <label className="toggle-row">
                <input type="checkbox" checked={useIndependentTuning} onChange={(e) => setUseIndependentTuning(e.target.checked)} />
                Independent Left / Right Tuning
              </label>
              {!useIndependentTuning && (<>
                <label>Carrier Frequency ({carrier.toFixed(1)} Hz)
                  <input type="range" min={40} max={1200} step={0.1} value={carrier} onChange={(e) => setCarrier(Number(e.target.value))} />
                </label>
                <label>Beat Difference ({beat.toFixed(2)} Hz)
                  <input type="range" min={0} max={40} step={0.01} value={beat} onChange={(e) => setBeat(Number(e.target.value))} />
                </label>
              </>)}
              {useIndependentTuning && (<>
                <label>Left Frequency ({leftFrequency.toFixed(2)} Hz)
                  <input type="range" min={40} max={1200} step={0.01} value={leftFrequency} onChange={(e) => setLeftFrequency(Number(e.target.value))} />
                </label>
                <label>Right Frequency ({rightFrequency.toFixed(2)} Hz)
                  <input type="range" min={40} max={1200} step={0.01} value={rightFrequency} onChange={(e) => setRightFrequency(Number(e.target.value))} />
                </label>
              </>)}
              <label>Phase Offset ({phaseOffset}°)
                <small className="control-hint">Applied at session start — restart to hear change</small>
                <input type="range" min={0} max={360} step={1} value={phaseOffset} onChange={(e) => setPhaseOffset(Number(e.target.value))} />
              </label>

              {/* Filter */}
              <div className="section-label">Filter</div>
              <label>Filter Type
                <div className="seg-control">
                  {(['off', 'lowpass', 'highpass'] as FilterType[]).map((ft) => (
                    <button key={ft} type="button" className={filterType === ft ? 'active' : ''} onClick={() => setFilterType(ft)}>
                      {ft === 'off' ? 'Off' : ft === 'lowpass' ? 'Lowpass' : 'Highpass'}
                    </button>
                  ))}
                </div>
              </label>
              {filterType !== 'off' && (<>
                <label>Filter Frequency ({filterFrequency.toFixed(0)} Hz)
                  <input type="range" min={20} max={20000} step={1} value={filterFrequency}
                    onChange={(e) => setFilterFrequency(Number(e.target.value))} />
                </label>
                <label>Resonance / Q ({filterQ.toFixed(1)})
                  <input type="range" min={0.1} max={20} step={0.1} value={filterQ}
                    onChange={(e) => setFilterQ(Number(e.target.value))} />
                </label>
              </>)}

              {/* Isochronic Tones */}
              <div className="section-label">Isochronic Tones</div>
              <div className="iso-section">
                <label className="checkbox-label">
                  <input type="checkbox" checked={isoEnabled} onChange={e => setIsoEnabled(e.target.checked)} />
                  Enable isochronic tones (works without headphones)
                </label>
                {isoEnabled && (
                  <>
                    <label>Volume
                      <input type="range" min={0} max={1} step={0.01} value={isoVolume}
                        onChange={e => setIsoVolume(Number(e.target.value))} />
                    </label>
                    <label>Waveform
                      <div className="seg-control">
                        {(['sine', 'triangle', 'square', 'sawtooth'] as OscillatorType[]).map(w => (
                          <button key={w} type="button" className={isoWaveform === w ? 'seg-btn seg-btn--active' : 'seg-btn'}
                            onClick={() => setIsoWaveform(w)}>{w}</button>
                        ))}
                      </div>
                    </label>
                    <label>Duty Cycle <span className="value-badge">{Math.round(isoDutyCycle * 100)}%</span>
                      <input type="range" min={0.1} max={0.9} step={0.05} value={isoDutyCycle}
                        onChange={e => setIsoDutyCycle(Number(e.target.value))} />
                      <span style={{fontSize:'0.75rem',color:'#6e8f7d'}}>Lower = sharper pulse. 50% = equal on/off.</span>
                    </label>
                  </>
                )}
              </div>

              {/* Wobble / LFO */}
              <div className="section-label">Wobble / LFO</div>              <label>LFO Waveform
                <div className="seg-control">
                  {(['sine', 'triangle', 'square', 'sawtooth'] as LfoWaveform[]).map((w) => (
                    <button key={w} type="button" className={wobbleWaveform === w ? 'active' : ''} onClick={() => setWobbleWaveform(w)}>
                      {w.charAt(0).toUpperCase() + w.slice(1)}
                    </button>
                  ))}
                </div>
              </label>
              <label>LFO Target
                <div className="seg-control">
                  {([['detune', 'Carrier Detune'], ['amplitude', 'Amplitude (AM)'], ['beat', 'Beat Freq']] as [LfoTarget, string][]).map(([val, lbl]) => (
                    <button key={val} type="button" className={wobbleTarget === val ? 'active' : ''} onClick={() => setWobbleTarget(val)}>{lbl}</button>
                  ))}
                </div>
              </label>
              <label>Wobble Rate ({wobbleRate.toFixed(2)} Hz)
                <input type="range" min={0} max={12} step={0.01} value={wobbleRate} onChange={(e) => setWobbleRate(Number(e.target.value))} />
              </label>
              <label>Wobble Depth ({wobbleDepthLabel})
                <input type="range" min={0} max={60} step={0.1} value={wobbleDepth} onChange={(e) => setWobbleDepth(Number(e.target.value))} />
              </label>
            </div>
          )}

          {/* ──────────────── SOUND TAB ──────────────── */}
          {activeTab === 'sound' && (
            <div className="grid">
              {/* Pad Synth */}
              <div className="section-label">Pad Synth Underlay</div>
              <label className="toggle-row">
                <input type="checkbox" checked={padEnabled} onChange={(e) => setPadEnabled(e.target.checked)} />
                Enable Pad Synth
              </label>
              {padEnabled && (<>
                <label>Pad Volume ({Math.round(padVolume * 100)}%)
                  <input type="range" min={0} max={1} step={0.01} value={padVolume} onChange={(e) => setPadVolume(Number(e.target.value))} />
                </label>
                <label>Pad Reverb Mix ({Math.round(padReverbMix * 100)}%)
                  <input type="range" min={0} max={1} step={0.01} value={padReverbMix} onChange={(e) => setPadReverbMix(Number(e.target.value))} />
                </label>
                <label>Pad Waveform
                  <div className="seg-control">
                    {(['sine', 'triangle'] as PadWaveform[]).map((w) => (
                      <button key={w} type="button" className={padWaveform === w ? 'active' : ''} onClick={() => setPadWaveform(w)}>
                        {w.charAt(0).toUpperCase() + w.slice(1)}
                      </button>
                    ))}
                  </div>
                </label>
                <label>Breathe Rate ({padBreatheRate.toFixed(2)} Hz)
                  <input type="range" min={0.05} max={0.5} step={0.01} value={padBreatheRate} onChange={(e) => setPadBreatheRate(Number(e.target.value))} />
                </label>
              </>)}

              {/* Noise / Soundscape */}
              <div className="section-label">Soundscape</div>
              <SoundscapeMixer
                gains={layerGains}
                activeSceneId={soundsceneId}
                onChange={(gains) => {
                  setLayerGains(gains)
                  const matchedScene = SOUNDSCAPE_SCENES.find(scene =>
                    scene.id !== 'custom' && scene.id !== 'off' &&
                    SOUND_LAYERS.every(l => Math.abs((scene.gains[l.id] ?? 0) - gains[l.id]) < 0.01)
                  )
                  setSoundsceneId(matchedScene?.id ?? 'custom')
                }}
                onSceneChange={(sceneId) => setSoundsceneId(sceneId)}
                disabled={false}
              />
            </div>
          )}

          {/* ──────────────── SESSION TAB ──────────────── */}
          {activeTab === 'session' && (
            <div className="grid">
              <div className="section-label">Session</div>
              <label>Session Length ({sessionMinutes.toFixed(0)} min)
                <input type="range" min={1} max={180} step={1} value={sessionMinutes} onChange={(e) => setSessionMinutes(Number(e.target.value))} />
              </label>
              <label>Fade In ({fadeInSeconds.toFixed(0)} sec)
                <input type="range" min={0} max={60} step={1} value={fadeInSeconds} onChange={(e) => setFadeInSeconds(Number(e.target.value))} />
              </label>
              <label>Fade Out ({fadeOutSeconds.toFixed(0)} sec)
                <input type="range" min={0} max={60} step={1} value={fadeOutSeconds} onChange={(e) => setFadeOutSeconds(Number(e.target.value))} />
              </label>

              {/* Export WAV */}
              <button className="soft-button export-button" onClick={() => void exportWav()}
                disabled={isRunning || isExporting} style={{ width: '100%' }}>
                {isExporting ? '⏳ Rendering…' : '⬇ Export WAV'}
              </button>

              {/* Automation */}
              <div className="section-label">Automation Lanes</div>
              <AutomationEditor
                lanes={automationLanes}
                onChange={setAutomationLanes}
                sessionMinutes={sessionMinutes}
              />

              {/* Presets */}
              <div className="preset-panel">
                <div className="section-label" style={{ borderTop: 'none', paddingTop: 0 }}>Presets</div>
                <label>Preset Name
                  <input className="text-input" type="text" value={presetName} onChange={(e) => setPresetName(e.target.value)} />
                </label>
                <div className="preset-actions">
                  <button type="button" className="soft-button" onClick={savePreset}>Save Preset</button>
                </div>
                <label>Load Preset
                  <select className="text-input" value={selectedPresetName} onChange={(e) => setSelectedPresetName(e.target.value)}>
                    <option value="">Select a preset</option>
                    {savedPresets.map((p) => (<option key={p.name} value={p.name}>{p.name}</option>))}
                  </select>
                </label>
                <div className="preset-actions">
                  <button type="button" className="soft-button" onClick={loadSelectedPreset}>Load Selected</button>
                  <button type="button" className="soft-button soft-button--danger" onClick={deleteSelectedPreset} disabled={!selectedPresetName}>Delete</button>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────── JOURNEY TAB ──────────────── */}
          {activeTab === 'journey' && (
            <JourneyBuilder
              isRunning={isRunning}
              journey={journey}
              setJourney={setJourney}
              activeStageIndex={activeStageIndex}
              setCarrier={setCarrier}
              setBeat={setBeat}
              setWobbleRate={setWobbleRate}
              setSoundsceneId={setSoundsceneId}
              apiKey={localStorage.getItem('binaural-openai-key') ?? ''}
            />
          )}

          {/* ──────────────── PLAYER TAB ──────────────── */}
          {activeTab === 'player' && (
            <PlayerTab
              isRunning={isRunning}
              carrier={carrier}
              beat={beat}
              remainingSeconds={remainingSeconds}
              sessionTotalSeconds={sessionTotalSeconds}
              soundsceneId={soundsceneId}
              volume={volume}
              setVolume={setVolume}
              binauralVolume={binauralVolume}
              setBinauralVolume={setBinauralVolume}
              noiseVolume={noiseVolume}
              setNoiseVolume={setNoiseVolume}
              voiceVolume={voiceVolume}
              setVoiceVolume={setVoiceVolume}
              voiceReverb={voiceReverb}
              setVoiceReverb={setVoiceReverb}
              analyserNode={masterBusRef.current?.analyser ?? null}
              voiceObjectUrl={pendingAiObjectUrlRef.current}
              onToggle={() => void toggleAudio()}
              setCarrier={setCarrier}
              setBeat={setBeat}
              setWobbleRate={setWobbleRate}
            />
          )}

          {/* ──────────────── VISUAL TAB ──────────────── */}
          {activeTab === 'visual' && (
            <VisualTab
              carrier={carrier}
              beat={beat}
              isRunning={isRunning}
              analyser={masterBusRef.current?.analyser ?? null}
            />
          )}

          {/* ──────────────── AI TAB ──────────────── */}
          {activeTab === 'ai' && (            <AiMeditationPanel
              onSessionReady={handleAiSessionReady}
              apiKey={aiApiKey}
              onOpenSettings={() => setShowApiSettings(true)}
            />
          )}

          {/* ──────────────── JOURNAL TAB ──────────────── */}
          {activeTab === 'journal' && (
            <div className="ai-tab-content">
              <p className="ai-tab-desc">Review your past sessions and reflections.</p>
              <button className="soft-button" style={{ width: '100%' }} onClick={() => setShowJournalList(true)}>
                📓 Open Session Journal
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Journal List ── */}
      {showJournalList && (
        <SessionJournal entries={journalEntries} onClose={() => setShowJournalList(false)} />
      )}

      {/* ── Journal Modal ── */}
      {showJournalModal && pendingJournalEntry && (
        <JournalModal
          entry={pendingJournalEntry}
          onSave={saveJournalEntry}
          onCancel={() => { setShowJournalModal(false); setPendingJournalEntry(null) }}
        />
      )}

      {/* ── API Key Settings ── */}
      {showApiSettings && (
        <ApiKeySettings
          onClose={() => setShowApiSettings(false)}
          onSaved={(key) => setAiApiKey(key)}
          currentKey={aiApiKey}
        />
      )}

      <p className="footnote">
        Safety: keep volume low at session start. Use headphones for full binaural effect. Avoid therapeutic claims.
      </p>
    </main>
    </>
  )
}

// ---------------------------------------------------------------------------
// Journal Modal
// ---------------------------------------------------------------------------
function JournalModal({
  entry,
  onSave,
  onCancel,
}: {
  entry: Omit<JournalEntry, 'id' | 'notes'>
  onSave: (notes: string) => void
  onCancel: () => void
}) {
  const [notes, setNotes] = useState('')
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h2 className="modal-title">Session Complete 🎧</h2>
        <p className="modal-meta">{entry.presetName} · {entry.durationMinutes} min · {entry.date}</p>
        <label style={{ fontWeight: 600, color: '#244336' }}>
          How did that feel?
          <textarea
            className="journal-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Describe your experience…"
          />
        </label>
        <div className="modal-actions">
          <button className="soft-button" onClick={() => onSave(notes)}>Save Entry</button>
          <button className="soft-button soft-button--danger" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

export default App
