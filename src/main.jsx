import React from 'react'
import ReactDOM from 'react-dom/client'
import AppRouter from './app/router'
import { TimeClockProvider } from './contexts/TimeClockContext'
import './styles/globals.css'
import { HelmetProvider } from 'react-helmet-async'

// Si Supabase devuelve un enlace con hash "type=recovery" en la raíz,
// fuerza la ruta a /reset-password para mostrar el formulario correcto.
if (window.location.hash && window.location.hash.includes('type=recovery') && window.location.pathname !== '/reset-password') {
  const newUrl = `/reset-password${window.location.hash}`
  window.history.replaceState(null, '', newUrl)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <TimeClockProvider>
        <AppRouter />
      </TimeClockProvider>
    </HelmetProvider>
  </React.StrictMode>
)
