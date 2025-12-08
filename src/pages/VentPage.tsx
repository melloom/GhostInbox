import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase, VentLink, PollWithOptions } from '../lib/supabase'
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
  const [activePoll, setActivePoll] = useState<PollWithOptions | null>(null)
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

        // Fetch active poll for this vent link
        const { data: pollData, error: pollError } = await supabase
          .from('polls')
          .select('*')
          .eq('vent_link_id', ventLinkData.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (!pollError && pollData) {
          // Fetch poll options
          const { data: optionsData } = await supabase
            .from('poll_options')
            .select('*')
            .eq('poll_id', pollData.id)
            .order('display_order', { ascending: true })

          // Fetch vote counts
          const { data: votesData } = await supabase
            .from('poll_votes')
            .select('option_id')
            .eq('poll_id', pollData.id)

          const voteCounts: { [key: string]: number } = {}
          votesData?.forEach((vote) => {
            voteCounts[vote.option_id] = (voteCounts[vote.option_id] || 0) + 1
          })

          // Check if user has already voted
          const votedPolls = JSON.parse(localStorage.getItem('ghostinbox_voted_polls') || '[]')
          if (votedPolls.includes(pollData.id)) {
            setVotedPollId(pollData.id)
          }

          setActivePoll({
            ...pollData,
            options: optionsData || [],
            vote_counts: voteCounts,
            total_votes: votesData?.length || 0,
          } as PollWithOptions)
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!ventLink) return
    if (!message.trim()) {
      setStatus('Please write something first.')
      return
    }

    setSubmitting(true)
    setError(null)
    setStatus(null)

    try {
      const { error } = await supabase
        .from('vent_messages')
        .insert({
          vent_link_id: ventLink.id,
          body: message.trim(),
          mood: mood || null,
          ip_hash: null, // Leave null for now as requested
        })

      if (error) {
        setStatus('Something went wrong. Try again.')
        return
      }

      setMessage('')
      setMood('')
      setStatus('Message sent anonymously. Thank you for sharing.')
    } catch (err: any) {
      setStatus('Something went wrong. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVote(optionId: string) {
    if (!activePoll || voting || votedPollId === activePoll.id) return

    // Check localStorage to prevent duplicate votes
    const votedPolls = JSON.parse(localStorage.getItem('ghostinbox_voted_polls') || '[]')
    if (votedPolls.includes(activePoll.id)) {
      setStatus('You have already voted on this poll.')
      setVotedPollId(activePoll.id)
      return
    }

    setVoting(true)
    try {
      const { error } = await supabase
        .from('poll_votes')
        .insert({
          poll_id: activePoll.id,
          option_id: optionId,
          ip_hash: null, // Anonymous voting
        })

      if (error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          setStatus('You have already voted on this poll.')
          setVotedPollId(activePoll.id)
          // Store in localStorage
          votedPolls.push(activePoll.id)
          localStorage.setItem('ghostinbox_voted_polls', JSON.stringify(votedPolls))
        } else {
          setStatus('Failed to submit vote. Try again.')
        }
        return
      }

      // Store vote in localStorage
      votedPolls.push(activePoll.id)
      localStorage.setItem('ghostinbox_voted_polls', JSON.stringify(votedPolls))
      setVotedPollId(activePoll.id)
      
      // Refresh poll data to show updated results
      const { data: votesData } = await supabase
        .from('poll_votes')
        .select('option_id')
        .eq('poll_id', activePoll.id)

      const voteCounts: { [key: string]: number } = {}
      votesData?.forEach((vote) => {
        voteCounts[vote.option_id] = (voteCounts[vote.option_id] || 0) + 1
      })

      setActivePoll({
        ...activePoll,
        vote_counts: voteCounts,
        total_votes: votesData?.length || 0,
      })
    } catch (err: any) {
      setStatus('Failed to submit vote. Try again.')
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
        <div className="creator-header">
          <div className="avatar-circle">
            {displayTitle.charAt(0).toUpperCase()}
          </div>
          <h1>{displayTitle}</h1>
        </div>

        <p className="subtitle">
          Drop a message. You'll stay anonymous.
        </p>

        {/* Active Poll Section */}
        {activePoll && (
          <div className="poll-section">
            <h3 className="poll-question">{activePoll.question}</h3>
            {votedPollId === activePoll.id || activePoll.total_votes ? (
              <div className="poll-results">
                {activePoll.options.map((option) => {
                  const voteCount = activePoll.vote_counts?.[option.id] || 0
                  const percentage = activePoll.total_votes && activePoll.total_votes > 0
                    ? Math.round((voteCount / activePoll.total_votes) * 100)
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
                <div className="poll-total-votes">Total: {activePoll.total_votes || 0} votes</div>
              </div>
            ) : (
              <div className="poll-options">
                {activePoll.options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleVote(option.id)}
                    className="poll-option-btn"
                    disabled={voting}
                  >
                    {option.option_text}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="vent-form">
          <textarea
            className="textarea"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Say what you need to say..."
            required
            disabled={submitting}
          />

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
    </div>
  )
}

