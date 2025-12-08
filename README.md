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
   - Add OpenAI API key (optional, for AI features):
     ```
     VITE_OPENAI_API_KEY=your_openai_api_key
     ```
   - Get Supabase values from: https://app.supabase.com/project/_/settings/api
   - Get OpenAI key from: https://platform.openai.com/api-keys

4. **Run the development server**:
   ```bash
   npm run dev
   ```

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

