import { t } from '../i18n'
import Button from './Button'
import Icon, { type IconName } from './Icon'

export type Tab = 'today' | 'add' | 'prep' | 'history' | 'settings'

interface Props {
  tab: Tab
  setTab: (tab: Tab) => void
}

// The four tabs in the bar. Adding food has its own round button next to it.
const TABS: { tab: Tab; icon: IconName }[] = [
  { tab: 'today', icon: 'today' },
  { tab: 'prep', icon: 'pot' },
  { tab: 'history', icon: 'history' },
  { tab: 'settings', icon: 'settings' },
]

// The floating bar at the bottom, with a separate round + button.
export default function TabBar({ tab, setTab }: Props) {
  return (
    <div className="tabbar-wrap">
      <nav className="tabbar">
        {TABS.map((item) => (
          <button
            key={item.tab}
            className={item.tab === tab ? 'tab active' : 'tab'}
            onClick={() => setTab(item.tab)}
            aria-label={t(`tabs.${item.tab}`)}
          >
            <Icon name={item.icon} size={24} />
            <span>{t(`tabs.${item.tab}`)}</span>
          </button>
        ))}
      </nav>
      <Button variant="primary" layout="round" icon="plus" className="add-button" onClick={() => setTab('add')} aria-label={t('tabs.add')} />
    </div>
  )
}
