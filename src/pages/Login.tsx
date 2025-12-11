import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
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
      handle_changed: false,
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

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const navigate = useNavigate()

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      
      // Check if profile exists, create it if not (for users who signed up with email confirmation)
      if (signInData.user) {
        await ensureProfileExists(signInData.user)
      }
      
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Failed to login')
    } finally {
      setLoading(false)
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      })

      if (error) throw error
      setMagicLinkSent(true)
    } catch (err: any) {
      setError(err.message || 'Failed to send magic link')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>GhostInbox</h1>
        <p className="auth-subtitle">Login to your account</p>

        {magicLinkSent ? (
          <div className="success-message">
            <p>Check your email for the magic link!</p>
            <button onClick={() => setMagicLinkSent(false)} className="btn btn-secondary">
              Try again
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleEmailLogin} className="auth-form">
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
              />

              {error && <div className="error-message">{error}</div>}

              <button
                type="submit"
                className="btn"
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <form onSubmit={handleMagicLink} className="auth-form">
              <input
                type="email"
                className="input"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
              <button
                type="submit"
                className="btn btn-secondary"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send magic link'}
              </button>
            </form>
          </>
        )}

        <p className="auth-footer">
          Don't have an account? <Link to="/signup" className="link">Sign up</Link>
        </p>
      </div>
    </div>
  )
}

