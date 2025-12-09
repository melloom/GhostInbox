import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  // Only log in development to avoid cluttering production console
  if (import.meta.env.DEV) {
    console.error('Unhandled promise rejection:', event.reason)
  }
  // Prevent the default browser error handling
  event.preventDefault()
})

// Global error handler for general errors
window.addEventListener('error', (event) => {
  // Only log in development
  if (import.meta.env.DEV) {
    console.error('Global error:', event.error)
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

