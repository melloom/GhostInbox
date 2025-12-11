# Troubleshooting Guide

## CSP/Module Loading Errors

If you're seeing errors like:
- "Loading module was blocked because of a disallowed MIME type"
- "NS_ERROR_CORRUPTED_CONTENT"
- Module loading failures

### Solution: Clear Browser Cache

The browser may have cached the old CSP policy. Try:

1. **Hard Refresh** (Recommended):
   - **Chrome/Edge**: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
   - **Firefox**: `Cmd+Shift+R` (Mac) or `Ctrl+F5` (Windows)
   - **Safari**: `Cmd+Option+R`

2. **Clear Browser Cache**:
   - Open DevTools (F12)
   - Right-click the refresh button
   - Select "Empty Cache and Hard Reload"

3. **Restart Dev Server**:
   ```bash
   # Stop the server (Ctrl+C)
   # Then restart
   npm run dev
   ```

4. **Clear Browser Storage** (if still not working):
   - Open DevTools → Application/Storage
   - Clear all site data
   - Refresh

### Why This Happened

The CSP (Content Security Policy) was moved from HTML meta tags to hosting platform headers because:
- CSP meta tags can break Vite's development server
- HTTP headers are more reliable for production
- Development works without CSP restrictions

### Verification

After clearing cache, you should see:
- ✅ No CSP errors in console
- ✅ Modules load successfully
- ✅ App works normally

If issues persist, check:
- Browser extensions (disable temporarily)
- Network tab for blocked requests
- Console for other errors

---

## Edge Function Errors

If you're seeing errors like:
- "Failed to send a request to the Edge Function"
- "Failed to generate summary: Failed to send a request to the Edge Function"
- "AI service is not available"
- "Function not found" or 404 errors

### Solution: Deploy Edge Functions

The AI features require Edge Functions to be deployed to Supabase. Follow these steps:

#### 1. Install Supabase CLI (if not already installed)
```bash
npm install -g supabase
```

#### 2. Login to Supabase
```bash
supabase login
```

#### 3. Link Your Project
```bash
# Get your project ref from Supabase Dashboard → Settings → General
supabase link --project-ref your-project-ref
```

#### 4. Deploy the OpenAI Edge Function
```bash
supabase functions deploy openai-ai
```

#### 5. Set Environment Variables

In Supabase Dashboard:
1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Add the following secret:
   - **Name**: `OPENAI_API_KEY`
   - **Value**: Your OpenAI API key (from https://platform.openai.com/api-keys)

#### 6. Verify Deployment

Check if the function is deployed:
```bash
supabase functions list
```

You should see `openai-ai` in the list.

#### 7. Test the Function

In your browser console (after logging in), you can test:
```javascript
// This should work if the function is deployed
const { data, error } = await supabase.functions.invoke('openai-ai', {
  body: { type: 'theme-summary', messages: ['test message'] }
})
console.log('Function test:', { data, error })
```

### Common Issues

#### Issue: "Function not found" or 404
**Solution**: The function is not deployed. Run `supabase functions deploy openai-ai`

#### Issue: "Unauthorized" or 401
**Solution**: Make sure you're logged in to the app

#### Issue: "OpenAI API key not configured"
**Solution**: Set the `OPENAI_API_KEY` secret in Supabase Dashboard → Edge Functions → Secrets

#### Issue: "Network error" or "Failed to fetch"
**Solution**: 
- Check your internet connection
- Verify Supabase project URL is correct in `.env`
- Check browser console for CORS errors
- Try refreshing the page

#### Issue: Function deployed but still not working
**Solution**:
1. Check Supabase Dashboard → Edge Functions → Logs for errors
2. Verify the function name matches exactly: `openai-ai`
3. Make sure you're using the correct Supabase project
4. Check that environment variables are set correctly

### Quick Check

Run this in your terminal to verify:
```bash
# Check if function exists
supabase functions list

# Check function logs
supabase functions logs openai-ai
```

### Still Not Working?

1. **Check Supabase Dashboard**:
   - Go to Edge Functions → Logs
   - Look for error messages
   - Check if function is listed

2. **Verify Environment Variables**:
   - Frontend: `.env` file has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   - Backend: Supabase Dashboard has `OPENAI_API_KEY` secret

3. **Test Authentication**:
   - Make sure you're logged in
   - Check browser console for auth errors

4. **Check Network Tab**:
   - Open DevTools → Network
   - Look for requests to `functions/v1/openai-ai`
   - Check the response status and error messages

