import { Link } from 'react-router-dom'
import './LegalPage.css'

export default function TermsOfService() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <Link to="/" className="back-link">← Back to Home</Link>
        <h1>Terms of Service</h1>
        <p className="last-updated">Last updated: {new Date().toLocaleDateString()}</p>
        
        <section>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using GhostInbox, you agree to be bound by these Terms of Service 
            and all applicable laws and regulations. If you do not agree with any of these terms, 
            you are prohibited from using this service.
          </p>
        </section>

        <section>
          <h2>2. Description of Service</h2>
          <p>
            GhostInbox is an anonymous messaging platform that allows creators to receive 
            anonymous messages from their audience. The service includes features such as 
            vent links, message management, AI-powered insights, and moderation tools.
          </p>
        </section>

        <section>
          <h2>3. User Accounts</h2>
          <h3>3.1 Account Creation</h3>
          <ul>
            <li>You must provide accurate and complete information when creating an account</li>
            <li>You must choose a unique handle</li>
            <li>You are responsible for maintaining the security of your account</li>
            <li>You must be at least 13 years old to use this service</li>
          </ul>

          <h3>3.2 Account Responsibilities</h3>
          <ul>
            <li>You are responsible for all activities under your account</li>
            <li>You must notify us immediately of any unauthorized access</li>
            <li>You may not share your account credentials with others</li>
          </ul>
        </section>

        <section>
          <h2>4. Acceptable Use</h2>
          <h3>4.1 Prohibited Activities</h3>
          <p>You agree not to:</p>
          <ul>
            <li>Send harassing, threatening, or abusive messages</li>
            <li>Send spam or unsolicited commercial messages</li>
            <li>Impersonate others or provide false information</li>
            <li>Violate any applicable laws or regulations</li>
            <li>Interfere with or disrupt the service</li>
            <li>Attempt to identify anonymous message senders</li>
            <li>Use the service for illegal purposes</li>
            <li>Reverse engineer or attempt to extract source code</li>
          </ul>

          <h3>4.2 Content Moderation</h3>
          <p>
            We reserve the right to remove, flag, or moderate any content that violates these 
            terms. Users can flag abusive content, and we may take action including account 
            suspension or termination.
          </p>
        </section>

        <section>
          <h2>5. Anonymous Messaging</h2>
          <p>
            While messages are anonymous, users must still comply with these terms. We reserve 
            the right to investigate and take action against users who abuse the anonymous 
            messaging feature.
          </p>
        </section>

        <section>
          <h2>6. Intellectual Property</h2>
          <p>
            The GhostInbox platform, including its design, features, and content, is owned by 
            us and protected by intellectual property laws. You may not copy, modify, or 
            distribute any part of the service without our written permission.
          </p>
        </section>

        <section>
          <h2>7. AI Features</h2>
          <p>
            Our AI-powered features (reply templates, theme summaries) are provided "as is" 
            and may not always be accurate. You are responsible for reviewing and editing 
            any AI-generated content before use.
          </p>
        </section>

        <section>
          <h2>8. Service Availability</h2>
          <p>
            We strive to provide reliable service but do not guarantee uninterrupted or 
            error-free operation. We may temporarily suspend the service for maintenance, 
            updates, or other reasons.
          </p>
        </section>

        <section>
          <h2>9. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, GhostInbox shall not be liable for any 
            indirect, incidental, special, consequential, or punitive damages resulting from 
            your use of the service.
          </p>
        </section>

        <section>
          <h2>10. Termination</h2>
          <p>
            We may terminate or suspend your account at any time for violations of these terms. 
            You may also delete your account at any time through your dashboard.
          </p>
        </section>

        <section>
          <h2>11. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. Continued use of the 
            service after changes constitutes acceptance of the new terms.
          </p>
        </section>

        <section>
          <h2>12. Contact Information</h2>
          <p>
            For questions about these Terms of Service, please contact us through our 
            support channels.
          </p>
        </section>
      </div>
    </div>
  )
}

