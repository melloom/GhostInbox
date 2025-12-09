# Deployment Guide for GhostInbox Security Features

## 🔐 Critical Security Setup

### 1. Supabase Edge Functions Setup

#### Prerequisites
- Supabase CLI installed: `npm install -g supabase`
- Logged into Supabase: `supabase login`

#### Deploy Edge Functions

1. **Link your project**:
   ```bash
   supabase link --project-ref your-project-ref
   ```

2. **Deploy OpenAI Edge Function**:
   ```bash
   supabase functions deploy openai-ai
   ```

3. **Deploy Rate Limiting Edge Function**:
   ```bash
   supabase functions deploy rate-limit-messages
   ```

#### Set Environment Variables

In your Supabase Dashboard → Project Settings → Edge Functions → Secrets:

1. **For `openai-ai` function**:
   - `OPENAI_API_KEY`: Your OpenAI API key (get from https://platform.openai.com/api-keys)

2. **For `rate-limit-messages` function**:
   - `SERVICE_ROLE_KEY`: Your Supabase service role key (from Project Settings → API)
     - ⚠️ Note: Secret name cannot start with `SUPABASE_` prefix

#### Test Edge Functions

```bash
# Test OpenAI function (requires authentication)
supabase functions serve openai-ai

# Test rate limit function
supabase functions serve rate-limit-messages
```

### 2. Database Setup

Run the rate limiting SQL in your Supabase SQL Editor:

```bash
# Copy and paste the contents of supabase/rate_limiting_setup.sql
# into your Supabase SQL Editor and execute it
```

This will:
- Create IP hashing function
- Add indexes for faster rate limit queries
- Create rate limit check function

### 3. Environment Variables

#### Frontend (.env)
Remove the OpenAI API key from frontend (it's now in the backend):

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
# VITE_OPENAI_API_KEY - REMOVE THIS! It's now in Edge Function
```

#### Supabase Edge Functions (Set in Dashboard)
- `OPENAI_API_KEY`: Your OpenAI API key
- `SERVICE_ROLE_KEY`: Your Supabase service role key
  - ⚠️ Note: Secret name cannot start with `SUPABASE_` prefix

### 4. Authentication Rate Limiting

Configure in Supabase Dashboard:

1. Go to **Authentication** → **Settings** → **Rate Limits**
2. Enable rate limiting for:
   - **Sign up**: 5 attempts per hour per IP
   - **Sign in**: 5 attempts per hour per IP
   - **Password reset**: 3 attempts per hour per IP

### 5. Update Frontend Code

The frontend code has already been updated to:
- ✅ Call Edge Functions instead of OpenAI directly
- ✅ Check rate limits before submitting messages
- ✅ Handle rate limit errors gracefully

### 6. Verify Security

#### Test OpenAI Function
1. Log into your app
2. Go to Dashboard
3. Select a message and click "Generate Reply Templates"
4. Should work without exposing API key

#### Test Rate Limiting
1. Go to a vent page
2. Submit 5 messages quickly
3. 6th message should be blocked with rate limit error

#### Check for Exposed Keys
1. Build your app: `npm run build`
2. Search for "OPENAI" in `dist/` folder
3. Should NOT find any API keys

## 🔒 Security Checklist

- [ ] Edge Functions deployed
- [ ] Environment variables set in Supabase Dashboard
- [ ] Rate limiting SQL executed
- [ ] Authentication rate limits configured
- [ ] OpenAI API key removed from frontend `.env`
- [ ] Tested OpenAI function works
- [ ] Tested rate limiting works
- [ ] Verified no API keys in production build

## 🚨 Important Notes

1. **Never commit `.env` files** - They're already in `.gitignore`
2. **Rotate API keys regularly** - Especially if exposed
3. **Monitor Edge Function logs** - Check for abuse
4. **Set up alerts** - For unusual API usage patterns
5. **Use different keys** - For dev/staging/production

## 📊 Monitoring

Monitor these in Supabase Dashboard:

1. **Edge Functions** → **Logs**: Check for errors
2. **Database** → **Logs**: Check for rate limit violations
3. **Authentication** → **Logs**: Check for brute force attempts

## 🆘 Troubleshooting

### Edge Function not working?
- Check environment variables are set
- Check function is deployed: `supabase functions list`
- Check logs: `supabase functions logs openai-ai`

### Rate limiting not working?
- Verify SQL functions are created
- Check Edge Function is deployed
- Verify service role key is set

### OpenAI errors?
- Check API key is valid
- Check API key has credits
- Check function logs for detailed errors

