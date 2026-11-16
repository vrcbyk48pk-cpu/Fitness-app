import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import TabBar, { type Tab } from './components/TabBar'
import TodayScreen from './components/TodayScreen'
import AddScreen from './components/AddScreen'
import HistoryScreen from './components/HistoryScreen'
import MealPrepScreen from './components/MealPrepScreen'
import SettingsScreen from './components/SettingsScreen'
import GoalSheet from './components/GoalSheet'
import Onboarding from './components/Onboarding'
import { needsGoalDetails } from './calculator'
import { dismissPaceQuestion, getProfile, needsOnboarding, paceAsked } from './db'
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

  // Onboarding: shown on first launch, and again when "Edit profile" is tapped in Settings.
  // Both values are undefined for a moment while the database is being read.
  const firstRun = useLiveQuery(needsOnboarding)
  const profile = useLiveQuery(getProfile)
  const [editingProfile, setEditingProfile] = useState(false)
  // A profile without a chosen pace (or target weight) gets one short question.
  const alreadyAsked = useLiveQuery(paceAsked)

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(''), 2000)
  }

  // Opening the Add tab from the tab bar picks the meal that fits the current time.
  function openTab(next: Tab) {
    if (next === 'add' || next === 'prep') setMeal(mealForTime(new Date()))
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

  const loading = firstRun === undefined || profile === undefined
  const showOnboarding = firstRun || editingProfile
  const askGoal = !loading && !showOnboarding && alreadyAsked === false && profile !== null && needsGoalDetails(profile)

  return (
    <>
      {/* Soft colour blobs behind everything, so the glass has something to blur. */}
      <div className="blobs" aria-hidden="true">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      {!loading && showOnboarding && (
        <Onboarding profile={profile} firstRun={firstRun} onDone={() => setEditingProfile(false)} />
      )}

      {!loading && !showOnboarding && (
        <>
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
            {tab === 'prep' && (
              <MealPrepScreen
                date={date}
                meal={meal}
                onLogged={(message) => {
                  showToast(message)
                  setTab('today')
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
            {tab === 'settings' && <SettingsScreen onEditProfile={() => setEditingProfile(true)} />}
          </main>

          <TabBar tab={tab} setTab={openTab} />

          {/* Closing it in any way counts as "Not now": it is not shown again by itself. */}
          {askGoal && <GoalSheet profile={profile} asking onClose={dismissPaceQuestion} />}
        </>
      )}

      {toast && <div className="toast glass">{toast}</div>}
    </>
  )
}
