# AI Moderation Setup Guide

This guide will help you set up automatic AI moderation for messages in GhostInbox.

## Overview

The AI Moderation system automatically:
- ✅ Detects spam, toxicity, harassment, and threats
- ✅ Identifies self-harm risk (crisis intervention)
- ✅ Auto-flags problematic messages
- ✅ Provides confidence scores for moderation decisions
- ✅ Processes messages in the background

## Prerequisites

1. ✅ OpenAI API key configured in Supabase Edge Functions
2. ✅ Database schema updated with AI columns (`ai_features_schema.sql`)
3. ✅ Edge Function deployed (`ai-moderation-webhook`)

## Setup Steps

### Step 1: Run Database Schema

Run the following SQL files in your Supabase SQL Editor (in order):

1. **`supabase/ai_features_schema.sql`** - Adds AI columns to messages table
   ```sql
   -- This adds columns like ai_moderation_score, ai_moderation_flagged, etc.
   ```

2. **`supabase/ai_moderation_setup.sql`** - Sets up database triggers (requires pg_net extension)
   OR
   **`supabase/ai_moderation_webhook_setup.sql`** - Alternative setup using webhooks (no pg_net needed)

### Step 2: Deploy Edge Function

Deploy the AI moderation webhook Edge Function:

```bash
# From your project root
supabase functions deploy ai-moderation-webhook
```

Make sure the Edge Function has these environment variables set:
- `OPENAI_API_KEY` - Your OpenAI API key
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

### Step 3: Choose Your Trigger Method

You have three options for triggering moderation:

#### Option A: Database Webhook (Recommended) ⭐

1. Go to Supabase Dashboard > Database > Webhooks
2. Click "Create a new webhook"
3. Configure:
   - **Name**: `AI Moderation Webhook`
   - **Table**: `vent_messages`
   - **Events**: `INSERT`
   - **Type**: `HTTP Request`
   - **URL**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/ai-moderation-webhook`
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
       "vent_link_id": "{{ $new.vent_link_id }}"
     }
     ```

#### Option B: Database Trigger with pg_net

1. Enable `pg_net` extension in Supabase Dashboard > Database > Extensions
2. Run `supabase/ai_moderation_setup.sql`
3. Set database settings (optional, for custom URLs):
   ```sql
   ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';
   ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';
   ```

#### Option C: Client-Side Trigger (Fallback)

If webhooks/triggers aren't available, you can trigger moderation from the client after message creation. This is less ideal but works as a fallback.

Add this to `src/pages/VentPage.tsx` after message insertion:

```typescript
// After successful message insert (around line 690)
if (insertedData?.id) {
  // Trigger moderation in background (don't wait for response)
  supabase.functions.invoke('ai-moderation-webhook', {
    body: {
      message_id: insertedData.id,
      message_body: sanitized,
      vent_link_id: ventLink.id,
    },
  }).catch(err => {
    // Silently fail - moderation will happen eventually
    console.error('Moderation trigger failed:', err)
  })
}
```

## Testing

1. **Send a test message** through your vent page
2. **Check the Dashboard** - The message should show:
   - ✅ Green badge if moderation passed
   - 🚩 Red alert if flagged
   - ⚠️ Crisis alert if self-harm risk detected

3. **Check database**:
   ```sql
   SELECT 
     id, 
     body, 
     ai_moderation_flagged,
     ai_moderation_score,
     ai_self_harm_risk,
     ai_processed_at
   FROM vent_messages
   ORDER BY created_at DESC
   LIMIT 5;
   ```

## UI Features

Once set up, the Dashboard will automatically display:

1. **Moderation Alerts** - Red/yellow banners for flagged messages
2. **Crisis Alerts** - Special high-visibility alerts for self-harm risk
3. **Moderation Scores** - Confidence scores shown in message details
4. **Auto-Flagging** - Messages automatically flagged if score > 0.7 or self-harm risk is medium/high

## Troubleshooting

### Messages not being moderated

1. **Check Edge Function logs**: Supabase Dashboard > Edge Functions > ai-moderation-webhook > Logs
2. **Verify webhook is active**: Database > Webhooks > Check status
3. **Check OpenAI API key**: Make sure it's set in Edge Function secrets
4. **Verify database columns exist**: Run `ai_features_schema.sql` again

### High costs

- OpenAI Moderation API is very cheap (~$0.0001 per message)
- Self-harm detection uses GPT-4o-mini (~$0.001 per message)
- Total: ~$0.001 per message
- For 1000 messages/month: ~$1/month

### Performance issues

- Moderation runs asynchronously (non-blocking)
- Messages are processed in background
- UI shows "processing" state until moderation completes

## Manual Moderation

To manually trigger moderation for existing messages:

```sql
SELECT trigger_moderation_for_message('message-id-here');
```

Or use the Edge Function directly:

```typescript
await supabase.functions.invoke('ai-moderation-enhanced', {
  body: {
    message_id: 'message-id',
    message_body: 'message text',
    vent_link_id: 'vent-link-id',
  },
})
```

## Security Notes

- ✅ API keys are stored securely in Edge Functions (never exposed to client)
- ✅ Service role key only used for internal database updates
- ✅ Moderation results stored in database with proper RLS policies
- ✅ Self-harm alerts logged but not exposed to public

## Next Steps

After moderation is working, consider:
1. **AI Message Categorizer** - Auto-tag messages by type
2. **AI Priority Scorer** - Score messages by importance
3. **Enhanced Response Assistant** - Context-aware replies

See `AI_IMPLEMENTATION_PLAN.md` for details.
