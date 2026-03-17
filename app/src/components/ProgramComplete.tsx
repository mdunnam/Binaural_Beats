interface ProgramCompleteProps {
  isPro: boolean
  onContinue: (tab: string) => void
  onUpgrade: () => void
}

export function ProgramComplete({ isPro, onContinue, onUpgrade }: ProgramCompleteProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1.25rem',
      padding: '2.5rem 1.5rem',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '3.5rem' }}>🎉</div>
      <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)' }}>
        You completed the 7-Day Program
      </h2>
      <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '300px', fontSize: '0.9rem' }}>
        You've tuned your mind across 7 frequencies. Your practice is just beginning.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', width: '100%', maxWidth: '280px' }}>
        <button className="soft-button soft-button--accent" onClick={() => onContinue('studio')}>
          🎧 Keep Exploring
        </button>
        <button className="soft-button" onClick={() => onContinue('aura')}>
          🔮 Read Your Aura
        </button>
        {!isPro && (
          <button className="soft-button" style={{ marginTop: '0.25rem', borderStyle: 'dashed' }} onClick={onUpgrade}>
            ✨ Unlock Liminal Pro
          </button>
        )}
      </div>
    </div>
  )
}
