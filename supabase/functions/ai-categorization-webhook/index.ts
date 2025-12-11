// Supabase Edge Function for AI Categorization Webhook
// This endpoint can be called by database triggers or webhooks
// Auto-categorizes messages and assigns to folders

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

interface WebhookBody {
  message_id: string
  message_body: string
  vent_link_id: string
  owner_id?: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    // Verify this is an internal call
    const authHeader = req.headers.get('Authorization')
    const apiKey = req.headers.get('apikey')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    const isInternalCall = 
      (authHeader && authHeader.includes(serviceRoleKey || '')) ||
      (apiKey === serviceRoleKey)

    if (!isInternalCall && !authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - internal endpoint only' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Check OpenAI API key
    if (!OPENAI_API_KEY) {
      console.error('OpenAI API key not configured')
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body: WebhookBody = await req.json()
    const { message_id, message_body, vent_link_id, owner_id } = body

    if (!message_id || !message_body) {
      return new Response(
        JSON.stringify({ error: 'message_id and message_body are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate message length
    if (message_body.length > 5000) {
      return new Response(
        JSON.stringify({ error: 'Message too long' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const startTime = Date.now()

    // Get owner_id from vent_link if not provided
    let messageOwnerId = owner_id
    if (!messageOwnerId) {
      const { data: ventLink } = await supabaseClient
        .from('vent_links')
        .select('owner_id')
        .eq('id', vent_link_id)
        .single()
      
      if (ventLink) {
        messageOwnerId = ventLink.owner_id
      }
    }

    // Call OpenAI for categorization
    const categorizePrompt = `Analyze this anonymous message and categorize it. Respond with ONLY a JSON object:

"${message_body}"

{
  "primary_category": "question" | "compliment" | "criticism" | "support" | "feedback" | "suggestion" | "other",
  "sentiment": "positive" | "negative" | "neutral" | "mixed",
  "urgency": "low" | "medium" | "high",
  "tags": ["tag1", "tag2", "tag3"],
  "summary": "brief one-sentence summary",
  "confidence": 0.0-1.0
}`

    const categorizeResponse = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: categorizePrompt }],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    })

    if (!categorizeResponse.ok) {
      const errorData = await categorizeResponse.text()
      console.error('OpenAI API error:', errorData)
      
      await supabaseClient
        .from('ai_processing_log')
        .insert({
          message_id,
          processing_type: 'categorize',
          result: { error: 'Categorization API failed', details: errorData },
          processing_time_ms: Date.now() - startTime,
        })
      
      return new Response(
        JSON.stringify({ error: 'Failed to categorize message' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const categorizeData = await categorizeResponse.json()
    let categorizationResult: any = {}
    
    try {
      categorizationResult = JSON.parse(categorizeData.choices[0]?.message?.content || '{}')
    } catch (e) {
      console.error('Failed to parse categorization:', e)
      categorizationResult = { error: 'Failed to parse categorization' }
    }

    // Update message with categorization results
    const updateData: any = {
      ai_category: categorizationResult.primary_category || null,
      ai_sentiment: categorizationResult.sentiment || null,
      ai_urgency: categorizationResult.urgency || null,
      ai_processed_at: new Date().toISOString(),
    }

    const { error: updateError } = await supabaseClient
      .from('vent_messages')
      .update(updateData)
      .eq('id', message_id)

    if (updateError) {
      console.error('Error updating message with categorization:', updateError)
    }

    // Add tags to message
    if (categorizationResult.tags && Array.isArray(categorizationResult.tags) && messageOwnerId) {
      for (const tagName of categorizationResult.tags) {
        if (tagName && typeof tagName === 'string' && tagName.trim()) {
          // Check if tag already exists
          const { data: existingTag } = await supabaseClient
            .from('message_tags')
            .select('id')
            .eq('message_id', message_id)
            .eq('tag_name', tagName.trim())
            .single()

          if (!existingTag) {
            // Insert tag
            await supabaseClient
              .from('message_tags')
              .insert({
                message_id,
                tag_name: tagName.trim(),
              })
          }
        }
      }
    }

    // Auto-assign to folder based on category (if owner_id is available)
    if (messageOwnerId && categorizationResult.primary_category) {
      // Map categories to default folder names
      const categoryFolderMap: Record<string, string> = {
        question: 'Questions',
        compliment: 'Compliments',
        criticism: 'Feedback',
        support: 'Support',
        feedback: 'Feedback',
        suggestion: 'Suggestions',
        other: 'Other',
      }

      const folderName = categoryFolderMap[categorizationResult.primary_category]
      
      if (folderName) {
        // Find or create folder
        let { data: folder } = await supabaseClient
          .from('message_folders')
          .select('id')
          .eq('owner_id', messageOwnerId)
          .eq('folder_name', folderName)
          .single()

        if (!folder) {
          // Create folder if it doesn't exist
          const { data: newFolder } = await supabaseClient
            .from('message_folders')
            .insert({
              owner_id: messageOwnerId,
              folder_name: folderName,
            })
            .select('id')
            .single()

          folder = newFolder
        }

        if (folder?.id) {
          // Check if message is already in this folder
          const { data: existingAssignment } = await supabaseClient
            .from('message_folder_assignments')
            .select('id')
            .eq('message_id', message_id)
            .eq('folder_id', folder.id)
            .single()

          if (!existingAssignment) {
            // Assign message to folder
            await supabaseClient
              .from('message_folder_assignments')
              .insert({
                message_id,
                folder_id: folder.id,
              })
          }
        }
      }
    }

    // Log processing result
    await supabaseClient.from('ai_processing_log').insert({
      message_id,
      processing_type: 'categorize',
      result: categorizationResult,
      processing_time_ms: Date.now() - startTime,
    })

    return new Response(
      JSON.stringify({
        success: true,
        message_id,
        categorization: categorizationResult,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    console.error('Error in AI categorization webhook:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
