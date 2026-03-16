// Media Session API — shows OS media controls (lock screen, notification)
import { useEffect } from 'react'

export function useMediaSession(params: {
  isPlaying: boolean
  title: string
  artist?: string
  onPlay?: () => void
  onPause?: () => void
  onStop?: () => void
}) {
  useEffect(() => {
    if (!('mediaSession' in navigator)) return

    navigator.mediaSession.metadata = new MediaMetadata({
      title: params.title,
      artist: params.artist ?? 'Liminal',
      album: 'Liminal — Binaural Beats',
      artwork: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      ]
    })

    navigator.mediaSession.playbackState = params.isPlaying ? 'playing' : 'paused'

    if (params.onPlay) navigator.mediaSession.setActionHandler('play', params.onPlay)
    if (params.onPause) navigator.mediaSession.setActionHandler('pause', params.onPause)
    if (params.onStop) navigator.mediaSession.setActionHandler('stop', params.onStop)

    return () => {
      navigator.mediaSession.setActionHandler('play', null)
      navigator.mediaSession.setActionHandler('pause', null)
      navigator.mediaSession.setActionHandler('stop', null)
    }
  }, [params.isPlaying, params.title, params.artist, params.onPlay, params.onPause, params.onStop])
}
