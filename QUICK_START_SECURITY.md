# Quick Start: Security Setup

## 🚀 Fast Setup (5 minutes)

### Step 1: Deploy Edge Functions

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy functions
supabase functions deploy openai-ai
supabase functions deploy rate-limit-messages
```

### Step 2: Set Environment Variables

In Supabase Dashboard → Project Settings → Edge Functions → Secrets:

**For `openai-ai` function:**
- `OPENAI_API_KEY` = your OpenAI API key

**For `rate-limit-messages` function:**
- `SERVICE_ROLE_KEY` = your service role key (from API settings)
  - ⚠️ Note: Secret name cannot start with `SUPABASE_` prefix

### Step 3: Run Database Setup

1. Go to Supabase Dashboard → SQL Editor
2. Copy/paste contents of `supabase/rate_limiting_setup.sql`
3. Click "Run"

### Step 4: Configure Auth Rate Limits

1. Go to Supabase Dashboard → Authentication → Settings → Rate Limits
2. Enable:
   - Sign up: 5/hour
   - Sign in: 5/hour
   - Password reset: 3/hour

### Step 5: Remove OpenAI Key from Frontend

In your `.env` file, **REMOVE** this line:
```env
# VITE_OPENAI_API_KEY=...  <-- DELETE THIS!
```

Keep only:
```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### Step 6: Test

1. **Test AI**: Login → Dashboard → Select message → "Generate Reply Templates"
2. **Test Rate Limit**: Go to vent page → Submit 6 messages quickly → 6th should be blocked

## ✅ Done!

Your app is now secure:
- ✅ OpenAI API key is in backend (not exposed)
- ✅ Rate limiting is active
- ✅ Authentication rate limiting is configured

## 📚 Full Documentation

See `DEPLOYMENT_GUIDE.md` for detailed instructions and troubleshooting.

