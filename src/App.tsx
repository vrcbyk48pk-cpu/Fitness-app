import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { type Appearance, applyAppearance, readAppearance } from './appearance'
import { needsGoalDetails } from './calculator'
import TabBar, { type Tab } from './components/TabBar'
import TodayScreen from './components/TodayScreen'
import AddScreen from './components/AddScreen'
import AppearanceSetup from './components/AppearanceSetup'
import HistoryScreen from './components/HistoryScreen'
import MealPrepScreen from './components/MealPrepScreen'
import SettingsScreen from './components/SettingsScreen'
import GoalSheet from './components/GoalSheet'
import Onboarding from './components/Onboarding'
import { dismissPaceQuestion, getAppearanceChosen, getProfile, getSavedAppearance, needsOnboarding, paceAsked } from './db'
import { isThemeId } from './themes'
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

  // Language and theme. main.tsx applied them before the first draw; keeping them in state
  // here makes React redraw everything when they change.
  const [appearance, setAppearance] = useState<Appearance>(readAppearance)

  // The first screens: language and theme (once for everyone), then the profile questions (new users).
  // These values are undefined for a moment while the database is being read.
  const appearanceChosen = useLiveQuery(getAppearanceChosen)
  const firstRun = useLiveQuery(needsOnboarding)
  const profile = useLiveQuery(getProfile)
  const [editingProfile, setEditingProfile] = useState(false)
  // A profile without a chosen pace (or target weight) gets one short question.
  const alreadyAsked = useLiveQuery(paceAsked)

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(''), 2000)
  }

  // Opening the Add or Meal prep tab picks the meal that fits the current time.
  function openTab(next: Tab) {
    if (next === 'add' || next === 'prep') setMeal(mealForTime(new Date()))
    setTab(next)
  }

  useEffect(() => {
    // The database is the real record of the language and theme. After restoring a backup it can
    // differ from the quick copy that was read at startup: follow the database.
    getSavedAppearance().then((saved) => {
      if ((saved.language === 'en' || saved.language === 'nl') && isThemeId(saved.theme)) {
        const next: Appearance = { language: saved.language, theme: saved.theme }
        applyAppearance(next)
        setAppearance(next)
      }
    })

    // When the iPhone switches between light and dark mode, apply the theme again
    // (Liquid glass has a dark version).
    const darkMode = window.matchMedia('(prefers-color-scheme: dark)')
    const onDarkMode = () => applyAppearance(readAppearance())
    darkMode.addEventListener('change', onDarkMode)

    // A home-screen app can stay open for days. When you come back to it on a new day
    // while it was still showing "today", move along to the new today.
    let lastToday = todayKey()
    function onVisible() {
      const now = todayKey()
      if (document.visibilityState !== 'visible' || now === lastToday) return
      const previous = lastToday
      lastToday = now
      setDate((current) => (current === previous ? now : current))
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      darkMode.removeEventListener('change', onDarkMode)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  const loading = appearanceChosen === undefined || firstRun === undefined || profile === undefined
  const showAppearance = !loading && !appearanceChosen
  const showOnboarding = !loading && !showAppearance && (firstRun || editingProfile)
  const showApp = !loading && !showAppearance && !showOnboarding
  const askGoal = showApp && alreadyAsked === false && profile !== null && needsGoalDetails(profile)

  return (
    <>
      {/* Soft colour blobs behind everything (only some themes make them visible). */}
      <div className="blobs" aria-hidden="true">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      {/* Outside the keyed part below, so it keeps its place when the language changes. */}
      {showAppearance && <AppearanceSetup appearance={appearance} onChange={setAppearance} />}

      {/* The key makes React rebuild everything inside when the language changes, so every text is redrawn. */}
      <div key={appearance.language}>
      {showOnboarding && <Onboarding profile={profile} firstRun={firstRun} onDone={() => setEditingProfile(false)} />}

      {showApp && (
        <>
          <main className="screen" key={tab}>
            {/* A striped band at the top (only some themes give it a height). */}
            <div className="stripes" aria-hidden="true" />

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
            {tab === 'settings' && (
              <SettingsScreen appearance={appearance} onAppearance={setAppearance} onEditProfile={() => setEditingProfile(true)} />
            )}
          </main>

          <TabBar tab={tab} setTab={openTab} />

          {/* Closing it in any way counts as "Not now": it is not shown again by itself. */}
          {askGoal && <GoalSheet profile={profile} asking onClose={dismissPaceQuestion} />}
        </>
      )}

        {toast && <div className="toast chip">{toast}</div>}
      </div>
    </>
  )
}
