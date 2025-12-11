# AI Priority Scorer Setup Guide

This guide will help you set up automatic AI priority scoring for messages in GhostInbox.

## Overview

The AI Priority Scorer automatically:
- ✅ Scores messages 1-100 by importance
- ✅ Considers urgency, sentiment, content type, and message age
- ✅ Auto-adds high-priority messages (≥70) to "Needs Response" queue
- ✅ Enables sorting dashboard by priority
- ✅ Helps you never miss important messages

## Prerequisites

1. ✅ OpenAI API key configured in Supabase Edge Functions
2. ✅ Database schema updated with AI columns (`ai_features_schema.sql`)
3. ✅ Edge Function deployed (`ai-priority-webhook`)
4. ✅ AI Categorization set up (recommended, for better priority scores)

## Setup Steps

### Step 1: Run Database Schema

Run the following SQL files in your Supabase SQL Editor (in order):

1. **`supabase/ai_features_schema.sql`** - Adds AI columns to messages table
   ```sql
   -- This adds ai_priority_score column
   ```

2. **`supabase/ai_priority_setup.sql`** - Sets up database triggers (requires pg_net extension)
   OR
   **`supabase/ai_priority_webhook_setup.sql`** - Alternative setup using webhooks (no pg_net needed)

### Step 2: Deploy Edge Function

Deploy the AI priority scoring webhook Edge Function:

```bash
# From your project root
supabase functions deploy ai-priority-webhook
```

Make sure the Edge Function has these environment variables set:
- `OPENAI_API_KEY` - Your OpenAI API key
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

### Step 3: Choose Your Trigger Method

You have three options for triggering priority scoring:

#### Option A: Database Webhook (Recommended) ⭐

1. Go to Supabase Dashboard > Database > Webhooks
2. Click "Create a new webhook"
3. Configure:
   - **Name**: `AI Priority Scoring Webhook`
   - **Table**: `vent_messages`
   - **Events**: `INSERT`, `UPDATE` (on ai_category, ai_sentiment, ai_urgency columns)
   - **Type**: `HTTP Request`
   - **URL**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/ai-priority-enhanced`
   - **HTTP Method**: `POST`
   - **HTTP Headers**:
     ```
     Authorization: Bearer YOUR_SERVICE_ROLE_KEY
     apikey: YOUR_SERVICE_ROLE_KEY
     Content-Type: application/json
     ```
   - **Request Body** (JSON):
     ```json
     {
       "message_id": "{{ $new.id }}",
       "message_body": "{{ $new.body }}",
       "vent_link_id": "{{ $new.vent_link_id }}",
       "created_at": "{{ $new.created_at }}",
       "ai_category": "{{ $new.ai_category }}",
       "ai_sentiment": "{{ $new.ai_sentiment }}",
       "ai_urgency": "{{ $new.ai_urgency }}"
     }
     ```

**Note**: The Edge Function will automatically re-score priority when categorization data is updated, providing more accurate scores.

#### Option B: Database Trigger with pg_net

1. Enable `pg_net` extension in Supabase Dashboard > Database > Extensions
2. Run `supabase/ai_priority_setup.sql`
3. Set database settings (optional, for custom URLs):
   ```sql
   ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';
   ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';
   ```

#### Option C: Client-Side Trigger (Fallback)

If webhooks/triggers aren't available, you can trigger priority scoring from the client after message creation or categorization.

## Features

### Priority Scoring Factors

The AI considers:
- **Urgency**: How time-sensitive is this message?
- **Sentiment**: Positive, negative, neutral, or mixed?
- **Content Type**: Question, complaint, compliment, etc.
- **Message Age**: Older unanswered messages may need attention
- **Emotional Intensity**: How emotionally charged is the message?
- **Requires Response**: Does this message need a response?

### Auto-Queue for "Needs Response"

Messages with priority score ≥ 70 are automatically:
- Tagged with `needs-response` tag
- Added to the "Needs Response" filter
- Highlighted in the Dashboard

### Priority Score Ranges

- **70-100**: High Priority (Red gradient) - Needs immediate attention
- **50-69**: Medium Priority (Yellow/Pink gradient) - Should respond soon
- **1-49**: Low Priority (Blue gradient) - Can respond when convenient

### Sorting

The Dashboard now supports sorting by:
- **Newest First** (default)
- **Oldest First**
- **Priority (High to Low)** ⭐ NEW

## UI Features

Once set up, the Dashboard will automatically display:

1. **Priority Score Badges** - Color-coded badges in message list (⭐ score/100)
2. **Priority Score Card** - Detailed priority visualization in message detail view
3. **Progress Bar** - Visual representation of priority score (0-100)
4. **Auto-Queue** - High-priority messages automatically appear in "Needs Response" filter
5. **Priority Sorting** - Sort messages by priority to see most important first

## Testing

1. **Send a test message** through your vent page
2. **Check the Dashboard** - The message should show:
   - Priority score badge in message list
   - Priority score card in detail view
   - Auto-added to "Needs Response" if score ≥ 70

3. **Test sorting**:
   - Select "Priority (High to Low)" from sort dropdown
   - Messages should be sorted by priority score

4. **Check database**:
   ```sql
   SELECT 
     id, 
     body, 
     ai_priority_score,
     ai_category,
     ai_sentiment,
     ai_urgency,
     ai_processed_at
   FROM vent_messages
   ORDER BY ai_priority_score DESC NULLS LAST
   LIMIT 10;
   ```

5. **Check "Needs Response" queue**:
   ```sql
   SELECT vm.*, mt.tag_name
   FROM vent_messages vm
   JOIN message_tags mt ON vm.id = mt.message_id
   WHERE mt.tag_name = 'needs-response'
   ORDER BY vm.ai_priority_score DESC;
   ```

## Troubleshooting

### Messages not being scored

1. **Check Edge Function logs**: Supabase Dashboard > Edge Functions > ai-priority-webhook > Logs
2. **Verify webhook is active**: Database > Webhooks > Check status
3. **Check OpenAI API key**: Make sure it's set in Edge Function secrets
4. **Verify database columns exist**: Run `ai_features_schema.sql` again

### Priority scores seem inaccurate

- Priority scoring works best when categorization data is available
- The system automatically re-scores when categorization is updated
- Scores consider multiple factors, not just one dimension

### "Needs Response" queue not updating

- Check that messages with score ≥ 70 are being tagged
- Verify the tag `needs-response` is being created
- Check that the filter logic includes high-priority messages

### High costs

- Priority scoring uses GPT-4o-mini (~$0.002 per message)
- For 1000 messages/month: ~$2/month
- Very affordable for the value provided

### Performance issues

- Priority scoring runs asynchronously (non-blocking)
- Messages are processed in background
- UI shows scores when available
- Re-scoring happens automatically when categorization updates

## Manual Priority Scoring

To manually trigger priority scoring for existing messages:

```sql
SELECT trigger_priority_scoring_for_message('message-id-here');
```

Or use the Edge Function directly:

```typescript
await supabase.functions.invoke('ai-priority-enhanced', {
  body: {
    message_id: 'message-id',
    message_body: 'message text',
    vent_link_id: 'vent-link-id',
    created_at: '2024-01-01T00:00:00Z',
    ai_category: 'question', // optional
    ai_sentiment: 'positive', // optional
    ai_urgency: 'high', // optional
  },
})
```

## Customization

### Adjust Priority Threshold

To change when messages are added to "Needs Response" queue, edit `supabase/functions/ai-priority-webhook/index.ts`:

```typescript
// Change from 70 to your desired threshold
const isHighPriority = priorityScore >= 70
```

### Custom Priority Factors

You can customize the priority scoring prompt in the Edge Function to weight different factors differently.

## Integration with Other Features

### Works with AI Categorization

Priority scoring automatically uses categorization data (category, sentiment, urgency) when available, providing more accurate scores.

### Works with AI Moderation

High-priority flagged messages are still scored, but moderation takes precedence for safety.

### Works with Folders

High-priority messages can be auto-assigned to folders based on their category.

## Next Steps

After priority scoring is working, consider:
1. **Enhanced Response Assistant** - Context-aware replies
2. **AI Insight Generator** - Trend reports and analytics
3. **Automated Workflows** - Auto-respond to high-priority messages

See `AI_IMPLEMENTATION_PLAN.md` for details.
