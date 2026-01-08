# Diagnose Edge Function Connection Issue

## Quick Diagnostic Steps

### 1. Check Environment Variables

Open your browser console (F12) and run:
```javascript
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('Has Anon Key:', !!import.meta.env.VITE_SUPABASE_ANON_KEY)
```

**Expected:**
- Supabase URL should start with `https://` and end with `.supabase.co`
- Anon Key should be a long JWT token

**If missing:** Check your `.env` file in the project root.

### 2. Verify Edge Function is Deployed

1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_REF/functions
2. Look for `openai-ai` in the list
3. If it's not there, deploy it:
   ```bash
   supabase functions deploy openai-ai
   ```

### 3. Check Edge Function Secrets

1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_REF/functions/openai-ai
2. Click **Manage** → **Secrets**
3. Verify `OPENAI_API_KEY` is set
4. If missing, add it:
   - Name: `OPENAI_API_KEY`
   - Value: Your OpenAI API key from https://platform.openai.com/api-keys

### 4. Test Edge Function Directly

In your browser console, run:
```javascript
const { data: { session } } = await supabase.auth.getSession()
console.log('Session:', session ? 'Logged in' : 'Not logged in')

if (session) {
  const { data, error } = await supabase.functions.invoke('openai-ai', {
    body: { type: 'test' }
  })
  console.log('Test result:', { data, error })
}
```

**Expected results:**
- If function exists: You'll get a validation error (which is OK - means function is accessible)
- If function doesn't exist: You'll get "Function not found" or 404
- If not logged in: You'll get authentication error

### 5. Check Network Tab

1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Try generating a reply
4. Look for a request to `/functions/v1/openai-ai`
5. Check:
   - **Status code**: Should be 200 (success) or 400/401 (auth/validation issue)
   - **Request URL**: Should match your Supabase URL
   - **Request Headers**: Should include `Authorization: Bearer ...`

### 6. Common Issues & Solutions

#### Issue: "Function not found" or 404
**Solution:** Deploy the function:
```bash
supabase functions deploy openai-ai
```

#### Issue: "Failed to fetch" or Network error
**Possible causes:**
1. **Wrong Supabase URL** - Check your `.env` file
2. **CORS issue** - Edge Function should handle CORS automatically
3. **Function not deployed** - Deploy it first
4. **Network connectivity** - Check your internet connection

#### Issue: "Unauthorized" or 401
**Solution:** Make sure you're logged in to the app

#### Issue: "OpenAI API key not configured" or 500
**Solution:** Set the `OPENAI_API_KEY` secret in Edge Function settings

## Manual Deployment Steps

If the function isn't deployed:

1. **Install Supabase CLI** (if not installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link your project**:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```
   (Find your project ref in Supabase Dashboard URL)

4. **Deploy the function**:
   ```bash
   supabase functions deploy openai-ai
   ```

5. **Set the secret**:
   - Go to Supabase Dashboard → Edge Functions → openai-ai → Manage → Secrets
   - Add: `OPENAI_API_KEY` = your OpenAI API key

## Still Having Issues?

Check the browser console for detailed error logs. The improved error handling will now show:
- Whether Supabase URL is configured
- Whether you're logged in
- The exact error message from the Edge Function

