import type { AudioGraph } from '../types'

export type JourneyStage = {
  id: string
  label: string
  carrier: number
  beat: number
  wobbleRate: number
  durationMinutes: number
  soundsceneId: string
  color: string
}

export type Journey = {
  id: string
  name: string
  stages: JourneyStage[]
}

export const BRAINWAVE_COLORS: Record<string, string> = {
  delta: '#7b68ee',
  theta: '#5b9bd5',
  alpha: '#3e8f72',
  beta: '#e8b84b',
  gamma: '#e05a3a',
}

export function beatToColor(beat: number): string {
  if (beat < 4) return BRAINWAVE_COLORS.delta
  if (beat < 8) return BRAINWAVE_COLORS.theta
  if (beat < 14) return BRAINWAVE_COLORS.alpha
  if (beat < 30) return BRAINWAVE_COLORS.beta
  return BRAINWAVE_COLORS.gamma
}

export type ActiveJourney = {
  journey: Journey
  startedAt: number
  currentStageIndex: number
  intervalId: ReturnType<typeof setInterval>
}

export function startJourney(
  journey: Journey,
  graph: AudioGraph,
  crossfadeSeconds: number,
  onStageChange: (stageIndex: number, stage: JourneyStage) => void,
): ActiveJourney {
  const ctx = graph.context
  const wallStart = Date.now()

  // Fire the first stage immediately
  const firstStage = journey.stages[0]
  if (firstStage) {
    const t = ctx.currentTime + 0.05
    graph.leftOsc.frequency.linearRampToValueAtTime(firstStage.carrier, t)
    graph.rightOsc.frequency.linearRampToValueAtTime(firstStage.carrier + firstStage.beat, t)
    graph.lfo.frequency.linearRampToValueAtTime(firstStage.wobbleRate, t)
    onStageChange(0, firstStage)
  }

  const active: ActiveJourney = {
    journey,
    startedAt: ctx.currentTime,
    currentStageIndex: 0,
    intervalId: 0 as unknown as ReturnType<typeof setInterval>,
  }

  // Build cumulative start times in milliseconds
  const cumulativeMs: number[] = []
  let sum = 0
  for (const stage of journey.stages) {
    cumulativeMs.push(sum)
    sum += stage.durationMinutes * 60 * 1000
  }

  active.intervalId = setInterval(() => {
    const elapsedMs = Date.now() - wallStart

    // Find which stage we should be in
    let targetIndex = 0
    for (let i = 0; i < cumulativeMs.length; i++) {
      if (elapsedMs >= cumulativeMs[i]) {
        targetIndex = i
      }
    }

    if (targetIndex !== active.currentStageIndex) {
      active.currentStageIndex = targetIndex
      const stage = journey.stages[targetIndex]
      const rampEnd = ctx.currentTime + crossfadeSeconds

      graph.leftOsc.frequency.linearRampToValueAtTime(stage.carrier, rampEnd)
      graph.rightOsc.frequency.linearRampToValueAtTime(stage.carrier + stage.beat, rampEnd)
      graph.lfo.frequency.linearRampToValueAtTime(stage.wobbleRate, rampEnd)

      onStageChange(targetIndex, stage)
    }
  }, 500)

  return active
}

export function stopJourney(active: ActiveJourney): void {
  clearInterval(active.intervalId)
}
