# How to Get Your Supabase Service Role Key

## Step-by-Step Instructions

### 1. Go to Supabase Dashboard
Open: https://supabase.com/dashboard/project/eywxxguildtrvpzminqv

### 2. Navigate to Project Settings
- Click on the **gear icon** (⚙️) in the left sidebar
- Or go to: **Settings** → **API**

### 3. Find the Service Role Key
- Scroll down to the **Project API keys** section
- You'll see two keys:
  - **anon** `public` - This is your public key (already in your .env)
  - **service_role** `secret` - **This is what you need!**

### 4. Copy the Service Role Key
- Click the **eye icon** 👁️ to reveal the service_role key
- Click **Copy** to copy it
- ⚠️ **WARNING**: This key has full database access. Keep it secret!

### 5. Add it to Edge Function Secrets
1. Go to: **Edge Functions** in the left sidebar
2. Click on **rate-limit-messages** function
3. Click **Manage** → **Secrets**
4. Click **Add Secret**
5. Name: `SERVICE_ROLE_KEY` (⚠️ Note: Cannot start with SUPABASE_ prefix)
6. Value: Paste your service_role key
7. Click **Save**

## Visual Guide

```
Supabase Dashboard
├── Settings (⚙️ icon)
│   └── API
│       └── Project API keys
│           ├── anon public (your VITE_SUPABASE_ANON_KEY)
│           └── service_role secret ← YOU NEED THIS ONE
│
└── Edge Functions
    └── rate-limit-messages
        └── Manage → Secrets
            └── Add: SERVICE_ROLE_KEY
```

## Direct Links

- **API Settings**: https://supabase.com/dashboard/project/eywxxguildtrvpzminqv/settings/api
- **Edge Functions**: https://supabase.com/dashboard/project/eywxxguildtrvpzminqv/functions

## Security Note

🔒 **IMPORTANT**: 
- The service_role key has **full database access**
- **Never** commit it to git
- **Never** expose it in frontend code
- Only use it in **backend/server-side** code (like Edge Functions)
- It's safe to use in Supabase Edge Functions (they run server-side)

