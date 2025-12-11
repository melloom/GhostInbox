# 🚀 Complete AI Functions Deployment Guide

## Quick Start (5 minutes)

### Option 1: Use the Deployment Script

```bash
# Make script executable (if not already)
chmod +x deploy-ai-functions.sh

# Run the deployment script
./deploy-ai-functions.sh
```

### Option 2: Manual Deployment

If the script doesn't work, deploy manually:

```bash
# 1. Install Supabase CLI (if not installed)
npm install -g supabase

# 2. Login to Supabase
supabase login

# 3. Link your project
supabase link --project-ref YOUR_PROJECT_REF
# (Get your project ref from Supabase Dashboard → Settings → General)

# 4. Deploy each function
supabase functions deploy ai-moderation-enhanced
supabase functions deploy ai-priority-enhanced
supabase functions deploy ai-categorization-webhook
supabase functions deploy openai-ai
```

## 📋 Complete Setup Checklist

### Step 1: Deploy Functions ✅
- [ ] `ai-moderation-enhanced` deployed
- [ ] `ai-priority-enhanced` deployed
- [ ] `ai-categorization-webhook` deployed
- [ ] `openai-ai` deployed

### Step 2: Set Environment Variables 🔑

In **Supabase Dashboard → Project Settings → Edge Functions → Secrets**:

Add these secrets for **ALL functions**:

1. **OPENAI_API_KEY**
   - Value: Your OpenAI API key
   - Get from: https://platform.openai.com/api-keys
   - Required for: All AI functions

2. **SUPABASE_SERVICE_ROLE_KEY** (optional, for internal calls)
   - Value: Your Supabase service role key
   - Get from: Dashboard → Settings → API → service_role key
   - Required for: Internal webhook calls

### Step 3: Run Database Setup Scripts 📊

Execute these SQL files in **Supabase SQL Editor** (in this order):

1. **Enhanced Moderation Schema**
   ```
   File: supabase/enhanced_moderation_schema.sql
   Purpose: Creates moderation feedback, crisis resources, and analytics tables
   ```

2. **AI Features Schema** (if not already run)
   ```
   File: supabase/ai_features_schema.sql
   Purpose: Adds AI columns to vent_messages table
   ```

3. **Message Folders Schema** (for auto-folder assignment)
   ```
   File: supabase/message_folders_schema.sql
   Purpose: Creates folders and folder assignment tables
   ```

4. **Enhanced Moderation Setup** (triggers)
   ```
   File: supabase/ai_moderation_setup.sql
   Purpose: Sets up automatic moderation on message creation
   ```

5. **AI Categorization Setup** (triggers)
   ```
   File: supabase/ai_categorization_setup.sql
   Purpose: Sets up automatic categorization on message creation
   ```

6. **AI Priority Setup** (triggers)
   ```
   File: supabase/ai_priority_setup.sql
   Purpose: Sets up automatic priority scoring on message creation
   ```

### Step 4: Verify Deployment ✅

```bash
# List all deployed functions
supabase functions list

# Check function logs (if needed)
supabase functions logs ai-moderation-enhanced
supabase functions logs ai-priority-enhanced
```

### Step 5: Test Functions 🧪

#### Test in Browser Console (after logging in):

```javascript
// Test Enhanced Moderation
const { data, error } = await supabase.functions.invoke('ai-moderation-enhanced', {
  body: {
    message_id: 'test-id',
    message_body: 'This is a test message',
    vent_link_id: 'your-vent-link-id',
    is_pre_submission: false
  }
})
console.log('Moderation:', { data, error })

// Test Priority Scoring
const { data: priority, error: priorityError } = await supabase.functions.invoke('ai-priority-enhanced', {
  body: {
    message_id: 'test-id',
    message_body: 'This is an urgent question!',
    vent_link_id: 'your-vent-link-id',
    created_at: new Date().toISOString()
  }
})
console.log('Priority:', { data: priority, error: priorityError })
```

## 🎯 What Gets Deployed

### 1. ai-moderation-enhanced
**Features:**
- 5-layer content analysis
- Crisis/self-harm detection
- Real-time pre-submission checks
- Spam and threat detection

**Triggers:** Automatically runs on message creation

### 2. ai-priority-enhanced
**Features:**
- Multi-factor priority scoring (1-100)
- Context-aware analysis
- Time decay algorithm
- Engagement pattern analysis
- Crisis priority boost

**Triggers:** Automatically runs on message creation and AI data updates

### 3. ai-categorization-webhook
**Features:**
- Auto-categorize messages (question, compliment, etc.)
- Sentiment analysis
- Urgency detection
- Auto-folder assignment
- Auto-tagging

**Triggers:** Automatically runs on message creation

### 4. openai-ai
**Features:**
- Reply templates
- Enhanced context-aware replies
- Q&A answer generation
- Insights generation
- Quality scoring

**Usage:** Called manually from Dashboard

## 🔍 Troubleshooting

### "Command not found: supabase"
**Solution:** Install Supabase CLI
```bash
npm install -g supabase
```

### "Not logged in"
**Solution:** Login to Supabase
```bash
supabase login
```

### "Project not linked"
**Solution:** Link your project
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### Function returns 404
**Solution:** Function not deployed
```bash
supabase functions deploy FUNCTION_NAME
```

### Function returns 401 (Unauthorized)
**Solution:** 
- Check `SUPABASE_SERVICE_ROLE_KEY` is set in secrets
- Verify the key is correct (from Dashboard → Settings → API)

### OpenAI API errors
**Solution:**
- Verify `OPENAI_API_KEY` is set in Edge Function secrets
- Check the key is valid and has credits
- Check OpenAI dashboard for usage limits

### Database triggers not working
**Solution:**
- Verify SQL setup scripts were executed
- Check `ai_processing_log` table for errors
- Review Edge Function logs in Supabase Dashboard

## 📊 Verify Everything Works

After deployment, test with a real message:

1. **Go to your Vent Page** (public message submission)
2. **Submit a test message**
3. **Check Dashboard** - you should see:
   - ✅ Moderation score and severity
   - ✅ AI category and sentiment
   - ✅ Priority score
   - ✅ Auto-assigned folder (if applicable)
   - ✅ Auto-added tags

4. **Check Database**:
   ```sql
   -- View recent AI processing
   SELECT * FROM ai_processing_log 
   ORDER BY created_at DESC 
   LIMIT 10;
   
   -- View messages with AI data
   SELECT id, body, ai_moderation_score, ai_category, ai_priority_score 
   FROM vent_messages 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

## ✅ Success Checklist

- [ ] All 4 functions deployed successfully
- [ ] Environment variables set in Supabase
- [ ] All SQL scripts executed
- [ ] Functions appear in `supabase functions list`
- [ ] Test message gets AI analysis
- [ ] Dashboard shows AI insights
- [ ] No errors in Edge Function logs

## 🎉 You're Done!

Your AI features are now live:
- ✅ Enhanced moderation (5-layer analysis)
- ✅ Enhanced priority scoring (multi-factor)
- ✅ Auto-categorization
- ✅ All Phase 1 and Phase 2 AI features

See individual setup guides for more details:
- `ENHANCED_MODERATION_SETUP.md`
- `PRIORITY_SCORING_IMPROVEMENTS.md`
- `AI_CATEGORIZATION_SETUP.md`
- `PHASE2_AI_FEATURES_SETUP.md`
