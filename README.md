# GhostInbox

Anonymous venting platform where creators can receive anonymous messages from their audience.

## Features

- **Creator Flow**: Sign up, create vent links, share them, and receive anonymous messages
- **Visitor Flow**: Click a link, send an anonymous message with optional mood selection
- **Dashboard**: View all messages, mark as read/unread, flag abusive content
- **AI Integration**: 
  - Generate reply templates for individual messages (OpenAI-powered)
  - Summarize themes from the last 20 messages with self-care reminders

## Tech Stack

- **Frontend**: React + Vite + TypeScript
- **Backend**: Supabase (Postgres + Auth + RLS)
- **Styling**: CSS with dark theme
- **Routing**: React Router

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up Supabase**:
   - Create a new Supabase project
   - Run the SQL schema from `supabase/schema.sql` in your Supabase SQL Editor
   - Get your project URL and anon key from Supabase settings

3. **Configure environment variables**:
   - Create a `.env` file in the root directory
   - Add your Supabase credentials (required):
     ```
     VITE_SUPABASE_URL=your_supabase_project_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```
   - **⚠️ IMPORTANT**: OpenAI API key is now stored in Supabase Edge Functions (not in frontend)
   - Get Supabase values from: https://app.supabase.com/project/_/settings/api

4. **Set up security features** (required for production):
   - See `QUICK_START_SECURITY.md` for fast setup
   - Or `DEPLOYMENT_GUIDE.md` for detailed instructions
   - Deploy Edge Functions for OpenAI API and rate limiting
   - Configure authentication rate limits in Supabase Dashboard

5. **Run the development server**:
   ```bash
   npm run dev
   ```

## Deployment to Vercel

GhostInbox is configured for deployment to Vercel. See `VERCEL_DEPLOYMENT.md` for detailed instructions.

### Quick Deploy

```bash
# Install Vercel CLI
npm install -g vercel

# Login and deploy
vercel login
vercel --prod
```

### Environment Variables

Set these in Vercel Dashboard → Environment Variables:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key

**Note**: OpenAI API key is stored in Supabase Edge Functions (not in Vercel env vars).

## Security Features ✅ ALL CRITICAL FEATURES COMPLETE

### 🔴 Critical Security (100% Complete)
- ✅ **Secure OpenAI API**: API key stored in backend (Supabase Edge Functions)
- ✅ **Input Validation & Sanitization**: All inputs validated and sanitized
- ✅ **Database Constraints**: Server-side validation for all critical fields
- ✅ **XSS Protection**: Enhanced sanitization prevents script injection

### 🟠 High Priority Security (100% Complete)
- ✅ **Rate Limiting**: Message submissions limited to 5 per hour per IP per vent link
- ✅ **Authentication Rate Limiting**: Brute force protection (configure in Dashboard)
- ✅ **Message Length Limits**: 5000 character max enforced client & server-side

### 🟡 Medium Priority Security (100% Complete)
- ✅ **Content Security Policy (CSP)**: Headers configured in HTML and hosting configs
- ✅ **Security Headers**: X-Frame-Options, X-Content-Type-Options, etc.
- ✅ **Error Message Sanitization**: No information leakage

**See `SECURITY_CHECKLIST.md` for complete security documentation.**
**See `SECURITY_IMPLEMENTATION_SUMMARY.md` for implementation details.**

## Project Structure

```
GhostInbox/
├── src/
│   ├── pages/
│   │   ├── LoginPage.tsx      # Combined login/signup page
│   │   ├── Dashboard.tsx      # Creator dashboard
│   │   ├── VentPage.tsx       # Public vent page (/v/:slug)
│   │   ├── Auth.css           # Auth page styles
│   │   ├── Dashboard.css      # Dashboard styles
│   │   └── VentPage.css       # Vent page styles
│   ├── lib/
│   │   └── supabase.ts        # Supabase client & types
│   ├── App.tsx                # Main app with routing
│   ├── main.tsx               # Entry point
│   ├── App.css                # Global app styles
│   └── index.css              # Base styles & theme
├── supabase/
│   └── schema.sql             # Database schema
└── package.json
```

## Database Schema

- **profiles**: Creator profile information
- **vent_links**: Creator's vent URLs
- **vent_messages**: Anonymous messages
- **vent_summaries**: AI-generated summaries (Phase 2)

## Routes

- `/` - Redirects to dashboard or login
- `/login` - Combined login/signup page (handle required for signup, optional for login)
- `/dashboard` - Creator dashboard (protected)
- `/v/:slug` - Public vent page (anonymous message form)

## Future Enhancements

- [ ] Voice vent support
- [ ] Multiple vent links per creator
- [ ] Custom vent link titles and themes
- [ ] Message filtering and search
- [ ] Export messages to CSV/JSON

## License

MIT

