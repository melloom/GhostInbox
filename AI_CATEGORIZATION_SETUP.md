# AI Message Categorization Setup Guide

This guide will help you set up automatic AI categorization for messages in GhostInbox.

## Overview

The AI Message Categorizer automatically:
- ✅ Categorizes messages (question, compliment, criticism, support, feedback, suggestion, other)
- ✅ Analyzes sentiment (positive, negative, neutral, mixed)
- ✅ Detects urgency (low, medium, high)
- ✅ Auto-tags messages with relevant tags
- ✅ Auto-assigns messages to folders based on category

## Prerequisites

1. ✅ OpenAI API key configured in Supabase Edge Functions
2. ✅ Database schema updated with AI columns (`ai_features_schema.sql`)
3. ✅ Edge Function deployed (`ai-categorization-webhook`)

## Setup Steps

### Step 1: Run Database Schema

Run the following SQL files in your Supabase SQL Editor (in order):

1. **`supabase/ai_features_schema.sql`** - Adds AI columns to messages table
   ```sql
   -- This adds columns like ai_category, ai_sentiment, ai_urgency, etc.
   ```

2. **`supabase/ai_categorization_setup.sql`** - Sets up database triggers (requires pg_net extension)
   OR
   **`supabase/ai_categorization_webhook_setup.sql`** - Alternative setup using webhooks (no pg_net needed)

### Step 2: Deploy Edge Function

Deploy the AI categorization webhook Edge Function:

```bash
# From your project root
supabase functions deploy ai-categorization-webhook
```

Make sure the Edge Function has these environment variables set:
- `OPENAI_API_KEY` - Your OpenAI API key
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

### Step 3: Choose Your Trigger Method

You have three options for triggering categorization:

#### Option A: Database Webhook (Recommended) ⭐

1. Go to Supabase Dashboard > Database > Webhooks
2. Click "Create a new webhook"
3. Configure:
   - **Name**: `AI Categorization Webhook`
   - **Table**: `vent_messages`
   - **Events**: `INSERT`
   - **Type**: `HTTP Request`
   - **URL**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/ai-categorization-webhook`
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
2. Run `supabase/ai_categorization_setup.sql`
3. Set database settings (optional, for custom URLs):
   ```sql
   ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';
   ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';
   ```

#### Option C: Client-Side Trigger (Fallback)

If webhooks/triggers aren't available, you can trigger categorization from the client after message creation.

Add this to `src/pages/VentPage.tsx` after message insertion:

```typescript
// After successful message insert (around line 690)
if (insertedData?.id) {
  // Trigger categorization in background (don't wait for response)
  supabase.functions.invoke('ai-categorization-webhook', {
    body: {
      message_id: insertedData.id,
      message_body: sanitized,
      vent_link_id: ventLink.id,
    },
  }).catch(err => {
    // Silently fail - categorization will happen eventually
    console.error('Categorization trigger failed:', err)
  })
}
```

## Features

### Auto-Folder Assignment

Messages are automatically assigned to folders based on their category:

- **Questions** → "Questions" folder
- **Compliments** → "Compliments" folder
- **Criticism** → "Feedback" folder
- **Support** → "Support" folder
- **Feedback** → "Feedback" folder
- **Suggestions** → "Suggestions" folder
- **Other** → "Other" folder

Folders are created automatically if they don't exist.

### Auto-Tagging

Messages are automatically tagged with relevant tags based on AI analysis. Tags are added to the `message_tags` table.

### UI Display

Once set up, the Dashboard will automatically display:

1. **Category Badges** - Shows message category in message list
2. **Sentiment Indicators** - Color-coded sentiment (positive/negative/neutral/mixed)
3. **Urgency Badges** - High priority messages get special badges
4. **AI Analysis Card** - Detailed categorization info in message detail view

## Testing

1. **Send a test message** through your vent page
2. **Check the Dashboard** - The message should show:
   - Category badge (e.g., "question", "compliment")
   - Sentiment indicator
   - Urgency level
   - Auto-assigned folder

3. **Check database**:
   ```sql
   SELECT 
     id, 
     body, 
     ai_category,
     ai_sentiment,
     ai_urgency,
     ai_processed_at
   FROM vent_messages
   ORDER BY created_at DESC
   LIMIT 5;
   ```

4. **Check folders**:
   ```sql
   SELECT mfa.*, mf.folder_name
   FROM message_folder_assignments mfa
   JOIN message_folders mf ON mfa.folder_id = mf.id
   WHERE mfa.message_id = 'your-message-id';
   ```

5. **Check tags**:
   ```sql
   SELECT * FROM message_tags
   WHERE message_id = 'your-message-id';
   ```

## Troubleshooting

### Messages not being categorized

1. **Check Edge Function logs**: Supabase Dashboard > Edge Functions > ai-categorization-webhook > Logs
2. **Verify webhook is active**: Database > Webhooks > Check status
3. **Check OpenAI API key**: Make sure it's set in Edge Function secrets
4. **Verify database columns exist**: Run `ai_features_schema.sql` again

### Folders not being created

- The Edge Function automatically creates folders if they don't exist
- Check that the `message_folders` table exists and has proper RLS policies
- Verify the `owner_id` is correctly retrieved from the vent_link

### Tags not being added

- Check that the `message_tags` table exists
- Verify RLS policies allow inserts
- Check Edge Function logs for tag insertion errors

### High costs

- Categorization uses GPT-4o-mini (~$0.002 per message)
- For 1000 messages/month: ~$2/month
- Very affordable for the value provided

### Performance issues

- Categorization runs asynchronously (non-blocking)
- Messages are processed in background
- UI shows categorization results when available

## Manual Categorization

To manually trigger categorization for existing messages:

```sql
SELECT trigger_categorization_for_message('message-id-here');
```

Or use the Edge Function directly:

```typescript
await supabase.functions.invoke('ai-categorization-webhook', {
  body: {
    message_id: 'message-id',
    message_body: 'message text',
    vent_link_id: 'vent-link-id',
  },
})
```

## Customization

### Custom Folder Names

You can customize folder names by editing the `categoryFolderMap` in `supabase/functions/ai-categorization-webhook/index.ts`:

```typescript
const categoryFolderMap: Record<string, string> = {
  question: 'Your Custom Question Folder',
  compliment: 'Your Custom Compliment Folder',
  // ... etc
}
```

### Custom Tags

The AI automatically generates tags, but you can also add custom tag logic in the Edge Function.

## Next Steps

After categorization is working, consider:
1. **AI Priority Scorer** - Score messages by importance
2. **Enhanced Response Assistant** - Context-aware replies
3. **AI Insight Generator** - Trend reports and analytics

See `AI_IMPLEMENTATION_PLAN.md` for details.
