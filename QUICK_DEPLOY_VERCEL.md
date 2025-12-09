# Quick Deploy to Vercel - 3 Steps

## 🚀 Fastest Way to Deploy

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login
```bash
vercel login
```

### Step 3: Deploy
```bash
# Preview deployment
vercel

# Production deployment
vercel --prod
```

That's it! 🎉

## ⚙️ Set Environment Variables

After first deployment, go to Vercel Dashboard:

1. Open your project
2. Go to **Settings** → **Environment Variables**
3. Add:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
4. **Redeploy** (or wait for auto-redeploy)

## ✅ Done!

Your app is now live on Vercel!

**Next Steps:**
- Configure Supabase redirect URLs (see `VERCEL_DEPLOYMENT.md`)
- Test all features
- Set up custom domain (optional)

See `VERCEL_DEPLOYMENT.md` for detailed instructions.

