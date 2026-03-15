import { useEffect, useRef, useCallback } from 'react'

export function useWakeLock() {
  const lockRef = useRef<WakeLockSentinel | null>(null)

  const request = useCallback(async () => {
    if (!('wakeLock' in navigator)) return
    try {
      lockRef.current = await (navigator as any).wakeLock.request('screen')
    } catch {
      // silently fail — enhancement only
    }
  }, [])

  const release = useCallback(async () => {
    if (lockRef.current) {
      try { await lockRef.current.release() } catch { /* ignore */ }
      lockRef.current = null
    }
  }, [])

  // Re-acquire on visibility change (wake lock is released on tab hide)
  useEffect(() => {
    const handler = async () => {
      if (document.visibilityState === 'visible' && lockRef.current === null) {
        await request()
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [request])

  return { request, release }
}
