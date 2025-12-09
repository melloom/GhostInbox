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
  const navigate = useNavigate()

  useEffect(() => {
    // Check if we have a valid session from the password reset link
    // Supabase handles the token via URL hash fragments
    supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (sessionError || !session) {
        setError('Invalid or expired reset link. Please request a new password reset.')
        setIsValidSession(false)
      } else {
        setIsValidSession(true)
      }
    })
  }, [])

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

      // Success
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

