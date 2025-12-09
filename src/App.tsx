import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import LoginPage from './pages/LoginPage'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import VentPage from './pages/VentPage'
import LandingPage from './pages/LandingPage'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'
import DataLeakDocumentation from './pages/DataLeakDocumentation'
import CookiePolicy from './pages/CookiePolicy'
import './App.css'

function App() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if we're on reset-password route with recovery token
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const isRecovery = hashParams.get('type') === 'recovery' && window.location.pathname === '/reset-password'

    // Check active session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        // Only log in development, and only if it's not a 403 (which is expected for unauthenticated users)
        if (import.meta.env.DEV && error.status !== 403) {
          console.error('Error getting session:', error)
        }
        setUser(null)
      } else {
        // If we're on reset-password with recovery token, don't set user (let ResetPassword handle it)
        if (isRecovery) {
          setUser(null)
        } else {
      setUser(session?.user ?? null)
        }
      }
      setLoading(false)
    }).catch((error) => {
      // Only log in development, and only if it's not a 403
      if (import.meta.env.DEV && error?.status !== 403) {
      console.error('Error getting session:', error)
      }
      setUser(null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Don't set user if it's a password recovery event and we're on reset-password route
      const currentHashParams = new URLSearchParams(window.location.hash.substring(1))
      const isCurrentRecovery = currentHashParams.get('type') === 'recovery' && window.location.pathname === '/reset-password'
      
      if (event === 'PASSWORD_RECOVERY' || (isCurrentRecovery && event === 'SIGNED_IN')) {
        // Let ResetPassword component handle this
        setUser(null)
      } else {
      setUser(session?.user ?? null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    )
  }

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/v/:slug" element={<VentPage />} />
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/dashboard" />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/signup" element={<Navigate to="/login" replace />} />
        <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/data-leak" element={<DataLeakDocumentation />} />
        <Route path="/cookie-policy" element={<CookiePolicy />} />
        <Route path="/" element={!user ? <LandingPage /> : <Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

