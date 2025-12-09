import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase, VentLink, PollWithOptions, QASession, QAQuestion, Challenge, ChallengeSubmission, Raffle, RaffleEntry } from '../lib/supabase'
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
  const [activeTab, setActiveTab] = useState<'message' | 'polls' | 'qa' | 'challenges' | 'raffles'>('message')
  const [activeQASessions, setActiveQASessions] = useState<QASession[]>([])
  const [qaQuestions, setQaQuestions] = useState<{ [sessionId: string]: QAQuestion[] }>({})
  const [submittingQuestion, setSubmittingQuestion] = useState<string | null>(null)
  const [questionTexts, setQuestionTexts] = useState<{ [sessionId: string]: string }>({})
  const [activeChallenges, setActiveChallenges] = useState<Challenge[]>([])
  const [challengeSubmissions, setChallengeSubmissions] = useState<{ [challengeId: string]: ChallengeSubmission[] }>({})
  const [submittingChallenge, setSubmittingChallenge] = useState<string | null>(null)
  const [submissionTexts, setSubmissionTexts] = useState<{ [challengeId: string]: string }>({})
  const [activeRaffles, setActiveRaffles] = useState<Raffle[]>([])
  const [raffleEntries, setRaffleEntries] = useState<{ [raffleId: string]: RaffleEntry[] }>({})
  const [enteringRaffle, setEnteringRaffle] = useState<string | null>(null)
  const [entryNames, setEntryNames] = useState<{ [raffleId: string]: string }>({})

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

        // Fetch active Q&A sessions
        const { data: qaSessionsData, error: qaSessionsError } = await supabase
          .from('qa_sessions')
          .select('*')
          .eq('vent_link_id', ventLinkData.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        if (!qaSessionsError && qaSessionsData && qaSessionsData.length > 0) {
          setActiveQASessions(qaSessionsData)
          
          // Fetch questions for each session
          const questionsBySession: { [sessionId: string]: QAQuestion[] } = {}
          for (const session of qaSessionsData) {
            const { data: questionsData } = await supabase
              .from('qa_questions')
              .select('*')
              .eq('qa_session_id', session.id)
              .order('created_at', { ascending: false })
            questionsBySession[session.id] = questionsData || []
          }
          setQaQuestions(questionsBySession)
        }

        // Fetch active Challenges
        const { data: challengesData, error: challengesError } = await supabase
          .from('challenges')
          .select('*')
          .eq('vent_link_id', ventLinkData.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        if (!challengesError && challengesData && challengesData.length > 0) {
          setActiveChallenges(challengesData)
          
          // Fetch submissions for each challenge
          const submissionsByChallenge: { [challengeId: string]: ChallengeSubmission[] } = {}
          for (const challenge of challengesData) {
            const { data: submissionsData } = await supabase
              .from('challenge_submissions')
              .select('*')
              .eq('challenge_id', challenge.id)
              .order('created_at', { ascending: false })
            submissionsByChallenge[challenge.id] = submissionsData || []
          }
          setChallengeSubmissions(submissionsByChallenge)
        }

        // Fetch active Raffles
        const { data: rafflesData, error: rafflesError } = await supabase
          .from('raffles')
          .select('*')
          .eq('vent_link_id', ventLinkData.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        if (!rafflesError && rafflesData && rafflesData.length > 0) {
          setActiveRaffles(rafflesData)
          
          // Fetch entries for each raffle
          const entriesByRaffle: { [raffleId: string]: RaffleEntry[] } = {}
          for (const raffle of rafflesData) {
            const { data: entriesData } = await supabase
              .from('raffle_entries')
              .select('*')
              .eq('raffle_id', raffle.id)
              .order('created_at', { ascending: false })
            entriesByRaffle[raffle.id] = entriesData || []
          }
          setRaffleEntries(entriesByRaffle)
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

  // Set up real-time subscriptions for challenges and submissions
  useEffect(() => {
    if (!ventLink) return

    // Subscribe to challenge changes
    const challengeChannel = supabase
      .channel(`challenges_${ventLink.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'challenges',
          filter: `vent_link_id=eq.${ventLink.id}`
        },
        async (payload) => {
          try {
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const challenge = payload.new as Challenge
              if (challenge.is_active) {
                // Fetch updated challenge with submissions
                const { data: submissionsData, error: submissionsError } = await supabase
                  .from('challenge_submissions')
                  .select('*')
                  .eq('challenge_id', challenge.id)
                  .order('created_at', { ascending: false })
                
                if (submissionsError) {
                  console.error('Error fetching challenge submissions:', submissionsError)
                }
              
                setActiveChallenges((prev) => {
                  const existing = prev.find(c => c.id === challenge.id)
                  if (existing) {
                    return prev.map(c => c.id === challenge.id ? challenge : c)
                  } else {
                    return [...prev, challenge]
                  }
                })
              
                if (!submissionsError) {
                  setChallengeSubmissions((prev) => ({
                    ...prev,
                    [challenge.id]: submissionsData || []
                  }))
                }
              } else {
                // Remove inactive challenge
                setActiveChallenges((prev) => prev.filter(c => c.id !== challenge.id))
              }
            } else if (payload.eventType === 'DELETE') {
              setActiveChallenges((prev) => prev.filter(c => c.id !== payload.old.id))
              setChallengeSubmissions((prev) => {
                const updated = { ...prev }
                delete updated[payload.old.id]
                return updated
              })
            }
          } catch (err) {
            console.error('Error in challenge subscription callback:', err)
          }
        }
      )
      .subscribe()

    // Subscribe to challenge submission changes
    const submissionChannel = supabase
      .channel(`challenge_submissions_${ventLink.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'challenge_submissions'
        },
        async (payload) => {
          try {
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const submission = payload.new as ChallengeSubmission
              // Check if this submission belongs to an active challenge
              const challenge = activeChallenges.find(c => c.id === submission.challenge_id)
              if (challenge) {
                // Fetch all submissions for this challenge
                const { data: submissionsData, error: submissionsError } = await supabase
                  .from('challenge_submissions')
                  .select('*')
                  .eq('challenge_id', submission.challenge_id)
                  .order('created_at', { ascending: false })
                
                if (submissionsError) {
                  console.error('Error fetching challenge submissions:', submissionsError)
                  return
                }
              
                setChallengeSubmissions((prev) => ({
                  ...prev,
                  [submission.challenge_id]: submissionsData || []
                }))
              }
            }
          } catch (err) {
            console.error('Error in challenge submission subscription callback:', err)
          }
        }
      )
      .subscribe()

    return () => {
      challengeChannel.unsubscribe()
      submissionChannel.unsubscribe()
    }
  }, [ventLink, activeChallenges])

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
          try {
            const vote = payload.new as any
            // Check if this vote is for one of the active polls
            const poll = activePolls.find(p => p.id === vote.poll_id)
            if (poll) {
              // Fetch updated vote counts for this poll
              const { data: votesData, error: votesError } = await supabase
                .from('poll_votes')
                .select('option_id')
                .eq('poll_id', vote.poll_id)

              if (votesError) {
                console.error('Error fetching vote counts:', votesError)
                return
              }

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
          } catch (err) {
            console.error('Error in vote subscription callback:', err)
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

  async function submitQuestion(sessionId: string) {
    const questionText = questionTexts[sessionId] || ''
    if (!questionText.trim()) {
      setStatus('Please enter a question')
      return
    }

    setSubmittingQuestion(sessionId)
    try {
      const { error } = await supabase
        .from('qa_questions')
        .insert({
          qa_session_id: sessionId,
          question_text: questionText.trim(),
          ip_hash: null,
        })

      if (error) {
        const sanitizedError = sanitizeErrorMessage(error)
        setStatus(sanitizedError)
        return
      }

      setQuestionTexts(prev => ({ ...prev, [sessionId]: '' }))
      setStatus('Question submitted!')
      
      // Refresh questions
      const { data: questionsData } = await supabase
        .from('qa_questions')
        .select('*')
        .eq('qa_session_id', sessionId)
        .order('created_at', { ascending: false })
      
      setQaQuestions(prev => ({
        ...prev,
        [sessionId]: questionsData || []
      }))
    } catch (err: any) {
      const sanitizedError = sanitizeErrorMessage(err)
      setStatus(sanitizedError)
    } finally {
      setSubmittingQuestion(null)
    }
  }

  async function submitChallenge(challengeId: string) {
    const submissionText = submissionTexts[challengeId] || ''
    if (!submissionText.trim()) {
      setStatus('Please enter your submission')
      return
    }

    setSubmittingChallenge(challengeId)
    try {
      const { error } = await supabase
        .from('challenge_submissions')
        .insert({
          challenge_id: challengeId,
          submission_text: submissionText.trim(),
          ip_hash: null,
        })

      if (error) {
        const sanitizedError = sanitizeErrorMessage(error)
        setStatus(sanitizedError)
        return
      }

      setSubmissionTexts(prev => ({ ...prev, [challengeId]: '' }))
      setStatus('Submission sent!')
      
      // Refresh submissions
      const { data: submissionsData } = await supabase
        .from('challenge_submissions')
        .select('*')
        .eq('challenge_id', challengeId)
        .order('created_at', { ascending: false })
      
      setChallengeSubmissions(prev => ({
        ...prev,
        [challengeId]: submissionsData || []
      }))
    } catch (err: any) {
      const sanitizedError = sanitizeErrorMessage(err)
      setStatus(sanitizedError)
    } finally {
      setSubmittingChallenge(null)
    }
  }

  async function enterRaffle(raffleId: string) {
    const entryName = entryNames[raffleId] || ''
    if (!entryName.trim()) {
      setStatus('Please enter your name')
      return
    }

    setEnteringRaffle(raffleId)
    try {
      const { error } = await supabase
        .from('raffle_entries')
        .insert({
          raffle_id: raffleId,
          entry_name: entryName.trim(),
          ip_hash: null,
        })

      if (error) {
        const sanitizedError = sanitizeErrorMessage(error)
        setStatus(sanitizedError)
        return
      }

      setEntryNames(prev => ({ ...prev, [raffleId]: '' }))
      setStatus('Entry submitted!')
      
      // Refresh entries
      const { data: entriesData } = await supabase
        .from('raffle_entries')
        .select('*')
        .eq('raffle_id', raffleId)
        .order('created_at', { ascending: false })
      
      setRaffleEntries(prev => ({
        ...prev,
        [raffleId]: entriesData || []
      }))
    } catch (err: any) {
      const sanitizedError = sanitizeErrorMessage(err)
      setStatus(sanitizedError)
    } finally {
      setEnteringRaffle(null)
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

        {/* Tabs Navigation */}
        <div className="vent-tabs">
          <button
            className={`vent-tab ${activeTab === 'message' ? 'active' : ''}`}
            onClick={() => setActiveTab('message')}
          >
            💬 Message
            {activePolls.length > 0 || activeQASessions.length > 0 ? null : <span className="tab-badge">New</span>}
          </button>
          {activePolls.length > 0 && (
            <button
              className={`vent-tab ${activeTab === 'polls' ? 'active' : ''}`}
              onClick={() => setActiveTab('polls')}
            >
              📊 Polls
              <span className="tab-badge">{activePolls.length}</span>
            </button>
          )}
          {activeQASessions.length > 0 && (
            <button
              className={`vent-tab ${activeTab === 'qa' ? 'active' : ''}`}
              onClick={() => setActiveTab('qa')}
            >
              💬 Q&A
              <span className="tab-badge">{activeQASessions.length}</span>
            </button>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === 'message' && (
          <div className="tab-content">
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
        )}

        {activeTab === 'polls' && (
          <div className="tab-content">
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
          </div>
        )}

        {activeTab === 'qa' && (
          <div className="tab-content">
            {activeQASessions.map((session) => {
              const questions = qaQuestions[session.id] || []
              return (
                <div key={session.id} className="poll-section">
                  <h3 className="poll-question">{session.title}</h3>
                  {session.description && (
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                      {session.description}
                    </p>
                  )}
                  
                  <div style={{ marginBottom: '20px' }}>
                    <textarea
                      className="textarea"
                      placeholder="Ask your question..."
                      value={questionTexts[session.id] || ''}
                      onChange={(e) => setQuestionTexts(prev => ({ ...prev, [session.id]: e.target.value }))}
                      rows={4}
                      style={{ marginBottom: '12px' }}
                    />
                    <button
                      onClick={() => submitQuestion(session.id)}
                      className="btn btn-primary"
                      disabled={submittingQuestion === session.id || !(questionTexts[session.id] || '').trim()}
                      style={{ width: '100%' }}
                    >
                      {submittingQuestion === session.id ? 'Submitting...' : 'Submit Question'}
                    </button>
                  </div>

                  {questions.length > 0 && (
                    <div className="poll-results">
                      <h4 style={{ marginBottom: '16px', textAlign: 'center' }}>Questions & Answers ({questions.length})</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {questions.map((question) => (
                          <div key={question.id} style={{ 
                            padding: '16px', 
                            background: 'var(--bg-secondary)', 
                            borderRadius: '8px',
                            border: question.is_answered ? '1px solid var(--success)' : '1px solid var(--border)'
                          }}>
                            <div style={{ marginBottom: question.is_answered ? '12px' : '0' }}>
                              <p style={{ fontWeight: 500, marginBottom: '8px' }}>{question.question_text}</p>
                              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                {new Date(question.created_at).toLocaleString()}
                              </span>
                            </div>
                            {question.is_answered && question.answer_text && (
                              <div style={{ 
                                padding: '12px', 
                                background: 'var(--bg-primary)', 
                                borderRadius: '6px',
                                marginTop: '12px',
                                borderLeft: '3px solid var(--success)'
                              }}>
                                <strong style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Answer:</strong>
                                <p style={{ marginTop: '4px' }}>{question.answer_text}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {activeTab === 'challenges' && (
          <div className="tab-content">
            {activeChallenges.map((challenge) => {
              const submissions = challengeSubmissions[challenge.id] || []
              const winners = submissions.filter(s => s.is_winner)
              const now = new Date()
              const isUpcoming = challenge.starts_at && new Date(challenge.starts_at) > now
              const isEnded = challenge.ends_at && new Date(challenge.ends_at) < now
              const canSubmit = !isUpcoming && !isEnded

              return (
                <div key={challenge.id} className="poll-section" style={{
                  borderLeft: isUpcoming ? '4px solid var(--accent)' :
                               isEnded ? '4px solid var(--text-secondary)' :
                               '4px solid var(--success)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <h3 className="poll-question" style={{ margin: 0, flex: 1 }}>
                      {challenge.challenge_type === 'contest' && '🏆 '}
                      {challenge.challenge_type === 'giveaway' && '🎁 '}
                      {challenge.challenge_type === 'challenge' && '💪 '}
                      {challenge.title}
                    </h3>
                    <span style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background: isUpcoming ? 'rgba(139, 92, 246, 0.1)' :
                                   isEnded ? 'rgba(107, 114, 128, 0.1)' :
                                   'rgba(16, 185, 129, 0.1)',
                      color: isUpcoming ? 'var(--accent)' :
                             isEnded ? 'var(--text-secondary)' :
                             'var(--success)'
                    }}>
                      {isUpcoming ? '🔵 Upcoming' :
                       isEnded ? '⚫ Ended' :
                       '🟢 Active'}
                    </span>
                  </div>
                  
                  {challenge.description && (
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.6' }}>
                      {challenge.description}
                    </p>
                  )}
                  
                  {challenge.prize_description && (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '14px', 
                      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)', 
                      borderRadius: '10px',
                      marginBottom: '20px',
                      border: '2px solid var(--accent)'
                    }}>
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎁</div>
                      <strong style={{ color: 'var(--accent)', fontSize: '16px' }}>Prize: {challenge.prize_description}</strong>
                    </div>
                  )}
                  
                  {challenge.rules && (
                    <div style={{ 
                      padding: '14px', 
                      background: 'var(--bg-secondary)', 
                      borderRadius: '8px',
                      marginBottom: '20px',
                      fontSize: '14px',
                      border: '1px solid var(--border)'
                    }}>
                      <strong style={{ display: 'block', marginBottom: '8px' }}>📋 Rules:</strong>
                      <p style={{ margin: 0, whiteSpace: 'pre-line', lineHeight: '1.6' }}>{challenge.rules}</p>
                    </div>
                  )}

                  {(challenge.starts_at || challenge.ends_at) && (
                    <div style={{ 
                      display: 'flex', 
                      gap: '16px', 
                      marginBottom: '20px',
                      flexWrap: 'wrap',
                      justifyContent: 'center'
                    }}>
                      {challenge.starts_at && (
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          📅 Starts: {new Date(challenge.starts_at).toLocaleString()}
                        </div>
                      )}
                      {challenge.ends_at && (
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          ⏰ Ends: {new Date(challenge.ends_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {canSubmit ? (
                    <div style={{ marginBottom: '20px' }}>
                      <textarea
                        className="textarea"
                        placeholder="Enter your submission..."
                        value={submissionTexts[challenge.id] || ''}
                        onChange={(e) => setSubmissionTexts(prev => ({ ...prev, [challenge.id]: e.target.value }))}
                        rows={5}
                        style={{ marginBottom: '12px' }}
                      />
                      <button
                        onClick={() => submitChallenge(challenge.id)}
                        className="btn btn-primary"
                        disabled={submittingChallenge === challenge.id || !(submissionTexts[challenge.id] || '').trim()}
                        style={{ width: '100%' }}
                      >
                        {submittingChallenge === challenge.id ? 'Submitting...' : 'Submit Entry'}
                      </button>
                    </div>
                  ) : (
                    <div style={{
                      padding: '16px',
                      background: 'var(--bg-secondary)',
                      borderRadius: '8px',
                      marginBottom: '20px',
                      textAlign: 'center',
                      border: '1px solid var(--border)'
                    }}>
                      <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                        {isUpcoming ? '⏳ This challenge hasn\'t started yet' : '🔒 This challenge has ended'}
                      </p>
                    </div>
                  )}

                  {submissions.length > 0 && (
                    <div className="poll-results">
                      <h4 style={{ marginBottom: '16px', textAlign: 'center' }}>
                        Submissions ({submissions.length})
                        {winners.length > 0 && (
                          <span style={{ color: 'var(--accent)', marginLeft: '8px' }}>
                            • {winners.length} Winner{winners.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {submissions.map((submission) => (
                          <div key={submission.id} style={{ 
                            padding: '16px', 
                            background: submission.is_winner ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-secondary)', 
                            borderRadius: '10px',
                            border: submission.is_winner ? '2px solid var(--success)' : '1px solid var(--border)',
                            transition: 'all 0.2s'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                              {submission.is_winner && (
                                <span style={{ fontSize: '24px', lineHeight: 1 }}>🏆</span>
                              )}
                              <div style={{ flex: 1 }}>
                                <p style={{ 
                                  fontWeight: submission.is_winner ? 600 : 500, 
                                  marginBottom: '8px',
                                  lineHeight: '1.6',
                                  whiteSpace: 'pre-wrap'
                                }}>
                                  {submission.submission_text}
                                </p>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    {new Date(submission.created_at).toLocaleString()}
                                  </span>
                                  {submission.is_winner && (
                                    <span style={{
                                      padding: '4px 10px',
                                      background: 'var(--success)',
                                      color: 'white',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      fontWeight: 600
                                    }}>
                                      WINNER
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {activeTab === 'raffles' && (
          <div className="tab-content">
            {activeRaffles.map((raffle) => {
              const entries = raffleEntries[raffle.id] || []
              const winners = entries.filter(e => e.is_winner)
              const now = new Date()
              const isUpcoming = raffle.starts_at && new Date(raffle.starts_at) > now
              const isEnded = raffle.ends_at && new Date(raffle.ends_at) < now
              const canEnter = !isUpcoming && !isEnded && !raffle.is_drawn

              return (
                <div key={raffle.id} className="poll-section" style={{
                  borderLeft: isUpcoming ? '4px solid var(--accent)' :
                               isEnded || raffle.is_drawn ? '4px solid var(--text-secondary)' :
                               '4px solid var(--success)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <h3 className="poll-question" style={{ margin: 0, flex: 1 }}>
                      🎲 {raffle.title}
                    </h3>
                    <span style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background: isUpcoming ? 'rgba(139, 92, 246, 0.1)' :
                                   isEnded || raffle.is_drawn ? 'rgba(107, 114, 128, 0.1)' :
                                   'rgba(16, 185, 129, 0.1)',
                      color: isUpcoming ? 'var(--accent)' :
                             isEnded || raffle.is_drawn ? 'var(--text-secondary)' :
                             'var(--success)'
                    }}>
                      {isUpcoming ? '🔵 Upcoming' :
                       raffle.is_drawn ? '🎉 Drawn' :
                       isEnded ? '⚫ Ended' :
                       '🟢 Active'}
                    </span>
                  </div>
                  
                  {raffle.description && (
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.6' }}>
                      {raffle.description}
                    </p>
                  )}
                  
                  {raffle.prize_description && (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '14px', 
                      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)', 
                      borderRadius: '10px',
                      marginBottom: '20px',
                      border: '2px solid var(--accent)'
                    }}>
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎁</div>
                      <strong style={{ color: 'var(--accent)', fontSize: '16px' }}>Prize: {raffle.prize_description}</strong>
                    </div>
                  )}

                  {(raffle.starts_at || raffle.ends_at || raffle.draw_at) && (
                    <div style={{ 
                      display: 'flex', 
                      gap: '16px', 
                      marginBottom: '20px',
                      flexWrap: 'wrap',
                      justifyContent: 'center',
                      fontSize: '13px',
                      color: 'var(--text-secondary)'
                    }}>
                      {raffle.starts_at && (
                        <div>📅 Starts: {new Date(raffle.starts_at).toLocaleString()}</div>
                      )}
                      {raffle.ends_at && (
                        <div>⏰ Ends: {new Date(raffle.ends_at).toLocaleString()}</div>
                      )}
                      {raffle.draw_at && (
                        <div>🎲 Draws: {new Date(raffle.draw_at).toLocaleString()}</div>
                      )}
                    </div>
                  )}
                  
                  {canEnter ? (
                    <div style={{ marginBottom: '20px' }}>
                      <input
                        type="text"
                        className="input"
                        placeholder="Enter your name..."
                        value={entryNames[raffle.id] || ''}
                        onChange={(e) => setEntryNames(prev => ({ ...prev, [raffle.id]: e.target.value }))}
                        style={{ marginBottom: '12px' }}
                      />
                      <button
                        onClick={() => enterRaffle(raffle.id)}
                        className="btn btn-primary"
                        disabled={enteringRaffle === raffle.id || !(entryNames[raffle.id] || '').trim()}
                        style={{ width: '100%' }}
                      >
                        {enteringRaffle === raffle.id ? 'Entering...' : 'Enter Raffle'}
                      </button>
                    </div>
                  ) : (
                    <div style={{
                      padding: '16px',
                      background: 'var(--bg-secondary)',
                      borderRadius: '8px',
                      marginBottom: '20px',
                      textAlign: 'center',
                      border: '1px solid var(--border)'
                    }}>
                      <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                        {isUpcoming ? '⏳ This raffle hasn\'t started yet' : 
                         raffle.is_drawn ? '🎉 Winners have been drawn!' :
                         '🔒 This raffle has ended'}
                      </p>
                    </div>
                  )}

                  {entries.length > 0 && (
                    <div className="poll-results">
                      <h4 style={{ marginBottom: '16px', textAlign: 'center' }}>
                        Entries ({entries.length})
                        {winners.length > 0 && (
                          <span style={{ color: 'var(--accent)', marginLeft: '8px' }}>
                            • {winners.length} Winner{winners.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {entries.map((entry) => (
                          <div key={entry.id} style={{ 
                            padding: '16px', 
                            background: entry.is_winner ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-secondary)', 
                            borderRadius: '10px',
                            border: entry.is_winner ? '2px solid var(--success)' : '1px solid var(--border)',
                            transition: 'all 0.2s'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              {entry.is_winner && (
                                <span style={{ fontSize: '24px', lineHeight: 1 }}>🏆</span>
                              )}
                              <div style={{ flex: 1 }}>
                                <p style={{ 
                                  fontWeight: entry.is_winner ? 600 : 500, 
                                  marginBottom: '8px'
                                }}>
                                  {entry.entry_name}
                                </p>
                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                  {new Date(entry.created_at).toLocaleString()}
                                </span>
                              </div>
                              {entry.is_winner && (
                                <span style={{
                                  padding: '4px 10px',
                                  background: 'var(--success)',
                                  color: 'white',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 600
                                }}>
                                  WINNER
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

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

