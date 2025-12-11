import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import './LandingPage.css'

export default function LandingPage() {
  const observerRef = useRef<IntersectionObserver | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [navExpanded, setNavExpanded] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const faqs = [
    {
      question: "Is it really anonymous?",
      answer: "Yes! We don't collect or store any identifying information about message senders. Your audience can share freely without fear.",
      icon: "🔒"
    },
    {
      question: "How much does it cost?",
      answer: "GhostInbox is completely free to use. No subscriptions, no hidden fees, no credit card required.",
      icon: "💰"
    },
    {
      question: "Can I moderate messages?",
      answer: "Absolutely! You can flag abusive or spam messages, mark messages as read/unread, and organize your inbox however you like.",
      icon: "🛡️"
    },
    {
      question: "What about the AI features?",
      answer: "Our AI features help you generate reply templates and understand themes in your messages. You'll need an OpenAI API key to use them.",
      icon: "🤖"
    },
    {
      question: "How do I share my link?",
      answer: "Simply copy your unique vent link and share it anywhere - Instagram bio, TikTok, Twitter, YouTube descriptions, or anywhere your audience can find it.",
      icon: "🔗"
    },
    {
      question: "Is my data secure?",
      answer: "Yes! We use Supabase for secure, encrypted data storage. Your messages and account information are protected with industry-standard security.",
      icon: "🔐"
    }
  ]

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index)
  }

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      const offset = 80 // Account for sticky nav height
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - offset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
      setNavExpanded(false)
    }
  }

  useEffect(() => {
    // Enhanced Intersection Observer for scroll animations with fade-in/fade-out
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in')
            entry.target.classList.remove('animate-out')
          } else {
            // Only fade out if we've scrolled past it significantly
            if (entry.boundingClientRect.top < -100) {
              entry.target.classList.add('animate-out')
              entry.target.classList.remove('animate-in')
            }
          }
        })
      },
      { 
        threshold: [0, 0.1, 0.3, 0.5, 0.7, 1],
        rootMargin: '0px 0px -100px 0px' 
      }
    )

    const elements = document.querySelectorAll('.animate-on-scroll')
    elements.forEach((el) => observerRef.current?.observe(el))

    return () => {
      if (observerRef.current) {
        elements.forEach((el) => observerRef.current?.unobserve(el))
      }
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      setScrolled(scrollPosition > 100)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="landing-page">
      {/* Sticky Navigation */}
      <nav className={`sticky-nav ${scrolled ? 'scrolled' : ''} ${navExpanded ? 'expanded' : ''}`}>
        <div className="nav-container">
          <div className="nav-brand" onClick={() => scrollToSection('hero')}>
            <span className="nav-logo">GhostInbox</span>
          </div>
          <button 
            className="nav-toggle"
            onClick={() => setNavExpanded(!navExpanded)}
            aria-label="Toggle navigation"
          >
            <span className={`nav-toggle-line ${navExpanded ? 'active' : ''}`}></span>
            <span className={`nav-toggle-line ${navExpanded ? 'active' : ''}`}></span>
            <span className={`nav-toggle-line ${navExpanded ? 'active' : ''}`}></span>
          </button>
          <div className={`nav-links ${navExpanded ? 'expanded' : ''}`}>
            <button onClick={() => scrollToSection('features')} className="nav-link">Features</button>
            <button onClick={() => scrollToSection('how-it-works')} className="nav-link">How It Works</button>
            <button onClick={() => scrollToSection('use-cases')} className="nav-link">Use Cases</button>
            <button onClick={() => scrollToSection('testimonials')} className="nav-link">Testimonials</button>
            <button onClick={() => scrollToSection('faq')} className="nav-link">FAQ</button>
            <div className="nav-cta">
              <Link to="/login" className="btn btn-primary btn-nav">Get Started</Link>
              <Link to="/login" className="btn btn-secondary btn-nav-secondary">Sign In</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Animated Background Elements */}
      <div className="animated-bg">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
        <div className="particles">
          {[...Array(50)].map((_, i) => (
            <div key={i} className="particle" style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${10 + Math.random() * 10}s`
            }}></div>
          ))}
        </div>
      </div>

      {/* Hero Section */}
      <section id="hero" className="hero">
        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-badge animate-on-scroll">
              <span className="badge-icon">✨</span>
              <span>Anonymous Messaging Platform</span>
            </div>
            
            <h1 className="hero-title animate-on-scroll">
              Receive <span className="gradient-text">Honest Feedback</span> from Your Audience
            </h1>
            
            <p className="hero-description animate-on-scroll">
              Create a safe space for anonymous messages. Build deeper connections through authentic, unfiltered conversations with your community.
            </p>
            
            <div className="hero-features animate-on-scroll">
              <div className="hero-feature">
                <div className="feature-check">✓</div>
                <span>100% Anonymous</span>
              </div>
              <div className="hero-feature">
                <div className="feature-check">✓</div>
                <span>AI-Powered Insights</span>
              </div>
              <div className="hero-feature">
                <div className="feature-check">✓</div>
                <span>Free Forever</span>
              </div>
            </div>
            
            <div className="hero-cta animate-on-scroll">
              <Link to="/login" className="btn btn-primary btn-hero">
                <span>Get Started Free</span>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </div>
            
            <div className="hero-stats animate-on-scroll">
              <div className="hero-stat">
                <div className="stat-value">10K+</div>
                <div className="stat-label">Active Users</div>
              </div>
              <div className="hero-stat">
                <div className="stat-value">50K+</div>
                <div className="stat-label">Messages</div>
              </div>
              <div className="hero-stat">
                <div className="stat-value">99%</div>
                <div className="stat-label">Satisfaction</div>
              </div>
            </div>
          </div>
          
          <div className="hero-visual">
            <div className="hero-message-preview">
              <div className="preview-header">
                <div className="preview-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div className="preview-title">Anonymous Message</div>
              </div>
              <div className="preview-content">
                <div className="message-bubble message-1 animate-on-scroll">
                  <p>"This platform changed how I connect with my audience!"</p>
                  <div className="message-time">2 min ago</div>
                </div>
                <div className="message-bubble message-2 animate-on-scroll">
                  <p>"Finally, a safe space for honest feedback."</p>
                  <div className="message-time">5 min ago</div>
                </div>
                <div className="message-bubble message-3 animate-on-scroll">
                  <p>"The AI insights help me understand my audience better."</p>
                  <div className="message-time">10 min ago</div>
                </div>
              </div>
              <div className="preview-glow"></div>
            </div>
            <div className="hero-stats-preview animate-on-scroll">
              <div className="stats-mini-card">
                <div className="stats-mini-icon">📊</div>
                <div className="stats-mini-content">
                  <div className="stats-mini-value">1,234</div>
                  <div className="stats-mini-label">Messages Today</div>
                </div>
              </div>
            </div>
            <div className="hero-ai-preview animate-on-scroll">
              <div className="ai-preview-mini">
                <div className="ai-preview-header">
                  <div className="ai-preview-icon">🤖</div>
                  <div className="ai-preview-title">AI Insights</div>
                </div>
                <div className="ai-preview-text">3 reply templates generated</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="container">
          <h2 className="section-title animate-on-scroll">Why GhostInbox is Great</h2>
          <div className="features-with-preview">
            <div className="features-grid">
            <div className="feature-card animate-on-scroll" style={{ animationDelay: '0.1s' }}>
              <div className="feature-icon rotate-icon">🔒</div>
              <div className="feature-icon-bg"></div>
              <h3>100% Anonymous</h3>
              <p>
                Your audience can share their thoughts without fear. 
                No usernames, no tracking—just honest, authentic messages.
              </p>
              <div className="feature-glow"></div>
            </div>
            <div className="feature-card animate-on-scroll" style={{ animationDelay: '0.2s' }}>
              <div className="feature-icon bounce-icon">📱</div>
              <div className="feature-icon-bg"></div>
              <h3>Easy to Share</h3>
              <p>
                Get your unique vent link in seconds. Share it in your bio, 
                stories, or anywhere your audience can find it.
              </p>
              <div className="feature-glow"></div>
            </div>
            <div className="feature-card animate-on-scroll" style={{ animationDelay: '0.3s' }}>
              <div className="feature-icon pulse-icon">🤖</div>
              <div className="feature-icon-bg"></div>
              <h3>AI-Powered Insights</h3>
              <p>
                Get AI-generated reply templates and theme summaries to help 
                you understand your audience better.
              </p>
              <div className="feature-glow"></div>
            </div>
            <div className="feature-card animate-on-scroll" style={{ animationDelay: '0.4s' }}>
              <div className="feature-icon rotate-icon">🛡️</div>
              <div className="feature-icon-bg"></div>
              <h3>Safe & Secure</h3>
              <p>
                Built with privacy in mind. Flag abusive content and manage 
                your inbox with powerful moderation tools.
              </p>
              <div className="feature-glow"></div>
            </div>
            <div className="feature-card animate-on-scroll" style={{ animationDelay: '0.5s' }}>
              <div className="feature-icon bounce-icon">💬</div>
              <div className="feature-icon-bg"></div>
              <h3>Mood Tracking</h3>
              <p>
                Let senders express their mood with each message. 
                Understand the emotional context behind every message.
              </p>
              <div className="feature-glow"></div>
            </div>
            <div className="feature-card animate-on-scroll" style={{ animationDelay: '0.6s' }}>
              <div className="feature-icon pulse-icon">📊</div>
              <div className="feature-icon-bg"></div>
              <h3>Smart Dashboard</h3>
              <p>
                Organize, read, and respond to messages with an intuitive 
                dashboard designed for creators.
              </p>
              <div className="feature-glow"></div>
            </div>
          </div>
          <div className="features-preview animate-on-scroll">
            <div className="dashboard-preview">
              <div className="preview-header">
                <div className="preview-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div className="preview-title">Dashboard</div>
              </div>
              <div className="dashboard-content">
                <div className="dashboard-message-item">
                  <div className="message-indicator unread"></div>
                  <div className="message-text">"Love your latest video! Keep it up!"</div>
                  <div className="message-meta">2 min ago • Happy</div>
                </div>
                <div className="dashboard-message-item">
                  <div className="message-indicator"></div>
                  <div className="message-text">"Could you make more content about..."</div>
                  <div className="message-meta">15 min ago • Curious</div>
                </div>
                <div className="dashboard-message-item">
                  <div className="message-indicator unread"></div>
                  <div className="message-text">"This helped me so much, thank you!"</div>
                  <div className="message-meta">1 hour ago • Grateful</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="how-it-works">
        <div className="container">
          <h2 className="section-title animate-on-scroll">How It Works</h2>
          <div className="how-it-works-content">
            <div className="steps">
            <div className="step animate-on-scroll" style={{ animationDelay: '0.1s' }}>
              <div className="step-number pulse-number">
                <span>1</span>
                <div className="step-ripple"></div>
              </div>
              <h3>Create Your Account</h3>
              <p>Sign up in seconds and get your unique handle</p>
            </div>
            <div className="step-arrow animate-on-scroll" style={{ animationDelay: '0.2s' }}>
              <div className="arrow-line"></div>
              <span className="arrow-head">→</span>
            </div>
            <div className="step animate-on-scroll" style={{ animationDelay: '0.3s' }}>
              <div className="step-number pulse-number">
                <span>2</span>
                <div className="step-ripple"></div>
              </div>
              <h3>Get Your Vent Link</h3>
              <p>Receive your personalized link to share with your audience</p>
            </div>
            <div className="step-arrow animate-on-scroll" style={{ animationDelay: '0.4s' }}>
              <div className="arrow-line"></div>
              <span className="arrow-head">→</span>
            </div>
            <div className="step animate-on-scroll" style={{ animationDelay: '0.5s' }}>
              <div className="step-number pulse-number">
                <span>3</span>
                <div className="step-ripple"></div>
              </div>
              <h3>Share & Receive</h3>
              <p>Share your link and start receiving anonymous messages</p>
            </div>
            <div className="step-arrow animate-on-scroll" style={{ animationDelay: '0.6s' }}>
              <div className="arrow-line"></div>
              <span className="arrow-head">→</span>
            </div>
            <div className="step animate-on-scroll" style={{ animationDelay: '0.7s' }}>
              <div className="step-number pulse-number">
                <span>4</span>
                <div className="step-ripple"></div>
              </div>
              <h3>Engage & Grow</h3>
              <p>Use AI insights to understand your audience and build deeper connections</p>
            </div>
          </div>
          <div className="how-it-works-preview animate-on-scroll">
            <div className="link-preview-card">
              <div className="link-preview-header">
                <div className="link-icon">🔗</div>
                <div className="link-info">
                  <div className="link-label">Your Vent Link</div>
                  <div className="link-url">ghostinbox.com/v/yourhandle</div>
                </div>
              </div>
              <div className="link-preview-actions">
                <button className="link-action-btn">Copy</button>
                <button className="link-action-btn primary">Share</button>
              </div>
            </div>
            <div className="message-flow-preview">
              <div className="flow-message incoming animate-on-scroll">
                <div className="flow-avatar">A</div>
                <div className="flow-bubble">"Thanks for sharing this!"</div>
              </div>
              <div className="flow-message incoming animate-on-scroll">
                <div className="flow-avatar">B</div>
                <div className="flow-bubble">"This really helped me today"</div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-card animate-on-scroll">
              <div className="stat-number" data-target="10000">0</div>
              <div className="stat-label">Active Users</div>
              <div className="stat-glow"></div>
            </div>
            <div className="stat-card animate-on-scroll">
              <div className="stat-number" data-target="50000">0</div>
              <div className="stat-label">Messages Sent</div>
              <div className="stat-glow"></div>
            </div>
            <div className="stat-card animate-on-scroll">
              <div className="stat-number" data-target="1000">0</div>
              <div className="stat-label">Creators</div>
              <div className="stat-glow"></div>
            </div>
            <div className="stat-card animate-on-scroll">
              <div className="stat-number" data-target="99">0</div>
              <div className="stat-label">% Satisfaction</div>
              <div className="stat-glow"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section id="use-cases" className="use-cases">
        <div className="container">
          <h2 className="section-title animate-on-scroll">Perfect For</h2>
          <div className="use-cases-grid">
            <div className="use-case-card animate-on-scroll">
              <div className="use-case-icon">🎬</div>
              <h3>Content Creators</h3>
              <p>Get honest feedback from your viewers and build stronger community connections</p>
              <div className="use-case-glow"></div>
            </div>
            <div className="use-case-card animate-on-scroll">
              <div className="use-case-icon">⭐</div>
              <h3>Influencers</h3>
              <p>Understand what your audience really thinks and improve your content</p>
              <div className="use-case-glow"></div>
            </div>
            <div className="use-case-card animate-on-scroll">
              <div className="use-case-icon">🎯</div>
              <h3>Coaches & Mentors</h3>
              <p>Create a safe space for clients to share concerns and questions</p>
              <div className="use-case-glow"></div>
            </div>
            <div className="use-case-card animate-on-scroll">
              <div className="use-case-icon">💼</div>
              <h3>Businesses</h3>
              <p>Collect authentic customer feedback and improve your products</p>
              <div className="use-case-glow"></div>
            </div>
            <div className="use-case-card animate-on-scroll">
              <div className="use-case-icon">🎓</div>
              <h3>Educators</h3>
              <p>Receive anonymous questions and feedback from students</p>
              <div className="use-case-glow"></div>
            </div>
            <div className="use-case-card animate-on-scroll">
              <div className="use-case-icon">🎨</div>
              <h3>Artists</h3>
              <p>Get genuine reactions and critiques on your creative work</p>
              <div className="use-case-glow"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="testimonials">
        <div className="container">
          <h2 className="section-title animate-on-scroll">What Creators Are Saying</h2>
          <div className="testimonials-with-preview">
            <div className="testimonials-grid">
            <div className="testimonial-card animate-on-scroll">
              <div className="testimonial-content">
                <div className="testimonial-quote">"</div>
                <p>GhostInbox completely changed how I interact with my audience. The anonymous feedback is incredibly valuable and helps me create better content.</p>
                <div className="testimonial-author">
                  <div className="author-avatar">SM</div>
                  <div>
                    <div className="author-name">Sarah Martinez</div>
                    <div className="author-role">Content Creator, 250K followers</div>
                  </div>
                </div>
              </div>
              <div className="testimonial-glow"></div>
            </div>
            <div className="testimonial-card animate-on-scroll">
              <div className="testimonial-content">
                <div className="testimonial-quote">"</div>
                <p>The AI insights feature is a game-changer. It helps me understand the themes in my messages and respond more thoughtfully.</p>
                <div className="testimonial-author">
                  <div className="author-avatar">JD</div>
                  <div>
                    <div className="author-name">James Davis</div>
                    <div className="author-role">Life Coach</div>
                  </div>
                </div>
              </div>
              <div className="testimonial-glow"></div>
            </div>
            <div className="testimonial-card animate-on-scroll">
              <div className="testimonial-content">
                <div className="testimonial-quote">"</div>
                <p>I love how easy it is to share my link. My audience feels safe sharing their thoughts, and I get authentic feedback I never would have received otherwise.</p>
                <div className="testimonial-author">
                  <div className="author-avatar">MJ</div>
                  <div>
                    <div className="author-name">Maria Johnson</div>
                    <div className="author-role">Fitness Influencer</div>
                  </div>
                </div>
              </div>
              <div className="testimonial-glow"></div>
            </div>
          </div>
          <div className="testimonials-preview animate-on-scroll">
            <div className="ai-insights-preview">
              <div className="preview-header">
                <div className="preview-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div className="preview-title">AI Insights</div>
              </div>
              <div className="ai-preview-content">
                <div className="ai-section">
                  <div className="ai-label">Theme Summary</div>
                  <div className="ai-text">• Appreciation & gratitude<br/>• Content requests<br/>• Personal stories</div>
                </div>
                <div className="ai-section">
                  <div className="ai-label">Reply Templates</div>
                  <div className="ai-text">1) Thank you so much!<br/>2) I really appreciate this<br/>3) This means a lot</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits">
        <div className="container">
          <div className="benefits-content">
            <div className="benefits-text animate-on-scroll">
              <h2 className="section-title">Why Choose GhostInbox?</h2>
              <div className="benefits-list">
                <div className="benefit-item animate-on-scroll">
                  <div className="benefit-icon">✓</div>
                  <div>
                    <h3>Zero Setup Time</h3>
                    <p>Get started in under 60 seconds. No complex configuration needed.</p>
                  </div>
                </div>
                <div className="benefit-item animate-on-scroll">
                  <div className="benefit-icon">✓</div>
                  <div>
                    <h3>Completely Free</h3>
                    <p>No hidden fees, no credit card required. Start building connections today.</p>
                  </div>
                </div>
                <div className="benefit-item animate-on-scroll">
                  <div className="benefit-icon">✓</div>
                  <div>
                    <h3>Privacy First</h3>
                    <p>Built with privacy in mind. Your data and your audience's anonymity are protected.</p>
                  </div>
                </div>
                <div className="benefit-item animate-on-scroll">
                  <div className="benefit-icon">✓</div>
                  <div>
                    <h3>AI-Powered</h3>
                    <p>Leverage AI to understand your audience better and craft better responses.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="benefits-visual animate-on-scroll">
              <div className="benefits-preview-cards">
                <div className="benefit-preview-card card-1">
                  <div className="preview-header">
                    <div className="preview-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <div className="preview-title">Quick Setup</div>
                  </div>
                  <div className="benefit-preview-content">
                    <div className="setup-step">
                      <div className="step-check">✓</div>
                      <span>Create account</span>
                    </div>
                    <div className="setup-step">
                      <div className="step-check">✓</div>
                      <span>Get your link</span>
                    </div>
                    <div className="setup-step">
                      <div className="step-check">✓</div>
                      <span>Start receiving</span>
                    </div>
                  </div>
                </div>
                <div className="benefit-preview-card card-2">
                  <div className="preview-header">
                    <div className="preview-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <div className="preview-title">Free Forever</div>
                  </div>
                  <div className="benefit-preview-content">
                    <div className="pricing-display">
                      <div className="price-amount">$0</div>
                      <div className="price-period">/month</div>
                    </div>
                    <div className="pricing-features">
                      <div className="pricing-feature">✓ Unlimited messages</div>
                      <div className="pricing-feature">✓ All features included</div>
                      <div className="pricing-feature">✓ No credit card</div>
                    </div>
                  </div>
                </div>
                <div className="benefit-preview-card card-3">
                  <div className="preview-header">
                    <div className="preview-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <div className="preview-title">Privacy First</div>
                  </div>
                  <div className="benefit-preview-content">
                    <div className="privacy-badges">
                      <div className="privacy-badge">🔒 Encrypted</div>
                      <div className="privacy-badge">🛡️ Secure</div>
                      <div className="privacy-badge">👤 Anonymous</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="faq">
        <div className="container">
          <h2 className="section-title animate-on-scroll">Frequently Asked Questions</h2>
          <p className="faq-subtitle animate-on-scroll">Everything you need to know about GhostInbox</p>
          <div className="faq-list">
            {faqs.map((faq, index) => (
              <div 
                key={index} 
                className={`faq-item animate-on-scroll ${openFaq === index ? 'active' : ''}`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <button 
                  className="faq-question" 
                  onClick={() => toggleFaq(index)}
                  aria-expanded={openFaq === index}
                >
                  <div className="faq-question-content">
                    <span className="faq-icon">{faq.icon}</span>
                    <h3>{faq.question}</h3>
                  </div>
                  <span className={`faq-arrow ${openFaq === index ? 'open' : ''}`}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </button>
                <div className={`faq-answer ${openFaq === index ? 'open' : ''}`}>
                  <div className="faq-answer-content">
                    <p>{faq.answer}</p>
                  </div>
                </div>
                <div className="faq-glow"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <h2 className="cta-title animate-on-scroll">Ready to Get Started?</h2>
          <p className="cta-description animate-on-scroll">
            Join creators who are building deeper connections with their audience
          </p>
          <div className="cta-buttons animate-on-scroll">
            <Link to="/login" className="btn btn-primary btn-large pulse-button">
              <span>Create Free Account</span>
              <span className="btn-shine"></span>
              <div className="btn-glow"></div>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h4 className="footer-title">GhostInbox</h4>
              <p className="footer-description">
                Connect with your audience anonymously. Built for creators, by creators.
              </p>
            </div>
            <div className="footer-section">
              <h4 className="footer-title">Product</h4>
              <ul className="footer-links">
                <li><Link to="/login">Get Started</Link></li>
                <li><Link to="/login">Features</Link></li>
                <li><Link to="/login">Pricing</Link></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4 className="footer-title">Legal</h4>
              <ul className="footer-links">
                <li><Link to="/privacy">Privacy Policy</Link></li>
                <li><Link to="/terms">Terms of Service</Link></li>
                <li><Link to="/data-leak">Data Leak Documentation</Link></li>
                <li><Link to="/cookie-policy">Cookie Policy</Link></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4 className="footer-title">Support</h4>
              <ul className="footer-links">
                <li><Link to="/help">Help Center</Link></li>
                <li><Link to="/contact">Contact Us</Link></li>
                <li><Link to="/about">About</Link></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} GhostInbox. All rights reserved.</p>
            <div className="footer-bottom-links">
              <Link to="/privacy">Privacy</Link>
              <span className="footer-divider">•</span>
              <Link to="/terms">Terms</Link>
              <span className="footer-divider">•</span>
              <Link to="/data-leak">Data Leak Docs</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

