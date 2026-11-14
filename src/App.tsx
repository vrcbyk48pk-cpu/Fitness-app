import { useEffect, useState } from 'react'
import TabBar, { type Tab } from './components/TabBar'
import TodayScreen from './components/TodayScreen'
import AddScreen from './components/AddScreen'
import HistoryScreen from './components/HistoryScreen'
import SettingsScreen from './components/SettingsScreen'
import type { Meal } from './types'
import { mealForTime, todayKey } from './utils'

export default function App() {
  const [tab, setTab] = useState<Tab>('today')
  // The day being viewed, as "YYYY-MM-DD". New entries are logged to this day.
  const [date, setDate] = useState(todayKey())
  // The meal new entries are logged to.
  const [meal, setMeal] = useState<Meal>(mealForTime(new Date()))
  // A short message that pops up at the top, e.g. "Added Oats".
  const [toast, setToast] = useState('')

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(''), 2000)
  }

  // Opening the Add tab from the tab bar picks the meal that fits the current time.
  function openTab(next: Tab) {
    if (next === 'add') setMeal(mealForTime(new Date()))
    setTab(next)
  }

  // A home-screen app can stay open for days. When you come back to it on a new day
  // while it was still showing "today", move along to the new today.
  useEffect(() => {
    let lastToday = todayKey()
    function onVisible() {
      const now = todayKey()
      if (document.visibilityState !== 'visible' || now === lastToday) return
      const previous = lastToday
      lastToday = now
      setDate((current) => (current === previous ? now : current))
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  return (
    <>
      {/* Soft colour blobs behind everything, so the glass has something to blur. */}
      <div className="blobs" aria-hidden="true">
        <div className="blob blob-mint" />
        <div className="blob blob-blue" />
        <div className="blob blob-mint-2" />
      </div>

      <main className="screen" key={tab}>
        {tab === 'today' && (
          <TodayScreen
            date={date}
            setDate={setDate}
            onToast={showToast}
            onAddTo={(m) => {
              setMeal(m)
              setTab('add')
            }}
          />
        )}
        {tab === 'add' && (
          <AddScreen
            date={date}
            meal={meal}
            setMeal={setMeal}
            onLogged={(message, goToToday) => {
              showToast(message)
              if (goToToday) setTab('today')
            }}
          />
        )}
        {tab === 'history' && (
          <HistoryScreen
            onOpenDay={(day) => {
              setDate(day)
              setTab('today')
            }}
          />
        )}
        {tab === 'settings' && <SettingsScreen />}
      </main>

      {toast && <div className="toast glass">{toast}</div>}

      <TabBar tab={tab} setTab={openTab} />
    </>
  )
}
