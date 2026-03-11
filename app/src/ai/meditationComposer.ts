import { matchTheme } from './meditationThemes'

export type TtsVoice = 'shimmer' | 'nova' | 'alloy' | 'onyx' | 'echo' | 'fable'
export type VoiceGender = 'female' | 'male'

export const VOICE_OPTIONS: { voice: TtsVoice; gender: VoiceGender; label: string; description: string }[] = [
  { voice: 'shimmer', gender: 'female', label: 'Shimmer', description: 'Warm & raspy' },
  { voice: 'nova',    gender: 'female', label: 'Nova',    description: 'Clear & bright' },
  { voice: 'alloy',   gender: 'female', label: 'Alloy',   description: 'Neutral & smooth' },
  { voice: 'onyx',    gender: 'male',   label: 'Onyx',    description: 'Deep & resonant' },
  { voice: 'echo',    gender: 'male',   label: 'Echo',    description: 'Calm & clear' },
  { voice: 'fable',   gender: 'male',   label: 'Fable',   description: 'Warm & rich' },
]

export const DEFAULT_FEMALE_VOICE: TtsVoice = 'shimmer'
export const DEFAULT_MALE_VOICE: TtsVoice = 'onyx'

export type MeditationSessionConfig = {
  carrier: number
  beat: number
  brainwaveTarget: string
  noiseType: string
  noiseVolume: number
  padEnabled: boolean
  sessionMinutes: number
  scriptTone: string
  theme: string
}

export type GeneratedMeditation = {
  config: MeditationSessionConfig
  script: string
  audioUrl: string
  audioBlob: Blob
}

export type MeditationOptions = {
  durationMinutes?: number
  voice?: TtsVoice
  intensity?: 'gentle' | 'balanced' | 'deep'
  soundscape?: 'auto' | 'rain' | 'ocean' | 'forest' | 'space' | 'silence'
}

// ---------------------------------------------------------------------------
// Script chunker — splits at sentence boundaries to stay under TTS 4096-char limit
// ---------------------------------------------------------------------------
function splitIntoChunks(text: string, maxChars = 3800): string[] {
  if (text.length <= maxChars) return [text]
  const sentences = text.match(/[^.!?]+[.!?]+\s*/g) ?? [text]
  const chunks: string[] = []
  let current = ''
  for (const sentence of sentences) {
    if ((current + sentence).length > maxChars && current.length > 0) {
      chunks.push(current.trim())
      current = sentence
    } else {
      current += sentence
    }
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks
}

// ---------------------------------------------------------------------------
// Audio concatenation — decode multiple blobs, stitch AudioBuffers, return WAV
// ---------------------------------------------------------------------------
async function concatenateAudioBlobs(blobs: Blob[]): Promise<Blob> {
  if (blobs.length === 1) return blobs[0]

  const ctx = new AudioContext()
  const buffers: AudioBuffer[] = []

  for (const blob of blobs) {
    const ab = await blob.arrayBuffer()
    const decoded = await ctx.decodeAudioData(ab)
    buffers.push(decoded)
  }
  await ctx.close()

  const sampleRate = buffers[0].sampleRate
  const numChannels = buffers[0].numberOfChannels
  const totalFrames = buffers.reduce((sum, b) => sum + b.length, 0)

  // Build interleaved 16-bit PCM
  const int16 = new Int16Array(totalFrames * numChannels)
  let writePos = 0
  for (const buf of buffers) {
    for (let i = 0; i < buf.length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = buf.getChannelData(ch)[i]
        int16[writePos++] = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)))
      }
    }
  }

  // WAV header
  const dataBytes = int16.byteLength
  const wavBuffer = new ArrayBuffer(44 + dataBytes)
  const v = new DataView(wavBuffer)
  const s = (off: number, str: string) => { for (let i = 0; i < str.length; i++) v.setUint8(off + i, str.charCodeAt(i)) }
  s(0, 'RIFF'); v.setUint32(4, 36 + dataBytes, true)
  s(8, 'WAVE'); s(12, 'fmt '); v.setUint32(16, 16, true)
  v.setUint16(20, 1, true)                              // PCM
  v.setUint16(22, numChannels, true)
  v.setUint32(24, sampleRate, true)
  v.setUint32(28, sampleRate * numChannels * 2, true)   // byte rate
  v.setUint16(32, numChannels * 2, true)                // block align
  v.setUint16(34, 16, true)                             // bits per sample
  s(36, 'data'); v.setUint32(40, dataBytes, true)
  new Int16Array(wavBuffer, 44).set(int16)

  return new Blob([wavBuffer], { type: 'audio/wav' })
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------
export async function generateMeditation(
  prompt: string,
  apiKey: string,
  options: MeditationOptions = {},
): Promise<GeneratedMeditation> {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('OpenAI API key is required. Please add it in Settings.')
  }

  const theme = matchTheme(prompt)
  const durationMinutes = options.durationMinutes ?? theme.sessionMinutes
  const voice: TtsVoice = options.voice ?? 'shimmer'
  const intensity = options.intensity ?? 'balanced'
  const soundscape = options.soundscape ?? 'auto'

  const config: MeditationSessionConfig = {
    carrier: theme.carrier,
    beat: theme.beat,
    brainwaveTarget: theme.brainwaveTarget,
    noiseType: theme.noiseType,
    noiseVolume: theme.noiseVolume,
    padEnabled: theme.padEnabled,
    sessionMinutes: durationMinutes,
    scriptTone: theme.scriptTone,
    theme: theme.keywords.length > 0 ? theme.keywords[0] : 'general',
  }

  // Step 1 — generate script
  const intensityInstruction =
    intensity === 'gentle'
      ? 'Use soft, light guidance. Don\'t push too deep. Keep it accessible and comfortable. Short visualisations, gentle affirmations.'
      : intensity === 'deep'
      ? "Go deep. Use rich, immersive hypnotic language. Long extended visualisations. Invite the listener to surrender completely. Use repetition and deepening phrases like 'deeper still', 'even deeper now'. This is for experienced practitioners."
      : ''

  const systemPrompt = `You are a deeply experienced meditation guide with a slow, intimate, hypnotic voice. Write a guided meditation script based on the user's intent.
Rules:
- Duration: ${durationMinutes} minutes when read at a very slow, deeply relaxed pace with long pauses
- Tone: ${config.scriptTone}${intensityInstruction ? `\n- ${intensityInstruction}` : ''}
- Use long, flowing sentences. Short sentences should be rare and used only for emphasis.
- Include generous [PAUSE 5s] and [PAUSE 10s] markers — more pauses than you think you need
- Leave space for the listener to breathe and sink deeper between phrases
- Opening: slow grounding breath awareness, invite the body to completely release (1-2 min)
- Core: rich, immersive visualisation or affirmations on the theme (main duration)
- Closing: very gentle, unhurried return to awareness (1-2 min)
- Do NOT include any section headers or stage labels — just the spoken words and pause markers
- Keep language sensory, present tense, second person ("you")
- Avoid clinical or instructional language — speak as if whispering directly into someone's ear`

  const chatRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
    }),
  })

  if (chatRes.status === 429) throw new Error('OpenAI rate limit reached. Please wait a moment and try again.')
  if (!chatRes.ok) {
    const errText = await chatRes.text().catch(() => chatRes.statusText)
    throw new Error(`Script generation failed (${chatRes.status}): ${errText}`)
  }

  const chatData = await chatRes.json() as { choices: { message: { content: string } }[] }
  const script = chatData.choices[0]?.message?.content ?? ''

  // Step 2 — TTS (chunk if needed)
  const ttsInput = script.replace(/\[PAUSE \d+s\]/g, '').replace(/\s+/g, ' ').trim()
  const chunks = splitIntoChunks(ttsInput)
  const audioBlobs: Blob[] = []

  for (const chunk of chunks) {
    const ttsRes = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'tts-1-hd', voice, input: chunk, speed: 0.75 }),
    })

    if (ttsRes.status === 429) throw new Error('OpenAI rate limit reached during voice rendering. Please wait and try again.')
    if (!ttsRes.ok) {
      const errText = await ttsRes.text().catch(() => ttsRes.statusText)
      throw new Error(`Voice rendering failed (${ttsRes.status}): ${errText}`)
    }

    audioBlobs.push(await ttsRes.blob())
  }

  const audioBlob = await concatenateAudioBlobs(audioBlobs)
  const audioUrl = URL.createObjectURL(audioBlob)

  // Apply soundscape override
  const SOUNDSCAPE_MAP: Record<string, { noiseType: string; noiseVolume: number }> = {
    auto:    { noiseType: theme.noiseType,  noiseVolume: theme.noiseVolume },
    rain:    { noiseType: 'pink',           noiseVolume: 0.15 },
    ocean:   { noiseType: 'brown',          noiseVolume: 0.18 },
    forest:  { noiseType: 'pink',           noiseVolume: 0.1  },
    space:   { noiseType: 'none',           noiseVolume: 0    },
    silence: { noiseType: 'none',           noiseVolume: 0    },
  }
  const soundscapeConfig = SOUNDSCAPE_MAP[soundscape] ?? SOUNDSCAPE_MAP['auto']
  config.noiseType = soundscapeConfig.noiseType
  config.noiseVolume = soundscapeConfig.noiseVolume

  return { config, script, audioUrl, audioBlob }
}
