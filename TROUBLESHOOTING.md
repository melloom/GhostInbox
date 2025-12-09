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

