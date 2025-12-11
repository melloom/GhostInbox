# Vercel Deployment Guide for GhostInbox

## 🚀 Quick Deploy to Vercel

### Option 1: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Link to existing project? **No** (first time) or **Yes** (updates)
   - Project name: `ghostinbox` (or your choice)
   - Directory: `./` (current directory)
   - Override settings? **No**

4. **Deploy to Production**:
   ```bash
   vercel --prod
   ```

### Option 2: Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click **"Add New Project"**
3. Import your Git repository (GitHub/GitLab/Bitbucket)
4. Vercel will auto-detect Vite
5. Configure environment variables (see below)
6. Click **"Deploy"**

## ⚙️ Configuration

### Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables, add:

**Production, Preview, Development:**
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**⚠️ IMPORTANT**: Do NOT add `VITE_OPENAI_API_KEY` - it's now in Supabase Edge Functions!

### Build Settings

Vercel will auto-detect these from `vercel.json`:
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Redirect URLs (Supabase)

In Supabase Dashboard → Authentication → URL Configuration:

**Add these redirect URLs:**
- `https://your-app.vercel.app/reset-password` (production)
- `https://your-app-*.vercel.app/reset-password` (preview deployments)
- `http://localhost:5173/reset-password` (development)

## 🔒 Security Headers

Security headers are already configured in `vercel.json`:
- ✅ X-Frame-Options
- ✅ X-Content-Type-Options
- ✅ Content-Security-Policy
- ✅ Referrer-Policy
- ✅ Permissions-Policy
- ✅ Strict-Transport-Security

## 📁 File Structure

Vercel will use:
- `vercel.json` - Deployment configuration
- `package.json` - Build scripts
- `vite.config.ts` - Vite configuration
- `dist/` - Build output (auto-generated)

## 🔄 Client-Side Routing

The `vercel.json` includes rewrites to handle React Router:
- All routes (`/*`) redirect to `index.html`
- This enables client-side routing to work correctly

## 🚀 Deployment Steps

1. **Set Environment Variables** in Vercel Dashboard
2. **Deploy**:
   ```bash
   vercel --prod
   ```
3. **Verify**:
   - Check that the app loads
   - Test authentication
   - Test password reset
   - Verify security headers (use browser DevTools → Network)

## 🔍 Post-Deployment Checklist

- [ ] App loads correctly
- [ ] Authentication works (login/signup)
- [ ] Password reset works
- [ ] All routes work (dashboard, vent pages, etc.)
- [ ] Security headers are present (check Network tab)
- [ ] No console errors
- [ ] Environment variables are set
- [ ] Supabase redirect URLs configured

## 🐛 Troubleshooting

### Build Fails
- Check build logs in Vercel Dashboard
- Ensure all dependencies are in `package.json`
- Verify TypeScript compiles: `npm run build`

### Routes Don't Work
- Verify `vercel.json` has rewrites configured
- Check that all routes redirect to `index.html`

### Environment Variables Not Working
- Ensure variables start with `VITE_` prefix
- Rebuild after adding variables
- Check variable names match exactly

### 404 Errors
- Verify rewrites in `vercel.json`
- Check that `dist/index.html` exists after build

## 📊 Monitoring

Monitor your deployment in Vercel Dashboard:
- **Deployments**: View build logs and status
- **Analytics**: Track performance
- **Logs**: View runtime logs
- **Settings**: Configure domains, environment variables

## 🔗 Useful Links

- [Vercel Dashboard](https://vercel.com/dashboard)
- [Vercel CLI Docs](https://vercel.com/docs/cli)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html#vercel)

## ✨ Quick Commands

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# View deployment logs
vercel logs

# List deployments
vercel ls

# Remove deployment
vercel remove
```

