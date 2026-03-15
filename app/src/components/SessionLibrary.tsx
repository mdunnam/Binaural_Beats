import { SESSION_LIBRARY } from '../data/sessionLibrary'
import type { SessionCard } from '../data/sessionLibrary'

type Props = {
  onLoad: (card: SessionCard) => void
  isPro: boolean
}

export function SessionLibrary({ onLoad, isPro }: Props) {
  return (
    <div className="session-library">
      <div className="session-library-grid">
        {SESSION_LIBRARY.map(card => {
          const locked = card.tier === 'pro' && !isPro
          return (
            <button
              key={card.id}
              className={`session-card${locked ? ' session-card--locked' : ''}`}
              onClick={() => !locked && onLoad(card)}
              title={locked ? 'Upgrade to Pro' : card.description}
            >
              <span className="session-card-emoji">{card.emoji}</span>
              <span className="session-card-label">{card.label}</span>
              <span className="session-card-meta">{card.duration} min · {card.goal}</span>
              {locked && <span className="session-card-lock">🔒</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
