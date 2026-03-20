import { IconParty, IconHeadphones, IconAura, IconSparkle } from './Icons'

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
      <div style={{ fontSize: '3.5rem' }}><IconParty size={56} /></div>
      <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)' }}>
        You completed the 7-Day Program
      </h2>
      <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '300px', fontSize: '0.9rem' }}>
        You've tuned your mind across 7 frequencies. Your practice is just beginning.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', width: '100%', maxWidth: '280px' }}>
        <button className="soft-button soft-button--accent" onClick={() => onContinue('studio')}>
          <IconHeadphones size={16} /> Keep Exploring
        </button>
        <button className="soft-button" onClick={() => onContinue('aura')}>
          <IconAura size={16} /> Read Your Aura
        </button>
        {!isPro && (
          <button className="soft-button" style={{ marginTop: '0.25rem', borderStyle: 'dashed' }} onClick={onUpgrade}>
            <IconSparkle size={16} /> Unlock Liminal Pro
          </button>
        )}
      </div>
    </div>
  )
}
