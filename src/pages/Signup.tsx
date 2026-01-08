import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './Auth.css'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [handle, setHandle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const navigate = useNavigate()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      setSuccessMessage(null)
      // Sign up user with metadata to store handle/display_name for later use
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            handle: handle.toLowerCase(),
            display_name: handle,
          },
        },
      })

      if (authError) throw authError

      if (authData.user) {
        // Check if we have a session (email confirmation may or may not be required)
        if (!authData.session) {
          // Email confirmation is required - profile will be created after email confirmation
          setSuccessMessage(`✅ Account created successfully!\n\n📧 We've sent a confirmation email to:\n${email}\n\nPlease check your inbox and click the confirmation link to activate your account. After confirming, you can sign in with your email and password.\n\nDidn't receive the email? Check your spam folder or try signing up again.`)
          setLoading(false)
          return
        }

        // We have a session, so we can create profile and vent link immediately
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            handle: handle.toLowerCase(),
            display_name: handle,
            handle_changed: false,
          })

        if (profileError) throw profileError

        // Create default vent link
        const { error: ventLinkError } = await supabase
          .from('vent_links')
          .insert({
            owner_id: authData.user.id,
            slug: handle.toLowerCase(),
            title: 'Talk to me',
          })

        if (ventLinkError) throw ventLinkError

        navigate('/dashboard')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign up')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <button
          onClick={() => navigate('/')}
          className="btn btn-secondary"
          type="button"
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            fontSize: '14px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            cursor: 'pointer'
          }}
        >
          ← Back to Home
        </button>
        <h1>GhostInbox</h1>
        <p className="auth-subtitle">Create your account</p>

        <form onSubmit={handleSignup} className="auth-form">
          <input
            type="text"
            className="input"
            placeholder="Handle (e.g., melvin)"
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
            required
            disabled={loading}
            pattern="[a-z0-9]+"
            title="Only lowercase letters and numbers"
          />
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
              <Link to="/login" style={{ textDecoration: 'none', display: 'block' }}>
                <button className="btn btn-secondary" type="button" style={{ width: '100%', marginTop: '12px' }}>
                  Go to Login
                </button>
              </Link>
            </div>
          )}

          {!successMessage && (
          <button
            type="submit"
            className="btn"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Sign up'}
          </button>
          )}
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login" className="link">Login</Link>
        </p>
      </div>
    </div>
  )
}

