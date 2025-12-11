# Fix AI Edge Function - Quick Guide

## ✅ The Answer: NO VITE_ Prefix!

**Supabase Edge Function secrets use REGULAR names (NO `VITE_` prefix).**

- ❌ **WRONG**: `VITE_OPENAI_API_KEY`
- ✅ **CORRECT**: `OPENAI_API_KEY`

The `VITE_` prefix is ONLY for frontend `.env` files, NOT for Edge Function secrets!

## 🔧 Step-by-Step Fix

### 1. Check Your Edge Function Secrets

Go to: **Supabase Dashboard → Edge Functions → openai-ai → Manage → Secrets**

You should have:
- ✅ `OPENAI_API_KEY` = your OpenAI API key (NO VITE_ prefix!)

### 2. Verify the Secret Name

The secret name must be exactly: `OPENAI_API_KEY`

**Common mistakes:**
- ❌ `VITE_OPENAI_API_KEY` (wrong - has VITE_ prefix)
- ❌ `OPENAI_API_KEY_` (wrong - extra underscore)
- ✅ `OPENAI_API_KEY` (correct!)

### 3. Check Edge Function Code

The Edge Function expects:
```typescript
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
```

So the secret name must match: `OPENAI_API_KEY`

### 4. Additional Secrets (Usually Auto-Provided)

The Edge Function also uses:
- `SUPABASE_URL` - Usually auto-provided by Supabase
- `SUPABASE_ANON_KEY` - Usually auto-provided by Supabase

**If you're still getting errors**, you might need to add these manually:
1. Go to: **Settings → API**
2. Copy your **Project URL** → Add as secret: `SUPABASE_URL`
3. Copy your **anon public key** → Add as secret: `SUPABASE_ANON_KEY`

⚠️ **Note**: Some Supabase projects auto-inject these, so you might not need to set them.

### 5. Verify Deployment

Make sure the function is deployed:
```bash
supabase functions deploy openai-ai
```

### 6. Test the Function

After setting secrets, test in your app:
1. Log in
2. Go to Dashboard
3. Select a message
4. Click "Generate Reply Templates"

## 🐛 Troubleshooting

### Error: "Network error" or "Edge Function may not be deployed"

**Check:**
1. ✅ Function is deployed: `supabase functions list`
2. ✅ Secret name is exactly `OPENAI_API_KEY` (no VITE_ prefix)
3. ✅ Secret value is your valid OpenAI API key
4. ✅ You're logged in (function requires authentication)

### Error: "OpenAI API key not configured"

**Fix:**
- Go to Edge Function secrets
- Verify `OPENAI_API_KEY` exists (not `VITE_OPENAI_API_KEY`)
- Verify the value is correct
- Save and wait 30 seconds for changes to propagate

### Error: "Unauthorized" or 401

**Fix:**
- Make sure you're logged in
- Try logging out and back in
- Check your session is valid

## 📋 Quick Checklist

- [ ] Edge Function `openai-ai` is deployed
- [ ] Secret name is `OPENAI_API_KEY` (NO VITE_ prefix)
- [ ] Secret value is your OpenAI API key
- [ ] You're logged in to the app
- [ ] Function logs show no errors (Dashboard → Edge Functions → Logs)

## 🎯 Summary

**Frontend `.env` file:**
```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

**Supabase Edge Function Secrets:**
```
OPENAI_API_KEY=...  ← NO VITE_ prefix!
```

That's the key difference! 🚀

