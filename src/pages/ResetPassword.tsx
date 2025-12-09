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
    // First, check URL hash for recovery token immediately
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const type = hashParams.get('type')
    const accessToken = hashParams.get('access_token')
    const isRecovery = type === 'recovery' && accessToken

    if (isRecovery) {
      // Recovery token in URL - wait for Supabase to process it
      setIsValidSession(false)
      setError(null)
      setCheckingSession(true)
    }

    // Listen for auth state changes (including password reset tokens from URL hash)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User clicked password reset link - session is now available
        setIsValidSession(true)
        setCheckingSession(false)
        setError(null)
      } else if (event === 'SIGNED_IN' && session) {
        // Check if this is a recovery session
        const currentHashParams = new URLSearchParams(window.location.hash.substring(1))
        const currentType = currentHashParams.get('type')
        if (currentType === 'recovery') {
          setIsValidSession(true)
          setCheckingSession(false)
          setError(null)
        } else {
          // Regular sign in, but we're on reset-password page, so don't redirect
          // Just keep checking
          setCheckingSession(false)
        }
      }
    })

    // Check current session after a brief delay to let Supabase process the hash
    setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
        if (session) {
          // Check if URL has recovery token
          const currentHashParams = new URLSearchParams(window.location.hash.substring(1))
          const currentType = currentHashParams.get('type')
          if (currentType === 'recovery') {
            setIsValidSession(true)
            setCheckingSession(false)
            setError(null)
          } else if (isRecovery) {
            // Has recovery token in URL but session might not be ready yet
            // Wait for auth state change
            setCheckingSession(false)
          } else {
            // Has session but not recovery, but we're on reset-password page
            // Don't redirect, just show error
            setError('This link is not a password reset link.')
            setIsValidSession(false)
            setCheckingSession(false)
          }
        } else {
          // No session - check if URL has recovery hash
          if (isRecovery) {
            // Recovery token in URL, wait for auth state change
            setIsValidSession(false)
            setError(null)
            setCheckingSession(false)
          } else {
            setError('Invalid or expired reset link. Please request a new password reset.')
            setIsValidSession(false)
            setCheckingSession(false)
          }
        }
      })
    }, 500) // Small delay to let Supabase process the hash

    return () => {
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

