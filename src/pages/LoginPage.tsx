import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'
import { validateHandle, validateEmail, validatePassword, normalizeHandle } from '../lib/validation'
import { sanitizeErrorMessage } from '../lib/errorHandler'
import './Auth.css'

// Helper function to ensure profile and vent link exist for a user
async function ensureProfileExists(user: User) {
  // Check if profile exists
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!existingProfile) {
    // Profile doesn't exist, create it using metadata from signup
    const handle = user.user_metadata?.handle || user.email?.split('@')[0] || 'user'
    const displayName = user.user_metadata?.display_name || handle

        // Create profile with normalized handle
        const normalizedHandle = normalizeHandle(handle)
    const { error: profileError } = await supabase.from('profiles').insert({
      id: user.id,
          handle: normalizedHandle,
          display_name: displayName || normalizedHandle,
          handle_changed: false,
    })

    if (profileError && !profileError.message.includes('duplicate') && !profileError.message.includes('unique')) {
      // Log error securely (only in development)
      if (import.meta.env.DEV) {
      console.error('Error creating profile:', profileError)
      }
      return
    }

        // Create vent link with normalized handle (reuse the one from above)
    const { error: linkError } = await supabase.from('vent_links').insert({
      owner_id: user.id,
          slug: normalizedHandle,
          title: `Talk to ${displayName || normalizedHandle}`,
    })

    if (linkError && !linkError.message.includes('duplicate') && !linkError.message.includes('unique')) {
      // Log error securely (only in development)
      if (import.meta.env.DEV) {
      console.error('Error creating vent link:', linkError)
      }
    }
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [handle, setHandle] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [rememberMe, setRememberMe] = useState(false)
  const navigate = useNavigate()

  // Load remembered email on mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('ghostinbox_remembered_email')
    if (rememberedEmail) {
      setEmail(rememberedEmail)
      setRememberMe(true)
    }
  }, [])

  const handleAuth = async () => {
    setError(null)
    setSuccessMessage(null)
    setLoading(true)

    // Validate email
    const emailValidation = validateEmail(email)
    if (!emailValidation.valid) {
      setError(emailValidation.error || 'Invalid email address')
      setLoading(false)
      return
    }

    // Validate password
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      setError(passwordValidation.error || 'Invalid password')
      setLoading(false)
      return
    }

    // Check if user wants to sign up (isSignup mode) - if yes, try sign up; if no, try login
    if (isSignup) {
      // Validate handle for signup
      if (!handle.trim()) {
        setError('Handle is required for signup')
        setLoading(false)
        return
      }

      const handleValidation = validateHandle(handle)
      if (!handleValidation.valid) {
        setError(handleValidation.error || 'Invalid handle')
        setLoading(false)
        return
      }

      const normalizedHandle = normalizeHandle(handle)

      // Sign up flow
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            handle: normalizedHandle,
            display_name: displayName || normalizedHandle,
          },
        },
      })

      if (signUpError) {
        // If user already exists, try login instead
        if (signUpError.message.includes('already registered') || signUpError.message.includes('User already registered')) {
          const { data: signInData, error: signInError } =
            await supabase.auth.signInWithPassword({ email, password })

          if (signInError) {
            setError(sanitizeErrorMessage(signInError))
            setLoading(false)
            return
          }

          if (signInData.user) {
            navigate('/dashboard')
            return
          }
        } else {
          setError(sanitizeErrorMessage(signUpError))
          setLoading(false)
          return
        }
      }

      if (signUpData.user) {
        const user = signUpData.user

        // Handle is already validated above

        // Check if we have a session (email confirmation may or may not be required)
        if (!signUpData.session) {
          // Email confirmation is required - user needs to confirm email before signing in
          setSuccessMessage(`✅ Account created successfully!\n\n📧 We've sent a confirmation email to:\n${email}\n\nPlease check your inbox and click the confirmation link to activate your account. After confirming, you can sign in with your email and password.\n\nDidn't receive the email? Check your spam folder or try signing up again.`)
          setLoading(false)
          return
        }

        // We have a session, so we can create profile and vent link
        // Create profile
        const { error: profileError } = await supabase.from('profiles').insert({
          id: user.id,
          handle: handle.toLowerCase().trim(),
          display_name: displayName || handle,
          handle_changed: false,
        })

        if (profileError) {
          // If profile already exists, that's okay - user might be signing up again
          if (!profileError.message.includes('duplicate') && !profileError.message.includes('unique')) {
            setError(sanitizeErrorMessage(profileError))
            setLoading(false)
            return
          }
        }

        // Create vent link for this user (only if it doesn't exist)
        const { error: linkError } = await supabase.from('vent_links').insert({
          owner_id: user.id,
          slug: handle.toLowerCase().trim(),
          title: `Talk to ${displayName || handle}`,
        })

        if (linkError) {
          // If link already exists, that's okay
          if (!linkError.message.includes('duplicate') && !linkError.message.includes('unique')) {
            setError(sanitizeErrorMessage(linkError))
            setLoading(false)
            return
          }
        }

        navigate('/dashboard')
        return
      }
    } else {
      // Login flow (no handle provided)
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({ email, password })

      if (signInError) {
        setError(sanitizeErrorMessage(signInError))
        setLoading(false)
        return
      }

      if (signInData.user) {
        // Check if profile exists, create it if not (for users who signed up with email confirmation)
        await ensureProfileExists(signInData.user)
        
        // Save email if "Remember Me" is checked
        if (rememberMe) {
          localStorage.setItem('ghostinbox_remembered_email', email.trim().toLowerCase())
        } else {
          localStorage.removeItem('ghostinbox_remembered_email')
        }
        
        navigate('/dashboard')
      }
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)
    setLoading(true)

    // Validate email
    const emailValidation = validateEmail(email)
    if (!emailValidation.valid) {
      setError(emailValidation.error || 'Invalid email address')
      setLoading(false)
      return
    }

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      )

      if (resetError) {
        setError(sanitizeErrorMessage(resetError))
        setLoading(false)
        return
      }

      // Success - show message
      setSuccessMessage(`✅ Password reset email sent!\n\n📧 We've sent a password reset link to:\n${email}\n\nPlease check your inbox and click the link to reset your password.\n\nDidn't receive the email? Check your spam folder or try again.`)
      setLoading(false)
    } catch (err: any) {
      setError(sanitizeErrorMessage(err))
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (showForgotPassword) {
      await handleForgotPassword(e)
    } else {
    await handleAuth()
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>GhostInbox</h1>
        <p className="auth-subtitle">
          {showForgotPassword 
            ? 'Reset your password' 
            : isSignup 
            ? 'Create your account' 
            : 'Login to your account'}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          {isSignup && (
            <>
              <input
                type="text"
                className="input"
                placeholder="Handle (e.g., melvin)"
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                required={isSignup}
                disabled={loading}
                pattern="[a-z0-9]+"
                title="Only lowercase letters and numbers"
              />
              <input
                type="text"
                className="input"
                placeholder="Display name (optional)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={loading}
              />
            </>
          )}
          <input
            type="email"
            className="input"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
          {!showForgotPassword && (
          <input
            type="password"
            className="input"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            minLength={6}
          />
          )}
          
          {!isSignup && !showForgotPassword && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', marginBottom: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(true)
                  setError(null)
                  setSuccessMessage(null)
                  setPassword('')
                }}
                className="forgot-password-link"
                disabled={loading}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline', fontSize: '14px', padding: 0 }}
              >
                Forgot password?
              </button>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}
          {successMessage && (
            <div className="success-message" style={{ whiteSpace: 'pre-line', textAlign: 'left', padding: '24px', marginBottom: '20px' }}>
              <p style={{ marginBottom: '16px', fontWeight: '600', fontSize: '18px', textAlign: 'center' }}>🎉 Account Created!</p>
              <div style={{ marginBottom: '16px', lineHeight: '1.8', fontSize: '14px' }}>
                {successMessage.split('\n').map((line, idx) => {
                  if (line.startsWith('📧')) {
                    return (
                      <p key={idx} style={{ margin: '12px 0 8px 0', fontWeight: '500' }}>
                        {line}
                      </p>
                    )
                  }
                  if (line.includes('@')) {
                    return (
                      <p key={idx} style={{ margin: '4px 0 12px 0', fontWeight: '600', color: 'var(--text-primary)', backgroundColor: 'rgba(16, 185, 129, 0.15)', padding: '8px 12px', borderRadius: '6px', fontFamily: 'monospace' }}>
                        {line}
                      </p>
                    )
                  }
                  return (
                    <p key={idx} style={{ margin: line.trim() ? '8px 0' : '4px 0' }}>
                      {line}
                    </p>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsSignup(false)
                  setShowForgotPassword(false)
                  setSuccessMessage(null)
                  setError(null)
                  setHandle('')
                  setDisplayName('')
                  setEmail('')
                }}
                className="btn btn-secondary"
                style={{ width: '100%', marginTop: '12px' }}
              >
                Go to Login
              </button>
            </div>
          )}

          {!successMessage && (
          <button
            type="submit"
            className="btn"
            disabled={loading}
          >
            {loading 
              ? (showForgotPassword 
                  ? 'Sending reset link...' 
                  : isSignup 
                  ? 'Creating account...' 
                  : 'Logging in...') 
              : (showForgotPassword 
                  ? 'Send reset link' 
                  : isSignup 
                  ? 'Sign up' 
                  : 'Login')}
          </button>
          )}
          
          {showForgotPassword && !successMessage && (
            <button
              type="button"
              onClick={() => {
                setShowForgotPassword(false)
                setError(null)
                setSuccessMessage(null)
                setEmail('')
              }}
              className="btn btn-secondary"
              disabled={loading}
            >
              Back to login
          </button>
          )}
        </form>

        {!showForgotPassword && (
        <p className="auth-footer">
          {isSignup ? (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignup(false)
                  setError(null)
                  setSuccessMessage(null)
                  setHandle('')
                  setDisplayName('')
                }}
                className="link"
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Login
              </button>
            </>
          ) : (
            <>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignup(true)
                  setError(null)
                  setSuccessMessage(null)
                }}
                className="link"
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Sign up
              </button>
            </>
          )}
        </p>
        )}
      </div>
    </div>
  )
}

