import React from 'react'
import { useProGate } from '../hooks/useProGate'
import { IconSparkle } from './Icons'

interface ProGateProps {
  children: React.ReactNode
  feature?: string
}

export function ProGate({ children, feature }: ProGateProps) {
  const { isPro } = useProGate()

  if (isPro) return <>{children}</>

  return (
    <div className="pro-gate">
      <div className="pro-gate-blur">{children}</div>
      <div className="pro-gate-overlay">
        <div className="pro-gate-badge"><IconSparkle size={14} /> Pro</div>
        <div className="pro-gate-title">{feature ?? 'Pro Feature'}</div>
        <div className="pro-gate-sub">Upgrade to unlock</div>
        <a href="/app#upgrade" className="soft-button soft-button--accent soft-button--sm pro-gate-cta">
          Upgrade — $5.99/mo
        </a>
      </div>
    </div>
  )
}
