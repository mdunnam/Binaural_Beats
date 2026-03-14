import React, { createContext, useContext, useState } from 'react'

type SubscriptionContextType = {
  showUpgradeModal: boolean
  upgradeFeatureName: string
  openUpgradeModal: (featureName?: string) => void
  closeUpgradeModal: () => void
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null)

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeFeatureName, setUpgradeFeatureName] = useState('')

  const openUpgradeModal = (featureName = 'Pro') => {
    setUpgradeFeatureName(featureName)
    setShowUpgradeModal(true)
  }

  const closeUpgradeModal = () => {
    setShowUpgradeModal(false)
    setUpgradeFeatureName('')
  }

  return (
    <SubscriptionContext.Provider value={{ showUpgradeModal, upgradeFeatureName, openUpgradeModal, closeUpgradeModal }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext)
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider')
  return ctx
}
