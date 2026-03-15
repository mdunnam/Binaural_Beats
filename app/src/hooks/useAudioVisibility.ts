import { useEffect } from 'react'

export function useAudioVisibility(audioContextRef: React.RefObject<AudioContext | null>) {
  useEffect(() => {
    const handler = () => {
      const ctx = audioContextRef.current
      if (!ctx) return
      if (document.visibilityState === 'visible' && ctx.state === 'suspended') {
        ctx.resume().catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [audioContextRef])
}
