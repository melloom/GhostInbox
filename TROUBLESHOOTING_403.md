# Troubleshooting 403 Errors

## Common Causes of 403 Errors

### 1. Missing Supabase Environment Variables

**Symptom**: 403 errors on page load, especially when checking authentication.

**Solution**: 
1. Check your `.env` file has:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
2. Restart your dev server after adding variables
3. Verify values in Supabase Dashboard → Settings → API

### 2. Row Level Security (RLS) Policies

**Symptom**: 403 errors when trying to read/write data.

**Solution**:
1. Check RLS policies in Supabase Dashboard → Authentication → Policies
2. Ensure policies allow:
   - Public read access for `vent_links` (for public vent pages)
   - Owner access for `profiles`, `vent_links`, and `vent_messages`
3. Run `supabase/schema.sql` to ensure RLS policies are set up correctly

### 3. Edge Functions Not Deployed

**Symptom**: 403 errors when using AI features (reply templates, summaries).

**Solution**:
1. Deploy Edge Functions:
   ```bash
   supabase functions deploy openai-ai
   supabase functions deploy rate-limit-messages
   ```
2. Set environment variables in Supabase Dashboard → Edge Functions → Secrets:
   - `OPENAI_API_KEY` for `openai-ai` function
   - `SERVICE_ROLE_KEY` for `rate-limit-messages` function

### 4. Unauthenticated Access

**Symptom**: 403 errors when not logged in (this is normal for protected routes).

**Solution**: 
- This is expected behavior - users must log in to access dashboard
- Public vent pages (`/v/:slug`) should work without authentication

### 5. CORS Issues

**Symptom**: 403 errors in browser console related to CORS.

**Solution**:
1. Check Supabase Dashboard → Settings → API → CORS
2. Add your domain to allowed origins:
   - `http://localhost:5173` (development)
   - `https://your-domain.vercel.app` (production)

## Quick Fixes

### Check Environment Variables
```bash
# In your terminal, verify variables are loaded
echo $VITE_SUPABASE_URL
```

### Verify Supabase Connection
1. Open browser DevTools → Network tab
2. Look for requests to `*.supabase.co`
3. Check response status codes:
   - 200 = Success
   - 401 = Authentication required (normal for unauthenticated users)
   - 403 = Permission denied (check RLS policies)
   - 404 = Resource not found

### Test RLS Policies
Run this in Supabase SQL Editor:
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Test a query (should work if RLS is configured correctly)
SELECT * FROM vent_links LIMIT 1;
```

## Still Having Issues?

1. **Check Supabase Dashboard Logs**:
   - Go to Logs → API Logs
   - Look for 403 errors and their details

2. **Verify Database Schema**:
   - Run `supabase/schema.sql` in SQL Editor
   - Ensure all tables and RLS policies are created

3. **Check Browser Console**:
   - Look for specific error messages
   - Check which API call is failing

4. **Test with Supabase Client**:
   ```typescript
   // In browser console
   const { data, error } = await supabase.from('vent_links').select('*').limit(1)
   console.log('Data:', data, 'Error:', error)
   ```

## Expected 403 Errors (Normal)

These 403 errors are **normal** and can be ignored:
- Checking session when not logged in
- Accessing protected routes without authentication
- Edge Functions requiring authentication (if not logged in)

The app handles these gracefully by redirecting to login or showing appropriate messages.

