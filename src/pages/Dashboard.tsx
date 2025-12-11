import { useState, useEffect } from 'react'
import { supabase, VentLink, VentMessage, Profile, PollWithOptions, MessageFolder, MessageFolderAssignment, QASession, QAQuestion, Challenge, ChallengeSubmission, Raffle, RaffleEntry, CommunityVoteWithOptions, FeedbackForm, CommunityHighlight, MessageReaction, CommunityGoal, CommunityEvent, CollaborativeProject } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { generateReplyTemplates, summarizeThemes } from '../lib/ai'
import { validateHandle, normalizeHandle } from '../lib/validation'
import './Dashboard.css'

export default function Dashboard() {
  const [ventLinks, setVentLinks] = useState<VentLink[]>([])
  const [selectedVentLinkId, setSelectedVentLinkId] = useState<string | null>(null)
  const [messages, setMessages] = useState<VentMessage[]>([])
  const [selectedMessage, setSelectedMessage] = useState<VentMessage | null>(null)
  const [loading, setLoading] = useState(true)
  const [aiReplies, setAiReplies] = useState<string | null>(null)
  const [loadingAi, setLoadingAi] = useState(false)
  const [themeSummary, setThemeSummary] = useState<string | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [showCreateLink, setShowCreateLink] = useState(false)
  const [newLinkSlug, setNewLinkSlug] = useState('')
  const [newLinkTitle, setNewLinkTitle] = useState('')
  const [creatingLink, setCreatingLink] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'messages' | 'settings'>('overview')
  const [messageFilter, setMessageFilter] = useState<'all' | 'unread' | 'read' | 'flagged' | 'starred' | 'archived' | 'needs-response'>('all')
  const [messageResponses, setMessageResponses] = useState<{ [messageId: string]: boolean }>({})
  const [messageSort, setMessageSort] = useState<'newest' | 'oldest' | 'priority'>('newest')
  const [showSettings, setShowSettings] = useState(false)
  const [activeSettingsSection, setActiveSettingsSection] = useState<'profile' | 'vent-links' | 'account' | 'security' | 'notifications' | 'preferences' | 'statistics'>('profile')
  
  // Additional settings state
  const [emailNotifications, setEmailNotifications] = useState(() => {
    const saved = localStorage.getItem('settings_email_notifications')
    return saved !== null ? saved === 'true' : true
  })
  const [browserNotifications, setBrowserNotifications] = useState(() => {
    const saved = localStorage.getItem('settings_browser_notifications')
    return saved !== null ? saved === 'true' : false
  })
  const [dailyDigest, setDailyDigest] = useState(() => {
    const saved = localStorage.getItem('settings_daily_digest')
    return saved !== null ? saved === 'true' : false
  })
  const [defaultMessageView, setDefaultMessageView] = useState(() => {
    const saved = localStorage.getItem('settings_default_message_view')
    return saved || 'card'
  })
  const [autoMarkRead, setAutoMarkRead] = useState(() => {
    const saved = localStorage.getItem('settings_auto_mark_read')
    return saved !== null ? saved === 'true' : true
  })
  const [timezone, setTimezone] = useState(() => {
    const saved = localStorage.getItem('settings_timezone')
    return saved || Intl.DateTimeFormat().resolvedOptions().timeZone
  })
  const [showEmailInProfile, setShowEmailInProfile] = useState(() => {
    const saved = localStorage.getItem('settings_show_email_in_profile')
    return saved !== null ? saved === 'true' : false
  })
  const [profileVisibility, setProfileVisibility] = useState(() => {
    const saved = localStorage.getItem('settings_profile_visibility')
    return saved || 'public'
  })
  const [autoDeleteMessages, setAutoDeleteMessages] = useState(() => {
    const saved = localStorage.getItem('settings_auto_delete_messages')
    return saved !== null ? saved === 'true' : false
  })
  const [autoDeleteDays, setAutoDeleteDays] = useState(() => {
    const saved = localStorage.getItem('settings_auto_delete_days')
    return saved || '30'
  })
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(() => {
    const saved = localStorage.getItem('settings_quiet_hours_enabled')
    return saved !== null ? saved === 'true' : false
  })
  const [quietHoursStart, setQuietHoursStart] = useState(() => {
    const saved = localStorage.getItem('settings_quiet_hours_start')
    return saved || '10:00 PM'
  })
  const [quietHoursEnd, setQuietHoursEnd] = useState(() => {
    const saved = localStorage.getItem('settings_quiet_hours_end')
    return saved || '6:00 AM'
  })
  const [notificationFrequency, setNotificationFrequency] = useState(() => {
    const saved = localStorage.getItem('settings_notification_frequency')
    return saved || 'realtime'
  })
  const [messagesPerPage, setMessagesPerPage] = useState(() => {
    const saved = localStorage.getItem('settings_messages_per_page')
    return saved || '20'
  })
  const [showCharacterCount, setShowCharacterCount] = useState(() => {
    const saved = localStorage.getItem('settings_show_character_count')
    return saved !== null ? saved === 'true' : true
  })
  const [compactMode, setCompactMode] = useState(() => {
    const saved = localStorage.getItem('settings_compact_mode')
    return saved !== null ? saved === 'true' : false
  })
  const [polls, setPolls] = useState<PollWithOptions[]>([])
  const [showCreatePoll, setShowCreatePoll] = useState(false)
  const [pollView, setPollView] = useState<'all' | 'active' | 'archived'>('all')
  const [newPollQuestion, setNewPollQuestion] = useState('')
  const [newPollDescription, setNewPollDescription] = useState('')
  const [newPollOptions, setNewPollOptions] = useState<string[]>(['', ''])
  const [newPollExpiresAt, setNewPollExpiresAt] = useState('')
  const [newPollMaxVotes, setNewPollMaxVotes] = useState('')
  const [creatingPoll, setCreatingPoll] = useState(false)
  const [selectedPoll, setSelectedPoll] = useState<PollWithOptions | null>(null)
  const [editingPoll, setEditingPoll] = useState<PollWithOptions | null>(null)
  const [editPollQuestion, setEditPollQuestion] = useState('')
  const [editPollDescription, setEditPollDescription] = useState('')
  const [editPollOptions, setEditPollOptions] = useState<Array<{ id?: string; text: string }>>([])
  const [editPollExpiresAt, setEditPollExpiresAt] = useState('')
  const [editPollMaxVotes, setEditPollMaxVotes] = useState('')
  const [updatingPoll, setUpdatingPoll] = useState(false)
  const [deletingPoll, setDeletingPoll] = useState<string | null>(null)
  const [pollTemplates, setPollTemplates] = useState<Array<{ id: string; name: string; question: string; options: string[] }>>([])
  const [showPollTemplates, setShowPollTemplates] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [editingDisplayName, setEditingDisplayName] = useState(false)
  const [newDisplayName, setNewDisplayName] = useState('')
  const [editingHandle, setEditingHandle] = useState(false)
  const [newHandle, setNewHandle] = useState('')
  const [editingEmail, setEditingEmail] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [updatingProfile, setUpdatingProfile] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
  const [searchDateFrom, setSearchDateFrom] = useState('')
  const [searchDateTo, setSearchDateTo] = useState('')
  const [searchByTag, setSearchByTag] = useState('')
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set())
  const [messageTags, setMessageTags] = useState<{ [messageId: string]: string[] }>({})
  const [messageNotes, setMessageNotes] = useState<{ [messageId: string]: string }>({})
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [showResponseModal, setShowResponseModal] = useState(false)
  const [responseText, setResponseText] = useState('')
  const [responseTemplates, setResponseTemplates] = useState<Array<{ id: string; name: string; text: string }>>([])
  const [messageResponsesData, setMessageResponsesData] = useState<{ [messageId: string]: Array<{ id: string; response_text: string; created_at: string; owner_id: string }> }>({})
  const [messageFolders, setMessageFolders] = useState<MessageFolder[]>([])
  const [messageFolderAssignments, setMessageFolderAssignments] = useState<{ [messageId: string]: string[] }>({})
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string | null>(null)
  const [hubView, setHubView] = useState<'links' | 'polls' | 'qa' | 'challenges' | 'raffles' | 'voting' | 'feedback' | 'highlights' | 'reactions' | 'goals' | 'events' | 'wall' | 'projects'>('links')
  
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  
  // Community Engagement Features State
  const [qaSessions, setQaSessions] = useState<QASession[]>([])
  const [qaQuestions, setQaQuestions] = useState<{ [sessionId: string]: QAQuestion[] }>({})
  const [showCreateQASession, setShowCreateQASession] = useState(false)
  const [newQASessionTitle, setNewQASessionTitle] = useState('')
  const [newQASessionDescription, setNewQASessionDescription] = useState('')
  const [newQASessionStartsAt, setNewQASessionStartsAt] = useState('')
  const [newQASessionEndsAt, setNewQASessionEndsAt] = useState('')
  const [creatingQASession, setCreatingQASession] = useState(false)
  const [selectedQASession, setSelectedQASession] = useState<QASession | null>(null)
  const [answeringQuestion, setAnsweringQuestion] = useState<string | null>(null)
  const [answerText, setAnswerText] = useState('')
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [challengeSubmissions, setChallengeSubmissions] = useState<{ [challengeId: string]: ChallengeSubmission[] }>({})
  const [showCreateChallenge, setShowCreateChallenge] = useState(false)
  const [newChallengeTitle, setNewChallengeTitle] = useState('')
  const [newChallengeDescription, setNewChallengeDescription] = useState('')
  const [newChallengeType, setNewChallengeType] = useState<'contest' | 'giveaway' | 'challenge'>('challenge')
  const [newChallengeStartsAt, setNewChallengeStartsAt] = useState('')
  const [newChallengeEndsAt, setNewChallengeEndsAt] = useState('')
  const [newChallengePrize, setNewChallengePrize] = useState('')
  const [newChallengeRules, setNewChallengeRules] = useState('')
  const [creatingChallenge, setCreatingChallenge] = useState(false)
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null)
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null)
  const [editChallengeTitle, setEditChallengeTitle] = useState('')
  const [editChallengeDescription, setEditChallengeDescription] = useState('')
  const [editChallengeType, setEditChallengeType] = useState<'contest' | 'giveaway' | 'challenge'>('challenge')
  const [editChallengeStartsAt, setEditChallengeStartsAt] = useState('')
  const [editChallengeEndsAt, setEditChallengeEndsAt] = useState('')
  const [editChallengePrize, setEditChallengePrize] = useState('')
  const [editChallengeRules, setEditChallengeRules] = useState('')
  const [updatingChallenge, setUpdatingChallenge] = useState(false)
  const [challengeFilter, setChallengeFilter] = useState<'all' | 'active' | 'inactive' | 'upcoming' | 'ended'>('all')
  const [submissionFilter, setSubmissionFilter] = useState<{ [challengeId: string]: 'all' | 'winners' | 'non-winners' }>({})
  const [raffles, setRaffles] = useState<Raffle[]>([])
  const [raffleEntries, setRaffleEntries] = useState<{ [raffleId: string]: RaffleEntry[] }>({})
  const [showCreateRaffle, setShowCreateRaffle] = useState(false)
  const [newRaffleTitle, setNewRaffleTitle] = useState('')
  const [newRaffleDescription, setNewRaffleDescription] = useState('')
  const [newRafflePrize, setNewRafflePrize] = useState('')
  const [newRaffleStartsAt, setNewRaffleStartsAt] = useState('')
  const [newRaffleEndsAt, setNewRaffleEndsAt] = useState('')
  const [newRaffleDrawAt, setNewRaffleDrawAt] = useState('')
  const [newRaffleWinnerCount, setNewRaffleWinnerCount] = useState('1')
  const [creatingRaffle, setCreatingRaffle] = useState(false)
  const [selectedRaffle, setSelectedRaffle] = useState<Raffle | null>(null)
  const [drawingRaffle, setDrawingRaffle] = useState<string | null>(null)
  const [communityVotes, setCommunityVotes] = useState<CommunityVoteWithOptions[]>([])
  const [showCreateVote, setShowCreateVote] = useState(false)
  const [newVoteTitle, setNewVoteTitle] = useState('')
  const [newVoteDescription, setNewVoteDescription] = useState('')
  const [newVoteOptions, setNewVoteOptions] = useState<string[]>(['', ''])
  const [newVoteEndsAt, setNewVoteEndsAt] = useState('')
  const [creatingVote, setCreatingVote] = useState(false)
  const [selectedVote, setSelectedVote] = useState<CommunityVoteWithOptions | null>(null)
  const [editingVote, setEditingVote] = useState<CommunityVoteWithOptions | null>(null)
  const [editVoteTitle, setEditVoteTitle] = useState('')
  const [editVoteDescription, setEditVoteDescription] = useState('')
  const [editVoteOptions, setEditVoteOptions] = useState<Array<{ id?: string; text: string }>>([])
  const [editVoteEndsAt, setEditVoteEndsAt] = useState('')
  const [updatingVote, setUpdatingVote] = useState(false)
  const [deletingVote, setDeletingVote] = useState<string | null>(null)
  const [voteView, setVoteView] = useState<'all' | 'active' | 'archived'>('all')
  const [feedbackForms, setFeedbackForms] = useState<FeedbackForm[]>([])
  const [showCreateFeedback, setShowCreateFeedback] = useState(false)
  const [newFeedbackTitle, setNewFeedbackTitle] = useState('')
  const [newFeedbackDescription, setNewFeedbackDescription] = useState('')
  const [newFeedbackType, setNewFeedbackType] = useState<'survey' | 'feedback' | 'feature_request'>('feedback')
  const [creatingFeedback, setCreatingFeedback] = useState(false)
  const [editingFeedback, setEditingFeedback] = useState<FeedbackForm | null>(null)
  const [editFeedbackTitle, setEditFeedbackTitle] = useState('')
  const [editFeedbackDescription, setEditFeedbackDescription] = useState('')
  const [editFeedbackType, setEditFeedbackType] = useState<'survey' | 'feedback' | 'feature_request'>('feedback')
  const [updatingFeedback, setUpdatingFeedback] = useState(false)
  const [deletingFeedback, setDeletingFeedback] = useState<string | null>(null)
  const [feedbackAlwaysVisible, setFeedbackAlwaysVisible] = useState<{ [ventLinkId: string]: boolean }>({})
  const [feedbackResponseCounts, setFeedbackResponseCounts] = useState<{ [formId: string]: number }>({})
  const [highlights, setHighlights] = useState<CommunityHighlight[]>([])
  const [showCreateHighlight, setShowCreateHighlight] = useState(false)
  const [newHighlightTitle, setNewHighlightTitle] = useState('')
  const [newHighlightText, setNewHighlightText] = useState('')
  const [newHighlightMessageId, setNewHighlightMessageId] = useState<string | null>(null)
  const [newHighlightFeatured, setNewHighlightFeatured] = useState(true)
  const [newHighlightOrder, setNewHighlightOrder] = useState<number>(0)
  const [creatingHighlight, setCreatingHighlight] = useState(false)
  const [updatingHighlight, setUpdatingHighlight] = useState<string | null>(null)
  const [deletingHighlight, setDeletingHighlight] = useState<string | null>(null)
  const [communityGoals, setCommunityGoals] = useState<CommunityGoal[]>([])
  const [showCreateGoal, setShowCreateGoal] = useState(false)
  const [newGoalTitle, setNewGoalTitle] = useState('')
  const [newGoalDescription, setNewGoalDescription] = useState('')
  const [newGoalType, setNewGoalType] = useState<'messages' | 'engagement' | 'polls' | 'custom'>('messages')
  const [newGoalTargetValue, setNewGoalTargetValue] = useState('100')
  const [newGoalDeadline, setNewGoalDeadline] = useState('')
  const [creatingGoal, setCreatingGoal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<string | null>(null)
  const [editGoalTitle, setEditGoalTitle] = useState('')
  const [editGoalDescription, setEditGoalDescription] = useState('')
  const [editGoalType, setEditGoalType] = useState<'messages' | 'engagement' | 'polls' | 'custom'>('messages')
  const [editGoalTargetValue, setEditGoalTargetValue] = useState('')
  const [editGoalDeadline, setEditGoalDeadline] = useState('')
  const [updatingGoal, setUpdatingGoal] = useState(false)
  const [deletingGoal, setDeletingGoal] = useState<string | null>(null)
  const [communityEvents, setCommunityEvents] = useState<CommunityEvent[]>([])
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [newEventTitle, setNewEventTitle] = useState('')
  const [newEventDescription, setNewEventDescription] = useState('')
  const [newEventType, setNewEventType] = useState<'event' | 'announcement' | 'update'>('event')
  const [newEventDate, setNewEventDate] = useState('')
  const [newEventPinned, setNewEventPinned] = useState(false)
  const [creatingEvent, setCreatingEvent] = useState(false)
  const [editingEvent, setEditingEvent] = useState<string | null>(null)
  const [editEventTitle, setEditEventTitle] = useState('')
  const [editEventDescription, setEditEventDescription] = useState('')
  const [editEventType, setEditEventType] = useState<'event' | 'announcement' | 'update'>('event')
  const [editEventDate, setEditEventDate] = useState('')
  const [editEventPinned, setEditEventPinned] = useState(false)
  const [updatingEvent, setUpdatingEvent] = useState(false)
  const [deletingEvent, setDeletingEvent] = useState<string | null>(null)
  const [collaborativeProjects, setCollaborativeProjects] = useState<CollaborativeProject[]>([])
  const [projectContributions, setProjectContributions] = useState<{ [projectId: string]: any[] }>({})
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [newProjectTitle, setNewProjectTitle] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [newProjectType, setNewProjectType] = useState<'idea' | 'project' | 'collaboration'>('project')
  const [creatingProject, setCreatingProject] = useState(false)
  const [editingProject, setEditingProject] = useState<string | null>(null)
  const [editProjectTitle, setEditProjectTitle] = useState('')
  const [editProjectDescription, setEditProjectDescription] = useState('')
  const [editProjectType, setEditProjectType] = useState<'idea' | 'project' | 'collaboration'>('project')
  const [updatingProject, setUpdatingProject] = useState(false)
  const [deletingProject, setDeletingProject] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [messageReactions, setMessageReactions] = useState<{ [messageId: string]: MessageReaction[] }>({})
  const [reactionStats, setReactionStats] = useState<{ [messageId: string]: { [reactionType: string]: number } }>({})
  
  const navigate = useNavigate()

  useEffect(() => {
    fetchData()
  }, [])

  // Set up real-time subscriptions after vent links are loaded
  useEffect(() => {
    if (ventLinks.length === 0) return

    const linkIds = ventLinks.map(l => l.id)

    // Subscribe to new messages for each vent link
    const messageChannels = linkIds.map(linkId => {
      return supabase
        .channel(`vent_messages_${linkId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'vent_messages',
            filter: `vent_link_id=eq.${linkId}`
          },
          async (payload) => {
            if (payload.eventType === 'INSERT') {
              // New message added
              setMessages((prev) => [payload.new as VentMessage, ...prev])
              // Update goals that track messages
              if (ventLinks.length > 0) {
                await fetchGoals(ventLinks.map(l => l.id))
              }
            } else if (payload.eventType === 'UPDATE') {
              // Message updated (e.g., marked as read, flagged)
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === payload.new.id ? (payload.new as VentMessage) : msg
                )
              )
            } else if (payload.eventType === 'DELETE') {
              // Message deleted
              setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id))
              // Update goals that track messages
              if (ventLinks.length > 0) {
                await fetchGoals(ventLinks.map(l => l.id))
              }
            }
          }
        )
        .subscribe()
    })

    // Subscribe to poll changes for each vent link
    const pollChannels = linkIds.map(linkId => {
      return supabase
        .channel(`polls_${linkId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'polls',
            filter: `vent_link_id=eq.${linkId}`
          },
          async (payload) => {
            try {
              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                // Fetch full poll data with options and votes
                const poll = payload.new as any
                const { data: optionsData, error: optionsError } = await supabase
                  .from('poll_options')
                  .select('*')
                  .eq('poll_id', poll.id)
                  .order('display_order', { ascending: true })

                if (optionsError) {
                  console.error('Error fetching poll options:', optionsError)
                  return
                }

                const { data: votesData, error: votesError } = await supabase
                  .from('poll_votes')
                  .select('option_id')
                  .eq('poll_id', poll.id)

                if (votesError) {
                  console.error('Error fetching poll votes:', votesError)
                  return
                }

                const voteCounts: { [key: string]: number } = {}
                votesData?.forEach((vote) => {
                  voteCounts[vote.option_id] = (voteCounts[vote.option_id] || 0) + 1
                })

                const pollWithData = {
                  ...poll,
                  options: optionsData || [],
                  vote_counts: voteCounts,
                  total_votes: votesData?.length || 0,
                } as PollWithOptions

                if (payload.eventType === 'INSERT') {
                  setPolls((prev) => [pollWithData, ...prev])
                } else {
                  setPolls((prev) =>
                    prev.map((p) => (p.id === poll.id ? pollWithData : p))
                  )
                }
              } else if (payload.eventType === 'DELETE') {
                setPolls((prev) => prev.filter((p) => p.id !== payload.old.id))
              }
              // Update goals that track polls
              if (ventLinks.length > 0) {
                await fetchGoals(ventLinks.map(l => l.id))
              }
            } catch (err) {
              console.error('Error in poll subscription callback:', err)
            }
          }
        )
        .subscribe()
    })

    // Subscribe to poll votes for real-time vote count updates
    const votesChannel = supabase
      .channel('poll_votes_changes')
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
              setPolls((prev) =>
                prev.map((poll) => {
                  if (poll.id === vote.poll_id) {
                    return {
                      ...poll,
                      vote_counts: voteCounts,
                      total_votes: votesData.length,
                    }
                  }
                  return poll
                })
              )
            }
          } catch (err) {
            console.error('Error in vote subscription callback:', err)
          }
        }
      )
      .subscribe()

    // Subscribe to community vote changes for each vent link
    const voteChannels = linkIds.map(linkId => {
      return supabase
        .channel(`community_votes_${linkId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'community_votes',
            filter: `vent_link_id=eq.${linkId}`
          },
          async (payload) => {
            try {
              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                // Fetch full vote data with options and responses
                const vote = payload.new as any
                const { data: optionsData, error: optionsError } = await supabase
                  .from('vote_options')
                  .select('*')
                  .eq('vote_id', vote.id)
                  .order('display_order', { ascending: true })

                if (optionsError) {
                  console.error('Error fetching vote options:', optionsError)
                  return
                }

                const { data: responsesData, error: responsesError } = await supabase
                  .from('vote_responses')
                  .select('option_id')
                  .eq('vote_id', vote.id)

                if (responsesError) {
                  console.error('Error fetching vote responses:', responsesError)
                  return
                }

                const voteCounts: { [key: string]: number } = {}
                responsesData?.forEach((response) => {
                  voteCounts[response.option_id] = (voteCounts[response.option_id] || 0) + 1
                })

                const voteWithData = {
                  ...vote,
                  options: optionsData || [],
                  vote_counts: voteCounts,
                  total_votes: responsesData?.length || 0,
                } as CommunityVoteWithOptions

                if (payload.eventType === 'INSERT') {
                  setCommunityVotes((prev) => [voteWithData, ...prev])
                } else {
                  setCommunityVotes((prev) =>
                    prev.map((v) => (v.id === vote.id ? voteWithData : v))
                  )
                }
              } else if (payload.eventType === 'DELETE') {
                setCommunityVotes((prev) => prev.filter((v) => v.id !== payload.old.id))
              }
            } catch (err) {
              console.error('Error in community vote subscription callback:', err)
            }
          }
        )
        .subscribe()
    })

    // Subscribe to vote responses for real-time vote count updates
    const voteResponsesChannel = supabase
      .channel('vote_responses_changes')
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

              // Update the vote's response counts
              setCommunityVotes((prev) =>
                prev.map((vote) => {
                  if (vote.id === response.vote_id) {
                    return {
                      ...vote,
                      vote_counts: voteCounts,
                      total_votes: responsesData.length,
                    }
                  }
                  return vote
                })
              )
            }
          } catch (err) {
            console.error('Error in vote response subscription callback:', err)
          }
        }
      )
      .subscribe()

    // Subscribe to message reactions for real-time updates
    const reactionsChannel = supabase
      .channel('message_reactions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions'
        },
        async (payload) => {
          try {
            const reaction = payload.new as any || payload.old as any
            if (reaction && reaction.message_id) {
              // Refresh reactions for this message
              await fetchReactionsForMessage(reaction.message_id)
              // Update goals that track engagement
              if (ventLinks.length > 0) {
                await fetchGoals(ventLinks.map(l => l.id))
              }
            }
          } catch (err: any) {
            // Suppress expected errors (403, RLS policy blocks, etc.)
            if (err?.code !== 'PGRST116' && err?.code !== '42501' && err?.code !== 'PGRST301' && err?.code !== 403) {
              if (import.meta.env.DEV) {
                console.error('Error in reactions subscription callback:', err)
              }
            }
          }
        }
      )
      .subscribe()

    // Subscribe to community goals for real-time updates
    const goalsChannel = supabase
      .channel('community_goals_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_goals'
        },
        async () => {
          try {
            if (ventLinks.length > 0) {
              await fetchGoals(ventLinks.map(l => l.id))
            }
          } catch (err: any) {
            if (err?.code !== 'PGRST116' && err?.code !== '42501' && err?.code !== 'PGRST301' && err?.code !== 403) {
              if (import.meta.env.DEV) {
                console.error('Error in goals subscription callback:', err)
              }
            }
          }
        }
      )
      .subscribe()

    // Cleanup subscriptions on unmount
    return () => {
      messageChannels.forEach(channel => {
        channel.unsubscribe()
      })
      pollChannels.forEach(channel => {
        channel.unsubscribe()
      })
      votesChannel.unsubscribe()
      voteChannels.forEach(channel => {
        channel.unsubscribe()
      })
      voteResponsesChannel.unsubscribe()
      reactionsChannel.unsubscribe()
      goalsChannel.unsubscribe()
    }

    // Subscribe to community events for real-time updates
    const eventsChannel = supabase
      .channel('community_events_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_events'
        },
        async () => {
          try {
            if (ventLinks.length > 0) {
              await fetchEvents(ventLinks.map(l => l.id))
            }
          } catch (err: any) {
            if (err?.code !== 'PGRST116' && err?.code !== '42501' && err?.code !== 'PGRST301' && err?.code !== 403) {
              if (import.meta.env.DEV) {
                console.error('Error in events subscription callback:', err)
              }
            }
          }
        }
      )
      .subscribe()

    return () => {
      messageChannels.forEach(channel => {
        channel.unsubscribe()
      })
      pollChannels.forEach(channel => {
        channel.unsubscribe()
      })
      votesChannel.unsubscribe()
      voteChannels.forEach(channel => {
        channel.unsubscribe()
      })
      voteResponsesChannel.unsubscribe()
      reactionsChannel.unsubscribe()
      goalsChannel.unsubscribe()
      eventsChannel.unsubscribe()
    }

    // Subscribe to collaborative projects for real-time updates
    const projectsChannel = supabase
      .channel('collaborative_projects_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'collaborative_projects'
        },
        async () => {
          try {
            if (ventLinks.length > 0) {
              await fetchProjects(ventLinks.map(l => l.id))
            }
          } catch (err: any) {
            if (err?.code !== 'PGRST116' && err?.code !== '42501' && err?.code !== 'PGRST301' && err?.code !== 403) {
              if (import.meta.env.DEV) {
                console.error('Error in projects subscription callback:', err)
              }
            }
          }
        }
      )
      .subscribe()

    // Subscribe to project contributions for real-time updates
    const contributionsChannel = supabase
      .channel('project_contributions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_contributions'
        },
        async (payload) => {
          try {
            const contribution = payload.new as any || payload.old as any
            if (contribution && contribution.project_id) {
              await fetchContributionsForProject(contribution.project_id)
            }
          } catch (err: any) {
            if (err?.code !== 'PGRST116' && err?.code !== '42501' && err?.code !== 'PGRST301' && err?.code !== 403) {
              if (import.meta.env.DEV) {
                console.error('Error in contributions subscription callback:', err)
              }
            }
          }
        }
      )
      .subscribe()

    return () => {
      messageChannels.forEach(channel => {
        channel.unsubscribe()
      })
      pollChannels.forEach(channel => {
        channel.unsubscribe()
      })
      votesChannel.unsubscribe()
      voteChannels.forEach(channel => {
        channel.unsubscribe()
      })
      voteResponsesChannel.unsubscribe()
      reactionsChannel.unsubscribe()
      goalsChannel.unsubscribe()
      eventsChannel.unsubscribe()
      projectsChannel.unsubscribe()
      contributionsChannel.unsubscribe()
    }

    // Subscribe to feedback forms for each vent link
    const feedbackChannels = linkIds.map((linkId) => {
      return supabase
        .channel(`feedback_forms_${linkId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'feedback_forms',
            filter: `vent_link_id=eq.${linkId}`,
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setFeedbackForms((prev) => [payload.new as FeedbackForm, ...prev])
            } else if (payload.eventType === 'UPDATE') {
              setFeedbackForms((prev) =>
                prev.map((f) => (f.id === payload.new.id ? (payload.new as FeedbackForm) : f))
              )
            } else if (payload.eventType === 'DELETE') {
              setFeedbackForms((prev) => prev.filter((f) => f.id !== payload.old.id))
            }
          }
        )
        .subscribe()
    })

    // Subscribe to feedback responses for counts
    const feedbackResponsesChannel = supabase
      .channel('feedback_responses_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'feedback_responses',
        },
        async (payload) => {
          try {
            const response = payload.new as any
            const { count } = await supabase
              .from('feedback_responses')
              .select('*', { count: 'exact', head: true })
              .eq('form_id', response.form_id)
            if (count !== null) {
              setFeedbackResponseCounts((prev) => ({
                ...prev,
                [response.form_id]: count
              }))
            }
          } catch (err) {
            console.error('Error updating feedback response counts:', err)
          }
        }
      )
      .subscribe()

    // Update cleanup to include feedback channels
    return () => {
      messageChannels.forEach(channel => {
        channel.unsubscribe()
      })
      pollChannels.forEach(channel => {
        channel.unsubscribe()
      })
      votesChannel.unsubscribe()
      voteChannels.forEach(channel => {
        channel.unsubscribe()
      })
      voteResponsesChannel.unsubscribe()
      reactionsChannel.unsubscribe()
      feedbackChannels.forEach(channel => {
        channel.unsubscribe()
      })
      feedbackResponsesChannel.unsubscribe()
    }

    // Subscribe to challenge changes for each vent link
    const challengeChannels = linkIds.map(linkId => {
      return supabase
        .channel(`challenges_${linkId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'challenges',
            filter: `vent_link_id=eq.${linkId}`
          },
          async (payload) => {
            try {
              if (payload.eventType === 'INSERT') {
                const challenge = payload.new as Challenge
                setChallenges((prev) => [challenge, ...prev])
                // Fetch submissions for new challenge
                const { data: submissionsData, error: submissionsError } = await supabase
                  .from('challenge_submissions')
                  .select('*')
                  .eq('challenge_id', challenge.id)
                  .order('created_at', { ascending: false })
                if (submissionsError) {
                  console.error('Error fetching challenge submissions:', submissionsError)
                } else {
                  setChallengeSubmissions((prev) => ({
                    ...prev,
                    [challenge.id]: submissionsData || []
                  }))
                }
              } else if (payload.eventType === 'UPDATE') {
                const challenge = payload.new as Challenge
                setChallenges((prev) =>
                  prev.map((c) => (c.id === challenge.id ? challenge : c))
                )
              } else if (payload.eventType === 'DELETE') {
                setChallenges((prev) => prev.filter((c) => c.id !== payload.old.id))
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
    })

    // Subscribe to challenge submission changes
    const submissionChannel = supabase
      .channel('challenge_submissions_changes')
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
              // Fetch all submissions for this challenge to update the list
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
            } else if (payload.eventType === 'DELETE') {
              const oldSubmission = payload.old as ChallengeSubmission
              setChallengeSubmissions((prev) => {
                const current = prev[oldSubmission.challenge_id] || []
                return {
                  ...prev,
                  [oldSubmission.challenge_id]: current.filter(s => s.id !== oldSubmission.id)
                }
              })
            }
          } catch (err) {
            console.error('Error in challenge submission subscription callback:', err)
          }
        }
      )
      .subscribe()

    // Cleanup subscriptions on unmount
    return () => {
      messageChannels.forEach(channel => {
        channel.unsubscribe()
      })
      pollChannels.forEach(channel => {
        channel.unsubscribe()
      })
      votesChannel.unsubscribe()
      challengeChannels.forEach(channel => {
        channel.unsubscribe()
      })
      submissionChannel.unsubscribe()
    }

    // Subscribe to raffle changes for each vent link
    const raffleChannels = linkIds.map(linkId => {
      return supabase
        .channel(`raffles_${linkId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'raffles',
            filter: `vent_link_id=eq.${linkId}`
          },
          async (payload) => {
            try {
              if (payload.eventType === 'INSERT') {
                const raffle = payload.new as Raffle
                setRaffles((prev) => [raffle, ...prev])
                // Fetch entries for new raffle
                const { data: entriesData, error: entriesError } = await supabase
                  .from('raffle_entries')
                  .select('*')
                  .eq('raffle_id', raffle.id)
                  .order('created_at', { ascending: false })
                if (entriesError) {
                  console.error('Error fetching raffle entries:', entriesError)
                } else {
                  setRaffleEntries((prev) => ({
                    ...prev,
                    [raffle.id]: entriesData || []
                  }))
                }
              } else if (payload.eventType === 'UPDATE') {
                const raffle = payload.new as Raffle
                setRaffles((prev) =>
                  prev.map((r) => (r.id === raffle.id ? raffle : r))
                )
              } else if (payload.eventType === 'DELETE') {
                setRaffles((prev) => prev.filter((r) => r.id !== payload.old.id))
                setRaffleEntries((prev) => {
                  const updated = { ...prev }
                  delete updated[payload.old.id]
                  return updated
                })
              }
            } catch (err) {
              console.error('Error in raffle subscription callback:', err)
            }
          }
        )
        .subscribe()
    })

    // Subscribe to raffle entry changes
    const raffleEntryChannel = supabase
      .channel('raffle_entries_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'raffle_entries'
        },
        async (payload) => {
          try {
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const entry = payload.new as RaffleEntry
              // Fetch all entries for this raffle to update the list
              const { data: entriesData, error: entriesError } = await supabase
                .from('raffle_entries')
                .select('*')
                .eq('raffle_id', entry.raffle_id)
                .order('created_at', { ascending: false })
              
              if (entriesError) {
                console.error('Error fetching raffle entries:', entriesError)
                return
              }
              
              setRaffleEntries((prev) => ({
                ...prev,
                [entry.raffle_id]: entriesData || []
              }))
            } else if (payload.eventType === 'DELETE') {
              const oldEntry = payload.old as RaffleEntry
              setRaffleEntries((prev) => {
                const current = prev[oldEntry.raffle_id] || []
                return {
                  ...prev,
                  [oldEntry.raffle_id]: current.filter(e => e.id !== oldEntry.id)
                }
              })
            }
          } catch (err) {
            console.error('Error in raffle entry subscription callback:', err)
          }
        }
      )
      .subscribe()

    // Cleanup subscriptions on unmount
    return () => {
      messageChannels.forEach(channel => {
        channel.unsubscribe()
      })
      pollChannels.forEach(channel => {
        channel.unsubscribe()
      })
      votesChannel.unsubscribe()
      challengeChannels.forEach(channel => {
        channel.unsubscribe()
      })
      submissionChannel.unsubscribe()
      raffleChannels.forEach(channel => {
        channel.unsubscribe()
      })
      raffleEntryChannel.unsubscribe()
    }
  }, [ventLinks, polls])

  // Filter messages (search + filter + folder)
  const filteredMessages = messages.filter((msg) => {
    // Apply folder filter
    if (selectedFolderFilter) {
      const msgFolders = messageFolderAssignments[msg.id] || []
      if (!msgFolders.includes(selectedFolderFilter)) return false
    }
    
    // Apply date range filter
    if (searchDateFrom || searchDateTo) {
      const msgDate = new Date(msg.created_at)
      if (searchDateFrom) {
        const fromDate = new Date(searchDateFrom)
        fromDate.setHours(0, 0, 0, 0)
        if (msgDate < fromDate) return false
      }
      if (searchDateTo) {
        const toDate = new Date(searchDateTo)
        toDate.setHours(23, 59, 59, 999)
        if (msgDate > toDate) return false
      }
    }
    
    // Apply tag filter
    if (searchByTag.trim()) {
      const msgTags = messageTags[msg.id] || []
      if (!msgTags.some(tag => tag.includes(searchByTag.toLowerCase()))) return false
    }
    
    // Apply search filter (body, mood, tags, notes)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const matchesBody = msg.body.toLowerCase().includes(query)
      const matchesMood = msg.mood?.toLowerCase().includes(query)
      const matchesTags = messageTags[msg.id]?.some(tag => tag.includes(query))
      const matchesNotes = messageNotes[msg.id]?.toLowerCase().includes(query)
      if (!matchesBody && !matchesMood && !matchesTags && !matchesNotes) return false
    }
    return true
  })

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return
      }

      // Mark as read/unread: R
      if (e.key === 'r' || e.key === 'R') {
        if (selectedMessage) {
          e.preventDefault()
          markAsRead(selectedMessage.id, !selectedMessage.is_read)
        }
      }

      // Star/unstar: S
      if (e.key === 's' || e.key === 'S') {
        if (selectedMessage) {
          e.preventDefault()
          toggleStar(selectedMessage.id)
        }
      }

      // Archive/unarchive: A
      if (e.key === 'a' || e.key === 'A') {
        if (selectedMessage) {
          e.preventDefault()
          toggleArchive(selectedMessage.id)
        }
      }

      // Search: Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        const searchInput = document.querySelector('.search-input') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
        }
      }

      // Next message: N or ArrowRight
      if (e.key === 'n' || e.key === 'N' || e.key === 'ArrowRight') {
        if (selectedMessage && activeTab === 'messages') {
          e.preventDefault()
          // Use the filteredMessages computed above
          const visibleMessages = filteredMessages.filter((msg) => {
            if (messageFilter === 'all') return !msg.is_archived
            if (messageFilter === 'unread') return !msg.is_read && !msg.is_archived
            if (messageFilter === 'read') return msg.is_read && !msg.is_archived
            if (messageFilter === 'flagged') return msg.is_flagged && !msg.is_archived
            if (messageFilter === 'starred') return msg.is_starred && !msg.is_archived
            if (messageFilter === 'archived') return msg.is_archived
            return true
          })
          const currentIndex = visibleMessages.findIndex(m => m.id === selectedMessage.id)
          if (currentIndex < visibleMessages.length - 1) {
            setSelectedMessage(visibleMessages[currentIndex + 1])
          }
        }
      }

      // Previous message: P or ArrowLeft
      if (e.key === 'p' || e.key === 'P' || e.key === 'ArrowLeft') {
        if (selectedMessage && activeTab === 'messages') {
          e.preventDefault()
          // Use the filteredMessages computed above
          const visibleMessages = filteredMessages.filter((msg) => {
            if (messageFilter === 'all') return !msg.is_archived
            if (messageFilter === 'unread') return !msg.is_read && !msg.is_archived
            if (messageFilter === 'read') return msg.is_read && !msg.is_archived
            if (messageFilter === 'flagged') return msg.is_flagged && !msg.is_archived
            if (messageFilter === 'starred') return msg.is_starred && !msg.is_archived
            if (messageFilter === 'archived') return msg.is_archived
            return true
          })
          const currentIndex = visibleMessages.findIndex(m => m.id === selectedMessage.id)
          if (currentIndex > 0) {
            setSelectedMessage(visibleMessages[currentIndex - 1])
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [selectedMessage, activeTab, filteredMessages, messageFilter])

  useEffect(() => {
    // Load user email for settings display
    if (activeTab === 'settings') {
      getCurrentUserEmail().then((email) => {
        setUserEmail(email)
      })
    }
  }, [activeTab])

  // Fetch responses when message is selected and set up realtime
  useEffect(() => {
    if (!selectedMessage) return

    // Fetch initial responses
    fetchMessageResponses(selectedMessage.id)

    // Set up realtime subscription for message responses
    const responsesChannel = supabase
      .channel(`message_responses:${selectedMessage.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_responses',
          filter: `message_id=eq.${selectedMessage.id}`,
        },
        (payload) => {
          console.log('Response change:', payload)
          // Refetch responses when any change occurs
          fetchMessageResponses(selectedMessage.id)
        }
      )
      .subscribe()

    return () => {
      responsesChannel.unsubscribe()
    }
  }, [selectedMessage])


  async function fetchData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }

      // Fetch user's profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError && !profileError.message.includes('No rows')) {
        console.error('Error fetching profile:', profileError)
      } else {
        setProfile(profileData || null)
      }

      // Fetch user's vent links
      const { data: links, error: linksError } = await supabase
        .from('vent_links')
        .select('id, slug, title, owner_id, is_active, created_at, logo_url, background_color, background_image_url, accent_color, custom_links, header_text, description')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

      if (linksError) throw linksError
      setVentLinks(links || [])

      // Fetch messages for all vent links
      if (links && links.length > 0) {
        const linkIds = links.map(link => link.id)
        const { data: msgs, error: msgsError } = await supabase
          .from('vent_messages')
          .select('*')
          .in('vent_link_id', linkIds)
          .order('created_at', { ascending: false })

        if (msgsError) throw msgsError
        setMessages(msgs || [])

        // Fetch reactions for all messages
        if (msgs && msgs.length > 0) {
          try {
            const messageIds = msgs.map(msg => msg.id)
            const { data: reactionsData, error: reactionsError } = await supabase
              .from('message_reactions')
              .select('*')
              .in('message_id', messageIds)
              .order('created_at', { ascending: false })

            if (reactionsError) {
              // Suppress expected RLS errors
              if (reactionsError.code !== 'PGRST116' && reactionsError.code !== '42501' && reactionsError.code !== 'PGRST301') {
                if (import.meta.env.DEV) {
                  console.error('Error fetching reactions:', reactionsError)
                }
              }
            } else if (reactionsData) {
              // Group reactions by message_id
              const reactionsByMessage: { [messageId: string]: MessageReaction[] } = {}
              const statsByMessage: { [messageId: string]: { [reactionType: string]: number } } = {}

              reactionsData.forEach((reaction) => {
                if (!reactionsByMessage[reaction.message_id]) {
                  reactionsByMessage[reaction.message_id] = []
                }
                reactionsByMessage[reaction.message_id].push(reaction)

                // Count reactions by type
                if (!statsByMessage[reaction.message_id]) {
                  statsByMessage[reaction.message_id] = {}
                }
                statsByMessage[reaction.message_id][reaction.reaction_type] = 
                  (statsByMessage[reaction.message_id][reaction.reaction_type] || 0) + 1
              })

              setMessageReactions(reactionsByMessage)
              setReactionStats(statsByMessage)
            }
          } catch (err) {
            // Suppress expected errors
            if (import.meta.env.DEV) {
              console.error('Error fetching reactions:', err)
            }
          }
        }

        // Fetch polls for all vent links
        const { data: pollsData, error: pollsError } = await supabase
          .from('polls')
          .select('*')
          .in('vent_link_id', linkIds)
          .order('created_at', { ascending: false })

        if (!pollsError && pollsData) {
          // Fetch options and votes for each poll
          const pollsWithData = await Promise.all(
            pollsData.map(async (poll) => {
              // Fetch options
              const { data: optionsData } = await supabase
                .from('poll_options')
                .select('*')
                .eq('poll_id', poll.id)
                .order('display_order', { ascending: true })

              // Fetch votes
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
          setPolls(pollsWithData)
        }

        // Fetch Q&A sessions
        const { data: qaSessionsData, error: qaSessionsError } = await supabase
          .from('qa_sessions')
          .select('*')
          .in('vent_link_id', linkIds)
          .order('created_at', { ascending: false })

        if (!qaSessionsError && qaSessionsData) {
          setQaSessions(qaSessionsData)
          
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

        // Fetch Challenges
        const { data: challengesData, error: challengesError } = await supabase
          .from('challenges')
          .select('*')
          .in('vent_link_id', linkIds)
          .order('created_at', { ascending: false })

        if (!challengesError && challengesData) {
          setChallenges(challengesData)
          
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

        // Fetch Raffles
        const { data: rafflesData, error: rafflesError } = await supabase
          .from('raffles')
          .select('*')
          .in('vent_link_id', linkIds)
          .order('created_at', { ascending: false })

        if (!rafflesError && rafflesData) {
          setRaffles(rafflesData)
          
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

        // Fetch Community Votes
        try {
          const { data: votesData, error: votesError } = await supabase
            .from('community_votes')
            .select('*')
            .in('vent_link_id', linkIds)
            .order('created_at', { ascending: false })

          if (votesError) {
            // Suppress 403 errors (likely RLS policy blocking)
            if (votesError.code !== 'PGRST116' && votesError.code !== '42501') {
              console.error('Error fetching community votes:', votesError)
            }
          } else if (votesData) {
            // Fetch options and responses for each vote
            const votesWithData = await Promise.all(
              votesData.map(async (vote) => {
                try {
                  // Fetch options
                  const { data: optionsData, error: optionsError } = await supabase
                    .from('vote_options')
                    .select('*')
                    .eq('vote_id', vote.id)
                    .order('display_order', { ascending: true })

                  if (optionsError && optionsError.code !== 'PGRST116' && optionsError.code !== '42501') {
                    console.error('Error fetching vote options:', optionsError)
                  }

                  // Fetch responses
                  const { data: responsesData, error: responsesError } = await supabase
                    .from('vote_responses')
                    .select('option_id')
                    .eq('vote_id', vote.id)

                  if (responsesError && responsesError.code !== 'PGRST116' && responsesError.code !== '42501') {
                    console.error('Error fetching vote responses:', responsesError)
                  }

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
                } catch (err) {
                  console.error('Error processing vote:', err)
                  return {
                    ...vote,
                    options: [],
                    vote_counts: {},
                    total_votes: 0,
                  } as CommunityVoteWithOptions
                }
              })
            )
            setCommunityVotes(votesWithData)
          }
        } catch (err) {
          // Suppress expected errors (RLS policies, missing tables, etc.)
          if (import.meta.env.DEV) {
            console.error('Error fetching community votes:', err)
          }
        }

        // Fetch Highlights
        await fetchHighlights(linkIds)

        // Fetch Community Goals
        await fetchGoals(linkIds)

        // Fetch Community Events
        await fetchEvents(linkIds)

        // Fetch Collaborative Projects
        await fetchProjects(linkIds)

        // Fetch Feedback Forms
        try {
          const { data: feedbackData, error: feedbackError } = await supabase
            .from('feedback_forms')
            .select('*')
            .in('vent_link_id', linkIds)
            .order('created_at', { ascending: false })

          if (feedbackError) {
            if (feedbackError.code !== 'PGRST116' && feedbackError.code !== '42501') {
              console.error('Error fetching feedback forms:', feedbackError)
            }
          } else if (feedbackData) {
            setFeedbackForms(feedbackData)
            
            // Fetch response counts for each form
            const counts: { [formId: string]: number } = {}
            for (const form of feedbackData) {
              const { count } = await supabase
                .from('feedback_responses')
                .select('*', { count: 'exact', head: true })
                .eq('form_id', form.id)
              counts[form.id] = count || 0
            }
            setFeedbackResponseCounts(counts)
          }
        } catch (err) {
          if (import.meta.env.DEV) {
            console.error('Error fetching feedback forms:', err)
          }
        }

        // Load feedback visibility preferences
        const visibilityByLink: { [ventLinkId: string]: boolean } = {}
        linkIds.forEach((id) => {
          const stored = localStorage.getItem(`ghostinbox_feedback_visible_${id}`)
          visibilityByLink[id] = stored === 'true'
        })
        setFeedbackAlwaysVisible(visibilityByLink)
      }

      // Fetch message folders
      if (user) {
        const { data: foldersData } = await supabase
          .from('message_folders')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false })
        setMessageFolders(foldersData || [])

        // Fetch folder assignments
        if (foldersData && foldersData.length > 0) {
          const folderIds = foldersData.map(f => f.id)
          const { data: assignmentsData } = await supabase
            .from('message_folder_assignments')
            .select('*')
            .in('folder_id', folderIds)

          const assignments: { [messageId: string]: string[] } = {}
          assignmentsData?.forEach(assignment => {
            if (!assignments[assignment.message_id]) {
              assignments[assignment.message_id] = []
            }
            assignments[assignment.message_id].push(assignment.folder_id)
          })
          setMessageFolderAssignments(assignments)
        }
      }
    } catch (err: any) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  async function handleDeleteAccount() {
    const confirmation = prompt(
      '⚠️ WARNING: This will permanently delete your account and all associated data.\n\n' +
      'This action cannot be undone. All your messages, polls, responses, and profile data will be permanently deleted.\n\n' +
      'Type "DELETE" to confirm:'
    )
    
    if (confirmation !== 'DELETE') {
      return
    }

    const doubleConfirm = confirm(
      'Are you absolutely sure? This will permanently delete:\n' +
      '- Your account and profile\n' +
      '- All messages and responses\n' +
      '- All polls, Q&A sessions, challenges\n' +
      '- All other data associated with your account\n\n' +
      'This cannot be undone!'
    )

    if (!doubleConfirm) return

    setDeletingAccount(true)
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('No user found')
        setDeletingAccount(false)
        return
      }

      // Delete the profile (this will cascade delete all related data due to ON DELETE CASCADE)
      // This includes: vent_links, vent_messages, polls, responses, etc.
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id)

      if (profileError) {
        alert('Error deleting account: ' + profileError.message + '\n\nNote: For complete account deletion including auth record, please contact support.')
        setDeletingAccount(false)
        return
      }

      // Sign out after deleting profile
      // Note: The auth user record may remain, but all app data is deleted
      await supabase.auth.signOut()
      navigate('/login')
      alert('Your account data has been deleted successfully. All your messages, polls, and profile information have been permanently removed.')
    } catch (err: any) {
      console.error('Error deleting account:', err)
      alert('Error deleting account: ' + (err.message || 'Unknown error'))
      setDeletingAccount(false)
    }
  }


  const markAsRead = async (id: string, isRead: boolean) => {
    const { error } = await supabase
      .from('vent_messages')
      .update({ is_read: isRead })
      .eq('id', id)

    if (!error) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, is_read: isRead } : m
        )
      )
      if (selectedMessage?.id === id) {
        setSelectedMessage({ ...selectedMessage, is_read: isRead })
      }
    }
  }

  const flagMessage = async (id: string) => {
    const { error } = await supabase
      .from('vent_messages')
      .update({ is_flagged: true })
      .eq('id', id)

    if (!error) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, is_flagged: true } : m
        )
      )
      if (selectedMessage?.id === id) {
        setSelectedMessage({ ...selectedMessage, is_flagged: true })
      }
    }
  }

  async function copyLink(slug: string) {
    const url = `${window.location.origin}/v/${slug}`
    await navigator.clipboard.writeText(url)
    // Show a toast-like notification
    const notification = document.createElement('div')
    notification.textContent = 'Link copied to clipboard!'
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--accent);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      z-index: 1000;
      animation: slideIn 0.3s ease;
    `
    document.body.appendChild(notification)
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease'
      setTimeout(() => notification.remove(), 300)
    }, 2000)
  }

  async function createVentLink() {
    if (!newLinkSlug.trim()) {
      alert('Please enter a slug for your vent link')
      return
    }

    setCreatingLink(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }

      // Ensure profile exists
      if (!profile) {
        const handle = newLinkSlug.toLowerCase().trim()
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            handle: handle,
            display_name: newLinkTitle.trim() || handle,
          })

        if (profileError && !profileError.message.includes('duplicate') && !profileError.message.includes('unique')) {
          throw profileError
        }
      }

      // Create vent link
      const slug = newLinkSlug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-')
      const { data: newLink, error: linkError } = await supabase
        .from('vent_links')
        .insert({
          owner_id: user.id,
          slug: slug,
          title: newLinkTitle.trim() || `Talk to ${profile?.display_name || slug}`,
        })
        .select()
        .single()

      if (linkError) {
        if (linkError.message.includes('duplicate') || linkError.message.includes('unique')) {
          alert('This slug is already taken. Please choose another one.')
        } else {
          throw linkError
        }
        setCreatingLink(false)
        return
      }

      if (newLink) {
        setVentLinks([newLink, ...ventLinks])
        setShowCreateLink(false)
        setNewLinkSlug('')
        setNewLinkTitle('')
        await fetchData() // Refresh to get updated profile
      }
    } catch (err: any) {
      console.error('Error creating vent link:', err)
      alert(err.message || 'Failed to create vent link')
    } finally {
      setCreatingLink(false)
    }
  }

  async function createPoll() {
    if (!primaryVentLink) {
      alert('Please create a vent link first')
      return
    }

    if (!newPollQuestion.trim()) {
      alert('Please enter a poll question')
      return
    }

    const validOptions = newPollOptions.filter(opt => opt.trim())
    if (validOptions.length < 2) {
      alert('Please add at least 2 poll options')
      return
    }

    setCreatingPoll(true)
    try {
      const primaryVentLink = selectedVentLinkId ? ventLinks.find(l => l.id === selectedVentLinkId) || ventLinks[0] : ventLinks[0]
      if (!primaryVentLink) return

      // Create poll
      const { data: newPoll, error: pollError } = await supabase
        .from('polls')
        .insert({
          vent_link_id: primaryVentLink.id,
          question: newPollQuestion.trim(),
          description: newPollDescription.trim() || null,
          is_active: true,
          expires_at: newPollExpiresAt ? new Date(newPollExpiresAt).toISOString() : null,
          max_votes: newPollMaxVotes ? parseInt(newPollMaxVotes) : null,
        })
        .select()
        .single()

      if (pollError) throw pollError

      // Create poll options
      const optionsToInsert = validOptions.map((opt, index) => ({
        poll_id: newPoll.id,
        option_text: opt.trim(),
        display_order: index,
      }))

      const { error: optionsError } = await supabase
        .from('poll_options')
        .insert(optionsToInsert)

      if (optionsError) throw optionsError

      // Reset form and refresh
      setNewPollQuestion('')
      setNewPollDescription('')
      setNewPollOptions(['', ''])
      setNewPollExpiresAt('')
      setNewPollMaxVotes('')
      setShowCreatePoll(false)
      await fetchData()
    } catch (err: any) {
      console.error('Error creating poll:', err)
      alert(err.message || 'Failed to create poll')
    } finally {
      setCreatingPoll(false)
    }
  }

  async function togglePollActive(pollId: string, isActive: boolean) {
    const { error } = await supabase
      .from('polls')
      .update({ is_active: !isActive })
      .eq('id', pollId)

    if (!error) {
      await fetchData()
    }
  }

  async function deletePoll(pollId: string) {
    if (!confirm('Are you sure you want to delete this poll? This cannot be undone.')) return
    
    setDeletingPoll(pollId)
    try {
      const { error } = await supabase
        .from('polls')
        .delete()
        .eq('id', pollId)

      if (error) throw error
      await fetchData()
      setSelectedPoll(null)
    } catch (err: any) {
      alert(err.message || 'Failed to delete poll')
    } finally {
      setDeletingPoll(null)
    }
  }

  function startEditingPoll(poll: PollWithOptions) {
    setEditingPoll(poll)
    setEditPollQuestion(poll.question)
    setEditPollDescription(poll.description || '')
    setEditPollOptions(poll.options.map(opt => ({ id: opt.id, text: opt.option_text })))
    setEditPollExpiresAt(poll.expires_at ? new Date(poll.expires_at).toISOString().slice(0, 16) : '')
    setEditPollMaxVotes(poll.max_votes?.toString() || '')
    setShowCreatePoll(false)
    setSelectedPoll(null)
  }

  function cancelEditPoll() {
    setEditingPoll(null)
    setEditPollQuestion('')
    setEditPollDescription('')
    setEditPollOptions([])
    setEditPollExpiresAt('')
    setEditPollMaxVotes('')
  }

  function updateEditPollOption(index: number, value: string) {
    const updated = [...editPollOptions]
    updated[index] = { ...updated[index], text: value }
    setEditPollOptions(updated)
  }

  function addEditPollOption() {
    setEditPollOptions([...editPollOptions, { text: '' }])
  }

  function removeEditPollOption(index: number) {
    if (editPollOptions.length > 2) {
      setEditPollOptions(editPollOptions.filter((_, i) => i !== index))
    }
  }

  async function savePollEdit() {
    if (!editingPoll || !editPollQuestion.trim() || editPollOptions.filter(opt => opt.text.trim()).length < 2) {
      alert('Please fill in all required fields')
      return
    }

    setUpdatingPoll(true)
    try {
      // Update poll
      const { error: pollError } = await supabase
        .from('polls')
        .update({
          question: editPollQuestion.trim(),
          description: editPollDescription.trim() || null,
          expires_at: editPollExpiresAt ? new Date(editPollExpiresAt).toISOString() : null,
          max_votes: editPollMaxVotes ? parseInt(editPollMaxVotes) : null,
        })
        .eq('id', editingPoll.id)

      if (pollError) throw pollError

      // Update options
      const validOptions = editPollOptions.filter(opt => opt.text.trim())
      const existingOptions = editPollOptions.filter(opt => opt.id)
      const newOptions = editPollOptions.filter(opt => !opt.id)

      // Delete removed options
      const optionsToDelete = editingPoll.options.filter(existing => 
        !validOptions.some(edit => edit.id === existing.id)
      )
      if (optionsToDelete.length > 0) {
        await supabase
          .from('poll_options')
          .delete()
          .in('id', optionsToDelete.map(opt => opt.id))
      }

      // Update existing options
      for (const option of existingOptions) {
        if (option.id) {
          await supabase
            .from('poll_options')
            .update({ option_text: option.text.trim() })
            .eq('id', option.id)
        }
      }

      // Add new options
      if (newOptions.length > 0) {
        const maxOrder = Math.max(...editingPoll.options.map(opt => opt.display_order), -1)
        const optionsToInsert = newOptions.map((opt, index) => ({
          poll_id: editingPoll.id,
          option_text: opt.text.trim(),
          display_order: maxOrder + index + 1,
        }))
        await supabase
          .from('poll_options')
          .insert(optionsToInsert)
      }

      await fetchData()
      cancelEditPoll()
    } catch (err: any) {
      alert(err.message || 'Failed to update poll')
    } finally {
      setUpdatingPoll(false)
    }
  }

  async function duplicatePoll(poll: PollWithOptions) {
    if (!primaryVentLink) return

    setCreatingPoll(true)
    try {
      // Create new poll
      const { data: newPoll, error: pollError } = await supabase
        .from('polls')
        .insert({
          vent_link_id: primaryVentLink.id,
          question: `${poll.question} (Copy)`,
          description: poll.description,
          is_active: false, // Start as inactive
          expires_at: poll.expires_at,
          max_votes: poll.max_votes,
        })
        .select()
        .single()

      if (pollError) throw pollError

      // Duplicate options
      const optionsToInsert = poll.options.map((opt, index) => ({
        poll_id: newPoll.id,
        option_text: opt.option_text,
        display_order: index,
      }))

      await supabase
        .from('poll_options')
        .insert(optionsToInsert)

      await fetchData()
    } catch (err: any) {
      alert(err.message || 'Failed to duplicate poll')
    } finally {
      setCreatingPoll(false)
    }
  }

  function exportPollResults(poll: PollWithOptions) {
    const results = poll.options.map(option => {
      const voteCount = poll.vote_counts?.[option.id] || 0
      const percentage = poll.total_votes && poll.total_votes > 0
        ? Math.round((voteCount / poll.total_votes) * 100)
        : 0
      return {
        Option: option.option_text,
        Votes: voteCount,
        Percentage: `${percentage}%`,
      }
    })

    const csv = [
      ['Poll Question', poll.question],
      ['Total Votes', poll.total_votes || 0],
      [''],
      ['Option', 'Votes', 'Percentage'],
      ...results.map(r => [r.Option, r.Votes, r.Percentage])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `poll-results-${poll.id.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Community Vote Functions
  async function createVote() {
    if (!primaryVentLink) {
      alert('Please create a vent link first')
      return
    }

    if (!newVoteTitle.trim()) {
      alert('Please enter a vote title')
      return
    }

    const validOptions = newVoteOptions.filter(opt => opt.trim())
    if (validOptions.length < 2) {
      alert('Please add at least 2 vote options')
      return
    }

    setCreatingVote(true)
    try {
      const primaryVentLink = selectedVentLinkId ? ventLinks.find(l => l.id === selectedVentLinkId) || ventLinks[0] : ventLinks[0]
      if (!primaryVentLink) return

      // Create vote
      const { data: newVote, error: voteError } = await supabase
        .from('community_votes')
        .insert({
          vent_link_id: primaryVentLink.id,
          title: newVoteTitle.trim(),
          description: newVoteDescription.trim() || null,
          is_active: true,
          ends_at: newVoteEndsAt ? new Date(newVoteEndsAt).toISOString() : null,
        })
        .select()
        .single()

      if (voteError) throw voteError

      // Create vote options
      const optionsToInsert = validOptions.map((opt, index) => ({
        vote_id: newVote.id,
        option_text: opt.trim(),
        display_order: index,
      }))

      const { error: optionsError } = await supabase
        .from('vote_options')
        .insert(optionsToInsert)

      if (optionsError) throw optionsError

      setNewVoteTitle('')
      setNewVoteDescription('')
      setNewVoteOptions(['', ''])
      setNewVoteEndsAt('')
      setShowCreateVote(false)
      await fetchData()
    } catch (err: any) {
      console.error('Error creating vote:', err)
      alert(err.message || 'Failed to create vote')
    } finally {
      setCreatingVote(false)
    }
  }

  async function toggleVoteActive(voteId: string, isActive: boolean) {
    await supabase
      .from('community_votes')
      .update({ is_active: isActive })
      .eq('id', voteId)
    await fetchData()
  }

  async function deleteVote(voteId: string) {
    if (!confirm('Are you sure you want to delete this vote? This cannot be undone.')) return

    setDeletingVote(voteId)
    try {
      await supabase
        .from('community_votes')
        .delete()
        .eq('id', voteId)
      setSelectedVote(null)
      await fetchData()
    } catch (err: any) {
      alert(err.message || 'Failed to delete vote')
    } finally {
      setDeletingVote(null)
    }
  }

  function startEditingVote(vote: CommunityVoteWithOptions) {
    setEditingVote(vote)
    setEditVoteTitle(vote.title)
    setEditVoteDescription(vote.description || '')
    setEditVoteOptions(vote.options.map(opt => ({ id: opt.id, text: opt.option_text })))
    setEditVoteEndsAt(vote.ends_at ? new Date(vote.ends_at).toISOString().slice(0, 16) : '')
    setShowCreateVote(false)
    setSelectedVote(null)
  }

  function cancelEditVote() {
    setEditingVote(null)
    setEditVoteTitle('')
    setEditVoteDescription('')
    setEditVoteOptions([])
    setEditVoteEndsAt('')
  }

  function updateEditVoteOption(index: number, value: string) {
    const updated = [...editVoteOptions]
    updated[index].text = value
    setEditVoteOptions(updated)
  }

  function addEditVoteOption() {
    setEditVoteOptions([...editVoteOptions, { text: '' }])
  }

  function removeEditVoteOption(index: number) {
    if (editVoteOptions.length > 2) {
      setEditVoteOptions(editVoteOptions.filter((_, i) => i !== index))
    }
  }

  async function saveVoteEdit() {
    if (!editingVote || !editVoteTitle.trim() || editVoteOptions.filter(opt => opt.text.trim()).length < 2) {
      alert('Please fill in all required fields')
      return
    }

    setUpdatingVote(true)
    try {
      // Update vote
      const { error: voteError } = await supabase
        .from('community_votes')
        .update({
          title: editVoteTitle.trim(),
          description: editVoteDescription.trim() || null,
          ends_at: editVoteEndsAt ? new Date(editVoteEndsAt).toISOString() : null,
        })
        .eq('id', editingVote.id)

      if (voteError) throw voteError

      // Update options
      const validOptions = editVoteOptions.filter(opt => opt.text.trim())
      const existingOptions = editVoteOptions.filter(opt => opt.id)
      const newOptions = editVoteOptions.filter(opt => !opt.id)

      // Delete removed options
      const optionsToDelete = editingVote.options.filter(existing => 
        !existingOptions.find(edit => edit.id === existing.id)
      )
      if (optionsToDelete.length > 0) {
        await supabase
          .from('vote_options')
          .delete()
          .in('id', optionsToDelete.map(opt => opt.id))
      }

      // Update existing options
      for (const option of existingOptions) {
        await supabase
          .from('vote_options')
          .update({
            option_text: option.text.trim(),
            display_order: existingOptions.indexOf(option),
          })
          .eq('id', option.id)
      }

      // Insert new options
      if (newOptions.length > 0) {
        const maxOrder = Math.max(...editingVote.options.map(opt => opt.display_order), -1)
        const optionsToInsert = newOptions.map((opt, index) => ({
          vote_id: editingVote.id,
          option_text: opt.text.trim(),
          display_order: maxOrder + index + 1,
        }))
        await supabase
          .from('vote_options')
          .insert(optionsToInsert)
      }

      await fetchData()
      cancelEditVote()
    } catch (err: any) {
      alert(err.message || 'Failed to update vote')
    } finally {
      setUpdatingVote(false)
    }
  }

  function addVoteOption() {
    setNewVoteOptions([...newVoteOptions, ''])
  }

  function removeVoteOption(index: number) {
    if (newVoteOptions.length > 2) {
      setNewVoteOptions(newVoteOptions.filter((_, i) => i !== index))
    }
  }

  function updateVoteOption(index: number, value: string) {
    const updated = [...newVoteOptions]
    updated[index] = value
    setNewVoteOptions(updated)
  }

  function exportVoteResults(vote: CommunityVoteWithOptions) {
    const results = vote.options.map(option => {
      const voteCount = vote.vote_counts?.[option.id] || 0
      const percentage = vote.total_votes && vote.total_votes > 0
        ? Math.round((voteCount / vote.total_votes) * 100)
        : 0
      return {
        Option: option.option_text,
        Votes: voteCount,
        Percentage: `${percentage}%`,
      }
    })

    const csv = [
      ['Vote Title', vote.title],
      ['Total Votes', vote.total_votes || 0],
      [''],
      ['Option', 'Votes', 'Percentage'],
      ...results.map(r => [r.Option, r.Votes, r.Percentage])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vote-results-${vote.id.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function getVoteStatus(vote: CommunityVoteWithOptions) {
    if (!vote.is_active) return 'inactive'
    if (vote.ends_at && new Date(vote.ends_at) < new Date()) return 'expired'
    return 'active'
  }

  // Feedback Form Functions
  async function createFeedbackForm() {
    if (!primaryVentLink) {
      alert('Please create a vent link first')
      return
    }

    if (!newFeedbackTitle.trim()) {
      alert('Please enter a form title')
      return
    }

    setCreatingFeedback(true)
    try {
      const { data: newForm, error } = await supabase
        .from('feedback_forms')
        .insert({
          vent_link_id: primaryVentLink.id,
          title: newFeedbackTitle.trim(),
          description: newFeedbackDescription.trim() || null,
          form_type: newFeedbackType,
          is_active: true,
        })
        .select()
        .single()

      if (error) throw error

      setFeedbackForms([newForm as FeedbackForm, ...feedbackForms])
      setNewFeedbackTitle('')
      setNewFeedbackDescription('')
      setNewFeedbackType('feedback')
      setShowCreateFeedback(false)
    } catch (err: any) {
      alert(err.message || 'Failed to create feedback form')
    } finally {
      setCreatingFeedback(false)
    }
  }

  function startEditingFeedback(form: FeedbackForm) {
    setEditingFeedback(form)
    setEditFeedbackTitle(form.title)
    setEditFeedbackDescription(form.description || '')
    setEditFeedbackType(form.form_type as 'survey' | 'feedback' | 'feature_request')
    setShowCreateFeedback(false)
  }

  function cancelEditFeedback() {
    setEditingFeedback(null)
    setEditFeedbackTitle('')
    setEditFeedbackDescription('')
    setEditFeedbackType('feedback')
  }

  async function saveFeedbackEdit() {
    if (!editingFeedback || !editFeedbackTitle.trim()) {
      alert('Please fill in required fields')
      return
    }

    setUpdatingFeedback(true)
    try {
      const { error } = await supabase
        .from('feedback_forms')
        .update({
          title: editFeedbackTitle.trim(),
          description: editFeedbackDescription.trim() || null,
          form_type: editFeedbackType,
        })
        .eq('id', editingFeedback.id)

      if (error) throw error

      setFeedbackForms((prev) =>
        prev.map((f) =>
          f.id === editingFeedback.id
            ? {
                ...f,
                title: editFeedbackTitle.trim(),
                description: editFeedbackDescription.trim() || null,
                form_type: editFeedbackType,
              }
            : f
        )
      )
      cancelEditFeedback()
    } catch (err: any) {
      alert(err.message || 'Failed to update feedback form')
    } finally {
      setUpdatingFeedback(false)
    }
  }

  async function toggleFeedbackActive(formId: string, isActive: boolean) {
    const { error } = await supabase
      .from('feedback_forms')
      .update({ is_active: isActive })
      .eq('id', formId)

    if (error) {
      alert(error.message || 'Failed to update form status')
      return
    }

    setFeedbackForms((prev) =>
      prev.map((f) => (f.id === formId ? { ...f, is_active: isActive } : f))
    )
  }

  async function deleteFeedbackForm(formId: string) {
    if (!confirm('Delete this feedback form? This cannot be undone.')) return
    setDeletingFeedback(formId)
    try {
      const { error } = await supabase
        .from('feedback_forms')
        .delete()
        .eq('id', formId)
      if (error) throw error
      setFeedbackForms((prev) => prev.filter((f) => f.id !== formId))
      cancelEditFeedback()
    } catch (err: any) {
      alert(err.message || 'Failed to delete feedback form')
    } finally {
      setDeletingFeedback(null)
    }
  }

  function toggleFeedbackVisibility(ventLinkId: string) {
    setFeedbackAlwaysVisible((prev) => {
      const next = { ...prev, [ventLinkId]: !prev[ventLinkId] }
      localStorage.setItem(`ghostinbox_feedback_visible_${ventLinkId}`, String(next[ventLinkId]))
      return next
    })
  }

  async function createQASession() {
    if (!primaryVentLink) {
      alert('Please create a vent link first')
      return
    }

    if (!newQASessionTitle.trim()) {
      alert('Please enter a session title')
      return
    }

    setCreatingQASession(true)
    try {
      const { error } = await supabase
        .from('qa_sessions')
        .insert({
          vent_link_id: primaryVentLink.id,
          title: newQASessionTitle.trim(),
          description: newQASessionDescription.trim() || null,
          is_active: true,
          starts_at: newQASessionStartsAt ? new Date(newQASessionStartsAt).toISOString() : null,
          ends_at: newQASessionEndsAt ? new Date(newQASessionEndsAt).toISOString() : null,
        })

      if (error) throw error

      setNewQASessionTitle('')
      setNewQASessionDescription('')
      setNewQASessionStartsAt('')
      setNewQASessionEndsAt('')
      setShowCreateQASession(false)
      await fetchData()
    } catch (err: any) {
      alert(err.message || 'Failed to create Q&A session')
    } finally {
      setCreatingQASession(false)
    }
  }

  async function toggleQASessionActive(sessionId: string, isActive: boolean) {
    const { error } = await supabase
      .from('qa_sessions')
      .update({ is_active: !isActive })
      .eq('id', sessionId)

    if (!error) {
      await fetchData()
    }
  }

  async function answerQuestion(questionId: string, sessionId: string) {
    if (!answerText.trim()) {
      alert('Please enter an answer')
      return
    }

    setAnsweringQuestion(questionId)
    try {
      const { error } = await supabase
        .from('qa_questions')
        .update({
          answer_text: answerText.trim(),
          is_answered: true,
          answered_at: new Date().toISOString(),
        })
        .eq('id', questionId)

      if (error) throw error

      setAnswerText('')
      setAnsweringQuestion(null)
      
      // Refresh questions for this session
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
      alert(err.message || 'Failed to answer question')
    } finally {
      setAnsweringQuestion(null)
    }
  }

  async function deleteQASession(sessionId: string) {
    if (!confirm('Are you sure you want to delete this Q&A session? This will also delete all questions.')) return
    
    try {
      const { error } = await supabase
        .from('qa_sessions')
        .delete()
        .eq('id', sessionId)

      if (error) throw error
      await fetchData()
    } catch (err: any) {
      alert(err.message || 'Failed to delete Q&A session')
    }
  }

  async function createChallenge() {
    if (!primaryVentLink) {
      alert('Please create a vent link first')
      return
    }

    if (!newChallengeTitle.trim()) {
      alert('Please enter a challenge title')
      return
    }

    setCreatingChallenge(true)
    try {
      const { error } = await supabase
        .from('challenges')
        .insert({
          vent_link_id: primaryVentLink.id,
          title: newChallengeTitle.trim(),
          description: newChallengeDescription.trim() || null,
          challenge_type: newChallengeType,
          is_active: true,
          starts_at: newChallengeStartsAt ? new Date(newChallengeStartsAt).toISOString() : null,
          ends_at: newChallengeEndsAt ? new Date(newChallengeEndsAt).toISOString() : null,
          prize_description: newChallengePrize.trim() || null,
          rules: newChallengeRules.trim() || null,
        })

      if (error) throw error

      setNewChallengeTitle('')
      setNewChallengeDescription('')
      setNewChallengeType('challenge')
      setNewChallengeStartsAt('')
      setNewChallengeEndsAt('')
      setNewChallengePrize('')
      setNewChallengeRules('')
      setShowCreateChallenge(false)
      await fetchData()
    } catch (err: any) {
      alert(err.message || 'Failed to create challenge')
    } finally {
      setCreatingChallenge(false)
    }
  }

  async function toggleChallengeActive(challengeId: string, isActive: boolean) {
    const { error } = await supabase
      .from('challenges')
      .update({ is_active: !isActive })
      .eq('id', challengeId)

    if (!error) {
      await fetchData()
    }
  }

  async function markSubmissionWinner(submissionId: string, challengeId: string, isWinner: boolean) {
    try {
      const { error } = await supabase
        .from('challenge_submissions')
        .update({ is_winner: isWinner })
        .eq('id', submissionId)

      if (error) throw error

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
      alert(err.message || 'Failed to update submission')
    }
  }

  async function deleteChallenge(challengeId: string) {
    if (!confirm('Are you sure you want to delete this challenge? This will also delete all submissions.')) return
    
    try {
      const { error } = await supabase
        .from('challenges')
        .delete()
        .eq('id', challengeId)

      if (error) throw error
      await fetchData()
    } catch (err: any) {
      alert(err.message || 'Failed to delete challenge')
    }
  }

  function startEditChallenge(challenge: Challenge) {
    setEditingChallenge(challenge)
    setEditChallengeTitle(challenge.title)
    setEditChallengeDescription(challenge.description || '')
    setEditChallengeType(challenge.challenge_type)
    setEditChallengeStartsAt(challenge.starts_at ? new Date(challenge.starts_at).toISOString().slice(0, 16) : '')
    setEditChallengeEndsAt(challenge.ends_at ? new Date(challenge.ends_at).toISOString().slice(0, 16) : '')
    setEditChallengePrize(challenge.prize_description || '')
    setEditChallengeRules(challenge.rules || '')
    setShowCreateChallenge(false)
  }

  function cancelEditChallenge() {
    setEditingChallenge(null)
    setEditChallengeTitle('')
    setEditChallengeDescription('')
    setEditChallengeType('challenge')
    setEditChallengeStartsAt('')
    setEditChallengeEndsAt('')
    setEditChallengePrize('')
    setEditChallengeRules('')
  }

  async function saveChallengeEdit() {
    if (!editingChallenge || !editChallengeTitle.trim()) {
      alert('Please enter a challenge title')
      return
    }

    setUpdatingChallenge(true)
    try {
      const { error } = await supabase
        .from('challenges')
        .update({
          title: editChallengeTitle.trim(),
          description: editChallengeDescription.trim() || null,
          challenge_type: editChallengeType,
          starts_at: editChallengeStartsAt ? new Date(editChallengeStartsAt).toISOString() : null,
          ends_at: editChallengeEndsAt ? new Date(editChallengeEndsAt).toISOString() : null,
          prize_description: editChallengePrize.trim() || null,
          rules: editChallengeRules.trim() || null,
        })
        .eq('id', editingChallenge.id)

      if (error) throw error

      cancelEditChallenge()
      await fetchData()
    } catch (err: any) {
      alert(err.message || 'Failed to update challenge')
    } finally {
      setUpdatingChallenge(false)
    }
  }

  async function duplicateChallenge(challenge: Challenge) {
    if (!primaryVentLink) {
      alert('Please create a vent link first')
      return
    }

    setCreatingChallenge(true)
    try {
      const { error } = await supabase
        .from('challenges')
        .insert({
          vent_link_id: primaryVentLink.id,
          title: `${challenge.title} (Copy)`,
          description: challenge.description,
          challenge_type: challenge.challenge_type,
          is_active: false, // Start as inactive
          starts_at: challenge.starts_at,
          ends_at: challenge.ends_at,
          prize_description: challenge.prize_description,
          rules: challenge.rules,
        })

      if (error) throw error

      await fetchData()
    } catch (err: any) {
      alert(err.message || 'Failed to duplicate challenge')
    } finally {
      setCreatingChallenge(false)
    }
  }

  function exportChallengeSubmissions(challengeId: string) {
    const submissions = challengeSubmissions[challengeId] || []
    if (submissions.length === 0) {
      alert('No submissions to export')
      return
    }

    const challenge = challenges.find(c => c.id === challengeId)
    const csvContent = [
      ['Submission ID', 'Submission Text', 'Is Winner', 'Submitted At'].join(','),
      ...submissions.map(s => [
        s.id,
        `"${s.submission_text.replace(/"/g, '""')}"`,
        s.is_winner ? 'Yes' : 'No',
        new Date(s.created_at).toISOString()
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${challenge?.title || 'challenge'}_submissions_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function getChallengeStatus(challenge: Challenge): 'upcoming' | 'active' | 'ended' | 'inactive' {
    if (!challenge.is_active) return 'inactive'
    const now = new Date()
    if (challenge.starts_at && new Date(challenge.starts_at) > now) return 'upcoming'
    if (challenge.ends_at && new Date(challenge.ends_at) < now) return 'ended'
    return 'active'
  }

  const filteredChallenges = challenges.filter(challenge => {
    if (challengeFilter === 'all') return true
    if (challengeFilter === 'active') return challenge.is_active && getChallengeStatus(challenge) === 'active'
    if (challengeFilter === 'inactive') return !challenge.is_active
    if (challengeFilter === 'upcoming') return getChallengeStatus(challenge) === 'upcoming'
    if (challengeFilter === 'ended') return getChallengeStatus(challenge) === 'ended'
    return true
  })

  async function createRaffle() {
    if (!primaryVentLink) {
      alert('Please create a vent link first')
      return
    }

    if (!newRaffleTitle.trim()) {
      alert('Please enter a raffle title')
      return
    }

    const winnerCount = parseInt(newRaffleWinnerCount) || 1
    if (winnerCount < 1) {
      alert('Winner count must be at least 1')
      return
    }

    setCreatingRaffle(true)
    try {
      const { error } = await supabase
        .from('raffles')
        .insert({
          vent_link_id: primaryVentLink.id,
          title: newRaffleTitle.trim(),
          description: newRaffleDescription.trim() || null,
          prize_description: newRafflePrize.trim() || null,
          is_active: true,
          starts_at: newRaffleStartsAt ? new Date(newRaffleStartsAt).toISOString() : null,
          ends_at: newRaffleEndsAt ? new Date(newRaffleEndsAt).toISOString() : null,
          draw_at: newRaffleDrawAt ? new Date(newRaffleDrawAt).toISOString() : null,
          winner_count: winnerCount,
          is_drawn: false,
        })

      if (error) throw error

      setNewRaffleTitle('')
      setNewRaffleDescription('')
      setNewRafflePrize('')
      setNewRaffleStartsAt('')
      setNewRaffleEndsAt('')
      setNewRaffleDrawAt('')
      setNewRaffleWinnerCount('1')
      setShowCreateRaffle(false)
      await fetchData()
    } catch (err: any) {
      alert(err.message || 'Failed to create raffle')
    } finally {
      setCreatingRaffle(false)
    }
  }

  async function toggleRaffleActive(raffleId: string, isActive: boolean) {
    const { error } = await supabase
      .from('raffles')
      .update({ is_active: !isActive })
      .eq('id', raffleId)

    if (!error) {
      await fetchData()
    }
  }

  async function drawRaffleWinners(raffleId: string) {
    const raffle = raffles.find(r => r.id === raffleId)
    if (!raffle) return

    const entries = raffleEntries[raffleId] || []
    if (entries.length === 0) {
      alert('No entries to draw from')
      return
    }

    if (!confirm(`Draw ${raffle.winner_count} winner(s) from ${entries.length} entries?`)) return

    setDrawingRaffle(raffleId)
    try {
      // Shuffle entries and select winners
      const shuffled = [...entries].sort(() => Math.random() - 0.5)
      const winners = shuffled.slice(0, Math.min(raffle.winner_count, shuffled.length))

      // Mark winners
      for (const winner of winners) {
        await supabase
          .from('raffle_entries')
          .update({ is_winner: true })
          .eq('id', winner.id)
      }

      // Mark raffle as drawn
      await supabase
        .from('raffles')
        .update({ is_drawn: true })
        .eq('id', raffleId)

      await fetchData()
    } catch (err: any) {
      alert(err.message || 'Failed to draw winners')
    } finally {
      setDrawingRaffle(null)
    }
  }

  async function deleteRaffle(raffleId: string) {
    if (!confirm('Are you sure you want to delete this raffle? This will also delete all entries.')) return
    
    try {
      const { error } = await supabase
        .from('raffles')
        .delete()
        .eq('id', raffleId)

      if (error) throw error
      await fetchData()
    } catch (err: any) {
      alert(err.message || 'Failed to delete raffle')
    }
  }

  function getRaffleStatus(raffle: Raffle): 'upcoming' | 'active' | 'ended' | 'drawn' | 'inactive' {
    if (!raffle.is_active) return 'inactive'
    if (raffle.is_drawn) return 'drawn'
    const now = new Date()
    if (raffle.starts_at && new Date(raffle.starts_at) > now) return 'upcoming'
    if (raffle.ends_at && new Date(raffle.ends_at) < now) return 'ended'
    return 'active'
  }

  async function fetchHighlights(linkIds: string[]) {
    try {
      const { data, error } = await supabase
        .from('community_highlights')
        .select('*')
        .in('vent_link_id', linkIds)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false })

      if (error) {
        // Suppress common RLS errors
        if (error.code !== 'PGRST116' && error.code !== '42501') {
          console.error('Error fetching highlights:', error)
        }
        return
      }
      setHighlights(data || [])
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Error fetching highlights:', err)
      }
    }
  }

  async function createHighlight() {
    const primary = primaryVentLink
    if (!primary) return
    if (!newHighlightTitle.trim() && !newHighlightText.trim()) return
    try {
      setCreatingHighlight(true)
      const { error } = await supabase.from('community_highlights').insert({
        vent_link_id: primary.id,
        title: newHighlightTitle.trim() || null,
        highlight_text: newHighlightText.trim() || null,
        message_id: newHighlightMessageId || null,
        is_featured: newHighlightFeatured,
        display_order: newHighlightOrder || 0,
      })
      if (error) {
        console.error('Error creating highlight:', error)
      } else {
        await fetchHighlights([primary.id])
        setShowCreateHighlight(false)
        setNewHighlightTitle('')
        setNewHighlightText('')
        setNewHighlightMessageId(null)
        setNewHighlightFeatured(true)
        setNewHighlightOrder(0)
      }
    } catch (err) {
      console.error('Error creating highlight:', err)
    } finally {
      setCreatingHighlight(false)
    }
  }

  async function toggleHighlightFeatured(id: string, isFeatured: boolean) {
    const primary = primaryVentLink
    try {
      setUpdatingHighlight(id)
      const { error } = await supabase
        .from('community_highlights')
        .update({ is_featured: !isFeatured })
        .eq('id', id)
      if (error) {
        console.error('Error updating highlight:', error)
      } else if (primary) {
        await fetchHighlights([primary.id])
      }
    } catch (err) {
      console.error('Error updating highlight:', err)
    } finally {
      setUpdatingHighlight(null)
    }
  }

  async function updateHighlightOrder(id: string, order: number) {
    const primary = primaryVentLink
    try {
      setUpdatingHighlight(id)
      const { error } = await supabase
        .from('community_highlights')
        .update({ display_order: order })
        .eq('id', id)
      if (error) {
        console.error('Error updating highlight order:', error)
      } else if (primary) {
        await fetchHighlights([primary.id])
      }
    } catch (err) {
      console.error('Error updating highlight order:', err)
    } finally {
      setUpdatingHighlight(null)
    }
  }

  async function deleteHighlight(id: string) {
    const primary = primaryVentLink
    try {
      setDeletingHighlight(id)
      const { error } = await supabase
        .from('community_highlights')
        .delete()
        .eq('id', id)
      if (error) {
        console.error('Error deleting highlight:', error)
      } else if (primary) {
        await fetchHighlights([primary.id])
      }
    } catch (err) {
      console.error('Error deleting highlight:', err)
    } finally {
      setDeletingHighlight(null)
    }
  }

  async function fetchGoals(linkIds: string[]) {
    try {
      const { data, error } = await supabase
        .from('community_goals')
        .select('*')
        .in('vent_link_id', linkIds)
        .order('created_at', { ascending: false })

      if (error) {
        if (error.code !== 'PGRST116' && error.code !== '42501') {
          if (import.meta.env.DEV) {
            console.error('Error fetching goals:', error)
          }
        }
        return
      }

      if (data) {
        // Auto-calculate current_value based on goal_type
        const goalsWithProgress = await Promise.all(
          data.map(async (goal) => {
            let currentValue = 0
            const primaryLink = ventLinks.find(link => link.id === goal.vent_link_id)

            if (primaryLink) {
              switch (goal.goal_type) {
                case 'messages':
                  currentValue = messages.filter(m => m.vent_link_id === goal.vent_link_id).length
                  break
                case 'polls':
                  currentValue = polls.filter(p => p.vent_link_id === goal.vent_link_id && p.is_active).length
                  break
                case 'engagement':
                  // Count total reactions for messages in this vent link
                  const linkMessages = messages.filter(m => m.vent_link_id === goal.vent_link_id)
                  const linkMessageIds = linkMessages.map(m => m.id)
                  const linkReactions = Object.values(messageReactions).flat().filter(
                    r => linkMessageIds.includes(r.message_id)
                  )
                  currentValue = linkReactions.length
                  break
                case 'custom':
                  // Custom goals are manually updated
                  currentValue = goal.current_value || 0
                  break
              }
            }

            // Update goal if current_value changed
            if (currentValue !== goal.current_value) {
              try {
                await supabase
                  .from('community_goals')
                  .update({ current_value: currentValue })
                  .eq('id', goal.id)
              } catch (err) {
                // Suppress errors
              }
            }

            return {
              ...goal,
              current_value: currentValue,
            }
          })
        )

        setCommunityGoals(goalsWithProgress)
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Error fetching goals:', err)
      }
    }
  }

  async function createGoal() {
    const primary = primaryVentLink
    if (!primary) return
    if (!newGoalTitle.trim()) {
      alert('Please enter a goal title')
      return
    }

    const targetValue = parseInt(newGoalTargetValue) || 0
    if (targetValue <= 0) {
      alert('Target value must be greater than 0')
      return
    }

    setCreatingGoal(true)
    try {
      // Calculate initial current_value
      let currentValue = 0
      switch (newGoalType) {
        case 'messages':
          currentValue = messages.filter(m => m.vent_link_id === primary.id).length
          break
        case 'polls':
          currentValue = polls.filter(p => p.vent_link_id === primary.id && p.is_active).length
          break
        case 'engagement':
          const linkMessages = messages.filter(m => m.vent_link_id === primary.id)
          const linkMessageIds = linkMessages.map(m => m.id)
          const linkReactions = Object.values(messageReactions).flat().filter(
            r => linkMessageIds.includes(r.message_id)
          )
          currentValue = linkReactions.length
          break
        case 'custom':
          currentValue = 0
          break
      }

      const { error } = await supabase.from('community_goals').insert({
        vent_link_id: primary.id,
        title: newGoalTitle.trim(),
        description: newGoalDescription.trim() || null,
        goal_type: newGoalType,
        target_value: targetValue,
        current_value: currentValue,
        is_active: true,
        deadline: newGoalDeadline ? new Date(newGoalDeadline).toISOString() : null,
      })

      if (error) {
        console.error('Error creating goal:', error)
        alert(error.message || 'Failed to create goal')
      } else {
        await fetchGoals([primary.id])
        setShowCreateGoal(false)
        setNewGoalTitle('')
        setNewGoalDescription('')
        setNewGoalType('messages')
        setNewGoalTargetValue('100')
        setNewGoalDeadline('')
      }
    } catch (err: any) {
      console.error('Error creating goal:', err)
      alert(err.message || 'Failed to create goal')
    } finally {
      setCreatingGoal(false)
    }
  }

  async function toggleGoalActive(goalId: string, isActive: boolean) {
    try {
      const { error } = await supabase
        .from('community_goals')
        .update({ is_active: !isActive })
        .eq('id', goalId)

      if (error) {
        console.error('Error updating goal:', error)
      } else {
        await fetchGoals(ventLinks.map(l => l.id))
      }
    } catch (err) {
      console.error('Error updating goal:', err)
    }
  }

  async function startEditGoal(goal: CommunityGoal) {
    setEditingGoal(goal.id)
    setEditGoalTitle(goal.title)
    setEditGoalDescription(goal.description || '')
    setEditGoalType(goal.goal_type)
    setEditGoalTargetValue(goal.target_value.toString())
    setEditGoalDeadline(goal.deadline ? new Date(goal.deadline).toISOString().slice(0, 16) : '')
  }

  async function cancelEditGoal() {
    setEditingGoal(null)
    setEditGoalTitle('')
    setEditGoalDescription('')
    setEditGoalType('messages')
    setEditGoalTargetValue('')
    setEditGoalDeadline('')
  }

  async function saveGoalEdit() {
    if (!editingGoal) return

    const targetValue = parseInt(editGoalTargetValue) || 0
    if (targetValue <= 0) {
      alert('Target value must be greater than 0')
      return
    }

    setUpdatingGoal(true)
    try {
      const { error } = await supabase
        .from('community_goals')
        .update({
          title: editGoalTitle.trim(),
          description: editGoalDescription.trim() || null,
          goal_type: editGoalType,
          target_value: targetValue,
          deadline: editGoalDeadline ? new Date(editGoalDeadline).toISOString() : null,
        })
        .eq('id', editingGoal)

      if (error) {
        console.error('Error updating goal:', error)
        alert(error.message || 'Failed to update goal')
      } else {
        await fetchGoals(ventLinks.map(l => l.id))
        cancelEditGoal()
      }
    } catch (err: any) {
      console.error('Error updating goal:', err)
      alert(err.message || 'Failed to update goal')
    } finally {
      setUpdatingGoal(false)
    }
  }

  async function updateGoalProgress(goalId: string, newValue: number) {
    try {
      const { error } = await supabase
        .from('community_goals')
        .update({ current_value: newValue })
        .eq('id', goalId)

      if (error) {
        console.error('Error updating goal progress:', error)
      } else {
        await fetchGoals(ventLinks.map(l => l.id))
      }
    } catch (err) {
      console.error('Error updating goal progress:', err)
    }
  }

  async function deleteGoal(goalId: string) {
    if (!confirm('Are you sure you want to delete this goal?')) return

    setDeletingGoal(goalId)
    try {
      const { error } = await supabase
        .from('community_goals')
        .delete()
        .eq('id', goalId)

      if (error) {
        console.error('Error deleting goal:', error)
        alert(error.message || 'Failed to delete goal')
      } else {
        await fetchGoals(ventLinks.map(l => l.id))
      }
    } catch (err: any) {
      console.error('Error deleting goal:', err)
      alert(err.message || 'Failed to delete goal')
    } finally {
      setDeletingGoal(null)
    }
  }

  function getGoalProgress(goal: CommunityGoal): number {
    if (goal.target_value === 0) return 0
    return Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
  }

  function getGoalStatus(goal: CommunityGoal): 'active' | 'completed' | 'expired' | 'inactive' {
    if (!goal.is_active) return 'inactive'
    if (goal.current_value >= goal.target_value) return 'completed'
    if (goal.deadline && new Date(goal.deadline) < new Date()) return 'expired'
    return 'active'
  }

  async function fetchEvents(linkIds: string[]) {
    try {
      const { data, error } = await supabase
        .from('community_events')
        .select('*')
        .in('vent_link_id', linkIds)
        .order('is_pinned', { ascending: false })
        .order('event_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })

      if (error) {
        if (error.code !== 'PGRST116' && error.code !== '42501') {
          if (import.meta.env.DEV) {
            console.error('Error fetching events:', error)
          }
        }
        return
      }

      setCommunityEvents(data || [])
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Error fetching events:', err)
      }
    }
  }

  async function createEvent() {
    const primary = primaryVentLink
    if (!primary) return
    if (!newEventTitle.trim()) {
      alert('Please enter an event title')
      return
    }

    setCreatingEvent(true)
    try {
      const { error } = await supabase.from('community_events').insert({
        vent_link_id: primary.id,
        title: newEventTitle.trim(),
        description: newEventDescription.trim() || null,
        event_type: newEventType,
        event_date: newEventDate ? new Date(newEventDate).toISOString() : null,
        is_pinned: newEventPinned,
        is_active: true,
      })

      if (error) {
        console.error('Error creating event:', error)
        alert(error.message || 'Failed to create event')
      } else {
        await fetchEvents([primary.id])
        setShowCreateEvent(false)
        setNewEventTitle('')
        setNewEventDescription('')
        setNewEventType('event')
        setNewEventDate('')
        setNewEventPinned(false)
      }
    } catch (err: any) {
      console.error('Error creating event:', err)
      alert(err.message || 'Failed to create event')
    } finally {
      setCreatingEvent(false)
    }
  }

  async function toggleEventActive(eventId: string, isActive: boolean) {
    try {
      const { error } = await supabase
        .from('community_events')
        .update({ is_active: !isActive })
        .eq('id', eventId)

      if (error) {
        console.error('Error updating event:', error)
      } else {
        await fetchEvents(ventLinks.map(l => l.id))
      }
    } catch (err) {
      console.error('Error updating event:', err)
    }
  }

  async function toggleEventPinned(eventId: string, isPinned: boolean) {
    try {
      const { error } = await supabase
        .from('community_events')
        .update({ is_pinned: !isPinned })
        .eq('id', eventId)

      if (error) {
        console.error('Error updating event:', error)
      } else {
        await fetchEvents(ventLinks.map(l => l.id))
      }
    } catch (err) {
      console.error('Error updating event:', err)
    }
  }

  async function startEditEvent(event: CommunityEvent) {
    setEditingEvent(event.id)
    setEditEventTitle(event.title)
    setEditEventDescription(event.description || '')
    setEditEventType(event.event_type)
    setEditEventDate(event.event_date ? new Date(event.event_date).toISOString().slice(0, 16) : '')
    setEditEventPinned(event.is_pinned)
  }

  async function cancelEditEvent() {
    setEditingEvent(null)
    setEditEventTitle('')
    setEditEventDescription('')
    setEditEventType('event')
    setEditEventDate('')
    setEditEventPinned(false)
  }

  async function saveEventEdit() {
    if (!editingEvent) return

    setUpdatingEvent(true)
    try {
      const { error } = await supabase
        .from('community_events')
        .update({
          title: editEventTitle.trim(),
          description: editEventDescription.trim() || null,
          event_type: editEventType,
          event_date: editEventDate ? new Date(editEventDate).toISOString() : null,
          is_pinned: editEventPinned,
        })
        .eq('id', editingEvent)

      if (error) {
        console.error('Error updating event:', error)
        alert(error.message || 'Failed to update event')
      } else {
        await fetchEvents(ventLinks.map(l => l.id))
        cancelEditEvent()
      }
    } catch (err: any) {
      console.error('Error updating event:', err)
      alert(err.message || 'Failed to update event')
    } finally {
      setUpdatingEvent(false)
    }
  }

  async function deleteEvent(eventId: string) {
    if (!confirm('Are you sure you want to delete this event?')) return

    setDeletingEvent(eventId)
    try {
      const { error } = await supabase
        .from('community_events')
        .delete()
        .eq('id', eventId)

      if (error) {
        console.error('Error deleting event:', error)
        alert(error.message || 'Failed to delete event')
      } else {
        await fetchEvents(ventLinks.map(l => l.id))
      }
    } catch (err: any) {
      console.error('Error deleting event:', err)
      alert(err.message || 'Failed to delete event')
    } finally {
      setDeletingEvent(null)
    }
  }

  function getEventStatus(event: CommunityEvent): 'upcoming' | 'past' | 'no-date' | 'inactive' {
    if (!event.is_active) return 'inactive'
    if (!event.event_date) return 'no-date'
    const now = new Date()
    const eventDate = new Date(event.event_date)
    if (eventDate < now) return 'past'
    return 'upcoming'
  }

  async function fetchProjects(linkIds: string[]) {
    try {
      const { data, error } = await supabase
        .from('collaborative_projects')
        .select('*')
        .in('vent_link_id', linkIds)
        .order('created_at', { ascending: false })

      if (error) {
        if (error.code !== 'PGRST116' && error.code !== '42501') {
          if (import.meta.env.DEV) {
            console.error('Error fetching projects:', error)
          }
        }
        return
      }

      if (data) {
        setCollaborativeProjects(data || [])
        // Fetch contributions for all projects
        if (data.length > 0) {
          const projectIds = data.map(p => p.id)
          const { data: contributionsData, error: contributionsError } = await supabase
            .from('project_contributions')
            .select('*')
            .in('project_id', projectIds)
            .order('created_at', { ascending: false })

          if (!contributionsError && contributionsData) {
            const contributionsByProject: { [projectId: string]: any[] } = {}
            contributionsData.forEach(contribution => {
              if (!contributionsByProject[contribution.project_id]) {
                contributionsByProject[contribution.project_id] = []
              }
              contributionsByProject[contribution.project_id].push(contribution)
            })
            setProjectContributions(contributionsByProject)
          }
        }
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Error fetching projects:', err)
      }
    }
  }

  async function fetchContributionsForProject(projectId: string) {
    try {
      const { data, error } = await supabase
        .from('project_contributions')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) {
        if (error.code !== 'PGRST116' && error.code !== '42501') {
          if (import.meta.env.DEV) {
            console.error('Error fetching contributions:', error)
          }
        }
        return
      }

      setProjectContributions(prev => ({
        ...prev,
        [projectId]: data || []
      }))
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Error fetching contributions:', err)
      }
    }
  }

  async function createProject() {
    const primary = primaryVentLink
    if (!primary) return
    if (!newProjectTitle.trim()) {
      alert('Please enter a project title')
      return
    }

    setCreatingProject(true)
    try {
      const { error } = await supabase.from('collaborative_projects').insert({
        vent_link_id: primary.id,
        title: newProjectTitle.trim(),
        description: newProjectDescription.trim() || null,
        project_type: newProjectType,
        is_active: true,
      })

      if (error) {
        console.error('Error creating project:', error)
        alert(error.message || 'Failed to create project')
      } else {
        await fetchProjects([primary.id])
        setShowCreateProject(false)
        setNewProjectTitle('')
        setNewProjectDescription('')
        setNewProjectType('project')
      }
    } catch (err: any) {
      console.error('Error creating project:', err)
      alert(err.message || 'Failed to create project')
    } finally {
      setCreatingProject(false)
    }
  }

  async function toggleProjectActive(projectId: string, isActive: boolean) {
    try {
      const { error } = await supabase
        .from('collaborative_projects')
        .update({ is_active: !isActive })
        .eq('id', projectId)

      if (error) {
        console.error('Error updating project:', error)
      } else {
        await fetchProjects(ventLinks.map(l => l.id))
      }
    } catch (err) {
      console.error('Error updating project:', err)
    }
  }

  async function startEditProject(project: CollaborativeProject) {
    setEditingProject(project.id)
    setEditProjectTitle(project.title)
    setEditProjectDescription(project.description || '')
    setEditProjectType(project.project_type)
  }

  async function cancelEditProject() {
    setEditingProject(null)
    setEditProjectTitle('')
    setEditProjectDescription('')
    setEditProjectType('project')
  }

  async function saveProjectEdit() {
    if (!editingProject) return

    setUpdatingProject(true)
    try {
      const { error } = await supabase
        .from('collaborative_projects')
        .update({
          title: editProjectTitle.trim(),
          description: editProjectDescription.trim() || null,
          project_type: editProjectType,
        })
        .eq('id', editingProject)

      if (error) {
        console.error('Error updating project:', error)
        alert(error.message || 'Failed to update project')
      } else {
        await fetchProjects(ventLinks.map(l => l.id))
        cancelEditProject()
      }
    } catch (err: any) {
      console.error('Error updating project:', err)
      alert(err.message || 'Failed to update project')
    } finally {
      setUpdatingProject(false)
    }
  }

  async function deleteProject(projectId: string) {
    if (!confirm('Are you sure you want to delete this project? All contributions will also be deleted.')) return

    setDeletingProject(projectId)
    try {
      const { error } = await supabase
        .from('collaborative_projects')
        .delete()
        .eq('id', projectId)

      if (error) {
        console.error('Error deleting project:', error)
        alert(error.message || 'Failed to delete project')
      } else {
        await fetchProjects(ventLinks.map(l => l.id))
        setProjectContributions(prev => {
          const updated = { ...prev }
          delete updated[projectId]
          return updated
        })
      }
    } catch (err: any) {
      console.error('Error deleting project:', err)
      alert(err.message || 'Failed to delete project')
    } finally {
      setDeletingProject(null)
    }
  }

  async function fetchReactionsForMessage(messageId: string) {
    try {
      const { data, error } = await supabase
        .from('message_reactions')
        .select('*')
        .eq('message_id', messageId)
        .order('created_at', { ascending: false })

      if (error) {
        // Suppress expected RLS errors (403, permission denied, etc.)
        if (error.code !== 'PGRST116' && error.code !== '42501' && error.code !== 'PGRST301') {
          if (import.meta.env.DEV) {
            console.error('Error fetching reactions:', error)
          }
        }
        return
      }

      // Update reactions for this message
      setMessageReactions(prev => ({
        ...prev,
        [messageId]: data || []
      }))

      // Update stats
      const stats: { [reactionType: string]: number } = {}
      data?.forEach((reaction) => {
        stats[reaction.reaction_type] = (stats[reaction.reaction_type] || 0) + 1
      })
      setReactionStats(prev => ({
        ...prev,
        [messageId]: stats
      }))
    } catch (err: any) {
      // Suppress expected errors (403, RLS policy blocks, etc.)
      if (err?.code !== 'PGRST116' && err?.code !== '42501' && err?.code !== 'PGRST301' && err?.code !== 403) {
        if (import.meta.env.DEV) {
          console.error('Error fetching reactions:', err)
        }
      }
    }
  }

  async function addReaction(messageId: string, reactionType: string) {
    try {
      // Hash IP for privacy (in production, this would be done server-side)
      const ipHash = 'anonymous' // Simplified for now
      
      const { error } = await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          reaction_type: reactionType,
          ip_hash: ipHash
        })

      if (error) {
        // If it's a unique constraint error, the reaction already exists
        if (error.code === '23505') {
          // Try to remove it instead (toggle behavior)
          await removeReaction(messageId, reactionType)
          return
        }
        // Suppress expected RLS errors (403, permission denied, etc.)
        const errorCode = error.code || String((error as any).status || '')
        if (errorCode !== 'PGRST116' && errorCode !== '42501' && errorCode !== 'PGRST301' && errorCode !== '403') {
          if (import.meta.env.DEV) {
            console.error('Error adding reaction:', error)
          }
        }
      } else {
        // Refresh reactions for this message
        await fetchReactionsForMessage(messageId)
      }
    } catch (err: any) {
      // Suppress expected errors
      if (err?.code !== 'PGRST116' && err?.code !== '42501' && err?.code !== 'PGRST301' && err?.code !== 403) {
        if (import.meta.env.DEV) {
          console.error('Error adding reaction:', err)
        }
      }
    }
  }

  async function removeReaction(messageId: string, reactionType: string) {
    try {
      const ipHash = 'anonymous' // Simplified for now
      
      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('reaction_type', reactionType)
        .eq('ip_hash', ipHash)

      if (error) {
        // Suppress expected RLS errors (403, permission denied, etc.)
        const errorCode = error.code || String((error as any).status || '')
        if (errorCode !== 'PGRST116' && errorCode !== '42501' && errorCode !== 'PGRST301' && errorCode !== '403') {
          if (import.meta.env.DEV) {
            console.error('Error removing reaction:', error)
          }
        }
      } else {
        // Refresh reactions for this message
        await fetchReactionsForMessage(messageId)
      }
    } catch (err: any) {
      // Suppress expected errors
      if (err?.code !== 'PGRST116' && err?.code !== '42501' && err?.code !== 'PGRST301' && err?.code !== 403) {
        if (import.meta.env.DEV) {
          console.error('Error removing reaction:', err)
        }
      }
    }
  }

  function addPollOption() {
    setNewPollOptions([...newPollOptions, ''])
  }

  function removePollOption(index: number) {
    if (newPollOptions.length > 2) {
      setNewPollOptions(newPollOptions.filter((_, i) => i !== index))
    }
  }

  function updatePollOption(index: number, value: string) {
    const updated = [...newPollOptions]
    updated[index] = value
    setNewPollOptions(updated)
  }

  // Poll Template Functions
  function savePollAsTemplate() {
    if (!newTemplateName.trim() || !newPollQuestion.trim() || newPollOptions.filter(opt => opt.trim()).length < 2) {
      return
    }

    const newTemplate = {
      id: Date.now().toString(),
      name: newTemplateName.trim(),
      question: newPollQuestion.trim(),
      options: newPollOptions.filter(opt => opt.trim())
    }

    const updatedTemplates = [...pollTemplates, newTemplate]
    setPollTemplates(updatedTemplates)
    localStorage.setItem('pollTemplates', JSON.stringify(updatedTemplates))
    setNewTemplateName('')
  }

  function usePollTemplate(template: { id: string; name: string; question: string; options: string[] }) {
    setNewPollQuestion(template.question)
    setNewPollOptions([...template.options, ''])
    setShowPollTemplates(false)
  }

  function deletePollTemplate(templateId: string) {
    const updatedTemplates = pollTemplates.filter(t => t.id !== templateId)
    setPollTemplates(updatedTemplates)
    localStorage.setItem('pollTemplates', JSON.stringify(updatedTemplates))
  }

  // Load poll templates from localStorage
  useEffect(() => {
    const savedTemplates = localStorage.getItem('pollTemplates')
    if (savedTemplates) {
      try {
        setPollTemplates(JSON.parse(savedTemplates))
      } catch (e) {
        console.error('Error loading poll templates:', e)
      }
    }
  }, [])

  // Message Actions
  async function toggleStar(messageId: string) {
    const message = messages.find(m => m.id === messageId)
    if (!message) return

    const newStarred = !message.is_starred
    const { error } = await supabase
      .from('vent_messages')
      .update({ is_starred: newStarred })
      .eq('id', messageId)

    if (!error) {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, is_starred: newStarred } : msg))
      )
    }
  }

  async function toggleArchive(messageId: string) {
    const message = messages.find(m => m.id === messageId)
    if (!message) return

    const newArchived = !message.is_archived
    const { error } = await supabase
      .from('vent_messages')
      .update({ is_archived: newArchived })
      .eq('id', messageId)

    if (!error) {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, is_archived: newArchived } : msg))
      )
    }
  }

  // Folder Functions
  async function createFolder() {
    if (!newFolderName.trim()) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('message_folders')
        .insert({
          owner_id: user.id,
          folder_name: newFolderName.trim()
        })
        .select()
        .single()

      if (error) throw error

      setMessageFolders((prev) => [...prev, data])
      setNewFolderName('')
      setShowCreateFolder(false)
    } catch (err: any) {
      console.error('Error creating folder:', err)
      alert(err.message || 'Failed to create folder')
    }
  }

  async function assignMessageToFolder(messageId: string, folderId: string) {
    try {
      const { error } = await supabase
        .from('message_folder_assignments')
        .insert({
          message_id: messageId,
          folder_id: folderId
        })

      if (error && !error.message.includes('duplicate')) throw error

      setMessageFolderAssignments((prev) => ({
        ...prev,
        [messageId]: [...(prev[messageId] || []), folderId]
      }))
    } catch (err: any) {
      console.error('Error assigning folder:', err)
    }
  }

  async function removeMessageFromFolder(messageId: string, folderId: string) {
    try {
      const { error } = await supabase
        .from('message_folder_assignments')
        .delete()
        .eq('message_id', messageId)
        .eq('folder_id', folderId)

      if (error) throw error

      setMessageFolderAssignments((prev) => ({
        ...prev,
        [messageId]: (prev[messageId] || []).filter(id => id !== folderId)
      }))
    } catch (err: any) {
      console.error('Error removing folder:', err)
    }
  }

  // Bulk Actions
  function toggleMessageSelection(messageId: string) {
    const newSelected = new Set(selectedMessages)
    if (newSelected.has(messageId)) {
      newSelected.delete(messageId)
    } else {
      newSelected.add(messageId)
    }
    setSelectedMessages(newSelected)
  }

  function selectAllMessages() {
    const allIds = new Set(filteredMessages.map(m => m.id))
    setSelectedMessages(allIds)
  }

  function clearSelection() {
    setSelectedMessages(new Set())
  }

  async function bulkMarkAsRead(isRead: boolean) {
    for (const messageId of selectedMessages) {
      await markAsRead(messageId, isRead)
    }
    clearSelection()
  }

  async function bulkDeleteMessages() {
    if (!confirm(`Delete ${selectedMessages.size} message(s)? This cannot be undone.`)) return
    
    try {
      const { error } = await supabase
        .from('vent_messages')
        .delete()
        .in('id', Array.from(selectedMessages))

      if (error) throw error
      
      await fetchData()
      clearSelection()
    } catch (err: any) {
      alert('Error deleting messages: ' + (err.message || 'Unknown error'))
    }
  }

  // Message Tags
  async function addTagToMessage(messageId: string, tagName: string) {
    if (!tagName.trim()) return
    
    try {
      const { error } = await supabase
        .from('message_tags')
        .insert({
          message_id: messageId,
          tag_name: tagName.trim().toLowerCase(),
        })

      if (error && !error.message.includes('duplicate')) throw error
      
      // Update local state
      const currentTags = messageTags[messageId] || []
      setMessageTags({
        ...messageTags,
        [messageId]: [...currentTags, tagName.trim().toLowerCase()],
      })
    } catch (err: any) {
      console.error('Error adding tag:', err)
    }
  }

  async function removeTagFromMessage(messageId: string, tagName: string) {
    try {
      const { error } = await supabase
        .from('message_tags')
        .delete()
        .eq('message_id', messageId)
        .eq('tag_name', tagName)

      if (error) throw error
      
      // Update local state
      const currentTags = messageTags[messageId] || []
      setMessageTags({
        ...messageTags,
        [messageId]: currentTags.filter(t => t !== tagName),
      })
    } catch (err: any) {
      console.error('Error removing tag:', err)
    }
  }

  // Message Notes
  async function saveNote(messageId: string) {
    if (!profile || !noteText.trim()) return

    try {
      const { error } = await supabase
        .from('message_notes')
        .upsert({
          message_id: messageId,
          owner_id: profile.id,
          note_text: noteText.trim(),
          updated_at: new Date().toISOString(),
        })

      if (error) throw error
      
      setMessageNotes({
        ...messageNotes,
        [messageId]: noteText.trim(),
      })
      setEditingNote(null)
      setNoteText('')
    } catch (err: any) {
      console.error('Error saving note:', err)
      alert('Error saving note: ' + (err.message || 'Unknown error'))
    }
  }

  // Message Export
  function exportMessages(format: 'csv' | 'json') {
    const messagesToExport = filteredMessages.map(msg => ({
      id: msg.id,
      body: msg.body,
      mood: msg.mood || '',
      is_read: msg.is_read,
      is_flagged: msg.is_flagged,
      created_at: msg.created_at,
      tags: messageTags[msg.id] || [],
      note: messageNotes[msg.id] || '',
    }))

    if (format === 'csv') {
      const headers = ['ID', 'Body', 'Mood', 'Read', 'Flagged', 'Created At', 'Tags', 'Note']
      const rows = messagesToExport.map(msg => [
        msg.id,
        `"${msg.body.replace(/"/g, '""')}"`,
        msg.mood,
        msg.is_read ? 'Yes' : 'No',
        msg.is_flagged ? 'Yes' : 'No',
        msg.created_at,
        msg.tags.join('; '),
        `"${msg.note.replace(/"/g, '""')}"`,
      ])
      
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `messages-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      const json = JSON.stringify(messagesToExport, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `messages-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  // Private Response
  // Fetch responses for a message
  async function fetchMessageResponses(messageId: string) {
    try {
      const { data, error } = await supabase
        .from('message_responses')
        .select('id, response_text, created_at, owner_id')
        .eq('message_id', messageId)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      setMessageResponsesData(prev => ({
        ...prev,
        [messageId]: data || []
      }))
    } catch (err: any) {
      console.error('Error fetching responses:', err)
    }
  }

  async function sendResponse(messageId: string) {
    if (!profile || !responseText.trim()) return

    try {
      const { error } = await supabase
        .from('message_responses')
        .insert({
          message_id: messageId,
          owner_id: profile.id,
          response_text: responseText.trim(),
          is_sent: true,
        })

      if (error) throw error
      
      setShowResponseModal(false)
      setResponseText('')
      await fetchMessageResponses(messageId)
      alert('Response sent! The sender will see it when they check their message.')
    } catch (err: any) {
      console.error('Error saving response:', err)
      alert('Error saving response: ' + (err.message || 'Unknown error'))
    }
  }

  async function deleteResponse(responseId: string, messageId: string) {
    if (!confirm('Are you sure you want to delete this response? This cannot be undone.')) return

    try {
      const { error } = await supabase
        .from('message_responses')
        .delete()
        .eq('id', responseId)

      if (error) throw error
      
      // Update local state to remove the deleted response
      setMessageResponsesData(prev => ({
        ...prev,
        [messageId]: (prev[messageId] || []).filter(r => r.id !== responseId)
      }))
    } catch (err: any) {
      console.error('Error deleting response:', err)
      alert('Error deleting response: ' + (err.message || 'Unknown error'))
    }
  }

  async function updateDisplayName() {
    if (!profile || !newDisplayName.trim()) return

    setUpdatingProfile(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: newDisplayName.trim() })
        .eq('id', profile.id)

      if (error) throw error

      setProfile({ ...profile, display_name: newDisplayName.trim() })
      setEditingDisplayName(false)
      setNewDisplayName('')
    } catch (err: any) {
      console.error('Error updating display name:', err)
      alert('Failed to update display name: ' + (err.message || 'Unknown error'))
    } finally {
      setUpdatingProfile(false)
    }
  }

  async function updateHandle() {
    if (!profile || !newHandle.trim()) return

    // Normalize and validate the handle
    const normalized = normalizeHandle(newHandle)
    const validation = validateHandle(normalized)
    
    if (!validation.valid) {
      alert(validation.error || 'Invalid handle')
      return
    }

    setUpdatingProfile(true)
    try {
      // Check if handle is already taken
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('handle', normalized)
        .single()

      if (existingProfile && existingProfile.id !== profile.id) {
        alert('This handle is already taken')
        setUpdatingProfile(false)
        return
      }

      const { error } = await supabase
        .from('profiles')
        .update({ handle: normalized })
        .eq('id', profile.id)

      if (error) throw error

      setProfile({ ...profile, handle: normalized })
      setEditingHandle(false)
      setNewHandle('')
    } catch (err: any) {
      console.error('Error updating handle:', err)
      alert('Failed to update handle: ' + (err.message || 'Unknown error'))
    } finally {
      setUpdatingProfile(false)
    }
  }

  async function updateEmail() {
    if (!newEmail.trim()) return

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail.trim())) {
      alert('Please enter a valid email address')
      return
    }

    setUpdatingProfile(true)
    try {
      const { data, error } = await supabase.auth.updateUser({
        email: newEmail.trim()
      })

      if (error) throw error

      alert('Verification email sent! Please check your inbox to confirm the new email address.')
      setEditingEmail(false)
      setNewEmail('')
    } catch (err: any) {
      console.error('Error updating email:', err)
      alert('Failed to update email: ' + (err.message || 'Unknown error'))
    } finally {
      setUpdatingProfile(false)
    }
  }

  async function getCurrentUserEmail() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      return user?.email || null
    } catch {
      return null
    }
  }

  function truncateText(text: string, maxLength: number = 100) {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength) + '...'
  }

  function formatTimeAgo(dateString: string): string {
    const now = new Date()
    const date = new Date(dateString)
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) {
      return 'just now'
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60)
    if (diffInMinutes < 60) {
      return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`
    }

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) {
      return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`
    }

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) {
      return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`
    }

    const diffInWeeks = Math.floor(diffInDays / 7)
    if (diffInWeeks < 4) {
      return `${diffInWeeks} ${diffInWeeks === 1 ? 'week' : 'weeks'} ago`
    }

    const diffInMonths = Math.floor(diffInDays / 30)
    if (diffInMonths < 12) {
      return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`
    }

    const diffInYears = Math.floor(diffInDays / 365)
    return `${diffInYears} ${diffInYears === 1 ? 'year' : 'years'} ago`
  }

  async function handleGenerateReply(body: string) {
    setLoadingAi(true)
    setAiReplies(null)
    try {
      const text = await generateReplyTemplates(body)
      setAiReplies(text)
    } catch (error: any) {
      console.error('Error generating reply:', error)
      const errorMessage = error?.message || 'Unknown error occurred'
      setAiReplies(`Error: ${errorMessage}`)
    } finally {
      setLoadingAi(false)
    }
  }

  async function handleSummarizeThemes() {
    setLoadingSummary(true)
    setThemeSummary(null)
    try {
      const messageBodies = messages.slice(0, 20).map((m) => m.body)
      if (messageBodies.length === 0) {
        setThemeSummary('No messages to summarize.')
        setLoadingSummary(false)
        return
      }
      const summary = await summarizeThemes(messageBodies)
      setThemeSummary(summary)
    } catch (error: any) {
      console.error('Error generating summary:', error)
      const errorMessage = error?.message || 'Unknown error occurred'
      setThemeSummary(`Error: ${errorMessage}`)
    } finally {
      setLoadingSummary(false)
    }
  }

  function getPollStatus(poll: PollWithOptions) {
    if (!poll.is_active) return 'inactive'
    if (poll.expires_at && new Date(poll.expires_at) < new Date()) return 'expired'
    if (poll.max_votes && poll.total_votes && poll.total_votes >= poll.max_votes) return 'maxed'
    return 'active'
  }

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
        </div>
      </div>
    )
  }

  const primaryVentLink = selectedVentLinkId ? ventLinks.find(l => l.id === selectedVentLinkId) || ventLinks[0] : ventLinks[0]
  const activePolls = polls.filter((p: PollWithOptions) => getPollStatus(p) === 'active')
  const archivedPolls = polls.filter((p: PollWithOptions) => getPollStatus(p) !== 'active')
  const displayedPolls = pollView === 'active' ? activePolls : pollView === 'archived' ? archivedPolls : polls
  const unreadCount = messages.filter(m => !m.is_read && !m.is_archived).length
  const flaggedCount = messages.filter(m => m.is_flagged && !m.is_archived).length
  const totalMessages = messages.filter(m => !m.is_archived).length
  const needsResponseCount = messages.filter(m => !messageResponses[m.id] && !m.is_archived).length
  const readCount = messages.filter(m => m.is_read && !m.is_archived).length
  const starredCount = messages.filter(m => m.is_starred && !m.is_archived).length
  const archivedCount = messages.filter(m => m.is_archived).length
  const todayMessages = messages.filter(m => {
    const msgDate = new Date(m.created_at)
    const today = new Date()
    return msgDate.toDateString() === today.toDateString()
  }).length
  const thisWeekMessages = messages.filter(m => {
    const msgDate = new Date(m.created_at)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return msgDate >= weekAgo
  }).length
  const recentMessages = messages.filter(m => !m.is_archived).slice(0, 5)

  return (
    <div className="dashboard">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div className="header-left">
            <h1>GhostInbox</h1>
            {profile && (
              <span className="welcome-text">Welcome back, {profile.display_name || profile.handle}!</span>
            )}
          </div>
          <div className="header-right">
            <button
              onClick={() => {
                if (activeTab === 'messages') {
                  setActiveTab('overview')
                } else {
                  setActiveTab('messages')
                }
              }}
              className={`header-tab-btn ${activeTab === 'messages' ? 'active' : ''}`}
            >
              <span className="header-tab-icon">💬</span>
              <span className="header-tab-text">Messages</span>
              {unreadCount > 0 && <span className="header-badge">{unreadCount}</span>}
            </button>
            <button
              onClick={() => {
                if (activeTab === 'settings') {
                  setActiveTab('overview')
                } else {
                  setActiveTab('settings')
                }
              }}
              className={`header-settings-btn ${activeTab === 'settings' ? 'active' : ''}`}
              title="Settings"
            >
              <span className="header-settings-icon">⚙️</span>
            </button>
            <button onClick={handleLogout} className="btn btn-secondary">
              Logout
            </button>
          </div>
        </header>

        <div className="dashboard-content">
          {/* Tab Content */}
          {activeTab === 'settings' ? (
            /* Settings Tab - Full Page View */
            <div className="settings-view">
              <div className="settings-header">
                <h2>Settings</h2>
                <p className="settings-subtitle">Manage your account and preferences</p>
              </div>

              <div className="settings-layout">
                {/* Settings Navigation Bar */}
                <div className="settings-nav">
                  <button
                    className={`settings-nav-item ${activeSettingsSection === 'profile' ? 'active' : ''}`}
                    onClick={() => setActiveSettingsSection('profile')}
                  >
                    <span className="settings-nav-icon">👤</span>
                    <span className="settings-nav-label">Profile</span>
                  </button>
                  <button
                    className={`settings-nav-item ${activeSettingsSection === 'vent-links' ? 'active' : ''}`}
                    onClick={() => setActiveSettingsSection('vent-links')}
                  >
                    <span className="settings-nav-icon">🔗</span>
                    <span className="settings-nav-label">Vent Links</span>
                  </button>
                  <button
                    className={`settings-nav-item ${activeSettingsSection === 'account' ? 'active' : ''}`}
                    onClick={() => setActiveSettingsSection('account')}
                  >
                    <span className="settings-nav-icon">⚙️</span>
                    <span className="settings-nav-label">Account</span>
                  </button>
                  <button
                    className={`settings-nav-item ${activeSettingsSection === 'security' ? 'active' : ''}`}
                    onClick={() => setActiveSettingsSection('security')}
                  >
                    <span className="settings-nav-icon">🔒</span>
                    <span className="settings-nav-label">Privacy & Security</span>
                  </button>
                  <button
                    className={`settings-nav-item ${activeSettingsSection === 'notifications' ? 'active' : ''}`}
                    onClick={() => setActiveSettingsSection('notifications')}
                  >
                    <span className="settings-nav-icon">🔔</span>
                    <span className="settings-nav-label">Notifications</span>
                  </button>
                  <button
                    className={`settings-nav-item ${activeSettingsSection === 'preferences' ? 'active' : ''}`}
                    onClick={() => setActiveSettingsSection('preferences')}
                  >
                    <span className="settings-nav-icon">⚙️</span>
                    <span className="settings-nav-label">Preferences</span>
                  </button>
                  <button
                    className={`settings-nav-item ${activeSettingsSection === 'statistics' ? 'active' : ''}`}
                    onClick={() => setActiveSettingsSection('statistics')}
                  >
                    <span className="settings-nav-icon">📊</span>
                    <span className="settings-nav-label">Statistics</span>
                  </button>
                </div>

                {/* Settings Content */}
                <div className="settings-content">
                  {/* Profile Settings */}
                  {activeSettingsSection === 'profile' && (
                    <div className="settings-section">
                      <h3>Profile</h3>
                      <div className="settings-item">
                        <div className="settings-item-label">
                          <label>Display Name</label>
                          <span className="settings-hint">Your public display name (shown on your vent page)</span>
                        </div>
                        <div className="settings-item-value">
                          {editingDisplayName ? (
                        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                          <input
                            type="text"
                            className="input"
                            value={newDisplayName}
                            onChange={(e) => setNewDisplayName(e.target.value)}
                            placeholder={profile?.display_name || profile?.handle || 'Display name'}
                            style={{ flex: 1 }}
                            maxLength={50}
                          />
                          <button
                            onClick={updateDisplayName}
                            className="btn"
                            disabled={updatingProfile || !newDisplayName.trim()}
                          >
                            {updatingProfile ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingDisplayName(false)
                              setNewDisplayName('')
                            }}
                            className="btn btn-secondary"
                            disabled={updatingProfile}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span>{profile?.display_name || profile?.handle || 'Not set'}</span>
                          <button
                            onClick={() => {
                              setNewDisplayName(profile?.display_name || '')
                              setEditingDisplayName(true)
                            }}
                            className="btn btn-secondary btn-small"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                        </div>
                      </div>
                  <div className="settings-item">
                    <div className="settings-item-label">
                      <label>Handle</label>
                      <span className="settings-hint">Your unique identifier</span>
                    </div>
                    <div className="settings-item-value">
                      {editingHandle ? (
                        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                          <input
                            type="text"
                            className="input"
                            value={newHandle}
                            onChange={(e) => setNewHandle(e.target.value)}
                            placeholder="Enter handle (3-30 characters, lowercase, alphanumeric, _, -)"
                            disabled={updatingProfile}
                            autoFocus
                          />
                          <button
                            onClick={updateHandle}
                            className="btn btn-small"
                            disabled={updatingProfile || !newHandle.trim()}
                          >
                            {updatingProfile ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingHandle(false)
                              setNewHandle('')
                            }}
                            className="btn btn-secondary btn-small"
                            disabled={updatingProfile}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span>@{profile?.handle || 'Not set'}</span>
                          <button
                            onClick={() => {
                              setNewHandle(profile?.handle || '')
                              setEditingHandle(true)
                            }}
                            className="btn btn-secondary btn-small"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="settings-item">
                    <div className="settings-item-label">
                      <label>Email</label>
                      <span className="settings-hint">Your account email address</span>
                    </div>
                    <div className="settings-item-value">
                      {editingEmail ? (
                        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                          <input
                            type="email"
                            className="input"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            placeholder="Enter new email address"
                            disabled={updatingProfile}
                            autoFocus
                          />
                          <button
                            onClick={updateEmail}
                            className="btn btn-small"
                            disabled={updatingProfile || !newEmail.trim()}
                          >
                            {updatingProfile ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingEmail(false)
                              setNewEmail('')
                            }}
                            className="btn btn-secondary btn-small"
                            disabled={updatingProfile}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span>{userEmail || 'Loading...'}</span>
                          <button
                            onClick={() => {
                              setNewEmail(userEmail || '')
                              setEditingEmail(true)
                            }}
                            className="btn btn-secondary btn-small"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                    </div>
                  )}

                  {/* Vent Links Settings */}
                  {activeSettingsSection === 'vent-links' && ventLinks.length > 0 && (
                    <div className="settings-section">
                    <h3>Vent Links</h3>
                    {ventLinks.length > 1 && (
                      <div className="settings-item" style={{ marginBottom: '16px' }}>
                        <div className="settings-item-label">
                          <label>Select Vent Link</label>
                        </div>
                        <div className="settings-item-value">
                          <select
                            className="select"
                            value={selectedVentLinkId || ''}
                            onChange={(e) => setSelectedVentLinkId(e.target.value)}
                            style={{ width: '100%' }}
                          >
                            {ventLinks.map(link => (
                              <option key={link.id} value={link.id}>
                                {link.title || link.slug}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                    {primaryVentLink && (
                      <>
                    <div className="settings-item">
                      <div className="settings-item-label">
                        <label>Your Vent URL</label>
                        <span className="settings-hint">Share this link to receive anonymous messages</span>
                      </div>
                      <div className="settings-item-value">
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
                          <input
                            type="text"
                            readOnly
                            value={`${window.location.origin}/v/${primaryVentLink.slug}`}
                            className="input"
                            style={{ flex: 1, fontFamily: 'monospace', fontSize: '14px' }}
                            onClick={(e) => (e.target as HTMLInputElement).select()}
                          />
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/v/${primaryVentLink.slug}`)
                              alert('Link copied to clipboard!')
                            }}
                            className="btn btn-secondary"
                            title="Copy link"
                          >
                            📋 Copy
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Page Customization */}
                    <div className="vent-customization-section" style={{ marginTop: '32px', paddingTop: '32px', borderTop: '1px solid var(--border)' }}>
                      <div className="customization-header">
                        <div>
                          <h3 style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '22px', fontWeight: '700' }}>
                            <span style={{ fontSize: '28px' }}>🎨</span>
                            Customize Your Vent Page
                          </h3>
                          <p className="settings-subtitle" style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
                            Personalize your vent page with custom branding, colors, and links
                          </p>
                        </div>
                      </div>

                      {/* Live Preview with Iframe */}
                      <div className="customization-preview-card">
                        <div className="preview-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>Live Preview</h4>
                            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>See how your vent page looks in real-time</p>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => {
                                const iframe = document.getElementById('vent-preview-iframe') as HTMLIFrameElement
                                if (iframe) {
                                  iframe.src = iframe.src
                                }
                              }}
                              className="btn btn-secondary btn-small"
                              style={{ fontSize: '12px', padding: '6px 12px' }}
                              title="Refresh preview"
                            >
                              🔄
                            </button>
                            <a
                              href={`/v/${primaryVentLink.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-secondary btn-small"
                              style={{ fontSize: '12px', padding: '6px 12px', textDecoration: 'none' }}
                              title="Open in new tab"
                            >
                              👁️
                            </a>
                          </div>
                        </div>
                        <div className="preview-iframe-container">
                          <iframe
                            id="vent-preview-iframe"
                            src={`${window.location.origin}/v/${primaryVentLink.slug}`}
                            className="preview-iframe"
                            title="Vent page preview"
                            style={{
                              width: '100%',
                              height: '600px',
                              border: '1px solid var(--border)',
                              borderRadius: '12px',
                              background: 'var(--bg-primary)'
                            }}
                          />
                        </div>
                      </div>

                      {/* Branding Section */}
                      <div className="customization-group-modern">
                        <div className="group-header-modern">
                          <div className="group-icon-wrapper">
                            <span className="group-icon-modern">🖼️</span>
                          </div>
                          <div>
                            <h4 className="group-title-modern">Branding</h4>
                            <p className="group-subtitle">Customize your logo, title, and description</p>
                          </div>
                        </div>
                        <div className="group-content-modern">
                          {/* Logo Upload */}
                          <div className="customization-field-modern">
                            <label className="field-label-modern">
                              Logo
                            </label>
                            <p className="field-description">Upload your logo or paste an image URL</p>
                            
                            <div className="logo-upload-section">
                              {/* Logo Preview Area */}
                              <div className="logo-preview-area">
                                {primaryVentLink.logo_url ? (
                                  <div className="logo-preview-large">
                                    <img 
                                      src={primaryVentLink.logo_url} 
                                      alt="Logo preview" 
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none'
                                        const parent = (e.target as HTMLElement).parentElement
                                        if (parent) {
                                          parent.innerHTML = '<div style="color: var(--danger); padding: 20px; text-align: center;">⚠️ Failed to load image</div>'
                                        }
                                      }}
                                    />
                                    <button
                                      onClick={() => {
                                        const updated = ventLinks.map(l => 
                                          l.id === primaryVentLink.id 
                                            ? { ...l, logo_url: null }
                                            : l
                                        )
                                        setVentLinks(updated)
                                      }}
                                      className="logo-remove-btn"
                                      title="Remove logo"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <div className="logo-placeholder">
                                    <span className="placeholder-icon">🖼️</span>
                                    <span className="placeholder-text">No logo yet</span>
                                  </div>
                                )}
                              </div>

                              {/* Upload Options */}
                              <div className="logo-upload-options">
                                <label className="file-upload-button-modern">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0]
                                      if (!file) return

                                      if (file.size > 5 * 1024 * 1024) {
                                        alert('File size must be less than 5MB')
                                        return
                                      }

                                      if (!file.type.startsWith('image/')) {
                                        alert('Please select an image file')
                                        return
                                      }

                                      setUploadingLogo(true)
                                      try {
                                        if (!profile) {
                                          alert('You must be logged in to upload files')
                                          return
                                        }

                                        const fileExt = file.name.split('.').pop()
                                        const fileName = `${profile.id}/${Date.now()}.${fileExt}`
                                        
                                        const { data: uploadData, error: uploadError } = await supabase.storage
                                          .from('logos')
                                          .upload(fileName, file, {
                                            cacheControl: '3600',
                                            upsert: false
                                          })

                                        if (uploadError) {
                                          console.error('Upload error:', uploadError)
                                          if (uploadError.message?.includes('Bucket') || uploadError.message?.includes('not found')) {
                                            alert('Storage bucket not configured. Please run the setup_storage_logos.sql script in Supabase, or use a URL instead.')
                                          } else {
                                            alert('Upload failed: ' + uploadError.message + '\n\nYou can still use a logo URL instead.')
                                          }
                                          setUploadingLogo(false)
                                          return
                                        }

                                        const { data: urlData } = supabase.storage
                                          .from('logos')
                                          .getPublicUrl(fileName)

                                        const logoUrl = urlData.publicUrl
                                        const updated = ventLinks.map(l => 
                                          l.id === primaryVentLink.id 
                                            ? { ...l, logo_url: logoUrl }
                                            : l
                                        )
                                        setVentLinks(updated)
                                      } catch (err: any) {
                                        console.error('Error uploading logo:', err)
                                        alert('Error uploading logo: ' + (err.message || 'Unknown error'))
                                      } finally {
                                        setUploadingLogo(false)
                                      }
                                    }}
                                    disabled={uploadingLogo}
                                  />
                                  <span className="upload-icon">📤</span>
                                  <span>{uploadingLogo ? 'Uploading...' : 'Upload from Computer'}</span>
                                </label>

                                <div className="divider-text">
                                  <span>or</span>
                                </div>

                                <input
                                  type="url"
                                  className="input-modern"
                                  value={primaryVentLink.logo_url || ''}
                                  onChange={(e) => {
                                    const updated = ventLinks.map(l => 
                                      l.id === primaryVentLink.id 
                                        ? { ...l, logo_url: e.target.value }
                                        : l
                                    )
                                    setVentLinks(updated)
                                  }}
                                  placeholder="Paste image URL here..."
                                />
                              </div>
                            </div>
                          </div>

                          {/* Header Text */}
                          <div className="customization-field-modern">
                            <label className="field-label-modern">
                              Header Text
                            </label>
                            <p className="field-description">Main title displayed at the top of your vent page</p>
                            <input
                              type="text"
                              className="input-modern"
                              value={primaryVentLink.header_text || ''}
                              onChange={(e) => {
                                const updated = ventLinks.map(l => 
                                  l.id === primaryVentLink.id 
                                    ? { ...l, header_text: e.target.value }
                                    : l
                                )
                                setVentLinks(updated)
                              }}
                              placeholder="Talk to me anonymously..."
                              maxLength={100}
                            />
                            <div className="char-count-small">{primaryVentLink.header_text?.length || 0} / 100</div>
                          </div>

                          {/* Description */}
                          <div className="customization-field-modern">
                            <label className="field-label-modern">
                              Description
                            </label>
                            <p className="field-description">Brief description that appears below the header</p>
                            <textarea
                              className="textarea-modern"
                              value={primaryVentLink.description || ''}
                              onChange={(e) => {
                                const updated = ventLinks.map(l => 
                                  l.id === primaryVentLink.id 
                                    ? { ...l, description: e.target.value }
                                    : l
                                )
                                setVentLinks(updated)
                              }}
                              placeholder="Tell visitors what your vent page is about..."
                              rows={4}
                              maxLength={500}
                            />
                            <div className="char-count-small">{primaryVentLink.description?.length || 0} / 500</div>
                          </div>
                        </div>
                      </div>

                      {/* Colors Section */}
                      <div className="customization-group-modern">
                        <div className="group-header-modern">
                          <div className="group-icon-wrapper">
                            <span className="group-icon-modern">🎨</span>
                          </div>
                          <div>
                            <h4 className="group-title-modern">Colors & Background</h4>
                            <p className="group-subtitle">Choose your color scheme and background</p>
                          </div>
                        </div>
                        <div className="group-content-modern">
                          <div className="colors-grid">
                            {/* Background Color */}
                            <div className="color-field-modern">
                              <label className="field-label-modern">Background Color</label>
                              <p className="field-description">Main background color for your vent page</p>
                              <div className="color-input-wrapper">
                                <input
                                  type="color"
                                  value={primaryVentLink.background_color || '#0a0a0a'}
                                  onChange={(e) => {
                                    const updated = ventLinks.map(l => 
                                      l.id === primaryVentLink.id 
                                        ? { ...l, background_color: e.target.value }
                                        : l
                                    )
                                    setVentLinks(updated)
                                  }}
                                  className="color-picker-modern"
                                />
                                <input
                                  type="text"
                                  className="input-modern"
                                  value={primaryVentLink.background_color || ''}
                                  onChange={(e) => {
                                    const updated = ventLinks.map(l => 
                                      l.id === primaryVentLink.id 
                                        ? { ...l, background_color: e.target.value }
                                        : l
                                    )
                                    setVentLinks(updated)
                                  }}
                                  placeholder="#0a0a0a"
                                />
                              </div>
                              <div className="color-presets-modern">
                                <span className="presets-label">Quick picks:</span>
                                {['#0a0a0a', '#1a1a1a', '#2d1b4e', '#1e3a5f', '#1a2e1a'].map((color) => (
                                  <button
                                    key={color}
                                    type="button"
                                    className={`color-preset-modern ${primaryVentLink.background_color === color ? 'active' : ''}`}
                                    style={{ background: color }}
                                    onClick={() => {
                                      const updated = ventLinks.map(l => 
                                        l.id === primaryVentLink.id 
                                          ? { ...l, background_color: color }
                                          : l
                                      )
                                      setVentLinks(updated)
                                    }}
                                    title={color}
                                  />
                                ))}
                              </div>
                            </div>

                            {/* Accent Color */}
                            <div className="color-field-modern">
                              <label className="field-label-modern">Accent Color</label>
                              <p className="field-description">Color for buttons and highlights</p>
                              <div className="color-input-wrapper">
                                <input
                                  type="color"
                                  value={primaryVentLink.accent_color || '#8b5cf6'}
                                  onChange={(e) => {
                                    const updated = ventLinks.map(l => 
                                      l.id === primaryVentLink.id 
                                        ? { ...l, accent_color: e.target.value }
                                        : l
                                    )
                                    setVentLinks(updated)
                                  }}
                                  className="color-picker-modern"
                                />
                                <input
                                  type="text"
                                  className="input-modern"
                                  value={primaryVentLink.accent_color || ''}
                                  onChange={(e) => {
                                    const updated = ventLinks.map(l => 
                                      l.id === primaryVentLink.id 
                                        ? { ...l, accent_color: e.target.value }
                                        : l
                                    )
                                    setVentLinks(updated)
                                  }}
                                  placeholder="#8b5cf6"
                                />
                              </div>
                              <div className="color-presets-modern">
                                <span className="presets-label">Quick picks:</span>
                                {['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'].map((color) => (
                                  <button
                                    key={color}
                                    type="button"
                                    className={`color-preset-modern ${primaryVentLink.accent_color === color ? 'active' : ''}`}
                                    style={{ background: color }}
                                    onClick={() => {
                                      const updated = ventLinks.map(l => 
                                        l.id === primaryVentLink.id 
                                          ? { ...l, accent_color: color }
                                          : l
                                      )
                                      setVentLinks(updated)
                                    }}
                                    title={color}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Background Image */}
                          <div className="customization-field-modern">
                            <label className="field-label-modern">
                              Background Image
                            </label>
                            <p className="field-description">Optional: Add a background image (overlays on background color)</p>
                            <input
                              type="url"
                              className="input-modern"
                              value={primaryVentLink.background_image_url || ''}
                              onChange={(e) => {
                                const updated = ventLinks.map(l => 
                                  l.id === primaryVentLink.id 
                                    ? { ...l, background_image_url: e.target.value }
                                    : l
                                )
                                setVentLinks(updated)
                              }}
                              placeholder="https://example.com/background.jpg"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Custom Links Section */}
                      <div className="customization-group-modern">
                        <div className="group-header-modern">
                          <div className="group-icon-wrapper">
                            <span className="group-icon-modern">🔗</span>
                          </div>
                          <div>
                            <h4 className="group-title-modern">Custom Links</h4>
                            <p className="group-subtitle">Add links to your social media, website, or other pages</p>
                          </div>
                        </div>
                        <div className="group-content-modern">
                          <p className="field-description" style={{ marginBottom: '20px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '13px' }}>
                            💡 These links will appear as clickable buttons on your vent page, below your header
                          </p>
                          <div className="custom-links-list">
                            {(primaryVentLink.custom_links || []).map((link, index) => (
                              <div key={index} className="custom-link-item">
                                <div className="link-icon-input">
                                  <input
                                    type="text"
                                    className="input"
                                    value={link.icon || ''}
                                    onChange={(e) => {
                                      const updatedLinks = [...(primaryVentLink.custom_links || [])]
                                      updatedLinks[index] = { ...link, icon: e.target.value }
                                      const updated = ventLinks.map(l => 
                                        l.id === primaryVentLink.id 
                                          ? { ...l, custom_links: updatedLinks }
                                          : l
                                      )
                                      setVentLinks(updated)
                                    }}
                                    placeholder="🔗"
                                    maxLength={2}
                                    style={{ textAlign: 'center', fontSize: '18px' }}
                                  />
                                  <span className="link-input-hint">Icon</span>
                                </div>
                                <div className="link-label-input">
                                  <input
                                    type="text"
                                    className="input"
                                    value={link.label}
                                    onChange={(e) => {
                                      const updatedLinks = [...(primaryVentLink.custom_links || [])]
                                      updatedLinks[index] = { ...link, label: e.target.value }
                                      const updated = ventLinks.map(l => 
                                        l.id === primaryVentLink.id 
                                          ? { ...l, custom_links: updatedLinks }
                                          : l
                                      )
                                      setVentLinks(updated)
                                    }}
                                    placeholder="Link Label (e.g., Twitter)"
                                  />
                                  <span className="link-input-hint">Label</span>
                                </div>
                                <div className="link-url-input">
                                  <input
                                    type="url"
                                    className="input"
                                    value={link.url}
                                    onChange={(e) => {
                                      const updatedLinks = [...(primaryVentLink.custom_links || [])]
                                      updatedLinks[index] = { ...link, url: e.target.value }
                                      const updated = ventLinks.map(l => 
                                        l.id === primaryVentLink.id 
                                          ? { ...l, custom_links: updatedLinks }
                                          : l
                                      )
                                      setVentLinks(updated)
                                    }}
                                    placeholder="https://..."
                                  />
                                  <span className="link-input-hint">URL</span>
                                </div>
                                <button
                                  onClick={() => {
                                    const updatedLinks = (primaryVentLink.custom_links || []).filter((_, i) => i !== index)
                                    const updated = ventLinks.map(l => 
                                      l.id === primaryVentLink.id 
                                        ? { ...l, custom_links: updatedLinks }
                                        : l
                                    )
                                    setVentLinks(updated)
                                  }}
                                  className="link-delete-btn"
                                  title="Remove link"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => {
                                const updatedLinks = [...(primaryVentLink.custom_links || []), { label: '', url: '', icon: '🔗' }]
                                const updated = ventLinks.map(l => 
                                  l.id === primaryVentLink.id 
                                    ? { ...l, custom_links: updatedLinks }
                                    : l
                                )
                                setVentLinks(updated)
                              }}
                              className="btn btn-secondary"
                              style={{ width: '100%', marginTop: '8px' }}
                            >
                              ➕ Add New Link
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Save Button */}
                      <div className="customization-save-section">
                        <button
                          onClick={async (e) => {
                            try {
                              const { error } = await supabase
                                .from('vent_links')
                                .update({
                                  logo_url: primaryVentLink.logo_url || null,
                                  header_text: primaryVentLink.header_text || null,
                                  description: primaryVentLink.description || null,
                                  background_color: primaryVentLink.background_color || null,
                                  background_image_url: primaryVentLink.background_image_url || null,
                                  accent_color: primaryVentLink.accent_color || null,
                                  custom_links: primaryVentLink.custom_links || null,
                                })
                                .eq('id', primaryVentLink.id)

                              if (error) throw error
                              
                              // Show success feedback
                              const btn = e.target as HTMLButtonElement
                              const originalText = btn.innerHTML
                              btn.innerHTML = '✅ Saved!'
                              btn.style.background = 'var(--success)'
                              
                              // Refresh the preview iframe after a short delay
                              setTimeout(() => {
                                const iframe = document.getElementById('vent-preview-iframe') as HTMLIFrameElement
                                if (iframe) {
                                  iframe.src = iframe.src
                                }
                              }, 500)
                              
                              setTimeout(() => {
                                btn.innerHTML = originalText
                                btn.style.background = ''
                              }, 2000)
                            } catch (err: any) {
                              alert('Error saving customization: ' + (err.message || 'Unknown error'))
                            }
                          }}
                          className="btn btn-primary"
                          style={{ width: '100%', fontSize: '16px', padding: '14px', fontWeight: '600' }}
                        >
                          💾 Save Customization
                        </button>
                      </div>
                    </div>
                    </>
                    )}
                    </div>
                  )}

                  {/* Account Settings */}
                  {activeSettingsSection === 'account' && (
                    <div className="settings-section">
                      <h3>⚙️ Account Settings</h3>
                      <p className="settings-subtitle" style={{ marginTop: '-16px', marginBottom: '24px' }}>
                        Manage your account credentials and preferences
                      </p>

                      {/* Account Information */}
                      <div className="customization-group">
                        <div className="group-header">
                          <span className="group-icon">ℹ️</span>
                          <span className="group-title">Account Information</span>
                        </div>
                        <div className="group-content">
                          <div className="settings-item">
                            <div className="settings-item-label">
                              <label>Account ID</label>
                              <span className="settings-hint">Your unique account identifier</span>
                            </div>
                            <div className="settings-item-value">
                              <code style={{ 
                                padding: '6px 12px', 
                                background: 'var(--bg-secondary)', 
                                borderRadius: '4px',
                                fontSize: '12px',
                                color: 'var(--text-secondary)',
                                fontFamily: 'monospace'
                              }}>
                                {profile?.id || 'N/A'}
                              </code>
                            </div>
                          </div>
                          <div className="settings-item">
                            <div className="settings-item-label">
                              <label>Member Since</label>
                              <span className="settings-hint">When you joined GhostInbox</span>
                            </div>
                            <div className="settings-item-value">
                              <span>{profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              }) : 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Security */}
                      <div className="customization-group">
                        <div className="group-header">
                          <span className="group-icon">🔐</span>
                          <span className="group-title">Security</span>
                        </div>
                        <div className="group-content">
                          <div className="settings-item">
                            <div className="settings-item-label">
                              <label>Change Password</label>
                              <span className="settings-hint">We'll send you an email to reset your password</span>
                            </div>
                            <div className="settings-item-value">
                              <button
                                className="btn btn-secondary"
                                onClick={async () => {
                                  const { data: { user } } = await supabase.auth.getUser()
                                  if (!user?.email) {
                                    alert('Unable to get your email address')
                                    return
                                  }
                                  
                                  // Send password reset email
                                  const { error } = await supabase.auth.resetPasswordForEmail(
                                    user.email,
                                    { redirectTo: `${window.location.origin}/reset-password` }
                                  )
                                  
                                  if (error) {
                                    alert('Error sending reset email: ' + error.message)
                                  } else {
                                    alert('Password reset email sent! Check your inbox.')
                                  }
                                }}
                              >
                                🔑 Send Reset Email
                              </button>
                            </div>
                          </div>
                          <div className="settings-item">
                            <div className="settings-item-label">
                              <label>Two-Factor Authentication</label>
                              <span className="settings-hint">Add an extra layer of security to your account (Coming soon)</span>
                            </div>
                            <div className="settings-item-value">
                              <button className="btn btn-secondary" disabled>
                                Enable 2FA (Soon)
                              </button>
                            </div>
                          </div>
                          <div className="settings-item">
                            <div className="settings-item-label">
                              <label>Active Sessions</label>
                              <span className="settings-hint">View and manage your active login sessions</span>
                            </div>
                            <div className="settings-item-value">
                              <button className="btn btn-secondary" disabled>
                                View Sessions (Soon)
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Account Actions */}
                      <div className="customization-group">
                        <div className="group-header">
                          <span className="group-icon">🔄</span>
                          <span className="group-title">Account Actions</span>
                        </div>
                        <div className="group-content">
                          <div className="settings-item">
                            <div className="settings-item-label">
                              <label>Refresh Data</label>
                              <span className="settings-hint">Reload all data from the server</span>
                            </div>
                            <div className="settings-item-value">
                              <button
                                className="btn btn-secondary"
                                onClick={async () => {
                                  setLoading(true)
                                  await fetchData()
                                  alert('Data refreshed!')
                                }}
                              >
                                🔄 Refresh
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Privacy & Security */}
                  {activeSettingsSection === 'security' && (
                    <div className="settings-section">
                      <h3>🔒 Privacy & Security</h3>
                      <p className="settings-subtitle" style={{ marginTop: '-16px', marginBottom: '24px' }}>
                        Manage your privacy settings and data security
                      </p>

                      {/* Privacy Settings */}
                      <div className="customization-group">
                        <div className="group-header">
                          <span className="group-icon">🔐</span>
                          <span className="group-title">Privacy</span>
                        </div>
                        <div className="group-content">
                          <div className="settings-item">
                            <div className="settings-item-label">
                              <label>Show Email in Profile</label>
                              <span className="settings-hint">Allow others to see your email address</span>
                            </div>
                            <div className="settings-item-value">
                              <label className="toggle-switch">
                                <input
                                  type="checkbox"
                                  checked={showEmailInProfile}
                                  onChange={(e) => {
                                    setShowEmailInProfile(e.target.checked)
                                    localStorage.setItem('settings_show_email_in_profile', String(e.target.checked))
                                  }}
                                />
                                <span className="toggle-slider"></span>
                              </label>
                            </div>
                          </div>
                          <div className="settings-item">
                            <div className="settings-item-label">
                              <label>Profile Visibility</label>
                              <span className="settings-hint">Who can view your profile information</span>
                            </div>
                            <div className="settings-item-value">
                              <select
                                className="select"
                                style={{ minWidth: '200px' }}
                                value={profileVisibility}
                                onChange={(e) => {
                                  setProfileVisibility(e.target.value)
                                  localStorage.setItem('settings_profile_visibility', e.target.value)
                                }}
                              >
                                <option value="public">Public</option>
                                <option value="private">Private</option>
                                <option value="unlisted">Unlisted</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Data Management */}
                      <div className="customization-group">
                        <div className="group-header">
                          <span className="group-icon">💾</span>
                          <span className="group-title">Data Management</span>
                        </div>
                        <div className="group-content">
                          <div className="settings-item">
                            <div className="settings-item-label">
                              <label>Data Export</label>
                              <span className="settings-hint">Download a complete copy of your data in JSON format</span>
                            </div>
                            <div className="settings-item-value">
                              <button
                                className="btn btn-secondary"
                                onClick={async () => {
                                  try {
                                    // Export user data
                                    const exportData = {
                                      profile: profile,
                                      ventLinks: ventLinks,
                                      messages: messages.length,
                                      polls: polls.length,
                                      exportDate: new Date().toISOString()
                                    }
                                    const dataStr = JSON.stringify(exportData, null, 2)
                                    const dataBlob = new Blob([dataStr], { type: 'application/json' })
                                    const url = URL.createObjectURL(dataBlob)
                                    const link = document.createElement('a')
                                    link.href = url
                                    link.download = `ghostinbox-export-${new Date().toISOString().split('T')[0]}.json`
                                    link.click()
                                    URL.revokeObjectURL(url)
                                    alert('Data export downloaded!')
                                  } catch (err: any) {
                                    alert('Error exporting data: ' + (err.message || 'Unknown error'))
                                  }
                                }}
                              >
                                📥 Export Data
                              </button>
                            </div>
                          </div>
                          <div className="settings-item">
                            <div className="settings-item-label">
                              <label>Auto-Delete Old Messages</label>
                              <span className="settings-hint">Automatically delete messages older than specified days</span>
                            </div>
                            <div className="settings-item-value">
                              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <label className="toggle-switch">
                                  <input
                                    type="checkbox"
                                    checked={autoDeleteMessages}
                                    onChange={(e) => {
                                      setAutoDeleteMessages(e.target.checked)
                                      localStorage.setItem('settings_auto_delete_messages', String(e.target.checked))
                                    }}
                                  />
                                  <span className="toggle-slider"></span>
                                </label>
                                <select
                                  className="select"
                                  style={{ width: '120px' }}
                                  value={autoDeleteDays}
                                  onChange={(e) => {
                                    setAutoDeleteDays(e.target.value)
                                    localStorage.setItem('settings_auto_delete_days', e.target.value)
                                  }}
                                  disabled={!autoDeleteMessages}
                                >
                                  <option value="30">30 days</option>
                                  <option value="60">60 days</option>
                                  <option value="90">90 days</option>
                                  <option value="365">1 year</option>
                                </select>
                              </div>
                            </div>
                          </div>
                          <div className="settings-item">
                            <div className="settings-item-label">
                              <label>Clear Cache</label>
                              <span className="settings-hint">Clear all cached data and refresh</span>
                            </div>
                            <div className="settings-item-value">
                              <button
                                className="btn btn-secondary"
                                onClick={() => {
                                  if (confirm('Clear all cached data? This will refresh the page.')) {
                                    localStorage.clear()
                                    window.location.reload()
                                  }
                                }}
                              >
                                🗑️ Clear Cache
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Danger Zone */}
                      <div style={{ marginTop: '32px', paddingTop: '32px', borderTop: '2px solid var(--danger)', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', padding: '24px' }}>
                        <h3 style={{ color: 'var(--danger)', marginTop: 0 }}>⚠️ Danger Zone</h3>
                        <div className="settings-item">
                          <div className="settings-item-label">
                            <label style={{ color: 'var(--danger)', fontWeight: '600' }}>Delete Account</label>
                            <span className="settings-hint">Permanently delete your account and all associated data. This action cannot be undone.</span>
                          </div>
                          <div className="settings-item-value">
                            <button
                              onClick={handleDeleteAccount}
                              disabled={deletingAccount}
                              className="btn btn-danger"
                              style={{ minWidth: '150px' }}
                            >
                              {deletingAccount ? 'Deleting...' : 'Delete Account'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notifications Settings */}
                  {activeSettingsSection === 'notifications' && (
                    <div className="settings-section">
                      <h3>🔔 Notification Settings</h3>
                      <p className="settings-subtitle" style={{ marginTop: '-16px', marginBottom: '24px' }}>
                        Control how and when you receive notifications
                      </p>

                      {/* Email Notifications */}
                      <div className="settings-item">
                        <div className="settings-item-label">
                          <label>Email Notifications</label>
                          <span className="settings-hint">Receive email alerts for new messages and important updates</span>
                        </div>
                        <div className="settings-item-value">
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={emailNotifications}
                              onChange={(e) => {
                                setEmailNotifications(e.target.checked)
                                localStorage.setItem('settings_email_notifications', String(e.target.checked))
                              }}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                        </div>
                      </div>

                      {/* Browser Notifications */}
                      <div className="settings-item">
                        <div className="settings-item-label">
                          <label>Browser Notifications</label>
                          <span className="settings-hint">Enable desktop notifications when new messages arrive (requires permission)</span>
                        </div>
                        <div className="settings-item-value">
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={browserNotifications}
                              onChange={async (e) => {
                                if (e.target.checked) {
                                  const permission = await Notification.requestPermission()
                                  if (permission === 'granted') {
                                    setBrowserNotifications(true)
                                    localStorage.setItem('settings_browser_notifications', 'true')
                                  } else {
                                    alert('Browser notifications are blocked. Please enable them in your browser settings.')
                                    e.target.checked = false
                                  }
                                } else {
                                  setBrowserNotifications(false)
                                  localStorage.setItem('settings_browser_notifications', 'false')
                                }
                              }}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                        </div>
                      </div>

                      {/* Daily Digest */}
                      <div className="settings-item">
                        <div className="settings-item-label">
                          <label>Daily Digest Email</label>
                          <span className="settings-hint">Receive a daily summary email with unread message counts and activity</span>
                        </div>
                        <div className="settings-item-value">
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={dailyDigest}
                              onChange={(e) => {
                                setDailyDigest(e.target.checked)
                                localStorage.setItem('settings_daily_digest', String(e.target.checked))
                              }}
                              disabled={!emailNotifications}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                        </div>
                      </div>

                      {/* Notification Preferences */}
                      <div className="settings-item">
                        <div className="settings-item-label">
                          <label>Notification Frequency</label>
                          <span className="settings-hint">How often you want to be notified about new messages</span>
                        </div>
                        <div className="settings-item-value">
                          <select
                            className="select"
                            value={notificationFrequency}
                            onChange={(e) => {
                              setNotificationFrequency(e.target.value)
                              localStorage.setItem('settings_notification_frequency', e.target.value)
                            }}
                            style={{ minWidth: '200px' }}
                          >
                            <option value="realtime">Real-time (immediate)</option>
                            <option value="hourly">Hourly digest</option>
                            <option value="daily">Daily digest</option>
                            <option value="weekly">Weekly summary</option>
                          </select>
                        </div>
                      </div>

                      {/* Quiet Hours */}
                      <div className="settings-item">
                        <div className="settings-item-label">
                          <label>Quiet Hours</label>
                          <span className="settings-hint">Disable notifications during specific hours</span>
                        </div>
                        <div className="settings-item-value">
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={quietHoursEnabled}
                                onChange={(e) => {
                                  setQuietHoursEnabled(e.target.checked)
                                  localStorage.setItem('settings_quiet_hours_enabled', String(e.target.checked))
                                }}
                              />
                              <span className="toggle-slider"></span>
                            </label>
                            <select
                              className="select"
                              style={{ width: '100px' }}
                              value={quietHoursStart}
                              onChange={(e) => {
                                setQuietHoursStart(e.target.value)
                                localStorage.setItem('settings_quiet_hours_start', e.target.value)
                              }}
                              disabled={!quietHoursEnabled}
                            >
                              <option value="10:00 PM">10:00 PM</option>
                              <option value="11:00 PM">11:00 PM</option>
                              <option value="12:00 AM">12:00 AM</option>
                            </select>
                            <span>to</span>
                            <select
                              className="select"
                              style={{ width: '100px' }}
                              value={quietHoursEnd}
                              onChange={(e) => {
                                setQuietHoursEnd(e.target.value)
                                localStorage.setItem('settings_quiet_hours_end', e.target.value)
                              }}
                              disabled={!quietHoursEnabled}
                            >
                              <option value="6:00 AM">6:00 AM</option>
                              <option value="7:00 AM">7:00 AM</option>
                              <option value="8:00 AM">8:00 AM</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Preferences Settings */}
                  {activeSettingsSection === 'preferences' && (
                    <div className="settings-section">
                      <h3>⚙️ App Preferences</h3>
                      <p className="settings-subtitle" style={{ marginTop: '-16px', marginBottom: '24px' }}>
                        Customize your app experience and default behaviors
                      </p>

                      {/* Default Message View */}
                      <div className="settings-item">
                        <div className="settings-item-label">
                          <label>Default Message View</label>
                          <span className="settings-hint">Choose how messages are displayed by default</span>
                        </div>
                        <div className="settings-item-value">
                          <select
                            className="select"
                            value={defaultMessageView}
                            onChange={(e) => {
                              setDefaultMessageView(e.target.value)
                              localStorage.setItem('settings_default_message_view', e.target.value)
                            }}
                            style={{ minWidth: '150px' }}
                          >
                            <option value="card">Card View</option>
                            <option value="list">List View</option>
                            <option value="compact">Compact View</option>
                          </select>
                        </div>
                      </div>

                      {/* Auto Mark as Read */}
                      <div className="settings-item">
                        <div className="settings-item-label">
                          <label>Auto Mark as Read</label>
                          <span className="settings-hint">Automatically mark messages as read when opened</span>
                        </div>
                        <div className="settings-item-value">
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={autoMarkRead}
                              onChange={(e) => {
                                setAutoMarkRead(e.target.checked)
                                localStorage.setItem('settings_auto_mark_read', String(e.target.checked))
                              }}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                        </div>
                      </div>

                      {/* Default Sort Order */}
                      <div className="settings-item">
                        <div className="settings-item-label">
                          <label>Default Sort Order</label>
                          <span className="settings-hint">How messages should be sorted by default</span>
                        </div>
                        <div className="settings-item-value">
                          <select
                            className="select"
                            value={messageSort}
                            onChange={(e) => {
                              setMessageSort(e.target.value as 'newest' | 'oldest')
                              localStorage.setItem('settings_default_sort', e.target.value)
                            }}
                            style={{ minWidth: '150px' }}
                          >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                          </select>
                        </div>
                      </div>

                      {/* Default Filter */}
                      <div className="settings-item">
                        <div className="settings-item-label">
                          <label>Default Message Filter</label>
                          <span className="settings-hint">Which messages to show by default</span>
                        </div>
                        <div className="settings-item-value">
                          <select
                            className="select"
                            value={messageFilter}
                            onChange={(e) => {
                              setMessageFilter(e.target.value as any)
                              localStorage.setItem('settings_default_filter', e.target.value)
                            }}
                            style={{ minWidth: '150px' }}
                          >
                            <option value="all">All Messages</option>
                            <option value="unread">Unread Only</option>
                            <option value="read">Read Only</option>
                            <option value="flagged">Flagged</option>
                            <option value="starred">Starred</option>
                          </select>
                        </div>
                      </div>

                      {/* Timezone */}
                      <div className="settings-item">
                        <div className="settings-item-label">
                          <label>Timezone</label>
                          <span className="settings-hint">Your timezone for accurate timestamps</span>
                        </div>
                        <div className="settings-item-value">
                          <select
                            className="select"
                            value={timezone}
                            onChange={(e) => {
                              setTimezone(e.target.value)
                              localStorage.setItem('settings_timezone', e.target.value)
                            }}
                            style={{ minWidth: '250px' }}
                          >
                            <option value="America/New_York">Eastern Time (ET)</option>
                            <option value="America/Chicago">Central Time (CT)</option>
                            <option value="America/Denver">Mountain Time (MT)</option>
                            <option value="America/Los_Angeles">Pacific Time (PT)</option>
                            <option value="Europe/London">London (GMT)</option>
                            <option value="Europe/Paris">Paris (CET)</option>
                            <option value="Asia/Tokyo">Tokyo (JST)</option>
                            <option value="Asia/Shanghai">Shanghai (CST)</option>
                            <option value="Australia/Sydney">Sydney (AEDT)</option>
                            <option value={Intl.DateTimeFormat().resolvedOptions().timeZone}>
                              Auto-detect ({Intl.DateTimeFormat().resolvedOptions().timeZone})
                            </option>
                          </select>
                        </div>
                      </div>

                      {/* Messages per Page */}
                      <div className="settings-item">
                        <div className="settings-item-label">
                          <label>Messages Per Page</label>
                          <span className="settings-hint">Number of messages to show per page</span>
                        </div>
                        <div className="settings-item-value">
                          <select
                            className="select"
                            value={messagesPerPage}
                            onChange={(e) => {
                              setMessagesPerPage(e.target.value)
                              localStorage.setItem('settings_messages_per_page', e.target.value)
                            }}
                            style={{ minWidth: '100px' }}
                          >
                            <option value="10">10</option>
                            <option value="20">20</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                          </select>
                        </div>
                      </div>

                      {/* Show Character Count */}
                      <div className="settings-item">
                        <div className="settings-item-label">
                          <label>Show Character Count</label>
                          <span className="settings-hint">Display character count in message inputs</span>
                        </div>
                        <div className="settings-item-value">
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={showCharacterCount}
                              onChange={(e) => {
                                setShowCharacterCount(e.target.checked)
                                localStorage.setItem('settings_show_character_count', String(e.target.checked))
                              }}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                        </div>
                      </div>

                      {/* Compact Mode */}
                      <div className="settings-item">
                        <div className="settings-item-label">
                          <label>Compact Mode</label>
                          <span className="settings-hint">Use a more compact layout to show more content</span>
                        </div>
                        <div className="settings-item-value">
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={compactMode}
                              onChange={(e) => {
                                setCompactMode(e.target.checked)
                                localStorage.setItem('settings_compact_mode', String(e.target.checked))
                              }}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Statistics */}
                  {activeSettingsSection === 'statistics' && (
                    <div className="settings-section">
                      <h3>📊 Statistics & Analytics</h3>
                      <p className="settings-subtitle" style={{ marginTop: '-16px', marginBottom: '32px' }}>
                        Overview of your account activity and engagement
                      </p>

                      {/* Message Statistics */}
                      <div className="statistics-section-modern">
                        <div className="stats-section-header">
                          <div className="stats-section-icon">💬</div>
                          <div>
                            <h4 className="stats-section-title">Messages</h4>
                            <p className="stats-section-subtitle">Your message activity overview</p>
                          </div>
                        </div>
                        <div className="stats-grid-enhanced">
                          <div className="stat-card-enhanced primary">
                            <div className="stat-card-icon">📨</div>
                            <div className="stat-card-content">
                              <div className="stat-value-enhanced">{totalMessages}</div>
                              <div className="stat-label-enhanced">Total Messages</div>
                            </div>
                          </div>
                          <div className="stat-card-enhanced accent">
                            <div className="stat-card-icon">🔔</div>
                            <div className="stat-card-content">
                              <div className="stat-value-enhanced">{unreadCount}</div>
                              <div className="stat-label-enhanced">Unread</div>
                            </div>
                          </div>
                          <div className="stat-card-enhanced success">
                            <div className="stat-card-icon">✓</div>
                            <div className="stat-card-content">
                              <div className="stat-value-enhanced">{readCount}</div>
                              <div className="stat-label-enhanced">Read</div>
                            </div>
                          </div>
                          <div className="stat-card-enhanced warning">
                            <div className="stat-card-icon">🚩</div>
                            <div className="stat-card-content">
                              <div className="stat-value-enhanced">{flaggedCount}</div>
                              <div className="stat-label-enhanced">Flagged</div>
                            </div>
                          </div>
                          <div className="stat-card-enhanced info">
                            <div className="stat-card-icon">⭐</div>
                            <div className="stat-card-content">
                              <div className="stat-value-enhanced">{starredCount}</div>
                              <div className="stat-label-enhanced">Starred</div>
                            </div>
                          </div>
                          <div className="stat-card-enhanced secondary">
                            <div className="stat-card-icon">📦</div>
                            <div className="stat-card-content">
                              <div className="stat-value-enhanced">{archivedCount}</div>
                              <div className="stat-label-enhanced">Archived</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Activity Statistics */}
                      <div className="statistics-section-modern">
                        <div className="stats-section-header">
                          <div className="stats-section-icon">📈</div>
                          <div>
                            <h4 className="stats-section-title">Activity</h4>
                            <p className="stats-section-subtitle">Recent activity metrics</p>
                          </div>
                        </div>
                        <div className="stats-grid-enhanced">
                          <div className="stat-card-enhanced gradient-today">
                            <div className="stat-card-icon">📅</div>
                            <div className="stat-card-content">
                              <div className="stat-value-enhanced">{todayMessages}</div>
                              <div className="stat-label-enhanced">Messages Today</div>
                            </div>
                          </div>
                          <div className="stat-card-enhanced gradient-week">
                            <div className="stat-card-icon">📆</div>
                            <div className="stat-card-content">
                              <div className="stat-value-enhanced">{thisWeekMessages}</div>
                              <div className="stat-label-enhanced">This Week</div>
                            </div>
                          </div>
                          <div className="stat-card-enhanced gradient-response">
                            <div className="stat-card-icon">💭</div>
                            <div className="stat-card-content">
                              <div className="stat-value-enhanced">{needsResponseCount}</div>
                              <div className="stat-label-enhanced">Needs Response</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Engagement Statistics */}
                      <div className="statistics-section-modern">
                        <div className="stats-section-header">
                          <div className="stats-section-icon">🎯</div>
                          <div>
                            <h4 className="stats-section-title">Engagement</h4>
                            <p className="stats-section-subtitle">Community engagement metrics</p>
                          </div>
                        </div>
                        <div className="stats-grid-enhanced">
                          <div className="stat-card-enhanced gradient-polls">
                            <div className="stat-card-icon">📊</div>
                            <div className="stat-card-content">
                              <div className="stat-value-enhanced">{activePolls.length}</div>
                              <div className="stat-label-enhanced">Active Polls</div>
                            </div>
                          </div>
                          <div className="stat-card-enhanced gradient-links">
                            <div className="stat-card-icon">🔗</div>
                            <div className="stat-card-content">
                              <div className="stat-value-enhanced">{ventLinks.length}</div>
                              <div className="stat-label-enhanced">Vent Links</div>
                            </div>
                          </div>
                          <div className="stat-card-enhanced gradient-account">
                            <div className="stat-card-icon">👤</div>
                            <div className="stat-card-content">
                              <div className="stat-value-enhanced">
                                {profile?.created_at 
                                  ? Math.floor((new Date().getTime() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))
                                  : '0'}
                              </div>
                              <div className="stat-label-enhanced">Days Active</div>
                              {profile?.created_at && (
                                <div className="stat-meta-enhanced">
                                  Since {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : activeTab === 'messages' ? (
            /* All Messages Tab - Full Page View */
            <div className="all-messages-view">
              <div className="messages-header-bar">
                <div className="messages-header-left">
                  <h2>Messages</h2>
                  <span className="messages-count">{filteredMessages.length} of {totalMessages} total</span>
                </div>
                <div className="messages-controls">
                  {/* Search Bar */}
                  <div className="search-bar">
                    <input
                      type="text"
                      placeholder="Search messages..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="search-input"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="search-clear"
                      >
                        ×
                      </button>
                    )}
                    <button
                      className="btn btn-small btn-secondary"
                      onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                      title="Advanced Search"
                    >
                      🔍
                    </button>
                  </div>
                  {showAdvancedSearch && (
                    <div style={{ marginTop: '12px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                        <div style={{ flex: 1, minWidth: '150px' }}>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 600 }}>From Date</label>
                          <input
                            type="date"
                            value={searchDateFrom}
                            onChange={(e) => setSearchDateFrom(e.target.value)}
                            className="input"
                            style={{ width: '100%' }}
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: '150px' }}>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 600 }}>To Date</label>
                          <input
                            type="date"
                            value={searchDateTo}
                            onChange={(e) => setSearchDateTo(e.target.value)}
                            className="input"
                            style={{ width: '100%' }}
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: '150px' }}>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 600 }}>Search by Tag</label>
                          <input
                            type="text"
                            placeholder="Tag name..."
                            value={searchByTag}
                            onChange={(e) => setSearchByTag(e.target.value)}
                            className="input"
                            style={{ width: '100%' }}
                          />
                        </div>
                      </div>
                      <button
                        className="btn btn-small btn-secondary"
                        onClick={() => {
                          setSearchDateFrom('')
                          setSearchDateTo('')
                          setSearchByTag('')
                        }}
                      >
                        Clear Filters
                      </button>
                    </div>
                  )}
                  <div className="filter-buttons">
                    <button
                      className={`filter-btn ${messageFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setMessageFilter('all')}
                    >
                      All
                    </button>
                    <button
                      className={`filter-btn ${messageFilter === 'unread' ? 'active' : ''}`}
                      onClick={() => setMessageFilter('unread')}
                    >
                      Unread ({unreadCount})
                    </button>
                    <button
                      className={`filter-btn ${messageFilter === 'read' ? 'active' : ''}`}
                      onClick={() => setMessageFilter('read')}
                    >
                      Read ({readCount})
                    </button>
                    <button
                      className={`filter-btn ${messageFilter === 'flagged' ? 'active' : ''}`}
                      onClick={() => setMessageFilter('flagged')}
                    >
                      Flagged ({flaggedCount})
                    </button>
                    <button
                      className={`filter-btn ${messageFilter === 'starred' ? 'active' : ''}`}
                      onClick={() => setMessageFilter('starred')}
                    >
                      ⭐ Starred ({starredCount})
                    </button>
                    <button
                      className={`filter-btn ${messageFilter === 'archived' ? 'active' : ''}`}
                      onClick={() => setMessageFilter('archived')}
                    >
                      📦 Archived ({archivedCount})
                    </button>
                    <button
                      className={`filter-btn ${messageFilter === 'needs-response' ? 'active' : ''}`}
                      onClick={() => setMessageFilter('needs-response')}
                    >
                      💬 Needs Response ({needsResponseCount})
                    </button>
                  </div>
                  {/* Folders */}
                  {messageFolders.length > 0 && (
                    <div className="folder-buttons" style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        className={`filter-btn ${!selectedFolderFilter ? 'active' : ''}`}
                        onClick={() => setSelectedFolderFilter(null)}
                      >
                        All Folders
                      </button>
                      {messageFolders.map(folder => (
                        <button
                          key={folder.id}
                          className={`filter-btn ${selectedFolderFilter === folder.id ? 'active' : ''}`}
                          onClick={() => setSelectedFolderFilter(selectedFolderFilter === folder.id ? null : folder.id)}
                        >
                          📁 {folder.folder_name}
                        </button>
                      ))}
                    </div>
                  )}
                  {showCreateFolder ? (
                    <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        className="input"
                        placeholder="Folder name"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            createFolder()
                          }
                        }}
                        style={{ flex: 1 }}
                      />
                      <button className="btn btn-small" onClick={createFolder}>Create</button>
                      <button className="btn btn-small btn-secondary" onClick={() => {
                        setShowCreateFolder(false)
                        setNewFolderName('')
                      }}>Cancel</button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-small btn-secondary"
                      onClick={() => setShowCreateFolder(true)}
                      style={{ marginTop: '12px' }}
                    >
                      + New Folder
                    </button>
                  )}
                  <div className="sort-controls">
                    <select
                      className="select"
                      value={messageSort}
                      onChange={(e) => setMessageSort(e.target.value as 'newest' | 'oldest')}
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="priority">Priority (High to Low)</option>
                    </select>
                  </div>
                  {/* Export Buttons */}
                  <div className="export-buttons">
                    <button
                      className="btn btn-small btn-secondary"
                      onClick={() => exportMessages('csv')}
                      title="Export to CSV"
                    >
                      📥 CSV
                    </button>
                    <button
                      className="btn btn-small btn-secondary"
                      onClick={() => exportMessages('json')}
                      title="Export to JSON"
                    >
                      📥 JSON
                    </button>
                  </div>
                </div>
              </div>

              {/* Bulk Actions Bar */}
              {selectedMessages.size > 0 && (
                <div className="bulk-actions-bar">
                  <span className="bulk-selection-count">
                    {selectedMessages.size} selected
                  </span>
                  <div className="bulk-actions-buttons">
                    <button
                      className="btn btn-small"
                      onClick={() => bulkMarkAsRead(true)}
                    >
                      Mark as Read
                    </button>
                    <button
                      className="btn btn-small"
                      onClick={() => bulkMarkAsRead(false)}
                    >
                      Mark as Unread
                    </button>
                    <button
                      className="btn btn-small btn-danger"
                      onClick={bulkDeleteMessages}
                    >
                      Delete
                    </button>
                    <button
                      className="btn btn-small btn-secondary"
                      onClick={clearSelection}
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>
              )}

              {messages.length === 0 ? (
                <div className="empty-messages-state">
                  <div className="empty-icon-large">💬</div>
                  <h3>No messages yet</h3>
                  <p className="empty-hint">
                    {primaryVentLink 
                      ? 'Share your link to start receiving anonymous messages!'
                      : 'Create a vent link first to start receiving messages!'}
                  </p>
                </div>
              ) : (() => {
                const finalFiltered = filteredMessages.filter((msg) => {
                  if (messageFilter === 'all') return !msg.is_archived
                  if (messageFilter === 'unread') return !msg.is_read && !msg.is_archived
                  if (messageFilter === 'read') return msg.is_read && !msg.is_archived
                  if (messageFilter === 'flagged') return msg.is_flagged && !msg.is_archived
                  if (messageFilter === 'starred') return msg.is_starred && !msg.is_archived
                  if (messageFilter === 'archived') return msg.is_archived
                  if (messageFilter === 'needs-response') {
                    const hasResponse = messageResponses[msg.id]
                    const isHighPriority = msg.ai_priority_score !== null && msg.ai_priority_score >= 70
                    const hasNeedsResponseTag = messageTags[msg.id]?.includes('needs-response')
                    return !msg.is_archived && !hasResponse && (isHighPriority || hasNeedsResponseTag)
                  }
                  return true
                }).sort((a, b) => {
                  const dateA = new Date(a.created_at).getTime()
                  const dateB = new Date(b.created_at).getTime()
                  if (messageSort === 'priority') {
                    // Sort by priority score (highest first), then by date
                    const scoreA = msgA.ai_priority_score ?? 0
                    const scoreB = msgB.ai_priority_score ?? 0
                    if (scoreB !== scoreA) return scoreB - scoreA
                    return dateB - dateA // If same priority, newest first
                  }
                  return messageSort === 'newest' ? dateB - dateA : dateA - dateB
                })

                return finalFiltered.length === 0 ? (
                  <div className="empty-messages-state">
                    <div className="empty-icon-large">🔍</div>
                    <h3>No messages match your filters</h3>
                    <p className="empty-hint">
                      Try adjusting your search, filter, or folder selection to see messages.
                    </p>
                    {(searchQuery || selectedFolderFilter || searchDateFrom || searchDateTo || searchByTag) && (
                      <button
                        className="btn btn-secondary"
                        style={{ marginTop: '16px' }}
                        onClick={() => {
                          setSearchQuery('')
                          setSelectedFolderFilter(null)
                          setSearchDateFrom('')
                          setSearchDateTo('')
                          setSearchByTag('')
                          setMessageFilter('all')
                        }}
                      >
                        Clear All Filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="all-messages-grid">
                    {finalFiltered.map((message) => (
                      <div
                        key={message.id}
                        className={`message-card ${!message.is_read ? 'unread' : ''} ${message.is_flagged ? 'flagged' : ''} ${selectedMessages.has(message.id) ? 'selected' : ''}`}
                        onClick={(e) => {
                          // Don't select message if clicking checkbox
                          if ((e.target as HTMLElement).closest('.message-checkbox')) return
                          setSelectedMessage(message)
                          setAiReplies(null)
                          // Mark as read if unread
                          if (!message.is_read) {
                            markAsRead(message.id, true)
                          }
                        }}
                      >
                        <div className="message-card-header">
                          <input
                            type="checkbox"
                            className="message-checkbox"
                            checked={selectedMessages.has(message.id)}
                            onChange={(e) => {
                              e.stopPropagation()
                              toggleMessageSelection(message.id)
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="message-card-status">
                            {message.is_starred && <span className="status-star">⭐</span>}
                            {!message.is_read && <span className="status-dot unread-dot"></span>}
                            {message.is_flagged && <span className="status-dot flagged-dot"></span>}
                            {message.is_read && !message.is_flagged && <span className="status-dot read-dot"></span>}
                            {message.is_archived && <span className="status-archived">📦</span>}
                          </div>
                          <span className="message-card-time">{formatTimeAgo(message.created_at)}</span>
                        </div>
                        <div className="message-card-body">
                          <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{message.body || ''}</p>
                          {/* Tags */}
                          {messageTags[message.id] && messageTags[message.id].length > 0 && (
                            <div className="message-tags">
                              {messageTags[message.id].map((tag, idx) => (
                                <span key={idx} className="message-tag">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="message-card-footer">
                          {message.mood && (
                            <span className="message-mood-badge">{message.mood}</span>
                          )}
                          <div className="message-card-actions">
                            <button
                              className="card-action-btn"
                              onClick={(e) => {
                                e.stopPropagation()
                                markAsRead(message.id, !message.is_read)
                              }}
                              title={message.is_read ? 'Mark as unread' : 'Mark as read'}
                            >
                              {message.is_read ? '✓' : '○'}
                            </button>
                            <button
                              className="card-action-btn"
                              onClick={(e) => {
                                e.stopPropagation()
                                flagMessage(message.id)
                              }}
                              disabled={message.is_flagged}
                              title="Flag message"
                            >
                              🚩
                            </button>
                            <button
                              className={`card-action-btn ${message.is_starred ? 'starred' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleStar(message.id)
                              }}
                              title={message.is_starred ? 'Unstar' : 'Star'}
                            >
                              {message.is_starred ? '⭐' : '☆'}
                            </button>
                            <button
                              className={`card-action-btn ${message.is_archived ? 'archived' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleArchive(message.id)
                              }}
                              title={message.is_archived ? 'Unarchive' : 'Archive'}
                            >
                              {message.is_archived ? '📦' : '📥'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
          </div>
          ) : (
          <>
            {/* Statistics Cards */}
            <div className="stats-grid-modern">
            <div className="stat-card-modern">
              <div className="stat-icon-modern">📨</div>
              <div className="stat-info">
                <div className="stat-value-modern">{totalMessages}</div>
                <div className="stat-label-modern">Total</div>
              </div>
            </div>
            <div className="stat-card-modern unread">
              <div className="stat-icon-modern">🔔</div>
              <div className="stat-info">
                <div className="stat-value-modern">{unreadCount}</div>
                <div className="stat-label-modern">Unread</div>
              </div>
            </div>
            <div className="stat-card-modern">
              <div className="stat-icon-modern">📅</div>
              <div className="stat-info">
                <div className="stat-value-modern">{todayMessages}</div>
                <div className="stat-label-modern">Today</div>
              </div>
            </div>
            <div className="stat-card-modern">
              <div className="stat-icon-modern">📊</div>
              <div className="stat-info">
                <div className="stat-value-modern">{thisWeekMessages}</div>
                <div className="stat-label-modern">This Week</div>
              </div>
            </div>
            <div className="stat-card-modern">
              <div className="stat-icon-modern">🚩</div>
              <div className="stat-info">
                <div className="stat-value-modern">{flaggedCount}</div>
                <div className="stat-label-modern">Flagged</div>
              </div>
            </div>
            <div className="stat-card-modern">
              <div className="stat-icon-modern">✅</div>
              <div className="stat-info">
                <div className="stat-value-modern">{readCount}</div>
                <div className="stat-label-modern">Read</div>
              </div>
            </div>
            </div>

            {/* Quick Actions */}
            {primaryVentLink && (
            <div className="card quick-actions">
              <h2>Quick Actions</h2>
              <div className="actions-grid">
                <button
                  onClick={() => copyLink(primaryVentLink.slug)}
                  className="action-btn"
                >
                  <span className="action-icon">📋</span>
                  <span className="action-text">Copy Link</span>
                </button>
                <a
                  href={`/v/${primaryVentLink.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-btn"
                >
                  <span className="action-icon">👁️</span>
                  <span className="action-text">Preview Page</span>
                </a>
                {unreadCount > 0 && (
                  <button
                    onClick={async () => {
                      const unreadIds = messages.filter(m => !m.is_read).map(m => m.id)
                      for (const id of unreadIds) {
                        await markAsRead(id, true)
                      }
                    }}
                    className="action-btn"
                  >
                    <span className="action-icon">✅</span>
                    <span className="action-text">Mark All Read</span>
                  </button>
                )}
                {messages.length > 0 && (
                  <button
                    onClick={handleSummarizeThemes}
                    disabled={loadingSummary}
                    className="action-btn"
                  >
                    <span className="action-icon">🤖</span>
                    <span className="action-text">
                      {loadingSummary ? 'Generating...' : 'AI Summary'}
                    </span>
                  </button>
                )}
                <button
                  onClick={() => setShowCreatePoll(!showCreatePoll)}
                  className="action-btn"
                >
                  <span className="action-icon">📊</span>
                  <span className="action-text">Create Poll</span>
                </button>
              </div>
            </div>
            )}
          </>
          )}

          {/* Creator Hub - Combined Links & Polls */}
          {activeTab === 'overview' && (
            <div className="card creator-hub">
              {/* Hub Tab Navigation */}
              <div className="hub-tabs">
                <button
                  className={`hub-tab ${hubView === 'links' ? 'active' : ''}`}
                  onClick={() => setHubView('links')}
                >
                  <span className="hub-tab-icon">🔗</span>
                  <span className="hub-tab-text">Links</span>
                  {ventLinks.length > 0 && <span className="hub-tab-badge">{ventLinks.length}</span>}
                </button>
                <button
                  className={`hub-tab ${hubView === 'polls' ? 'active' : ''}`}
                  onClick={() => setHubView('polls')}
                >
                  <span className="hub-tab-icon">📊</span>
                  <span className="hub-tab-text">Polls</span>
                  {polls.length > 0 && <span className="hub-tab-badge">{polls.length}</span>}
                </button>
                <button
                  className={`hub-tab ${hubView === 'qa' ? 'active' : ''}`}
                  onClick={() => setHubView('qa')}
                >
                  <span className="hub-tab-icon">💬</span>
                  <span className="hub-tab-text">Q&A</span>
                  {qaSessions.length > 0 && <span className="hub-tab-badge">{qaSessions.length}</span>}
                </button>
                <button
                  className={`hub-tab ${hubView === 'challenges' ? 'active' : ''}`}
                  onClick={() => setHubView('challenges')}
                >
                  <span className="hub-tab-icon">🏆</span>
                  <span className="hub-tab-text">Challenges</span>
                  {challenges.length > 0 && <span className="hub-tab-badge">{challenges.length}</span>}
                </button>
                <button
                  className={`hub-tab ${hubView === 'raffles' ? 'active' : ''}`}
                  onClick={() => setHubView('raffles')}
                >
                  <span className="hub-tab-icon">🎲</span>
                  <span className="hub-tab-text">Raffles</span>
                  {raffles.length > 0 && <span className="hub-tab-badge">{raffles.length}</span>}
                </button>
                <button
                  className={`hub-tab ${hubView === 'voting' ? 'active' : ''}`}
                  onClick={() => setHubView('voting')}
                >
                  <span className="hub-tab-icon">🗳️</span>
                  <span className="hub-tab-text">Voting</span>
                  {communityVotes.length > 0 && <span className="hub-tab-badge">{communityVotes.length}</span>}
                </button>
                <button
                  className={`hub-tab ${hubView === 'feedback' ? 'active' : ''}`}
                  onClick={() => setHubView('feedback')}
                >
                  <span className="hub-tab-icon">📝</span>
                  <span className="hub-tab-text">Feedback</span>
                  {feedbackForms.length > 0 && <span className="hub-tab-badge">{feedbackForms.length}</span>}
                </button>
                <button
                  className={`hub-tab ${hubView === 'highlights' ? 'active' : ''}`}
                  onClick={() => setHubView('highlights')}
                >
                  <span className="hub-tab-icon">⭐</span>
                  <span className="hub-tab-text">Highlights</span>
                  {highlights.length > 0 && <span className="hub-tab-badge">{highlights.length}</span>}
                </button>
                <button
                  className={`hub-tab ${hubView === 'reactions' ? 'active' : ''}`}
                  onClick={() => setHubView('reactions')}
                >
                  <span className="hub-tab-icon">😊</span>
                  <span className="hub-tab-text">Reactions</span>
                </button>
                <button
                  className={`hub-tab ${hubView === 'goals' ? 'active' : ''}`}
                  onClick={() => setHubView('goals')}
                >
                  <span className="hub-tab-icon">🎯</span>
                  <span className="hub-tab-text">Goals</span>
                  {communityGoals.length > 0 && <span className="hub-tab-badge">{communityGoals.length}</span>}
                </button>
                <button
                  className={`hub-tab ${hubView === 'events' ? 'active' : ''}`}
                  onClick={() => setHubView('events')}
                >
                  <span className="hub-tab-icon">📅</span>
                  <span className="hub-tab-text">Events</span>
                  {communityEvents.length > 0 && <span className="hub-tab-badge">{communityEvents.length}</span>}
                </button>
                <button
                  className={`hub-tab ${hubView === 'wall' ? 'active' : ''}`}
                  onClick={() => setHubView('wall')}
                >
                  <span className="hub-tab-icon">🧱</span>
                  <span className="hub-tab-text">Wall</span>
                </button>
                <button
                  className={`hub-tab ${hubView === 'projects' ? 'active' : ''}`}
                  onClick={() => setHubView('projects')}
                >
                  <span className="hub-tab-icon">🤝</span>
                  <span className="hub-tab-text">Projects</span>
                  {collaborativeProjects.length > 0 && <span className="hub-tab-badge">{collaborativeProjects.length}</span>}
                </button>
              </div>

              {/* Hub Content */}
              <div className="hub-content">
                {/* Links View */}
                {hubView === 'links' && (
                  <div className="hub-links-view">
                    <div className="hub-section-header">
                      <div className="hub-section-title">
                        <h3>Your Vent Links</h3>
                        {ventLinks.length > 1 && (
                          <select
                            className="select hub-link-select"
                            value={selectedVentLinkId || ''}
                            onChange={(e) => setSelectedVentLinkId(e.target.value)}
                          >
                            {ventLinks.map(link => (
                              <option key={link.id} value={link.id}>
                                {link.title || link.slug}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      {!primaryVentLink && (
                        <button
                          onClick={() => setShowCreateLink(!showCreateLink)}
                          className="btn btn-secondary"
                        >
                          {showCreateLink ? 'Cancel' : '+ New Link'}
                        </button>
                      )}
                    </div>
                    
                    {showCreateLink && !primaryVentLink ? (
                      <div className="create-link-form">
                        <div className="form-group">
                          <label htmlFor="slug">Slug (URL identifier)</label>
                          <input
                            id="slug"
                            type="text"
                            className="input"
                            placeholder="e.g., myname"
                            value={newLinkSlug}
                            onChange={(e) => setNewLinkSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                            disabled={creatingLink}
                          />
                          <small className="form-hint">
                            Only lowercase letters, numbers, and hyphens. This will be your URL: /v/{newLinkSlug || 'yourslug'}
                          </small>
                        </div>
                        <div className="form-group">
                          <label htmlFor="title">Title (optional)</label>
                          <input
                            id="title"
                            type="text"
                            className="input"
                            placeholder="e.g., Talk to me"
                            value={newLinkTitle}
                            onChange={(e) => setNewLinkTitle(e.target.value)}
                            disabled={creatingLink}
                          />
                        </div>
                        <button
                          onClick={createVentLink}
                          className="btn"
                          disabled={creatingLink || !newLinkSlug.trim()}
                        >
                          {creatingLink ? 'Creating...' : 'Create Vent Link'}
                        </button>
                      </div>
                    ) : primaryVentLink ? (
                      <div className="vent-link-display-card">
                        <div className="vent-link-url-box">
                          <div className="vent-link-url">
                            <span className="url-prefix">{window.location.origin}/v/</span>
                            <span className="url-slug">{primaryVentLink.slug}</span>
                          </div>
                          <button
                            onClick={() => copyLink(primaryVentLink.slug)}
                            className="btn btn-copy"
                          >
                            📋 Copy
                          </button>
                        </div>
                        {primaryVentLink.title && (
                          <p className="vent-link-title">{primaryVentLink.title}</p>
                        )}
                        <div className="share-tips-compact">
                          <span className="share-tip-item">📸 Instagram</span>
                          <span className="share-tip-item">🎵 TikTok</span>
                          <span className="share-tip-item">📖 Stories</span>
                          <span className="share-tip-item">🐦 Twitter/X</span>
                        </div>
                      </div>
                    ) : (
                      <div className="empty-state-compact">
                        <div className="empty-icon">🔗</div>
                        <p>No vent link created yet</p>
                        <button
                          onClick={() => setShowCreateLink(true)}
                          className="btn"
                        >
                          Create Your First Link
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Polls View */}
                {hubView === 'polls' && (
                  <div className="hub-polls-view">
                    <div className="hub-section-header">
                      <div className="hub-section-title">
                        <h3>Your Polls</h3>
                        {polls.length > 0 && (
                          <div className="filter-buttons">
                            <button
                              className={`filter-btn ${pollView === 'all' ? 'active' : ''}`}
                              onClick={() => setPollView('all')}
                            >
                              All
                            </button>
                            <button
                              className={`filter-btn ${pollView === 'active' ? 'active' : ''}`}
                              onClick={() => setPollView('active')}
                            >
                              Active
                            </button>
                            <button
                              className={`filter-btn ${pollView === 'archived' ? 'active' : ''}`}
                              onClick={() => setPollView('archived')}
                            >
                              Archived
                            </button>
                          </div>
                        )}
                      </div>
                      {primaryVentLink ? (
                <button
                  onClick={() => {
                    if (editingPoll) cancelEditPoll()
                    setShowCreatePoll(!showCreatePoll)
                  }}
                  className="btn btn-secondary"
                >
                  {showCreatePoll ? 'Cancel' : '+ New Poll'}
                </button>
                      ) : (
                        <button
                          onClick={() => { setHubView('links'); setShowCreateLink(true); }}
                          className="btn btn-secondary"
                        >
                          Create Link First
                        </button>
                      )}
              </div>

                    {!primaryVentLink ? (
                      <div className="empty-state-compact">
                        <div className="empty-icon">📊</div>
                        <p>Create a vent link first to create polls</p>
                        <button
                          onClick={() => { setHubView('links'); setShowCreateLink(true); }}
                          className="btn"
                        >
                          Create Vent Link
                        </button>
                      </div>
                    ) : showCreatePoll && !editingPoll && (
                <div className="create-poll-form">
                        {pollTemplates.length > 0 && (
                          <div style={{ marginBottom: '16px' }}>
                            <button
                              className="btn btn-small btn-secondary"
                              onClick={() => setShowPollTemplates(!showPollTemplates)}
                            >
                              {showPollTemplates ? 'Hide' : 'Show'} Templates ({pollTemplates.length})
                            </button>
                            {showPollTemplates && (
                              <div style={{ marginTop: '12px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                                {pollTemplates.map(template => (
                                  <div key={template.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', marginBottom: '8px', border: '1px solid var(--border)', borderRadius: '4px' }}>
                                    <div>
                                      <strong>{template.name}</strong>
                                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{template.question}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                      <button
                                        className="btn btn-small"
                                        onClick={() => usePollTemplate(template)}
                                      >
                                        Use
                                      </button>
                                      <button
                                        className="btn btn-small btn-danger"
                                        onClick={() => deletePollTemplate(template.id)}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                  <div className="form-group">
                    <label htmlFor="poll-question">Poll Question *</label>
                    <input
                      id="poll-question"
                      type="text"
                      className="input"
                      placeholder="e.g., What's your favorite feature?"
                      value={newPollQuestion}
                      onChange={(e) => setNewPollQuestion(e.target.value)}
                      disabled={creatingPoll}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="poll-description">Description (optional)</label>
                    <textarea
                      id="poll-description"
                      className="input"
                      placeholder="Add more context about this poll..."
                      value={newPollDescription}
                      onChange={(e) => setNewPollDescription(e.target.value)}
                      disabled={creatingPoll}
                      rows={3}
                    />
                  </div>
                  <div className="form-group">
                    <label>Poll Options *</label>
                    {newPollOptions.map((option, index) => (
                      <div key={index} className="poll-option-input">
                        <input
                          type="text"
                          className="input"
                          placeholder={`Option ${index + 1}`}
                          value={option}
                          onChange={(e) => updatePollOption(index, e.target.value)}
                          disabled={creatingPoll}
                        />
                        {newPollOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removePollOption(index)}
                            className="btn btn-danger btn-small"
                            disabled={creatingPoll}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addPollOption}
                      className="btn btn-secondary btn-small"
                      disabled={creatingPoll}
                    >
                      + Add Option
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                    <div className="form-group">
                      <label htmlFor="poll-expires">Expiration Date (optional)</label>
                      <input
                        id="poll-expires"
                        type="datetime-local"
                        className="input"
                        value={newPollExpiresAt}
                        onChange={(e) => setNewPollExpiresAt(e.target.value)}
                        disabled={creatingPoll}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="poll-max-votes">Max Votes (optional)</label>
                      <input
                        id="poll-max-votes"
                        type="number"
                        className="input"
                        placeholder="No limit"
                        value={newPollMaxVotes}
                        onChange={(e) => setNewPollMaxVotes(e.target.value)}
                        disabled={creatingPoll}
                        min="1"
                      />
                    </div>
                  </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                  <button
                    onClick={createPoll}
                    className="btn"
                    disabled={creatingPoll || !newPollQuestion.trim() || newPollOptions.filter(opt => opt.trim()).length < 2}
                  >
                    {creatingPoll ? 'Creating...' : 'Create Poll'}
                  </button>
                          {newPollQuestion.trim() && newPollOptions.filter(opt => opt.trim()).length >= 2 && (
                            <>
                              <input
                                type="text"
                                placeholder="Template name..."
                                value={newTemplateName}
                                onChange={(e) => setNewTemplateName(e.target.value)}
                                className="input"
                                style={{ flex: 1, maxWidth: '200px' }}
                              />
                              <button
                                onClick={savePollAsTemplate}
                                className="btn btn-secondary"
                                disabled={!newTemplateName.trim()}
                              >
                                Save as Template
                              </button>
                            </>
                          )}
                        </div>
                </div>
              )}

                    {/* Edit Poll Form */}
                    {editingPoll && (
                      <div className="create-poll-form" style={{ marginBottom: '24px', border: '2px solid var(--accent)' }}>
                        <h3 style={{ marginBottom: '16px' }}>Edit Poll</h3>
                        <div className="form-group">
                          <label htmlFor="edit-poll-question">Poll Question *</label>
                          <input
                            id="edit-poll-question"
                            type="text"
                            className="input"
                            value={editPollQuestion}
                            onChange={(e) => setEditPollQuestion(e.target.value)}
                            disabled={updatingPoll}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="edit-poll-description">Description (optional)</label>
                          <textarea
                            id="edit-poll-description"
                            className="input"
                            value={editPollDescription}
                            onChange={(e) => setEditPollDescription(e.target.value)}
                            disabled={updatingPoll}
                            rows={3}
                          />
                        </div>
                        <div className="form-group">
                          <label>Poll Options *</label>
                          {editPollOptions.map((option, index) => (
                            <div key={index} className="poll-option-input">
                              <input
                                type="text"
                                className="input"
                                placeholder={`Option ${index + 1}`}
                                value={option.text}
                                onChange={(e) => updateEditPollOption(index, e.target.value)}
                                disabled={updatingPoll}
                              />
                              {editPollOptions.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => removeEditPollOption(index)}
                                  className="btn btn-danger btn-small"
                                  disabled={updatingPoll}
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={addEditPollOption}
                            className="btn btn-secondary btn-small"
                            disabled={updatingPoll}
                          >
                            + Add Option
                          </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                          <div className="form-group">
                            <label htmlFor="edit-poll-expires">Expiration Date (optional)</label>
                            <input
                              id="edit-poll-expires"
                              type="datetime-local"
                              className="input"
                              value={editPollExpiresAt}
                              onChange={(e) => setEditPollExpiresAt(e.target.value)}
                              disabled={updatingPoll}
                            />
                          </div>
                          <div className="form-group">
                            <label htmlFor="edit-poll-max-votes">Max Votes (optional)</label>
                            <input
                              id="edit-poll-max-votes"
                              type="number"
                              className="input"
                              placeholder="No limit"
                              value={editPollMaxVotes}
                              onChange={(e) => setEditPollMaxVotes(e.target.value)}
                              disabled={updatingPoll}
                              min="1"
                            />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                          <button
                            onClick={savePollEdit}
                            className="btn"
                            disabled={updatingPoll || !editPollQuestion.trim() || editPollOptions.filter(opt => opt.text.trim()).length < 2}
                          >
                            {updatingPoll ? 'Saving...' : 'Save Changes'}
                          </button>
                          <button
                            onClick={cancelEditPoll}
                            className="btn btn-secondary"
                            disabled={updatingPoll}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {primaryVentLink && displayedPolls.length > 0 ? (
                <div className="polls-list">
                        {displayedPolls.map((poll) => (
                    <div key={poll.id} className={`poll-card ${!poll.is_active ? 'inactive' : ''}`}>
                      <div className="poll-card-header">
                        <div style={{ flex: 1 }}>
                        <h3>{poll.question}</h3>
                          {poll.description && (
                            <p style={{ marginTop: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                              {poll.description}
                            </p>
                          )}
                        </div>
                        <div className="poll-actions">
                          <button
                            onClick={() => startEditingPoll(poll)}
                            className="btn btn-small btn-secondary"
                            title="Edit Poll"
                            disabled={editingPoll !== null}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => duplicatePoll(poll)}
                            className="btn btn-small btn-secondary"
                            title="Duplicate Poll"
                            disabled={creatingPoll}
                          >
                            📋 Duplicate
                          </button>
                          <button
                            onClick={() => exportPollResults(poll)}
                            className="btn btn-small btn-secondary"
                            title="Export Results"
                          >
                            📥 Export
                          </button>
                          <button
                            onClick={() => togglePollActive(poll.id, poll.is_active)}
                            className="btn btn-small btn-secondary"
                            title={poll.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {poll.is_active ? '⏸️' : '▶️'}
                          </button>
                          <button
                            onClick={() => setSelectedPoll(selectedPoll?.id === poll.id ? null : poll)}
                            className="btn btn-small"
                          >
                            {selectedPoll?.id === poll.id ? '👁️ Hide' : '📊 Results'}
                          </button>
                          <button
                            onClick={() => deletePoll(poll.id)}
                            className="btn btn-small btn-danger"
                            title="Delete Poll"
                            disabled={deletingPoll === poll.id}
                          >
                            {deletingPoll === poll.id ? '...' : '🗑️'}
                          </button>
                        </div>
                      </div>
                      <div className="poll-stats">
                        <span className="poll-stat">📊 {poll.total_votes || 0} votes</span>
                        <span className="poll-stat">{poll.is_active ? '✅ Active' : '⏸️ Inactive'}</span>
                        {poll.max_votes && (
                          <span className="poll-stat">
                            🎯 Max: {poll.max_votes} {poll.total_votes && poll.total_votes >= poll.max_votes ? '(Reached)' : ''}
                          </span>
                        )}
                        {poll.expires_at && (
                          <span className="poll-stat">
                            {new Date(poll.expires_at) > new Date() 
                              ? `⏰ Expires ${formatTimeAgo(poll.expires_at)}`
                              : '⏰ Expired'}
                          </span>
                        )}
                        <span className="poll-stat">📅 Created {formatTimeAgo(poll.created_at)}</span>
                      </div>
                      {selectedPoll?.id === poll.id && (
                        <div className="poll-results">
                          <h4>Results</h4>
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
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                    ) : primaryVentLink && !showCreatePoll && !editingPoll && (
                      <div className="empty-state-compact">
                  <div className="empty-icon">📊</div>
                        <p>No polls yet</p>
                        <button
                          onClick={() => {
                            if (editingPoll) cancelEditPoll()
                            setShowCreatePoll(true)
                          }}
                          className="btn"
                        >
                          Create Your First Poll
                        </button>
                </div>
              )}
            </div>
          )}

                {/* Q&A Sessions View */}
                {hubView === 'qa' && (
                  <div className="hub-qa-view">
                    <div className="hub-section-header">
                      <h3>Q&A / AMA Sessions</h3>
                      {primaryVentLink && (
                  <button
                          className="btn btn-secondary"
                          onClick={() => setShowCreateQASession(!showCreateQASession)}
                        >
                          {showCreateQASession ? 'Cancel' : '+ New Session'}
                        </button>
                      )}
                    </div>

                    {!primaryVentLink ? (
                      <div className="empty-state-compact">
                        <div className="empty-icon">💬</div>
                        <p>Create a vent link first</p>
                        <button onClick={() => { setHubView('links'); setShowCreateLink(true); }} className="btn">Create Link</button>
                      </div>
                    ) : showCreateQASession ? (
                      <div className="create-poll-form">
                        <div className="form-section">
                          <div className="form-section-title">
                            <span>💬</span>
                            <span>Session Details</span>
                          </div>
                          <div className="form-group">
                            <label>
                              <span className="label-icon">✏️</span>
                              <span>Session Title</span>
                              <span className="required-badge">*</span>
                            </label>
                            <span className="label-hint">Create an engaging title that invites questions from your community</span>
                            <input
                              type="text"
                              className="input"
                              placeholder="e.g., Ask Me Anything!, Monthly Q&A, Community Questions"
                              value={newQASessionTitle}
                              onChange={(e) => setNewQASessionTitle(e.target.value)}
                              disabled={creatingQASession}
                              maxLength={100}
                            />
                            <div className="char-counter">
                              {newQASessionTitle.length} / 100 characters
                            </div>
                          </div>
                          <div className="form-group">
                            <label>
                              <span className="label-icon">📄</span>
                              <span>Description</span>
                            </label>
                            <span className="label-hint">Explain what topics you're open to discussing or what makes this Q&A special</span>
                            <textarea
                              className="input"
                              placeholder="What is this Q&A session about? What topics can people ask about?"
                              value={newQASessionDescription}
                              onChange={(e) => setNewQASessionDescription(e.target.value)}
                              disabled={creatingQASession}
                              rows={4}
                              maxLength={500}
                            />
                            <div className="char-counter">
                              {newQASessionDescription.length} / 500 characters
                            </div>
                          </div>
                        </div>
                        <div className="form-section">
                          <div className="form-section-title">
                            <span>📅</span>
                            <span>Schedule (Optional)</span>
                          </div>
                          <div className="form-row">
                            <div className="form-group">
                              <label>
                                <span className="label-icon">🕐</span>
                                <span>Start Date & Time</span>
                              </label>
                              <span className="label-hint">When should this Q&A session begin?</span>
                              <input
                                type="datetime-local"
                                className="input"
                                value={newQASessionStartsAt}
                                onChange={(e) => setNewQASessionStartsAt(e.target.value)}
                                disabled={creatingQASession}
                              />
                            </div>
                            <div className="form-group">
                              <label>
                                <span className="label-icon">🕐</span>
                                <span>End Date & Time</span>
                              </label>
                              <span className="label-hint">When should this Q&A session close?</span>
                              <input
                                type="datetime-local"
                                className="input"
                                value={newQASessionEndsAt}
                                onChange={(e) => setNewQASessionEndsAt(e.target.value)}
                                disabled={creatingQASession}
                              />
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
                          <button
                            onClick={createQASession}
                            className="btn"
                            disabled={creatingQASession || !newQASessionTitle.trim()}
                            style={{ flex: 1 }}
                          >
                            {creatingQASession ? '⏳ Creating...' : '✨ Create Q&A Session'}
                          </button>
                          <button
                            onClick={() => {
                              setShowCreateQASession(false)
                              setNewQASessionTitle('')
                              setNewQASessionDescription('')
                              setNewQASessionStartsAt('')
                              setNewQASessionEndsAt('')
                            }}
                            className="btn btn-secondary"
                            disabled={creatingQASession}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : qaSessions.length > 0 ? (
                      <div className="polls-list">
                        {qaSessions.map((session) => {
                          const questions = qaQuestions[session.id] || []
                          const unansweredCount = questions.filter(q => !q.is_answered).length
                          return (
                            <div key={session.id} className={`poll-card ${!session.is_active ? 'inactive' : ''}`}>
                              <div className="poll-card-header">
                                <div style={{ flex: 1 }}>
                                  <h3>{session.title}</h3>
                                  {session.description && (
                                    <p style={{ marginTop: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                                      {session.description}
                                    </p>
                )}
              </div>
                                <div className="poll-actions">
                                  <button
                                    onClick={() => toggleQASessionActive(session.id, session.is_active)}
                                    className="btn btn-small btn-secondary"
                                  >
                                    {session.is_active ? '⏸️' : '▶️'}
                                  </button>
                                  <button
                                    onClick={() => setSelectedQASession(selectedQASession?.id === session.id ? null : session)}
                                    className="btn btn-small"
                                  >
                                    {selectedQASession?.id === session.id ? '👁️ Hide' : '💬 Questions'}
                                  </button>
                                  <button
                                    onClick={() => deleteQASession(session.id)}
                                    className="btn btn-small btn-danger"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                              <div className="poll-stats">
                                <span className="poll-stat">💬 {questions.length} questions</span>
                                {unansweredCount > 0 && (
                                  <span className="poll-stat" style={{ color: 'var(--accent)' }}>
                                    🔔 {unansweredCount} unanswered
                                  </span>
                                )}
                                <span className="poll-stat">{session.is_active ? '✅ Active' : '⏸️ Inactive'}</span>
                                {session.starts_at && (
                                  <span className="poll-stat">
                                    📅 Starts {new Date(session.starts_at).toLocaleDateString()}
                                  </span>
                                )}
                                {session.ends_at && (
                                  <span className="poll-stat">
                                    ⏰ Ends {new Date(session.ends_at).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                              {selectedQASession?.id === session.id && (
                                <div className="poll-results" style={{ marginTop: '20px' }}>
                                  <h4>Questions ({questions.length})</h4>
                                  {questions.length === 0 ? (
                                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
                                      No questions yet
                                    </p>
                                  ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                                      {questions.map((question) => (
                                        <div key={question.id} style={{ 
                                          padding: '16px', 
                                          background: 'var(--bg-secondary)', 
                                          borderRadius: '8px',
                                          border: question.is_answered ? '1px solid var(--success)' : '1px solid var(--border)'
                                        }}>
                                          <div style={{ marginBottom: '12px' }}>
                                            <p style={{ fontWeight: 500, marginBottom: '8px' }}>{question.question_text}</p>
                                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                              {new Date(question.created_at).toLocaleString()}
                                            </span>
                                          </div>
                                          {question.is_answered && question.answer_text ? (
                                            <div style={{ 
                                              padding: '12px', 
                                              background: 'var(--bg-primary)', 
                                              borderRadius: '6px',
                                              marginTop: '8px',
                                              borderLeft: '3px solid var(--success)'
                                            }}>
                                              <strong style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Answer:</strong>
                                              <p style={{ marginTop: '4px' }}>{question.answer_text}</p>
                                            </div>
                                          ) : (
                                            <div>
                                              <textarea
                                                className="input"
                                                placeholder="Write your answer..."
                                                value={answeringQuestion === question.id ? answerText : ''}
                                                onChange={(e) => setAnswerText(e.target.value)}
                                                rows={3}
                                                style={{ marginBottom: '8px' }}
                                              />
                                              <button
                                                onClick={() => answerQuestion(question.id, session.id)}
                                                className="btn btn-small"
                                                disabled={answeringQuestion === question.id && !answerText.trim()}
                                              >
                                                {answeringQuestion === question.id ? 'Answering...' : 'Answer'}
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : primaryVentLink && !showCreateQASession ? (
                      <div className="empty-state-compact">
                        <div className="empty-icon">💬</div>
                        <p>No Q&A sessions yet</p>
                        <p className="empty-hint">Host Ask Me Anything sessions with your community</p>
                        <button
                          onClick={() => setShowCreateQASession(true)}
                          className="btn"
                        >
                          Create Your First Q&A Session
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Challenges View */}
                {hubView === 'challenges' && (
                  <div className="hub-challenges-view">
                    <div className="hub-section-header">
                      <h3>Challenges & Contests</h3>
                      {primaryVentLink && (
                        <button 
                          className="btn btn-secondary"
                          onClick={() => {
                            setShowCreateChallenge(!showCreateChallenge)
                            setEditingChallenge(null)
                            cancelEditChallenge()
                          }}
                        >
                          {showCreateChallenge || editingChallenge ? 'Cancel' : '+ New Challenge'}
                        </button>
                      )}
                    </div>

                    {!primaryVentLink ? (
                      <div className="empty-state-compact">
                        <div className="empty-icon">🏆</div>
                        <p>Create a vent link first</p>
                        <button onClick={() => { setHubView('links'); setShowCreateLink(true); }} className="btn">Create Link</button>
                      </div>
                    ) : showCreateChallenge ? (
                      <div className="create-poll-form">
                  <div className="form-group">
                          <label>Challenge Title *</label>
                    <input
                      type="text"
                      className="input"
                            placeholder="e.g., Creative Writing Contest"
                            value={newChallengeTitle}
                            onChange={(e) => setNewChallengeTitle(e.target.value)}
                            disabled={creatingChallenge}
                          />
                  </div>
                  <div className="form-group">
                          <label>Challenge Type *</label>
                          <select
                            className="select"
                            value={newChallengeType}
                            onChange={(e) => setNewChallengeType(e.target.value as 'contest' | 'giveaway' | 'challenge')}
                            disabled={creatingChallenge}
                          >
                            <option value="challenge">Challenge</option>
                            <option value="contest">Contest</option>
                            <option value="giveaway">Giveaway</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Description (optional)</label>
                          <textarea
                            className="input"
                            placeholder="What is this challenge about?"
                            value={newChallengeDescription}
                            onChange={(e) => setNewChallengeDescription(e.target.value)}
                            disabled={creatingChallenge}
                            rows={3}
                          />
                        </div>
                        <div className="form-group">
                          <label>Prize Description (optional)</label>
                          <textarea
                            className="input"
                            placeholder="What can participants win?"
                            value={newChallengePrize}
                            onChange={(e) => setNewChallengePrize(e.target.value)}
                            disabled={creatingChallenge}
                            rows={2}
                          />
                        </div>
                        <div className="form-group">
                          <label>Rules (optional)</label>
                          <textarea
                            className="input"
                            placeholder="Challenge rules and guidelines..."
                            value={newChallengeRules}
                            onChange={(e) => setNewChallengeRules(e.target.value)}
                            disabled={creatingChallenge}
                            rows={3}
                          />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div className="form-group">
                            <label>Start Date (optional)</label>
                    <input
                              type="datetime-local"
                              className="input"
                              value={newChallengeStartsAt}
                              onChange={(e) => setNewChallengeStartsAt(e.target.value)}
                              disabled={creatingChallenge}
                            />
                          </div>
                          <div className="form-group">
                            <label>End Date (optional)</label>
                            <input
                              type="datetime-local"
                              className="input"
                              value={newChallengeEndsAt}
                              onChange={(e) => setNewChallengeEndsAt(e.target.value)}
                              disabled={creatingChallenge}
                            />
                          </div>
                        </div>
                        <button
                          onClick={createChallenge}
                          className="btn"
                          disabled={creatingChallenge || !newChallengeTitle.trim()}
                        >
                          {creatingChallenge ? 'Creating...' : 'Create Challenge'}
                        </button>
                      </div>
                    ) : editingChallenge ? (
                      <div className="poll-edit-form">
                        <h3 style={{ marginBottom: '20px' }}>Edit Challenge</h3>
                        <div className="form-group">
                          <label>Challenge Title *</label>
                          <input
                      type="text"
                      className="input"
                            placeholder="e.g., Creative Writing Contest"
                            value={editChallengeTitle}
                            onChange={(e) => setEditChallengeTitle(e.target.value)}
                            disabled={updatingChallenge}
                    />
                  </div>
                        <div className="form-group">
                          <label>Challenge Type *</label>
                          <select
                            className="select"
                            value={editChallengeType}
                            onChange={(e) => setEditChallengeType(e.target.value as 'contest' | 'giveaway' | 'challenge')}
                            disabled={updatingChallenge}
                          >
                            <option value="challenge">Challenge</option>
                            <option value="contest">Contest</option>
                            <option value="giveaway">Giveaway</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Description (optional)</label>
                          <textarea
                            className="input"
                            placeholder="What is this challenge about?"
                            value={editChallengeDescription}
                            onChange={(e) => setEditChallengeDescription(e.target.value)}
                            disabled={updatingChallenge}
                            rows={3}
                          />
                        </div>
                        <div className="form-group">
                          <label>Prize Description (optional)</label>
                          <textarea
                            className="input"
                            placeholder="What can participants win?"
                            value={editChallengePrize}
                            onChange={(e) => setEditChallengePrize(e.target.value)}
                            disabled={updatingChallenge}
                            rows={2}
                          />
                        </div>
                        <div className="form-group">
                          <label>Rules (optional)</label>
                          <textarea
                            className="input"
                            placeholder="Challenge rules and guidelines..."
                            value={editChallengeRules}
                            onChange={(e) => setEditChallengeRules(e.target.value)}
                            disabled={updatingChallenge}
                            rows={3}
                          />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div className="form-group">
                            <label>Start Date (optional)</label>
                            <input
                              type="datetime-local"
                              className="input"
                              value={editChallengeStartsAt}
                              onChange={(e) => setEditChallengeStartsAt(e.target.value)}
                              disabled={updatingChallenge}
                            />
                          </div>
                          <div className="form-group">
                            <label>End Date (optional)</label>
                            <input
                              type="datetime-local"
                              className="input"
                              value={editChallengeEndsAt}
                              onChange={(e) => setEditChallengeEndsAt(e.target.value)}
                              disabled={updatingChallenge}
                            />
                          </div>
                        </div>
                        <div className="poll-edit-footer">
                  <button
                            onClick={cancelEditChallenge}
                            className="btn btn-secondary"
                            disabled={updatingChallenge}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={saveChallengeEdit}
                    className="btn"
                            disabled={updatingChallenge || !editChallengeTitle.trim()}
                  >
                            {updatingChallenge ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
                    </div>
                    ) : challenges.length > 0 ? (
                      <div>
                        {/* Filter Buttons */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    <button
                            className={`btn btn-small ${challengeFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setChallengeFilter('all')}
                          >
                            All ({challenges.length})
                          </button>
                          <button
                            className={`btn btn-small ${challengeFilter === 'active' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setChallengeFilter('active')}
                          >
                            Active ({challenges.filter(c => c.is_active && getChallengeStatus(c) === 'active').length})
                          </button>
                          <button
                            className={`btn btn-small ${challengeFilter === 'upcoming' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setChallengeFilter('upcoming')}
                          >
                            Upcoming ({challenges.filter(c => getChallengeStatus(c) === 'upcoming').length})
                          </button>
                          <button
                            className={`btn btn-small ${challengeFilter === 'ended' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setChallengeFilter('ended')}
                          >
                            Ended ({challenges.filter(c => getChallengeStatus(c) === 'ended').length})
                          </button>
                          <button
                            className={`btn btn-small ${challengeFilter === 'inactive' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setChallengeFilter('inactive')}
                          >
                            Inactive ({challenges.filter(c => !c.is_active).length})
                    </button>
                  </div>

                        {filteredChallenges.length > 0 ? (
                        <div className="polls-list">
                          {filteredChallenges.map((challenge) => {
                            const submissions = challengeSubmissions[challenge.id] || []
                            const winnerCount = submissions.filter(s => s.is_winner).length
                            const status = getChallengeStatus(challenge)
                            const submissionFilterForChallenge = submissionFilter[challenge.id] || 'all'
                            const filteredSubmissions = submissions.filter(s => {
                              if (submissionFilterForChallenge === 'winners') return s.is_winner
                              if (submissionFilterForChallenge === 'non-winners') return !s.is_winner
                              return true
                            })

                            return (
                              <div key={challenge.id} className={`poll-card ${!challenge.is_active ? 'inactive' : ''}`} style={{
                                borderLeft: status === 'active' ? '4px solid var(--success)' : 
                                           status === 'upcoming' ? '4px solid var(--accent)' :
                                           status === 'ended' ? '4px solid var(--text-secondary)' : '4px solid var(--border)'
                              }}>
                                <div className="poll-card-header">
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                      <h3>
                                        {challenge.challenge_type === 'contest' && '🏆 '}
                                        {challenge.challenge_type === 'giveaway' && '🎁 '}
                                        {challenge.challenge_type === 'challenge' && '💪 '}
                                        {challenge.title}
                                      </h3>
                                      <span style={{
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        background: status === 'active' ? 'rgba(16, 185, 129, 0.1)' :
                                                   status === 'upcoming' ? 'rgba(139, 92, 246, 0.1)' :
                                                   status === 'ended' ? 'rgba(107, 114, 128, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                                        color: status === 'active' ? 'var(--success)' :
                                               status === 'upcoming' ? 'var(--accent)' :
                                               status === 'ended' ? 'var(--text-secondary)' : 'var(--text-secondary)'
                                      }}>
                                        {status === 'active' ? '🟢 Active' :
                                         status === 'upcoming' ? '🔵 Upcoming' :
                                         status === 'ended' ? '⚫ Ended' : '⚪ Inactive'}
                                      </span>
                                    </div>
                                    {challenge.description && (
                                      <p style={{ marginTop: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                                        {challenge.description}
                                      </p>
                                    )}
                                    {challenge.prize_description && (
                                      <p style={{ marginTop: '8px', color: 'var(--accent)', fontSize: '14px', fontWeight: 500 }}>
                                        🎁 Prize: {challenge.prize_description}
                                      </p>
                                    )}
                  </div>
                                  <div className="poll-actions">
                                    <button
                                      onClick={() => toggleChallengeActive(challenge.id, challenge.is_active)}
                                      className="btn btn-small btn-secondary"
                                      title={challenge.is_active ? 'Pause' : 'Activate'}
                                    >
                                      {challenge.is_active ? '⏸️' : '▶️'}
                                    </button>
                                    <button
                                      onClick={() => startEditChallenge(challenge)}
                                      className="btn btn-small"
                                      title="Edit"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      onClick={() => duplicateChallenge(challenge)}
                                      className="btn btn-small"
                                      title="Duplicate"
                                    >
                                      📋
                                    </button>
                                    <button
                                      onClick={() => setSelectedChallenge(selectedChallenge?.id === challenge.id ? null : challenge)}
                                      className="btn btn-small"
                                      title="View Submissions"
                                    >
                                      {selectedChallenge?.id === challenge.id ? '👁️ Hide' : '📝 Submissions'}
                                    </button>
                                    <button
                                      onClick={() => exportChallengeSubmissions(challenge.id)}
                                      className="btn btn-small"
                                      title="Export CSV"
                                      disabled={submissions.length === 0}
                                    >
                                      📥
                                    </button>
                                    <button
                                      onClick={() => deleteChallenge(challenge.id)}
                                      className="btn btn-small btn-danger"
                                      title="Delete"
                                    >
                                      🗑️
                                    </button>
                </div>
                                </div>
                                <div className="poll-stats">
                                  <span className="poll-stat">📝 {submissions.length} submission{submissions.length !== 1 ? 's' : ''}</span>
                                  {winnerCount > 0 && (
                                    <span className="poll-stat" style={{ color: 'var(--accent)' }}>
                                      🏆 {winnerCount} winner{winnerCount > 1 ? 's' : ''}
                                    </span>
                                  )}
                                  {challenge.starts_at && (
                                    <span className="poll-stat">
                                      📅 Starts {new Date(challenge.starts_at).toLocaleDateString()}
                                    </span>
                                  )}
                                  {challenge.ends_at && (
                                    <span className="poll-stat">
                                      ⏰ Ends {new Date(challenge.ends_at).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                                {challenge.rules && (
                                  <div style={{ 
                                    marginTop: '12px', 
                                    padding: '12px', 
                                    background: 'var(--bg-secondary)', 
                                    borderRadius: '6px',
                                    fontSize: '13px'
                                  }}>
                                    <strong>Rules:</strong>
                                    <p style={{ marginTop: '6px', whiteSpace: 'pre-line' }}>{challenge.rules}</p>
                                  </div>
                                )}
                                {selectedChallenge?.id === challenge.id && (
                                  <div className="poll-results" style={{ marginTop: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                      <h4>Submissions ({submissions.length})</h4>
                                      {submissions.length > 0 && (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                          <button
                                            className={`btn btn-small ${submissionFilterForChallenge === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                                            onClick={() => setSubmissionFilter(prev => ({ ...prev, [challenge.id]: 'all' }))}
                                          >
                                            All
                                          </button>
                                          <button
                                            className={`btn btn-small ${submissionFilterForChallenge === 'winners' ? 'btn-primary' : 'btn-secondary'}`}
                                            onClick={() => setSubmissionFilter(prev => ({ ...prev, [challenge.id]: 'winners' }))}
                                          >
                                            Winners ({winnerCount})
                                          </button>
                                          <button
                                            className={`btn btn-small ${submissionFilterForChallenge === 'non-winners' ? 'btn-primary' : 'btn-secondary'}`}
                                            onClick={() => setSubmissionFilter(prev => ({ ...prev, [challenge.id]: 'non-winners' }))}
                                          >
                                            Others ({submissions.length - winnerCount})
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                    {filteredSubmissions.length === 0 ? (
                                      <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
                                        {submissions.length === 0 ? 'No submissions yet' : 'No submissions match this filter'}
                                      </p>
                                    ) : (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                                        {filteredSubmissions.map((submission) => (
                                          <div key={submission.id} style={{ 
                                            padding: '16px', 
                                            background: submission.is_winner ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-secondary)', 
                                            borderRadius: '8px',
                                            border: submission.is_winner ? '2px solid var(--success)' : '1px solid var(--border)'
                                          }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                                              <p style={{ fontWeight: 500, flex: 1, whiteSpace: 'pre-wrap' }}>{submission.submission_text}</p>
                                              {submission.is_winner && (
                                                <span style={{ 
                                                  background: 'var(--success)', 
                                                  color: 'white', 
                                                  padding: '4px 8px', 
                                                  borderRadius: '4px',
                                                  fontSize: '12px',
                                                  fontWeight: 600,
                                                  marginLeft: '12px'
                                                }}>
                                                  🏆 Winner
                                                </span>
                                              )}
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                                              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                {new Date(submission.created_at).toLocaleString()}
                                              </span>
                                              <button
                                                onClick={() => markSubmissionWinner(submission.id, challenge.id, !submission.is_winner)}
                                                className="btn btn-small"
                                                style={{ 
                                                  background: submission.is_winner ? 'var(--bg-secondary)' : 'var(--success)',
                                                  color: submission.is_winner ? 'var(--text-primary)' : 'white'
                                                }}
                                              >
                                                {submission.is_winner ? 'Remove Winner' : 'Mark as Winner'}
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                </div>
              )}
            </div>
                                )}
                              </div>
                            )
                          })}
                          </div>
                        ) : (
                          <div className="empty-state-compact">
                            <div className="empty-icon">🏆</div>
                            <p>No challenges match this filter</p>
                            <p className="empty-hint">Try selecting a different filter or create a new challenge</p>
                          </div>
                        )}
                      </div>
                    ) : primaryVentLink && !showCreateChallenge && !editingChallenge ? (
                      <div className="empty-state-compact">
                        <div className="empty-icon">🏆</div>
                        <p>No challenges yet</p>
                        <p className="empty-hint">Create contests, giveaways, and challenges for your community</p>
                        <button
                          onClick={() => setShowCreateChallenge(true)}
                          className="btn"
                        >
                          Create Your First Challenge
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Raffles View */}
                {hubView === 'raffles' && (
                  <div className="hub-raffles-view">
                    <div className="hub-section-header">
                      <h3>Raffles</h3>
                      {primaryVentLink && (
                        <button 
                          className="btn btn-secondary"
                          onClick={() => setShowCreateRaffle(!showCreateRaffle)}
                        >
                          {showCreateRaffle ? 'Cancel' : '+ New Raffle'}
                        </button>
                      )}
                        </div>

                    {!primaryVentLink ? (
                      <div className="empty-state-compact">
                        <div className="empty-icon">🎲</div>
                        <p>Create a vent link first</p>
                        <button onClick={() => { setHubView('links'); setShowCreateLink(true); }} className="btn">Create Link</button>
                      </div>
                    ) : showCreateRaffle ? (
                      <div className="create-poll-form">
                        <div className="form-group">
                          <label>Raffle Title *</label>
                          <input
                            type="text"
                            className="input"
                            placeholder="e.g., Monthly Giveaway"
                            value={newRaffleTitle}
                            onChange={(e) => setNewRaffleTitle(e.target.value)}
                            disabled={creatingRaffle}
                          />
                        </div>
                        <div className="form-group">
                          <label>Description (optional)</label>
                          <textarea
                            className="input"
                            placeholder="What is this raffle about?"
                            value={newRaffleDescription}
                            onChange={(e) => setNewRaffleDescription(e.target.value)}
                            disabled={creatingRaffle}
                            rows={3}
                          />
                        </div>
                        <div className="form-group">
                          <label>Prize Description *</label>
                          <textarea
                            className="input"
                            placeholder="What can participants win?"
                            value={newRafflePrize}
                            onChange={(e) => setNewRafflePrize(e.target.value)}
                            disabled={creatingRaffle}
                            rows={2}
                          />
                        </div>
                        <div className="form-group">
                          <label>Number of Winners *</label>
                          <input
                            type="number"
                            className="input"
                            placeholder="1"
                            value={newRaffleWinnerCount}
                            onChange={(e) => setNewRaffleWinnerCount(e.target.value)}
                            disabled={creatingRaffle}
                            min="1"
                          />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                          <div className="form-group">
                            <label>Start Date (optional)</label>
                            <input
                              type="datetime-local"
                              className="input"
                              value={newRaffleStartsAt}
                              onChange={(e) => setNewRaffleStartsAt(e.target.value)}
                              disabled={creatingRaffle}
                            />
                          </div>
                          <div className="form-group">
                            <label>End Date (optional)</label>
                            <input
                              type="datetime-local"
                              className="input"
                              value={newRaffleEndsAt}
                              onChange={(e) => setNewRaffleEndsAt(e.target.value)}
                              disabled={creatingRaffle}
                            />
                          </div>
                          <div className="form-group">
                            <label>Draw Date (optional)</label>
                            <input
                              type="datetime-local"
                              className="input"
                              value={newRaffleDrawAt}
                              onChange={(e) => setNewRaffleDrawAt(e.target.value)}
                              disabled={creatingRaffle}
                            />
                          </div>
                        </div>
                        <button
                          onClick={createRaffle}
                          className="btn"
                          disabled={creatingRaffle || !newRaffleTitle.trim() || !newRafflePrize.trim()}
                        >
                          {creatingRaffle ? 'Creating...' : 'Create Raffle'}
                        </button>
                      </div>
                    ) : raffles.length > 0 ? (
                      <div className="polls-list">
                        {raffles.map((raffle) => {
                          const entries = raffleEntries[raffle.id] || []
                          const winners = entries.filter(e => e.is_winner)
                          const status = getRaffleStatus(raffle)
                          return (
                            <div key={raffle.id} className={`poll-card ${!raffle.is_active ? 'inactive' : ''}`} style={{
                              borderLeft: status === 'active' ? '4px solid var(--success)' : 
                                         status === 'upcoming' ? '4px solid var(--accent)' :
                                         status === 'drawn' ? '4px solid var(--accent)' :
                                         status === 'ended' ? '4px solid var(--text-secondary)' : '4px solid var(--border)'
                            }}>
                              <div className="poll-card-header">
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <h3>🎲 {raffle.title}</h3>
                                    <span style={{
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      background: status === 'active' ? 'rgba(16, 185, 129, 0.1)' :
                                                 status === 'upcoming' ? 'rgba(139, 92, 246, 0.1)' :
                                                 status === 'drawn' ? 'rgba(139, 92, 246, 0.2)' :
                                                 status === 'ended' ? 'rgba(107, 114, 128, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                                      color: status === 'active' ? 'var(--success)' :
                                             status === 'upcoming' ? 'var(--accent)' :
                                             status === 'drawn' ? 'var(--accent)' :
                                             status === 'ended' ? 'var(--text-secondary)' : 'var(--text-secondary)'
                                    }}>
                                      {status === 'active' ? '🟢 Active' :
                                       status === 'upcoming' ? '🔵 Upcoming' :
                                       status === 'drawn' ? '🎉 Drawn' :
                                       status === 'ended' ? '⚫ Ended' : '⚪ Inactive'}
                                    </span>
                                  </div>
                                  {raffle.description && (
                                    <p style={{ marginTop: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                                      {raffle.description}
                                    </p>
                                  )}
                                  {raffle.prize_description && (
                                    <p style={{ marginTop: '8px', color: 'var(--accent)', fontSize: '14px', fontWeight: 500 }}>
                                      🎁 Prize: {raffle.prize_description}
                                    </p>
                                  )}
                                </div>
                                <div className="poll-actions">
                                  <button
                                    onClick={() => toggleRaffleActive(raffle.id, raffle.is_active)}
                                    className="btn btn-small btn-secondary"
                                    title={raffle.is_active ? 'Pause' : 'Activate'}
                                    disabled={raffle.is_drawn}
                                  >
                                    {raffle.is_active ? '⏸️' : '▶️'}
                                  </button>
                                  {!raffle.is_drawn && entries.length > 0 && (
                                    <button
                                      onClick={() => drawRaffleWinners(raffle.id)}
                                      className="btn btn-small"
                                      title="Draw Winners"
                                      disabled={drawingRaffle === raffle.id}
                                    >
                                      {drawingRaffle === raffle.id ? '🎲 Drawing...' : '🎲 Draw'}
                                    </button>
                                  )}
                                  <button
                                    onClick={() => setSelectedRaffle(selectedRaffle?.id === raffle.id ? null : raffle)}
                                    className="btn btn-small"
                                    title="View Entries"
                                  >
                                    {selectedRaffle?.id === raffle.id ? '👁️ Hide' : '📝 Entries'}
                                  </button>
                                  <button
                                    onClick={() => deleteRaffle(raffle.id)}
                                    className="btn btn-small btn-danger"
                                    title="Delete"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                              <div className="poll-stats" style={{ flexWrap: 'wrap', gap: '8px' }}>
                                <span className="poll-stat">📝 {entries.length} entr{entries.length !== 1 ? 'ies' : 'y'}</span>
                                {winners.length > 0 && (
                                  <span className="poll-stat" style={{ color: 'var(--accent)' }}>
                                    🏆 {winners.length} winner{winners.length > 1 ? 's' : ''}
                                  </span>
                                )}
                                <span className="poll-stat">🎯 {raffle.winner_count} winner{raffle.winner_count > 1 ? 's' : ''} to draw</span>
                                {raffle.starts_at && (
                                  <span className="poll-stat" style={{ whiteSpace: 'nowrap' }}>
                                    📅 {new Date(raffle.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                )}
                                {raffle.ends_at && (
                                  <span className="poll-stat" style={{ whiteSpace: 'nowrap' }}>
                                    ⏰ {new Date(raffle.ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                )}
                                {raffle.draw_at && (
                                  <span className="poll-stat" style={{ whiteSpace: 'nowrap' }}>
                                    🎲 {new Date(raffle.draw_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                )}
                              </div>
                              {selectedRaffle?.id === raffle.id && (
                                <div className="poll-results" style={{ marginTop: '20px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h4>Entries ({entries.length})</h4>
                                  </div>
                                  {entries.length === 0 ? (
                                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
                                      No entries yet
                                    </p>
                                  ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                                      {entries.map((entry) => (
                                        <div key={entry.id} style={{ 
                                          padding: '14px', 
                                          background: entry.is_winner ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-secondary)', 
                                          borderRadius: '8px',
                                          border: entry.is_winner ? '2px solid var(--success)' : '1px solid var(--border)'
                                        }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                              <p style={{ fontWeight: entry.is_winner ? 600 : 500, marginBottom: '4px' }}>
                                                {entry.is_winner && '🏆 '}{entry.entry_name}
                                              </p>
                                              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                {new Date(entry.created_at).toLocaleString()}
                                              </span>
                                            </div>
                                            {entry.is_winner && (
                                              <span style={{ 
                                                background: 'var(--success)', 
                                                color: 'white', 
                                                padding: '4px 8px', 
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                                fontWeight: 600
                                              }}>
                                                Winner
                                              </span>
                                            )}
                      </div>
                    </div>
                  ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                </div>
              ) : primaryVentLink && !showCreateRaffle ? (
                      <div className="empty-state-compact">
                        <div className="empty-icon">🎲</div>
                        <p>No raffles yet</p>
                        <p className="empty-hint">Create raffles and giveaways for your community</p>
                        <button
                          onClick={() => setShowCreateRaffle(true)}
                          className="btn"
                        >
                          Create Your First Raffle
                        </button>
                </div>
              ) : null}
            </div>
                )}

                {/* Community Voting View */}
                {hubView === 'voting' && (
                  <div className="hub-voting-view">
                    <div className="hub-section-header">
                      <div className="hub-section-title">
                        <h3>Community Voting</h3>
                        {communityVotes.length > 0 && (
                          <div className="filter-buttons">
                            <button
                              className={`filter-btn ${voteView === 'all' ? 'active' : ''}`}
                              onClick={() => setVoteView('all')}
                            >
                              All
                            </button>
                            <button
                              className={`filter-btn ${voteView === 'active' ? 'active' : ''}`}
                              onClick={() => setVoteView('active')}
                            >
                              Active
                            </button>
                            <button
                              className={`filter-btn ${voteView === 'archived' ? 'active' : ''}`}
                              onClick={() => setVoteView('archived')}
                            >
                              Archived
                            </button>
                          </div>
                        )}
                      </div>
                      {primaryVentLink ? (
                        <button
                          onClick={() => {
                            if (editingVote) cancelEditVote()
                            setShowCreateVote(!showCreateVote)
                          }}
                          className="btn btn-secondary"
                        >
                          {showCreateVote ? 'Cancel' : '+ New Vote'}
                        </button>
                      ) : (
                        <button
                          onClick={() => { setHubView('links'); setShowCreateLink(true); }}
                          className="btn btn-secondary"
                        >
                          Create Link First
                        </button>
                      )}
          </div>

                    {!primaryVentLink ? (
                      <div className="empty-state-compact">
                        <div className="empty-icon">🗳️</div>
                        <p>Create a vent link first to create votes</p>
                        <button
                          onClick={() => { setHubView('links'); setShowCreateLink(true); }}
                          className="btn"
                        >
                          Create Vent Link
                        </button>
                      </div>
                    ) : showCreateVote && !editingVote && (
                      <div className="create-poll-form">
                        <div className="form-group">
                          <label htmlFor="vote-title">Vote Title *</label>
                          <input
                            id="vote-title"
                            type="text"
                            className="input"
                            placeholder="e.g., Which feature should we build next?"
                            value={newVoteTitle}
                            onChange={(e) => setNewVoteTitle(e.target.value)}
                            disabled={creatingVote}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="vote-description">Description (optional)</label>
                          <textarea
                            id="vote-description"
                            className="input"
                            placeholder="Add more context about this vote..."
                            value={newVoteDescription}
                            onChange={(e) => setNewVoteDescription(e.target.value)}
                            disabled={creatingVote}
                            rows={3}
                          />
                        </div>
                        <div className="form-group">
                          <label>Vote Options *</label>
                          {newVoteOptions.map((option, index) => (
                            <div key={index} className="poll-option-input">
                              <input
                                type="text"
                                className="input"
                                placeholder={`Option ${index + 1}`}
                                value={option}
                                onChange={(e) => updateVoteOption(index, e.target.value)}
                                disabled={creatingVote}
                              />
                              {newVoteOptions.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => removeVoteOption(index)}
                                  className="btn btn-danger btn-small"
                                  disabled={creatingVote}
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={addVoteOption}
                            className="btn btn-secondary btn-small"
                            disabled={creatingVote}
                          >
                            + Add Option
                          </button>
                        </div>
                        <div className="form-group">
                          <label htmlFor="vote-ends">End Date (optional)</label>
                          <input
                            id="vote-ends"
                            type="datetime-local"
                            className="input"
                            value={newVoteEndsAt}
                            onChange={(e) => setNewVoteEndsAt(e.target.value)}
                            disabled={creatingVote}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                          <button
                            onClick={createVote}
                            className="btn"
                            disabled={creatingVote || !newVoteTitle.trim() || newVoteOptions.filter(opt => opt.trim()).length < 2}
                          >
                            {creatingVote ? 'Creating...' : 'Create Vote'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Edit Vote Form */}
                    {editingVote && (
                      <div className="create-poll-form" style={{ marginBottom: '24px', border: '2px solid var(--accent)' }}>
                        <h3 style={{ marginBottom: '16px' }}>Edit Vote</h3>
                        <div className="form-group">
                          <label htmlFor="edit-vote-title">Vote Title *</label>
                          <input
                            id="edit-vote-title"
                            type="text"
                            className="input"
                            value={editVoteTitle}
                            onChange={(e) => setEditVoteTitle(e.target.value)}
                            disabled={updatingVote}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="edit-vote-description">Description (optional)</label>
                          <textarea
                            id="edit-vote-description"
                            className="input"
                            value={editVoteDescription}
                            onChange={(e) => setEditVoteDescription(e.target.value)}
                            disabled={updatingVote}
                            rows={3}
                          />
                        </div>
                        <div className="form-group">
                          <label>Vote Options *</label>
                          {editVoteOptions.map((option, index) => (
                            <div key={index} className="poll-option-input">
                              <input
                                type="text"
                                className="input"
                                placeholder={`Option ${index + 1}`}
                                value={option.text}
                                onChange={(e) => updateEditVoteOption(index, e.target.value)}
                                disabled={updatingVote}
                              />
                              {editVoteOptions.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => removeEditVoteOption(index)}
                                  className="btn btn-danger btn-small"
                                  disabled={updatingVote}
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={addEditVoteOption}
                            className="btn btn-secondary btn-small"
                            disabled={updatingVote}
                          >
                            + Add Option
                          </button>
                        </div>
                        <div className="form-group">
                          <label htmlFor="edit-vote-ends">End Date (optional)</label>
                          <input
                            id="edit-vote-ends"
                            type="datetime-local"
                            className="input"
                            value={editVoteEndsAt}
                            onChange={(e) => setEditVoteEndsAt(e.target.value)}
                            disabled={updatingVote}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                          <button
                            onClick={saveVoteEdit}
                            className="btn"
                            disabled={updatingVote || !editVoteTitle.trim() || editVoteOptions.filter(opt => opt.text.trim()).length < 2}
                          >
                            {updatingVote ? 'Saving...' : 'Save Changes'}
                          </button>
                          <button
                            onClick={cancelEditVote}
                            className="btn btn-secondary"
                            disabled={updatingVote}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {primaryVentLink && (() => {
                      const activeVotes = communityVotes.filter((v: CommunityVoteWithOptions) => getVoteStatus(v) === 'active')
                      const archivedVotes = communityVotes.filter((v: CommunityVoteWithOptions) => getVoteStatus(v) !== 'active')
                      const displayedVotes = voteView === 'active' ? activeVotes : voteView === 'archived' ? archivedVotes : communityVotes
                      
                      return displayedVotes.length > 0 ? (
                        <div className="polls-list">
                          {displayedVotes.map((vote) => (
                            <div key={vote.id} className={`poll-card ${!vote.is_active ? 'inactive' : ''}`}>
                              <div className="poll-card-header">
                                <div style={{ flex: 1 }}>
                                  <h3>{vote.title}</h3>
                                  {vote.description && (
                                    <p style={{ marginTop: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                                      {vote.description}
                                    </p>
                                  )}
                                  <div style={{ marginTop: '12px', display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '14px', color: 'var(--text-secondary)' }}>
                                    <span>Total Votes: <strong>{vote.total_votes || 0}</strong></span>
                                    {vote.ends_at && (
                                      <span>Ends: {new Date(vote.ends_at).toLocaleDateString()}</span>
                                    )}
                                    <span className={`status-badge ${getVoteStatus(vote)}`}>
                                      {getVoteStatus(vote) === 'active' ? 'Active' : getVoteStatus(vote) === 'expired' ? 'Expired' : 'Inactive'}
                                    </span>
                                  </div>
                                </div>
                                <div className="poll-actions">
                                  <button
                                    onClick={() => startEditingVote(vote)}
                                    className="btn btn-small btn-secondary"
                                    title="Edit Vote"
                                    disabled={editingVote !== null}
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    onClick={() => exportVoteResults(vote)}
                                    className="btn btn-small btn-secondary"
                                    title="Export Results"
                                  >
                                    📊 Export
                                  </button>
                                  <button
                                    onClick={() => toggleVoteActive(vote.id, !vote.is_active)}
                                    className={`btn btn-small ${vote.is_active ? 'btn-secondary' : ''}`}
                                    title={vote.is_active ? 'Deactivate' : 'Activate'}
                                  >
                                    {vote.is_active ? '⏸️' : '▶️'}
                                  </button>
                                  <button
                                    onClick={() => deleteVote(vote.id)}
                                    className="btn btn-small btn-danger"
                                    title="Delete Vote"
                                    disabled={deletingVote === vote.id}
                                  >
                                    {deletingVote === vote.id ? '...' : '🗑️'}
                                  </button>
                                </div>
                              </div>
                              <div className="poll-results" style={{ marginTop: '16px' }}>
                                {vote.options.map((option) => {
                                  const voteCount = vote.vote_counts?.[option.id] || 0
                                  const percentage = vote.total_votes && vote.total_votes > 0
                                    ? Math.round((voteCount / vote.total_votes) * 100)
                                    : 0
                                  return (
                                    <div key={option.id} className="poll-option-result" style={{ marginBottom: '12px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span>{option.option_text}</span>
                                        <span style={{ fontWeight: 'bold' }}>{voteCount} ({percentage}%)</span>
                                      </div>
                                      <div className="progress-bar" style={{ width: '100%', height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div
                                          style={{
                                            width: `${percentage}%`,
                                            height: '100%',
                                            background: 'var(--accent)',
                                            transition: 'width 0.3s ease',
                                          }}
                                        />
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : primaryVentLink && !showCreateVote && !editingVote ? (
                        <div className="empty-state-compact">
                          <div className="empty-icon">🗳️</div>
                          <p>No votes yet</p>
                          <p className="empty-hint">Let your community vote on decisions and ideas</p>
                          <button
                            onClick={() => setShowCreateVote(true)}
                            className="btn"
                          >
                            Create Your First Vote
                          </button>
                        </div>
                      ) : null
                    })()}
                  </div>
                )}

                {/* Feedback Forms View */}
                {hubView === 'feedback' && (
                  <div className="hub-feedback-view">
                    <div className="hub-section-header">
                      <div className="hub-section-title">
                        <h3>Feedback Forms</h3>
                        {primaryVentLink && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={feedbackAlwaysVisible[primaryVentLink.id] || false}
                                onChange={() => toggleFeedbackVisibility(primaryVentLink.id)}
                                style={{ cursor: 'pointer' }}
                              />
                              <span>Always show feedback tab</span>
                            </label>
                          </div>
                        )}
                      </div>
                      {primaryVentLink ? (
                        <button
                          onClick={() => {
                            if (editingFeedback) cancelEditFeedback()
                            setShowCreateFeedback(!showCreateFeedback)
                          }}
                          className="btn btn-secondary"
                        >
                          {showCreateFeedback ? 'Cancel' : '+ New Form'}
                        </button>
                      ) : (
                        <button
                          onClick={() => { setHubView('links'); setShowCreateLink(true); }}
                          className="btn btn-secondary"
                        >
                          Create Link First
                        </button>
                      )}
                    </div>

                    {!primaryVentLink ? (
                      <div className="empty-state-compact">
                        <div className="empty-icon">📝</div>
                        <p>Create a vent link first to create feedback forms</p>
                        <button
                          onClick={() => { setHubView('links'); setShowCreateLink(true); }}
                          className="btn"
                        >
                          Create Vent Link
                        </button>
                      </div>
                    ) : editingFeedback ? (
                      <div className="create-poll-form" style={{ marginBottom: '24px', border: '2px solid var(--accent)' }}>
                        <div className="form-section-title" style={{ marginBottom: '24px' }}>
                          <span>✏️</span>
                          <span>Edit Feedback Form</span>
                        </div>
                        <div className="form-section">
                          <div className="form-group">
                            <label htmlFor="edit-feedback-title">
                              <span className="label-icon">✏️</span>
                              <span>Form Title</span>
                              <span className="required-badge">*</span>
                            </label>
                            <span className="label-hint">Update the title of your feedback form</span>
                            <input
                              id="edit-feedback-title"
                              type="text"
                              className="input"
                              value={editFeedbackTitle}
                              onChange={(e) => setEditFeedbackTitle(e.target.value)}
                              disabled={updatingFeedback}
                              maxLength={100}
                            />
                            <div className="char-counter">
                              {editFeedbackTitle.length} / 100 characters
                            </div>
                          </div>
                          <div className="form-group">
                            <label htmlFor="edit-feedback-description">
                              <span className="label-icon">📄</span>
                              <span>Description</span>
                            </label>
                            <span className="label-hint">Update the description to help users understand what feedback you're looking for</span>
                            <textarea
                              id="edit-feedback-description"
                              className="input"
                              value={editFeedbackDescription}
                              onChange={(e) => setEditFeedbackDescription(e.target.value)}
                              disabled={updatingFeedback}
                              rows={4}
                              maxLength={500}
                            />
                            <div className="char-counter">
                              {editFeedbackDescription.length} / 500 characters
                            </div>
                          </div>
                          <div className="form-group">
                            <label htmlFor="edit-feedback-type">
                              <span className="label-icon">🏷️</span>
                              <span>Form Type</span>
                              <span className="required-badge">*</span>
                            </label>
                            <span className="label-hint">Change the form type if needed</span>
                            <select
                              id="edit-feedback-type"
                              className="input"
                              value={editFeedbackType}
                              onChange={(e) => setEditFeedbackType(e.target.value as 'survey' | 'feedback' | 'feature_request')}
                              disabled={updatingFeedback}
                            >
                              <option value="feedback">💬 General Feedback</option>
                              <option value="survey">📊 Survey</option>
                              <option value="feature_request">💡 Feature Request</option>
                            </select>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
                          <button
                            onClick={saveFeedbackEdit}
                            className="btn"
                            disabled={updatingFeedback || !editFeedbackTitle.trim()}
                            style={{ flex: 1 }}
                          >
                            {updatingFeedback ? '⏳ Saving...' : '💾 Save Changes'}
                          </button>
                          <button
                            onClick={cancelEditFeedback}
                            className="btn btn-secondary"
                            disabled={updatingFeedback}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : showCreateFeedback ? (
                      <div className="create-poll-form">
                        <div className="form-section">
                          <div className="form-section-title">
                            <span>📝</span>
                            <span>Basic Information</span>
                          </div>
                          <div className="form-group">
                            <label htmlFor="feedback-title">
                              <span className="label-icon">✏️</span>
                              <span>Form Title</span>
                              <span className="required-badge">*</span>
                            </label>
                            <span className="label-hint">Give your feedback form a clear, descriptive title</span>
                            <input
                              id="feedback-title"
                              type="text"
                              className="input"
                              placeholder="e.g., Feature Request Form, Product Feedback, Survey 2024"
                              value={newFeedbackTitle}
                              onChange={(e) => setNewFeedbackTitle(e.target.value)}
                              disabled={creatingFeedback}
                              maxLength={100}
                            />
                            <div className="char-counter">
                              {newFeedbackTitle.length} / 100 characters
                            </div>
                          </div>
                          <div className="form-group">
                            <label htmlFor="feedback-description">
                              <span className="label-icon">📄</span>
                              <span>Description</span>
                            </label>
                            <span className="label-hint">Explain what kind of feedback you're looking for. This helps users understand what to share.</span>
                            <textarea
                              id="feedback-description"
                              className="input"
                              placeholder="What kind of feedback are you looking for? What should users focus on?"
                              value={newFeedbackDescription}
                              onChange={(e) => setNewFeedbackDescription(e.target.value)}
                              disabled={creatingFeedback}
                              rows={4}
                              maxLength={500}
                            />
                            <div className="char-counter">
                              {newFeedbackDescription.length} / 500 characters
                            </div>
                          </div>
                        </div>
                        <div className="form-section">
                          <div className="form-section-title">
                            <span>⚙️</span>
                            <span>Form Settings</span>
                          </div>
                          <div className="form-group">
                            <label htmlFor="feedback-type">
                              <span className="label-icon">🏷️</span>
                              <span>Form Type</span>
                              <span className="required-badge">*</span>
                            </label>
                            <span className="label-hint">Choose the type that best matches your feedback form's purpose</span>
                            <select
                              id="feedback-type"
                              className="input"
                              value={newFeedbackType}
                              onChange={(e) => setNewFeedbackType(e.target.value as 'survey' | 'feedback' | 'feature_request')}
                              disabled={creatingFeedback}
                            >
                              <option value="feedback">💬 General Feedback - Open-ended feedback and suggestions</option>
                              <option value="survey">📊 Survey - Structured questions and responses</option>
                              <option value="feature_request">💡 Feature Request - Ideas for new features or improvements</option>
                            </select>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
                          <button
                            onClick={createFeedbackForm}
                            className="btn"
                            disabled={creatingFeedback || !newFeedbackTitle.trim()}
                            style={{ flex: 1 }}
                          >
                            {creatingFeedback ? '⏳ Creating...' : '✨ Create Form'}
                          </button>
                          <button
                            onClick={() => {
                              setShowCreateFeedback(false)
                              setNewFeedbackTitle('')
                              setNewFeedbackDescription('')
                              setNewFeedbackType('feedback')
                            }}
                            className="btn btn-secondary"
                            disabled={creatingFeedback}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : feedbackForms.length > 0 ? (
                      <div className="polls-list">
                        {feedbackForms.map((form) => (
                          <div key={form.id} className={`poll-card ${!form.is_active ? 'inactive' : ''}`}>
                            <div className="poll-card-header">
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                  <h3>📝 {form.title}</h3>
                                  <span style={{
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    background: form.is_active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                                    color: form.is_active ? 'var(--success)' : 'var(--text-secondary)'
                                  }}>
                                    {form.is_active ? '🟢 Active' : '⚪ Inactive'}
                                  </span>
                                  <span style={{
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    background: 'rgba(59,130,246,0.12)',
                                    color: 'var(--text-primary)'
                                  }}>
                                    {form.form_type === 'survey' ? '📊 Survey' :
                                     form.form_type === 'feature_request' ? '💡 Feature Request' :
                                     '💬 Feedback'}
                                  </span>
                                </div>
                                {form.description && (
                                  <p style={{ marginTop: '4px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                                    {form.description}
                                  </p>
                                )}
                                <div style={{ marginTop: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                                  <span>Responses: <strong>{feedbackResponseCounts[form.id] || 0}</strong></span>
                                </div>
                              </div>
                              <div className="poll-actions">
                                <button
                                  onClick={() => startEditingFeedback(form)}
                                  className="btn btn-small btn-secondary"
                                  title="Edit Form"
                                  disabled={editingFeedback !== null}
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  onClick={() => toggleFeedbackActive(form.id, !form.is_active)}
                                  className={`btn btn-small ${form.is_active ? 'btn-secondary' : ''}`}
                                  title={form.is_active ? 'Deactivate' : 'Activate'}
                                >
                                  {form.is_active ? '⏸️' : '▶️'}
                                </button>
                                <button
                                  onClick={() => deleteFeedbackForm(form.id)}
                                  className="btn btn-small btn-danger"
                                  title="Delete Form"
                                  disabled={deletingFeedback === form.id}
                                >
                                  {deletingFeedback === form.id ? '...' : '🗑️'}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state-compact">
                        <div className="empty-icon">📝</div>
                        <p>No feedback forms yet</p>
                        <p className="empty-hint">Create surveys and feedback forms for your community</p>
                        <button
                          onClick={() => setShowCreateFeedback(true)}
                          className="btn"
                        >
                          Create Your First Form
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Community Highlights View */}
                {hubView === 'highlights' && (
                  <div className="hub-highlights-view">
                    <div className="hub-section-header">
                      <h3>Community Highlights</h3>
                      {primaryVentLink && (
                        <button
                          className="btn btn-secondary"
                          onClick={() => setShowCreateHighlight(!showCreateHighlight)}
                        >
                          {showCreateHighlight ? 'Cancel' : '+ New Highlight'}
                        </button>
                      )}
                    </div>
                    {!primaryVentLink ? (
                      <div className="empty-state-compact">
                        <div className="empty-icon">⭐</div>
                        <p>Create a vent link first</p>
                        <button onClick={() => { setHubView('links'); setShowCreateLink(true); }} className="btn">Create Link</button>
                      </div>
                    ) : showCreateHighlight ? (
                      <div className="create-poll-form">
                        <div className="form-group">
                          <label>Select Message to Feature (optional)</label>
                          <select
                            className="input"
                            value={newHighlightMessageId || ''}
                            onChange={(e) => {
                              const messageId = e.target.value || null
                              setNewHighlightMessageId(messageId)
                              if (messageId) {
                                const selectedMessage = messages.find(m => m.id === messageId)
                                if (selectedMessage) {
                                  setNewHighlightText(selectedMessage.body)
                                  if (!newHighlightTitle.trim()) {
                                    setNewHighlightTitle(`Message from ${new Date(selectedMessage.created_at).toLocaleDateString()}`)
                                  }
                                }
                              }
                            }}
                            disabled={creatingHighlight}
                          >
                            <option value="">-- Select a message --</option>
                            {messages
                              .filter(m => {
                                // Only show messages from the primary vent link
                                return primaryVentLink && m.vent_link_id === primaryVentLink.id
                              })
                              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                              .slice(0, 50) // Limit to 50 most recent
                              .map((message) => (
                                <option key={message.id} value={message.id}>
                                  {truncateText(message.body, 60)} - {new Date(message.created_at).toLocaleDateString()}
                                </option>
                              ))}
                          </select>
                          {messages.filter(m => primaryVentLink && m.vent_link_id === primaryVentLink.id).length === 0 && (
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                              No messages available. Messages will appear here once you receive them.
                            </p>
                          )}
                        </div>
                        <div className="form-group">
                          <label>Highlight Title</label>
                          <input
                            type="text"
                            className="input"
                            placeholder="E.g., Heartfelt thank you note"
                            value={newHighlightTitle}
                            onChange={(e) => setNewHighlightTitle(e.target.value)}
                            disabled={creatingHighlight}
                          />
                        </div>
                        <div className="form-group">
                          <label>Highlight Text</label>
                          <textarea
                            className="input"
                            placeholder="Share the standout story or quote (or select a message above)"
                            value={newHighlightText}
                            onChange={(e) => setNewHighlightText(e.target.value)}
                            disabled={creatingHighlight}
                            rows={4}
                          />
                          {newHighlightMessageId && (
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                              ✓ Linked to message
                            </p>
                          )}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ margin: 0 }}>Featured</label>
                            <input
                              type="checkbox"
                              checked={newHighlightFeatured}
                              onChange={(e) => setNewHighlightFeatured(e.target.checked)}
                              disabled={creatingHighlight}
                            />
                          </div>
                          <div className="form-group">
                            <label>Display Order</label>
                            <input
                              type="number"
                              className="input"
                              value={newHighlightOrder}
                              onChange={(e) => setNewHighlightOrder(Number(e.target.value) || 0)}
                              disabled={creatingHighlight}
                              min={0}
                            />
                          </div>
                        </div>
                        <button
                          className="btn"
                          onClick={createHighlight}
                          disabled={creatingHighlight || (!newHighlightTitle.trim() && !newHighlightText.trim())}
                        >
                          {creatingHighlight ? 'Saving...' : 'Save Highlight'}
                        </button>
                      </div>
                    ) : highlights.length > 0 ? (
                      <div className="polls-list">
                        {highlights.map((highlight, idx) => (
                          <div
                            key={highlight.id}
                            className={`poll-card ${highlight.is_featured ? '' : 'inactive'}`}
                            style={{
                              borderLeft: highlight.is_featured
                                ? '4px solid var(--accent)'
                                : '4px solid var(--border)'
                            }}
                          >
                            <div className="poll-card-header">
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                  <h3>⭐ {highlight.title || 'Untitled Highlight'}</h3>
                                  <span
                                    style={{
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      background: highlight.is_featured ? 'rgba(236, 72, 153, 0.12)' : 'rgba(107, 114, 128, 0.1)',
                                      color: highlight.is_featured ? 'var(--accent)' : 'var(--text-secondary)'
                                    }}
                                  >
                                    {highlight.is_featured ? 'Featured' : 'Standard'}
                                  </span>
                                  <span
                                    style={{
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      background: 'rgba(59,130,246,0.12)',
                                      color: 'var(--text-primary)'
                                    }}
                                  >
                                    Order {highlight.display_order ?? 0}
                                  </span>
                                </div>
                                {highlight.highlight_text && (
                                  <p style={{ marginTop: '4px', color: 'var(--text-secondary)' }}>
                                    {highlight.highlight_text}
                                  </p>
                                )}
                                {highlight.message_id && (
                                  <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span>🔗</span>
                                    <span>Linked to message</span>
                                    <button
                                      onClick={() => {
                                        const linkedMessage = messages.find(m => m.id === highlight.message_id)
                                        if (linkedMessage) {
                                          setActiveTab('messages')
                                          setSelectedMessage(linkedMessage)
                                          // Mark as read if unread
                                          if (!linkedMessage.is_read) {
                                            markAsRead(linkedMessage.id, true)
                                          }
                                        }
                                      }}
                                      style={{
                                        marginLeft: '8px',
                                        padding: '2px 8px',
                                        fontSize: '11px',
                                        background: 'var(--accent)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      View Message
                                    </button>
                                  </p>
                                )}
                              </div>
                              <div className="poll-actions">
                                <button
                                  className="btn btn-small btn-secondary"
                                  onClick={() => toggleHighlightFeatured(highlight.id, highlight.is_featured)}
                                  disabled={updatingHighlight === highlight.id}
                                >
                                  {highlight.is_featured ? 'Unfeature' : 'Feature'}
                                </button>
                                <button
                                  className="btn btn-small"
                                  onClick={() => updateHighlightOrder(highlight.id, (highlight.display_order ?? idx) - 1)}
                                  disabled={updatingHighlight === highlight.id}
                                  title="Move up"
                                >
                                  ↑
                                </button>
                                <button
                                  className="btn btn-small"
                                  onClick={() => updateHighlightOrder(highlight.id, (highlight.display_order ?? idx) + 1)}
                                  disabled={updatingHighlight === highlight.id}
                                  title="Move down"
                                >
                                  ↓
                                </button>
                                <button
                                  className="btn btn-small btn-danger"
                                  onClick={() => deleteHighlight(highlight.id)}
                                  disabled={deletingHighlight === highlight.id}
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : primaryVentLink && !showCreateHighlight ? (
                      <div className="empty-state-compact">
                        <div className="empty-icon">⭐</div>
                        <p>No highlights yet</p>
                        <p className="empty-hint">Feature top messages and showcase community stories</p>
                        <button className="btn" onClick={() => setShowCreateHighlight(true)}>Create Highlight</button>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Live Reactions View */}
                {hubView === 'reactions' && (
                  <div className="hub-reactions-view">
                    <div className="hub-section-header">
                      <h3>Live Reactions</h3>
                      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        View reaction statistics across all messages
                      </p>
                    </div>
                    {messages.length === 0 ? (
                      <div className="empty-state-compact">
                        <div className="empty-icon">😊</div>
                        <p>No messages yet</p>
                        <p className="empty-hint">Reactions will appear here once messages are received</p>
                      </div>
                    ) : (
                      <div>
                        {/* Overall Stats */}
                        <div className="card" style={{ marginBottom: '20px', padding: '20px' }}>
                          <h4 style={{ marginBottom: '16px' }}>Overall Reaction Stats</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
                            {['❤️', '👍', '🎉', '🔥', '💯', '😊', '🙏', '✨'].map((emoji) => {
                              let totalCount = 0
                              Object.values(reactionStats).forEach((stats) => {
                                totalCount += stats[emoji] || 0
                              })
                              return (
                                <div
                                  key={emoji}
                                  style={{
                                    padding: '12px',
                                    background: 'var(--bg-secondary)',
                                    borderRadius: '8px',
                                    textAlign: 'center',
                                    border: '1px solid var(--border)'
                                  }}
                                >
                                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>{emoji}</div>
                                  <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                    {totalCount}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* Messages with Reactions */}
                        <div>
                          <h4 style={{ marginBottom: '16px' }}>Messages with Reactions</h4>
                          {messages.filter(msg => reactionStats[msg.id] && Object.keys(reactionStats[msg.id]).length > 0).length === 0 ? (
                            <div className="empty-state-compact">
                              <div className="empty-icon">😊</div>
                              <p>No reactions yet</p>
                              <p className="empty-hint">Reactions will appear here when your community reacts to messages</p>
                            </div>
                          ) : (
                            <div className="polls-list">
                              {messages
                                .filter(msg => reactionStats[msg.id] && Object.keys(reactionStats[msg.id]).length > 0)
                                .map((message) => {
                                  const stats = reactionStats[message.id] || {}
                                  const totalReactions = Object.values(stats).reduce((sum, count) => sum + count, 0)
                                  return (
                                    <div key={message.id} className="poll-card">
                                      <div className="poll-card-header">
                                        <div style={{ flex: 1 }}>
                                          <p style={{ marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                                            {truncateText(message.body, 100)}
                                          </p>
                                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {Object.entries(stats).map(([emoji, count]) => (
                                              <span
                                                key={emoji}
                                                style={{
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  gap: '4px',
                                                  padding: '6px 12px',
                                                  background: 'var(--bg-secondary)',
                                                  borderRadius: '6px',
                                                  border: '1px solid var(--border)',
                                                  fontSize: '14px'
                                                }}
                                              >
                                                <span>{emoji}</span>
                                                <span style={{ fontWeight: 600 }}>{count}</span>
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                        <div className="poll-stats">
                                          <span className="poll-stat">😊 {totalReactions} total</span>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Community Goals View */}
                {hubView === 'goals' && (
                  <div className="hub-goals-view">
                    <div className="hub-section-header">
                      <div className="hub-section-title">
                        <h3>Community Goals</h3>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          Set and track community milestones
                        </p>
                      </div>
                      {primaryVentLink ? (
                        <button
                          onClick={() => {
                            if (editingGoal) cancelEditGoal()
                            setShowCreateGoal(!showCreateGoal)
                          }}
                          className="btn btn-secondary"
                        >
                          {showCreateGoal ? 'Cancel' : '+ New Goal'}
                        </button>
                      ) : (
                        <button
                          onClick={() => { setHubView('links'); setShowCreateLink(true); }}
                          className="btn btn-secondary"
                        >
                          Create Link First
                        </button>
                      )}
                    </div>

                    {!primaryVentLink ? (
                      <div className="empty-state-compact">
                        <div className="empty-icon">🎯</div>
                        <p>Create a vent link first to create goals</p>
                        <button onClick={() => { setHubView('links'); setShowCreateLink(true); }} className="btn">Create Vent Link</button>
                      </div>
                    ) : showCreateGoal && !editingGoal && (
                      <div className="create-poll-form">
                        <div className="form-group">
                          <label htmlFor="goal-title">Goal Title *</label>
                          <input
                            id="goal-title"
                            type="text"
                            className="input"
                            placeholder="e.g., Reach 1000 messages"
                            value={newGoalTitle}
                            onChange={(e) => setNewGoalTitle(e.target.value)}
                            disabled={creatingGoal}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="goal-description">Description (optional)</label>
                          <textarea
                            id="goal-description"
                            className="input"
                            placeholder="What does this goal mean for your community?"
                            value={newGoalDescription}
                            onChange={(e) => setNewGoalDescription(e.target.value)}
                            disabled={creatingGoal}
                            rows={3}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="goal-type">Goal Type *</label>
                          <select
                            id="goal-type"
                            className="input"
                            value={newGoalType}
                            onChange={(e) => setNewGoalType(e.target.value as 'messages' | 'engagement' | 'polls' | 'custom')}
                            disabled={creatingGoal}
                          >
                            <option value="messages">📨 Total Messages</option>
                            <option value="engagement">😊 Total Reactions</option>
                            <option value="polls">📊 Active Polls</option>
                            <option value="custom">🎯 Custom (Manual)</option>
                          </select>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            {newGoalType === 'messages' && 'Tracks total number of messages received'}
                            {newGoalType === 'engagement' && 'Tracks total number of reactions on messages'}
                            {newGoalType === 'polls' && 'Tracks number of active polls'}
                            {newGoalType === 'custom' && 'Manually update progress'}
                          </p>
                        </div>
                        <div className="form-group">
                          <label htmlFor="goal-target">Target Value *</label>
                          <input
                            id="goal-target"
                            type="number"
                            className="input"
                            placeholder="100"
                            value={newGoalTargetValue}
                            onChange={(e) => setNewGoalTargetValue(e.target.value)}
                            disabled={creatingGoal}
                            min={1}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="goal-deadline">Deadline (optional)</label>
                          <input
                            id="goal-deadline"
                            type="datetime-local"
                            className="input"
                            value={newGoalDeadline}
                            onChange={(e) => setNewGoalDeadline(e.target.value)}
                            disabled={creatingGoal}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                          <button
                            onClick={createGoal}
                            className="btn"
                            disabled={creatingGoal || !newGoalTitle.trim() || !newGoalTargetValue}
                          >
                            {creatingGoal ? 'Creating...' : 'Create Goal'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Edit Goal Form */}
                    {editingGoal && (
                      <div className="create-poll-form" style={{ marginBottom: '24px', border: '2px solid var(--accent)' }}>
                        <h3 style={{ marginBottom: '16px' }}>Edit Goal</h3>
                        <div className="form-group">
                          <label htmlFor="edit-goal-title">Goal Title *</label>
                          <input
                            id="edit-goal-title"
                            type="text"
                            className="input"
                            value={editGoalTitle}
                            onChange={(e) => setEditGoalTitle(e.target.value)}
                            disabled={updatingGoal}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="edit-goal-description">Description (optional)</label>
                          <textarea
                            id="edit-goal-description"
                            className="input"
                            value={editGoalDescription}
                            onChange={(e) => setEditGoalDescription(e.target.value)}
                            disabled={updatingGoal}
                            rows={3}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="edit-goal-type">Goal Type *</label>
                          <select
                            id="edit-goal-type"
                            className="input"
                            value={editGoalType}
                            onChange={(e) => setEditGoalType(e.target.value as 'messages' | 'engagement' | 'polls' | 'custom')}
                            disabled={updatingGoal}
                          >
                            <option value="messages">📨 Total Messages</option>
                            <option value="engagement">😊 Total Reactions</option>
                            <option value="polls">📊 Active Polls</option>
                            <option value="custom">🎯 Custom (Manual)</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label htmlFor="edit-goal-target">Target Value *</label>
                          <input
                            id="edit-goal-target"
                            type="number"
                            className="input"
                            value={editGoalTargetValue}
                            onChange={(e) => setEditGoalTargetValue(e.target.value)}
                            disabled={updatingGoal}
                            min={1}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="edit-goal-deadline">Deadline (optional)</label>
                          <input
                            id="edit-goal-deadline"
                            type="datetime-local"
                            className="input"
                            value={editGoalDeadline}
                            onChange={(e) => setEditGoalDeadline(e.target.value)}
                            disabled={updatingGoal}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                          <button
                            onClick={saveGoalEdit}
                            className="btn"
                            disabled={updatingGoal || !editGoalTitle.trim() || !editGoalTargetValue}
                          >
                            {updatingGoal ? 'Saving...' : 'Save Changes'}
                          </button>
                          <button
                            onClick={cancelEditGoal}
                            className="btn btn-secondary"
                            disabled={updatingGoal}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {primaryVentLink && communityGoals.length > 0 ? (
                      <div className="polls-list">
                        {communityGoals.map((goal) => {
                          const progress = getGoalProgress(goal)
                          const status = getGoalStatus(goal)
                          const isOverdue = goal.deadline && new Date(goal.deadline) < new Date() && status !== 'completed'

                          return (
                            <div
                              key={goal.id}
                              className={`poll-card ${!goal.is_active ? 'inactive' : ''}`}
                              style={{
                                borderLeft: status === 'completed'
                                  ? '4px solid var(--success)'
                                  : status === 'expired'
                                  ? '4px solid var(--danger)'
                                  : '4px solid var(--accent)'
                              }}
                            >
                              <div className="poll-card-header">
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                    <h3>🎯 {goal.title}</h3>
                                    <span
                                      style={{
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        background: status === 'completed'
                                          ? 'rgba(16, 185, 129, 0.12)'
                                          : status === 'expired'
                                          ? 'rgba(239, 68, 68, 0.12)'
                                          : goal.is_active
                                          ? 'rgba(59, 130, 246, 0.12)'
                                          : 'rgba(107, 114, 128, 0.1)',
                                        color: status === 'completed'
                                          ? 'var(--success)'
                                          : status === 'expired'
                                          ? 'var(--danger)'
                                          : goal.is_active
                                          ? 'var(--accent)'
                                          : 'var(--text-secondary)'
                                      }}
                                    >
                                      {status === 'completed' ? '✅ Completed' :
                                       status === 'expired' ? '⏰ Expired' :
                                       status === 'inactive' ? '⚪ Inactive' :
                                       '🟢 Active'}
                                    </span>
                                    <span
                                      style={{
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        background: 'rgba(59,130,246,0.12)',
                                        color: 'var(--text-primary)'
                                      }}
                                    >
                                      {goal.goal_type === 'messages' ? '📨 Messages' :
                                       goal.goal_type === 'engagement' ? '😊 Engagement' :
                                       goal.goal_type === 'polls' ? '📊 Polls' :
                                       '🎯 Custom'}
                                    </span>
                                  </div>
                                  {goal.description && (
                                    <p style={{ marginTop: '4px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                                      {goal.description}
                                    </p>
                                  )}
                                  <div style={{ marginTop: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                        {goal.current_value} / {goal.target_value}
                                      </span>
                                      <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                                        {progress}%
                                      </span>
                                    </div>
                                    <div className="progress-bar" style={{ width: '100%', height: '12px', background: 'var(--bg-secondary)', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                                      <div
                                        style={{
                                          width: `${progress}%`,
                                          height: '100%',
                                          background: status === 'completed'
                                            ? 'var(--success)'
                                            : status === 'expired'
                                            ? 'var(--danger)'
                                            : 'var(--accent)',
                                          transition: 'width 0.3s ease',
                                        }}
                                      />
                                    </div>
                                  </div>
                                  {goal.deadline && (
                                    <p style={{ marginTop: '12px', fontSize: '12px', color: isOverdue ? 'var(--danger)' : 'var(--text-secondary)' }}>
                                      {isOverdue ? '⏰ ' : '📅 '}
                                      Deadline: {new Date(goal.deadline).toLocaleString()}
                                    </p>
                                  )}
                                  {goal.goal_type === 'custom' && (
                                    <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                      <input
                                        type="number"
                                        className="input"
                                        style={{ width: '100px', padding: '4px 8px', fontSize: '14px' }}
                                        value={goal.current_value}
                                        onChange={(e) => updateGoalProgress(goal.id, parseInt(e.target.value) || 0)}
                                        min={0}
                                        placeholder="Progress"
                                      />
                                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Update progress manually</span>
                                    </div>
                                  )}
                                </div>
                                <div className="poll-actions">
                                  <button
                                    className="btn btn-small btn-secondary"
                                    onClick={() => startEditGoal(goal)}
                                    disabled={editingGoal !== null || deletingGoal !== null}
                                    title="Edit Goal"
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    className={`btn btn-small ${goal.is_active ? 'btn-secondary' : ''}`}
                                    onClick={() => toggleGoalActive(goal.id, goal.is_active)}
                                    disabled={editingGoal !== null || deletingGoal !== null}
                                    title={goal.is_active ? 'Deactivate' : 'Activate'}
                                  >
                                    {goal.is_active ? '⏸️' : '▶️'}
                                  </button>
                                  <button
                                    className="btn btn-small btn-danger"
                                    onClick={() => deleteGoal(goal.id)}
                                    disabled={deletingGoal === goal.id || editingGoal !== null}
                                    title="Delete Goal"
                                  >
                                    {deletingGoal === goal.id ? '...' : '🗑️'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : primaryVentLink && !showCreateGoal && !editingGoal ? (
                      <div className="empty-state-compact">
                        <div className="empty-icon">🎯</div>
                        <p>No goals yet</p>
                        <p className="empty-hint">Set and track community milestones</p>
                        <button className="btn" onClick={() => setShowCreateGoal(true)}>Create Goal</button>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Events & Announcements View */}
                {hubView === 'events' && (
                  <div className="hub-events-view">
                    <div className="hub-section-header">
                      <div className="hub-section-title">
                        <h3>Events & Announcements</h3>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          Schedule community events and announcements
                        </p>
                      </div>
                      {primaryVentLink ? (
                        <button
                          onClick={() => {
                            if (editingEvent) cancelEditEvent()
                            setShowCreateEvent(!showCreateEvent)
                          }}
                          className="btn btn-secondary"
                        >
                          {showCreateEvent ? 'Cancel' : '+ New Event'}
                        </button>
                      ) : (
                        <button
                          onClick={() => { setHubView('links'); setShowCreateLink(true); }}
                          className="btn btn-secondary"
                        >
                          Create Link First
                        </button>
                      )}
                    </div>

                    {!primaryVentLink ? (
                      <div className="empty-state-compact">
                        <div className="empty-icon">📅</div>
                        <p>Create a vent link first to create events</p>
                        <button onClick={() => { setHubView('links'); setShowCreateLink(true); }} className="btn">Create Vent Link</button>
                      </div>
                    ) : showCreateEvent && !editingEvent && (
                      <div className="create-poll-form">
                        <div className="form-group">
                          <label htmlFor="event-title">Event/Announcement Title *</label>
                          <input
                            id="event-title"
                            type="text"
                            className="input"
                            placeholder="e.g., Community Meetup or Important Update"
                            value={newEventTitle}
                            onChange={(e) => setNewEventTitle(e.target.value)}
                            disabled={creatingEvent}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="event-description">Description (optional)</label>
                          <textarea
                            id="event-description"
                            className="input"
                            placeholder="Add details about the event or announcement..."
                            value={newEventDescription}
                            onChange={(e) => setNewEventDescription(e.target.value)}
                            disabled={creatingEvent}
                            rows={4}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="event-type">Type *</label>
                          <select
                            id="event-type"
                            className="input"
                            value={newEventType}
                            onChange={(e) => setNewEventType(e.target.value as 'event' | 'announcement' | 'update')}
                            disabled={creatingEvent}
                          >
                            <option value="event">📅 Event</option>
                            <option value="announcement">📢 Announcement</option>
                            <option value="update">🔄 Update</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label htmlFor="event-date">Date & Time (optional)</label>
                          <input
                            id="event-date"
                            type="datetime-local"
                            className="input"
                            value={newEventDate}
                            onChange={(e) => setNewEventDate(e.target.value)}
                            disabled={creatingEvent}
                          />
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            Leave empty for announcements without a specific date
                          </p>
                        </div>
                        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="checkbox"
                            id="event-pinned"
                            checked={newEventPinned}
                            onChange={(e) => setNewEventPinned(e.target.checked)}
                            disabled={creatingEvent}
                          />
                          <label htmlFor="event-pinned" style={{ margin: 0, cursor: 'pointer' }}>
                            Pin to top
                          </label>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                          <button
                            onClick={createEvent}
                            className="btn"
                            disabled={creatingEvent || !newEventTitle.trim()}
                          >
                            {creatingEvent ? 'Creating...' : 'Create Event'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Edit Event Form */}
                    {editingEvent && (
                      <div className="create-poll-form" style={{ marginBottom: '24px', border: '2px solid var(--accent)' }}>
                        <h3 style={{ marginBottom: '16px' }}>Edit Event</h3>
                        <div className="form-group">
                          <label htmlFor="edit-event-title">Event/Announcement Title *</label>
                          <input
                            id="edit-event-title"
                            type="text"
                            className="input"
                            value={editEventTitle}
                            onChange={(e) => setEditEventTitle(e.target.value)}
                            disabled={updatingEvent}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="edit-event-description">Description (optional)</label>
                          <textarea
                            id="edit-event-description"
                            className="input"
                            value={editEventDescription}
                            onChange={(e) => setEditEventDescription(e.target.value)}
                            disabled={updatingEvent}
                            rows={4}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="edit-event-type">Type *</label>
                          <select
                            id="edit-event-type"
                            className="input"
                            value={editEventType}
                            onChange={(e) => setEditEventType(e.target.value as 'event' | 'announcement' | 'update')}
                            disabled={updatingEvent}
                          >
                            <option value="event">📅 Event</option>
                            <option value="announcement">📢 Announcement</option>
                            <option value="update">🔄 Update</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label htmlFor="edit-event-date">Date & Time (optional)</label>
                          <input
                            id="edit-event-date"
                            type="datetime-local"
                            className="input"
                            value={editEventDate}
                            onChange={(e) => setEditEventDate(e.target.value)}
                            disabled={updatingEvent}
                          />
                        </div>
                        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="checkbox"
                            id="edit-event-pinned"
                            checked={editEventPinned}
                            onChange={(e) => setEditEventPinned(e.target.checked)}
                            disabled={updatingEvent}
                          />
                          <label htmlFor="edit-event-pinned" style={{ margin: 0, cursor: 'pointer' }}>
                            Pin to top
                          </label>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                          <button
                            onClick={saveEventEdit}
                            className="btn"
                            disabled={updatingEvent || !editEventTitle.trim()}
                          >
                            {updatingEvent ? 'Saving...' : 'Save Changes'}
                          </button>
                          <button
                            onClick={cancelEditEvent}
                            className="btn btn-secondary"
                            disabled={updatingEvent}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {primaryVentLink && communityEvents.length > 0 ? (
                      <div className="polls-list">
                        {communityEvents.map((event) => {
                          const status = getEventStatus(event)
                          const isPast = status === 'past'
                          const isUpcoming = status === 'upcoming'

                          return (
                            <div
                              key={event.id}
                              className={`poll-card ${!event.is_active ? 'inactive' : ''}`}
                              style={{
                                borderLeft: event.is_pinned
                                  ? '4px solid var(--accent)'
                                  : isPast
                                  ? '4px solid var(--text-secondary)'
                                  : isUpcoming
                                  ? '4px solid var(--success)'
                                  : '4px solid var(--border)'
                              }}
                            >
                              <div className="poll-card-header">
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                    <h3>
                                      {event.event_type === 'event' ? '📅' :
                                       event.event_type === 'announcement' ? '📢' :
                                       '🔄'} {event.title}
                                    </h3>
                                    {event.is_pinned && (
                                      <span
                                        style={{
                                          padding: '4px 8px',
                                          borderRadius: '4px',
                                          fontSize: '11px',
                                          fontWeight: 600,
                                          background: 'rgba(236, 72, 153, 0.12)',
                                          color: 'var(--accent)'
                                        }}
                                      >
                                        📌 Pinned
                                      </span>
                                    )}
                                    <span
                                      style={{
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        background: status === 'past'
                                          ? 'rgba(107, 114, 128, 0.1)'
                                          : status === 'upcoming'
                                          ? 'rgba(16, 185, 129, 0.12)'
                                          : event.is_active
                                          ? 'rgba(59, 130, 246, 0.12)'
                                          : 'rgba(107, 114, 128, 0.1)',
                                        color: status === 'past'
                                          ? 'var(--text-secondary)'
                                          : status === 'upcoming'
                                          ? 'var(--success)'
                                          : event.is_active
                                          ? 'var(--accent)'
                                          : 'var(--text-secondary)'
                                      }}
                                    >
                                      {status === 'past' ? '⏰ Past' :
                                       status === 'upcoming' ? '🟢 Upcoming' :
                                       status === 'no-date' ? '📅 No Date' :
                                       '⚪ Inactive'}
                                    </span>
                                    <span
                                      style={{
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        background: 'rgba(59,130,246,0.12)',
                                        color: 'var(--text-primary)'
                                      }}
                                    >
                                      {event.event_type === 'event' ? '📅 Event' :
                                       event.event_type === 'announcement' ? '📢 Announcement' :
                                       '🔄 Update'}
                                    </span>
                                  </div>
                                  {event.description && (
                                    <p style={{ marginTop: '4px', color: 'var(--text-secondary)', fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                                      {event.description}
                                    </p>
                                  )}
                                  {event.event_date && (
                                    <p style={{ marginTop: '12px', fontSize: '13px', color: isPast ? 'var(--text-secondary)' : 'var(--text-primary)', fontWeight: 500 }}>
                                      {isPast ? '⏰ ' : '📅 '}
                                      {new Date(event.event_date).toLocaleString()}
                                    </p>
                                  )}
                                  <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    Created: {new Date(event.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="poll-actions">
                                  <button
                                    className="btn btn-small btn-secondary"
                                    onClick={() => startEditEvent(event)}
                                    disabled={editingEvent !== null || deletingEvent !== null}
                                    title="Edit Event"
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    className={`btn btn-small ${event.is_pinned ? '' : 'btn-secondary'}`}
                                    onClick={() => toggleEventPinned(event.id, event.is_pinned)}
                                    disabled={editingEvent !== null || deletingEvent !== null}
                                    title={event.is_pinned ? 'Unpin' : 'Pin'}
                                  >
                                    {event.is_pinned ? '📌' : '📌'}
                                  </button>
                                  <button
                                    className={`btn btn-small ${event.is_active ? 'btn-secondary' : ''}`}
                                    onClick={() => toggleEventActive(event.id, event.is_active)}
                                    disabled={editingEvent !== null || deletingEvent !== null}
                                    title={event.is_active ? 'Deactivate' : 'Activate'}
                                  >
                                    {event.is_active ? '⏸️' : '▶️'}
                                  </button>
                                  <button
                                    className="btn btn-small btn-danger"
                                    onClick={() => deleteEvent(event.id)}
                                    disabled={deletingEvent === event.id || editingEvent !== null}
                                    title="Delete Event"
                                  >
                                    {deletingEvent === event.id ? '...' : '🗑️'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : primaryVentLink && !showCreateEvent && !editingEvent ? (
                      <div className="empty-state-compact">
                        <div className="empty-icon">📅</div>
                        <p>No events yet</p>
                        <p className="empty-hint">Schedule community events and announcements</p>
                        <button className="btn" onClick={() => setShowCreateEvent(true)}>Create Event</button>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Community Wall View */}
                {hubView === 'wall' && (
                  <div className="hub-wall-view">
                    <div className="hub-section-header">
                      <div className="hub-section-title">
                        <h3>Community Wall</h3>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          Showcase featured messages from your community
                        </p>
                      </div>
                      {primaryVentLink && (
                        <button
                          onClick={() => setHubView('highlights')}
                          className="btn btn-secondary"
                        >
                          Manage Highlights
                        </button>
                      )}
                    </div>

                    {!primaryVentLink ? (
                      <div className="empty-state-compact">
                        <div className="empty-icon">🧱</div>
                        <p>Create a vent link first to build your community wall</p>
                        <button onClick={() => { setHubView('links'); setShowCreateLink(true); }} className="btn">Create Vent Link</button>
                      </div>
                    ) : highlights.filter(h => h.is_featured && primaryVentLink && h.vent_link_id === primaryVentLink.id).length === 0 ? (
                      <div className="empty-state-compact">
                        <div className="empty-icon">🧱</div>
                        <p>No featured messages yet</p>
                        <p className="empty-hint">Feature messages in the Highlights section to display them on your Community Wall</p>
                        <button className="btn" onClick={() => setHubView('highlights')}>Go to Highlights</button>
                      </div>
                    ) : (
                      <div className="wall-grid">
                        {highlights
                          .filter(h => h.is_featured && primaryVentLink && h.vent_link_id === primaryVentLink.id)
                          .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                          .map((highlight) => {
                            const linkedMessage = highlight.message_id
                              ? messages.find(m => m.id === highlight.message_id)
                              : null

                            return (
                              <div
                                key={highlight.id}
                                className="wall-card"
                                style={{
                                  background: 'var(--bg-primary)',
                                  border: '1px solid var(--border)',
                                  borderRadius: '12px',
                                  padding: '20px',
                                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                  cursor: 'pointer',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'translateY(-4px)'
                                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'translateY(0)'
                                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)'
                                }}
                                onClick={() => {
                                  if (linkedMessage) {
                                    setActiveTab('messages')
                                    setSelectedMessage(linkedMessage)
                                  }
                                }}
                              >
                                {highlight.title && (
                                  <h4 style={{
                                    marginBottom: '12px',
                                    fontSize: '18px',
                                    fontWeight: 600,
                                    color: 'var(--text-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                  }}>
                                    <span>⭐</span>
                                    {highlight.title}
                                  </h4>
                                )}
                                <div style={{
                                  fontSize: '15px',
                                  lineHeight: '1.6',
                                  color: 'var(--text-secondary)',
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word'
                                }}>
                                  {highlight.highlight_text || (linkedMessage ? linkedMessage.body : '')}
                                </div>
                                {linkedMessage && (
                                  <div style={{
                                    marginTop: '16px',
                                    paddingTop: '16px',
                                    borderTop: '1px solid var(--border)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    fontSize: '12px',
                                    color: 'var(--text-secondary)'
                                  }}>
                                    <span>
                                      📅 {new Date(linkedMessage.created_at).toLocaleDateString()}
                                    </span>
                                    <span style={{
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      background: 'var(--bg-secondary)',
                                      color: 'var(--accent)',
                                      fontWeight: 500
                                    }}>
                                      View Message →
                                    </span>
                                  </div>
                                )}
                                {!linkedMessage && highlight.highlight_text && (
                                  <div style={{
                                    marginTop: '16px',
                                    paddingTop: '16px',
                                    borderTop: '1px solid var(--border)',
                                    fontSize: '12px',
                                    color: 'var(--text-secondary)'
                                  }}>
                                    📅 {new Date(highlight.created_at).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                      </div>
                    )}
                  </div>
                )}

                {/* Collaborative Projects View */}
                {hubView === 'projects' && (
                  <div className="hub-projects-view">
                    <div className="hub-section-header">
                      <div className="hub-section-title">
                        <h3>Collaborative Projects</h3>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          Start community-driven projects and collaborations
                        </p>
                      </div>
                      {primaryVentLink ? (
                        <button
                          onClick={() => {
                            if (editingProject) cancelEditProject()
                            setShowCreateProject(!showCreateProject)
                          }}
                          className="btn btn-secondary"
                        >
                          {showCreateProject ? 'Cancel' : '+ New Project'}
                        </button>
                      ) : (
                        <button
                          onClick={() => { setHubView('links'); setShowCreateLink(true); }}
                          className="btn btn-secondary"
                        >
                          Create Link First
                        </button>
                      )}
                    </div>

                    {!primaryVentLink ? (
                      <div className="empty-state-compact">
                        <div className="empty-icon">🤝</div>
                        <p>Create a vent link first to create projects</p>
                        <button onClick={() => { setHubView('links'); setShowCreateLink(true); }} className="btn">Create Vent Link</button>
                      </div>
                    ) : showCreateProject && !editingProject && (
                      <div className="create-poll-form">
                        <div className="form-group">
                          <label htmlFor="project-title">Project Title *</label>
                          <input
                            id="project-title"
                            type="text"
                            className="input"
                            placeholder="e.g., Community Art Project or Feature Request"
                            value={newProjectTitle}
                            onChange={(e) => setNewProjectTitle(e.target.value)}
                            disabled={creatingProject}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="project-description">Description (optional)</label>
                          <textarea
                            id="project-description"
                            className="input"
                            placeholder="Describe the project, goals, and how the community can contribute..."
                            value={newProjectDescription}
                            onChange={(e) => setNewProjectDescription(e.target.value)}
                            disabled={creatingProject}
                            rows={5}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="project-type">Project Type *</label>
                          <select
                            id="project-type"
                            className="input"
                            value={newProjectType}
                            onChange={(e) => setNewProjectType(e.target.value as 'idea' | 'project' | 'collaboration')}
                            disabled={creatingProject}
                          >
                            <option value="idea">💡 Idea</option>
                            <option value="project">🚀 Project</option>
                            <option value="collaboration">🤝 Collaboration</option>
                          </select>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            {newProjectType === 'idea' && 'Share ideas and gather feedback'}
                            {newProjectType === 'project' && 'Active project seeking contributions'}
                            {newProjectType === 'collaboration' && 'Community collaboration opportunity'}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                          <button
                            onClick={createProject}
                            className="btn"
                            disabled={creatingProject || !newProjectTitle.trim()}
                          >
                            {creatingProject ? 'Creating...' : 'Create Project'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Edit Project Form */}
                    {editingProject && (
                      <div className="create-poll-form" style={{ marginBottom: '24px', border: '2px solid var(--accent)' }}>
                        <h3 style={{ marginBottom: '16px' }}>Edit Project</h3>
                        <div className="form-group">
                          <label htmlFor="edit-project-title">Project Title *</label>
                          <input
                            id="edit-project-title"
                            type="text"
                            className="input"
                            value={editProjectTitle}
                            onChange={(e) => setEditProjectTitle(e.target.value)}
                            disabled={updatingProject}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="edit-project-description">Description (optional)</label>
                          <textarea
                            id="edit-project-description"
                            className="input"
                            value={editProjectDescription}
                            onChange={(e) => setEditProjectDescription(e.target.value)}
                            disabled={updatingProject}
                            rows={5}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="edit-project-type">Project Type *</label>
                          <select
                            id="edit-project-type"
                            className="input"
                            value={editProjectType}
                            onChange={(e) => setEditProjectType(e.target.value as 'idea' | 'project' | 'collaboration')}
                            disabled={updatingProject}
                          >
                            <option value="idea">💡 Idea</option>
                            <option value="project">🚀 Project</option>
                            <option value="collaboration">🤝 Collaboration</option>
                          </select>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                          <button
                            onClick={saveProjectEdit}
                            className="btn"
                            disabled={updatingProject || !editProjectTitle.trim()}
                          >
                            {updatingProject ? 'Saving...' : 'Save Changes'}
                          </button>
                          <button
                            onClick={cancelEditProject}
                            className="btn btn-secondary"
                            disabled={updatingProject}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {primaryVentLink && collaborativeProjects.length > 0 ? (
                      <div className="polls-list">
                        {collaborativeProjects.map((project) => {
                          const contributions = projectContributions[project.id] || []
                          const isSelected = selectedProject === project.id

                          return (
                            <div
                              key={project.id}
                              className={`poll-card ${!project.is_active ? 'inactive' : ''}`}
                              style={{
                                borderLeft: project.is_active
                                  ? '4px solid var(--accent)'
                                  : '4px solid var(--border)'
                              }}
                            >
                              <div className="poll-card-header">
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                    <h3>
                                      {project.project_type === 'idea' ? '💡' :
                                       project.project_type === 'project' ? '🚀' :
                                       '🤝'} {project.title}
                                    </h3>
                                    <span
                                      style={{
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        background: project.is_active
                                          ? 'rgba(59, 130, 246, 0.12)'
                                          : 'rgba(107, 114, 128, 0.1)',
                                        color: project.is_active
                                          ? 'var(--accent)'
                                          : 'var(--text-secondary)'
                                      }}
                                    >
                                      {project.is_active ? '🟢 Active' : '⚪ Inactive'}
                                    </span>
                                    <span
                                      style={{
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        background: 'rgba(59,130,246,0.12)',
                                        color: 'var(--text-primary)'
                                      }}
                                    >
                                      {project.project_type === 'idea' ? '💡 Idea' :
                                       project.project_type === 'project' ? '🚀 Project' :
                                       '🤝 Collaboration'}
                                    </span>
                                    <span
                                      style={{
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        background: 'rgba(16, 185, 129, 0.12)',
                                        color: 'var(--success)'
                                      }}
                                    >
                                      💬 {contributions.length} {contributions.length === 1 ? 'contribution' : 'contributions'}
                                    </span>
                                  </div>
                                  {project.description && (
                                    <p style={{ marginTop: '4px', color: 'var(--text-secondary)', fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                                      {project.description}
                                    </p>
                                  )}
                                  <p style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    Created: {new Date(project.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="poll-actions">
                                  <button
                                    className="btn btn-small btn-secondary"
                                    onClick={() => {
                                      if (isSelected) {
                                        setSelectedProject(null)
                                      } else {
                                        setSelectedProject(project.id)
                                        if (project.is_active) {
                                          fetchContributionsForProject(project.id)
                                        }
                                      }
                                    }}
                                    disabled={editingProject !== null || deletingProject !== null}
                                    title={isSelected ? 'Hide Contributions' : 'View Contributions'}
                                  >
                                    {isSelected ? '👁️' : '💬'}
                                  </button>
                                  <button
                                    className="btn btn-small btn-secondary"
                                    onClick={() => startEditProject(project)}
                                    disabled={editingProject !== null || deletingProject !== null}
                                    title="Edit Project"
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    className={`btn btn-small ${project.is_active ? 'btn-secondary' : ''}`}
                                    onClick={() => toggleProjectActive(project.id, project.is_active)}
                                    disabled={editingProject !== null || deletingProject !== null}
                                    title={project.is_active ? 'Deactivate' : 'Activate'}
                                  >
                                    {project.is_active ? '⏸️' : '▶️'}
                                  </button>
                                  <button
                                    className="btn btn-small btn-danger"
                                    onClick={() => deleteProject(project.id)}
                                    disabled={deletingProject === project.id || editingProject !== null}
                                    title="Delete Project"
                                  >
                                    {deletingProject === project.id ? '...' : '🗑️'}
                                  </button>
                                </div>
                              </div>
                              {isSelected && project.is_active && (
                                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                                  <h4 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 600 }}>Contributions</h4>
                                  {contributions.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                      {contributions.map((contribution) => (
                                        <div
                                          key={contribution.id}
                                          style={{
                                            padding: '12px',
                                            background: 'var(--bg-secondary)',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border)'
                                          }}
                                        >
                                          <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                            {contribution.contribution_text}
                                          </p>
                                          <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                            {new Date(contribution.created_at).toLocaleString()}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                      <p>No contributions yet</p>
                                      <p style={{ fontSize: '12px', marginTop: '4px' }}>Community members can contribute to this project on your public page</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : primaryVentLink && !showCreateProject && !editingProject ? (
                      <div className="empty-state-compact">
                        <div className="empty-icon">🤝</div>
                        <p>No projects yet</p>
                        <p className="empty-hint">Start community-driven projects and collaborations</p>
                        <button className="btn" onClick={() => setShowCreateProject(true)}>Create Project</button>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Theme Summary Section */}
          {messages.length > 0 && activeTab === 'overview' && (
            <div className="card">
              <div className="theme-summary-header">
                <h2>AI Insights</h2>
                <button
                  onClick={handleSummarizeThemes}
                  className="btn btn-secondary"
                  disabled={loadingSummary}
                >
                  {loadingSummary ? 'Generating...' : 'Summarize last 20 messages'}
                </button>
              </div>
              {themeSummary && (
                <div className="theme-summary-content">
                  <div className="ai-output">{themeSummary}</div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'overview' ? (
            /* Main Content: Messages List and Detail */
            <div className="dashboard-main-layout">
            {/* Messages List - Left Side */}
            <div className="card messages-panel">
              <div className="messages-header">
                <h2>Messages {unreadCount > 0 && <span className="badge badge-unread">{unreadCount} unread</span>}</h2>
              </div>

              {messages.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">💬</div>
                  <p className="empty-title">No messages yet</p>
                  <p className="empty-hint">
                    {primaryVentLink 
                      ? 'Share your link to start receiving anonymous messages!'
                      : 'Create a vent link first to start receiving messages!'}
                  </p>
                </div>
              ) : (
                <div className="messages-list">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`message-item ${!message.is_read ? 'unread' : ''} ${message.is_flagged ? 'flagged' : ''} ${selectedMessage?.id === message.id ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedMessage(message)
                        setAiReplies(null) // Clear AI replies when selecting new message
                        // Mark as read if unread
                        if (!message.is_read) {
                          markAsRead(message.id, true)
                        }
                      }}
                    >
                      <div className="message-preview">
                        <p>{truncateText(message.body)}</p>
                        <div className="message-meta">
                          {message.mood && <span className="badge">{message.mood}</span>}
                          <span className="timestamp">{formatTimeAgo(message.created_at)}</span>
                          {!message.is_read && <span className="badge badge-unread">New</span>}
                          {message.is_flagged && <span className="badge badge-flagged">Flagged</span>}
                          {message.ai_moderation_flagged && (
                            <span className="badge" style={{
                              background: message.ai_moderation_severity === 'critical' || message.ai_self_harm_risk === 'critical'
                                ? '#c0392b'
                                : message.ai_moderation_severity === 'high' || message.ai_self_harm_risk === 'high'
                                ? '#ff4757'
                                : message.ai_self_harm_risk === 'medium'
                                ? '#ffa502'
                                : '#ffc107',
                              color: 'white',
                              fontWeight: 600
                            }}>
                              {message.ai_moderation_severity === 'critical' || message.ai_self_harm_risk === 'critical' ? '🚨 Critical'
                              : message.ai_self_harm_risk === 'high' || message.ai_self_harm_risk === 'medium' ? '⚠️ Crisis'
                              : message.ai_moderation_severity === 'high' ? '🔴 High'
                              : '🤖 Flagged'}
                            </span>
                          )}
                          {message.ai_category && (
                            <span className="badge" style={{
                              background: '#667eea',
                              color: 'white',
                              fontSize: '11px'
                            }}>
                              {message.ai_category === 'question' && '❓'}
                              {message.ai_category === 'compliment' && '💬'}
                              {message.ai_category === 'criticism' && '💭'}
                              {message.ai_category === 'support' && '🤗'}
                              {message.ai_category === 'feedback' && '📝'}
                              {message.ai_category === 'suggestion' && '💡'}
                              {' ' + message.ai_category}
                            </span>
                          )}
                          {message.ai_urgency === 'high' && (
                            <span className="badge" style={{
                              background: '#ff5722',
                              color: 'white'
                            }}>
                              🔴 High Priority
                            </span>
                          )}
                          {message.ai_priority_score !== null && message.ai_priority_score !== undefined && (
                            <span className="badge" style={{
                              background: message.ai_priority_score >= 70 
                                ? 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)'
                                : message.ai_priority_score >= 50
                                ? 'linear-gradient(135deg, #feca57 0%, #ff9ff3 100%)'
                                : '#95a5a6',
                              color: 'white',
                              fontWeight: 600,
                              fontSize: '11px'
                            }}>
                              ⭐ {message.ai_priority_score}/100
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Message Detail Panel - Right Side */}
            {selectedMessage && (
              <div className="card message-detail">
                <div className="message-detail-header-modern">
                  <div className="message-header-content">
                    <h3 className="message-title">Message</h3>
                    <div className="message-header-meta">
                      <span className="message-time-icon">🕐</span>
                      <span className="message-time">{formatTimeAgo(selectedMessage.created_at)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedMessage(null)
                      setAiReplies(null)
                      setEditingNote(null)
                    }}
                    className="btn-close-modern"
                    title="Close"
                  >
                    ×
                  </button>
                </div>
                
                <div className="message-body-modern">
                  <p>{selectedMessage.body}</p>
                  {selectedMessage.mood && (
                    <div className="message-mood-badge">
                      <span className="mood-icon">😊</span>
                      <span>{selectedMessage.mood}</span>
                    </div>
                  )}
                </div>

                {/* Enhanced AI Moderation Alert */}
                {selectedMessage.ai_moderation_flagged && (
                  <div className="ai-moderation-alert" style={{
                    margin: '16px 0',
                    padding: '16px',
                    background: selectedMessage.ai_moderation_severity === 'critical' || selectedMessage.ai_self_harm_risk === 'critical'
                      ? 'linear-gradient(135deg, #c0392b 0%, #e74c3c 100%)'
                      : selectedMessage.ai_moderation_severity === 'high' || selectedMessage.ai_self_harm_risk === 'high'
                      ? 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)'
                      : selectedMessage.ai_self_harm_risk === 'medium'
                      ? 'linear-gradient(135deg, #ffa502 0%, #ff6348 100%)'
                      : '#fff3cd',
                    border: `2px solid ${
                      selectedMessage.ai_moderation_severity === 'critical' || selectedMessage.ai_self_harm_risk === 'critical' ? '#c0392b'
                      : selectedMessage.ai_moderation_severity === 'high' || selectedMessage.ai_self_harm_risk === 'high' ? '#ff4757'
                      : selectedMessage.ai_self_harm_risk === 'medium' ? '#ffa502'
                      : '#ffc107'
                    }`,
                    borderRadius: '8px',
                    color: (selectedMessage.ai_moderation_severity === 'critical' || selectedMessage.ai_moderation_severity === 'high' || selectedMessage.ai_self_harm_risk === 'high' || selectedMessage.ai_self_harm_risk === 'medium') ? 'white' : '#856404',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <span style={{ fontSize: '24px' }}>
                        {selectedMessage.ai_moderation_severity === 'critical' || selectedMessage.ai_self_harm_risk === 'critical' ? '🚨'
                        : selectedMessage.ai_self_harm_risk === 'high' || selectedMessage.ai_self_harm_risk === 'medium' ? '⚠️'
                        : '🚩'}
                      </span>
                      <strong style={{ fontSize: '15px' }}>
                        {selectedMessage.ai_moderation_severity === 'critical' || selectedMessage.ai_self_harm_risk === 'critical'
                          ? 'CRITICAL: Immediate Attention Required'
                          : selectedMessage.ai_self_harm_risk === 'high' || selectedMessage.ai_self_harm_risk === 'medium'
                          ? 'CRISIS ALERT: High Self-Harm Risk Detected'
                          : selectedMessage.ai_moderation_severity === 'high'
                          ? 'HIGH SEVERITY: Content Flagged'
                          : 'AI Moderation Flag'}
                      </strong>
                    </div>
                    
                    {selectedMessage.ai_self_harm_risk && selectedMessage.ai_self_harm_risk !== 'none' && (
                      <div style={{ fontSize: '13px', marginTop: '8px', padding: '10px', background: 'rgba(0,0,0,0.1)', borderRadius: '6px' }}>
                        <div style={{ marginBottom: '6px' }}>
                          <strong>Self-Harm Risk Level:</strong> {selectedMessage.ai_self_harm_risk.toUpperCase()}
                        </div>
                        {(selectedMessage.ai_self_harm_risk === 'high' || selectedMessage.ai_self_harm_risk === 'critical') && (
                          <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px' }}>
                            <strong style={{ fontSize: '12px' }}>Crisis Resources:</strong>
                            <div style={{ fontSize: '11px', marginTop: '4px', lineHeight: '1.6' }}>
                              • National Suicide Prevention Lifeline: 988<br/>
                              • Crisis Text Line: Text HOME to 741741<br/>
                              • If this is an emergency, call 911 immediately
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {selectedMessage.ai_moderation_severity && (
                      <div style={{ fontSize: '13px', marginTop: '8px' }}>
                        <strong>Severity:</strong> {selectedMessage.ai_moderation_severity.toUpperCase()}
                        {selectedMessage.ai_moderation_requires_review && (
                          <span style={{ marginLeft: '8px', padding: '2px 8px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px', fontSize: '11px' }}>
                            Requires Human Review
                          </span>
                        )}
                      </div>
                    )}
                    
                    {selectedMessage.ai_moderation_categories && (
                      <div style={{ marginTop: '8px', fontSize: '12px' }}>
                        <strong>Detected Issues:</strong>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                          {Object.entries(selectedMessage.ai_moderation_categories)
                            .filter(([_, flagged]) => flagged)
                            .map(([category]) => (
                              <span key={category} style={{
                                padding: '4px 8px',
                                background: 'rgba(255,255,255,0.2)',
                                borderRadius: '4px',
                                fontSize: '11px'
                              }}>
                                {category.replace(/_/g, ' ')}
                              </span>
                            ))}
                        </div>
                      </div>
                    )}
                    
                    {selectedMessage.ai_moderation_score !== null && selectedMessage.ai_moderation_score !== undefined && (
                      <div style={{ fontSize: '12px', marginTop: '8px', opacity: 0.9 }}>
                        <strong>Moderation Score:</strong> {(selectedMessage.ai_moderation_score * 100).toFixed(1)}%
                        {selectedMessage.ai_moderation_false_positive_risk && selectedMessage.ai_moderation_false_positive_risk !== 'low' && (
                          <span style={{ marginLeft: '8px', fontSize: '11px', opacity: 0.8 }}>
                            (False positive risk: {selectedMessage.ai_moderation_false_positive_risk})
                          </span>
                        )}
                      </div>
                    )}
                    
                    {selectedMessage.ai_moderation_recommended_action && selectedMessage.ai_moderation_recommended_action !== 'none' && (
                      <div style={{ fontSize: '12px', marginTop: '8px', fontStyle: 'italic', opacity: 0.9 }}>
                        Recommended Action: {selectedMessage.ai_moderation_recommended_action}
                      </div>
                    )}
                  </div>
                )}

                {/* AI Priority Score */}
                {selectedMessage.ai_priority_score !== null && selectedMessage.ai_priority_score !== undefined && (
                  <div className="ai-priority-score" style={{
                    margin: '16px 0',
                    padding: '12px 16px',
                    background: selectedMessage.ai_priority_score >= 70
                      ? 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)'
                      : selectedMessage.ai_priority_score >= 50
                      ? 'linear-gradient(135deg, #feca57 0%, #ff9ff3 100%)'
                      : 'linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: 'white'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px' }}>⭐</span>
                        <div>
                          <strong style={{ fontSize: '14px' }}>Priority Score</strong>
                          <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>
                            {selectedMessage.ai_priority_score >= 70 && 'High Priority - Needs Response'}
                            {selectedMessage.ai_priority_score >= 50 && selectedMessage.ai_priority_score < 70 && 'Medium Priority'}
                            {selectedMessage.ai_priority_score < 50 && 'Low Priority'}
                          </div>
                        </div>
                      </div>
                      <div style={{
                        fontSize: '32px',
                        fontWeight: 700,
                        textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }}>
                        {selectedMessage.ai_priority_score}
                      </div>
                    </div>
                    <div style={{
                      marginTop: '12px',
                      height: '6px',
                      background: 'rgba(255, 255, 255, 0.3)',
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${selectedMessage.ai_priority_score}%`,
                        background: 'white',
                        borderRadius: '3px',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                )}

                {/* AI Categorization Info */}
                {(selectedMessage.ai_category || selectedMessage.ai_sentiment || selectedMessage.ai_urgency) && (
                  <div className="ai-categorization-info" style={{
                    margin: '16px 0',
                    padding: '12px 16px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: '1px solid #764ba2',
                    borderRadius: '8px',
                    color: 'white'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '18px' }}>🤖</span>
                      <strong style={{ fontSize: '14px' }}>AI Analysis</strong>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '13px' }}>
                      {selectedMessage.ai_category && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ opacity: 0.9 }}>Category:</span>
                          <span style={{
                            padding: '4px 10px',
                            background: 'rgba(255, 255, 255, 0.2)',
                            borderRadius: '12px',
                            fontWeight: 600,
                            textTransform: 'capitalize'
                          }}>
                            {selectedMessage.ai_category}
                          </span>
                        </div>
                      )}
                      {selectedMessage.ai_sentiment && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ opacity: 0.9 }}>Sentiment:</span>
                          <span style={{
                            padding: '4px 10px',
                            background: selectedMessage.ai_sentiment === 'positive' 
                              ? 'rgba(76, 175, 80, 0.3)'
                              : selectedMessage.ai_sentiment === 'negative'
                              ? 'rgba(244, 67, 54, 0.3)'
                              : 'rgba(158, 158, 158, 0.3)',
                            borderRadius: '12px',
                            fontWeight: 600,
                            textTransform: 'capitalize'
                          }}>
                            {selectedMessage.ai_sentiment === 'positive' && '😊 '}
                            {selectedMessage.ai_sentiment === 'negative' && '😔 '}
                            {selectedMessage.ai_sentiment === 'neutral' && '😐 '}
                            {selectedMessage.ai_sentiment === 'mixed' && '😕 '}
                            {selectedMessage.ai_sentiment}
                          </span>
                        </div>
                      )}
                      {selectedMessage.ai_urgency && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ opacity: 0.9 }}>Urgency:</span>
                          <span style={{
                            padding: '4px 10px',
                            background: selectedMessage.ai_urgency === 'high'
                              ? 'rgba(255, 87, 34, 0.3)'
                              : selectedMessage.ai_urgency === 'medium'
                              ? 'rgba(255, 152, 0, 0.3)'
                              : 'rgba(158, 158, 158, 0.3)',
                            borderRadius: '12px',
                            fontWeight: 600,
                            textTransform: 'capitalize'
                          }}>
                            {selectedMessage.ai_urgency === 'high' && '🔴 '}
                            {selectedMessage.ai_urgency === 'medium' && '🟡 '}
                            {selectedMessage.ai_urgency === 'low' && '🟢 '}
                            {selectedMessage.ai_urgency}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Info Sections */}
                <div className="message-info-sections">
                  {/* Folders Section */}
                  <div className="message-info-card">
                    <div className="info-card-header">
                      <span className="info-card-icon">📁</span>
                      <h4 className="info-card-title">Folders</h4>
                    </div>
                    <div className="info-card-content">
                      {messageFolders.length === 0 ? (
                        <p className="info-empty-state">No folders yet. Create one in the messages view.</p>
                      ) : (
                        <div className="message-tags-list-modern">
                          {messageFolders.map(folder => {
                            const isAssigned = messageFolderAssignments[selectedMessage.id]?.includes(folder.id)
                            return (
                              <span
                                key={folder.id}
                                className={`message-tag-modern folder-tag ${isAssigned ? 'active' : ''}`}
                                onClick={() => {
                                  if (isAssigned) {
                                    removeMessageFromFolder(selectedMessage.id, folder.id)
                                  } else {
                                    assignMessageToFolder(selectedMessage.id, folder.id)
                                  }
                                }}
                              >
                                {isAssigned ? '✓' : '○'} {folder.folder_name}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tags Section */}
                  <div className="message-info-card">
                    <div className="info-card-header">
                      <span className="info-card-icon">🏷️</span>
                      <h4 className="info-card-title">Tags</h4>
                    </div>
                    <div className="info-card-content">
                      <div className="message-tags-list-modern">
                        {messageTags[selectedMessage.id]?.map((tag, idx) => (
                          <span key={idx} className="message-tag-modern">
                            #{tag}
                            <button
                              className="tag-remove-modern"
                              onClick={() => removeTagFromMessage(selectedMessage.id, tag)}
                              title="Remove tag"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="add-tag-input-modern">
                        <input
                          type="text"
                          placeholder="Add tag..."
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              const input = e.target as HTMLInputElement
                              if (input.value.trim()) {
                                addTagToMessage(selectedMessage.id, input.value.trim())
                                input.value = ''
                              }
                            }
                          }}
                          className="tag-input-modern"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Reactions Section */}
                  <div className="message-info-card">
                    <div className="info-card-header">
                      <span className="info-card-icon">😊</span>
                      <h4 className="info-card-title">Reactions</h4>
                    </div>
                    <div className="info-card-content">
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                        {['❤️', '👍', '🎉', '🔥', '💯', '😊', '🙏', '✨'].map((emoji) => {
                          const count = reactionStats[selectedMessage.id]?.[emoji] || 0
                          return (
                            <button
                              key={emoji}
                              onClick={() => addReaction(selectedMessage.id, emoji)}
                              className="btn btn-small"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                background: count > 0 ? 'var(--accent)' : 'var(--bg-secondary)',
                                color: count > 0 ? 'white' : 'var(--text-primary)',
                                border: '1px solid var(--border)',
                                borderRadius: '6px',
                                cursor: 'pointer'
                              }}
                              title={`Add ${emoji} reaction`}
                            >
                              <span>{emoji}</span>
                              {count > 0 && <span style={{ fontSize: '12px', fontWeight: 600 }}>{count}</span>}
                            </button>
                          )
                        })}
                      </div>
                      {reactionStats[selectedMessage.id] && Object.keys(reactionStats[selectedMessage.id]).length === 0 && (
                        <p className="info-empty-state">No reactions yet</p>
                      )}
                    </div>
                  </div>

                  {/* Notes Section */}
                  <div className="message-info-card">
                    <div className="info-card-header">
                      <span className="info-card-icon">📝</span>
                      <h4 className="info-card-title">Private Notes</h4>
                    </div>
                    <div className="info-card-content">
                      {editingNote === selectedMessage.id ? (
                        <div className="note-editor-modern">
                          <textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Add a private note about this message..."
                            className="note-textarea-modern"
                            rows={3}
                          />
                          <div className="note-actions-modern">
                            <button
                              className="btn btn-small"
                              onClick={() => saveNote(selectedMessage.id)}
                            >
                              Save
                            </button>
                            <button
                              className="btn btn-small btn-secondary"
                              onClick={() => {
                                setEditingNote(null)
                                setNoteText('')
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="note-display-modern">
                          {messageNotes[selectedMessage.id] ? (
                            <div>
                              <p className="note-text-modern">{messageNotes[selectedMessage.id]}</p>
                              <button
                                className="btn btn-small btn-secondary"
                                onClick={() => {
                                  setEditingNote(selectedMessage.id)
                                  setNoteText(messageNotes[selectedMessage.id] || '')
                                }}
                              >
                                Edit Note
                              </button>
                            </div>
                          ) : (
                            <button
                              className="btn btn-small btn-secondary"
                              onClick={() => {
                                setEditingNote(selectedMessage.id)
                                setNoteText('')
                              }}
                            >
                              Add Note
                            </button>
                          )}
                        </div>
                      )}
          </div>
                </div>
                </div>

                {/* Actions */}
                <div className="message-actions-modern">
                    <button
                    onClick={() => markAsRead(selectedMessage.id, !selectedMessage.is_read)}
                    className="action-btn-modern"
                    title={selectedMessage.is_read ? 'Mark as unread' : 'Mark as read'}
                    >
                    <span className="action-icon">✓</span>
                    <span className="action-label">{selectedMessage.is_read ? 'Mark as unread' : 'Mark as read'}</span>
                    </button>
                    <button
                    onClick={() => flagMessage(selectedMessage.id)}
                    className="action-btn-modern danger"
                    disabled={selectedMessage.is_flagged}
                    title={selectedMessage.is_flagged ? 'Already flagged' : 'Flag as abusive'}
                  >
                    <span className="action-icon">🚩</span>
                    <span className="action-label">{selectedMessage.is_flagged ? 'Flagged' : 'Flag as abusive'}</span>
                    </button>
                    <button
                    className="action-btn-modern"
                    onClick={() => handleGenerateReply(selectedMessage.body)}
                    disabled={loadingAi}
                    title="Generate AI reply"
                  >
                    <span className="action-icon">🤖</span>
                    <span className="action-label">{loadingAi ? 'Generating...' : 'Generate reply'}</span>
                    </button>
                    <button
                    className="action-btn-modern primary"
                    onClick={() => setShowResponseModal(true)}
                    title="Send private response"
                    >
                    <span className="action-icon">💬</span>
                    <span className="action-label">Send Private Response</span>
                    </button>
                  </div>

                {/* AI Replies Section */}
                {aiReplies && (
                  <div className="ai-replies-section">
                    <h4>Suggested Reply Templates</h4>
                    <div className="ai-output">{aiReplies}</div>
                  </div>
                )}

                {/* Responses Section */}
                {selectedMessage && messageResponsesData[selectedMessage.id] && messageResponsesData[selectedMessage.id].length > 0 && (
                  <div className="responses-section" style={{ marginTop: '24px', padding: '20px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>💬</span>
                      <span>Responses ({messageResponsesData[selectedMessage.id].length})</span>
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {messageResponsesData[selectedMessage.id].map((response) => (
                        <div key={response.id} style={{ padding: '16px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)', position: 'relative' }}>
                          <div style={{ fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', marginBottom: '8px' }}>
                            {response.response_text}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>{new Date(response.created_at).toLocaleString()}</span>
                            {profile && response.owner_id === profile.id && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteResponse(response.id, selectedMessage.id)
                                }}
                                style={{
                                  padding: '4px 12px',
                                  fontSize: '12px',
                                  background: 'var(--danger)',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  transition: 'opacity 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.opacity = '0.8'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.opacity = '1'
                                }}
                                title="Delete response"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                </div>
            )}

            {/* Response Modal */}
            {showResponseModal && selectedMessage && (
              <div className="modal-overlay" onClick={() => setShowResponseModal(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h3>Send Private Response</h3>
                    <button
                      className="btn-close"
                      onClick={() => setShowResponseModal(false)}
                    >
                      ×
                    </button>
                </div>
                  <div className="modal-body">
                    <p className="modal-hint">
                      Your response will be saved and visible to the message sender when they check their message.
                    </p>
                    {responseTemplates.length > 0 && (
                      <div className="template-selector">
                        <label>Use Template:</label>
                        <select
                          className="select"
                          onChange={(e) => {
                            const template = responseTemplates.find(t => t.id === e.target.value)
                            if (template) setResponseText(template.text)
                          }}
                        >
                          <option value="">Select a template...</option>
                          {responseTemplates.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                          </div>
                    )}
                    <textarea
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      placeholder="Type your response..."
                      className="response-textarea"
                      rows={6}
                    />
                  </div>
                  <div className="modal-actions">
                            <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowResponseModal(false)
                        setResponseText('')
                      }}
                    >
                      Cancel
                            </button>
                            <button
                      className="btn"
                      onClick={() => sendResponse(selectedMessage.id)}
                      disabled={!responseText.trim()}
                    >
                      Save Response
                            </button>
                          </div>
                        </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Message Detail Modal for All Messages View */}
          {activeTab === 'messages' && selectedMessage && (
            <div className="message-modal-overlay" onClick={() => {
              setSelectedMessage(null)
              setAiReplies(null)
            }}>
              <div className="message-modal" onClick={(e) => e.stopPropagation()}>
                <div className="message-modal-header">
                  <h3>Message Details</h3>
                  <button
                    onClick={() => {
                      setSelectedMessage(null)
                      setAiReplies(null)
                    }}
                    className="btn-close"
                  >
                    ×
                  </button>
                </div>
                <div className="message-body">
                  <p>{selectedMessage.body}</p>
                </div>
                <div className="message-detail-meta">
                  {selectedMessage.mood && (
                    <span className="badge">Mood: {selectedMessage.mood}</span>
                  )}
                  <span className="timestamp">{formatTimeAgo(selectedMessage.created_at)}</span>
                </div>
                <div className="message-actions">
                  <button
                    onClick={() => markAsRead(selectedMessage.id, !selectedMessage.is_read)}
                    className="btn btn-secondary"
                  >
                    {selectedMessage.is_read ? 'Mark as unread' : 'Mark as read'}
                  </button>
                  <button
                    onClick={() => flagMessage(selectedMessage.id)}
                    className="btn btn-danger"
                    disabled={selectedMessage.is_flagged}
                  >
                    {selectedMessage.is_flagged ? 'Flagged' : 'Flag as abusive'}
                  </button>
                  <button
                    className="btn"
                    onClick={() => handleGenerateReply(selectedMessage.body)}
                    disabled={loadingAi}
                  >
                    {loadingAi ? 'Generating...' : 'Generate reply'}
                  </button>
                </div>
                {aiReplies && (
                  <div className="ai-replies-section">
                    <h4>Suggested Reply Templates</h4>
                    <div className="ai-output">{aiReplies}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

