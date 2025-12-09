import { Link } from 'react-router-dom'
import './LegalPage.css'

export default function DataLeakDocumentation() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <Link to="/" className="back-link">← Back to Home</Link>
        <h1>Data Leak Documentation</h1>
        <p className="last-updated">Last updated: {new Date().toLocaleDateString()}</p>
        
        <section>
          <h2>Overview</h2>
          <p>
            This document provides comprehensive information about our data handling practices, 
            security measures, and procedures in the event of a data breach or leak. GhostInbox 
            is committed to transparency and protecting user privacy.
          </p>
        </section>

        <section>
          <h2>1. Data Collection and Storage</h2>
          <h3>1.1 What Data We Collect</h3>
          <ul>
            <li><strong>Creator Accounts:</strong> Email address, handle, display name, account creation timestamp</li>
            <li><strong>Vent Links:</strong> Unique slugs, titles, active status, creation dates</li>
            <li><strong>Messages:</strong> Message content, mood selections, read/flagged status, timestamps</li>
            <li><strong>Technical Data:</strong> Hashed IP addresses (for abuse prevention), device information</li>
          </ul>

          <h3>1.2 What We Don't Collect</h3>
          <ul>
            <li>Personally identifiable information from anonymous message senders</li>
            <li>Real IP addresses (only hashed versions for security)</li>
            <li>Location data</li>
            <li>Payment information (if applicable in future)</li>
            <li>Third-party social media data</li>
          </ul>
        </section>

        <section>
          <h2>2. Data Storage and Security</h2>
          <h3>2.1 Infrastructure</h3>
          <ul>
            <li>Data is stored in Supabase (PostgreSQL database)</li>
            <li>All data is encrypted at rest</li>
            <li>All connections use TLS/SSL encryption</li>
            <li>Row-level security (RLS) policies enforce data access controls</li>
          </ul>

          <h3>2.2 Security Measures</h3>
          <ul>
            <li>Authentication via Supabase Auth (industry-standard OAuth and email/password)</li>
            <li>IP addresses are hashed using SHA-256 before storage</li>
            <li>Regular security audits and updates</li>
            <li>Access logging and monitoring</li>
            <li>Automatic backups with point-in-time recovery</li>
          </ul>
        </section>

        <section>
          <h2>3. Data Access Controls</h2>
          <h3>3.1 Who Can Access Data</h3>
          <ul>
            <li><strong>Creators:</strong> Can only access their own profile, vent links, and messages</li>
            <li><strong>Anonymous Senders:</strong> Cannot access any stored data</li>
            <li><strong>Administrators:</strong> Limited access for support and abuse prevention</li>
            <li><strong>Third Parties:</strong> Only Supabase (as our infrastructure provider) with strict contractual obligations</li>
          </ul>

          <h3>3.2 Row-Level Security Policies</h3>
          <p>
            Our database uses Row-Level Security (RLS) to ensure users can only access their own data. 
            Policies are enforced at the database level, preventing unauthorized access even if application 
            code has bugs.
          </p>
        </section>

        <section>
          <h2>4. Data Breach Response Plan</h2>
          <h3>4.1 Detection</h3>
          <ul>
            <li>Automated monitoring for suspicious activity</li>
            <li>Regular security audits</li>
            <li>User reporting mechanisms</li>
            <li>Third-party security scanning</li>
          </ul>

          <h3>4.2 Response Procedures</h3>
          <p>In the event of a suspected or confirmed data breach:</p>
          <ol>
            <li><strong>Immediate Containment:</strong> Isolate affected systems and prevent further access</li>
            <li><strong>Assessment:</strong> Determine the scope and nature of the breach</li>
            <li><strong>Notification:</strong> Notify affected users within 72 hours of discovery</li>
            <li><strong>Remediation:</strong> Fix vulnerabilities and restore secure operations</li>
            <li><strong>Documentation:</strong> Document the incident and lessons learned</li>
            <li><strong>Regulatory Compliance:</strong> Report to relevant authorities if required by law</li>
          </ol>

          <h3>4.3 User Notification</h3>
          <p>
            If a data breach affects your account, we will notify you via:
          </p>
          <ul>
            <li>Email to your registered account</li>
            <li>In-app notification</li>
            <li>Public announcement if the breach is widespread</li>
          </ul>
          <p>
            Notifications will include:
          </p>
          <ul>
            <li>What data was affected</li>
            <li>What we're doing to address it</li>
            <li>Steps you should take to protect yourself</li>
            <li>How to contact us for more information</li>
          </ul>
        </section>

        <section>
          <h2>5. Data Retention and Deletion</h2>
          <h3>5.1 Retention Periods</h3>
          <ul>
            <li><strong>Active Accounts:</strong> Data retained while account is active</li>
            <li><strong>Deleted Accounts:</strong> Data deleted within 30 days of account deletion</li>
            <li><strong>Backups:</strong> Backups retained for 90 days, then permanently deleted</li>
            <li><strong>Legal Requirements:</strong> Some data may be retained longer if required by law</li>
          </ul>

          <h3>5.2 Deletion Process</h3>
          <p>
            When you delete your account:
          </p>
          <ul>
            <li>All personal data is permanently removed from active databases</li>
            <li>Associated vent links and messages are deleted</li>
            <li>Data is removed from backups during the next backup cycle</li>
            <li>Hashed IP addresses are anonymized beyond recovery</li>
          </ul>
        </section>

        <section>
          <h2>6. Third-Party Services</h2>
          <h3>6.1 Service Providers</h3>
          <ul>
            <li><strong>Supabase:</strong> Database, authentication, and hosting infrastructure</li>
            <li><strong>OpenAI:</strong> AI-powered features (reply templates, summaries)</li>
          </ul>

          <h3>6.2 Data Sharing</h3>
          <p>
            We only share data with third parties as necessary to provide our service. All 
            third-party providers are contractually obligated to:
          </p>
          <ul>
            <li>Maintain appropriate security measures</li>
            <li>Use data only for specified purposes</li>
            <li>Comply with applicable privacy laws</li>
            <li>Notify us of any security incidents</li>
          </ul>
        </section>

        <section>
          <h2>7. Anonymous Messaging Security</h2>
          <p>
            To maintain true anonymity:
          </p>
          <ul>
            <li>We do not store sender email addresses or names</li>
            <li>IP addresses are hashed immediately upon receipt</li>
            <li>No tracking cookies or identifiers are used for senders</li>
            <li>Messages cannot be traced back to individual senders</li>
            <li>Even administrators cannot identify anonymous message senders</li>
          </ul>
        </section>

        <section>
          <h2>8. Compliance and Regulations</h2>
          <p>
            GhostInbox complies with:
          </p>
          <ul>
            <li>General Data Protection Regulation (GDPR) - for EU users</li>
            <li>California Consumer Privacy Act (CCPA) - for California users</li>
            <li>Children's Online Privacy Protection Act (COPPA) - we do not knowingly collect data from children under 13</li>
          </ul>
        </section>

        <section>
          <h2>9. Security Best Practices for Users</h2>
          <p>To help protect your data:</p>
          <ul>
            <li>Use a strong, unique password</li>
            <li>Enable two-factor authentication if available</li>
            <li>Don't share your account credentials</li>
            <li>Regularly review your account activity</li>
            <li>Report suspicious activity immediately</li>
          </ul>
        </section>

        <section>
          <h2>10. Contact and Reporting</h2>
          <p>
            If you have concerns about data security or suspect a breach:
          </p>
          <ul>
            <li>Contact us immediately through our support channels</li>
            <li>Report any security vulnerabilities responsibly</li>
            <li>We take all security reports seriously and investigate promptly</li>
          </ul>
        </section>

        <section>
          <h2>11. Updates to This Documentation</h2>
          <p>
            This documentation is updated regularly to reflect changes in our practices, 
            infrastructure, or legal requirements. The "Last updated" date at the top 
            indicates when this document was last revised.
          </p>
        </section>
      </div>
    </div>
  )
}

