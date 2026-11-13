import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { refreshBookings } from './lib/reservations'
import { loadConfig } from './lib/store'

// Real site: menu, hours, tables… come from the server, so fetch them before the
// first render (one small request). If the server can't be reached the site
// still opens with the printed menu and default hours.
const ready = Promise.allSettled([loadConfig(), refreshBookings()])
const timeout = new Promise((resolve) => setTimeout(resolve, 4000))

Promise.race([ready, timeout]).then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
