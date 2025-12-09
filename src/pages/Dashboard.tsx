import { useState, useEffect } from 'react'
import { supabase, VentLink, VentMessage, Profile, PollWithOptions, MessageFolder, MessageFolderAssignment, QASession, QAQuestion, Challenge, ChallengeSubmission, CommunityVoteWithOptions, FeedbackForm, CommunityHighlight, MessageReaction, CommunityGoal, CommunityEvent, CollaborativeProject } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { generateReplyTemplates, summarizeThemes } from '../lib/ai'
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
  const [messageSort, setMessageSort] = useState<'newest' | 'oldest'>('newest')
  const [showSettings, setShowSettings] = useState(false)
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
  const [messageFolders, setMessageFolders] = useState<MessageFolder[]>([])
  const [messageFolderAssignments, setMessageFolderAssignments] = useState<{ [messageId: string]: string[] }>({})
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string | null>(null)
  const [hubView, setHubView] = useState<'links' | 'polls' | 'qa' | 'challenges' | 'voting' | 'feedback' | 'highlights' | 'reactions' | 'goals' | 'events' | 'wall' | 'projects'>('links')
  
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
  const [communityVotes, setCommunityVotes] = useState<CommunityVoteWithOptions[]>([])
  const [feedbackForms, setFeedbackForms] = useState<FeedbackForm[]>([])
  const [highlights, setHighlights] = useState<CommunityHighlight[]>([])
  const [communityGoals, setCommunityGoals] = useState<CommunityGoal[]>([])
  const [communityEvents, setCommunityEvents] = useState<CommunityEvent[]>([])
  const [collaborativeProjects, setCollaborativeProjects] = useState<CollaborativeProject[]>([])
  
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
          (payload) => {
            if (payload.eventType === 'INSERT') {
              // New message added
              setMessages((prev) => [payload.new as VentMessage, ...prev])
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
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              // Fetch full poll data with options and votes
              const poll = payload.new as any
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
          const vote = payload.new as any
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
        const emailDisplay = document.getElementById('user-email-display')
        if (emailDisplay) {
          emailDisplay.textContent = email || 'Not available'
        }
      })
    }
  }, [activeTab])

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
        .select('id, slug, title, owner_id, is_active, created_at')
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
      alert('Response saved! (Note: Anonymous senders cannot receive responses directly)')
    } catch (err: any) {
      console.error('Error saving response:', err)
      alert('Error saving response: ' + (err.message || 'Unknown error'))
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
        <div className="loading">Loading...</div>
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

              <div className="settings-content">
                {/* Profile Settings */}
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
                      <span className="settings-hint">Your unique identifier (cannot be changed)</span>
                    </div>
                    <div className="settings-item-value">
                      <span>@{profile?.handle || 'Not set'}</span>
                    </div>
                  </div>
                  <div className="settings-item">
                    <div className="settings-item-label">
                      <label>Email</label>
                      <span className="settings-hint">Your account email address</span>
                    </div>
                    <div className="settings-item-value">
                      <span id="user-email-display">Loading...</span>
                    </div>
                  </div>
                </div>

                {/* Vent Link Settings */}
                {ventLinks.length > 0 && (
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
                      </>
                    )}
                  </div>
                )}

                {/* Account Settings */}
                <div className="settings-section">
                  <h3>Account</h3>
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
                        Send Reset Email
                      </button>
                    </div>
                  </div>
                </div>

                {/* Statistics */}
                <div className="settings-section">
                  <h3>Statistics</h3>
                  <div className="settings-item">
                    <div className="settings-item-label">
                      <label>Total Messages</label>
                    </div>
                    <div className="settings-item-value">
                      <span>{totalMessages}</span>
                    </div>
                  </div>
                  <div className="settings-item">
                    <div className="settings-item-label">
                      <label>Unread Messages</label>
                    </div>
                    <div className="settings-item-value">
                      <span>{unreadCount}</span>
                    </div>
                  </div>
                  <div className="settings-item">
                    <div className="settings-item-label">
                      <label>Active Polls</label>
                    </div>
                    <div className="settings-item-value">
                      <span>{activePolls.length}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="settings-section">
                  <h3>Actions</h3>
                  <div className="settings-actions">
                    <button onClick={handleLogout} className="btn btn-danger">
                      Logout
                    </button>
                  </div>
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
              ) : (
                <div className="all-messages-grid">
                  {filteredMessages
                    .filter((msg) => {
                      if (messageFilter === 'all') return !msg.is_archived
                      if (messageFilter === 'unread') return !msg.is_read && !msg.is_archived
                      if (messageFilter === 'read') return msg.is_read && !msg.is_archived
                      if (messageFilter === 'flagged') return msg.is_flagged && !msg.is_archived
                      if (messageFilter === 'starred') return msg.is_starred && !msg.is_archived
                      if (messageFilter === 'archived') return msg.is_archived
                      if (messageFilter === 'needs-response') return !msg.is_archived && !messageResponses[msg.id]
                      return true
                    })
                    .sort((a, b) => {
                      const dateA = new Date(a.created_at).getTime()
                      const dateB = new Date(b.created_at).getTime()
                      return messageSort === 'newest' ? dateB - dateA : dateA - dateB
                    })
                    .map((message) => (
                      <div
                        key={message.id}
                        className={`message-card ${!message.is_read ? 'unread' : ''} ${message.is_flagged ? 'flagged' : ''} ${selectedMessages.has(message.id) ? 'selected' : ''}`}
                        onClick={(e) => {
                          // Don't select message if clicking checkbox
                          if ((e.target as HTMLElement).closest('.message-checkbox')) return
                          setSelectedMessage(message)
                          setAiReplies(null)
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
                          <p>{message.body}</p>
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
              )}
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
                        <div className="form-group">
                          <label>Session Title *</label>
                          <input
                            type="text"
                            className="input"
                            placeholder="e.g., Ask Me Anything!"
                            value={newQASessionTitle}
                            onChange={(e) => setNewQASessionTitle(e.target.value)}
                            disabled={creatingQASession}
                          />
                        </div>
                        <div className="form-group">
                          <label>Description (optional)</label>
                          <textarea
                            className="input"
                            placeholder="What is this Q&A session about?"
                            value={newQASessionDescription}
                            onChange={(e) => setNewQASessionDescription(e.target.value)}
                            disabled={creatingQASession}
                            rows={3}
                          />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div className="form-group">
                            <label>Start Date (optional)</label>
                            <input
                              type="datetime-local"
                              className="input"
                              value={newQASessionStartsAt}
                              onChange={(e) => setNewQASessionStartsAt(e.target.value)}
                              disabled={creatingQASession}
                            />
                          </div>
                          <div className="form-group">
                            <label>End Date (optional)</label>
                            <input
                              type="datetime-local"
                              className="input"
                              value={newQASessionEndsAt}
                              onChange={(e) => setNewQASessionEndsAt(e.target.value)}
                              disabled={creatingQASession}
                            />
                          </div>
                        </div>
                        <button
                          onClick={createQASession}
                          className="btn"
                          disabled={creatingQASession || !newQASessionTitle.trim()}
                        >
                          {creatingQASession ? 'Creating...' : 'Create Session'}
                        </button>
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
                    ) : (
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
                    )}
                  </div>
                )}

                {/* Challenges View */}
                {hubView === 'challenges' && (
                  <div className="hub-challenges-view">
                    <div className="hub-section-header">
                      <h3>Challenges & Contests</h3>
                      {primaryVentLink && (
                        <button className="btn btn-secondary">+ New Challenge</button>
                      )}
                  </div>
                    {!primaryVentLink ? (
                      <div className="empty-state-compact">
                        <div className="empty-icon">🏆</div>
                        <p>Create a vent link first</p>
                        <button onClick={() => { setHubView('links'); setShowCreateLink(true); }} className="btn">Create Link</button>
                  </div>
                    ) : (
                      <div className="empty-state-compact">
                        <div className="empty-icon">🏆</div>
                        <p>No challenges yet</p>
                        <p className="empty-hint">Create contests, giveaways, and challenges for your community</p>
                </div>
                    )}
                    </div>
                )}

                {/* Community Voting View */}
                {hubView === 'voting' && (
                  <div className="hub-voting-view">
                    <div className="hub-section-header">
                      <h3>Community Voting</h3>
                      {primaryVentLink && (
                        <button className="btn btn-secondary">+ New Vote</button>
                      )}
                  </div>
                    {!primaryVentLink ? (
                      <div className="empty-state-compact">
                        <div className="empty-icon">🗳️</div>
                        <p>Create a vent link first</p>
                        <button onClick={() => { setHubView('links'); setShowCreateLink(true); }} className="btn">Create Link</button>
                      </div>
                    ) : (
                      <div className="empty-state-compact">
                        <div className="empty-icon">🗳️</div>
                        <p>No votes yet</p>
                        <p className="empty-hint">Let your community vote on decisions and ideas</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Feedback Forms View */}
                {hubView === 'feedback' && (
                  <div className="hub-feedback-view">
                    <div className="hub-section-header">
                      <h3>Feedback Forms</h3>
                      {primaryVentLink && (
                        <button className="btn btn-secondary">+ New Form</button>
                      )}
                    </div>
                    {!primaryVentLink ? (
                      <div className="empty-state-compact">
                        <div className="empty-icon">📝</div>
                        <p>Create a vent link first</p>
                        <button onClick={() => { setHubView('links'); setShowCreateLink(true); }} className="btn">Create Link</button>
                </div>
              ) : (
                      <div className="empty-state-compact">
                        <div className="empty-icon">📝</div>
                        <p>No feedback forms yet</p>
                        <p className="empty-hint">Create surveys and feedback forms for your community</p>
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
                        <button className="btn btn-secondary">+ New Highlight</button>
                      )}
                        </div>
                    {!primaryVentLink ? (
                      <div className="empty-state-compact">
                        <div className="empty-icon">⭐</div>
                        <p>Create a vent link first</p>
                        <button onClick={() => { setHubView('links'); setShowCreateLink(true); }} className="btn">Create Link</button>
                      </div>
                    ) : (
                      <div className="empty-state-compact">
                        <div className="empty-icon">⭐</div>
                        <p>No highlights yet</p>
                        <p className="empty-hint">Feature top messages and showcase community stories</p>
                    </div>
                    )}
                  </div>
                )}

                {/* Live Reactions View */}
                {hubView === 'reactions' && (
                  <div className="hub-reactions-view">
                    <div className="hub-section-header">
                      <h3>Live Reactions</h3>
                    </div>
                    <div className="empty-state-compact">
                      <div className="empty-icon">😊</div>
                      <p>Reactions are enabled</p>
                      <p className="empty-hint">Your community can react to messages with emojis</p>
                    </div>
                  </div>
                )}

                {/* Community Goals View */}
                {hubView === 'goals' && (
                  <div className="hub-goals-view">
                    <div className="hub-section-header">
                      <h3>Community Goals</h3>
                      {primaryVentLink && (
                        <button className="btn btn-secondary">+ New Goal</button>
                      )}
                    </div>
                    {!primaryVentLink ? (
                      <div className="empty-state-compact">
                        <div className="empty-icon">🎯</div>
                        <p>Create a vent link first</p>
                        <button onClick={() => { setHubView('links'); setShowCreateLink(true); }} className="btn">Create Link</button>
                </div>
              ) : (
                      <div className="empty-state-compact">
                        <div className="empty-icon">🎯</div>
                        <p>No goals yet</p>
                        <p className="empty-hint">Set and track community milestones</p>
                </div>
              )}
            </div>
                )}

                {/* Events & Announcements View */}
                {hubView === 'events' && (
                  <div className="hub-events-view">
                    <div className="hub-section-header">
                      <h3>Events & Announcements</h3>
                      {primaryVentLink && (
                        <button className="btn btn-secondary">+ New Event</button>
                      )}
          </div>
                    {!primaryVentLink ? (
                      <div className="empty-state-compact">
                        <div className="empty-icon">📅</div>
                        <p>Create a vent link first</p>
                        <button onClick={() => { setHubView('links'); setShowCreateLink(true); }} className="btn">Create Link</button>
                      </div>
                    ) : (
                      <div className="empty-state-compact">
                        <div className="empty-icon">📅</div>
                        <p>No events yet</p>
                        <p className="empty-hint">Schedule community events and announcements</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Community Wall View */}
                {hubView === 'wall' && (
                  <div className="hub-wall-view">
                    <div className="hub-section-header">
                      <h3>Community Wall</h3>
                    </div>
                    <div className="empty-state-compact">
                      <div className="empty-icon">🧱</div>
                      <p>Community Wall</p>
                      <p className="empty-hint">Showcase featured messages from your community</p>
                    </div>
                  </div>
                )}

                {/* Collaborative Projects View */}
                {hubView === 'projects' && (
                  <div className="hub-projects-view">
                    <div className="hub-section-header">
                      <h3>Collaborative Projects</h3>
                      {primaryVentLink && (
                        <button className="btn btn-secondary">+ New Project</button>
                      )}
                    </div>
                    {!primaryVentLink ? (
                      <div className="empty-state-compact">
                        <div className="empty-icon">🤝</div>
                        <p>Create a vent link first</p>
                        <button onClick={() => { setHubView('links'); setShowCreateLink(true); }} className="btn">Create Link</button>
                      </div>
                    ) : (
                      <div className="empty-state-compact">
                        <div className="empty-icon">🤝</div>
                        <p>No projects yet</p>
                        <p className="empty-hint">Start community-driven projects and collaborations</p>
                      </div>
                    )}
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
                      }}
                    >
                      <div className="message-preview">
                        <p>{truncateText(message.body)}</p>
                        <div className="message-meta">
                          {message.mood && <span className="badge">{message.mood}</span>}
                          <span className="timestamp">{formatTimeAgo(message.created_at)}</span>
                          {!message.is_read && <span className="badge badge-unread">New</span>}
                          {message.is_flagged && <span className="badge badge-flagged">Flagged</span>}
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
                      Note: Anonymous senders cannot receive responses directly. This response will be saved for your records.
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
                  <div className="modal-footer">
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
            </>
          )}

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

