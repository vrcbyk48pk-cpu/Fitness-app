export type Tab = 'today' | 'add' | 'history' | 'settings'

interface Props {
  tab: Tab
  setTab: (tab: Tab) => void
}

// Small inline SVG icons, so we don't need an icon library.
const icons: Record<Tab, React.ReactNode> = {
  today: (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  ),
  add: (
    <svg viewBox="0 0 24 24">
      <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
      <path d="M8 9v6M12 9v6M16 9v6" />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 24 24">
      <path d="M6 19v-6M12 19V5M18 19v-9" strokeWidth="3" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24">
      <path d="M5 7h9M18 7h1M5 12h1M10 12h9M5 17h7M16 17h3" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="12" r="2" />
      <circle cx="14" cy="17" r="2" />
    </svg>
  ),
}

const labels: Record<Tab, string> = { today: 'Today', add: 'Add', history: 'History', settings: 'Settings' }

export default function TabBar({ tab, setTab }: Props) {
  const tabs: Tab[] = ['today', 'add', 'history', 'settings']
  return (
    <nav className="tabbar glass">
      {tabs.map((t) => (
        <button
          key={t}
          className={t === tab ? 'tab active' : 'tab'}
          onClick={() => setTab(t)}
        >
          {icons[t]}
          <span>{labels[t]}</span>
        </button>
      ))}
    </nav>
  )
}
