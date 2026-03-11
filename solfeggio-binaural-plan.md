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

## Module Architecture (Current + Target)

```
src/
  types.ts                        ← all shared types
  App.tsx                         ← root component

  engine/
    audioGraph.ts                 ← binaural graph (oscs, LFO, filter, AM)
    padSynth.ts                   ← generative pad synth (4-osc, convolver reverb)
    noiseGen.ts                   ← white/pink/brown noise buffers
    wavExport.ts                  ← OfflineAudioContext render + WAV encoder
    isochronic.ts                 ← isochronic pulse engine (TODO)
    transitionEngine.ts           ← brainwave state transition scheduler (TODO)
    limiter.ts                    ← DynamicsCompressorNode master limiter (TODO)
    meter.ts                      ← AnalyserNode RMS metering (TODO)
    songBus.ts                    ← imported audio file bus (Phase 3)
    beatDetector.ts               ← Meyda-based BPM / onset detector (Phase 4)

  components/
    AutomationEditor.tsx          ← SVG multi-lane automation editor
    SessionJournal.tsx            ← session log + post-session modal
    FrequencyPresets.tsx          ← solfeggio + brainwave quick-select (TODO extract)
    StageSequencer.tsx            ← brainwave journey builder (TODO)
    VisualResonance.tsx           ← canvas Lissajous / sacred geometry (TODO)
    BreathGuide.tsx               ← breathing pulse overlay (TODO)
    SoundscapeLayer.tsx           ← per-layer ambient sound controls (TODO)
    SongOverlay.tsx               ← song import + BPM sync (Phase 3)

  data/
    solfeggioFrequencies.ts       ← frequency library with descriptions
    brainwavePresets.ts           ← brainwave band definitions
    guidedJourneys.ts             ← pre-built session journeys
    breathPatterns.ts             ← breathing rhythm definitions
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

### 🔲 Phase 3 — Dynamic Journeys (NEXT)

#### 3a — Isochronic Tone Generator
- Amplitude-modulated sine carrier at target beat frequency
- Adjustable pulse width (duty cycle 10–90%)
- Adjustable modulation depth (0–100%)
- Can run alongside binaural or standalone (no-headphone mode)
- Tone shape: sine, triangle, or noise burst
- Independent gain on isochronic bus

#### 3b — Brainwave State Transition Engine
The core differentiator. A stage sequencer that builds a journey:

```
Stage 1: Beta  → 18 Hz beat, 5 min
Stage 2: Alpha → 10 Hz beat, 5 min  (smooth ramp between stages)
Stage 3: Theta → 6 Hz beat, 10 min
Stage 4: Deep Theta → 3 Hz beat, 10 min
```

Implementation:
- Each stage has: beat frequency target, carrier target, duration, optional LFO changes
- Transitions between stages are smoothly ramped (linear or sigmoid)
- Stage transitions trigger Web Audio `linearRampToValueAtTime` calls
- Stage sequencer is independent of the manual automation lanes (both can coexist)
- Stage editor UI: drag-to-reorder, add/remove stages, per-stage parameter controls

#### 3c — Pre-built Guided Journeys
Ship with at least 8 built-in journeys:

| Journey | Stages | Duration |
|---------|--------|----------|
| Deep Sleep | Beta → Alpha → Theta → Delta | 60 min |
| Creative Flow State | Alpha → Theta → Alpha | 30 min |
| Lucid Dream Induction | Theta → Theta/Delta boundary | 45 min |
| Morning Activation | Delta → Theta → Alpha → Beta | 20 min |
| Stress Reset | Beta → Alpha | 15 min |
| Deep Meditation | Alpha → Theta → Deep Theta | 40 min |
| Astral Exploration | Theta sustained with slow descent | 60 min |
| Focus Sprint | Beta sustained with light Alpha dip | 25 min |

Each journey also defines: carrier frequency, noise type/volume, pad synth on/off, LFO settings.

#### 3d — Soundscape Layers
Multi-layer environmental sound design:
- Rain (light / heavy / storm)
- Ocean (waves / deep / shore)
- Wind (forest / mountain / cave)
- Fire (crackling / distant)
- Cave / cavern ambience
- Forest (day / night)
- Tibetan bowls (slow random strikes)
- Drone (adjustable pitch, slow filter sweep)

Per-layer controls:
- Volume
- Stereo width (mono → wide)
- Spatial pan position
- Randomness/variation intensity

All layers are audio buffer sources loaded from bundled files. No network dependency.

#### 3e — Breath Synchronization
Optional breathing guide that pulses with the audio:
- Patterns: 4-7-8, box breathing (4-4-4-4), slow meditation (5-5), coherent breathing (5.5-5.5)
- Visual pulse overlay (subtle expanding ring or fill animation)
- Audio breath cue option (soft tone pulse at inhale/exhale)
- Sync to session timer or run independently

---

### 🔲 Phase 4 — The Experience

#### 4a — Visual Resonance Interface
A real-time visual representation of the audio state. Not decorative — driven by actual oscillator values.

Options (offer multiple visual modes):
- **Lissajous figure** — L/R oscillator plotted X vs Y on a Canvas. Creates beautiful patterns that change with frequency ratio and phase offset
- **Oscillating mandala** — radial geometry that pulses at the beat frequency, rotates at the carrier
- **Waveform rings** — concentric rings that ripple at LFO rate
- **Sacred geometry** — Flower of Life, Metatron's Cube, slowly rotating, pulsing at beat frequency

Implementation:
- `requestAnimationFrame` loop reading AnalyserNode data
- Canvas 2D or WebGL (WebGL for mandala/sacred geometry)
- User can select visual mode
- Fullscreen mode with minimal UI

This is shareable. People will screenshot it. It's a marketing asset as much as a feature.

#### 4b — Ritual / Dark Mode
A fully immersive experience mode:
- Black UI, minimal controls visible
- Large visual resonance display
- Slow fade-in of UI elements only on hover
- Optional: guided voice overlay (AI TTS, Phase 5)
- Designed for intentional, ceremonial use sessions

#### 4c — Daily State Tracking
After each session, log:
- Mood before / after (1–5 scale or emoji)
- Energy level before / after
- Sleep quality (for sleep sessions)
- Free notes (already built in journal)

Over time, display:
- Which presets / journeys produce best mood outcomes for this user
- Weekly consistency heatmap (like GitHub contribution graph)
- Trend charts: mood over time, session frequency

Storage: localStorage for now, optional cloud sync later.

#### 4d — Sleep Mode
Specialized long-session design:
- 2–8 hour programs
- Slow frequency descent: Beta → Alpha → Theta → Delta over the full duration
- Optional sleep timer (auto-stop after N hours)
- Ultra-gentle fade-in to avoid startle
- Morning alarm option: slow ascent back to Alpha/Beta
- Screen-off friendly (audio context keeps running with screen off on most browsers; iOS has quirks)

#### 4e — Focus Mode
Minimal distraction design for work sessions:
- Stable alpha/low-beta range (8–18 Hz)
- Light, non-distracting visuals (or no visuals)
- Pomodoro-compatible: work blocks + short break transitions
- Optional gamma burst injection (brief 40 Hz pulse) for attention spikes
- Notification-style end-of-session alert

#### 4f — Lucid Dream Mode
Specialized design for REM-cycle timing:
- Session designed around 90-minute sleep cycles
- Theta patterns during initial descent
- MILD-compatible timing cues at estimated REM entry
- Dream cue audio (subtle tone pattern to trigger lucidity)
- Optional reality check reminder audio
- Long sessions (4–8 hours) with cycle-aware frequency shifts

---

### 🔲 Phase 5 — Intelligence Layer

#### 5a — AI Frequency Composer
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

#### 5b — Song Overlay (Phase 3 holdover)
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

Three tiers of parity, in order of impact:

### Tier 1 — Must-Have MVP Parity
These are table-stakes. Without them, the app can't compete.

- [ ] **Goal-based onboarding flow** — first screen is "What do you want?" (Sleep / Relax / Focus / Meditate / Explore). No Hz values, no sliders. Just intent.
- [ ] **Curated session library per goal** — pre-built sessions organized by outcome, not by frequency
- [ ] **Headphone guidance** — persistent first-launch reminder, with isochronic fallback CTA for speaker users
- [ ] **Isochronic mode** — speaker-friendly, no headphones required (already on roadmap, now a parity requirement)
- [ ] **Quick-start sessions** — tap goal → session starts in under 5 seconds, no configuration required
- [ ] **Background playback** — audio context keeps running when screen is off / app is backgrounded (PWA + wake lock API)
- [ ] **Session timer + fade** — already built
- [ ] **Favorites / presets** — already built, needs goal-tagging
- [ ] **Educational layer** — what binaural beats are, brainwave ranges, headphone requirements. Inline tooltips or a "Learn" tab
- [ ] **Benefit-first UI copy** — replace "Carrier Frequency: 432 Hz" with "Deep Meditation Tone" as the default label. Technical values visible in Pro mode only
- [ ] **Compliance-safe claims** — audit all copy for medical claims; add "for relaxation and entertainment" disclaimer

### Tier 2 — Subscription-Ready Parity
Required before charging money.

- [ ] **Auth system** — email sign-in (magic link or password). Supabase or Firebase Auth
- [ ] **Free vs. Pro entitlement** — feature gating, server-side entitlement check
- [ ] **Subscription plans** — monthly + annual (annual = highlighted as popular), free trial
- [ ] **Web checkout** — Stripe or RevenueCat integration
- [ ] **Cross-device activation** — entitlement tied to account, not device
- [ ] **Restore purchases** flow
- [ ] **Simple cancellation** — no dark patterns
- [ ] **Money-back guarantee** handling
- [ ] **Privacy policy + Terms of Service + Fulfillment policy** — visible in app and on web
- [ ] **Social proof block** — ratings, testimonials, user counts on landing/paywall

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
✅ Done:   WAV export
✅ Done:   Session journal
✅ Done:   Solfeggio + brainwave presets

Next:
→  Isochronic tone generator
→  Master limiter + VU meter
→  Stereo width (mid/side) control
→  Stage sequencer (brainwave journey builder)
→  Pre-built guided journeys (8 journeys)
→  Soundscape layers (bundled audio files)
→  Breath synchronization guide
→  Visual resonance interface (Canvas Lissajous first)
→  Ritual / dark mode
→  Daily state tracking (mood log)
→  Sleep mode + Focus mode + Lucid dream mode
→  AI frequency composer (template system first)
→  Song overlay + BPM sync
→  Auto BPM detection (Meyda)
→  Hardware integration (HRV/EEG)
→  Content platform + marketplace
```

---

## Reference Links

- https://mynoise.net/NoiseMachines/binauralBrainwaveGenerator.php
- https://brainaural.com/
- https://www.tmsoft.com/blog/using-binaural-beats-app/
- https://zenmix.io/binaural-beat-generator
- https://brain.fm/
- https://endel.io/
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- https://tonejs.github.io/
- https://meyda.js.org/
- https://essentia.upf.edu/essentiajs.html
- https://stability.ai/stable-audio (future AI music)
- https://replicate.com/meta/musicgen (future AI music)
