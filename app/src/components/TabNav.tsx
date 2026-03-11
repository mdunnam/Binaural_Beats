interface TabNavProps {
  tabs: { id: string; icon: string; label: string }[]
  activeTab: string
  onChange: (id: string) => void
}

export function TabNav({ tabs, activeTab, onChange }: TabNavProps) {
  return (
    <nav className="tab-nav" aria-label="Main navigation">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`tab-btn${activeTab === tab.id ? ' tab-btn--active' : ''}`}
          onClick={() => onChange(tab.id)}
          aria-current={activeTab === tab.id ? 'page' : undefined}
        >
          <span className="tab-icon">{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
