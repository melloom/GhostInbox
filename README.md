# 👻 GhostInbox

> **Anonymous messaging platform for creators** - Let your audience send you anonymous messages, feedback, and questions without revealing their identity.

🌐 **[Live Demo](https://ghost-inbox.vercel.app)** | 📖 [Documentation](#documentation) | 🚀 [Quick Start](#quick-start)

---

## ✨ Features

### 🎯 Core Features

- **🔗 Custom Vent Links** - Create unique, shareable links for anonymous messages
- **💬 Anonymous Messaging** - Receive messages without knowing who sent them
- **📊 Creator Dashboard** - Beautiful, organized dashboard to manage all your messages
- **🤖 AI-Powered Replies** - Generate thoughtful reply templates using AI (Groq/OpenAI)
- **📈 Message Analytics** - Track message trends, themes, and insights
- **🏷️ Message Organization** - Tags, folders, notes, and advanced filtering
- **⭐ Star & Archive** - Mark important messages and archive old ones
- **📤 Export Messages** - Export to CSV or JSON format

### 🎨 Advanced Features

- **📊 Polls & Voting** - Create polls with expiration dates and real-time analytics
- **💼 Private Responses** - Save private responses with templates
- **🔍 Advanced Search** - Search messages by content, mood, tags, and more
- **⌨️ Keyboard Shortcuts** - Power user shortcuts for faster navigation
- **🎭 Mood Selection** - Visitors can tag messages with emotions
- **🚩 Content Moderation** - AI-powered spam and toxicity detection
- **📱 Responsive Design** - Works perfectly on desktop, tablet, and mobile

### 🤖 AI Features

- **💡 Smart Reply Templates** - AI generates 3 contextual reply options
- **📝 Theme Summaries** - AI analyzes your messages and identifies key themes
- **🎯 Message Categorization** - Auto-categorize messages (questions, feedback, etc.)
- **⚡ Priority Scoring** - AI determines which messages need attention first
- **🔍 Insights & Analytics** - Get AI-powered insights about your audience

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- A Supabase account (free tier works!)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/melloom/GhostInbox.git
   cd GhostInbox
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Run `supabase/schema.sql` in your Supabase SQL Editor
   - Get your project URL and anon key from Settings → API

4. **Configure environment variables**
   ```bash
   # Create .env file
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Set up AI features** (optional but recommended)
   - See [GROQ_SETUP.md](./GROQ_SETUP.md) for free AI setup
   - Or [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions

---

## 🛠️ Tech Stack

- **Frontend**: React 18 + Vite + TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **AI**: Groq (free) / OpenAI (fallback)
- **Styling**: CSS with modern dark theme
- **Deployment**: Vercel-ready

---

## 📖 Documentation

### Setup Guides

- **[Quick Start Security](./QUICK_START_SECURITY.md)** - 5-minute security setup
- **[Deployment Guide](./DEPLOYMENT_GUIDE.md)** - Complete deployment instructions
- **[Vercel Deployment](./VERCEL_DEPLOYMENT.md)** - Deploy to Vercel
- **[Groq Setup](./GROQ_SETUP.md)** - Free AI setup with Groq

### Feature Documentation

- **[Features List](./FEATURES.md)** - Complete feature list
- **[AI Functions](./AI_FUNCTIONS_STATUS.md)** - AI features documentation
- **[Security Checklist](./SECURITY_CHECKLIST.md)** - Security features

### Troubleshooting

- **[Troubleshooting Guide](./TROUBLESHOOTING.md)** - Common issues and solutions
- **[403 Errors](./TROUBLESHOOTING_403.md)** - Fix 403 errors
- **[Edge Function Issues](./DIAGNOSE_EDGE_FUNCTION.md)** - Debug Edge Functions

---

## 🔒 Security

GhostInbox is built with security as a top priority:

- ✅ **Secure API Keys** - All API keys stored in backend (Supabase Edge Functions)
- ✅ **Rate Limiting** - 5 messages/hour per IP to prevent spam
- ✅ **Input Validation** - All inputs validated and sanitized
- ✅ **XSS Protection** - Enhanced sanitization prevents script injection
- ✅ **Authentication** - Secure auth with Supabase
- ✅ **Content Moderation** - AI-powered spam and toxicity detection

See [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md) for complete security documentation.

---

## 🎯 Use Cases

- **Content Creators** - Receive anonymous feedback and questions
- **YouTubers** - Let viewers ask questions anonymously
- **Streamers** - Get anonymous messages during streams
- **Educators** - Allow students to ask questions anonymously
- **Mental Health** - Provide a safe space for anonymous sharing
- **Community Leaders** - Gather anonymous community feedback

---

## 📸 Screenshots

### Dashboard
Manage all your messages in one beautiful dashboard with search, filters, and AI-powered insights.

### Anonymous Messaging
Visitors can send messages anonymously through your custom vent link.

### AI-Powered Replies
Get AI-generated reply templates that are contextual and thoughtful.

---

## 🚀 Deployment

### Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Login and deploy
vercel login
vercel --prod
```

Set environment variables in Vercel Dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed instructions.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- Built with [Supabase](https://supabase.com) for backend
- AI powered by [Groq](https://groq.com) and [OpenAI](https://openai.com)
- Deployed on [Vercel](https://vercel.com)

---

## 📞 Support

- 🌐 **Live Site**: [ghost-inbox.vercel.app](https://ghost-inbox.vercel.app)
- 📧 **Issues**: [GitHub Issues](https://github.com/melloom/GhostInbox/issues)
- 📖 **Documentation**: See [Documentation](#documentation) section above

---

<div align="center">

**Made with ❤️ for creators who want to connect with their audience**

[⭐ Star this repo](https://github.com/melloom/GhostInbox) | [🚀 Deploy Now](./VERCEL_DEPLOYMENT.md) | [📖 Read Docs](./DEPLOYMENT_GUIDE.md)

</div>
