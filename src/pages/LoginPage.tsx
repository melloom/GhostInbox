import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'
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

    // Create profile
    const { error: profileError } = await supabase.from('profiles').insert({
      id: user.id,
      handle: handle.toLowerCase().trim(),
      display_name: displayName,
    })

    if (profileError && !profileError.message.includes('duplicate') && !profileError.message.includes('unique')) {
      console.error('Error creating profile:', profileError)
      return
    }

    // Create vent link
    const { error: linkError } = await supabase.from('vent_links').insert({
      owner_id: user.id,
      slug: handle.toLowerCase().trim(),
      title: `Talk to ${displayName}`,
    })

    if (linkError && !linkError.message.includes('duplicate') && !linkError.message.includes('unique')) {
      console.error('Error creating vent link:', linkError)
    }
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [handle, setHandle] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleAuth = async () => {
    setError(null)
    setSuccessMessage(null)
    setLoading(true)

    // Check if user wants to sign up (isSignup mode) - if yes, try sign up; if no, try login
    if (isSignup) {
      // Sign up flow
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            handle: handle.toLowerCase().trim(),
            display_name: displayName || handle,
          },
        },
      })

      if (signUpError) {
        // If user already exists, try login instead
        if (signUpError.message.includes('already registered') || signUpError.message.includes('User already registered')) {
          const { data: signInData, error: signInError } =
            await supabase.auth.signInWithPassword({ email, password })

          if (signInError) {
            setError(signInError.message)
            setLoading(false)
            return
          }

          if (signInData.user) {
            navigate('/dashboard')
            return
          }
        } else {
          setError(signUpError.message)
          setLoading(false)
          return
        }
      }

      if (signUpData.user) {
        const user = signUpData.user

        // Validate handle is provided for signup
        if (!handle.trim()) {
          setError('Handle is required for signup')
          setLoading(false)
          return
        }

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
        })

        if (profileError) {
          // If profile already exists, that's okay - user might be signing up again
          if (!profileError.message.includes('duplicate') && !profileError.message.includes('unique')) {
            setError(profileError.message)
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
            setError(linkError.message)
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
        setError(signInError.message)
        setLoading(false)
        return
      }

      if (signInData.user) {
        // Check if profile exists, create it if not (for users who signed up with email confirmation)
        await ensureProfileExists(signInData.user)
        navigate('/dashboard')
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await handleAuth()
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>GhostInbox</h1>
        <p className="auth-subtitle">{isSignup ? 'Create your account' : 'Login to your account'}</p>

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
                  setSuccessMessage(null)
                  setError(null)
                  setHandle('')
                  setDisplayName('')
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
            {loading ? (isSignup ? 'Creating account...' : 'Logging in...') : (isSignup ? 'Sign up' : 'Login')}
          </button>
          )}
        </form>

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
      </div>
    </div>
  )
}

