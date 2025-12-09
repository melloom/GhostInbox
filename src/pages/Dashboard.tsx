import { useState, useEffect } from 'react'
import { supabase, VentLink, VentMessage, Profile, PollWithOptions, MessageFolder, MessageFolderAssignment } from '../lib/supabase'
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
  const [newPollOptions, setNewPollOptions] = useState<string[]>(['', ''])
  const [creatingPoll, setCreatingPoll] = useState(false)
  const [selectedPoll, setSelectedPoll] = useState<PollWithOptions | null>(null)
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
  const navigate = useNavigate()

  useEffect(() => {
    fetchData()
  }, [])

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
          is_active: true,
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
      setNewPollOptions(['', ''])
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
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📨</div>
              <div className="stat-content">
                <div className="stat-value">{totalMessages}</div>
                <div className="stat-label">Total Messages</div>
              </div>
            </div>
            <div className="stat-card stat-unread">
              <div className="stat-icon">🔔</div>
              <div className="stat-content">
                <div className="stat-value">{unreadCount}</div>
                <div className="stat-label">Unread</div>
              </div>
            </div>
            <div className="stat-card stat-today">
              <div className="stat-icon">📅</div>
              <div className="stat-content">
                <div className="stat-value">{todayMessages}</div>
                <div className="stat-label">Today</div>
              </div>
            </div>
            <div className="stat-card stat-week">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <div className="stat-value">{thisWeekMessages}</div>
                <div className="stat-label">This Week</div>
              </div>
            </div>
            <div className="stat-card stat-flagged">
              <div className="stat-icon">🚩</div>
              <div className="stat-content">
                <div className="stat-value">{flaggedCount}</div>
                <div className="stat-label">Flagged</div>
              </div>
            </div>
            <div className="stat-card stat-read">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <div className="stat-value">{readCount}</div>
                <div className="stat-label">Read</div>
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

          {/* Polls Section */}
          {activeTab === 'overview' && (
            <div className="card">
              <div className="polls-header">
                <h2>Polls {polls.length > 0 && <span className="badge">{polls.length}</span>}</h2>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {polls.length > 0 && (
                    <div className="filter-buttons" style={{ marginRight: '8px' }}>
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
                  {primaryVentLink ? (
                    <button
                      onClick={() => setShowCreatePoll(!showCreatePoll)}
                      className="btn btn-secondary"
                    >
                      {showCreatePoll ? 'Cancel' : '+ New Poll'}
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowCreateLink(true)}
                      className="btn btn-secondary"
                      title="Create a vent link first to create polls"
                    >
                      Create Vent Link First
                    </button>
                  )}
                </div>
              </div>

              {!primaryVentLink ? (
                <div className="empty-state" style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <div className="empty-icon" style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                  <p className="empty-title">Create a Vent Link First</p>
                  <p className="empty-hint" style={{ marginBottom: '20px' }}>
                    You need to create a vent link before you can create polls.
                  </p>
                  <button
                    onClick={() => setShowCreateLink(true)}
                    className="btn"
                  >
                    Create Vent Link
                  </button>
                </div>
              ) : showCreatePoll && (
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
                    <label htmlFor="poll-question">Poll Question</label>
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
                    <label>Poll Options</label>
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
                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
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

              {primaryVentLink && displayedPolls.length > 0 ? (
                <div className="polls-list">
                  {displayedPolls.map((poll) => (
                    <div key={poll.id} className={`poll-card ${!poll.is_active ? 'inactive' : ''}`}>
                      <div className="poll-card-header">
                        <h3>{poll.question}</h3>
                        <div className="poll-actions">
                          <button
                            onClick={() => togglePollActive(poll.id, poll.is_active)}
                            className="btn btn-small btn-secondary"
                          >
                            {poll.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => setSelectedPoll(selectedPoll?.id === poll.id ? null : poll)}
                            className="btn btn-small"
                          >
                            {selectedPoll?.id === poll.id ? 'Hide Results' : 'View Results'}
                          </button>
                        </div>
                      </div>
                      <div className="poll-stats">
                        <span className="poll-stat">📊 {poll.total_votes || 0} votes</span>
                        <span className="poll-stat">{poll.is_active ? '✅ Active' : '⏸️ Inactive'}</span>
                        {poll.expires_at && (
                          <span className="poll-stat">
                            {new Date(poll.expires_at) > new Date() 
                              ? `⏰ Expires ${formatTimeAgo(poll.expires_at)}`
                              : '⏰ Expired'}
                          </span>
                        )}
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
              ) : primaryVentLink && !showCreatePoll && (
                <div className="empty-state">
                  <div className="empty-icon">📊</div>
                  <p className="empty-title">No polls yet</p>
                  <p className="empty-hint">Create a poll to engage with your audience!</p>
                </div>
              )}
            </div>
          )}

          {/* Two Column Layout for Vent Link and Activity */}
          <div className="dashboard-top-grid">
            {/* Vent Link Section */}
            <div className="card">
              <div className="vent-link-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2>Your Vent Links</h2>
                  {ventLinks.length > 1 && (
                    <select
                      className="select"
                      value={selectedVentLinkId || ''}
                      onChange={(e) => setSelectedVentLinkId(e.target.value)}
                      style={{ maxWidth: '200px' }}
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
                    className="btn"
                  >
                    {showCreateLink ? 'Cancel' : 'Create Link'}
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
                <div className="vent-link-section">
                  <div className="vent-link-display">
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
                  <div className="share-tips">
                    <p>💡 <strong>Share this link:</strong></p>
                    <ul>
                      <li>Add it to your Instagram bio</li>
                      <li>Pin it on your TikTok profile</li>
                      <li>Share it in your stories</li>
                      <li>Post it on Twitter/X</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="empty-vent-link">
                  <div className="empty-icon">🔗</div>
                  <p>No vent link created yet.</p>
                  <p className="empty-hint">Create your first vent link to start receiving anonymous messages!</p>
                </div>
              )}
            </div>

          </div>

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
                <div className="message-detail-header">
                  <h3>Message</h3>
                  <button
                    onClick={() => {
                      setSelectedMessage(null)
                      setAiReplies(null)
                      setEditingNote(null)
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

                {/* Folders Section */}
                <div className="message-tags-section">
                  <h4>Folders</h4>
                  {messageFolders.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No folders yet. Create one in the messages view.</p>
                  ) : (
                    <div className="message-tags-list">
                      {messageFolders.map(folder => {
                        const isAssigned = messageFolderAssignments[selectedMessage.id]?.includes(folder.id)
                        return (
                          <span
                            key={folder.id}
                            className={`message-tag ${isAssigned ? 'active' : ''}`}
                            onClick={() => {
                              if (isAssigned) {
                                removeMessageFromFolder(selectedMessage.id, folder.id)
                              } else {
                                assignMessageToFolder(selectedMessage.id, folder.id)
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            📁 {folder.folder_name}
                            {isAssigned && <span style={{ marginLeft: '4px' }}>✓</span>}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Tags Section */}
                <div className="message-tags-section">
                  <h4>Tags</h4>
                  <div className="message-tags-list">
                    {messageTags[selectedMessage.id]?.map((tag, idx) => (
                      <span key={idx} className="message-tag">
                        #{tag}
                        <button
                          className="tag-remove"
                          onClick={() => removeTagFromMessage(selectedMessage.id, tag)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="add-tag-input">
                    <input
                      type="text"
                      placeholder="Add tag..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const input = e.target as HTMLInputElement
                          addTagToMessage(selectedMessage.id, input.value)
                          input.value = ''
                        }
                      }}
                      className="tag-input"
                    />
                  </div>
                </div>

                {/* Notes Section */}
                <div className="message-notes-section">
                  <h4>Private Notes</h4>
                  {editingNote === selectedMessage.id ? (
                    <div className="note-editor">
                      <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Add a private note about this message..."
                        className="note-textarea"
                        rows={3}
                      />
                      <div className="note-actions">
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
                    <div className="note-display">
                      {messageNotes[selectedMessage.id] ? (
                        <div>
                          <p className="note-text">{messageNotes[selectedMessage.id]}</p>
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
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowResponseModal(true)}
                  >
                    Send Private Response
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

