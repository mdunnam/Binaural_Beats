/**
 * Icon placeholders — replace SVG paths with final design assets.
 * All icons use a 20×20 viewBox, stroke="currentColor", no fill by default.
 */

import type { ReactNode } from 'react'

export type IconProps = {
  size?: number
  className?: string
  style?: React.CSSProperties
}

function Svg({ size = 18, className, style, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

// ── Navigation tabs ──────────────────────────────────────────────────────────

export function IconHome(p: IconProps) {
  return <Svg {...p}>
    <path d="M3 9.5L10 3l7 6.5V17a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z" />
    <path d="M7.5 18v-5h5v5" />
  </Svg>
}

export function IconJournal(p: IconProps) {
  return <Svg {...p}>
    <rect x="4" y="2" width="12" height="16" rx="1.5" />
    <path d="M4 6H2M4 10H2M4 14H2" />
    <path d="M8 7h4M8 11h4M8 15h2" />
  </Svg>
}

export function IconLearn(p: IconProps) {
  return <Svg {...p}>
    <path d="M10 5C8 3.5 5 3 2 3.5V16c3-.5 6 0 8 1.5C12 16 15 15.5 18 16V3.5c-3-.5-6 0-8 1.5Z" />
    <line x1="10" y1="5" x2="10" y2="17.5" />
  </Svg>
}

export function IconTones(p: IconProps) {
  return <Svg {...p}>
    <path d="M1 10q2-6 4 0t4 0t4 0t4 0" />
  </Svg>
}

export function IconSoundscape(p: IconProps) {
  return <Svg {...p}>
    <path d="M2 16Q6 6 10 6Q14 6 18 16" />
    <path d="M5 16Q7 10 10 10Q13 10 15 16" />
  </Svg>
}

export function IconPad(p: IconProps) {
  return <Svg {...p}>
    <rect x="2" y="3" width="16" height="14" rx="1.5" />
    <line x1="7" y1="3" x2="7" y2="13" />
    <line x1="11" y1="3" x2="11" y2="13" />
    <line x1="15" y1="3" x2="15" y2="13" />
    <rect x="5" y="3" width="2.5" height="8.5" rx="0.5" fill="currentColor" stroke="none" />
    <rect x="9" y="3" width="2.5" height="8.5" rx="0.5" fill="currentColor" stroke="none" />
    <rect x="13" y="3" width="2.5" height="8.5" rx="0.5" fill="currentColor" stroke="none" />
  </Svg>
}

export function IconMusic(p: IconProps) {
  return <Svg {...p}>
    <path d="M9 17V7l8-2" />
    <circle cx="6.5" cy="17" r="2.5" fill="currentColor" stroke="none" />
    <circle cx="14.5" cy="15" r="2.5" fill="currentColor" stroke="none" />
  </Svg>
}

export function IconStudio(p: IconProps) {
  return <Svg {...p}>
    <line x1="5"  y1="3" x2="5"  y2="17" />
    <line x1="10" y1="3" x2="10" y2="17" />
    <line x1="15" y1="3" x2="15" y2="17" />
    <rect x="3.5"  y="7"  width="3" height="2.5" rx="1.25" fill="currentColor" stroke="none" />
    <rect x="8.5"  y="12" width="3" height="2.5" rx="1.25" fill="currentColor" stroke="none" />
    <rect x="13.5" y="5"  width="3" height="2.5" rx="1.25" fill="currentColor" stroke="none" />
  </Svg>
}

export function IconSequencer(p: IconProps) {
  // 3×3 dot grid — some filled to suggest a step pattern
  const dots: { cx: number; cy: number; filled: boolean }[] = [
    { cx: 4.5, cy: 5,  filled: true  }, { cx: 9.5, cy: 5,  filled: false }, { cx: 14.5, cy: 5,  filled: true  },
    { cx: 4.5, cy: 10, filled: false }, { cx: 9.5, cy: 10, filled: true  }, { cx: 14.5, cy: 10, filled: true  },
    { cx: 4.5, cy: 15, filled: true  }, { cx: 9.5, cy: 15, filled: false }, { cx: 14.5, cy: 15, filled: false },
  ]
  return <Svg {...p}>
    {dots.map((d, i) => (
      <circle key={i} cx={d.cx} cy={d.cy} r="1.5"
        fill={d.filled ? 'currentColor' : 'none'} />
    ))}
  </Svg>
}

export function IconFocus(p: IconProps) {
  return <Svg {...p}>
    <path d="M1 10s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7Z" />
    <circle cx="10" cy="10" r="3" />
  </Svg>
}

export function IconSparkle(p: IconProps) {
  return <Svg {...p}>
    <path d="M10 2v3.5M10 14.5V18M2 10h3.5M14.5 10H18" />
    <path d="M4.3 4.3l2.5 2.5M13.2 13.2l2.5 2.5M4.3 15.7l2.5-2.5M13.2 6.8l2.5-2.5" />
    <circle cx="10" cy="10" r="2" fill="currentColor" stroke="none" />
  </Svg>
}

export function IconCalendar(p: IconProps) {
  return <Svg {...p}>
    <rect x="2" y="4" width="16" height="14" rx="1.5" />
    <line x1="2"  y1="9" x2="18" y2="9" />
    <line x1="6"  y1="2" x2="6"  y2="6" />
    <line x1="14" y1="2" x2="14" y2="6" />
    <rect x="5.5" y="12" width="2" height="2" rx="0.5" fill="currentColor" stroke="none" />
    <rect x="9.5" y="12" width="2" height="2" rx="0.5" fill="currentColor" stroke="none" />
  </Svg>
}

export function IconMoon(p: IconProps) {
  return <Svg {...p}>
    <path d="M18 12a8 8 0 1 1-10.3-7.6A6 6 0 0 0 18 12Z" />
  </Svg>
}

export function IconHelp(p: IconProps) {
  return <Svg {...p}>
    <circle cx="10" cy="10" r="8" />
    <path d="M8 8.5a2 2 0 0 1 4 0c0 1.5-2 2-2 3.5" />
    <circle cx="10" cy="15" r="0.75" fill="currentColor" stroke="none" />
  </Svg>
}

export function IconAura(p: IconProps) {
  return <Svg {...p}>
    <circle cx="10" cy="10" r="2" fill="currentColor" stroke="none" />
    <circle cx="10" cy="10" r="5" />
    <circle cx="10" cy="10" r="8.5" />
  </Svg>
}

// ── Session intents ──────────────────────────────────────────────────────────

export function IconTarget(p: IconProps) {
  return <Svg {...p}>
    <circle cx="10" cy="10" r="8" />
    <circle cx="10" cy="10" r="4.5" />
    <circle cx="10" cy="10" r="1.5" fill="currentColor" stroke="none" />
  </Svg>
}

export function IconMeditate(p: IconProps) {
  // Lotus-like radial symbol
  return <Svg {...p}>
    <circle cx="10" cy="10" r="2.5" />
    <path d="M10 2v2.5M10 15.5V18M2 10h2.5M15.5 10H18" />
    <path d="M4.5 4.5l1.8 1.8M13.7 13.7l1.8 1.8M4.5 15.5l1.8-1.8M13.7 6.3l1.8-1.8" />
  </Svg>
}

export function IconLightbulb(p: IconProps) {
  return <Svg {...p}>
    <path d="M10 2a6 6 0 0 0-3.2 11V15h6.4v-2A6 6 0 0 0 10 2Z" />
    <line x1="7.2" y1="15" x2="12.8" y2="15" />
    <line x1="7.8" y1="17" x2="12.2" y2="17" />
    <line x1="8.5" y1="19" x2="11.5" y2="19" />
  </Svg>
}

export function IconStar(p: IconProps) {
  return <Svg {...p}>
    <path d="M10 1.5l2.5 6h6.5l-5.2 4 2 6.3L10 14l-5.8 3.8 2-6.3L1 7.5h6.5z" />
  </Svg>
}

export function IconSunrise(p: IconProps) {
  return <Svg {...p}>
    <line x1="3"  y1="13" x2="17" y2="13" />
    <path d="M6 13a4 4 0 0 1 8 0" />
    <line x1="10" y1="2"  x2="10" y2="4.5" />
    <line x1="3.5" y1="5.5" x2="5.2" y2="7.2" />
    <line x1="16.5" y1="5.5" x2="14.8" y2="7.2" />
    <line x1="1.5"  y1="10" x2="4"   y2="10" />
    <line x1="18.5" y1="10" x2="16"  y2="10" />
  </Svg>
}

// ── UI chrome ────────────────────────────────────────────────────────────────

export function IconHeadphones(p: IconProps) {
  return <Svg {...p}>
    <path d="M3 11a7 7 0 0 1 14 0" />
    <rect x="2"  y="11" width="3.5" height="5.5" rx="1.75" />
    <rect x="14.5" y="11" width="3.5" height="5.5" rx="1.75" />
  </Svg>
}

export function IconLock(p: IconProps) {
  return <Svg {...p}>
    <rect x="4" y="9" width="12" height="9" rx="2" />
    <path d="M7 9V6a3 3 0 0 1 6 0v3" />
  </Svg>
}

export function IconFire(p: IconProps) {
  return <Svg {...p}>
    <path d="M10 2C9 5 5 7 5 11.5a5 5 0 0 0 10 0c0-2-1-3.5-2-4.5 0 2-1 3-2 3s-1-1.5-1-4Z" />
  </Svg>
}

export function IconRelief(p: IconProps) {
  // Plus / cross symbol
  return <Svg {...p}>
    <circle cx="10" cy="10" r="8" />
    <line x1="10" y1="6" x2="10" y2="14" />
    <line x1="6"  y1="10" x2="14" y2="10" />
  </Svg>
}

export function IconSettings(p: IconProps) {
  return <Svg {...p}>
    <circle cx="10" cy="10" r="2.5" />
    <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.1 4.1l1.5 1.5M14.4 14.4l1.5 1.5M4.1 15.9l1.5-1.5M14.4 5.6l1.5-1.5" />
  </Svg>
}

export function IconSearch(p: IconProps) {
  return <Svg {...p}>
    <circle cx="8.5" cy="8.5" r="5.5" />
    <line x1="13" y1="13" x2="17.5" y2="17.5" />
  </Svg>
}

export function IconPlay(p: IconProps) {
  return <Svg {...p}>
    <path d="M5 3l12 7-12 7V3Z" fill="currentColor" stroke="none" />
  </Svg>
}

export function IconCheck(p: IconProps) {
  return <Svg {...p}>
    <path d="M3 10l5 5 9-9" />
  </Svg>
}

export function IconBreathe(p: IconProps) {
  return <Svg {...p}>
    <path d="M10 2C6 2 3 5 3 9c0 3 2 5.5 4.5 6.5L10 18l2.5-2.5C15 14.5 17 12 17 9c0-4-3-7-7-7Z" />
    <path d="M7 9c0-1.7 1.3-3 3-3s3 1.3 3 3" />
  </Svg>
}

export function IconBrain(p: IconProps) {
  return <Svg {...p}>
    <path d="M10 4C8 4 6 5 5.5 6.5 4 6.5 3 8 3 9.5c0 2 1.5 3.5 3.5 3.5v1.5h7V13c2 0 3.5-1.5 3.5-3.5 0-1.5-1-3-2.5-3C14 5 12 4 10 4Z" />
    <line x1="10" y1="4" x2="10" y2="14.5" />
  </Svg>
}

// ── Nature / thematic ────────────────────────────────────────────────────────

export function IconSeedling(p: IconProps) {
  return <Svg {...p}>
    <line x1="10" y1="18" x2="10" y2="8" />
    <path d="M10 14c0 0-4-1-4-5s4-5 4-5" />
    <path d="M10 11c0 0 4-1 4-4s-4-4-4-4" />
  </Svg>
}

export function IconLightning(p: IconProps) {
  return <Svg {...p}>
    <path d="M12 2L4 11h6l-2 7 8-9h-6l2-7Z" fill="currentColor" stroke="none" />
  </Svg>
}

export function IconLeaf(p: IconProps) {
  return <Svg {...p}>
    <path d="M17 3C17 3 17 12 10 15c-3 1.3-6 1-7 1 0-1-.3-4 1-7C6 5 12 2 17 3Z" />
    <path d="M3 17l5-5" />
  </Svg>
}

export function IconOrb(p: IconProps) {
  return <Svg {...p}>
    <circle cx="10" cy="10" r="8" />
    <ellipse cx="10" cy="10" rx="4" ry="8" />
    <line x1="2" y1="10" x2="18" y2="10" />
  </Svg>
}

export function IconWave(p: IconProps) {
  return <Svg {...p}>
    <path d="M1 14q2.5-8 4.5-8t4 8t4-8t4.5 8" />
  </Svg>
}

export function IconNoise(p: IconProps) {
  // Vertical bars at varying heights = noise/static
  return <Svg {...p}>
    <line x1="2"  y1="13" x2="2"  y2="7"  />
    <line x1="5"  y1="15" x2="5"  y2="5"  />
    <line x1="8"  y1="12" x2="8"  y2="8"  />
    <line x1="11" y1="16" x2="11" y2="4"  />
    <line x1="14" y1="11" x2="14" y2="9"  />
    <line x1="17" y1="14" x2="17" y2="6"  />
  </Svg>
}

export function IconCycle(p: IconProps) {
  return <Svg {...p}>
    <path d="M4 10a6 6 0 0 1 6-6 6 6 0 0 1 5.2 3" />
    <path d="M16 10a6 6 0 0 1-6 6 6 6 0 0 1-5.2-3" />
    <path d="M14.5 7l2-3 1.5 3" />
    <path d="M5.5 13l-2 3-1.5-3" />
  </Svg>
}

// ── Mood faces ───────────────────────────────────────────────────────────────
// Scale: 1=terrible → 5=great

function MoodFace({ p, mouth }: { p: IconProps; mouth: string }) {
  return <Svg {...p}>
    <circle cx="10" cy="10" r="8" />
    <circle cx="7.5"  cy="8.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="12.5" cy="8.5" r="1" fill="currentColor" stroke="none" />
    <path d={mouth} />
  </Svg>
}

export function IconMood1(p: IconProps) {  // Terrible
  return <MoodFace p={p} mouth="M6.5 14c.8-2 6.2-2 7 0" />
}
export function IconMood2(p: IconProps) {  // Bad
  return <MoodFace p={p} mouth="M7 13.5c.5-1.5 5.5-1.5 6 0" />
}
export function IconMood3(p: IconProps) {  // Neutral
  return <MoodFace p={p} mouth="M7 13h6" />
}
export function IconMood4(p: IconProps) {  // Good
  return <MoodFace p={p} mouth="M7 12c.5 1.5 5.5 1.5 6 0" />
}
export function IconMood5(p: IconProps) {  // Great
  return <MoodFace p={p} mouth="M6.5 11.5c.8 2.5 6.2 2.5 7 0" />
}

export const MOOD_ICONS = [IconMood1, IconMood2, IconMood3, IconMood4, IconMood5] as const

export function IconTrash(p: IconProps) {
  return <Svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M6 4h8M4.5 4l1 12h9l1-12M8 4V3h4v1M8 8v6M12 8v6" /></Svg>
}
export function IconPlus(p: IconProps) {
  return <Svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M10 4v12M4 10h12" /></Svg>
}
export function IconClock(p: IconProps) {
  return <Svg {...p}><circle cx="10" cy="10" r="7" /><path strokeLinecap="round" d="M10 6v4l3 2" /></Svg>
}
export function IconTag(p: IconProps) {
  return <Svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10V5a1 1 0 011-1h5l7 7-6 6L3 10z" /><circle cx="7.5" cy="7.5" r="1" fill="currentColor" stroke="none" /></Svg>
}
export function IconChart(p: IconProps) {
  return <Svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M3 15l4-6 3 4 3-5 4 7" /></Svg>
}
export function IconEye(p: IconProps) {
  return <Svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" /><circle cx="10" cy="10" r="2.5" /></Svg>
}
export function IconMap(p: IconProps) {
  return <Svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M1 4l6 2 6-2 6 2v12l-6-2-6 2-6-2V4z" /><path strokeLinecap="round" d="M7 6v12M13 4v12" /></Svg>
}
export function IconMail(p: IconProps) {
  return <Svg {...p}><rect x="2" y="5" width="16" height="12" rx="1.5" /><path strokeLinecap="round" strokeLinejoin="round" d="M2 5l8 7 8-7" /></Svg>
}
export function IconParty(p: IconProps) {
  return <Svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16L10 4l6 12H4z" /><path strokeLinecap="round" d="M3 10h14M10 4v-2M6 7l-2-1M14 7l2-1" /></Svg>
}
export function IconVolumeOn(p: IconProps) {
  return <Svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13H3a1 1 0 01-1-1V8a1 1 0 011-1h2l4-3v12l-4-3z" /><path strokeLinecap="round" d="M14 6.5a5 5 0 010 7M16.5 4a8 8 0 010 12" /></Svg>
}
export function IconVolumeOff(p: IconProps) {
  return <Svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13H3a1 1 0 01-1-1V8a1 1 0 011-1h2l4-3v12l-4-3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M14 8l4 4m0-4l-4 4" /></Svg>
}
export function IconPalette(p: IconProps) {
  return <Svg {...p}><circle cx="10" cy="10" r="7" /><circle cx="7" cy="8" r="1" fill="currentColor" stroke="none" /><circle cx="13" cy="8" r="1" fill="currentColor" stroke="none" /><circle cx="10" cy="6" r="1" fill="currentColor" stroke="none" /><circle cx="7" cy="13" r="1" fill="currentColor" stroke="none" /><circle cx="13" cy="13" r="1" fill="currentColor" stroke="none" /></Svg>
}
export function IconDownload(p: IconProps) {
  return <Svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M10 3v10m0 0l-4-4m4 4l4-4" /><path strokeLinecap="round" d="M3 16v1a1 1 0 001 1h12a1 1 0 001-1v-1" /></Svg>
}
export function IconBell(p: IconProps) {
  return <Svg {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M10 3a5 5 0 015 5v3l1.5 2.5H3.5L5 11V8a5 5 0 015-5z" /><path strokeLinecap="round" d="M8 16a2 2 0 004 0" /></Svg>
}
