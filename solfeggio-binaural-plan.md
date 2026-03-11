# Solfeggio Binaural Beats App Plan

## Product Goal
Build an app for solfeggio-style sessions with full binaural beat control, sound wobble/modulation controls, ambient sound design, and optional song overlay and beat sync.

## Core Vision
- Let users tune any carrier frequency.
- Let users control beat frequency difference between ears.
- Provide deep modulation controls (wobble/LFO/FM/AM).
- Support relaxing session design with ambient layers.
- Add song overlay and sync as later phases.

## Scope Summary
### In Scope (Early)
- Pure binaural generator with headphone-first experience.
- Session controls and presets.
- Ambient/noise layering.

### In Scope (Later)
- Import song and overlay binaural bus.
- Manual BPM sync and tap tempo.
- Optional automatic beat detection.

### Stretch Goals
- Tranquil music generation layer.
- Adaptive modulation tied to song beat grid.

## Audio Model (Engine-First)
Treat this as an audio engine project, not an API-first project.

### Recommended Stack
- Web Audio API as the low-level engine.
- Tone.js for timing, scheduling, transport, and modulation convenience.
- Meyda or Essentia.js for beat/BPM/onset analysis in advanced phases.

### Internal Signal Graph (Initial)
- Left tone oscillator (carrier).
- Right tone oscillator (carrier + beat difference).
- Optional sub layer.
- Optional noise layer (white/pink/brown).
- Optional ambient/music layer.
- Master bus (gain, limiter, meter).

### Binaural Rule
- Left ear frequency = carrier.
- Right ear frequency = carrier + beat difference.

Example:
- Carrier: 432 Hz
- Beat difference: 6 Hz
- Left: 432 Hz
- Right: 438 Hz

## Feature Plan
## Phase 1 (MVP)
- Carrier frequency control (Hz).
- Beat frequency control (Hz difference).
- Left/right independent tuning.
- Wobble controls: rate, depth, waveform, target.
- Session timer with fade in/fade out envelope.
- Presets (focus/calm/sleep style sessions).
- Headphone reminder and safety notes.

## Phase 2 (Sound Design)
- Noise layers (white, pink, brown).
- Ambient layers (pads/drones/rain/ocean).
- Filters (HPF/LPF + resonance).
- Stereo width/pan controls.
- Export rendered session to WAV.

## Phase 3 (Song Overlay)
- Import song/audio file.
- Keep binaural on a dedicated bus.
- Separate gain/EQ/stereo controls for binaural bus.
- Manual BPM sync.
- Tap tempo.

## Phase 4 (Intelligent Sync)
- Optional BPM auto-detection.
- Onset/beat-grid alignment.
- Adaptive modulation to beat grid.
- Reliability fallbacks for ambient/rubato tracks.

## Control Surface (Pro-Level)
- Carrier frequency (Hz).
- Beat frequency (Hz).
- Phase offset.
- AM depth/rate.
- FM depth/rate.
- LFO shape (sine/triangle/square/random).
- Channel blend/isolation.
- Automation lanes over session timeline.

## Tranquil Music Layer (Stretch)
Do not block MVP on AI generation.

Recommended intermediate step:
- Build non-AI generative ambient engine first:
  - Drone synth.
  - Pad synth.
  - Soft pluck/bell layer.
  - Slow random modulation.
  - Reverb and delay.
  - Scale/key lock.
  - Scene presets.

Then evaluate AI generation options later.

## AI Music Options (Future)
- Stable Audio (Stability AI) for API-based generation.
- Replicate + MusicGen for rapid prototyping.
- Hugging Face Inference Endpoints for managed model hosting.
- Self-host MusicGen/AudioCraft for maximum control.

## Risks and Constraints
- Binaural effect is strongest with headphones.
- Loud or dense music can mask binaural perception.
- Stereo processing/mono collapse can weaken effect.
- Avoid medical/therapeutic claims unless legally supported.
- Copyright and redistribution risk when importing commercial songs.

## Compliance and Licensing Checklist
- Confirm commercial-use rights for generated outputs.
- Confirm output ownership terms by provider.
- Track provenance/licensing assumptions.
- Define policy for user-uploaded copyrighted songs.

## Build Order Recommendation
1. Build the binaural core and modulation controls.
2. Add ambient/noise and polish UX.
3. Add song overlay with manual sync.
4. Add auto-sync and advanced analysis.
5. Add AI tranquil generation only after product-market fit signals.

## Reference Links
- https://mynoise.net/NoiseMachines/binauralBrainwaveGenerator.php
- https://brainaural.com/
- https://www.tmsoft.com/blog/using-binaural-beats-app/
- https://zenmix.io/binaural-beat-generator
