import React from 'react'
import ReactDOM from 'react-dom/client'
import AppRouter from './app/router'
import { TimeClockProvider } from './contexts/TimeClockContext'
import './styles/globals.css'
import { HelmetProvider } from 'react-helmet-async'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <TimeClockProvider>
        <AppRouter />
      </TimeClockProvider>
    </HelmetProvider>
  </React.StrictMode>
)
