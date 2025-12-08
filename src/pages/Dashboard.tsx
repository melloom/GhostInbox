import { useState, useEffect } from 'react'
import { supabase, VentLink, VentMessage, Profile, PollWithOptions } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { generateReplyTemplates, summarizeThemes } from '../lib/ai'
import './Dashboard.css'

export default function Dashboard() {
  const [ventLinks, setVentLinks] = useState<VentLink[]>([])
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
  const [activeTab, setActiveTab] = useState<'overview' | 'messages'>('overview')
  const [messageFilter, setMessageFilter] = useState<'all' | 'unread' | 'read' | 'flagged'>('all')
  const [messageSort, setMessageSort] = useState<'newest' | 'oldest'>('newest')
  const [polls, setPolls] = useState<PollWithOptions[]>([])
  const [showCreatePoll, setShowCreatePoll] = useState(false)
  const [pollView, setPollView] = useState<'all' | 'active' | 'archived'>('all')
  const [newPollQuestion, setNewPollQuestion] = useState('')
  const [newPollOptions, setNewPollOptions] = useState<string[]>(['', ''])
  const [creatingPoll, setCreatingPoll] = useState(false)
  const [selectedPoll, setSelectedPoll] = useState<PollWithOptions | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchData()
  }, [])

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
      const primaryVentLink = ventLinks[0]
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

  const primaryVentLink = ventLinks[0]
  const activePolls = polls.filter((p: PollWithOptions) => getPollStatus(p) === 'active')
  const archivedPolls = polls.filter((p: PollWithOptions) => getPollStatus(p) !== 'active')
  const displayedPolls = pollView === 'active' ? activePolls : pollView === 'archived' ? archivedPolls : polls
  const unreadCount = messages.filter(m => !m.is_read).length
  const flaggedCount = messages.filter(m => m.is_flagged).length
  const totalMessages = messages.length
  const readCount = messages.filter(m => m.is_read).length
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
  const recentMessages = messages.slice(0, 5)

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
              onClick={() => setActiveTab('messages')}
              className={`header-tab-btn ${activeTab === 'messages' ? 'active' : ''}`}
            >
              <span className="header-tab-icon">💬</span>
              <span>All Messages</span>
              {unreadCount > 0 && <span className="header-badge">{unreadCount}</span>}
            </button>
            <button onClick={handleLogout} className="btn btn-secondary">
              Logout
            </button>
          </div>
        </header>

        <div className="dashboard-content">
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
          {primaryVentLink && (
            <div className="card">
              <div className="polls-header">
                <h2>Polls {polls.length > 0 && <span className="badge">{polls.length}</span>}</h2>
                <button
                  onClick={() => setShowCreatePoll(!showCreatePoll)}
                  className="btn btn-secondary"
                >
                  {showCreatePoll ? 'Cancel' : '+ New Poll'}
                </button>
              </div>

              {showCreatePoll && (
                <div className="create-poll-form">
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
                  <button
                    onClick={createPoll}
                    className="btn"
                    disabled={creatingPoll || !newPollQuestion.trim() || newPollOptions.filter(opt => opt.trim()).length < 2}
                  >
                    {creatingPoll ? 'Creating...' : 'Create Poll'}
                  </button>
                </div>
              )}

              {polls.length > 0 ? (
                <div className="polls-list">
                  {polls.map((poll) => (
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
              ) : !showCreatePoll && (
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
                <h2>Your Vent Link</h2>
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

            {/* Recent Activity Section */}
            <div className="card">
              <h2>Recent Activity</h2>
              {recentMessages.length > 0 ? (
                <div className="activity-list">
                  {recentMessages.map((message) => (
                    <div key={message.id} className="activity-item">
                      <div className="activity-icon">💬</div>
                      <div className="activity-content">
                        <p className="activity-text">{truncateText(message.body, 60)}</p>
                        <div className="activity-meta">
                          <span className="timestamp">{formatTimeAgo(message.created_at)}</span>
                          {!message.is_read && <span className="badge badge-unread">New</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-activity">
                  <p>No recent activity</p>
                  <p className="empty-hint">Messages will appear here as they come in</p>
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

          {/* Tab Navigation */}
          <div className="tabs-container">
            <div className="tabs-nav">
              <button
                className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <span className="tab-icon">📊</span>
                <span>Overview</span>
                {activeTab === 'overview' && <span className="tab-indicator"></span>}
              </button>
              <button
                className={`tab-button ${activeTab === 'messages' ? 'active' : ''}`}
                onClick={() => setActiveTab('messages')}
              >
                <span className="tab-icon">💬</span>
                <span>All Messages</span>
                {unreadCount > 0 && <span className="tab-badge">{unreadCount}</span>}
                {activeTab === 'messages' && <span className="tab-indicator"></span>}
              </button>
            </div>
          </div>

          {/* Tab Content */}
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

                {/* AI Replies Section */}
                {aiReplies && (
                  <div className="ai-replies-section">
                    <h4>Suggested Reply Templates</h4>
                    <div className="ai-output">{aiReplies}</div>
                  </div>
                )}
              </div>
            )}
          </div>
          ) : (
            /* All Messages Tab */
            <div className="all-messages-view">
              <div className="messages-header-bar">
                <div className="messages-header-left">
                  <h2>All Messages</h2>
                  <span className="messages-count">{totalMessages} total</span>
                </div>
                <div className="messages-controls">
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
                  </div>
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
                </div>
              </div>

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
                  {messages
                    .filter((msg) => {
                      if (messageFilter === 'all') return true
                      if (messageFilter === 'unread') return !msg.is_read
                      if (messageFilter === 'read') return msg.is_read
                      if (messageFilter === 'flagged') return msg.is_flagged
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
                        className={`message-card ${!message.is_read ? 'unread' : ''} ${message.is_flagged ? 'flagged' : ''}`}
                        onClick={() => {
                          setSelectedMessage(message)
                          setAiReplies(null)
                        }}
                      >
                        <div className="message-card-header">
                          <div className="message-card-status">
                            {!message.is_read && <span className="status-dot unread-dot"></span>}
                            {message.is_flagged && <span className="status-dot flagged-dot"></span>}
                            {message.is_read && !message.is_flagged && <span className="status-dot read-dot"></span>}
                          </div>
                          <span className="message-card-time">{formatTimeAgo(message.created_at)}</span>
                        </div>
                        <div className="message-card-body">
                          <p>{message.body}</p>
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
                                if (!message.is_flagged) flagMessage(message.id)
                              }}
                              disabled={message.is_flagged}
                              title="Flag message"
                            >
                              🚩
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
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

