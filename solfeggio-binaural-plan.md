# Binaural Beats / Solfeggio App — Full Product Plan

---

## Product Vision

This is not a frequency generator. It is a **mental state control system**.

A mix of:
- **Brain.fm** — functional, science-adjacent audio for focus and sleep
- **Endel** — generative adaptive soundscapes
- **Calm** — guided sessions, approachable UX
- **A pro frequency generator** — full manual control for power users
- **A consciousness exploration tool** — altered states, sacred geometry, lucid dreaming, ritual

The core thesis: **static audio loops don't work as well as dynamic, evolving soundscapes that guide the brain through states over time.** Most apps play the same loop on repeat. This app moves the user — from Beta to Alpha to Theta, with precision.

Target audience:
- People with ADHD seeking focus support
- Meditators and mindfulness practitioners
- Lucid dreaming and altered states enthusiasts
- Sleep-challenged users
- Biohackers and neurofeedback-curious users
- Sound healers and frequency practitioners

---

## The Killer Feature

**Dynamic Brainwave Transitions**

Most apps play a static 6 Hz theta tone for 30 minutes. This app builds a journey:

```
Beta (18 Hz) → Alpha (10 Hz) → Theta (6 Hz) → Deep Theta (3 Hz)
```

Each transition is smoothly automated over the session timeline. The brain follows the beat frequency downward through states — a process called "frequency following response." This is what Brain.fm actually does under the hood. Building this properly, with user-editable stage sequences, is the primary differentiator.

---

## What Makes It Stand Out

1. Dynamic brainwave transitions (not static loops)
2. Full pro-level manual control alongside guided presets
3. Isochronic tones alongside binaural (works without headphones)
4. Generative pad synth that breathes in the same key as the carrier frequency
5. Visual resonance interface — real-time sacred geometry / Lissajous driven by actual audio values
6. Consciousness exploration framing — lucid dreaming, astral, ritual modes
7. Session journal and state tracking — turns it into a practice log
8. WAV export — "save your session" is a premium feature people pay for

---

## Competitive Landscape

| App | Strength | Weakness |
|-----|----------|----------|
| Brain.fm | Science-backed, adaptive | Expensive, no manual control |
| Endel | Beautiful generative design | No frequency control, passive |
| Calm | Brand trust, guided sessions | No binaural, no frequency work |
| MyNoise | Deep manual control | Ugly, no journeys, no export |
| BrainAural | Frequency focused | Dated UX, static sessions |
| Moongate | Great onboarding UX, goal-based entry, solid content + subscription layer | Shallower audio engine, no stage sequencer, no WAV export, no advanced modulation |

Gap: **No app combines pro-level frequency control + dynamic state transitions + beautiful generative soundscapes + consciousness framing + polished goal-based onboarding + subscription business layer.**

### What Moongate Does Well (Must Match or Beat)
Moongate has nailed the product and business wrapper around a simpler audio engine. These are parity targets:

**Onboarding + Discovery**
- Goal-based entry: Sleep / Relax / Focus / Meditate — user picks an outcome, not a frequency
- "Tap a goal" flow — no technical setup on first launch
- Time-of-day / intent-based session recommendations
- Featured and new content sections
- "Used recently" and "continue listening"
- Educational layer: what binaural beats are, brainwave ranges, headphone requirements, how long to listen

**Content**
- Curated soundscape library per goal
- Multiple content types: music, nature, noise soundscapes
- Frequent release cadence for new soundscapes
- Subscriber-only content drops
- Goal-focused playlists or packs

**Audio UX**
- True binaural playback with headphone guidance
- Speaker-friendly isochronic mode (no headphones required)
- Quick-start sessions (works in 5–10 minute windows)
- Background playback while using other apps
- Session timer and fade controls

**Monetization**
- Free tier + Premium tier
- Monthly + annual plans (annual highlighted as popular)
- Free trial support
- In-app / web checkout + entitlement sync
- Simple cancellation flow
- Money-back guarantee policy

**Account + Support**
- Email sign-in
- Auto-account creation from purchase email
- Cross-device entitlement activation
- In-app restore purchases
- Help center (FAQ, soundscapes, features, billing, account)

**Trust + Conversion**
- Social proof block (ratings / testimonials)
- Benefit-first landing copy (sleep, stress, focus outcomes)
- Compliance-safe claims language
- Privacy + terms + fulfillment policy visibility

### Where This App Wins Over Moongate
- Far deeper audio engine (LFO targeting, phase offset, pad synth, filter, automation lanes)
- Dynamic brainwave stage sequencer (Moongate has no journey transitions)
- WAV export
- Visual resonance interface
- Pro manual control mode
- Consciousness exploration / ritual / lucid dream framing
- Session journal + state tracking
- AI frequency composer (roadmap)

---

## Audio Architecture

### Engine-First Philosophy
Treat this as an audio engine project. The UI is a control surface for the engine. The engine is what ships value.

### Core Stack
- **Web Audio API** — low-level audio graph, oscillators, filters, convolution, scheduling
- **Tone.js** — transport clock, precise scheduling, LFO convenience (add in Phase 3 before BPM sync)
- **OfflineAudioContext** — WAV export rendering
- **Meyda / Essentia.js** — beat detection and onset analysis (Phase 4 only)
- **React + TypeScript + Vite** — UI layer

### Signal Graph (Full)

```
[Left Oscillator] ──────────────────────────────────┐
                                                     ├──► [ChannelMerger] ──► [AM Gain] ──► [BiquadFilter] ──► [Automation Gain] ──► [Master Gain] ──► [Limiter] ──► [Meter] ──► Output
[Right Oscillator] ─────────────────────────────────┘

[Noise Source (white/pink/brown)] ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────► [Master Gain]

[Pad Synth] ──► [Convolver Reverb] ──► [Wet Gain] ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────► [Master Gain]
             └──► [Dry Gain] ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────► [Master Gain]

[Song Layer (Phase 3)] ──► [Song Gain] ──► [Song EQ] ──► [Song Bus] ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────► [Master Gain]

[LFO] ──► [LFO Depth Gain] ──► [target: leftOsc.detune | rightOsc.detune | amGain.gain | rightOsc.frequency]

[Isochronic Pulse Engine] ──► [Isochronic Gain] ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────► [Master Gain]
```

### Binaural Rule
- Left ear = carrier frequency
- Right ear = carrier + beat difference
- Beat perception = difference tone created in the brain (NOT in the audio)
- Requires headphones — stereo separation is mandatory

### Isochronic Rule
- Single tone, amplitude-modulated at the beat frequency
- Does not require headphones
- Pulse width and modulation depth are user-controllable
- Can run alongside binaural or independently

---

## Module Architecture (Current)

```
src/
  types.ts                        ← all shared types
  App.tsx                         ← root component, master state + audio wiring

  engine/
    audioGraph.ts                 ← binaural graph (oscs, LFO, filter, AM, noise)
    masterBus.ts                  ← persistent AudioContext bus (binaural + soundscape + voice + music → limiter → output)
    padSynth.ts                   ← generative pad synth (4-osc, convolver reverb, breathing LFO)
    noiseGen.ts                   ← white/pink/brown noise buffers
    isochronic.ts                 ← isochronic pulse engine (amplitude-modulated tone, duty cycle, ramp)
    journeyEngine.ts              ← brainwave state transition scheduler (stage sequencer, cross-stage ramps)
    soundscapeMixer.ts            ← 22-layer ambient sound system (noise-gen + sample buffers, per-layer gain)
    samplePlayer.ts               ← sample buffer loader with OGG/MP3 fallback to generated noise
    ambientPlayer.ts              ← standalone ambient-only playback (no binaural session required)
    musicPlayer.ts                ← lofi/ambient music player with 5-band EQ
    voiceBus.ts                   ← TTS / narration bus with convolver reverb
    wavExport.ts                  ← OfflineAudioContext render + 16-bit PCM WAV encoder

  components/
    — Tab shells —
    PlayerTab.tsx                 ← main player: freq controls, presets, noise, pad, automation
    StudioTab.tsx                 ← advanced multi-layer scene editor with per-layer automation
    ModesTab.tsx                  ← Focus / Sleep / Lucid Dream / Ritual mode picker
    MusicTab.tsx                  ← music library + EQ
    SequencerTab.tsx              ← journey sequencer / stage builder
    VisualTab.tsx                 ← Canvas visualizer (Lissajous, Mandala, Pulse, Spectrum)
    EducationTab.tsx              ← learn mode: brainwave bands, solfeggio, usage guide
    HelpTab.tsx                   ← FAQ and support
    SettingsPanel.tsx             ← app settings (theme, notifications, account)

    — Mode panels —
    FocusMode.tsx                 ← Beta-arc focus sessions (25–90 min)
    SleepMode.tsx                 ← 2–8 hour Delta descent journey
    LucidDreamMode.tsx            ← REM-cycle theta journey (4–8 hours)
    RitualMode.tsx                ← Immersive intentional space (4 intention presets)

    — Player sub-components —
    AutomationEditor.tsx          ← SVG multi-lane automation lane editor
    BreathGuide.tsx               ← breathing pulse overlay (ring animation)
    SoundscapeMixer.tsx           ← per-layer soundscape gain controls + scene picker
    PadSynth.tsx                  ← pad synth controls (waveform, reverb, breathe rate)
    MoodEQ.tsx                    ← mood-based frequency recommendations
    SessionPlanner.tsx            ← quick-start presets + planning templates
    JourneyBuilder.tsx            ← journey stage editor
    WaveformPlayer.tsx            ← audio file playback for voice/narration
    VuMeter.tsx                   ← RMS level meter
    AudioVisualizer.tsx           ← waveform visualizer component
    MiniPlayer.tsx                ← persistent now-playing strip at bottom

    — AI —
    AiMeditationPanel.tsx         ← AI meditation prompt input, generation, session launch

    — Auth / monetisation —
    AuthModal.tsx                 ← sign-in / sign-up modal
    ProGate.tsx                   ← paywall wrapper for Pro-only features
    UpgradeModal.tsx              ← plans + pricing overlay
    ApiKeySettings.tsx            ← user-supplied API key management

    — Session history —
    SessionJournal.tsx            ← post-session journal modal
    SessionLibrary.tsx            ← session history list, filter, export, delete
    SevenDayProgram.tsx           ← 7-day guided program with streak tracking
    ProgramComplete.tsx           ← completion screen

    — Onboarding —
    OnboardingFlow.tsx            ← goal-based first-run carousel
    OnboardingModal.tsx           ← onboarding modal shell
    InstallPrompt.tsx             ← PWA install banner

    — Utility —
    TabNav.tsx                    ← bottom navigation bar
    Icons.tsx                     ← custom SVG icon library (hand-coded, no external lib)
    Toast.tsx                     ← transient notification toasts
    ErrorBoundary.tsx             ← React error boundary
    NotificationSettings.tsx      ← push notification opt-in
    AdminConsole.tsx              ← internal admin dashboard (Stripe + Vercel status)
    FrequencyVerifier.tsx         ← audio accuracy debug tool
    AuraReader.tsx                ← aura / chakra frequency helper
    AuraTuning.tsx                ← aura tuning UI
    SculptBridgePanel.tsx         ← ZBrush / Sculpt bridge panel (experimental)

  ai/
    journeyComposer.ts            ← LLM-structured journey config parser + validator
    meditationComposer.ts         ← AI meditation session builder
    meditationThemes.ts           ← pre-mapped theme → carrier/beat/soundscape/tone
    savedSessions.ts              ← AI session persistence helpers

  data/
    (inline in engine modules and App.tsx — solfeggio frequencies, brainwave presets,
     journey templates, breath patterns, soundscape scenes, music tracks)

  contexts/
    (auth context, subscription context)

  hooks/
    (custom React hooks)

  lib/
    (utility helpers)
```

---

## Feature Roadmap

### ✅ Phase 1 — Binaural Core (DONE)
- [x] Carrier frequency control (40–1200 Hz)
- [x] Beat frequency difference control (0–40 Hz)
- [x] Independent left/right tuning mode
- [x] LFO wobble: rate, depth, waveform (sine/triangle/square/sawtooth), target (carrier detune / amplitude AM / beat freq)
- [x] Phase offset control (0–360°)
- [x] Session timer with fade in / fade out envelope
- [x] End chime
- [x] Progress bar
- [x] Presets (localStorage)
- [x] Solfeggio frequency quick-select (174–963 Hz with labels)
- [x] Brainwave band presets (Delta/Theta/Alpha/Beta/Gamma)
- [x] Headphone safety note

### ✅ Phase 2 — Sound Design (DONE)
- [x] White / pink / brown noise layer
- [x] LPF / HPF filter with resonance on binaural bus
- [x] Automation ramp lanes (SVG editor — volume, filter cutoff, beat frequency)
- [x] Real-time automation reschedule during session
- [x] Pad synth underlay (4-osc chord, convolver reverb, breathing LFO, dry/wet)
- [x] WAV export (OfflineAudioContext + 16-bit PCM)
- [x] Session journal (post-session modal, localStorage history)

### ✅ Phase 3 — Dynamic Journeys (DONE)

#### 3a — Isochronic Tone Generator ✅
- [x] Amplitude-modulated tone at beat frequency
- [x] Configurable waveform (sine, square, sawtooth, triangle)
- [x] Duty cycle and ramp control
- [x] Can run alongside binaural or standalone
- [x] Independent gain on isochronic bus
- Implementation: `src/engine/isochronic.ts`

#### 3b — Brainwave State Transition Engine ✅
The core differentiator. A stage sequencer that builds a journey:

```
Stage 1: Beta  → 18 Hz beat, 5 min
Stage 2: Alpha → 10 Hz beat, 5 min  (smooth ramp between stages)
Stage 3: Theta → 6 Hz beat, 10 min
Stage 4: Deep Theta → 3 Hz beat, 10 min
```

- [x] Multi-scene sessions with crossfading between stages
- [x] Per-scene parameter scheduling
- [x] Journey creation and saving
- Implementation: `src/engine/journeyEngine.ts`, `src/components/JourneyBuilder.tsx`, `src/components/StudioTab.tsx`

#### 3c — Pre-built Guided Journeys ✅
- [x] Pre-built journey templates included
- [x] Journey builder UI with add/remove/reorder
- Implementation: `src/data/prebuiltJourneys.ts`, `src/components/JourneyBuilder.tsx`

#### 3d — Soundscape Layers ✅
22-layer environmental sound system with 17 pre-built scenes:
- [x] rain, thunder, wind, waves, fire, forest, space, cave, stream, birds, cafe, night, fan, bowl, beach, city, underwater, monastery, train, library, storm-heavy, meadow
- [x] Per-layer gain control with smooth fading
- [x] Noise-based procedural generation with filter shaping
- [x] Sample loading with OGG/MP3 fallback to generated noise
- [x] 17 pre-built scenes: off, storm, ocean, forest, fire, space, cave, custom, stream, cafe, night, bowl, beach, underwater, monastery, focus-train, meadow
- [x] Pending gain tracking while loading (latest slider value used on fade-in)
- Implementation: `src/engine/soundscapeMixer.ts`, `src/engine/samplePlayer.ts`, `src/components/SoundscapeMixer.tsx`

Note: stereo width, spatial pan, and randomness/variation controls are not yet implemented per-layer.

#### 3e — Breath Synchronization ✅
- [x] Visual breathing pulse guide
- [x] Multiple breathing patterns
- [x] Synchronized with session
- Implementation: `src/components/BreathGuide.tsx`

---

### ✅ Phase 3 Bonus — Built Beyond Plan

These features were built during Phase 3 but were not originally planned for this phase:

#### Music Player with 5-Band EQ ✅
- 20 curated lofi/ambient tracks
- EQ bands: Sub (60Hz), Bass (200Hz), Mid (1kHz), Presence (4kHz), Air (12kHz) ±12dB
- Full playback controls
- Implementation: `src/engine/musicPlayer.ts`, `src/components/MusicTab.tsx`

#### Voice Bus / Narration Support ✅
- Convolver-based reverb for voice recordings
- Separate gain and reverb control
- Architecture ready for AI TTS integration
- Implementation: `src/engine/voiceBus.ts`

#### Studio Tab (Advanced Scene Editor) ✅
- Full multi-layer scene composition
- Per-layer automation support
- Quick presets and solfeggio preset system
- Journey creation and saving
- Implementation: `src/components/StudioTab.tsx`

#### 7-Day Program ✅
- Progressive daily meditation program
- Progress and streak tracking
- Implementation: `src/components/SevenDayProgram.tsx`

#### MoodEQ ✅
- Mood-based frequency recommendations
- Anti-mood slider controls
- Implementation: `src/components/MoodEQ.tsx`

#### AI Meditation Panel ✅ (partial — 5f started early)
- API-integrated meditation guidance generation
- Prompt-based session content
- Implementation: `src/components/AiMeditationPanel.tsx`

---

### ✅ Phase 4 — The Experience (DONE)

#### 4a — Visual Resonance Interface ✅
- [x] Lissajous figure — L/R plots driven by carrier + beat values, animated via RAF
- [x] Oscillating mandala — petal geometry that rotates at carrier rate, pulses at beat
- [x] Pulse / ring mode — concentric rings spawned at beat frequency
- [x] Spectrum / circular bars — AnalyserNode frequency bars in radial layout
- [x] 4 colour themes: Emerald, Violet, Gold, Void
- [x] Fullscreen mode
- [x] ResizeObserver so canvas resizes correctly inside collapsed containers
- Implementation: `src/components/VisualTab.tsx`

#### 4b — Ritual Mode ✅
- [x] 4 intentions: Stillness / Ceremony / Release / Creation — each with tuned carrier, beat, noise, soundscape
- [x] Fullscreen immersive overlay with pulsing ambient orb
- [x] Controls hidden until mouse movement, fade out after 2.5s
- [x] Start/Stop toggle stays on screen; session-owned soundscape cleans up on stop
- Implementation: `src/components/RitualMode.tsx`

#### 4c — Daily State Tracking ✅
- [x] Post-session journal modal (mood, energy, sleep quality, free notes)
- [x] localStorage session history
- [x] Session Library view with filtering, export, delete
- Note: trend charts / heatmap not yet built (Phase 5 candidate)
- Implementation: `src/components/SessionJournal.tsx`, `src/components/SessionLibrary.tsx`

#### 4d — Sleep Mode ✅
- [x] 2–8 hour programs
- [x] 5-stage Beta → Alpha → Theta → Deep Theta → Delta journey
- [x] Ultra-gentle 90s fade-in, rain soundscape
- [x] Stage arc display with current stage highlighted
- [x] Status strip showing stage name, brainwave band, time remaining
- Implementation: `src/components/SleepMode.tsx`

#### 4e — Focus Mode ✅
- [x] 4-stage Beta arc: Warm-up (18 Hz) → Flow State (14 Hz) → Deep Focus (12 Hz) → Wind-Down (9 Hz)
- [x] 25 / 45 / 60 / 90 min duration picker
- [x] 200 Hz carrier, pink noise, 30s fade-in
- [x] Optional gamma burst toggle (40 Hz)
- [x] Start/Stop toggle with compact status strip when running
- Implementation: `src/components/FocusMode.tsx`

#### 4f — Lucid Dream Mode ✅
- [x] 5-stage theta journey with 3 REM zones aligned to 90-min sleep cycles
- [x] 4 / 6 / 8 hour sessions
- [x] 432 Hz carrier, brown noise, ocean soundscape, 90s fade-in
- [x] Stage arc display and status strip
- Implementation: `src/components/LucidDreamMode.tsx`

#### Modes Tab ✅ (consolidation UX built during Phase 4)
- [x] Single "Modes" tab replaces 4 separate tabs
- [x] 2×2 mode picker cards at top (Focus / Sleep / Lucid Dream / Ritual)
- [x] Active mode content shown below picker
- [x] Collapsible visualization section at bottom — shared across all modes
- [x] Session-owned soundscape stops correctly on any stop path (MiniPlayer, mode button, media session API)
- Implementation: `src/components/ModesTab.tsx`

---

### 🔲 Phase 5 — Intelligence Layer (in progress)

#### 5a — AI Frequency Composer ✅ (partial)
Architecture and parsing logic built early. `journeyComposer.ts` validates and maps LLM-structured JSON to journey configs. Template-based generation works without a live LLM call. Full LLM wiring (user text prompt → GPT/Claude → structured JSON → session launch) is not yet wired end-to-end in the UI.

User describes intent in plain text:
> "Create a 30-minute creativity meditation with a slow descent"

System builds:
- Stage sequence (brainwave journey)
- Carrier frequency selection
- Soundscape layer selection
- LFO parameters
- Pad synth settings

Implementation path:
1. **First: template system** — map keywords to pre-built journey templates + randomized variation. No AI needed. Ships fast.
2. **Later: LLM integration** — send prompt to GPT-4/Claude with a structured JSON schema for session parameters. Parse response into session config.

---

#### 5f — AI Guided Meditation (Flagship AI Feature) ✅ (partial)

**What's built:** `AiMeditationPanel.tsx` scaffolded with prompt input UI, API key management (`ApiKeySettings.tsx`), session launch plumbing, and `meditationComposer.ts` / `meditationThemes.ts` for theme-to-config mapping. Voice bus architecture is production-ready (`voiceBus.ts`). `savedSessions.ts` handles AI session persistence.

**Remaining:** live LLM call (GPT/Claude) for script generation, TTS rendering via OpenAI TTS / ElevenLabs, audio chunk assembly + streaming, loading UX, and post-session journal prompt.

---

**One prompt. Full experience.**

User types (or speaks):
> "Meditate on abundance"
> "Help me release anxiety about my job"
> "Deep sleep, I need to clear my head"
> "Activate my creativity for a design session"

The system responds with a **complete, orchestrated session**:

1. **Selects the correct solfeggio carrier** — abundance → 528 Hz (transformation), anxiety release → 396 Hz (liberation), sleep → 174 Hz (foundation), creativity → 852 Hz (intuition)
2. **Sets the brainwave target** — abundance/creativity → alpha/theta, anxiety → alpha, sleep → delta/theta
3. **Builds a stage sequence** — dynamic transition journey tuned to the intent
4. **Selects soundscape** — abundance → warm pad + gentle rain, anxiety → ocean + soft drone, sleep → deep brown noise + pad
5. **Generates a guided voice meditation** — a full narrated script tailored to the user's intent, spoken over the audio in a calm voice
6. **Starts the session** — everything plays together immediately

The voice is the centrepiece. The frequencies are the invisible support structure underneath it.

### Voice Generation Architecture

**TTS Provider options (in order of recommendation):**

| Provider | Voice Quality | Cost | Latency | Notes |
|----------|--------------|------|---------|-------|
| **ElevenLabs** | Best in class | ~$0.30/1k chars | Low | Most natural, emotion-aware, custom voice cloning |
| **OpenAI TTS** (tts-1-hd) | Excellent | ~$0.03/1k chars | Low | Great value, 6 voices, very natural |
| **Google Cloud TTS** (WaveNet) | Very good | ~$0.016/1k chars | Low | Reliable, many languages |
| **Azure Cognitive TTS** (Neural) | Very good | ~$0.016/1k chars | Low | Strong neural voices |
| **Web Speech API** | Poor | Free | Instant | Prototype only — robotic, not suitable for meditation |

**Recommended:** OpenAI TTS for launch (cost-effective, high quality), ElevenLabs for premium tier (custom voice, more natural breathing/pausing).

### Script Generation Architecture

**Step 1: Session config generation (LLM)**
```
User prompt: "Meditate on abundance"
→ GPT-4 / Claude returns structured JSON:
{
  "carrier": 528,
  "beat": 7.83,
  "brainwaveTarget": "theta",
  "stages": [...],
  "soundscape": "warm-pad-rain",
  "meditationTheme": "abundance",
  "meditationDuration": 15,
  "scriptTone": "warm, gentle, affirming",
  "breathingPattern": "slow-4-4"
}
```

**Step 2: Script generation (LLM)**
```
System prompt: You are a meditation guide. Write a 15-minute guided meditation 
on the theme of abundance. The listener is in a theta brainwave state. 
Use warm, gentle, affirming language. Include:
- Opening grounding (2 min)
- Core theme visualisation (10 min)  
- Integration and closing (3 min)
Include [PAUSE 10s], [PAUSE 5s] markers for timing.
Tone: {scriptTone}
```

**Step 3: TTS rendering**
- Script split into chunks at pause markers
- Each chunk sent to TTS API
- Audio chunks assembled with silence gaps at pause markers
- Final audio: single WAV/MP3 file or streaming chunks

**Step 4: Session assembly**
- Voice audio loaded into a dedicated `VoiceNode` in the audio graph
- Voice bus: separate gain, subtle reverb (small room IR), gentle EQ (HPF 100Hz, presence boost 2–4kHz)
- Voice mixed over binaural + soundscape at ~70% gain
- Binaural engine running underneath throughout
- Voice fades in after fade-in envelope completes (~10 sec into session)

### Voice Bus Architecture
```
[TTS Voice Audio]
    └──► [Voice Gain ~70%] ──► [Voice Reverb (small room)] ──► [Voice EQ] ──► [Voice Bus]
                                                                                     │
[Binaural Bus] ──────────────────────────────────────────────────────────────────────┤
[Pad Synth] ─────────────────────────────────────────────────────────────────────────┤
[Soundscape] ────────────────────────────────────────────────────────────────────────┤
                                                                                     ▼
                                                                              [Master Gain] ──► Output
```

### Meditation Themes (Pre-mapped)
Ship with a library of pre-mapped themes so the LLM has structured guidance:

| Theme | Carrier | Beat | Brainwave | Soundscape | Script Tone |
|-------|---------|------|-----------|------------|-------------|
| Abundance | 528 Hz | 7.83 Hz | Theta | Warm pad + rain | Affirming, expansive |
| Anxiety release | 396 Hz | 10 Hz | Alpha | Ocean waves | Calming, grounding |
| Deep sleep | 174 Hz | 2 Hz | Delta | Brown noise + pad | Slow, hypnotic |
| Creativity | 852 Hz | 10 Hz | Alpha/Theta | Crystal + pad | Inspiring, open |
| Self-love | 639 Hz | 7 Hz | Theta | Soft rain | Warm, nurturing |
| Clarity / focus | 741 Hz | 14 Hz | Alpha/Beta | Light noise | Clear, direct |
| Healing | 285 Hz | 4 Hz | Theta | Forest + pad | Gentle, restorative |
| Spiritual connection | 963 Hz | 7 Hz | Theta | Space + drone | Mystical, reverent |
| Lucid dreaming | 432 Hz | 4 Hz | Theta/Delta | Deep pad | Dreamlike, hypnagogic |
| Energy activation | 417 Hz | 18 Hz | Beta | Uplifting pad | Energising, purposeful |

### UX Flow

```
Home screen
  └──► "AI Meditation" button (prominent, premium feature)
         └──► Text field: "What do you want to meditate on?"
                └──► Optional: voice input (Web Speech API)
                       └──► [Generate] button
                              └──► Loading screen: "Preparing your session..."
                                     ├──► LLM generates session config + script
                                     ├──► TTS renders voice audio
                                     └──► Session starts automatically
                                            ├──► Voice guides meditation
                                            ├──► Binaural engine runs underneath
                                            └──► Post-session: journal prompt + save as preset
```

### Pre-generated Sessions (Hybrid approach)
For speed and cost control, pre-generate a library of AI meditation sessions for common themes:
- Render once, store as audio files
- Available immediately, no generation latency
- Custom/unique prompts go through live generation (premium only)
- Hybrid: 20 pre-generated sessions free, unlimited live generation for Pro

### Voice Customisation (Premium)
- Choose from multiple voice personas (calm male, warm female, gender-neutral, etc.)
- ElevenLabs voice cloning — upload your own voice or choose from premium library
- Adjust speaking pace (slow / medium / slightly faster)
- Background music volume relative to voice

### Privacy Considerations
- User meditation prompts are sent to LLM API — disclose clearly in privacy policy
- Option to use on-device LLM (future — llama.cpp / Ollama) for fully private generation
- Generated scripts stored locally only unless user opts into cloud sync
- No meditation content is used to train models (confirm per provider TOS)

### Cost Model
| Tier | AI Meditation Access | Cost per session (approx.) |
|------|---------------------|---------------------------|
| Free | 3 pre-generated sessions only | $0 |
| Pro | Unlimited pre-generated + 10 live/month | ~$0.05–0.15 per live session |
| Premium | Unlimited live + ElevenLabs voice | ~$0.30–0.50 per live session |

Live generation cost (per 15-min session): LLM (~$0.02) + TTS (~$0.10) + storage = ~$0.12–0.15. Priced well within Pro margin.
Import a song file and overlay binaural on a dedicated bus:
- Song file import (MP3/WAV/FLAC via FileReader API)
- Song on its own bus (dedicated gain + EQ)
- Binaural on its own bus (independent volume, never mixed into mono)
- Stereo integrity protection — song must stay stereo
- Manual BPM input + tap tempo
- Visual beat grid overlay on automation lanes
- Warning: binaural effect weakens if music is too loud/dense

#### 5c — Auto BPM Detection (Phase 4 holdover)
- Meyda.js or Essentia.js onset detection on imported song
- Detected BPM snaps the beat grid
- Beat-grid-aligned automation: filter sweeps, LFO rate changes on downbeats
- Reliability fallback for ambient/rubato tracks (manual override always available)

#### 5d — Hardware Integration (Future)
- **Heart rate monitoring** — Web Bluetooth API + compatible HRM strap
  - Display live BPM
  - Optionally sync beat frequency to HRV coherence target (5.5 Hz for coherent breathing)
- **EEG integration** — Muse headband via Web Bluetooth
  - Read brainwave band power in real-time
  - Adaptive frequency: if alpha power drops, shift binaural to reinforce it
  - Session report: actual measured brainwave response vs. target
- **Sleep trackers** — HealthKit (iOS app) or Google Fit for sleep stage data

#### 5e — Content Platform
- Users publish their journeys as shareable presets
- Curated marketplace of community sessions
- Creator profiles
- Paid premium journeys from experts / sound healers
- Revenue share model

---

## Pro Control Surface (Full)

The advanced controls panel (collapsible, off by default):

| Control | Range | Notes |
|---------|-------|-------|
| Carrier frequency | 40–1200 Hz | Fine-tune to 0.01 Hz |
| Beat frequency | 0–40 Hz | Fine-tune to 0.01 Hz |
| Phase offset | 0–360° | Applied at session start |
| LFO rate | 0–12 Hz | |
| LFO depth | 0–60 cents (detune) / 0–100% (AM) | Context-sensitive |
| LFO waveform | sine / triangle / square / sawtooth | |
| LFO target | carrier detune / amplitude AM / beat freq | |
| Filter type | off / lowpass / highpass | |
| Filter frequency | 20–20,000 Hz | Log scale |
| Filter resonance (Q) | 0.1–20 | |
| Stereo width | 0–200% | Mid/side processing |
| Automation lanes | volume / filter cutoff / beat freq | SVG drag editor |
| Isochronic pulse width | 10–90% | Phase 3 |
| Isochronic depth | 0–100% | Phase 3 |
| Per-stage beat frequency | 0–40 Hz | Phase 3 stage sequencer |
| Per-stage duration | 1–60 min | Phase 3 |
| Per-stage transition time | 0–300 sec | Phase 3 |

---

## Stereo Integrity Rules

These are non-negotiable for the binaural effect to work:

1. **Never sum L+R** before the output. Mono collapse kills the effect.
2. **Binaural bus stays on ChannelMerger** — left and right are always independent channels.
3. **Song layer must stay stereo** — never convert imported audio to mono.
4. **Mid/side stereo widening** must preserve phase integrity.
5. **Headphone mode indicator** — visual warning if output device is suspected mono.
6. **Test button** — plays a quick L/R sweep so user can confirm channel separation.

---

## Session Design System

### Session Parameters (Full)
```typescript
type Session = {
  name: string
  carrier: number
  beat: number
  leftFrequency: number   // independent mode
  rightFrequency: number  // independent mode
  useIndependentTuning: boolean
  phaseOffset: number
  lfo: LfoParams
  filter: FilterParams
  noise: NoiseLayer
  pad: PadParams
  isochronic: IsochronicParams  // Phase 3
  stages: Stage[]               // Phase 3
  soundscapes: SoundscapeLayer[] // Phase 3
  automation: AutomationLanes
  session: SessionTimingParams
  visual: VisualParams          // Phase 4
  breathGuide: BreathParams     // Phase 3
}
```

### Preset Types
- **Quick presets** — single-state, simple (what's built now)
- **Journey presets** — multi-stage, dynamic (Phase 3)
- **Ritual presets** — full-environment, with visuals and breath guide (Phase 4)

---

## UX Principles

1. **Two modes: Simple and Pro.** Default to Simple. Experts unlock Pro. Never show everything at once.
2. **Outcome-first navigation.** User picks "I want to focus" before seeing any Hz values.
3. **Always playable.** Hit Start and something good happens immediately, even before tuning anything.
4. **Headphone reminder** is persistent and non-dismissable on first launch.
5. **Visual resonance is optional** but always available — it's a feature, not a gimmick.
6. **Offline first.** Everything works without internet. Sound files are bundled or generated.
7. **Dark by default.** The primary use case (meditation, sleep, focus) happens in low-light environments.

---

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Binaural effect weakened by loud music overlay | Separate bus gain + warning; binaural bus always audible above music |
| Stereo collapse on mono speakers/AirPods in mono mode | Detect and warn; offer isochronic as fallback |
| iOS AudioContext suspension | Resume on touch/tap; implement persistent resume handler |
| Screen-off kills audio on some mobile browsers | Document limitation; recommend PWA install for better background audio |
| Medical/therapeutic claims risk | Legal copy review; "for entertainment and relaxation only" disclaimer |
| Copyright infringement on imported songs | User-responsibility disclaimer; no cloud upload of song files; local only |
| AI-generated music commercial rights | Confirm per provider; track provenance; default to non-AI generative engine |
| Long OfflineAudioContext renders blocking UI | Run in Web Worker; show progress indicator |
| Automation ramp conflicts with manual slider | Cancel scheduled values before manual override (already implemented) |

---

## Compliance and Legal Checklist

- [ ] "For relaxation and entertainment purposes only" — not medical advice
- [ ] No therapeutic or diagnostic claims in product copy or marketing
- [ ] Confirm commercial-use rights for any bundled audio samples
- [ ] AI-generated content: confirm output ownership per provider TOS
- [ ] User-uploaded songs: local-only, no cloud storage, user assumes copyright responsibility
- [ ] Accessibility: ensure UI is keyboard-navigable; ARIA labels on controls
- [ ] GDPR/CCPA: journal and state tracking data stays local unless user opts in to cloud

---

## Monetization Strategy

### Free Tier
- Full binaural engine
- Solfeggio + brainwave presets
- 3 guided journeys
- Session timer up to 30 min
- Noise layers
- Basic pad synth

### Pro Tier (~$7–12/month or $49 one-time)
- Unlimited session length
- All guided journeys
- Full soundscape library
- WAV export
- Stage sequencer (custom journeys)
- Visual resonance modes
- Session journal + state tracking
- AI frequency composer
- Song overlay

### Premium Add-ons
- Expert-curated journey packs (one-time purchase)
- HRV/EEG integration module
- Ritual experience pack (exclusive visuals + voice guidance)

---

## Technology Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| UI framework | React + TypeScript | Already chosen; strong ecosystem |
| Build tool | Vite | Fast, modern, already in use |
| Audio engine | Web Audio API (raw) | Maximum control, no abstraction overhead |
| Scheduling | Web Audio API clock (+ Tone.js later) | Web Audio clock is sample-accurate; JS timers drift |
| Beat detection | Meyda.js | Lightweight, Web Audio native, no WASM |
| WAV encoding | Custom (no deps) | Already implemented; no need for library |
| Offline rendering | OfflineAudioContext | Already implemented |
| Storage | localStorage → IndexedDB | localStorage for now; IndexedDB for large buffers/audio files |
| Cloud sync | TBD (Supabase or Firebase) | Phase 5 only |
| Mobile | PWA first | Best background audio support; native app later if needed |
| Visuals | Canvas 2D → WebGL | 2D for waveforms; WebGL for mandala/sacred geometry |

---

## Music Content Strategy

Moongate's primary product is **produced music tracks** composed and mixed specifically to work with binaural beats underneath. The binaural engine is the enhancement layer — the music is what users actually listen to. This is a critical gap to close.

### The Gap
- Users expect real music, not just noise + pad synth over a tone
- Tracks must be mastered for headphone listening — stereo integrity preserved, no mono collapse, binaural frequencies always audible through the mix
- Content library needs regular updates to drive retention and justify subscription

### Strategy: Path C — License Now, Generate Later

**Phase 1: Licensed Tracks (Ship Fast)**
Get to market with a real content library immediately:

- License royalty-free ambient music from:
  - **Artlist** (~$200/yr unlimited license, commercial use, sync rights)
  - **Epidemic Sound** (subscription, strong ambient/meditation catalog)
  - **Musicbed** (higher quality, higher cost, film-grade ambient)
  - **Pixabay / Freesound** (free tier, limited quality, good for prototyping)
- Curate 20–40 tracks at launch, tagged by goal (sleep / focus / meditate / explore)
- Each track professionally mixed to leave binaural frequencies audible:
  - Low mid frequencies kept clear (150–600 Hz) so carrier tones cut through
  - No heavy stereo widening that could interfere with binaural perception
  - Master volume headroom to mix under binaural bus without masking
- Track metadata: goal tags, brainwave target, recommended carrier frequency, duration
- New tracks added monthly — content calendar drives subscriber retention

**Phase 2: Generative Music Engine (The Moat)**
Build the long-term differentiator — music that generates itself, always fitting the current frequency and brainwave state:

- Expand the existing pad synth into a full generative ambient engine:
  - **Drone layer** — root + detuned unison, slow filter sweep
  - **Pad layer** — chord voicing (already built), slow volume breathing
  - **Pluck / bell layer** — scale-locked random melodic events, soft attack, long decay
  - **Bass pulse layer** — sub-frequency pulse at beat frequency (reinforces isochronic effect)
  - **Texture layer** — granular-style noise bursts, filtered and spatialized
- All layers are **scale-locked** to a key derived from the carrier frequency
  - Carrier → nearest musical root note (A=432, C=256, etc.)
  - Scale selection: major (activation), minor (introspection), pentatonic (universal)
  - Harmonic series aware — chord voicings built from natural overtones
- **Scene presets**: Deep Space, Forest Temple, Ocean Cave, Crystal Bowls, Storm Meditation
- Slow random modulation on all parameters — no two sessions sound identical
- Heavy convolution reverb + delay — spatial depth essential for immersion
- This approach is Endel's model — generative, infinite variation, no licensing cost, always fits the frequency

**Phase 3: AI Music Generation (Future)**
Once product-market fit is confirmed:
- **Stable Audio** (Stability AI) — text-to-audio API, ambient/meditation prompts
- **MusicGen via Replicate** — rapid prototyping, controllable style
- **Hugging Face Inference Endpoints** — self-hosted MusicGen for cost control
- **Self-host AudioCraft** — maximum control, no per-generation cost at scale
- AI-generated tracks rendered offline, reviewed for quality, added to library
- Personalized generation: "make me a 30-minute sleep track in the style of rain + singing bowls"

### Music Bus Architecture
The song/music layer lives on its own dedicated bus — never mixed into the binaural signal chain:

```
[Music Track / Generative Engine]
    └──► [Music Gain] ──► [Music EQ (HPF 80Hz, gentle LPF 14kHz)] ──► [Music Bus]
                                                                              │
[Binaural Bus] ─────────────────────────────────────────────────────────────┤
                                                                              │
[Noise Layer] ──────────────────────────────────────────────────────────────┤
                                                                              │
[Pad Synth] ────────────────────────────────────────────────────────────────┤
                                                                              ▼
                                                                       [Master Gain] ──► [Limiter] ──► Output
```

Rules:
- Music and binaural are **always on separate buses** — never summed before the master
- Music gain defaults to 60–70% so binaural frequencies remain perceptible
- Binaural bus gain is protected — never ducked below 20% regardless of music volume
- Music EQ cuts sub-bass (80 Hz HPF) to keep the carrier frequency region clean
- Stereo integrity enforced on music bus — no mono fold-down ever

### Content Tagging System
Every track (licensed or generated) is tagged:

```typescript
type MusicTrack = {
  id: string
  title: string
  durationSeconds: number
  goals: ('sleep' | 'focus' | 'meditate' | 'relax' | 'explore' | 'dream')[]
  brainwaveTarget: ('delta' | 'theta' | 'alpha' | 'beta' | 'gamma')[]
  recommendedCarrier: number      // Hz
  recommendedBeat: number         // Hz
  energy: 'very-low' | 'low' | 'medium'
  mood: 'dark' | 'neutral' | 'uplifting' | 'mystical'
  source: 'licensed' | 'generative' | 'ai'
  license: string
  tier: 'free' | 'premium'
}
```

### Licensing Compliance
- All licensed tracks must have explicit commercial-use rights confirmed
- No sync-license-only tracks (those can't be used in apps)
- Track provenance logged (source, license type, expiry if applicable)
- User-uploaded songs: local only, never uploaded to servers, user assumes copyright responsibility
- AI-generated tracks: confirm output ownership per provider TOS before shipping

---

## Backdrop Mode

**The app stays on underneath everything. Always.**

Most meditation and binaural apps pause or duck when the user opens Spotify, YouTube, a podcast, or takes a call. Backdrop Mode inverts this — the binaural and ambient layers are designed to run *persistently in the background*, mixing with whatever else the user is listening to.

The user sets it, forgets it, and it just works. They put on their focus playlist, their ambient music, their podcast — and the binaural engine is underneath all of it, quietly doing its job.

### What It Is
- A persistent low-level binaural + ambient layer that continues playing regardless of what other audio is active
- The user's other audio (Spotify, Apple Music, YouTube, podcasts, video calls) plays on top
- The app's audio ducks to a preset backdrop volume (default: ~20–30%) so it never fights the foreground audio
- Binaural frequencies remain audible through the mix at low volume — the effect persists even at low gain

### Why It Works
- Binaural beat perception works at surprisingly low volumes — the brain still follows the beat frequency even when it's subtle
- Most users who want focus benefits are also listening to music — this removes the "choose one" friction entirely
- It reframes the app from "thing you do instead of music" to "thing you add to everything"
- Huge retention driver — it becomes part of the user's daily routine without requiring dedicated listening time

### How It Works Technically

**Web / PWA (primary platform):**
- Web Audio API `AudioContext` with `{ latencyHint: 'playback' }` for background-optimized behavior
- **Wake Lock API** — `navigator.wakeLock.request('screen')` prevents device sleep during active backdrop sessions
- **Page Visibility API** — detect when app is backgrounded; keep audio context running, suspend only UI updates
- Audio context must be resumed on user gesture before backgrounding (browser autoplay policy)
- PWA installed to home screen gets better background audio treatment than browser tab on iOS/Android
- Service Worker keeps the app alive in background

**iOS specific (PWA / future native):**
- iOS interrupts Web Audio on phone calls and some system events — implement `AudioContext.onstatechange` handler to auto-resume
- AVAudioSession category must be set to `playback` with `mixWithOthers` flag (native app only)
- `mixWithOthers` is the key: tells iOS to mix with Spotify/Apple Music instead of ducking them
- Safari PWA has limited background audio support — native app wrapper (Capacitor or React Native) recommended for reliable iOS backdrop

**Android:**
- Chrome PWA has better background audio support than iOS
- Web Audio continues running when screen is off on most Android devices
- Request `AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK` so other apps keep playing alongside

**Desktop (browser):**
- Works natively — browser audio mixes with system audio by default
- No special handling needed beyond keeping the tab alive

### User Controls
- **Backdrop toggle** — one tap to enable/disable, prominent in the UI
- **Backdrop volume** — dedicated gain separate from main session volume (default 25%)
- **Backdrop profile** — choose what runs: binaural only / binaural + noise / binaural + pad / full session
- **Auto-backdrop** — option to always start new sessions in backdrop mode
- **Persistent OS notification** — shows while backdrop is active, keeps process alive on mobile, has a quick stop button

### Backdrop Profiles (Pre-built)
| Profile | What plays | Use case |
|---------|-----------|----------|
| Pure Binaural | Binaural tones only | Works under any music |
| Binaural + Rain | Binaural + brown noise | Podcast / work listening |
| Binaural + Pad | Binaural + breathing pad | Ambient / instrumental music |
| Deep Focus | Binaural (Beta) + light noise | Work sessions with music |
| Sleep Under | Binaural (Theta/Delta) only | Sleep with ASMR / white noise apps |
| Meditation Under | Binaural (Theta) + pad | Meditation music apps |

### Limitations + Mitigations
| Issue | Mitigation |
|-------|-----------|
| iOS Safari kills background audio after ~30 sec | Recommend PWA install; native app in roadmap; document clearly |
| Phone call interrupts audio context | `AudioContext.onstatechange` auto-resume handler |
| User confusion about what's playing | Persistent status indicator in notification + in-app badge |
| Binaural effect weakened at low backdrop volume | Minimum backdrop volume floor (15%); educate user that low volume still works |
| Battery drain from persistent audio | Efficient oscillator-only profile by default; battery warning |

### Implementation Phases
- **Phase 1 (PWA):** Page Visibility API + Wake Lock + auto-resume handler. Works on desktop and Android. Document iOS limitation.
- **Phase 2 (Native wrapper):** Capacitor shell around the PWA. Enables proper iOS `mixWithOthers` audio session. Unlocks App Store distribution.
- **Phase 3 (Native app):** Full React Native or Swift/Kotlin port if needed for HRV/EEG hardware integration.

---

Three tiers of parity, in order of impact:

### Tier 1 — Must-Have MVP Parity
These are table-stakes. Without them, the app can't compete.

- [x] **Goal-based onboarding flow** — 3-step first-run carousel (Welcome / How It Works / Free & Pro) ✅
- [ ] **Curated session library per goal** — pre-built sessions organized by outcome, not by frequency
- [x] **Headphone guidance** — persistent first-launch reminder ✅
- [ ] **Isochronic mode** — speaker-friendly, no headphones required (on roadmap)
- [x] **Quick-start sessions** — Quick Presets in Studio tab (Focus/Sleep/Relax/Energy) ✅
- [ ] **Background playback** — audio context keeps running when screen is off (PWA + wake lock API)
- [x] **Session timer + fade** — already built ✅
- [x] **Favorites / presets** — built, in Studio tab ✅
- [ ] **Educational layer** — what binaural beats are, brainwave ranges, headphone requirements
- [ ] **Benefit-first UI copy** — replace Hz values with intent labels in simple mode
- [ ] **Compliance-safe claims** — audit all copy for medical claims; add disclaimer

### Tier 2 — Subscription-Ready Parity
Required before charging money.

- [x] **Auth system** — Supabase email/password auth ✅
- [x] **Free vs. Pro entitlement** — feature gating via `is_pro` in Supabase DB, PRO_TABS intercept in App.tsx ✅
- [x] **Subscription plans** — Pro Monthly $5.99 / Pro Annual $39.99 (no free trial, no lifetime) ✅
- [x] **Web checkout** — Stripe Checkout (prebuilt redirect), serverless API route ✅
- [x] **Billing portal** — Manage Subscription via Stripe portal, serverless API route ✅
- [ ] **Cross-device activation** — entitlement tied to account (Supabase), but not tested cross-device
- [ ] **Restore purchases** flow
- [ ] **Simple cancellation** — via Stripe billing portal (no dark patterns)
- [ ] **Money-back guarantee** handling
- [ ] **Privacy policy + Terms of Service + Fulfillment policy** — visible in app and on web
- [x] **Social proof block** — testimonials on landing page ✅

### Tier 3 — Retention + Content Parity
Required to keep users coming back.

- [ ] **"Continue listening"** — resume last session from home screen
- [ ] **"Used recently"** — quick access to recent sessions
- [ ] **Featured + New sections** — editorial content curation
- [ ] **Subscriber-only content drops** — locked content visible to free users as upgrade incentive
- [ ] **Goal-focused playlists / packs** — curated collections (Sleep Pack, Focus Pack, etc.)
- [ ] **Frequent soundscape releases** — content calendar, new sessions added regularly
- [ ] **Time-of-day recommendations** — morning activation vs. evening wind-down suggestions
- [ ] **Help center** — FAQ covering: what binaural beats are, soundscapes, app features, billing, account management

---

```
✅ Done:   Binaural core + modulation controls
✅ Done:   Noise layers + filter + pad synth
✅ Done:   Automation ramp lanes (SVG editor)
✅ Done:   WAV export (Session tab + Studio tab, gated on enabled layers)
✅ Done:   Session journal — full build (mood 1–5, tags, notes, streak, search, manual add)
✅ Done:   Solfeggio + brainwave presets
✅ Done:   Isochronic tone generator (with live param updates)
✅ Done:   Mood EQ (5-slider blend: Ground/Relax/Focus/Dream/Ascend) — Tones tab, always visible
✅ Done:   Anti-Mood EQ (5-slider: Angry/Anxious/Sad/Scattered/Exhausted → healing frequency recipes) — Tones tab, always visible
✅ Done:   Layered soundscape mixer (8 layers, 7 scene presets)
✅ Done:   Ambient mode (standalone soundscape + noise without binaural session)
✅ Done:   Colored noise (blue + violet added to white/pink/brown)
✅ Done:   Music player (Music tab, 13 CC0 tracks, shuffle, volume)
✅ Done:   Music EQ (5-band: Sub/Bass/Mid/Presence/Air, ±12dB)
✅ Done:   Music seek bar (scrub with 250ms position updates, cached buffer)
✅ Done:   Pad synth standalone mode (runs without a binaural session)
✅ Done:   Pad synth — all params live-update without restart (volume/filter/reverb); waveform/note/chord/detune crossfade-restart in ~100ms
✅ Done:   Mini-player bar (persistent bottom bar, replaces Player/Visual tabs)
✅ Done:   AI Guided Meditation (GPT-4o-mini + OpenAI TTS, voice bus, saved sessions)
✅ Done:   Studio tab (Session Builder) — layer stack, scenes, journeys, presets, live preview
✅ Done:   Studio tutorial overlay (first-run, 5-step, localStorage dismiss)
✅ Done:   Journey builder — scene queue, sequential playback, countdown, crossfade controls
✅ Done:   Freemium paywall — Supabase auth, Stripe Checkout, free vs Pro feature gating
✅ Done:   Auth system — email/password, magic link, sign in/out, pro badge, poll-until-pro
✅ Done:   Stripe billing portal — Manage Subscription button, serverless API route
✅ Done:   Settings panel — Account, Subscription, Preferences, About; user dropdown
✅ Done:   Dark mode — full CSS vars overhaul, 4-step bg palette, consistent across all tabs
✅ Done:   Dark mode default — dark for new users, light pref respected
✅ Done:   Landing page — full green-theme rebuild, hero, features, 3-tier pricing, social proof
✅ Done:   Onboarding modal — 3-step first-run carousel (Welcome / How It Works / Free & Pro)
✅ Done:   Toast notification system — error states for audio, WAV export, billing portal
✅ Done:   SEO — Open Graph, Twitter Card, structured data JSON-LD, canonical URLs
✅ Done:   PWA — manifest, service worker (network-first + build-time cache bust), install prompt banner
✅ Done:   Vercel deployment (auto-deploy on push to main, serverless API routes)
✅ Done:   Stage Sequencer tab — brainwave journey timeline with ramps, pre-built stages, editable
✅ Done:   Benefit-first Tones tab — intent cards as hero UI, Hz behind ⚙ toggle
✅ Done:   Sound tab Animate! — slow organic drift per layer
✅ Done:   Sound tab scene crossfade — morphs when non-silent, hard-cut from silence
✅ Done:   Tones tab presets — saves full state (carrier/beat/wobble/filter/iso/tuning/Mood EQ), at bottom of tab
✅ Done:   AudioVisualizer strip — 3-zone (level | FFT | oscilloscope), theme-aware, above mini-player
✅ Done:   Unified button/tab theming — gradient active/hover, danger CSS vars, no hardcoded colors
✅ Done:   Canvas backgrounds — all canvas draws clearRect; CSS bg-card/bg-section shows through
✅ Done:   theme.css extracted — all CSS color vars in one file
✅ Done:   Service worker network-first + build-time cache bust (stamp-sw.mjs)

Pending assets (design work):
→  OG image (1200×630, dark bg, "Liminal" serif, green glow) → app/public/og-image.png
→  PWA icons → app/public/icons/icon-192.png + icon-512.png

In Progress:
→  (nothing actively in-flight)

Next:
→  Journey UX improvements (awaiting user feedback)
→  Session Planner Phase 2 — timeline canvas with drag-and-drop blocks
→  Master limiter + VU meter
→  Stereo width (mid/side) control
→  Pre-built guided journeys (8 journeys, wired to session planner)
→  Breath synchronization guide
→  Visual resonance interface (Canvas Lissajous first)
→  Ritual / dark mode
→  Sleep mode + Focus mode + Lucid dream mode
→  Song overlay + BPM sync
→  Auto BPM detection (Meyda)
→  Hardware integration (HRV/EEG)
→  Content platform + marketplace
→  Background playback (Media Session API + Wake Lock)
→  Daily state tracking with trends / heatmap (journal data exists, needs viz)
→  Supabase cloud journal sync (optional, for cross-device)
→  Stripe live mode + real money testing
→  Admin Console (Phase 1: read-only dashboard; Phase 2: controls + AI usage tracking)
```

---

## Session Planner

### Vision
A layer-based session composer. The user builds a full multi-layer audio experience of any length — choosing music tracks, soundscapes, binaural frequencies, noise types, pad synth, and solfeggio tones — and the engine plays it all back with automatic crossfading between segments.

### Architecture: Layer-Based (DAW-lite, not nodal)
Nodal (Max/MSP style) is too complex for wellness users. Layer-based is the right UX — think GarageBand's track lanes, simplified for non-engineers.

```
Session: 45 min
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎵 Music     [Lofi Beat ──────╳──── Chill Piano ──────]
🌊 Sound     [Rain ─────────────────────────────────── ]
🧠 Binaural  [Alpha 10Hz ──────────╳──── Theta 6Hz ── ]
📢 Noise     [─────────── Pink ──────────────────────  ]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       0min        15min       30min       45min
```

- Each layer has its own volume
- `╳` = crossfade transition point
- Layers can be enabled/disabled
- Total duration is user-set

### Phase 1 — Form-Based Planner (Building Now)
No timeline canvas yet — just a well-structured form that builds a playback schedule.

**Layers configurable:**
- 🎵 **Music** — select track(s), crossfade time, loop or advance
- 🌊 **Soundscape** — select scene or per-layer mix, duration
- 🧠 **Binaural** — carrier Hz, beat Hz (or brainwave preset), optional stage transition (start beat → end beat over session)
- 📢 **Noise** — type (white/pink/brown/blue/violet), volume
- 🎹 **Pad Synth** — on/off, volume, reverb, waveform
- 🔔 **Solfeggio** — select frequency, apply to carrier

**Session settings:**
- Total duration (5–180 min)
- Crossfade length (0–60 sec, default 10s)
- Fade in / fade out (already in engine)
- End chime on/off

**Output:**
- Saves as a named preset (JSON, localStorage)
- One-tap "Play Session" launches it
- Pre-built templates: Deep Sleep, Morning Activation, Focus Sprint, Meditation, Creative Flow

### Phase 2 — Timeline Canvas (Future)
- Drag-and-drop blocks on horizontal timeline
- Visual crossfade zones between blocks
- Per-block parameter editing
- Multiple music/sound blocks in sequence on the same layer
- Zoom in/out on timeline

### Crossfade Engine
When the planner runs:
1. At session start, schedule all audio events using Web Audio clock
2. For each layer transition: `linearRampToValueAtTime` to fade out current block, new source starts
3. Binaural transitions use `setTargetAtTime` for smooth Hz ramps
4. All scheduling done upfront using Web Audio timeline (sample-accurate, no JS timer drift)

---

## Admin Console

A superuser dashboard at `/admin`, gated by `is_admin: boolean` on the Supabase `profiles` row. Only Michael's user ID gets this flag. Everything else — including any Pro user — gets a 403 redirect.

### Access Control
- Route: `/admin` inside the React app (same Vite build, no separate deploy)
- Gate: `useAuth()` → check `is_admin === true`; redirect to `/app` if not
- No public link to `/admin` anywhere in the UI

---

### Phase 1 — Read-Only Dashboard (quick win, ~1 session)

#### 👥 Customers
- Full user list: email, joined date, plan (free/pro), last active, is_admin flag
- Search / filter by plan, date range, activity
- Click into a user → detail view: subscription history, AI usage, session count
- Export users to CSV

#### 💳 Revenue (Stripe API)
- MRR, ARR, total customers, churn estimate
- Recent transactions (last 20)
- Subscription breakdown: monthly vs. annual count
- Failed payments list

#### 🏥 Server / Site Health
- Vercel deployment status (latest deploy, commit SHA, build time) — via Vercel API
- Supabase health check (ping the PostgREST endpoint)
- Site speed: PageSpeed Insights API call (free, no key needed) → Performance score, LCP, FID, CLS
- Stripe webhook last received timestamp (from DB log or Stripe dashboard API)

#### 📊 AI Usage (once tracking schema is added — see Phase 2)
- Total AI calls today / week / month
- Total token count + estimated cost
- Top 10 users by AI usage
- Per-user AI usage (in user detail view)

---

### Phase 2 — Controls + AI Tracking (~1 session)

#### Schema Additions (Supabase)

```sql
-- AI usage log
CREATE TABLE ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  feature text,          -- 'meditation', 'composer', etc.
  model text,            -- 'gpt-4o-mini', 'tts-1-hd', etc.
  input_tokens int,
  output_tokens int,
  tts_chars int,
  estimated_cost_usd numeric(10,6)
);

-- Per-user limit overrides
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS limit_overrides jsonb DEFAULT '{}';
-- e.g. { "sessionMinutes": 120, "soundscapeCount": 10 }

-- Global app config (kill switches, flags)
CREATE TABLE app_config (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz DEFAULT now()
);
-- Keys: 'ai_enabled', 'new_signups_enabled', 'maintenance_mode', 'broadcast_message'
```

#### ⚙️ Account Controls
- Per-user actions: Grant Pro / Revoke Pro / Override limits / Delete account
- Limit overrides: set custom session length cap, soundscape count, AI calls/month
- Force sign-out (invalidate all sessions via Supabase Admin API)

#### 🔧 Global Controls
- Kill switches (stored in `app_config`):
  - Disable AI tab entirely
  - Disable new signups
  - Enable maintenance mode (shows banner to all users)
- Broadcast message: text field → saves to `app_config['broadcast_message']` → app reads it and shows a dismissible toast to all users on next load

#### 🤖 AI Usage Tracking
- Every AI call (meditation generation, TTS) writes a row to `ai_usage`
- Fields: user_id, feature, model, token counts, estimated cost
- Admin dashboard aggregates this into charts + per-user breakdown

#### 📋 Reports (Export)
- Users: CSV of all users with plan, joined, last active, AI usage total
- Revenue: CSV of Stripe transactions by date range
- AI usage: CSV of all AI calls with cost breakdown
- All exports use client-side CSV generation (no server needed)

---

### Implementation Notes
- No separate backend needed — all data reads from Supabase (users, AI usage) and Stripe API (revenue)
- Stripe API calls go through a serverless function (`/api/admin/stripe-summary`) so the secret key never hits the client
- PageSpeed call is client-side (public API, no key)
- `is_admin` check is both client-side (UX) and server-side (Supabase RLS on admin-only tables)
- Admin-only RLS: `ai_usage`, `app_config` tables have `USING (is_admin(auth.uid()))` policies

---

## Reference Links

- https://mynoise.net/NoiseMachines/binauralBrainwaveGenerator.php
- https://brainaural.com/
- https://www.tmsoft.com/blog/using-binaural-beats-app/
- https://zenmix.io/binaural-beat-generator
- https://brain.fm/
- https://endel.io/
- https://mynoise.net/NoiseMachines/windSeaRainNoiseGenerator.php (myNoise inspiration)
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- https://tonejs.github.io/
- https://meyda.js.org/
- https://essentia.upf.edu/essentiajs.html
- https://stability.ai/stable-audio (future AI music)
- https://replicate.com/meta/musicgen (future AI music)

---

## Build Log — Completed Features

### Phase 1 (Complete)
- Binaural core: carrier, beat freq, LFO (rate/depth/waveform/target), phase offset
- Session timer, fade in/out
- Presets (localStorage)
- Solfeggio + brainwave quick-select buttons
- LFO waveform selector, LFO target selector, amGain + dcOffset nodes
- Segmented control UI

### Phase 2 (Complete)
- White/pink/brown noise layers
- LPF/HPF BiquadFilter with resonance (binaural bus only)
- SVG automation ramp lanes (volume/filter/beat freq)
- Pad synth underlay (4-osc chord, ConvolverNode reverb, breathing LFO)
- WAV export (OfflineAudioContext + 16-bit PCM)
- Session journal (post-session modal + localStorage)
- Modular architecture: audioGraph.ts, padSynth.ts, noiseGen.ts, wavExport.ts

### AI Guided Meditation (Complete)
- `src/ai/meditationThemes.ts` — 10 keyword-mapped themes (abundance/528Hz, anxiety/396Hz, sleep/174Hz, etc.)
- `src/ai/meditationComposer.ts` — GPT-4o-mini script generation + OpenAI TTS (shimmer voice, tts-1-hd, 0.75x speed)
- `src/engine/voiceBus.ts` — dedicated Web Audio voice node, 1.5s convolution reverb, 70/30 dry/wet, starts at +10s
- `src/components/AiMeditationPanel.tsx` — modal with idle/generating/error states + SimCity-style animated progress
- `src/components/ApiKeySettings.tsx` — local OpenAI key (binaural-openai-key localStorage)
- `src/components/WaveformPlayer.tsx` — Canvas waveform, 800-point PCM, play/pause/scrub, MM:SS, ResizeObserver
- `src/ai/savedSessions.ts` — IndexedDB save/replay (no localStorage quota issues)
- Session options: duration (5–60 min), 6 voice choices (F/M), intensity (Gentle/Balanced/Deep), soundscape override
- Saved sessions panel: ▼ Preview (WaveformPlayer inline) + ▶ Launch Session
- Independent volume controls: Output / Binaural (15% default) / Background / Voice (80% default)
- Voice Reverb live slider (dry/wet crossfade)

### Music Content Strategy — Path C (Documented)
- Phase 1: Licensed tracks (Artlist/Epidemic Sound), 20–40 at launch, monthly drops
- Phase 2: Generative pad engine (drone/pad/pluck/bell/bass), scene presets, infinite variation
- Phase 3: AI music generation (Stable Audio, MusicGen, self-hosted AudioCraft)
- Separate music bus — never summed with binaural signal

### Backdrop Mode (Documented)
- Persistent binaural layer under any other audio (Spotify, podcasts, YouTube)
- PWA first (Wake Lock API, Page Visibility API)
- iOS: mixWithOthers AudioSession flag (Capacitor)
- Android: audio focus management
- 6 backdrop profiles

### Tabbed UI + Mobile (Complete)
- 5 tabs: 🎵 Tones / 🌊 Sound / ⏱ Session / ✨ AI / 📓 Journal
- TabNav: horizontal pills desktop, fixed bottom bar mobile
- Mobile: 44px tap targets, 16px inputs (iOS zoom prevention), bottom padding, full-width start button

### Layered Soundscape Mixer (Complete)
- `src/engine/soundscapeMixer.ts` — 8 named layers (Rain/Thunder/Wind/Waves/Fire/Forest/Space/Cave)
- Each layer: noise source + BiquadFilter (bandpass/lowpass/highpass tuned per sound) + gain
- `src/components/SoundscapeMixer.tsx` — scene presets + per-layer sliders
- 7 scene presets: Thunderstorm, Ocean, Forest Rain, Fireplace, Deep Space, Cave Drip, Custom
- Live gain updates via `updateLayerGain` during session
- Replaces old single noise type selector

---

## myNoise-Inspired Feature Backlog

Inspired by https://mynoise.net — the gold standard for layered ambient sound.

### 🎚 Layered Soundscape Mixer (BUILT — see above)
The core myNoise concept. Multiple simultaneous layers each with independent gain.

### 🌊 Animate! — LFO-Driven Layer Animation
myNoise's "Animate!" button slowly drifts layer levels over time.
Implementation: apply slow random LFO (0.01–0.05 Hz sine + slight random walk) to each active layer's gain node. Makes the soundscape feel alive — rain intensity rises and falls, thunder rumbles unpredictably.
- LFO rate per layer: `0.01–0.05 Hz` (very slow drift)
- Random walk component: add small noise offset each cycle
- "Animate" toggle per scene — on/off

### 🎧 Calibration EQ
myNoise lets users adjust output to their hearing/headphones.
Our version: 5-band graphic EQ on master output.
- Bands: 60 Hz / 250 Hz / 1 kHz / 4 kHz / 12 kHz
- ±12 dB per band
- Implemented as 5 BiquadFilter nodes in series on master bus
- "Flat" preset resets all to 0 dB
- Saved per-device to localStorage

### 🔔 Tinnitus Masking Mode
Pre-built layered combinations optimised for tinnitus relief.
- Notched noise: band-reject filter around tinnitus frequency (user-configured)
- Pink + brown blend at specific ratios
- Dedicated preset in soundscape scenes
- "Tinnitus Frequency" input (Hz)

### 📻 Scene Crossfade
Blend smoothly from one soundscape scene to another over 30 seconds.
- "Morph to →" button on scene select
- Crossfade via exponential gain ramps on each layer simultaneously
- Great UX — no jarring cuts between scenes

### 🎵 Isochronic Tones (Planned, no headphones needed)
- AM-modulated carrier, adjustable pulse width/depth
- Visible pulse on waveform display
- Speaker-friendly (works without headphones)
- Replaces or supplements binaural mode for non-headphone users

### 🧠 Stage Sequencer / Brainwave Journey Engine (Core Differentiator)
- Scheduled frequency ramps across states: Beta→Alpha→Theta→Delta
- Pre-built journeys: Deep Sleep Descent, Morning Activation, Creative Flow, etc.
- User-buildable: drag-and-drop timeline of stages
- Each stage: duration, target freq, beat, LFO settings, soundscape mix

### 👁 Visual Resonance Interface
- Canvas Lissajous figure driven by actual L/R oscillator values
- WebGL mandala expanding to WebGL sacred geometry
- Frequency-reactive — shape changes with beat and carrier
- Colour palette shifts with brainwave state

### 💨 Breath Synchronisation Guide
- Visual breathing guide overlay (expand/hold/release)
- Pre-set patterns: 4-7-8, box breathing, coherent (5s/5s), Wim Hof
- Synced to session stage (slower breathing pattern in delta stages)

### 🌅 Goal-Based Onboarding (Moongate Parity Tier 1)
- First screen: intent picker (Sleep / Relax / Focus / Meditate / Explore)
- No Hz values shown — intent maps to frequency automatically
- Simplified UI mode for new users, Pro mode toggle for power users

### 🔄 Daily State Tracking
- Pre-session mood check (1–5 scale + emoji)
- Post-session mood check
- Sleep quality log
- Streak tracking (consecutive days)
- Trends view in Journal tab

### 🎙 Voice Commands
- "Start sleep session" / "Stop" / "Deeper"
- Web Speech API — no extra dependency
- Hands-free during meditation

### 🔊 Binaural + Isochronic Hybrid
- Run binaural beats simultaneously with isochronic pulses
- Different target frequencies (e.g. binaural for theta, isochronic pulse for alpha entrainment check)
- Independent buses, mixed at master

### 🛜 Offline PWA (Done ✅)
- Service Worker (cache-first) caching app shell
- Web App Manifest — name, icons, theme color, standalone display
- Install prompt banner (dismissible, localStorage)
- Works with zero network after first load
- PWA icons needed: icon-192.png + icon-512.png (design pending)
- Backdrop mode requires PWA install for full background audio
