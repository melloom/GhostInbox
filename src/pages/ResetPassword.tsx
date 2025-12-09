import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { validatePassword } from '../lib/validation'
import { sanitizeErrorMessage } from '../lib/errorHandler'
import './Auth.css'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isValidSession, setIsValidSession] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    let isMounted = true

    // Check URL hash for recovery token
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const type = hashParams.get('type')
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')
    const hasRecoveryToken = type === 'recovery' && (accessToken || refreshToken)

    // Listen for auth state changes (including password reset tokens from URL hash)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return

      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        // User clicked password reset link - session is now available
        // If we have a session, allow password reset (Supabase only creates session from valid reset links)
        setIsValidSession(true)
        setCheckingSession(false)
        setError(null)
      } else if (event === 'SIGNED_OUT') {
        // User signed out
        setIsValidSession(false)
        setCheckingSession(false)
        if (!hasRecoveryToken) {
          setError('Session expired. Please request a new password reset.')
        }
      }
    })

    // Check current session with retries to handle async processing
    const checkSession = async (attempt = 0) => {
      if (!isMounted) return

      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!isMounted) return

        // Check URL hash again (might have changed after processing)
        const currentHashParams = new URLSearchParams(window.location.hash.substring(1))
        const currentType = currentHashParams.get('type')
        const currentAccessToken = currentHashParams.get('access_token')
        const currentRefreshToken = currentHashParams.get('refresh_token')
        const hasRecoveryInUrl = currentType === 'recovery' && (currentAccessToken || currentRefreshToken)

        if (session) {
          // We have a session - if we're on reset-password page, allow reset
          // Supabase only creates a session from valid reset links, so if session exists
          // and we're on this page, user likely came from a valid reset link
          setIsValidSession(true)
          setCheckingSession(false)
          setError(null)
        } else {
          // No session yet
          if (hasRecoveryInUrl || hasRecoveryToken) {
            // Recovery token in URL but no session yet - wait for Supabase to process
            if (attempt < 5) {
              // Retry after delay (Supabase needs time to process the hash)
              timeoutId = setTimeout(() => checkSession(attempt + 1), 1000)
              return
            } else {
              // After 5 attempts, still no session - might be expired or invalid token
              setError('Invalid or expired reset link. Please request a new password reset.')
              setIsValidSession(false)
              setCheckingSession(false)
              return
            }
          } else {
            // No session and no recovery token in URL
            setError('Invalid or expired reset link. Please request a new password reset.')
            setIsValidSession(false)
            setCheckingSession(false)
            return
          }
        }
      } catch (err) {
        if (!isMounted) return
        console.error('Error checking session:', err)
        setError('Error verifying reset link. Please try again.')
        setIsValidSession(false)
        setCheckingSession(false)
      }
    }

    // Initial check with delay to let Supabase process the hash
    timeoutId = setTimeout(() => checkSession(0), 500)

    return () => {
      isMounted = false
      if (timeoutId) clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [navigate])

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    // Validate passwords
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      setError(passwordValidation.error || 'Invalid password')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      // Update password using Supabase
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      })

      if (updateError) {
        setError(sanitizeErrorMessage(updateError))
        setLoading(false)
        return
      }

      // Success - clear URL hash and redirect
      window.history.replaceState(null, '', window.location.pathname)
      
      setSuccessMessage('✅ Password reset successfully!\n\nYou can now log in with your new password.')
      setPassword('')
      setConfirmPassword('')
      setLoading(false)

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (err: any) {
      setError(sanitizeErrorMessage(err))
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <h1>Reset Password</h1>
          <p className="auth-subtitle">Verifying reset link...</p>
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div className="loading-spinner">Loading...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>Reset Password</h1>
        <p className="auth-subtitle">Enter your new password</p>

        {!isValidSession && error && (
          <div className="error-message" style={{ marginBottom: '20px' }}>
            {error}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '16px' }}
            >
              Back to login
            </button>
          </div>
        )}

        {isValidSession && (
          <form onSubmit={handleResetPassword} className="auth-form">
            <input
              type="password"
              className="input"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              minLength={8}
            />
            <input
              type="password"
              className="input"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              minLength={8}
            />

            {error && <div className="error-message">{error}</div>}
            {successMessage && (
              <div className="success-message" style={{ whiteSpace: 'pre-line', textAlign: 'left', padding: '24px', marginBottom: '20px' }}>
                <p style={{ marginBottom: '16px', fontWeight: '600', fontSize: '18px', textAlign: 'center' }}>✅ Password Reset!</p>
                <div style={{ marginBottom: '16px', lineHeight: '1.8', fontSize: '14px' }}>
                  {successMessage.split('\n').map((line, idx) => (
                    <p key={idx} style={{ margin: line.trim() ? '8px 0' : '4px 0' }}>
                      {line}
                    </p>
                  ))}
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '16px', textAlign: 'center' }}>
                  Redirecting to login...
                </p>
              </div>
            )}

            {!successMessage && (
              <button
                type="submit"
                className="btn"
                disabled={loading}
              >
                {loading ? 'Resetting password...' : 'Reset password'}
              </button>
            )}

            {!successMessage && (
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="btn btn-secondary"
                disabled={loading}
              >
                Back to login
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  )
}

