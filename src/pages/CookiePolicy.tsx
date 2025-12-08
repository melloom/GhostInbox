import { Link } from 'react-router-dom'
import './LegalPage.css'

export default function CookiePolicy() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <Link to="/" className="back-link">← Back to Home</Link>
        <h1>Cookie Policy</h1>
        <p className="last-updated">Last updated: {new Date().toLocaleDateString()}</p>
        
        <section>
          <h2>1. What Are Cookies</h2>
          <p>
            Cookies are small text files that are placed on your device when you visit a website. 
            They are widely used to make websites work more efficiently and provide information 
            to website owners.
          </p>
        </section>

        <section>
          <h2>2. How We Use Cookies</h2>
          <p>
            GhostInbox uses cookies and similar technologies to:
          </p>
          <ul>
            <li>Maintain your login session</li>
            <li>Remember your preferences</li>
            <li>Analyze how our service is used</li>
            <li>Improve security and prevent fraud</li>
          </ul>
        </section>

        <section>
          <h2>3. Types of Cookies We Use</h2>
          <h3>3.1 Essential Cookies</h3>
          <p>
            These cookies are necessary for the website to function properly. They enable core 
            functionality such as authentication and security.
          </p>
          <ul>
            <li><strong>Session Cookies:</strong> Maintain your login state</li>
            <li><strong>Security Cookies:</strong> Help prevent unauthorized access</li>
          </ul>

          <h3>3.2 Analytics Cookies</h3>
          <p>
            These cookies help us understand how visitors interact with our website by collecting 
            and reporting information anonymously.
          </p>

          <h3>3.3 Preference Cookies</h3>
          <p>
            These cookies remember your preferences and settings to provide a personalized experience.
          </p>
        </section>

        <section>
          <h2>4. Third-Party Cookies</h2>
          <p>
            We may use third-party services that set their own cookies:
          </p>
          <ul>
            <li><strong>Supabase:</strong> Authentication and database services may use cookies for session management</li>
            <li><strong>Analytics Services:</strong> If we use analytics tools, they may set cookies</li>
          </ul>
        </section>

        <section>
          <h2>5. Managing Cookies</h2>
          <p>
            You can control and manage cookies in various ways:
          </p>
          <ul>
            <li>Browser settings allow you to refuse or accept cookies</li>
            <li>You can delete cookies that are already on your device</li>
            <li>Most browsers provide options to block third-party cookies</li>
          </ul>
          <p>
            <strong>Note:</strong> Blocking essential cookies may impact your ability to use 
            certain features of GhostInbox, including logging in.
          </p>
        </section>

        <section>
          <h2>6. Cookie Duration</h2>
          <ul>
            <li><strong>Session Cookies:</strong> Temporary cookies deleted when you close your browser</li>
            <li><strong>Persistent Cookies:</strong> Remain on your device for a set period or until you delete them</li>
          </ul>
        </section>

        <section>
          <h2>7. Updates to This Policy</h2>
          <p>
            We may update this Cookie Policy from time to time. We will notify you of any 
            significant changes by updating the "Last updated" date.
          </p>
        </section>

        <section>
          <h2>8. Contact Us</h2>
          <p>
            If you have questions about our use of cookies, please contact us through our 
            support channels.
          </p>
        </section>
      </div>
    </div>
  )
}

