import Icon, { type IconName } from './Icon'

export type Tab = 'today' | 'add' | 'history' | 'settings'

interface Props {
  tab: Tab
  setTab: (tab: Tab) => void
}

const TABS: { tab: Tab; label: string; icon: IconName }[] = [
  { tab: 'today', label: 'Today', icon: 'today' },
  { tab: 'add', label: 'Add', icon: 'barcode' },
  { tab: 'history', label: 'History', icon: 'history' },
  { tab: 'settings', label: 'Settings', icon: 'settings' },
]

// The floating glass bar at the bottom.
export default function TabBar({ tab, setTab }: Props) {
  return (
    <nav className="tabbar glass">
      {TABS.map((t) => (
        <button key={t.tab} className={t.tab === tab ? 'tab active' : 'tab'} onClick={() => setTab(t.tab)}>
          <Icon name={t.icon} size={24} />
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
