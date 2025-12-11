# Enhanced Moderation System Setup

This guide covers the significantly improved moderation system with multi-layer analysis, real-time checks, and better accuracy. This is part of the complete AI features suite that also includes enhanced priority scoring, auto-categorization, and more.

## 🚀 Quick Start

```bash
# 1. Deploy the function
supabase functions deploy ai-moderation-enhanced

# 2. Set environment variables in Supabase Dashboard:
#    - OPENAI_API_KEY
#    - SUPABASE_SERVICE_ROLE_KEY

# 3. Run database setup
#    Execute: supabase/enhanced_moderation_schema.sql
#    Execute: supabase/ai_moderation_setup.sql

# 4. Verify
supabase functions list
```

For complete setup of all AI features, see **DEPLOYMENT_STEPS.md**.

## 📚 Related Documentation

- **DEPLOYMENT_STEPS.md** - Complete deployment guide for all AI functions
- **AI_DEPLOYMENT_SUMMARY.md** - Quick reference for all functions
- **PRIORITY_SCORING_IMPROVEMENTS.md** - Enhanced priority scoring details
- **AI_CATEGORIZATION_SETUP.md** - Auto-categorization setup
- **PHASE2_AI_FEATURES_SETUP.md** - Phase 2 AI features
- **MODERATION_IMPROVEMENTS.md** - Detailed before/after comparison

## 🚀 Major Improvements

### 1. **Multi-Layer Analysis** ⭐
- **Layer 1**: OpenAI Moderation API (fast baseline)
- **Layer 2**: Advanced GPT-4o-mini analysis (context-aware, nuanced)
- **Layer 3**: Enhanced self-harm detection (crisis intervention)
- **Layer 4**: Spam pattern detection (repetition, links, patterns)
- **Layer 5**: Threat detection enhancement (violence, threats)

### 2. **Real-Time Pre-Submission Moderation** ⭐
- Messages checked **before** submission
- Blocks harmful content immediately
- Shows warnings for concerning content
- Displays crisis resources for self-harm risk

### 3. **Context Awareness** ⭐
- Considers message history from same sender
- Better false positive reduction
- More accurate threat assessment
- Pattern recognition across messages

### 4. **Enhanced Self-Harm Detection** ⭐
- More sophisticated risk assessment
- Crisis resource integration
- Specific indicator identification
- Recommended action guidance

### 5. **Better Spam Detection** ⭐
- Pattern recognition (repetitive content)
- Link detection
- Commercial content detection
- Word frequency analysis

### 6. **Improved Threat Detection** ⭐
- Violence indicators
- Threat pattern recognition
- Context-aware threat assessment

## Setup Steps

### Quick Deployment

For a complete setup of all AI features, see **DEPLOYMENT_STEPS.md**. To deploy just moderation:

```bash
# Deploy the enhanced moderation function
supabase functions deploy ai-moderation-enhanced
```

Or use the automated script:
```bash
chmod +x deploy-ai-functions.sh
./deploy-ai-functions.sh
```

### Step 1: Set Environment Variables

In **Supabase Dashboard → Project Settings → Edge Functions → Secrets**:

Add these secrets for the `ai-moderation-enhanced` function:
- **OPENAI_API_KEY**: Your OpenAI API key (from https://platform.openai.com/api-keys)
- **SUPABASE_SERVICE_ROLE_KEY**: Your Supabase service role key (for internal calls)

### Step 2: Run Enhanced Schema

Run the enhanced moderation schema in **Supabase SQL Editor**:

```sql
-- Run: supabase/enhanced_moderation_schema.sql
```

This adds:
- `moderation_feedback` table (for learning from false positives)
- `crisis_resources` table (for tracking interventions)
- `moderation_analytics` table (for performance tracking)
- Enhanced fields on `vent_messages`:
  - `ai_moderation_severity` (none, low, medium, high, critical)
  - `ai_moderation_requires_review` (boolean)
  - `ai_moderation_false_positive_risk` (low, medium, high)
  - `ai_moderation_recommended_action` (none, flag, monitor, alert, intervene)

### Step 3: Deploy Enhanced Edge Function

Deploy the new enhanced moderation function:

```bash
supabase functions deploy ai-moderation-enhanced
```

### Step 4: Update Webhook/Trigger

Update your database webhook or trigger to use the enhanced function:

**Option A: Update Webhook URL**
- Go to Supabase Dashboard → Database → Webhooks
- Edit "AI Moderation Webhook" (or create new)
- Change URL to: `https://YOUR_PROJECT.supabase.co/functions/v1/ai-moderation-enhanced`
- Set trigger on: `INSERT` on `vent_messages` table

**Option B: Update Database Trigger (Recommended)**
- Run `supabase/ai_moderation_setup.sql` in Supabase SQL Editor
- This sets up automatic triggers using `pg_net` extension

### Step 5: Verify Deployment

Check that the function is deployed:

```bash
supabase functions list
```

You should see `ai-moderation-enhanced` in the list.

### Step 6: Test the Function

Test in browser console (after logging in):

```javascript
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

### Client Code

The client code has already been updated to:
- Use enhanced moderation for pre-submission checks (`VentPage.tsx`)
- Display enhanced moderation details in Dashboard (`Dashboard.tsx`)
- Show crisis resources for high-risk messages
- Display severity badges and detailed breakdowns

## Features

### Real-Time Pre-Submission Check

Messages are now checked **before** submission:

```typescript
// In VentPage.tsx - automatically checks before submit
const { data: moderationCheck } = await supabase.functions.invoke('ai-moderation-enhanced', {
  body: {
    message_body: sanitized,
    is_pre_submission: true,
    message_history: userMessages.slice(-3),
  },
})

if (moderationCheck?.should_block) {
  // Block submission and show reason
  setStatus(moderationCheck.block_reason)
  return
}
```

### Enhanced Moderation Results

The new system provides:
- **Severity levels**: none, low, medium, high, critical
- **False positive risk**: low, medium, high
- **Recommended actions**: none, flag, monitor, alert, intervene
- **Human review flags**: For borderline cases
- **Detailed breakdown**: Per-layer analysis results

### Crisis Intervention

For high self-harm risk messages:
- Automatic crisis resource display
- Recommended action guidance
- Crisis alert logging
- Resource tracking

### Moderation Feedback Loop

Users can provide feedback on moderation accuracy:
- Report false positives
- Report false negatives
- Confirm correct flags
- Request human review

This data can be used to improve the system over time.

## UI Enhancements

### Enhanced Alert Display

The Dashboard now shows:
- **Severity badges**: Color-coded by severity level
- **Crisis resources**: Automatic display for high-risk messages
- **Detailed breakdown**: All detected issues with categories
- **False positive warnings**: When system is uncertain
- **Recommended actions**: Clear guidance on next steps

### Pre-Submission Warnings

On VentPage:
- Real-time moderation check before submit
- Warning messages for concerning content
- Crisis resource display for self-harm risk
- Block messages that violate policies

## Accuracy Improvements

### False Positive Reduction

- **Context awareness**: Considers message history
- **Nuanced analysis**: GPT-4o-mini provides better understanding
- **False positive risk scoring**: Flags uncertain cases
- **Human review queue**: Borderline cases flagged for review

### Better Detection

- **Multi-layer approach**: Combines multiple detection methods
- **Pattern recognition**: Detects spam patterns
- **Threat enhancement**: Better violence/threat detection
- **Self-harm sophistication**: More accurate crisis detection

## Analytics & Monitoring

### Moderation Analytics Table

Track daily performance:
- Total messages processed
- Flagged messages count
- False positive/negative rates
- Crisis detections
- Average processing time

### Crisis Resource Tracking

Track interventions:
- Messages with crisis resources shown
- Risk levels detected
- Actions taken

## Cost Estimate

Enhanced moderation uses:
- OpenAI Moderation API: ~$0.0001 per message
- GPT-4o-mini (advanced analysis): ~$0.002 per message
- GPT-4o-mini (self-harm): ~$0.001 per message
- **Total: ~$0.003 per message**

For 1000 messages/month: ~$3/month

**Note**: Combined with other AI features (priority scoring, categorization), total cost is approximately **~$0.005 per message** or **~$5/month for 1000 messages**.

## Testing

1. **Test Pre-Submission Blocking**:
   - Try submitting a message with harmful content
   - Should be blocked before submission
   - Should show clear reason

2. **Test Crisis Detection**:
   - Submit message with self-harm indicators
   - Should show crisis resources
   - Should flag appropriately

3. **Test False Positive Reduction**:
   - Submit borderline content
   - Check false positive risk score
   - Verify context is considered

4. **Test Enhanced Alerts**:
   - View flagged message in Dashboard
   - Check severity display
   - Verify detailed breakdown

## Migration from Old System

The enhanced system is backward compatible:
- Old moderation results still work
- New fields are optional
- Gradually improves as new messages are processed
- Can run alongside old system during transition

To reprocess existing messages with enhanced moderation:
```sql
-- If you have a trigger function
SELECT trigger_moderation_for_message(id)
FROM vent_messages
WHERE ai_processed_at IS NULL OR ai_moderation_severity IS NULL
LIMIT 100;

-- Or manually via Edge Function
-- Use the ai-moderation-enhanced function with existing message IDs
```

**Updating from old moderation webhook:**
- Old function: `ai-moderation-webhook`
- New function: `ai-moderation-enhanced`
- Update webhook URL or trigger to point to new function
- See `supabase/enhanced_moderation_webhook_update.sql` for migration guide

## Security & Privacy

- ✅ All processing happens server-side
- ✅ No message content stored in logs (only metadata)
- ✅ Crisis resources shown only when needed
- ✅ User feedback is anonymized
- ✅ Analytics are aggregated (no individual tracking)

## Integration with Other AI Features

The enhanced moderation system integrates seamlessly with:

### Enhanced Priority Scoring
- Crisis messages automatically get **priority score = 100**
- High severity moderation gets **priority score = 95**
- Moderation severity is considered in priority calculation
- See **PRIORITY_SCORING_IMPROVEMENTS.md** for details

### Auto-Categorization
- Moderation results inform categorization
- Flagged messages can be auto-assigned to "Needs Review" folder
- See **AI_CATEGORIZATION_SETUP.md** for details

### Complete AI Suite
All AI features work together:
1. **Moderation** runs first (safety check)
2. **Categorization** runs next (organization)
3. **Priority Scoring** runs last (uses moderation + categorization data)

## Next Steps

After enhanced moderation is working:
1. ✅ Deploy other AI functions (priority scoring, categorization)
2. Monitor false positive rates
3. Collect user feedback via `moderation_feedback` table
4. Adjust thresholds based on analytics data
5. Review `moderation_analytics` table for performance metrics
6. Add custom rules for specific use cases if needed
7. Integrate with external moderation services if needed

## Complete AI System Deployment

To deploy the complete AI system (moderation + priority + categorization):

```bash
# Deploy all functions
supabase functions deploy ai-moderation-enhanced
supabase functions deploy ai-priority-enhanced
supabase functions deploy ai-categorization-webhook
supabase functions deploy openai-ai

# Or use the script
./deploy-ai-functions.sh
```

Then run all database setup scripts in order:
1. `supabase/enhanced_moderation_schema.sql`
2. `supabase/ai_features_schema.sql`
3. `supabase/message_folders_schema.sql`
4. `supabase/ai_moderation_setup.sql`
5. `supabase/ai_categorization_setup.sql`
6. `supabase/ai_priority_setup.sql`

See **DEPLOYMENT_STEPS.md** for complete instructions.

## API Reference

### Enhanced Moderation Function

```typescript
const result = await supabase.functions.invoke('ai-moderation-enhanced', {
  body: {
    message_body: 'message text',
    message_history: [{ body: 'prev', created_at: '...' }],
    is_pre_submission: true, // For real-time checks
    vent_link_id: 'vent-id',
  },
})

// Returns:
// - moderation.flagged (boolean)
// - moderation.severity ('none' | 'low' | 'medium' | 'high' | 'critical')
// - moderation.self_harm.risk_level
// - moderation.layers (detailed breakdown)
// - should_block (for pre-submission)
// - block_reason (if blocked)
```

See `src/lib/ai.ts` for the full `moderateMessage()` function with TypeScript types.

## Troubleshooting

### Function Not Found (404)
- Verify function is deployed: `supabase functions deploy ai-moderation-enhanced`
- Check function name matches exactly (case-sensitive)

### Unauthorized (401)
- Check `SUPABASE_SERVICE_ROLE_KEY` is set in Edge Function secrets
- Verify the key is correct (from Dashboard → Settings → API)

### OpenAI API Errors
- Verify `OPENAI_API_KEY` is set in Edge Function secrets
- Check the key is valid and has credits
- Review Edge Function logs in Supabase Dashboard

### Database Triggers Not Working
- Verify `supabase/ai_moderation_setup.sql` was executed
- Check `ai_processing_log` table for errors
- Review Edge Function logs: `supabase functions logs ai-moderation-enhanced`

### Pre-Submission Checks Not Working
- Verify `VentPage.tsx` is calling `ai-moderation-enhanced` function
- Check browser console for errors
- Ensure function is deployed and accessible

## Support & Resources

- **Full Deployment Guide**: See `DEPLOYMENT_STEPS.md`
- **All AI Features**: See `AI_DEPLOYMENT_SUMMARY.md`
- **Priority Scoring**: See `PRIORITY_SCORING_IMPROVEMENTS.md`
- **Categorization**: See `AI_CATEGORIZATION_SETUP.md`
- **Phase 2 Features**: See `PHASE2_AI_FEATURES_SETUP.md`
