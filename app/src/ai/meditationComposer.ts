import { matchTheme } from './meditationThemes'

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

export async function generateMeditation(
  prompt: string,
  apiKey: string,
): Promise<GeneratedMeditation> {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('OpenAI API key is required. Please add it in Settings.')
  }

  // Step 1 — match theme locally
  const theme = matchTheme(prompt)

  const config: MeditationSessionConfig = {
    carrier: theme.carrier,
    beat: theme.beat,
    brainwaveTarget: theme.brainwaveTarget,
    noiseType: theme.noiseType,
    noiseVolume: theme.noiseVolume,
    padEnabled: theme.padEnabled,
    sessionMinutes: theme.sessionMinutes,
    scriptTone: theme.scriptTone,
    theme: theme.keywords.length > 0 ? theme.keywords[0] : 'general',
  }

  // Step 2 — generate script via OpenAI Chat API
  const systemPrompt = `You are a professional meditation guide. Write a guided meditation script based on the user's intent.
Rules:
- Duration: ${config.sessionMinutes} minutes when read at a slow, meditative pace
- Tone: ${config.scriptTone}
- Include [PAUSE 5s] and [PAUSE 10s] markers where silence helps
- Opening: gentle grounding breath awareness (1-2 min)
- Core: visualisation or affirmations on the theme (main duration)
- Closing: gentle return to awareness (1-2 min)
- Do NOT include any section headers or stage labels in the output — just the spoken words and pause markers
- Keep language simple, present tense, second person ("you")`

  const chatRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
    }),
  })

  if (chatRes.status === 429) {
    throw new Error('OpenAI rate limit reached. Please wait a moment and try again.')
  }
  if (!chatRes.ok) {
    const errText = await chatRes.text().catch(() => chatRes.statusText)
    throw new Error(`Script generation failed (${chatRes.status}): ${errText}`)
  }

  const chatData = await chatRes.json() as {
    choices: { message: { content: string } }[]
  }
  const script = chatData.choices[0]?.message?.content ?? ''

  // Step 3 — render via TTS (strip pause markers)
  const ttsInput = script.replace(/\[PAUSE \d+s\]/g, '').replace(/\s+/g, ' ').trim()

  const ttsRes = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      voice: 'nova',
      input: ttsInput,
      speed: 0.85,
    }),
  })

  if (ttsRes.status === 429) {
    throw new Error('OpenAI rate limit reached during voice rendering. Please wait and try again.')
  }
  if (!ttsRes.ok) {
    const errText = await ttsRes.text().catch(() => ttsRes.statusText)
    throw new Error(`Voice rendering failed (${ttsRes.status}): ${errText}`)
  }

  const audioBlob = await ttsRes.blob()
  const audioUrl = URL.createObjectURL(audioBlob)

  return { config, script, audioUrl, audioBlob }
}
