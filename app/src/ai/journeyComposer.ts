import type { Journey, JourneyStage } from '../engine/journeyEngine'
import { beatToColor } from '../engine/journeyEngine'

export type JourneyIntent = {
  goal: string
  durationMinutes: number
  stageCount: number
  style: 'gentle' | 'balanced' | 'deep'
}

const SYSTEM_PROMPT = (intent: JourneyIntent) => `You are an expert in brainwave entrainment, binaural beats, and consciousness research.
Your job is to design a personalized brainwave journey for a user's specific intention.

Return ONLY valid JSON — no markdown, no explanation. The JSON must match this schema exactly:

{
  "name": "string (emoji + descriptive name, e.g. '🌊 Ocean Descent')",
  "stages": [
    {
      "label": "string (evocative stage name, e.g. 'Release')",
      "carrier": number (Hz, pick from solfeggio: 174, 285, 396, 417, 432, 528, 639, 741, 852, 963),
      "beat": number (Hz, 0.5–40, appropriate for goal),
      "wobbleRate": number (Hz, 0.05–2.0, lower = more meditative),
      "durationMinutes": number (integer, each stage 3–20 min, total must equal ${intent.durationMinutes}),
      "soundsceneId": string (one of: "off", "rain", "thunder", "wind", "waves", "fire", "forest", "space", "cave")
    }
  ]
}

Rules:
- Number of stages: exactly ${intent.stageCount}
- Total duration of all stages must equal exactly ${intent.durationMinutes} minutes
- Choose carrier frequencies from the solfeggio scale only
- Match soundscape to the emotional arc of the journey
- For sleep: descend from beta/alpha → theta → delta
- For focus: ascend from alpha → beta, sustain high
- For meditation: dwell in theta, end in delta or return to alpha
- For lucid dreaming: theta 4-7 Hz is the sweet spot, sustained
- Style "${intent.style}": gentle = slower transitions and lower beat frequencies, deep = more extreme states
- Make stage names poetic and evocative, not technical`

const VALID_CARRIERS = [174, 285, 396, 417, 432, 528, 639, 741, 852, 963]
const VALID_SOUNDSCENES = ['off', 'rain', 'thunder', 'wind', 'waves', 'fire', 'forest', 'space', 'cave']

function clampCarrier(v: number): number {
  return VALID_CARRIERS.reduce((prev, curr) =>
    Math.abs(curr - v) < Math.abs(prev - v) ? curr : prev
  )
}

function clampBeat(v: number): number {
  return Math.max(0.5, Math.min(40, v))
}

function clampWobble(v: number): number {
  return Math.max(0.05, Math.min(2.0, v))
}

function clampDuration(v: number): number {
  return Math.max(3, Math.min(20, Math.round(v)))
}

function clampSoundscene(v: string): string {
  return VALID_SOUNDSCENES.includes(v) ? v : 'off'
}

export async function generateJourney(
  intent: JourneyIntent,
  apiKey: string,
): Promise<Journey> {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('No API key configured')
  }

  const userPrompt = `Design a brainwave journey for: "${intent.goal}". Duration: ${intent.durationMinutes} minutes, ${intent.stageCount} stages, style: ${intent.style}.`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT(intent) },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (res.status === 429) throw new Error('OpenAI rate limit reached. Please wait a moment and try again.')
  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText)
    throw new Error(`Journey generation failed (${res.status}): ${errText}`)
  }

  const data = await res.json() as { choices: { message: { content: string } }[] }
  const rawContent = data.choices[0]?.message?.content ?? ''

  let parsed: { name: string; stages: Partial<JourneyStage>[] }
  try {
    // Strip possible markdown code fences
    const jsonStr = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
    parsed = JSON.parse(jsonStr)
  } catch {
    throw new Error(`Failed to parse journey JSON from AI response: ${rawContent.slice(0, 200)}`)
  }

  if (!parsed.name || !Array.isArray(parsed.stages)) {
    throw new Error('AI returned invalid journey structure (missing name or stages)')
  }

  // Normalize stages
  const stages: JourneyStage[] = parsed.stages.map((s) => {
    const beat = clampBeat(Number(s.beat) || 10)
    return {
      id: crypto.randomUUID(),
      label: String(s.label || 'Stage'),
      carrier: clampCarrier(Number(s.carrier) || 432),
      beat,
      wobbleRate: clampWobble(Number(s.wobbleRate) || 0.3),
      durationMinutes: clampDuration(Number(s.durationMinutes) || Math.floor(intent.durationMinutes / intent.stageCount)),
      soundsceneId: clampSoundscene(String(s.soundsceneId || 'off')),
      color: beatToColor(beat),
    }
  })

  // Validate total duration
  const totalDur = stages.reduce((sum, s) => sum + s.durationMinutes, 0)
  if (totalDur !== intent.durationMinutes && stages.length > 0) {
    const diff = intent.durationMinutes - totalDur
    stages[stages.length - 1].durationMinutes = Math.max(3, stages[stages.length - 1].durationMinutes + diff)
  }

  return {
    id: crypto.randomUUID(),
    name: String(parsed.name),
    stages,
  }
}
