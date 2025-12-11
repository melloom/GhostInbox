import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase, VentLink, PollWithOptions, QASession, QAQuestion, Challenge, ChallengeSubmission, Raffle, RaffleEntry, CommunityVoteWithOptions, FeedbackForm } from '../lib/supabase'
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
  const [activeTab, setActiveTab] = useState<'message' | 'polls' | 'qa' | 'challenges' | 'raffles' | 'voting' | 'feedback'>('message')
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
  const [activeVotes, setActiveVotes] = useState<CommunityVoteWithOptions[]>([])
  const [votedVoteId, setVotedVoteId] = useState<string | null>(null)
  const [votingOnVote, setVotingOnVote] = useState(false)
  const [activeFeedbackForms, setActiveFeedbackForms] = useState<FeedbackForm[]>([])
  const [feedbackResponses, setFeedbackResponses] = useState<{ [formId: string]: string }>({})
  const [submittingFeedback, setSubmittingFeedback] = useState<string | null>(null)
  const [userMessageIds, setUserMessageIds] = useState<string[]>([])
  const [userMessages, setUserMessages] = useState<Array<{ id: string; body: string; mood?: string; created_at: string }>>([])
  const [messageResponses, setMessageResponses] = useState<{ [messageId: string]: Array<{ id: string; response_text: string; created_at: string }> }>({})
  const [showResponses, setShowResponses] = useState(false)

  useEffect(() => {
    if (!slug) return

    async function fetchVentLink() {
      try {
        // Fetch vent link with customization fields
        const { data: ventLinkData, error: ventLinkError } = await supabase
          .from('vent_links')
          .select('id, title, owner_id, logo_url, background_color, background_image_url, accent_color, custom_links, header_text, description')
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

        // Fetch active Community Votes
        const { data: votesData, error: votesError } = await supabase
          .from('community_votes')
          .select('*')
          .eq('vent_link_id', ventLinkData.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        if (!votesError && votesData && votesData.length > 0) {
          // Fetch options and responses for all votes
          const votesWithData = await Promise.all(
            votesData.map(async (vote) => {
              const { data: optionsData } = await supabase
                .from('vote_options')
                .select('*')
                .eq('vote_id', vote.id)
                .order('display_order', { ascending: true })

              const { data: responsesData } = await supabase
                .from('vote_responses')
                .select('option_id')
                .eq('vote_id', vote.id)

              const voteCounts: { [key: string]: number } = {}
              responsesData?.forEach((response) => {
                voteCounts[response.option_id] = (voteCounts[response.option_id] || 0) + 1
              })

              return {
                ...vote,
            options: optionsData || [],
            vote_counts: voteCounts,
                total_votes: responsesData?.length || 0,
              } as CommunityVoteWithOptions
            })
          )

          // Check voted votes
          const votedVotes = JSON.parse(localStorage.getItem('ghostinbox_voted_votes') || '[]')
          if (votedVotes.length > 0) {
            const votedId = votesWithData.find(v => votedVotes.includes(v.id))?.id
            if (votedId) setVotedVoteId(votedId)
          }

          setActiveVotes(votesWithData)
        }

        // Fetch active Feedback Forms
        const { data: feedbackData, error: feedbackError } = await supabase
          .from('feedback_forms')
          .select('*')
          .eq('vent_link_id', ventLinkData.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        if (!feedbackError && feedbackData) {
          setActiveFeedbackForms(feedbackData)
        }

        // Check if feedback tab should always be visible
        const alwaysVisible = localStorage.getItem(`ghostinbox_feedback_visible_${ventLinkData.id}`) === 'true'
        if (alwaysVisible && activeTab === 'message') {
          // Don't auto-switch, just ensure tab is available
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

  // Set up real-time subscription for community vote responses
  useEffect(() => {
    if (!ventLink || activeVotes.length === 0) return

    // Subscribe to vote responses for real-time vote count updates
    const voteResponsesChannel = supabase
      .channel(`vent_vote_responses_${ventLink.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'vote_responses'
        },
        async (payload) => {
          try {
            const response = payload.new as any
            // Find which vote this response belongs to
            const vote = activeVotes.find(v => v.id === response.vote_id)
            if (!vote) return

            // Fetch updated vote counts for this vote
            const { data: responsesData, error: responsesError } = await supabase
              .from('vote_responses')
              .select('option_id')
              .eq('vote_id', response.vote_id)

            if (responsesError) {
              console.error('Error fetching vote response counts:', responsesError)
              return
            }

            if (responsesData) {
              const voteCounts: { [key: string]: number } = {}
              responsesData.forEach((r) => {
                voteCounts[r.option_id] = (voteCounts[r.option_id] || 0) + 1
              })

              // Update the vote's vote counts
              setActiveVotes((prev) =>
                prev.map((v) => {
                  if (v.id === response.vote_id) {
                    return {
                      ...v,
                      vote_counts: voteCounts,
                      total_votes: responsesData.length,
                    }
                  }
                  return v
                })
              )
            }
          } catch (err) {
            console.error('Error in vote response subscription callback:', err)
          }
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      voteResponsesChannel.unsubscribe()
    }
  }, [ventLink, activeVotes])

  // Load user's messages from localStorage
  useEffect(() => {
    if (!ventLink) return
    
    const storageKey = `user_messages_${ventLink.id}`
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      try {
        const messageData = JSON.parse(stored)
        // Support both old format (just IDs) and new format (full messages)
        if (Array.isArray(messageData) && messageData.length > 0) {
          if (typeof messageData[0] === 'string') {
            // Old format - just IDs
            setUserMessageIds(messageData)
            messageData.forEach((messageId: string) => {
              fetchMessageResponses(messageId)
            })
          } else {
            // New format - full messages
            const ids = messageData.map((m: any) => m.id)
            setUserMessageIds(ids)
            setUserMessages(messageData)
            ids.forEach((messageId: string) => {
              fetchMessageResponses(messageId)
            })
          }
        }
      } catch (err) {
        console.error('Error loading messages:', err)
      }
    }
  }, [ventLink])

  // Fetch responses for a message
  async function fetchMessageResponses(messageId: string) {
    try {
      const { data, error } = await supabase
        .from('message_responses')
        .select('id, response_text, created_at')
        .eq('message_id', messageId)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      setMessageResponses(prev => ({
        ...prev,
        [messageId]: data || []
      }))
    } catch (err: any) {
      console.error('Error fetching responses:', err)
    }
  }

  // Set up realtime subscription for responses to user's messages
  useEffect(() => {
    if (!ventLink || userMessageIds.length === 0) return

    const channels = userMessageIds.map(messageId => {
      return supabase
        .channel(`user_responses:${messageId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'message_responses',
            filter: `message_id=eq.${messageId}`,
          },
          (payload) => {
            console.log('New response received:', payload)
            // Refetch responses when new response is added
            fetchMessageResponses(messageId)
            // Show notification
            setStatus('You have a new response! Check your messages below.')
          }
        )
        .subscribe()
    })

    return () => {
      channels.forEach(channel => channel.unsubscribe())
    }
  }, [ventLink, userMessageIds])


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
      const { data: insertedData, error } = await supabase
        .from('vent_messages')
        .insert({
          vent_link_id: ventLink.id,
          body: sanitized,
          mood: mood || null,
          ip_hash: null, // Will be set by database trigger or Edge Function
        })
        .select('id')
        .single()

      if (error) {
        // Sanitize error message before showing to user
        const sanitizedError = sanitizeErrorMessage(error)
        setStatus(sanitizedError)
        return
      }


      // Store message ID and content in localStorage so user can receive responses
      if (insertedData?.id) {
        const storageKey = `user_messages_${ventLink.id}`
        const existing = localStorage.getItem(storageKey)
        const messages = existing ? JSON.parse(existing) : []
        const newMessage = {
          id: insertedData.id,
          body: sanitized,
          mood: mood || null,
          created_at: new Date().toISOString()
        }
        if (!messages.some((m: any) => m.id === insertedData.id)) {
          messages.push(newMessage)
          localStorage.setItem(storageKey, JSON.stringify(messages))
          setUserMessageIds(messages.map((m: any) => m.id))
          setUserMessages(messages)
          // Fetch responses for this message
          fetchMessageResponses(insertedData.id)
        }
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
      const { data: insertedData, error } = await supabase
        .from('poll_votes')
        .insert({
          poll_id: pollId,
          option_id: optionId,
          ip_hash: null,
        })
        .select('id')
        .single()

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

  async function handleVoteOnVote(voteId: string, optionId: string) {
    const vote = activeVotes.find(v => v.id === voteId)
    if (!vote || votingOnVote || votedVoteId === voteId) return

    const votedVotes = JSON.parse(localStorage.getItem('ghostinbox_voted_votes') || '[]')
    if (votedVotes.includes(voteId)) {
      setStatus('You have already voted on this.')
      setVotedVoteId(voteId)
      return
    }

    setVotingOnVote(true)
    try {
      const { data: insertedData, error } = await supabase
        .from('vote_responses')
        .insert({
          vote_id: voteId,
          option_id: optionId,
          ip_hash: null,
        })
        .select('id')
        .single()

      if (error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          setStatus('You have already voted on this.')
          setVotedVoteId(voteId)
          votedVotes.push(voteId)
          localStorage.setItem('ghostinbox_voted_votes', JSON.stringify(votedVotes))
        } else {
          const sanitizedError = sanitizeErrorMessage(error)
          setStatus(sanitizedError)
        }
        return
      }

      votedVotes.push(voteId)
      localStorage.setItem('ghostinbox_voted_votes', JSON.stringify(votedVotes))
      setVotedVoteId(voteId)
      
      // Refresh vote data
      const { data: responsesData } = await supabase
        .from('vote_responses')
        .select('option_id')
        .eq('vote_id', voteId)

      const voteCounts: { [key: string]: number } = {}
      responsesData?.forEach((response) => {
        voteCounts[response.option_id] = (voteCounts[response.option_id] || 0) + 1
      })

      setActiveVotes(activeVotes.map(v => 
        v.id === voteId 
          ? { ...v, vote_counts: voteCounts, total_votes: responsesData?.length || 0 }
          : v
      ))
    } catch (err: any) {
      // Sanitize error message before showing to user
      const sanitizedError = sanitizeErrorMessage(err)
      setStatus(sanitizedError)
    } finally {
      setVotingOnVote(false)
    }
  }

  async function submitFeedback(formId: string) {
    const responseText = feedbackResponses[formId] || ''
    if (!responseText.trim()) {
      setStatus('Please enter your feedback')
      return
    }

    setSubmittingFeedback(formId)
    try {
      const { data: insertedData, error } = await supabase
        .from('feedback_responses')
        .insert({
          form_id: formId,
          response_text: responseText.trim(),
          ip_hash: null,
        })
        .select('id')
        .single()

      if (error) {
        const sanitizedError = sanitizeErrorMessage(error)
        setStatus(sanitizedError)
        return
      }

      setFeedbackResponses((prev) => ({ ...prev, [formId]: '' }))
      setStatus('Thank you for your feedback!')
    } catch (err: any) {
      const sanitizedError = sanitizeErrorMessage(err)
      setStatus(sanitizedError)
    } finally {
      setSubmittingFeedback(null)
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
      const { data: insertedData, error } = await supabase
        .from('qa_questions')
        .insert({
          qa_session_id: sessionId,
          question_text: questionText.trim(),
          ip_hash: null,
        })
        .select('id')
        .single()

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
      const { data: insertedData, error } = await supabase
        .from('challenge_submissions')
        .insert({
          challenge_id: challengeId,
          submission_text: submissionText.trim(),
          ip_hash: null,
        })
        .select('id')
        .single()

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
      const { data: insertedData, error } = await supabase
        .from('raffle_entries')
        .insert({
          raffle_id: raffleId,
          entry_name: entryName.trim(),
          ip_hash: null,
        })
        .select('id')
        .single()

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
      <div className="loading-container">
        <div className="loading-spinner"></div>
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

  const displayTitle = ventLink.header_text || ventLink.title || `Talk to @${ventLink.profiles?.handle || 'me'}`

  return (
    <div 
      className="vent-page"
      style={{
        background: ventLink.background_color 
          ? ventLink.background_color 
          : undefined,
        backgroundImage: ventLink.background_image_url
          ? `url(${ventLink.background_image_url})`
          : undefined,
        backgroundSize: ventLink.background_image_url ? 'cover' : undefined,
        backgroundPosition: ventLink.background_image_url ? 'center' : undefined,
        backgroundRepeat: ventLink.background_image_url ? 'no-repeat' : undefined,
      }}
    >
      <style>{`
        .vent-page-custom-accent {
          --accent: ${ventLink.accent_color || 'var(--accent)'};
          --accent-hover: ${ventLink.accent_color || 'var(--accent-hover)'};
        }
        .vent-page-custom-accent .btn-primary,
        .vent-page-custom-accent .chat-send-button,
        .vent-page-custom-accent .vent-tab.active {
          background: ${ventLink.accent_color || 'var(--accent)'};
        }
        .vent-page-custom-accent .chat-message-sent .chat-bubble {
          background: linear-gradient(135deg, ${ventLink.accent_color || 'var(--accent)'} 0%, ${ventLink.accent_color || 'var(--accent-hover)'} 100%);
        }
      `}</style>
      <div className="vent-container vent-page-custom-accent">
        <div className="hero-card">
        <div className="creator-header">
          {ventLink.logo_url ? (
            <img 
              src={ventLink.logo_url} 
              alt="Logo" 
              className="avatar-circle"
              style={{ 
                objectFit: 'cover',
                background: 'transparent',
                boxShadow: 'none'
              }}
            />
          ) : (
            <div className="avatar-circle">
              {displayTitle.charAt(0).toUpperCase()}
            </div>
          )}
            <div className="hero-text">
          <h1>{displayTitle}</h1>
              <p className="subtitle">{ventLink.description || "Drop a note. You stay anonymous—always."}</p>
            </div>
        </div>

          {/* Custom Links */}
          {ventLink.custom_links && ventLink.custom_links.length > 0 && (
            <div className="custom-links-section" style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {ventLink.custom_links.map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="custom-link-button"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'var(--text-primary)',
                    textDecoration: 'none',
                    fontSize: '14px',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <span>{link.icon || '🔗'}</span>
                  <span>{link.label}</span>
                </a>
              ))}
            </div>
          )}

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
          {activeVotes.length > 0 && (
            <button
              className={`vent-tab ${activeTab === 'voting' ? 'active' : ''}`}
              onClick={() => setActiveTab('voting')}
            >
              🗳️ Voting
              <span className="tab-badge">{activeVotes.length}</span>
            </button>
          )}
          {(activeFeedbackForms.length > 0 || (ventLink && localStorage.getItem(`ghostinbox_feedback_visible_${ventLink.id}`) === 'true')) && (
            <button
              className={`vent-tab ${activeTab === 'feedback' ? 'active' : ''}`}
              onClick={() => setActiveTab('feedback')}
            >
              📝 Feedback
              {activeFeedbackForms.length > 0 && <span className="tab-badge">{activeFeedbackForms.length}</span>}
            </button>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === 'message' && (
          <div className="chat-interface">
            {/* Chat Messages Area */}
            <div className="chat-messages-container">
              {userMessages.length === 0 && userMessageIds.length === 0 ? (
                <div className="chat-empty-state">
                  <div className="chat-empty-icon">💬</div>
                  <h3>Start a conversation</h3>
                  <p>Send an anonymous message below to start chatting.</p>
                </div>
              ) : (
                <div className="chat-messages">
                  {/* Combine user messages and responses into chronological order */}
                  {(() => {
                    const allMessages: Array<{ type: 'user' | 'response'; messageId: string; id: string; text: string; timestamp: string; mood?: string }> = []
                    
                    // Add user messages
                    userMessages.forEach((msg) => {
                      allMessages.push({
                        type: 'user',
                        messageId: msg.id,
                        id: msg.id,
                        text: msg.body,
                        timestamp: msg.created_at,
                        mood: msg.mood || undefined
                      })
                      
                      // Add responses to this message
                      const responses = messageResponses[msg.id] || []
                      responses.forEach((resp) => {
                        allMessages.push({
                          type: 'response',
                          messageId: msg.id,
                          id: resp.id,
                          text: resp.response_text,
                          timestamp: resp.created_at
                        })
                      })
                    })
                    
                    // Sort by timestamp
                    allMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                    
                    return allMessages.map((msg) => (
                      <div key={msg.id} className={`chat-message ${msg.type === 'user' ? 'chat-message-sent' : 'chat-message-received'}`}>
                        <div className="chat-bubble">
                          {msg.type === 'user' && msg.mood && (
                            <div className="chat-mood-badge">{MOODS.find(m => m.value === msg.mood)?.label || msg.mood}</div>
                          )}
                          <div className="chat-text">{msg.text}</div>
                          <div className="chat-timestamp">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ))
                  })()}
                  
                  {userMessageIds.length > 0 && userMessageIds.every(id => !messageResponses[id] || messageResponses[id].length === 0) && (
                    <div className="chat-typing-indicator">
                      <span>Waiting for response...</span>
                      <div className="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Polls as Chat Cards */}
            {activePolls.length > 0 && (
              <div className="chat-polls-section">
                {activePolls.slice(0, 2).map((poll) => (
                  <div key={poll.id} className="chat-poll-card">
                    <div className="chat-poll-header">
                      <span className="chat-poll-icon">📊</span>
                      <span className="chat-poll-title">{poll.question}</span>
                    </div>
                    {poll.description && (
                      <div className="chat-poll-description">{poll.description}</div>
                    )}
                    <div className="chat-poll-options">
                      {poll.options.slice(0, 3).map((option) => (
                        <button
                          key={option.id}
                          className="chat-poll-option"
                          onClick={() => handleVote(poll.id, option.id)}
                          disabled={voting || votedPollId === poll.id}
                        >
                          {option.option_text}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Message Input Area (Fixed at bottom) */}
            <div className="chat-input-container">
              {status && (
                <div className={`chat-status ${status.includes('wrong') || status.includes('Please') ? 'chat-status-error' : 'chat-status-success'}`}>
                  {status}
                </div>
              )}
              {error && <div className="chat-status chat-status-error">{error}</div>}
              
              <form onSubmit={handleSubmit} className="chat-form">
                <div className="chat-input-wrapper">
                  <div className="chat-mood-selector">
                    <select
                      className="chat-mood-select"
                      value={mood}
                      onChange={(e) => setMood(e.target.value)}
                      disabled={submitting}
                      title="Select mood"
                    >
                      {MOODS.filter(m => m.value).map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    className="chat-input"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    required
                    disabled={submitting}
                    maxLength={5000}
                    rows={1}
                  />
                  <button
                    type="submit"
                    className="chat-send-button"
                    disabled={submitting || !message.trim()}
                    title="Send"
                  >
                    {submitting ? '⏳' : '📤'}
                  </button>
                </div>
                <div className="chat-char-counter">
                  {message.length} / 5000
                </div>
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

        {activeTab === 'voting' && (
          <div className="tab-content">
            {/* Active Vote Section */}
            {activeVotes.map((vote) => (
              <div key={vote.id} className="poll-section">
                <h3 className="poll-question">{vote.title}</h3>
                {vote.description && (
                  <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                    {vote.description}
                  </p>
                )}
                {votedVoteId === vote.id || vote.total_votes ? (
                  <div className="poll-results">
                    {vote.options.map((option) => {
                      const voteCount = vote.vote_counts?.[option.id] || 0
                      const percentage = vote.total_votes && vote.total_votes > 0
                        ? Math.round((voteCount / vote.total_votes) * 100)
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
                    <div className="poll-total-votes">Total: {vote.total_votes || 0} votes</div>
                  </div>
                ) : (
                  <div className="poll-options">
                    {vote.options.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleVoteOnVote(vote.id, option.id)}
                        className="poll-option-btn"
                        disabled={votingOnVote}
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

        {activeTab === 'feedback' && (
          <div className="tab-content">
            {activeFeedbackForms.length > 0 ? (
              activeFeedbackForms.map((form) => (
                <div key={form.id} className="poll-section">
                  <h3 className="poll-question">{form.title}</h3>
                  {form.description && (
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                      {form.description}
                    </p>
                  )}
                  <div style={{ marginBottom: '20px' }}>
          <textarea
            className="textarea"
                      placeholder="Share your feedback, suggestions, or feature requests..."
                      value={feedbackResponses[form.id] || ''}
                      onChange={(e) => setFeedbackResponses((prev) => ({ ...prev, [form.id]: e.target.value }))}
                      disabled={submittingFeedback === form.id}
                      rows={6}
                      maxLength={2000}
                    />
                    <div className="char-counter">
                      {(feedbackResponses[form.id] || '').length} / 2000 characters
                    </div>
                  </div>
                  <button
                    onClick={() => submitFeedback(form.id)}
                    className="btn btn-primary"
                    disabled={submittingFeedback === form.id || !(feedbackResponses[form.id] || '').trim()}
                    style={{ width: '100%' }}
                  >
                    {submittingFeedback === form.id ? 'Submitting...' : 'Submit Feedback'}
                  </button>
                  {status && form.id === submittingFeedback && (
                    <div className={status.includes('Thank you') ? 'success-message' : 'error-message'} style={{ marginTop: '12px' }}>
                      {status}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="poll-section">
                <h3 className="poll-question">Feedback</h3>
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No feedback forms available at the moment.
                </p>
              </div>
            )}
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

