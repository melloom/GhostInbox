import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase, VentLink, PollWithOptions } from '../lib/supabase'
import { validateMessage, prepareMessageForStorage } from '../lib/validation'
import { sanitizeErrorMessage } from '../lib/errorHandler'
import './VentPage.css'

const MOODS = [
  { value: '', label: 'No mood' },
  { value: 'sad', label: '😢 Sad' },
  { value: 'angry', label: '😠 Angry' },
  { value: 'confused', label: '😕 Confused' },
  { value: 'grateful', label: '🙏 Grateful' },
  { value: 'happy', label: '😊 Happy' },
]

interface VentLinkWithProfile extends VentLink {
  profiles: {
    handle: string
  } | null
}

export default function VentPage() {
  const { slug } = useParams<{ slug: string }>()
  const [ventLink, setVentLink] = useState<VentLinkWithProfile | null>(null)
  const [message, setMessage] = useState('')
  const [mood, setMood] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activePolls, setActivePolls] = useState<PollWithOptions[]>([])
  const [votedPollId, setVotedPollId] = useState<string | null>(null)
  const [voting, setVoting] = useState(false)

  useEffect(() => {
    if (!slug) return

    async function fetchVentLink() {
      try {
        // Fetch vent link
        const { data: ventLinkData, error: ventLinkError } = await supabase
          .from('vent_links')
          .select('id, title, owner_id')
          .eq('slug', slug)
          .eq('is_active', true)
          .single()

        if (ventLinkError || !ventLinkData) {
          setVentLink(null)
          setError(null) // Clear error, we'll show "link not found" below
          setLoading(false)
          return
        }

        // Fetch profile handle
        const { data: profileData } = await supabase
          .from('profiles')
          .select('handle')
          .eq('id', ventLinkData.owner_id)
          .single()

        setVentLink({
          ...ventLinkData,
          profiles: profileData ? { handle: profileData.handle } : null,
        } as VentLinkWithProfile)

        // Fetch active polls for this vent link (support multiple active polls)
        const { data: pollsData, error: pollsError } = await supabase
          .from('polls')
          .select('*')
          .eq('vent_link_id', ventLinkData.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        if (!pollsError && pollsData && pollsData.length > 0) {
          // Fetch options and votes for all polls
          const pollsWithData = await Promise.all(
            pollsData.map(async (poll) => {
          const { data: optionsData } = await supabase
            .from('poll_options')
            .select('*')
                .eq('poll_id', poll.id)
            .order('display_order', { ascending: true })

          const { data: votesData } = await supabase
            .from('poll_votes')
            .select('option_id')
                .eq('poll_id', poll.id)

          const voteCounts: { [key: string]: number } = {}
          votesData?.forEach((vote) => {
            voteCounts[vote.option_id] = (voteCounts[vote.option_id] || 0) + 1
          })

              return {
                ...poll,
                options: optionsData || [],
                vote_counts: voteCounts,
                total_votes: votesData?.length || 0,
              } as PollWithOptions
            })
          )

          // Check voted polls
          const votedPolls = JSON.parse(localStorage.getItem('ghostinbox_voted_polls') || '[]')
          if (votedPolls.length > 0) {
            const votedId = pollsWithData.find(p => votedPolls.includes(p.id))?.id
            if (votedId) setVotedPollId(votedId)
          }

          setActivePolls(pollsWithData)
        }
      } catch (err: any) {
        setVentLink(null)
        setError(null)
      } finally {
        setLoading(false)
      }
    }

    fetchVentLink()
  }, [slug])

  // Set up real-time subscription for poll votes
  useEffect(() => {
    if (!ventLink || activePolls.length === 0) return

    // Subscribe to poll votes for real-time vote count updates
    const votesChannel = supabase
      .channel(`vent_poll_votes_${ventLink.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'poll_votes'
        },
        async (payload) => {
          const vote = payload.new as any
          // Check if this vote is for one of the active polls
          const poll = activePolls.find(p => p.id === vote.poll_id)
          if (poll) {
            // Fetch updated vote counts for this poll
            const { data: votesData } = await supabase
              .from('poll_votes')
              .select('option_id')
              .eq('poll_id', vote.poll_id)

            if (votesData) {
              const voteCounts: { [key: string]: number } = {}
              votesData.forEach((v) => {
                voteCounts[v.option_id] = (voteCounts[v.option_id] || 0) + 1
              })

              // Update the poll's vote counts
              setActivePolls((prev) =>
                prev.map((p) => {
                  if (p.id === vote.poll_id) {
                    return {
                      ...p,
                      vote_counts: voteCounts,
                      total_votes: votesData.length,
                    }
                  }
                  return p
                })
              )
            }
          }
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      votesChannel.unsubscribe()
    }
  }, [ventLink, activePolls])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!ventLink) return
    
    // Validate message
    const validation = validateMessage(message)
    if (!validation.valid) {
      setStatus(validation.error || 'Please write something first.')
      return
    }

    // Prepare message for storage (sanitize)
    const { sanitized, error: sanitizeError } = prepareMessageForStorage(message)
    if (sanitizeError || !sanitized) {
      setStatus(sanitizeError || 'Invalid message content.')
      return
    }

    setSubmitting(true)
    setError(null)
    setStatus(null)

    try {
      // Check rate limit first
      const { data: rateLimitData, error: rateLimitError } = await supabase.functions.invoke('rate-limit-messages', {
        body: {
          vent_link_id: ventLink.id,
        },
      })

      if (rateLimitError || !rateLimitData?.allowed) {
        const errorMsg = rateLimitData?.message || 'Rate limit exceeded. Please try again later.'
        setStatus(errorMsg)
        setSubmitting(false)
        return
      }

      // Get IP hash for rate limiting (done server-side, but we can pass it)
      // The Edge Function will hash the IP automatically
      const { error } = await supabase
        .from('vent_messages')
        .insert({
          vent_link_id: ventLink.id,
          body: sanitized,
          mood: mood || null,
          ip_hash: null, // Will be set by database trigger or Edge Function
        })

      if (error) {
        // Sanitize error message before showing to user
        const sanitizedError = sanitizeErrorMessage(error)
        setStatus(sanitizedError)
        return
      }

      setMessage('')
      setMood('')
      setStatus('Message sent anonymously. Thank you for sharing.')
    } catch (err: any) {
      // Sanitize error message before showing to user
      const sanitizedError = sanitizeErrorMessage(err)
      setStatus(sanitizedError)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVote(pollId: string, optionId: string) {
    const poll = activePolls.find(p => p.id === pollId)
    if (!poll || voting || votedPollId === pollId) return

    const votedPolls = JSON.parse(localStorage.getItem('ghostinbox_voted_polls') || '[]')
    if (votedPolls.includes(pollId)) {
      setStatus('You have already voted on this poll.')
      setVotedPollId(pollId)
      return
    }

    setVoting(true)
    try {
      const { error } = await supabase
        .from('poll_votes')
        .insert({
          poll_id: pollId,
          option_id: optionId,
          ip_hash: null,
        })

      if (error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          setStatus('You have already voted on this poll.')
          setVotedPollId(pollId)
          votedPolls.push(pollId)
          localStorage.setItem('ghostinbox_voted_polls', JSON.stringify(votedPolls))
        } else {
          const sanitizedError = sanitizeErrorMessage(error)
          setStatus(sanitizedError)
        }
        return
      }

      votedPolls.push(pollId)
      localStorage.setItem('ghostinbox_voted_polls', JSON.stringify(votedPolls))
      setVotedPollId(pollId)
      
      // Refresh poll data
      const { data: votesData } = await supabase
        .from('poll_votes')
        .select('option_id')
        .eq('poll_id', pollId)

      const voteCounts: { [key: string]: number } = {}
      votesData?.forEach((vote) => {
        voteCounts[vote.option_id] = (voteCounts[vote.option_id] || 0) + 1
      })

      setActivePolls(activePolls.map(p => 
        p.id === pollId 
          ? { ...p, vote_counts: voteCounts, total_votes: votesData?.length || 0 }
          : p
      ))
    } catch (err: any) {
      // Sanitize error message before showing to user
      const sanitizedError = sanitizeErrorMessage(err)
      setStatus(sanitizedError)
    } finally {
      setVoting(false)
    }
  }

  if (loading) {
    return (
      <div className="vent-page">
        <div className="loading">Loading…</div>
      </div>
    )
  }

  if (!ventLink) {
    return (
      <div className="vent-page">
        <div className="error-message">link not found</div>
      </div>
    )
  }

  const displayTitle = ventLink.title || `Talk to @${ventLink.profiles?.handle || 'me'}`

  return (
    <div className="vent-page">
      <div className="vent-container">
        <div className="hero-card">
          <div className="creator-header">
            <div className="avatar-circle">
              {displayTitle.charAt(0).toUpperCase()}
            </div>
            <div className="hero-text">
              <h1>{displayTitle}</h1>
              <p className="subtitle">Drop a note. You stay anonymous—always.</p>
            </div>
          </div>

          <div className="trust-grid">
            <div className="trust-pill">
              <span className="pill-icon">🕶️</span>
              Anonymous & private
            </div>
            <div className="trust-pill">
              <span className="pill-icon">🛡️</span>
              Protected & moderated
            </div>
            <div className="trust-pill">
              <span className="pill-icon">⚡</span>
              Real-time updates
            </div>
          </div>
        </div>

        <div className="info-grid">
          <div className="info-card">
            <div className="info-icon">💭</div>
            <h3>Share freely</h3>
            <p>Vent, celebrate, ask for advice, or share an idea. No accounts. No pressure.</p>
          </div>
          <div className="info-card">
            <div className="info-icon">🧠</div>
            <h3>Be kind</h3>
            <p>Keep it respectful. Harmful or abusive messages may be filtered or removed.</p>
          </div>
          <div className="info-card">
            <div className="info-icon">🔔</div>
            <h3>Stay updated</h3>
            <p>Poll votes and responses update live—no page refresh needed.</p>
          </div>
        </div>

        {/* Active Poll Section */}
        {activePolls.map((poll) => (
          <div key={poll.id} className="poll-section">
            <h3 className="poll-question">{poll.question}</h3>
            {votedPollId === poll.id || poll.total_votes ? (
              <div className="poll-results">
                {poll.options.map((option) => {
                  const voteCount = poll.vote_counts?.[option.id] || 0
                  const percentage = poll.total_votes && poll.total_votes > 0
                    ? Math.round((voteCount / poll.total_votes) * 100)
                    : 0
                  return (
                    <div key={option.id} className="poll-result-item">
                      <div className="poll-result-header">
                        <span className="poll-option-text">{option.option_text}</span>
                        <span className="poll-percentage">{percentage}%</span>
                      </div>
                      <div className="poll-result-bar">
                        <div
                          className="poll-result-fill"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="poll-result-count">{voteCount} votes</div>
                    </div>
                  )
                })}
                <div className="poll-total-votes">Total: {poll.total_votes || 0} votes</div>
              </div>
            ) : (
              <div className="poll-options">
                {poll.options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleVote(poll.id, option.id)}
                    className="poll-option-btn"
                    disabled={voting}
                  >
                    {option.option_text}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="form-card">
          <div className="form-header">
            <h3>Send a message</h3>
            <p className="form-hint">Anonymous. No tracking. Just words.</p>
          </div>

          <form onSubmit={handleSubmit} className="vent-form">
            <textarea
              className="textarea"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Say what you need to say..."
              required
              disabled={submitting}
              maxLength={5000}
            />
            <div className="char-counter">
              {message.length} / 5000 characters
            </div>

            <div className="form-row">
              <div className="form-col">
                <label className="field-label">Mood (optional)</label>
                <select
                  className="select"
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  disabled={submitting}
                >
                  {MOODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-col tips-card">
                <div className="tips-title">Tips for a helpful message</div>
                <ul className="tips-list">
                  <li>Share how you feel or what happened</li>
                  <li>Add context if you want feedback</li>
                  <li>Keep it respectful and kind</li>
                </ul>
              </div>
            </div>

            {status && (
              <div className={status.includes('wrong') || status.includes('Please') ? 'error-message' : 'success-message'}>
                {status}
              </div>
            )}

            {error && <div className="error-message">{error}</div>}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !message.trim()}
            >
              {submitting ? 'Sending...' : 'Send anonymously'}
            </button>
          </form>
        </div>

        <div className="footer-note">
          <div className="footer-pill">
            <span className="pill-icon">🔒</span>
            Your IP is hashed and rate-limited to keep this space safe.
          </div>
          <div className="footer-pill">
            <span className="pill-icon">📡</span>
            Polls and responses update live—no refresh needed.
          </div>
        </div>
      </div>
    </div>
  )
}

