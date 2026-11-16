import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './theme.css'
import './styles.css'

// Ask the browser not to clear our data when the phone runs low on space.
navigator.storage?.persist?.()

// iOS Safari only applies the CSS ":active" press effect when a touch listener exists.
document.addEventListener('touchstart', () => {}, { passive: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
