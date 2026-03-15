import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { SubscriptionProvider, useSubscription } from './contexts/SubscriptionContext'
import { UpgradeModal } from './components/UpgradeModal'
import { AuthModal } from './components/AuthModal'
import { SettingsPanel } from './components/SettingsPanel'
import { Toast } from './components/Toast'
import { InstallPrompt } from './components/InstallPrompt'
import { useToast } from './hooks/useToast'
import { useWakeLock } from './hooks/useWakeLock'
import { useAudioVisibility } from './hooks/useAudioVisibility'
import type {
  NoiseType, LfoWaveform, LfoTarget, FilterType, PadWaveform,
  AudioGraph, AutomationLanes, SessionPreset, JournalEntry, PadSynthGraph,
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
import type { LayerGains, SoundscapeMixerNodes, SoundLayerId } from './engine/soundscapeMixer'
import { DEFAULT_GAINS, SOUND_LAYERS, SOUNDSCAPE_SCENES, createSoundscapeMixer, stopSoundscapeMixer, updateLayerGain } from './engine/soundscapeMixer'
import { SessionJournal } from './components/SessionJournal'
import { useJournal } from './hooks/useJournal'
import { AiMeditationPanel } from './components/AiMeditationPanel'
import type { AiMeditationConfig } from './components/AiMeditationPanel'
import { ApiKeySettings } from './components/ApiKeySettings'
import { createMasterBus, setMasterVolume } from './engine/masterBus'
import type { MasterBus } from './engine/masterBus'
import { VuMeter } from './components/VuMeter'
import { createIsochronicTone, stopIsochronicTone } from './engine/isochronic'
import type { IsochronicGraph } from './engine/isochronic'
import { VisualTab } from './components/VisualTab'
import { MiniPlayer } from './components/MiniPlayer'
import { BUILT_IN_JOURNEYS } from './components/JourneyBuilder'
import { OnboardingFlow } from './components/OnboardingFlow'
import type { OnboardingConfig } from './components/OnboardingFlow'
import { OnboardingModal } from './components/OnboardingModal'
import type { Journey, ActiveJourney } from './engine/journeyEngine'
import { startJourney, stopJourney } from './engine/journeyEngine'
import type { AmbientPlayer } from './engine/ambientPlayer'
import { createAmbientPlayer, setAmbientNoiseType, setAmbientNoiseVolume, setAmbientMasterVolume, setAmbientLayerGain, stopAmbientPlayer } from './engine/ambientPlayer'
import { MusicTab } from './components/MusicTab'
import { EducationTab } from './components/EducationTab'
import { StudioTab } from './components/StudioTab'
import { PadSynth } from './components/PadSynth'
import type { StudioLayer } from './types'
import type { MusicPlayer, MusicTrack, MusicEQBands } from './engine/musicPlayer'
import { MUSIC_TRACKS, createMusicPlayer, playTrack, stopMusicPlayer, setMusicVolume as setMusicPlayerVolume, setMusicEQ as setMusicEQ_engine, getMusicPosition, seekMusicTo, DEFAULT_EQ } from './engine/musicPlayer'
import { BreathGuide } from './components/BreathGuide'
import { FrequencyVerifier } from './components/FrequencyVerifier'
import { SessionLibrary } from './components/SessionLibrary'
import type { SessionCard } from './data/sessionLibrary'

const PRESET_STORAGE_KEY = 'binaural-presets-v1'

const TABS = [
  { id: 'dashboard', icon: '🏠', label: 'Home'      },
  { id: 'education', icon: '📖', label: 'Learn'     },
  { id: 'tones',     icon: '🎵', label: 'Tones'     },
  { id: 'sound',     icon: '🌊', label: 'Sound'     },
  { id: 'pad',       icon: '🎹', label: 'Pad'       },
  { id: 'music',     icon: '🎵', label: 'Music'     },
  { id: 'studio',    icon: '🎛', label: 'Studio'    },
  { id: 'focus',     icon: '👁', label: 'Focus'     },
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

// ---------------------------------------------------------------------------
// Custom soundscape presets
// ---------------------------------------------------------------------------
const CUSTOM_SOUNDSCAPE_KEY = 'liminal-custom-soundscapes'
type CustomSoundscapePreset = { name: string; gains: Partial<Record<string, number>> }
function readCustomSoundscapes(): CustomSoundscapePreset[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_SOUNDSCAPE_KEY) ?? '[]') } catch { return [] }
}
function writeCustomSoundscapes(list: CustomSoundscapePreset[]): void {
  localStorage.setItem(CUSTOM_SOUNDSCAPE_KEY, JSON.stringify(list))
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

/**
 * Returns true when the session audio path is currently playing a soundscape.
 */
function isSessionSoundscapeActive(isRunning: boolean, soundsceneId: string): boolean {
  return isRunning && soundsceneId !== 'off'
}

// Studio layer → audio params bridge
// ---------------------------------------------------------------------------
function applyStudioLayers(layers: StudioLayer[], callbacks: {
  setCarrier: (v: number) => void
  setBeat: (v: number) => void
  setWobbleRate: (v: number) => void
  setNoiseType: (v: NoiseType) => void
  setNoiseVolume: (v: number) => void
  setBinauralVolume: (v: number) => void
  setSoundscapeVolume: (v: number) => void
  setPadEnabled: (v: boolean) => void
  setPadVolume: (v: number) => void
  setPadWaveform: (v: PadWaveform) => void
  setPadReverbMix: (v: number) => void
  setPadBreatheRate: (v: number) => void
  setLeftFrequency: (v: number) => void
  setRightFrequency: (v: number) => void
  setMusicVolume: (v: number) => void
  playMusicTrack: (trackId: string) => void
  pendingMusicTrackIdRef: React.MutableRefObject<string | null> | null
  applySoundscapeScene: (id: string) => void
  setSoundsceneId: (id: string) => void
  setLayerGains: (g: LayerGains) => void
  carrierRef: React.MutableRefObject<number>
  beatRef: React.MutableRefObject<number>
  noiseTypeRef: React.MutableRefObject<NoiseType>
  noiseVolumeRef: React.MutableRefObject<number>
  padEnabledRef: React.MutableRefObject<boolean>
  padVolumeRef: React.MutableRefObject<number>
  leftFrequencyRef: React.MutableRefObject<number>
  rightFrequencyRef: React.MutableRefObject<number>
  layerGainsRef: React.MutableRefObject<LayerGains>
  fadeInSecondsRef: React.MutableRefObject<number>
  wobbleRateRef: React.MutableRefObject<number>
  binauralVolumeRef: React.MutableRefObject<number>
  soundscapeVolumeRef: React.MutableRefObject<number>
  // Direct graph access for bypassing React state staleness
  graphRef: React.MutableRefObject<AudioGraph | null>
  masterBusRef: React.MutableRefObject<MasterBus | null>
  mixerNodesRef: React.MutableRefObject<SoundscapeMixerNodes | null>
  SOUNDSCAPE_SCENES: typeof SOUNDSCAPE_SCENES
  DEFAULT_GAINS: typeof DEFAULT_GAINS
  setAutomationLanes: React.Dispatch<React.SetStateAction<AutomationLanes>>
}) {
  let padPresent = false
  let hasSoundscape = false

  for (const layer of layers) {
    const s = layer.settings

    if (layer.type === 'carrier') {
      const hz = (s.hz as number) ?? 432
      callbacks.setCarrier(hz)
      callbacks.carrierRef.current = hz
      callbacks.setBinauralVolume(layer.volume)
      callbacks.binauralVolumeRef.current = layer.volume
      // Direct graph update — bypasses React state batching
      const graph = callbacks.graphRef.current
      if (graph) {
        graph.leftGain.gain.setTargetAtTime(Math.max(0.0001, layer.volume), graph.context.currentTime, 0.05)
        graph.rightGain.gain.setTargetAtTime(Math.max(0.0001, layer.volume), graph.context.currentTime, 0.05)
      }
    }
    if (layer.type === 'beat') {
      const hz = (s.hz as number) ?? 6
      const wr = (s.wobbleRate as number) ?? 0.4
      if (layer.enabled) {
        callbacks.setBeat(hz)
        callbacks.beatRef.current = hz
        callbacks.setWobbleRate(wr)
        callbacks.wobbleRateRef.current = wr
        // Direct graph update
        const graph = callbacks.graphRef.current
        if (graph) {
          const leftHz = callbacks.leftFrequencyRef.current
          graph.leftOsc.frequency.cancelScheduledValues(graph.context.currentTime)
          graph.rightOsc.frequency.cancelScheduledValues(graph.context.currentTime)
          graph.leftOsc.frequency.setValueAtTime(leftHz, graph.context.currentTime)
          graph.rightOsc.frequency.setValueAtTime(leftHz + hz, graph.context.currentTime)
          graph.lfo.frequency.setValueAtTime(wr, graph.context.currentTime)
        }
      }
      // Apply beat frequency automation lane if present
      if (layer.automation?.beatFrequency && layer.automation.beatFrequency.length >= 2) {
        const pts = layer.automation.beatFrequency
        callbacks.setAutomationLanes(prev => ({ ...prev, beatFrequency: pts }))
      }
    }
    if (layer.type === 'noise') {
      const t = ((s.type as string) ?? 'pink') as NoiseType
      const v = layer.enabled ? layer.volume : 0
      const resolvedType = layer.enabled ? t : 'none'
      callbacks.setNoiseType(resolvedType)
      callbacks.noiseTypeRef.current = resolvedType
      callbacks.setNoiseVolume(v)
      callbacks.noiseVolumeRef.current = v
      // Direct graph update
      const graph = callbacks.graphRef.current
      if (graph) {
        graph.noiseGain.gain.setTargetAtTime(layer.enabled ? Math.max(0.0001, v) : 0, graph.context.currentTime, 0.05)
      }
    }
    if (layer.type === 'soundscape' && layer.enabled) {
      hasSoundscape = true
      const sceneId = (s.sceneId as string) ?? 'forest'
      const layerGains = (s.layerGains as Record<string, number> | undefined)

      // Build gains: prefer explicit layerGains from settings, fall back to scene definition
      const gains = { ...DEFAULT_GAINS }
      if (layerGains && Object.keys(layerGains).length > 0) {
        Object.entries(layerGains).forEach(([id, v]) => { (gains as Record<string, number>)[id] = v })
      } else {
        const scene = callbacks.SOUNDSCAPE_SCENES.find(sc => sc.id === sceneId)
        if (scene) {
          Object.entries(scene.gains).forEach(([id, v]) => { (gains as Record<string, number>)[id] = v as number })
        }
      }

      callbacks.setLayerGains(gains)
      callbacks.layerGainsRef.current = gains
      callbacks.setSoundsceneId(sceneId)
      callbacks.setSoundscapeVolume(layer.volume)
      callbacks.soundscapeVolumeRef.current = layer.volume

      // Direct mixer update — update each layer gain immediately
      const mixer = callbacks.mixerNodesRef.current
      const bus = callbacks.masterBusRef.current
      if (mixer) {
        Object.entries(gains).forEach(([id, v]) => {
          updateLayerGain(mixer, id as SoundLayerId, v)
        })
      }
      if (bus) {
        bus.soundscapeBus.gain.setTargetAtTime(Math.max(0.0001, layer.volume), bus.context.currentTime, 0.05)
      }
    }
    if (layer.type === 'pad') {
      padPresent = true
      callbacks.setPadEnabled(layer.enabled)
      callbacks.padEnabledRef.current = layer.enabled
      callbacks.setPadVolume(layer.volume)
      callbacks.padVolumeRef.current = layer.volume
      if (s.waveform) callbacks.setPadWaveform(s.waveform as PadWaveform)
      if (s.reverbMix !== undefined) callbacks.setPadReverbMix(s.reverbMix as number)
      if (s.breatheRate !== undefined) callbacks.setPadBreatheRate(s.breatheRate as number)
    }
    if (layer.type === 'music') {
      callbacks.setMusicVolume(layer.volume)
      if (layer.enabled) {
        const trackId = (layer.settings.trackId as string | undefined) ?? ''
        if (trackId) {
          if (callbacks.pendingMusicTrackIdRef) {
            // Pre-start: queue for after toggleAudio creates the bus
            callbacks.pendingMusicTrackIdRef.current = trackId
          } else {
            // Already running: start immediately
            callbacks.playMusicTrack(trackId)
          }
        }
      }
    }
  }

  // No soundscape layer → silence it
  if (!hasSoundscape) {
    callbacks.setSoundsceneId('off')
    callbacks.setSoundscapeVolume(0)
    callbacks.soundscapeVolumeRef.current = 0
    const bus = callbacks.masterBusRef.current
    if (bus) {
      bus.soundscapeBus.gain.setTargetAtTime(0, bus.context.currentTime, 0.05)
    }
    // Zero out all layer gains
    const mixer = callbacks.mixerNodesRef.current
    if (mixer) {
      Object.keys(DEFAULT_GAINS).forEach(id => updateLayerGain(mixer, id as SoundLayerId, 0))
    }
  }
  if (!padPresent) {
    callbacks.setPadEnabled(false)
    callbacks.padEnabledRef.current = false
  }

  // Sync left/right freq from carrier + beat
  const c = callbacks.carrierRef.current
  const b = callbacks.beatRef.current
  callbacks.setLeftFrequency(c)
  callbacks.setRightFrequency(c + b)
  callbacks.leftFrequencyRef.current = c
  callbacks.rightFrequencyRef.current = c + b
  // Direct graph update for carrier Hz
  const graph = callbacks.graphRef.current
  if (graph) {
    graph.leftOsc.frequency.cancelScheduledValues(graph.context.currentTime)
    graph.rightOsc.frequency.cancelScheduledValues(graph.context.currentTime)
    graph.leftOsc.frequency.setValueAtTime(c, graph.context.currentTime)
    graph.rightOsc.frequency.setValueAtTime(c + b, graph.context.currentTime)
  }
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
function AppInner() {
  // Tab navigation
  const [activeTab, setActiveTab] = useState('dashboard')
  const [playerExpanded, setPlayerExpanded] = useState(false)

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

  // Soundscape volume (controls soundscapeBus master gain)
  const [soundscapeVolume, setSoundscapeVolume] = useState(0.15)

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
  const [customSoundscapes, setCustomSoundscapes] = useState<CustomSoundscapePreset[]>(() => readCustomSoundscapes())
  const [soundscapePresetName, setSoundscapePresetName] = useState('')
  const [selectedPresetName, setSelectedPresetName] = useState('')

  // Visual resonance
  // Session state
  const [isRunning, setIsRunning] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [sessionTotalSeconds, setSessionTotalSeconds] = useState(0)

  // Journal
  const { entries: journalEntries, addEntry: journalAddEntry, updateEntry: journalUpdateEntry, deleteEntry: journalDeleteEntry } = useJournal()
  const [showJournalModal, setShowJournalModal] = useState(false)
  const [showJournalList, setShowJournalList] = useState(false)
  const [pendingJournalEntry, setPendingJournalEntry] = useState<Omit<JournalEntry, 'id' | 'notes' | 'mood' | 'tags' | 'completedAt'> | null>(null)

  // WAV export
  const [isExporting, setIsExporting] = useState(false)

  // AI Meditation
  const [aiApiKey, setAiApiKey] = useState<string>('')
  const [showApiSettings, setShowApiSettings] = useState(false)

  // Auth / Subscription
  const { user, isPro, signOut, pollUntilPro } = useAuth()
  const { openUpgradeModal } = useSubscription()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showSettingsPanel, setShowSettingsPanel] = useState(false)
  const [proToast, setProToast] = useState(false)

  // Toast notifications
  const { toasts, addToast, removeToast } = useToast()

  // Handle upgrade=success / cancelled URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('upgrade') === 'success') {
      void pollUntilPro().then(() => {
        setProToast(true)
        setTimeout(() => setProToast(false), 3000)
      })
      params.delete('upgrade')
      window.history.replaceState({}, '', window.location.pathname + (params.toString() ? '?' + params.toString() : ''))
    } else if (params.get('upgrade') === 'cancelled') {
      params.delete('upgrade')
      window.history.replaceState({}, '', window.location.pathname + (params.toString() ? '?' + params.toString() : ''))
    }
  }, [pollUntilPro])

  const masterBusRef = useRef<MasterBus | null>(null)
  const graphRef = useRef<AudioGraph | null>(null)
  const padRef = useRef<PadSynthGraph | null>(null)

  // Background playback: Wake Lock + Page Visibility for AudioContext
  const { request: requestWakeLock, release: releaseWakeLock } = useWakeLock()
  // Note: AudioContext is created inside masterBusRef per-session, not exposed as a stable ref.
  // useAudioVisibility is wired to masterBusRef's context via a stable proxy ref below.
  const masterBusContextRef = useRef<AudioContext | null>(null)
  useAudioVisibility(masterBusContextRef)
  const padStandaloneCtxRef = useRef<AudioContext | null>(null)
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
  const [_activeStageIndex, setActiveStageIndex] = useState(-1)
  const activeJourneyRef = useRef<ActiveJourney | null>(null)

  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('binaural-onboarded')
  })

  // Welcome modal (first-run)
  const [showWelcome, setShowWelcome] = useState(() =>
    localStorage.getItem('liminal-onboarding-done') !== 'true'
  )

  // Ambient mode
  const [ambientRunning, setAmbientRunning] = useState(false)
  const ambientPlayerRef = useRef<AmbientPlayer | null>(null)

  // Music player
  const [musicTrackId, setMusicTrackId] = useState<string | null>(null)
  const [musicPlaying, setMusicPlaying] = useState(false)
  const [musicVolume, setMusicVolume] = useState(0.7)
  const [musicShuffle, setMusicShuffle] = useState(false)
  const [musicEQ, setMusicEQ] = useState<MusicEQBands>(DEFAULT_EQ)
  const [musicPosition, setMusicPosition] = useState(0)
  const musicPlayerRef = useRef<MusicPlayer | null>(null)
  const musicCtxRef = useRef<AudioContext | null>(null)
  const musicPositionTimerRef = useRef<number | null>(null)

  // Stable refs for use in closures
  const sessionMinutesRef = useRef(sessionMinutes)
  const presetNameRef = useRef(presetName)
  useEffect(() => { sessionMinutesRef.current = sessionMinutes }, [sessionMinutes])
  useEffect(() => { presetNameRef.current = presetName }, [presetName])

  // Live refs so toggleAudio always reads fresh state even when called from
  // a stale closure (e.g. after SessionPlanner applies a plan and sets state)
  const noiseTypeRef = useRef(noiseType)
  const noiseVolumeRef = useRef(noiseVolume)
  const leftFrequencyRef = useRef(leftFrequency)
  const rightFrequencyRef = useRef(rightFrequency)
  const wobbleRateRef = useRef(wobbleRate)
  const wobbleDepthRef = useRef(wobbleDepth)
  const wobbleWaveformRef = useRef(wobbleWaveform)
  const wobbleTargetRef = useRef(wobbleTarget)
  const phaseOffsetRef = useRef(phaseOffset)
  const volumeRef = useRef(volume)
  const binauralVolumeRef = useRef(binauralVolume)
  const soundscapeVolumeRef = useRef(soundscapeVolume)
  const layerGainsRef = useRef(layerGains)
  const filterTypeRef = useRef(filterType)
  const filterFrequencyRef = useRef(filterFrequency)
  const filterQRef = useRef(filterQ)
  const padEnabledRef = useRef(padEnabled)
  const padVolumeRef = useRef(padVolume)
  const padReverbMixRef = useRef(padReverbMix)
  const padWaveformRef = useRef(padWaveform)
  const padBreatheRateRef = useRef(padBreatheRate)
  const carrierRef = useRef(carrier)
  const beatRef = useRef(beat)
  const isoEnabledRef = useRef(isoEnabled)
  const isoVolumeRef = useRef(isoVolume)
  const isoWaveformRef = useRef(isoWaveform)
  const isoDutyCycleRef = useRef(isoDutyCycle)
  const automationLanesRef = useRef(automationLanes)
  const journeyRef = useRef(journey)
  const voiceVolumeRef = useRef(voiceVolume)
  const fadeInSecondsRef = useRef(fadeInSeconds)

  useEffect(() => { noiseTypeRef.current = noiseType }, [noiseType])
  useEffect(() => { noiseVolumeRef.current = noiseVolume }, [noiseVolume])
  useEffect(() => { leftFrequencyRef.current = leftFrequency }, [leftFrequency])
  useEffect(() => { rightFrequencyRef.current = rightFrequency }, [rightFrequency])
  useEffect(() => { wobbleRateRef.current = wobbleRate }, [wobbleRate])
  useEffect(() => { wobbleDepthRef.current = wobbleDepth }, [wobbleDepth])
  useEffect(() => { wobbleWaveformRef.current = wobbleWaveform }, [wobbleWaveform])
  useEffect(() => { wobbleTargetRef.current = wobbleTarget }, [wobbleTarget])
  useEffect(() => { phaseOffsetRef.current = phaseOffset }, [phaseOffset])
  useEffect(() => { volumeRef.current = volume }, [volume])
  useEffect(() => { binauralVolumeRef.current = binauralVolume }, [binauralVolume])
  useEffect(() => { soundscapeVolumeRef.current = soundscapeVolume }, [soundscapeVolume])
  useEffect(() => { layerGainsRef.current = layerGains }, [layerGains])
  useEffect(() => { filterTypeRef.current = filterType }, [filterType])
  useEffect(() => { filterFrequencyRef.current = filterFrequency }, [filterFrequency])
  useEffect(() => { filterQRef.current = filterQ }, [filterQ])
  useEffect(() => { padEnabledRef.current = padEnabled }, [padEnabled])
  useEffect(() => { padVolumeRef.current = padVolume }, [padVolume])
  useEffect(() => { padReverbMixRef.current = padReverbMix }, [padReverbMix])
  useEffect(() => { padWaveformRef.current = padWaveform }, [padWaveform])
  useEffect(() => { padBreatheRateRef.current = padBreatheRate }, [padBreatheRate])
  useEffect(() => { carrierRef.current = carrier }, [carrier])
  useEffect(() => { beatRef.current = beat }, [beat])
  useEffect(() => { isoEnabledRef.current = isoEnabled }, [isoEnabled])
  useEffect(() => { isoVolumeRef.current = isoVolume }, [isoVolume])
  useEffect(() => { isoWaveformRef.current = isoWaveform }, [isoWaveform])
  useEffect(() => { isoDutyCycleRef.current = isoDutyCycle }, [isoDutyCycle])
  useEffect(() => { automationLanesRef.current = automationLanes }, [automationLanes])
  useEffect(() => { journeyRef.current = journey }, [journey])
  useEffect(() => { voiceVolumeRef.current = voiceVolume }, [voiceVolume])
  useEffect(() => { fadeInSecondsRef.current = fadeInSeconds }, [fadeInSeconds])

  // ---------------------------------------------------------------------------
  // Music player helpers
  // ---------------------------------------------------------------------------
  const playMusicTrack = useCallback(async (track: MusicTrack): Promise<void> => {
    // Determine AudioContext and destination
    let ctx: AudioContext
    let dest: AudioNode

    if (masterBusRef.current) {
      ctx = masterBusRef.current.context
      dest = masterBusRef.current.musicBus
    } else {
      // Use or create standalone context
      if (!musicCtxRef.current || musicCtxRef.current.state === 'closed') {
        musicCtxRef.current = new AudioContext()
      }
      ctx = musicCtxRef.current
      dest = ctx.destination
    }

    if (ctx.state === 'suspended') await ctx.resume()

    // Create or reuse player
    if (!musicPlayerRef.current || musicPlayerRef.current.context !== ctx) {
      musicPlayerRef.current = await createMusicPlayer(dest, ctx, musicVolume)
    }

    const player = musicPlayerRef.current

    const handleEnded = () => {
      setMusicPlaying(false)
      setMusicTrackId(null)
      // Auto-advance to next track
      nextTrackRef.current?.()
    }

    await playTrack(player, track, import.meta.env.BASE_URL, handleEnded)
    setMusicTrackId(track.id)
    setMusicPlaying(true)
    // Start position tracker
    if (musicPositionTimerRef.current !== null) window.clearInterval(musicPositionTimerRef.current)
    musicPositionTimerRef.current = window.setInterval(() => {
      if (musicPlayerRef.current) {
        setMusicPosition(getMusicPosition(musicPlayerRef.current))
      }
    }, 250)
  }, [musicVolume]) // eslint-disable-line react-hooks/exhaustive-deps

  const stopMusic = useCallback((): void => {
    if (musicPlayerRef.current) {
      stopMusicPlayer(musicPlayerRef.current)
    }
    if (musicPositionTimerRef.current !== null) {
      window.clearInterval(musicPositionTimerRef.current)
      musicPositionTimerRef.current = null
    }
    setMusicPlaying(false)
    setMusicTrackId(null)
    setMusicPosition(0)
  }, [])

  const nextTrackRef = useRef<(() => void) | null>(null)

  const nextTrack = useCallback((): void => {
    if (MUSIC_TRACKS.length === 0) return
    let nextIndex: number
    if (musicShuffle) {
      nextIndex = Math.floor(Math.random() * MUSIC_TRACKS.length)
    } else {
      const currentIndex = MUSIC_TRACKS.findIndex(t => t.id === musicTrackId)
      nextIndex = (currentIndex + 1) % MUSIC_TRACKS.length
    }
    void playMusicTrack(MUSIC_TRACKS[nextIndex])
  }, [musicTrackId, musicShuffle, playMusicTrack])

  const prevTrack = useCallback((): void => {
    if (MUSIC_TRACKS.length === 0) return
    const currentIndex = MUSIC_TRACKS.findIndex(t => t.id === musicTrackId)
    const prevIndex = (currentIndex - 1 + MUSIC_TRACKS.length) % MUSIC_TRACKS.length
    void playMusicTrack(MUSIC_TRACKS[prevIndex])
  }, [musicTrackId, playMusicTrack])

  // Keep ref up to date for use in onEnded closure
  useEffect(() => {
    nextTrackRef.current = nextTrack
  }, [nextTrack])

  // Live-update music volume
  useEffect(() => {
    if (musicPlayerRef.current) {
      setMusicPlayerVolume(musicPlayerRef.current, musicVolume)
    }
  }, [musicVolume])

  // Live-update music EQ
  useEffect(() => {
    if (musicPlayerRef.current) setMusicEQ_engine(musicPlayerRef.current, musicEQ)
  }, [musicEQ])

  const handleMusicSeek = async (seconds: number): Promise<void> => {
    const player = musicPlayerRef.current
    const track = MUSIC_TRACKS.find(t => t.id === musicTrackId)
    if (!player || !track) return
    await seekMusicTo(player, track, seconds, import.meta.env.BASE_URL, () => nextTrackRef.current?.())
    setMusicPosition(seconds)
    // Restart interval after seek
    if (musicPositionTimerRef.current !== null) window.clearInterval(musicPositionTimerRef.current)
    musicPositionTimerRef.current = window.setInterval(() => {
      if (musicPlayerRef.current) setMusicPosition(getMusicPosition(musicPlayerRef.current))
    }, 250)
  }

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
    setActiveTab('dashboard')
  }, [])

  const handleOnboardingSkip = useCallback(() => {
    localStorage.setItem('binaural-onboarded', '1')
    setShowOnboarding(false)
  }, [])

  // ---------------------------------------------------------------------------
  // Timer helpers
  // ---------------------------------------------------------------------------
  // iOS AudioContext unlock — Safari requires a user gesture before any audio
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const unlock = () => {
      const ctx = new AudioContext()
      ctx.resume().then(() => ctx.close()).catch(() => {})
      document.removeEventListener('touchstart', unlock)
      document.removeEventListener('touchend', unlock)
    }
    document.addEventListener('touchstart', unlock, { once: true, passive: true })
    document.addEventListener('touchend', unlock, { once: true, passive: true })
    return () => {
      document.removeEventListener('touchstart', unlock)
      document.removeEventListener('touchend', unlock)
    }
  }, [])

  // ---------------------------------------------------------------------------
  const clearSessionTimers = (): void => {
    if (fadeStopTimeoutRef.current !== null) { window.clearTimeout(fadeStopTimeoutRef.current); fadeStopTimeoutRef.current = null }
    if (countdownIntervalRef.current !== null) { window.clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null }
    if (sessionEndTimeoutRef.current !== null) { window.clearTimeout(sessionEndTimeoutRef.current); sessionEndTimeoutRef.current = null }
  }

  const stopSession = useCallback((useFade: boolean, withChime = false, natural = false): void => {
    const graph = graphRef.current
    audioStartingRef.current = false
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

    // Fade pad out (session pad only — standalone pad keeps running)
    if (padRef.current && masterBusRef.current) {
      void stopPadSynth(padRef.current, Math.max(1, fadeOut))
      padRef.current = null
      // If pad is enabled, restart it in standalone mode after session ends
      if (padEnabled) {
        setTimeout(() => {
          if (!padRef.current && !masterBusRef.current) {
            const standalone = new AudioContext()
            padStandaloneCtxRef.current = standalone
            const pad = createPadSynth(standalone, carrier, padVolume, padReverbMix, padWaveform, padBreatheRate, standalone.destination)
            padRef.current = pad
          }
        }, Math.max(1, fadeOut) * 1000 + 200)
      }
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
      // Stop music player
      if (musicPlayerRef.current) {
        stopMusicPlayer(musicPlayerRef.current)
        musicPlayerRef.current = null
      }
      if (musicPositionTimerRef.current !== null) {
        window.clearInterval(musicPositionTimerRef.current)
        musicPositionTimerRef.current = null
      }
      setMusicPlaying(false)
      setMusicTrackId(null)
      setMusicPosition(0)
      setIsRunning(false)
      // Release wake lock and clear AudioContext proxy ref
      masterBusContextRef.current = null
      void releaseWakeLock()
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
  const audioStartingRef = useRef(false)
  // Track to start after toggleAudio creates the masterBus (Studio music layer)
  const pendingMusicTrackIdRef = useRef<string | null>(null)
  // Pre-warmed AudioContext created synchronously inside a user gesture so
  // the browser allows it to play. toggleAudio consumes it if present.
  const prewarmedContextRef = useRef<AudioContext | null>(null)

  const toggleAudio = async (): Promise<void> => {
    if (graphRef.current) { stopSession(true); return }
    if (audioStartingRef.current) return
    audioStartingRef.current = true
    clearSessionTimers()

    // Stop ambient if running
    if (ambientPlayerRef.current) {
      stopAmbientPlayer(ambientPlayerRef.current)
      ambientPlayerRef.current = null
      setAmbientRunning(false)
    }

    try {

    // Read all audio params from refs so we always get the latest state,
    // even when called from a stale closure (e.g. after SessionPlanner sets state)
    const aiConfig = pendingAiSessionRef.current
    const activeNoiseType = aiConfig ? aiConfig.noiseType : noiseTypeRef.current
    const activeNoiseVolume = aiConfig ? aiConfig.noiseVolume : noiseVolumeRef.current
    const curVolume = volumeRef.current
    const curSoundscapeVolume = soundscapeVolumeRef.current
    const curFadeInSeconds = fadeInSecondsRef.current

    // 1. Create master bus — reuse pre-warmed context if available (created
    //    synchronously inside the user gesture to satisfy browser autoplay policy)
    const prewarmed = prewarmedContextRef.current
    prewarmedContextRef.current = null
    const bus = createMasterBus(curVolume, prewarmed ?? undefined)
    bus.soundscapeBus.gain.value = Math.max(0.0001, curSoundscapeVolume)
    masterBusRef.current = bus

    if (bus.context.state !== 'running') await bus.context.resume()

    // 2. Create audio graph (binaural), share context, connect to binauralBus
    const graph = createAudioGraph({
      leftFrequency: leftFrequencyRef.current, rightFrequency: rightFrequencyRef.current,
      wobbleRate: wobbleRateRef.current, wobbleDepth: wobbleDepthRef.current,
      wobbleWaveform: wobbleWaveformRef.current, wobbleTarget: wobbleTargetRef.current,
      phaseOffset: phaseOffsetRef.current, volume: curVolume, binauralVolume: binauralVolumeRef.current,
      noiseType: activeNoiseType, noiseVolume: activeNoiseVolume,
      filterType: filterTypeRef.current, filterFrequency: filterFrequencyRef.current, filterQ: filterQRef.current,
    }, bus.context, bus.binauralBus)

    const now = bus.context.currentTime
    sessionStartTimeRef.current = now
    const safeVolume = Math.max(0.0001, curVolume)
    if (curFadeInSeconds > 0) {
      bus.masterGain.gain.setValueAtTime(0.0001, now)
      bus.masterGain.gain.linearRampToValueAtTime(safeVolume, now + curFadeInSeconds)
    } else {
      bus.masterGain.gain.setValueAtTime(safeVolume, now)
    }

    graphRef.current = graph

    // If a journey is loaded, start it
    if (journeyRef.current && graphRef.current) {
      const activeJourney = startJourney(
        journeyRef.current,
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
    const mixerNodes = createSoundscapeMixer(bus.context, bus.soundscapeBus, layerGainsRef.current)
    mixerNodesRef.current = mixerNodes

    if (padEnabledRef.current) {
      // Stop standalone pad if running — session takes over
      if (padRef.current) {
        void stopPadSynth(padRef.current, 0.1)
        padRef.current = null
      }
      if (padStandaloneCtxRef.current) {
        void padStandaloneCtxRef.current.close()
        padStandaloneCtxRef.current = null
      }
      const pad = createPadSynth(bus.context, carrierRef.current, padVolumeRef.current, padReverbMixRef.current, padWaveformRef.current, padBreatheRateRef.current, bus.masterGain)
      padRef.current = pad
    }

    // 4. Voice bus created when AI session starts, connects to bus.voiceBus
    if (pendingAiSessionRef.current) {
      const pendingConfig = pendingAiSessionRef.current
      pendingAiSessionRef.current = null
      createVoiceBus(bus.context, pendingConfig.audioBlob, bus.voiceBus, voiceVolumeRef.current).then((vb) => {
        voiceBusRef.current = vb
      }).catch((err) => {
        console.error('Voice bus failed:', err)
      })
    }

    setIsRunning(true)
    audioStartingRef.current = false

    // Background playback: keep screen on and update AudioContext proxy ref
    masterBusContextRef.current = bus.context
    void requestWakeLock()

    // Media Session API — system-level now-playing notification
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: presetNameRef.current || 'Liminal Session',
        artist: 'Liminal',
        album: 'Binaural Beats',
      })
      navigator.mediaSession.setActionHandler('pause', () => { stopSession(true) })
      navigator.mediaSession.setActionHandler('play', () => { void toggleAudio() })
      navigator.mediaSession.setActionHandler('stop', () => { stopSession(true) })
    }

    // Start music if Studio queued a track
    if (pendingMusicTrackIdRef.current) {
      const tid = pendingMusicTrackIdRef.current
      pendingMusicTrackIdRef.current = null
      const track = MUSIC_TRACKS.find(t => t.id === tid)
      if (track) void playMusicTrack(track)
    }
    if (isoEnabledRef.current) {
      // Mute the binaural graph's own output — isochronic replaces it
      graph.masterGain.gain.setValueAtTime(0, bus.context.currentTime)
      isoGraphRef.current = createIsochronicTone({
        carrier: carrierRef.current,
        beatFrequency: beatRef.current,
        volume: isoVolumeRef.current,
        waveform: isoWaveformRef.current,
        dutyCycle: isoDutyCycleRef.current,
        rampMs: 20,
      }, bus)
    }
    startSessionTimers(graph, automationLanesRef.current)
    } catch (err) {
      console.error('Audio failed to start', err)
      addToast('Audio failed to start. Check your browser permissions.', 'error')
      audioStartingRef.current = false
    }
  }

  // ---------------------------------------------------------------------------
  // Toggle ambient playback
  // ---------------------------------------------------------------------------
  const toggleAmbient = async (): Promise<void> => {
    if (ambientRunning) {
      if (ambientPlayerRef.current) {
        stopAmbientPlayer(ambientPlayerRef.current)
        ambientPlayerRef.current = null
      }
      setAmbientRunning(false)
      return
    }
    // Stop session if running
    if (graphRef.current) {
      stopSession(true)
    }
    const player = createAmbientPlayer(soundscapeVolume, noiseType, noiseVolume, layerGains)
    if (player.context.state !== 'running') await player.context.resume()
    ambientPlayerRef.current = player
    setAmbientRunning(true)
  }

  /**
   * Applies a named soundscape scene by copying its layer gain map.
   */
  const applySoundscapeScene = useCallback((sceneId: string): void => {
    const scene = SOUNDSCAPE_SCENES.find((s) => s.id === sceneId)
    if (!scene) return
    const gains = { ...DEFAULT_GAINS }
    Object.entries(scene.gains).forEach(([id, value]) => {
      (gains as Record<string, number>)[id] = value as number
    })
    setLayerGains(gains)
    setSoundsceneId(sceneId)
  }, [])

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
      addToast('Export failed. Please try again.', 'error')
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
      mood: null,
      tags: [],
      completedAt: Date.now(),
    }
    journalAddEntry(entry)
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
    const bus = masterBusRef.current
    if (!bus) return
    bus.soundscapeBus.gain.setTargetAtTime(Math.max(0.0001, soundscapeVolume), bus.context.currentTime, 0.05)
  }, [soundscapeVolume])

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

  // Toggle pad synth mid-session (or standalone)
  useEffect(() => {
    if (padEnabled) {
      if (!padRef.current) {
        // Use session context if available, otherwise create standalone
        let ctx: AudioContext
        let destination: AudioNode
        if (masterBusRef.current) {
          ctx = masterBusRef.current.context
          destination = masterBusRef.current.masterGain
        } else {
          const standalone = new AudioContext()
          padStandaloneCtxRef.current = standalone
          ctx = standalone
          destination = standalone.destination
        }
        if (ctx.state === 'suspended') void ctx.resume()
        const pad = createPadSynth(ctx, carrier, padVolume, padReverbMix, padWaveform, padBreatheRate, destination)
        padRef.current = pad
      }
    } else {
      if (padRef.current) {
        void stopPadSynth(padRef.current, 1.5).then(() => {
          // Close standalone context if we created one
          if (padStandaloneCtxRef.current) {
            void padStandaloneCtxRef.current.close()
            padStandaloneCtxRef.current = null
          }
        })
        padRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [padEnabled])

  // When carrier/beat changes (e.g. from Mood EQ), sync to left/right frequencies if not using independent tuning
  useEffect(() => {
    if (useIndependentTuning) return
    setLeftFrequency(carrier)
    setRightFrequency(carrier + beat)
  }, [carrier, beat, useIndependentTuning])

  // Live-update isochronic tone when carrier or beat changes
  useEffect(() => {
    if (!isRunning || !isoEnabled || !isoGraphRef.current || !masterBusRef.current) return
    stopIsochronicTone(isoGraphRef.current)
    isoGraphRef.current = createIsochronicTone({
      carrier, beatFrequency: beat, volume: isoVolume,
      waveform: isoWaveform, dutyCycle: isoDutyCycle, rampMs: 20,
    }, masterBusRef.current)
  }, [carrier, beat]) // eslint-disable-line react-hooks/exhaustive-deps

  // Live-update isochronic tone when its own params change
  useEffect(() => {
    const bus = masterBusRef.current
    const graph = graphRef.current
    if (!isRunning || !bus || !graph) return
    const now = bus.context.currentTime
    if (!isoEnabled) {
      // Disable: stop isochronic, restore binaural graph output
      if (isoGraphRef.current) {
        stopIsochronicTone(isoGraphRef.current)
        isoGraphRef.current = null
      }
      graph.masterGain.gain.cancelScheduledValues(now)
      graph.masterGain.gain.setValueAtTime(graph.masterGain.gain.value, now)
      graph.masterGain.gain.linearRampToValueAtTime(1, now + 0.1)
      return
    }
    // Enable or param change: mute binaural graph output, start/restart isochronic
    graph.masterGain.gain.cancelScheduledValues(now)
    graph.masterGain.gain.setValueAtTime(graph.masterGain.gain.value, now)
    graph.masterGain.gain.linearRampToValueAtTime(0, now + 0.1)
    if (isoGraphRef.current) stopIsochronicTone(isoGraphRef.current)
    isoGraphRef.current = createIsochronicTone({
      carrier, beatFrequency: beat, volume: isoVolume,
      waveform: isoWaveform, dutyCycle: isoDutyCycle, rampMs: 20,
    }, bus)
  }, [isoEnabled, isoVolume, isoWaveform, isoDutyCycle]) // eslint-disable-line react-hooks/exhaustive-deps

  // Live-update soundscape layer gains
  useEffect(() => {
    const nodes = mixerNodesRef.current
    if (!nodes) return
    SOUND_LAYERS.forEach(layer => {
      updateLayerGain(nodes, layer.id, layerGains[layer.id])
    })
  }, [layerGains])

  // Ambient live-updates
  useEffect(() => {
    const player = ambientPlayerRef.current
    if (!player || !ambientRunning) return
    setAmbientNoiseType(player, noiseType, noiseVolume)
  }, [noiseType]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const player = ambientPlayerRef.current
    if (!player || !ambientRunning) return
    setAmbientNoiseVolume(player, noiseVolume)
  }, [noiseVolume, ambientRunning])

  useEffect(() => {
    const player = ambientPlayerRef.current
    if (!player || !ambientRunning) return
    SOUND_LAYERS.forEach(layer => {
      setAmbientLayerGain(player, layer.id, layerGains[layer.id])
    })
  }, [layerGains, ambientRunning])

  useEffect(() => {
    const player = ambientPlayerRef.current
    if (!player || !ambientRunning) return
    setAmbientMasterVolume(player, soundscapeVolume)
  }, [soundscapeVolume, ambientRunning])

  useEffect(() => {
    return () => {
      clearSessionTimers()
      stopAudioGraph(graphRef.current)
      graphRef.current = null
      void masterBusRef.current?.context.close()
      masterBusRef.current = null
      if (ambientPlayerRef.current) {
        stopAmbientPlayer(ambientPlayerRef.current)
        ambientPlayerRef.current = null
      }
      if (musicPositionTimerRef.current !== null) {
        window.clearInterval(musicPositionTimerRef.current)
        musicPositionTimerRef.current = null
      }
      if (musicPlayerRef.current) {
        stopMusicPlayer(musicPlayerRef.current, 0)
        musicPlayerRef.current = null
      }
      if (musicCtxRef.current) {
        void musicCtxRef.current.close()
        musicCtxRef.current = null
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------
  const progressFraction = sessionTotalSeconds > 0 && remainingSeconds > 0
    ? 1 - remainingSeconds / sessionTotalSeconds : 0
  const wobbleDepthLabel = wobbleTarget === 'amplitude'
    ? `${Math.round((wobbleDepth / 60) * 100)}% AM depth`
    : `${wobbleDepth.toFixed(1)} cents`
  const sessionSoundscapeActive = isSessionSoundscapeActive(isRunning, soundsceneId)
  const ambientButtonActive = ambientRunning || sessionSoundscapeActive
  const ambientButtonDisabled = isRunning && !ambientRunning
  const ambientButtonLabel = ambientRunning
    ? 'Stop Ambient'
    : sessionSoundscapeActive
      ? 'Use Soundscape Mixer Below'
      : 'Play Ambient'

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
      {showWelcome && <OnboardingModal onDone={() => setShowWelcome(false)} />}
    <main className="app-shell">
      <section className="hero">
        <div className="hero-main">
          <p className="eyebrow">Binaural Beats · Brainwave Journeys · Soundscapes</p>
          <h1>Liminal</h1>
          <p className="subtitle">
            Shift your mental state. Choose a goal, tune your frequencies, and drift into focus, calm, or sleep.
          </p>
        </div>
        <div className="hero-controls">
          <button
            className="theme-toggle"
            onClick={() => setDarkMode(d => !d)}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle dark mode"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
          {user ? (
            <div className="user-menu-wrap">
              <button className="user-btn" onClick={() => setShowUserMenu(m => !m)}>
                <span className="user-btn-avatar">{(user.email ?? 'U')[0].toUpperCase()}</span>
                {isPro && <span className="pro-badge">PRO</span>}
              </button>
              {showUserMenu && (
                <>
                  <div className="user-menu-overlay" onClick={() => setShowUserMenu(false)} />
                  <div className="user-dropdown">
                    <button className="user-dropdown-item" onClick={() => { setShowUserMenu(false); setShowSettingsPanel(true) }}>
                      ⚙️ Settings
                    </button>
                    <button className="user-dropdown-item user-dropdown-item--danger" onClick={() => { setShowUserMenu(false); void signOut() }}>
                      ↩ Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button className="user-btn" onClick={() => setShowAuthModal(true)}>
              Sign In
            </button>
          )}
        </div>
      </section>

      <section className="panel">
        {isRunning && sessionTotalSeconds > 0 && (
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${Math.min(1, progressFraction) * 100}%` }} />
          </div>
        )}

        {/* ── Tab navigation ── */}
        {/* PRO_TABS: tabs that require Pro subscription */}
        {(() => {
          const PRO_TABS = new Set(['studio', 'pad', 'focus', 'ai', 'journal', 'music'])
          return (
            <nav className="tab-nav" aria-label="Main navigation">
              {TABS.map((tab) => {
                const isLocked = PRO_TABS.has(tab.id) && !isPro
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={`tab-btn${activeTab === tab.id ? ' tab-btn--active' : ''}${isLocked ? ' tab-btn--locked' : ''}`}
                    onClick={() => {
                      if (isLocked) { openUpgradeModal(tab.label); return }
                      setActiveTab(tab.id)
                    }}
                    aria-current={activeTab === tab.id ? 'page' : undefined}
                  >
                    <span className="tab-icon">{tab.icon}</span>
                    <span>{tab.label}</span>
                    {isLocked && <span className="tab-lock-icon">🔒</span>}
                  </button>
                )
              })}
            </nav>
          )
        })()}

        <div className="tab-content">
          {/* ──────────────── DASHBOARD TAB ──────────────── */}
          {activeTab === 'dashboard' && (
            <div className="dashboard">
              {/* Hero state card */}
              <div className={`dash-state-card ${isRunning ? 'dash-state-card--active' : ''}`}>
                <div className="dash-state-icon">{isRunning ? '🎧' : '🧘'}</div>
                <div className="dash-state-label">{isRunning ? 'Session Active' : 'Ready to Begin'}</div>
                <div className="dash-state-sub">
                  {isRunning
                    ? `${carrier.toFixed(1)} Hz carrier · ${beat.toFixed(2)} Hz beat`
                    : 'Configure your session and press Start'}
                </div>
              </div>

              {/* Now Playing — only when running */}
              {isRunning && (
                <div className="dash-now-playing">
                  <div className="dash-now-row"><span>Carrier</span><strong>{carrier.toFixed(1)} Hz</strong></div>
                  <div className="dash-now-row"><span>Beat</span><strong>{beat.toFixed(2)} Hz</strong></div>
                  <div className="dash-now-row"><span>Brainwave</span><strong>
                    {beat < 4 ? 'Delta — deep sleep' : beat < 8 ? 'Theta — meditation' : beat < 14 ? 'Alpha — relax' : beat < 30 ? 'Beta — focus' : 'Gamma — peak'}
                  </strong></div>
                  <div className="dash-now-row"><span>Soundscape</span><strong>
                    {soundsceneId === 'off' ? 'None' : SOUNDSCAPE_SCENES.find(s => s.id === soundsceneId)?.label ?? 'Custom'}
                  </strong></div>
                  {sessionMinutes > 0 && (
                    <div className="dash-now-row"><span>Session</span><strong>{sessionMinutes} min</strong></div>
                  )}
                </div>
              )}

              {/* Quick-start scene cards */}
              <div className="section-label" style={{ marginTop: '1rem' }}>Quick Start</div>
              <div className="dash-quick-grid">
                {([
                  {
                    emoji: '🌌', label: 'Cosmic Drift', sub: 'Space · delta · ambient pad',
                    layers: [
                      { id: 'qs-c', type: 'carrier' as const, enabled: true, volume: 0.65, label: 'Carrier', settings: { hz: 936 } },
                      { id: 'qs-b', type: 'beat' as const, enabled: true, volume: 0.65, label: 'Beat', settings: { hz: 3 } },
                      { id: 'qs-s', type: 'soundscape' as const, enabled: true, volume: 0.4, label: 'Space', settings: { sceneId: 'space' } },
                      { id: 'qs-p', type: 'pad' as const, enabled: true, volume: 0.3, label: 'Pad', settings: { waveform: 'sine', reverbMix: 0.85, breatheRate: 8 } },
                    ],
                  },
                  {
                    emoji: '⚡', label: 'Thunder Focus', sub: 'Storm · beta · brown noise',
                    layers: [
                      { id: 'qs-c', type: 'carrier' as const, enabled: true, volume: 0.7, label: 'Carrier', settings: { hz: 396 } },
                      { id: 'qs-b', type: 'beat' as const, enabled: true, volume: 0.7, label: 'Beat', settings: { hz: 14 } },
                      { id: 'qs-s', type: 'soundscape' as const, enabled: true, volume: 0.45, label: 'Storm', settings: { sceneId: 'storm' } },
                      { id: 'qs-n', type: 'noise' as const, enabled: true, volume: 0.18, label: 'Brown', settings: { type: 'brown' } },
                    ],
                  },
                  {
                    emoji: '🏔️', label: 'Cave Theta', sub: '4 layers · theta · full stack',
                    layers: [
                      { id: 'qs-c', type: 'carrier' as const, enabled: true, volume: 0.65, label: 'Carrier', settings: { hz: 528 } },
                      { id: 'qs-b', type: 'beat' as const, enabled: true, volume: 0.65, label: 'Beat', settings: { hz: 6 } },
                      { id: 'qs-s', type: 'soundscape' as const, enabled: true, volume: 0.3, label: 'Cave', settings: { sceneId: 'cave' } },
                      { id: 'qs-n', type: 'noise' as const, enabled: true, volume: 0.08, label: 'Pink', settings: { type: 'pink' } },
                      { id: 'qs-p', type: 'pad' as const, enabled: true, volume: 0.25, label: 'Pad', settings: { waveform: 'triangle', reverbMix: 0.7, breatheRate: 6 } },
                    ],
                  },
                  {
                    emoji: '🌊', label: 'Ocean Deep', sub: 'Delta · ocean · brown noise',
                    layers: [
                      { id: 'qs-c', type: 'carrier' as const, enabled: true, volume: 0.7, label: 'Carrier', settings: { hz: 174 } },
                      { id: 'qs-b', type: 'beat' as const, enabled: true, volume: 0.7, label: 'Beat', settings: { hz: 2 } },
                      { id: 'qs-s', type: 'soundscape' as const, enabled: true, volume: 0.5, label: 'Ocean', settings: { sceneId: 'ocean' } },
                      { id: 'qs-n', type: 'noise' as const, enabled: true, volume: 0.12, label: 'Brown', settings: { type: 'brown' } },
                    ],
                  },
                  {
                    emoji: '🌿', label: 'Forest Alpha', sub: 'Alpha · forest · pad synth',
                    layers: [
                      { id: 'qs-c', type: 'carrier' as const, enabled: true, volume: 0.65, label: 'Carrier', settings: { hz: 639 } },
                      { id: 'qs-b', type: 'beat' as const, enabled: true, volume: 0.65, label: 'Beat', settings: { hz: 10 } },
                      { id: 'qs-s', type: 'soundscape' as const, enabled: true, volume: 0.35, label: 'Forest', settings: { sceneId: 'forest' } },
                      { id: 'qs-p', type: 'pad' as const, enabled: true, volume: 0.22, label: 'Pad', settings: { waveform: 'triangle', reverbMix: 0.6, breatheRate: 10 } },
                    ],
                  },
                  {
                    emoji: '🎵', label: 'Void Drone', sub: 'Pad only · no nature · pure tone',
                    layers: [
                      { id: 'qs-c', type: 'carrier' as const, enabled: true, volume: 0.6, label: 'Carrier', settings: { hz: 432 } },
                      { id: 'qs-b', type: 'beat' as const, enabled: true, volume: 0.6, label: 'Beat', settings: { hz: 7 } },
                      { id: 'qs-n', type: 'noise' as const, enabled: true, volume: 0.1, label: 'Brown', settings: { type: 'brown' } },
                      { id: 'qs-p', type: 'pad' as const, enabled: true, volume: 0.4, label: 'Pad', settings: { waveform: 'sine', reverbMix: 0.9, breatheRate: 4 } },
                    ],
                  },
                ] as { emoji: string; label: string; sub: string; layers: StudioLayer[] }[]).map(({ emoji, label, sub, layers }) => (
                  <button key={label} className="dash-quick-card" onClick={() => {
                    applyStudioLayers(layers, {
                      setCarrier, setBeat, setWobbleRate,
                      setNoiseType, setNoiseVolume,
                      setBinauralVolume, setSoundscapeVolume,
                      setPadEnabled, setPadVolume, setPadWaveform, setPadReverbMix, setPadBreatheRate,
                      setLeftFrequency, setRightFrequency,
                      setMusicVolume,
                      playMusicTrack: (id) => { const t = MUSIC_TRACKS.find(tr => tr.id === id); if (t) void playMusicTrack(t) },
                      pendingMusicTrackIdRef,
                      applySoundscapeScene, setSoundsceneId, setLayerGains,
                      carrierRef, beatRef, noiseTypeRef, noiseVolumeRef,
                      padEnabledRef, padVolumeRef,
                      leftFrequencyRef, rightFrequencyRef,
                      layerGainsRef, fadeInSecondsRef, wobbleRateRef,
                      binauralVolumeRef, soundscapeVolumeRef,
                      graphRef, masterBusRef, mixerNodesRef,
                      SOUNDSCAPE_SCENES, DEFAULT_GAINS,
                      setAutomationLanes,
                    })
                    setActiveTab('studio')
                  }}>
                    <span className="dash-quick-emoji">{emoji}</span>
                    <span className="dash-quick-label">{label}</span>
                    <span className="dash-quick-meta">{sub}</span>
                  </button>
                ))}
              </div>
              {/* Explore — feature spotlight */}
              <div className="section-label" style={{ marginTop: '1.25rem' }}>Explore</div>
              <div className="dash-explore-row">
                {([
                  { icon: '🎹', title: 'Pad Synth',  sub: 'Design atmospheric textures',         tab: 'pad'       },
                  { icon: '🎙', title: 'Verify Hz',   sub: 'Is your audio really that frequency?', tab: 'focus'     },
                  { icon: '🗺', title: 'Studio',      sub: 'Build multi-layer journeys',           tab: 'studio'    },
                  { icon: '🧘', title: 'Meditate',    sub: 'AI-generated guided sessions',         tab: 'ai'        },
                  { icon: '📖', title: 'Learn',       sub: 'Science behind the sounds',            tab: 'education' },
                  { icon: '💨', title: 'Breathe',     sub: 'Guided breath work',                   tab: 'focus'     },
                ] as { icon: string; title: string; sub: string; tab: string }[]).map(({ icon, title, sub, tab }) => (
                  <button key={title} className="dash-explore-card" onClick={() => setActiveTab(tab as Parameters<typeof setActiveTab>[0])}>
                    <span className="dash-explore-icon">{icon}</span>
                    <span className="dash-explore-title">{title}</span>
                    <span className="dash-explore-sub">{sub}</span>
                  </button>
                ))}
              </div>

              {/* Recent journal entries preview */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '1.25rem' }}>
                <div className="section-label" style={{ marginTop: 0 }}>Recent Sessions</div>
                <button className="dash-recent-viewall" onClick={() => setActiveTab('journal')}>View All →</button>
              </div>
              <div className="dash-recent">
                {journalEntries.length === 0 ? (
                  <div className="dash-recent-row" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No sessions logged yet — your history will appear here.
                  </div>
                ) : (
                  journalEntries.slice(0, 3).map(entry => (
                    <div key={entry.id} className="dash-recent-row">
                      <span className="dash-recent-date">{new Date(entry.date).toLocaleDateString()}</span>
                      <span className="dash-recent-note">{entry.notes?.slice(0, 60) || entry.presetName}</span>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

          {/* ──────────────── TONES TAB ──────────────── */}
          {activeTab === 'tones' && (
            <div className="tab-sections">
              {/* Session Library */}
              <div className="section-block">
                <div className="section-title">Quick Start</div>
                <SessionLibrary
                  isPro={isPro}
                  onLoad={(card: SessionCard) => {
                    setCarrier(card.carrier)
                    setBeat(card.beat)
                    setNoiseType(card.noiseType)
                    setNoiseVolume(card.noiseVolume)
                    setPadEnabled(card.padEnabled)
                    setSessionMinutes(card.duration)
                  }}
                />
              </div>

              {/* Presets */}
              <div className="section-block">
                <div className="section-title">Presets</div>
                <div className="section-card">
                  <div className="section-label">Solfeggio Frequencies</div>
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
                  <hr className="section-divider" />
                  <div className="section-label">Brainwave Presets</div>
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
              </div>

              {/* Frequency */}
              <div className="section-block">
                <div className="section-title">Frequency</div>
                <div className="section-card">
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
                </div>
              </div>

              {/* Filter */}
              <div className="section-block">
                <div className="section-title">Filter</div>
                <div className="section-card">
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
                </div>
              </div>

              {/* Isochronic Tones */}
              <div className="section-block">
                <div className="section-title">Isochronic Tones</div>
                <div className="section-card">
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
              </div>

              {/* Wobble / LFO */}
              <div className="section-block">
                <div className="section-title">Wobble / LFO</div>
                <div className="section-card">
                  <label>LFO Waveform
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
              </div>

            </div>
          )}

          {/* ──────────────── SOUND TAB ──────────────── */}
          {activeTab === 'sound' && (
            <div className="tab-sections">
              {/* Noise */}
              <div className="section-block">
                <div className="section-title">Noise</div>
                <div className="section-card">
                  <div className="seg-control">
                    {(['none', 'white', 'pink', 'brown', 'blue', 'violet'] as NoiseType[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        className={noiseType === type ? 'active' : ''}
                        onClick={() => setNoiseType(type)}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                  {noiseType !== 'none' && (
                    <label>Noise Volume ({Math.round(noiseVolume * 100)}%)
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={noiseVolume}
                        onChange={(e) => setNoiseVolume(Number(e.target.value))}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Ambient */}
              <div className="section-block">
                <div className="section-title">Ambient</div>
                <div className="section-card">
                  <p className="control-hint">
                    {isRunning
                      ? 'Session is active. Use the Soundscape mixer below to add or adjust rain/ocean/etc in-session.'
                      : 'Play soundscapes and noise without starting a binaural session.'}
                  </p>
                  <button
                    className={`start-button${ambientButtonActive ? ' start-button--active' : ''}`}
                    onClick={() => void toggleAmbient()}
                    disabled={ambientButtonDisabled}
                    title={ambientButtonDisabled ? 'Disabled during session. Use the Soundscape mixer below.' : undefined}
                  >
                    {ambientButtonLabel}
                  </button>
                </div>
              </div>

              {/* Soundscape */}
              <div className="section-block">
                <div className="section-title">Soundscape</div>
                <div className="section-card">
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
                    onSceneChange={(sceneId) => {
                      // Free users: only first 2 scenes allowed (off + first scene)
                      if (!isPro) {
                        const freeScenes = SOUNDSCAPE_SCENES.slice(0, 3).map(s => s.id) // off + 2 scenes
                        if (!freeScenes.includes(sceneId)) {
                          openUpgradeModal('All Soundscapes')
                          return
                        }
                      }
                      setSoundsceneId(sceneId)
                    }}
                    disabled={false}
                  />
                  {/* Custom soundscape save/load */}
                  <hr className="section-divider" />
                  <div className="soundscape-preset-row">
                    <input
                      className="text-input"
                      type="text"
                      placeholder="Name this mix..."
                      value={soundscapePresetName}
                      onChange={e => setSoundscapePresetName(e.target.value)}
                      style={{ flex: 1, minWidth: 0 }}
                    />
                    <button className="soft-button" onClick={() => {
                      const name = soundscapePresetName.trim()
                      if (!name) return
                      const updated = [...customSoundscapes.filter(s => s.name !== name), { name, gains: { ...layerGains } }]
                      writeCustomSoundscapes(updated)
                      setCustomSoundscapes(updated)
                      setSoundscapePresetName("")
                    }}>Save Mix</button>
                  </div>
                  {customSoundscapes.length > 0 && (
                    <div style={{ marginTop: "0.5rem" }}>
                      <label className="section-label" style={{ display: "block", marginBottom: "0.35rem" }}>SAVED MIXES</label>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                        {customSoundscapes.map(s => (
                          <div key={s.name} style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                            <button className="soft-button" style={{ flex: 1, textAlign: "left" }} onClick={() => {
                              setLayerGains(s.gains as LayerGains)
                              setSoundsceneId("custom")
                            }}>{s.name}</button>
                            <button className="soft-button soft-button--danger" style={{ padding: "0.2rem 0.5rem", fontSize: "0.78rem" }} onClick={() => {
                              const updated = customSoundscapes.filter(x => x.name !== s.name)
                              writeCustomSoundscapes(updated)
                              setCustomSoundscapes(updated)
                            }}>x</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {!isPro && (
                    <div className="soundscape-unlock-row" onClick={() => openUpgradeModal('All Soundscapes')} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && openUpgradeModal('All Soundscapes')}>
                      <span>Unlock all soundscapes with Pro</span>
                      <span style={{ color: "#a78bfa", fontWeight: 600 }}>Upgrade</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ──────────────── PAD SYNTH TAB ──────────────── */}
          {activeTab === 'pad' && (
            <div className="tab-sections">
              <PadSynth />
            </div>
          )}

          {/* ──────────────── FOCUS TAB ──────────────── */}
          {activeTab === 'focus' && (
            <div>
            <VisualTab
              carrier={carrier}
              beat={beat}
              isRunning={isRunning}
              analyser={masterBusRef.current?.analyser ?? null}
            />
            <div className="tab-sections">
              <div className="section-block">
                <div className="section-card">
                  <BreathGuide isRunning={isRunning} />
                </div>
              </div>
              <div className="section-block">
                <div className="section-title">Frequency Verifier</div>
                <div className="section-card">
                  <FrequencyVerifier />
                </div>
              </div>
            </div>
            </div>
          )}

          {/* ──────────────── STUDIO TAB ──────────────── */}
          {activeTab === 'studio' && (
            <div>
            <StudioTab
              isRunning={isRunning}
              musicTracks={MUSIC_TRACKS}
              onExportWav={() => void exportWav()}
              onPreview={(studioLayers) => {
                if (graphRef.current) stopSession(false)
                // Create AudioContext synchronously inside the user gesture
                if (prewarmedContextRef.current) { void prewarmedContextRef.current.close() }
                prewarmedContextRef.current = new AudioContext()
                fadeInSecondsRef.current = 0
                sessionMinutesRef.current = 60
                setSessionMinutes(60)
                applyStudioLayers(studioLayers, {
                  setCarrier, setBeat, setWobbleRate,
                  setNoiseType, setNoiseVolume,
                  setBinauralVolume, setSoundscapeVolume,
                  setPadEnabled, setPadVolume, setPadWaveform, setPadReverbMix, setPadBreatheRate,
                  setLeftFrequency, setRightFrequency,
                  setMusicVolume,
                  playMusicTrack: (id) => {
                    const track = MUSIC_TRACKS.find(t => t.id === id)
                    if (track) void playMusicTrack(track)
                  },
                  pendingMusicTrackIdRef,
                  applySoundscapeScene, setSoundsceneId, setLayerGains,
                  carrierRef, beatRef, noiseTypeRef, noiseVolumeRef,
                  padEnabledRef, padVolumeRef,
                  leftFrequencyRef, rightFrequencyRef,
                  layerGainsRef, fadeInSecondsRef, wobbleRateRef,
                  binauralVolumeRef, soundscapeVolumeRef,
                  graphRef, masterBusRef, mixerNodesRef,
                  SOUNDSCAPE_SCENES, DEFAULT_GAINS,
                  setAutomationLanes,
                })
                window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
                  if (!graphRef.current && !audioStartingRef.current) void toggleAudio()
                }))
              }}
              onStop={() => stopSession(true)}
              onLiveUpdate={(studioLayers) => {
                applyStudioLayers(studioLayers, {
                  setCarrier, setBeat, setWobbleRate,
                  setNoiseType, setNoiseVolume,
                  setBinauralVolume, setSoundscapeVolume,
                  setPadEnabled, setPadVolume, setPadWaveform, setPadReverbMix, setPadBreatheRate,
                  setLeftFrequency, setRightFrequency,
                  setMusicVolume,
                  playMusicTrack: (id) => {
                    const track = MUSIC_TRACKS.find(t => t.id === id)
                    if (track) void playMusicTrack(track)
                  },
                  pendingMusicTrackIdRef: null,
                  applySoundscapeScene, setSoundsceneId, setLayerGains,
                  carrierRef, beatRef, noiseTypeRef, noiseVolumeRef,
                  padEnabledRef, padVolumeRef,
                  leftFrequencyRef, rightFrequencyRef,
                  layerGainsRef, fadeInSecondsRef, wobbleRateRef,
                  binauralVolumeRef, soundscapeVolumeRef,
                  graphRef, masterBusRef, mixerNodesRef,
                  SOUNDSCAPE_SCENES, DEFAULT_GAINS,
                  setAutomationLanes,
                })
              }}
            />
            <div className="tab-sections">
              <div className="section-block">
                <div className="section-title">Session</div>
                <div className="section-card">
                  <label>Session Length ({sessionMinutes.toFixed(0)} min{!isPro && sessionMinutes > 15 ? ' — ⚠️ Pro required for >15 min' : ''})
                    <input type="range" min={1} max={isPro ? 180 : 15} step={1} value={Math.min(sessionMinutes, isPro ? 180 : 15)}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        if (!isPro && val > 15) { openUpgradeModal('Sessions > 15 minutes'); return }
                        setSessionMinutes(val)
                      }} />
                    {!isPro && <span className="control-hint">🔒 <button className="link-btn" onClick={() => openUpgradeModal('Sessions > 15 minutes')}>Upgrade to Pro</button> for sessions up to 3 hours</span>}
                  </label>
                  <label>Fade In ({fadeInSeconds.toFixed(0)} sec)
                    <input type="range" min={0} max={60} step={1} value={fadeInSeconds} onChange={(e) => setFadeInSeconds(Number(e.target.value))} />
                  </label>
                  <label>Fade Out ({fadeOutSeconds.toFixed(0)} sec)
                    <input type="range" min={0} max={60} step={1} value={fadeOutSeconds} onChange={(e) => setFadeOutSeconds(Number(e.target.value))} />
                  </label>
                  <button className="soft-button export-button" onClick={() => void exportWav()}
                    disabled={isRunning || isExporting} style={{ width: '100%' }}>
                    {isExporting ? '⏳ Rendering…' : '⬇ Export WAV'}
                  </button>
                  <VuMeter analyser={masterBusRef.current?.analyser ?? null} isRunning={isRunning} />
                </div>
              </div>

              <div className="section-block">
                <div className="section-title">Automation</div>
                <div className="section-card">
                  <p className="control-hint">Plan first, then drag points to dial in your exact progression.</p>
                  <AutomationEditor
                    lanes={automationLanes}
                    onChange={setAutomationLanes}
                    sessionMinutes={sessionMinutes}
                  />
                </div>
              </div>

              <div className="section-block">
                <div className="section-title">Presets</div>
                <div className="section-card">
                  <label>Preset Name
                    <input className="text-input" type="text" value={presetName} onChange={(e) => setPresetName(e.target.value)} />
                  </label>
                  <div className="preset-actions">
                    <button type="button" className="soft-button" onClick={savePreset}>Save Preset</button>
                  </div>
                  <hr className="section-divider" />
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
            </div>
            </div>
          )}

          {/* ──────────────── EDUCATION TAB ──────────────── */}
          {activeTab === 'education' && (
            <div className="tab-sections">
              <EducationTab />
            </div>
          )}

          {/* ──────────────── AI TAB ──────────────── */}
          {activeTab === 'ai' && (
            <div className="tab-sections">
              <div className="section-block">
                <div className="section-title">AI Meditation</div>
                <div className="section-card">
                  <AiMeditationPanel
                    onSessionReady={handleAiSessionReady}
                    apiKey={aiApiKey}
                    onOpenSettings={() => setShowApiSettings(true)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ──────────────── JOURNAL TAB ──────────────── */}
          {activeTab === 'journal' && (
            <div className="tab-sections">
              <div className="section-block">
                <div className="section-title">Session Journal</div>
                <div className="section-card">
                  <p className="control-hint">Review your past sessions and reflections.</p>
                  <button className="soft-button" style={{ width: '100%' }} onClick={() => setShowJournalList(true)}>
                    📓 Open Session Journal
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────── MUSIC TAB ──────────────── */}
          {activeTab === 'music' && (
            <MusicTab
              tracks={MUSIC_TRACKS}
              currentTrackId={musicTrackId}
              isPlaying={musicPlaying}
              volume={musicVolume}
              onSetVolume={setMusicVolume}
              onPlay={(track) => void playMusicTrack(track)}
              onStop={stopMusic}
              onNext={nextTrack}
              onPrev={prevTrack}
              shuffle={musicShuffle}
              onToggleShuffle={() => setMusicShuffle(s => !s)}
              eq={musicEQ}
              onSetEQ={setMusicEQ}
              position={musicPosition}
              duration={MUSIC_TRACKS.find(t => t.id === musicTrackId)?.duration ?? 0}
              onSeek={(s) => void handleMusicSeek(s)}
            />
          )}
        </div>
      </section>

      {/* ── Journal List ── */}
      {showJournalList && (
        <SessionJournal
          entries={journalEntries}
          onClose={() => setShowJournalList(false)}
          addEntry={journalAddEntry}
          updateEntry={journalUpdateEntry}
          deleteEntry={journalDeleteEntry}
        />
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

      {/* ── Auth Modal ── */}
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}

      {/* ── Settings Panel ── */}
      {showSettingsPanel && user && (
        <SettingsPanel onClose={() => setShowSettingsPanel(false)} onError={(msg) => addToast(msg, 'error')} />
      )}

      {/* ── Upgrade Modal ── */}
      <UpgradeModal />

      {/* ── PWA Install Prompt ── */}
      <InstallPrompt />

      {/* ── Toast Notifications ── */}
      <Toast toasts={toasts} onRemove={removeToast} />

      {/* ── Pro Toast ── */}
      {proToast && (
        <div className="pro-toast">Welcome to Pro! 🎉</div>
      )}

      <p className="footnote">
        Safety: keep volume low at session start. Use headphones for full binaural effect. Avoid therapeutic claims.
      </p>

      {/* ── Persistent Mini Player Bar — inside main for iOS gesture trust ── */}
      <MiniPlayer
        isRunning={isRunning}
        ambientRunning={ambientRunning}
        carrier={carrier}
        beat={beat}
      remainingSeconds={remainingSeconds}
      sessionTotalSeconds={sessionTotalSeconds}
      soundsceneId={soundsceneId}
      volume={volume}
      setVolume={setVolume}
      binauralVolume={binauralVolume}
      setBinauralVolume={setBinauralVolume}
      noiseVolume={soundscapeVolume}
      setNoiseVolume={setSoundscapeVolume}
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
      isExpanded={playerExpanded}
      onToggleExpand={() => setPlayerExpanded(v => !v)}
      onOpenVisual={() => { setActiveTab('focus'); setPlayerExpanded(false) }}
    />
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
  entry: Omit<JournalEntry, 'id' | 'notes' | 'mood' | 'tags' | 'completedAt'>
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

function App() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <AppInner />
      </SubscriptionProvider>
    </AuthProvider>
  )
}

export default App



