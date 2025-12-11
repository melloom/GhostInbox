# Groq Setup Guide - Use Groq First, Fallback to OpenAI

## ✅ What's Been Done

The Edge Function has been updated to:
1. **Try Groq first** (free, fast)
2. **Fallback to OpenAI** if Groq fails or isn't configured

## 🔑 Environment Variable

**Name**: `GROQ_API_KEY`

**Value**: Your Groq API key (you provided: `your_groq_api_key_here`)

## 📝 How to Set It Up

### Step 1: Add Groq API Key to Supabase

1. Go to **Supabase Dashboard** → **Edge Functions** → **openai-ai**
2. Click **Manage** → **Secrets**
3. Click **Add Secret**
4. **Name**: `GROQ_API_KEY`
5. **Value**: `your_groq_api_key_here`
6. Click **Save**

### Step 2: Keep OpenAI Key (Optional Fallback)

You can keep `OPENAI_API_KEY` as a fallback, or remove it if you only want Groq.

### Step 3: Redeploy Edge Function

```bash
supabase functions deploy openai-ai
```

## 🎯 How It Works

1. **First attempt**: Tries Groq API (free, fast)
2. **If Groq fails**: Automatically falls back to OpenAI
3. **If both fail**: Returns an error

## 📊 Groq Models Used

- **Default**: `llama-3.1-70b-versatile` (replaces `gpt-4o-mini`)
- **Fast**: Groq is extremely fast (uses LPU inference)
- **Free**: Generous free tier

## ✅ Testing

After setup, test any AI feature:
- Generate reply templates
- Summarize themes
- Generate insights
- All will use Groq first!

## 🔍 Check Logs

To see which provider is being used:
1. Go to **Supabase Dashboard** → **Edge Functions** → **openai-ai** → **Logs**
2. Look for: `"Attempting Groq API call..."` or `"Using OpenAI API (fallback)"`

## 🎉 Benefits

- ✅ **Free**: Groq has generous free tier
- ✅ **Fast**: Groq is extremely fast
- ✅ **Reliable**: Falls back to OpenAI if needed
- ✅ **No code changes**: Works with existing frontend

## ⚠️ Notes

- Groq uses `llama-3.1-70b-versatile` model (similar quality to GPT-4o-mini)
- If you want to force OpenAI, just remove `GROQ_API_KEY`
- Both keys can coexist - Groq will be tried first

