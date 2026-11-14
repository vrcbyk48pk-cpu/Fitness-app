import { useState } from 'react'
import TabBar, { type Tab } from './components/TabBar'
import TodayScreen from './components/TodayScreen'
import AddScreen from './components/AddScreen'
import SettingsScreen from './components/SettingsScreen'
import { todayKey } from './utils'

export default function App() {
  const [tab, setTab] = useState<Tab>('today')
  // The day being viewed, as "YYYY-MM-DD". New entries are logged to this day.
  const [date, setDate] = useState(todayKey())
  // A short message that pops up at the top, e.g. "Added Oats".
  const [toast, setToast] = useState('')

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(''), 2000)
  }

  return (
    <>
      {/* Soft colour blobs behind everything, so the glass has something to blur. */}
      <div className="blobs" aria-hidden="true">
        <div className="blob blob-mint" />
        <div className="blob blob-blue" />
        <div className="blob blob-mint-2" />
      </div>

      <main className="screen" key={tab}>
        {tab === 'today' && <TodayScreen date={date} setDate={setDate} />}
        {tab === 'add' && (
          <AddScreen
            date={date}
            onLogged={(message, goToToday) => {
              showToast(message)
              if (goToToday) setTab('today')
            }}
          />
        )}
        {tab === 'settings' && <SettingsScreen />}
      </main>

      {toast && <div className="toast glass">{toast}</div>}

      <TabBar tab={tab} setTab={setTab} />
    </>
  )
}
