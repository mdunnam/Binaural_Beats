# Binaural Beats — Mental State Control System

A browser-based audio tool for guiding mental states through binaural beats, solfeggio frequencies, generative soundscapes, and guided session modes.

---

## What it is

Not a frequency generator. A mental state control system that combines:

- **Binaural beats and isochronic tones** — carrier + beat frequency engine with LFO, phase offset, and full manual control
- **Dynamic brainwave transitions** — session journeys that move the brain from Beta → Alpha → Theta → Delta over time (frequency following response)
- **Generative soundscapes** — 23-layer ambient mixer with scene presets, per-layer gain and stereo pan, crossfade looping
- **Guided modes** — Focus, Sleep, Lucid Dream, Ritual with pre-built stage sequences
- **Music player** — import tracks, 5-band EQ, tap tempo, auto BPM detection
- **Visual interface** — Lissajous, Mandala, Pulse, Spectrum visualizers driven by live audio values
- **Session journal** — log state and notes after each session

---

## Tech stack

- React + TypeScript + Vite
- Web Audio API (all audio synthesis and processing — no external audio libraries)
- Deployed on Vercel

---

## Key features

### Binaural core
- Carrier frequency (Hz) + binaural beat frequency (Hz) controls
- LFO modulation on beat frequency
- Isochronic pulse mode (works without headphones)
- Phase offset control
- Preset library for common brainwave states
- Solfeggio frequency alignment

### Sound design
- Generative pad synth — 4-oscillator, convolver reverb, breathing LFO
- White / pink / brown noise layers with filter shaping
- WAV export via OfflineAudioContext render
- Per-parameter automation lanes in the studio tab

### Guided modes
- **Focus** — Beta-arc sessions (25–90 min)
- **Sleep** — 2–8 hour Delta descent journey
- **Lucid Dream** — REM-cycle Theta journey (4–8 hours)
- **Ritual** — configurable ceremony arc with solfeggio alignment

### Soundscape mixer
- 23 layers: rain, thunder, wind, waves, fire, forest, space, cave, stream, birds, cafe, night, fan, bowl, beach-calm, city, underwater, monastery, train, library, storm-heavy, meadow, beach-surf
- 18 pre-built scenes: off, storm, ocean, forest, fire, space, cave, custom, stream, cafe, night, bowl, beach, underwater, monastery, focus-train, meadow, beach-surf
- Per-layer gain slider with smooth fade-in/out
- Per-layer stereo pan slider with L/R labels (-1 to +1)
- "Spatial" preset — applies semantically tuned pan positions per layer
- Crossfade loop playback — sample layers loop via 2.5s overlap crossfade (no hard cuts)

### Music player
- Import local audio tracks
- 5-band parametric EQ
- Tap tempo (averages last 8 taps)
- Auto BPM detection — RMS onset autocorrelation on first 90s of imported audio, result feeds "Sync to Beat"

### Visual interface
- Lissajous figure (L/R channel phase plot)
- Mandala (sacred geometry driven by beat frequency)
- Pulse (amplitude envelope visualizer)
- Spectrum analyzer (FFT)
- 4 color themes

### AI features
- AI meditation script generation
- Journey composer — AI-assisted stage sequence builder

### Session journal
- Per-session notes and state rating
- Session history log

---

## Audio samples

All field recordings are CC0 (public domain). Sources:

| Layer | Source |
|-------|--------|
| rain | freesound #518863 (idomusics) — balcony rain, 54s |
| fire | freesound #484338 (BonnyOrbit) — dying embers, 2:04 |
| train | freesound #455045 (ProductionNow) — cargo train loop, 51s |
| storm-heavy | freesound #811467 (designerschoice) — heavy rain + thunder, 5:55 |
| meadow | freesound #810416 (bruno.auzet) — summer meadow France, 4:22 |
| beach-surf | freesound #215574 (ProductionNow) — crashing waves + wind, 7:18 |

---

## Dev setup

```bash
cd app
npm install
npm run dev
```

Runs on `http://localhost:5173` by default.

---

## Deploy

Hosted on Vercel. Auto-deploys on push to `main`.
