# Deploy All AI Edge Functions

## 🚀 Quick Deployment

### Prerequisites
1. Supabase CLI installed: `npm install -g supabase`
2. Logged into Supabase: `supabase login`
3. Project linked: `supabase link --project-ref YOUR_PROJECT_REF`

### Step 1: Deploy All AI Functions

Run these commands in order:

```bash
# 1. Enhanced Moderation (5-layer analysis)
supabase functions deploy ai-moderation-enhanced

# 2. Enhanced Priority Scoring (multi-factor analysis)
supabase functions deploy ai-priority-enhanced

# 3. AI Categorization (auto-tagging and folder assignment)
supabase functions deploy ai-categorization-webhook

# 4. OpenAI AI (general AI features - reply templates, Q&A, insights)
supabase functions deploy openai-ai
```

### Step 2: Set Environment Variables

In Supabase Dashboard → Project Settings → Edge Functions → Secrets:

**For ALL functions, add:**
- `OPENAI_API_KEY`: Your OpenAI API key (from https://platform.openai.com/api-keys)

**For functions that need service role (internal calls):**
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
  - Get from: Dashboard → Settings → API → service_role key

### Step 3: Run Database Setup Scripts

Execute these SQL files in your Supabase SQL Editor (in order):

1. **Enhanced Moderation Schema**:
   ```sql
   -- Run: supabase/enhanced_moderation_schema.sql
   ```

2. **AI Features Schema** (if not already run):
   ```sql
   -- Run: supabase/ai_features_schema.sql
   ```

3. **Message Folders Schema** (for auto-folder assignment):
   ```sql
   -- Run: supabase/message_folders_schema.sql
   ```

4. **Enhanced Moderation Setup** (triggers):
   ```sql
   -- Run: supabase/ai_moderation_setup.sql
   ```

5. **AI Categorization Setup** (triggers):
   ```sql
   -- Run: supabase/ai_categorization_setup.sql
   ```

6. **AI Priority Setup** (triggers):
   ```sql
   -- Run: supabase/ai_priority_setup.sql
   ```

### Step 4: Verify Deployment

Check that all functions are deployed:

```bash
supabase functions list
```

You should see:
- ✅ `ai-moderation-enhanced`
- ✅ `ai-priority-enhanced`
- ✅ `ai-categorization-webhook`
- ✅ `openai-ai`

### Step 5: Test Functions

#### Test Enhanced Moderation:
```bash
# In your browser console (after logging in)
const { data, error } = await supabase.functions.invoke('ai-moderation-enhanced', {
  body: {
    message_id: 'test-id',
    message_body: 'This is a test message',
    vent_link_id: 'your-vent-link-id',
    is_pre_submission: false
  }
})
console.log('Moderation test:', { data, error })
```

#### Test Priority Scoring:
```bash
const { data, error } = await supabase.functions.invoke('ai-priority-enhanced', {
  body: {
    message_id: 'test-id',
    message_body: 'This is an urgent question that needs an answer!',
    vent_link_id: 'your-vent-link-id',
    created_at: new Date().toISOString()
  }
})
console.log('Priority test:', { data, error })
```

#### Test Categorization:
```bash
const { data, error } = await supabase.functions.invoke('ai-categorization-webhook', {
  body: {
    message_id: 'test-id',
    message_body: 'I have a question about your product',
    vent_link_id: 'your-vent-link-id'
  }
})
console.log('Categorization test:', { data, error })
```

## 📋 Deployment Checklist

- [ ] All 4 functions deployed
- [ ] `OPENAI_API_KEY` set in Edge Function secrets
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set (if needed)
- [ ] All SQL setup scripts executed
- [ ] Functions verified with `supabase functions list`
- [ ] Test functions work correctly
- [ ] Database triggers are active

## 🔍 Troubleshooting

### Function Not Found (404)
- Make sure function is deployed: `supabase functions deploy FUNCTION_NAME`
- Check function name matches exactly (case-sensitive)

### Unauthorized (401)
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Verify the key has `service_role` permissions

### OpenAI API Key Error
- Verify `OPENAI_API_KEY` is set in Edge Function secrets
- Check the key is valid and has credits

### Database Trigger Not Working
- Verify SQL setup scripts were executed
- Check `ai_processing_log` table for errors
- Review Supabase Edge Function logs

### Check Function Logs
```bash
# View logs for any function
supabase functions logs ai-moderation-enhanced
supabase functions logs ai-priority-enhanced
supabase functions logs ai-categorization-webhook
supabase functions logs openai-ai
```

## 🎯 What Each Function Does

1. **ai-moderation-enhanced**: 
   - 5-layer content moderation
   - Crisis detection
   - Real-time pre-submission checks

2. **ai-priority-enhanced**:
   - Multi-factor priority scoring (1-100)
   - Context-aware analysis
   - Time decay algorithm
   - Engagement pattern analysis

3. **ai-categorization-webhook**:
   - Auto-categorize messages
   - Sentiment analysis
   - Urgency detection
   - Auto-folder assignment
   - Auto-tagging

4. **openai-ai**:
   - Reply templates
   - Enhanced replies (context-aware)
   - Q&A answer generation
   - Insights generation
   - Quality scoring

## ✅ Success Indicators

After deployment, you should see:
- ✅ New messages automatically get moderation scores
- ✅ Messages automatically get categorized
- ✅ Messages automatically get priority scores
- ✅ High-priority messages added to "needs-response" queue
- ✅ Crisis messages get maximum priority (100)
- ✅ AI analysis appears in Dashboard

## 📚 Next Steps

1. Test with real messages
2. Monitor `ai_processing_log` table for any errors
3. Adjust priority thresholds if needed
4. Review moderation results and provide feedback
5. Check Dashboard UI for AI insights
