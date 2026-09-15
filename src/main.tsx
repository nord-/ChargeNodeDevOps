import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './auth/AuthContext'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)

// The service worker is cache-first for everything that is not navigation or an
// API call, which in dev means Vite's own module URLs — it would serve stale
// source modules and hide every edit. Register it in production only, and
// unregister any copy a previous dev session installed.
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/ChargeNodeDevOps/sw.js')
    })
  } else {
    navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(reg => reg.unregister()))
    caches.keys().then(keys => keys.forEach(key => caches.delete(key)))
  }
}
