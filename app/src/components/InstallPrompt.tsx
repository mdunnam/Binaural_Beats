import { useEffect, useState } from 'react'
import { IconDownload } from './Icons'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('liminal-install-dismissed') === 'true'
  )

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!prompt || dismissed) return null

  function dismiss() {
    localStorage.setItem('liminal-install-dismissed', 'true')
    setDismissed(true)
  }

  async function install() {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') dismiss()
  }

  return (
    <div className="install-prompt">
      <div className="install-prompt-content">
        <span><IconDownload size={16} /> Add Liminal to your home screen for the best experience.</span>
        <div className="install-prompt-actions">
          <button className="soft-button soft-button--accent" onClick={install}>Install</button>
          <button className="soft-button" onClick={dismiss}>Not now</button>
        </div>
      </div>
    </div>
  )
}
