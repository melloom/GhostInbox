import { Link } from 'react-router-dom'
import './LegalPage.css'

export default function PrivacyPolicy() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <Link to="/" className="back-link">← Back to Home</Link>
        <h1>Privacy Policy</h1>
        <p className="last-updated">Last updated: {new Date().toLocaleDateString()}</p>
        
        <section>
          <h2>1. Introduction</h2>
          <p>
            GhostInbox ("we," "our," or "us") is committed to protecting your privacy. 
            This Privacy Policy explains how we collect, use, disclose, and safeguard 
            your information when you use our anonymous messaging platform.
          </p>
        </section>

        <section>
          <h2>2. Information We Collect</h2>
          <h3>2.1 Information You Provide</h3>
          <ul>
            <li>Account information: email address, handle, display name</li>
            <li>Messages: anonymous messages sent through vent links</li>
            <li>Mood selections: optional mood indicators attached to messages</li>
          </ul>

          <h3>2.2 Automatically Collected Information</h3>
          <ul>
            <li>IP addresses (hashed for privacy)</li>
            <li>Usage data and analytics</li>
            <li>Device information</li>
            <li>Cookies and similar tracking technologies</li>
          </ul>
        </section>

        <section>
          <h2>3. How We Use Your Information</h2>
          <ul>
            <li>To provide and maintain our service</li>
            <li>To process anonymous messages</li>
            <li>To improve our platform and user experience</li>
            <li>To detect and prevent abuse or fraudulent activity</li>
            <li>To comply with legal obligations</li>
          </ul>
        </section>

        <section>
          <h2>4. Anonymous Messaging</h2>
          <p>
            Messages sent through vent links are anonymous. We do not collect or store 
            personally identifiable information about message senders. IP addresses are 
            hashed to prevent identification while still allowing us to detect abuse patterns.
          </p>
        </section>

        <section>
          <h2>5. Data Security</h2>
          <p>
            We implement industry-standard security measures to protect your data, including:
          </p>
          <ul>
            <li>Encryption in transit and at rest</li>
            <li>Secure authentication via Supabase</li>
            <li>Row-level security policies</li>
            <li>Regular security audits</li>
          </ul>
        </section>

        <section>
          <h2>6. Data Retention</h2>
          <p>
            We retain your data only as long as necessary to provide our services or as 
            required by law. You can delete your account and associated data at any time 
            through your dashboard.
          </p>
        </section>

        <section>
          <h2>7. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Delete your account and data</li>
            <li>Export your data</li>
            <li>Opt-out of certain data processing</li>
          </ul>
        </section>

        <section>
          <h2>8. Third-Party Services</h2>
          <p>
            We use Supabase for authentication and database services, and OpenAI for 
            AI-powered features. These services have their own privacy policies governing 
            data handling.
          </p>
        </section>

        <section>
          <h2>9. Children's Privacy</h2>
          <p>
            Our service is not intended for users under 13 years of age. We do not knowingly 
            collect personal information from children under 13.
          </p>
        </section>

        <section>
          <h2>10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any 
            changes by posting the new policy on this page and updating the "Last updated" date.
          </p>
        </section>

        <section>
          <h2>11. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us through 
            our support channels.
          </p>
        </section>
      </div>
    </div>
  )
}

