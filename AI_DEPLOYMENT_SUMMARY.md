# 🚀 AI Functions Deployment Summary

## Quick Deploy Commands

```bash
# Install Supabase CLI (if needed)
npm install -g supabase

# Login and link project
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Deploy all AI functions
supabase functions deploy ai-moderation-enhanced
supabase functions deploy ai-priority-enhanced
supabase functions deploy ai-categorization-webhook
supabase functions deploy openai-ai
```

Or use the deployment script:
```bash
chmod +x deploy-ai-functions.sh
./deploy-ai-functions.sh
```

## 📦 Functions to Deploy

### 1. ai-moderation-enhanced
**Location:** `supabase/functions/ai-moderation-enhanced/index.ts`
**Purpose:** Enhanced 5-layer content moderation
**Features:**
- OpenAI Moderation API
- GPT-4o-mini advanced analysis
- Enhanced self-harm detection
- Spam pattern detection
- Threat detection
- Real-time pre-submission checks

**Environment Variables Needed:**
- `OPENAI_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**Database Setup:**
- `supabase/enhanced_moderation_schema.sql`
- `supabase/ai_moderation_setup.sql`

---

### 2. ai-priority-enhanced
**Location:** `supabase/functions/ai-priority-enhanced/index.ts`
**Purpose:** Enhanced multi-factor priority scoring
**Features:**
- 7-factor comprehensive analysis
- Context-aware scoring
- Time decay algorithm
- Engagement pattern analysis
- Crisis priority boost
- Response status integration

**Environment Variables Needed:**
- `OPENAI_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**Database Setup:**
- `supabase/ai_priority_setup.sql`

---

### 3. ai-categorization-webhook
**Location:** `supabase/functions/ai-categorization-webhook/index.ts`
**Purpose:** Auto-categorize and tag messages
**Features:**
- Auto-categorization (question, compliment, etc.)
- Sentiment analysis
- Urgency detection
- Auto-folder assignment
- Auto-tagging

**Environment Variables Needed:**
- `OPENAI_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**Database Setup:**
- `supabase/ai_features_schema.sql`
- `supabase/message_folders_schema.sql`
- `supabase/ai_categorization_setup.sql`

---

### 4. openai-ai
**Location:** `supabase/functions/openai-ai/index.ts`
**Purpose:** General AI features
**Features:**
- Reply templates
- Enhanced context-aware replies
- Q&A answer generation
- Insights generation
- Quality scoring

**Environment Variables Needed:**
- `OPENAI_API_KEY`

**Database Setup:**
- None (called manually from Dashboard)

---

## 📊 Database Setup Scripts (Run in Order)

1. **supabase/enhanced_moderation_schema.sql**
   - Creates `moderation_feedback` table
   - Creates `crisis_resources` table
   - Creates `moderation_analytics` table
   - Adds moderation columns to `vent_messages`

2. **supabase/ai_features_schema.sql**
   - Adds AI columns to `vent_messages` table
   - Creates `ai_processing_log` table

3. **supabase/message_folders_schema.sql**
   - Creates `message_folders` table
   - Creates `message_folder_assignments` table
   - Creates `message_tags` table

4. **supabase/ai_moderation_setup.sql**
   - Creates `auto_moderate_message()` function
   - Creates trigger for automatic moderation

5. **supabase/ai_categorization_setup.sql**
   - Creates `auto_categorize_message()` function
   - Creates trigger for automatic categorization

6. **supabase/ai_priority_setup.sql**
   - Creates `auto_score_priority()` function
   - Creates triggers for automatic priority scoring

## 🔑 Environment Variables

Set these in **Supabase Dashboard → Project Settings → Edge Functions → Secrets**:

### Required for All Functions:
- **OPENAI_API_KEY**: Your OpenAI API key
  - Get from: https://platform.openai.com/api-keys

### Required for Internal Webhooks:
- **SUPABASE_SERVICE_ROLE_KEY**: Your Supabase service role key
  - Get from: Dashboard → Settings → API → service_role key
  - ⚠️ Note: Secret name cannot start with `SUPABASE_` prefix

## ✅ Deployment Checklist

### Functions
- [ ] `ai-moderation-enhanced` deployed
- [ ] `ai-priority-enhanced` deployed
- [ ] `ai-categorization-webhook` deployed
- [ ] `openai-ai` deployed

### Environment Variables
- [ ] `OPENAI_API_KEY` set for all functions
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set (if using internal calls)

### Database
- [ ] `enhanced_moderation_schema.sql` executed
- [ ] `ai_features_schema.sql` executed
- [ ] `message_folders_schema.sql` executed
- [ ] `ai_moderation_setup.sql` executed
- [ ] `ai_categorization_setup.sql` executed
- [ ] `ai_priority_setup.sql` executed

### Verification
- [ ] All functions appear in `supabase functions list`
- [ ] Test message gets AI analysis
- [ ] Dashboard shows AI insights
- [ ] No errors in Edge Function logs

## 🧪 Testing

After deployment, test with a real message:

1. Submit a message on your Vent Page
2. Check Dashboard - should see:
   - Moderation score and severity
   - AI category and sentiment
   - Priority score
   - Auto-assigned folder (if applicable)

3. Check database:
```sql
-- View recent AI processing
SELECT * FROM ai_processing_log 
ORDER BY created_at DESC 
LIMIT 10;

-- View messages with AI data
SELECT 
  id, 
  body, 
  ai_moderation_score, 
  ai_category, 
  ai_sentiment,
  ai_priority_score 
FROM vent_messages 
ORDER BY created_at DESC 
LIMIT 10;
```

## 📚 Documentation

- **DEPLOYMENT_STEPS.md** - Complete step-by-step guide
- **DEPLOY_AI_FUNCTIONS.md** - Quick deployment reference
- **ENHANCED_MODERATION_SETUP.md** - Moderation setup details
- **PRIORITY_SCORING_IMPROVEMENTS.md** - Priority scoring details
- **AI_CATEGORIZATION_SETUP.md** - Categorization setup details
- **PHASE2_AI_FEATURES_SETUP.md** - Phase 2 features setup

## 🔍 Troubleshooting

### Functions Not Deploying
```bash
# Check if logged in
supabase projects list

# Check if project is linked
supabase status

# View deployment logs
supabase functions logs FUNCTION_NAME
```

### Functions Returning Errors
1. Check Edge Function logs in Supabase Dashboard
2. Verify environment variables are set
3. Check `ai_processing_log` table for errors
4. Verify database triggers are active

### Database Triggers Not Working
1. Verify SQL scripts were executed
2. Check trigger exists:
```sql
SELECT * FROM pg_trigger WHERE tgname LIKE '%moderation%';
SELECT * FROM pg_trigger WHERE tgname LIKE '%categorization%';
SELECT * FROM pg_trigger WHERE tgname LIKE '%priority%';
```

## 🎉 Success!

Once deployed, your AI features will:
- ✅ Automatically moderate all new messages
- ✅ Automatically categorize messages
- ✅ Automatically score message priority
- ✅ Auto-assign messages to folders
- ✅ Auto-add high-priority to "needs-response" queue
- ✅ Provide crisis detection and alerts

All AI processing happens in the background and doesn't block user actions!
