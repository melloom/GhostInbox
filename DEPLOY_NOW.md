# Quick Deploy OpenAI Function

## Option 1: Via Supabase Dashboard (Easiest)

1. **Go to your Supabase Dashboard:**
   - https://supabase.com/dashboard/project/YOUR_PROJECT_REF/functions

2. **Click "Create a new function"** (or edit existing `openai-ai`)

3. **Copy the function code:**
   - Open: `supabase/functions/openai-ai/index.ts`
   - Copy ALL the code

4. **Paste into the Dashboard editor** and save

5. **Set the secret:**
   - Go to: Functions → openai-ai → Manage → Secrets
   - Add: `OPENAI_API_KEY` = your OpenAI API key
   - Save

## Option 2: Install CLI and Deploy

### Install Supabase CLI (macOS):

```bash
# Option A: Using Homebrew (if installed)
brew install supabase/tap/supabase

# Option B: Direct download
# Visit: https://github.com/supabase/cli/releases
# Download the macOS binary and add to PATH
```

### Then deploy:

```bash
# Login
supabase login

# Link project (get project ref from Dashboard URL)
supabase link --project-ref YOUR_PROJECT_REF

# Deploy
supabase functions deploy openai-ai

# Set secret (via Dashboard or CLI)
# Dashboard: Functions → openai-ai → Manage → Secrets
```

## Option 3: Use Supabase CLI via npx (No Installation)

```bash
# Login
npx supabase login

# Link project
npx supabase link --project-ref YOUR_PROJECT_REF

# Deploy
npx supabase functions deploy openai-ai
```

## Verify Deployment

After deploying, test in browser console:
```javascript
const { data, error } = await supabase.functions.invoke('openai-ai', {
  body: { type: 'test' }
})
console.log('Result:', { data, error })
```

If you get a validation error (not "function not found"), it's working! ✅

