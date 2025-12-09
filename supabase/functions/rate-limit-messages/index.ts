// Supabase Edge Function for rate limiting message submissions
// Limits: 5 messages per IP per hour per vent link

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RATE_LIMIT_MESSAGES_PER_HOUR = 5
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour

// Hash IP address using Web Crypto API (Deno native)
async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(ip)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
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
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get IP address from request
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                     req.headers.get('x-real-ip') ||
                     'unknown'

    // Hash IP for privacy
    const ipHash = await hashIP(clientIP)

    // Parse request body
    const body = await req.json()
    const { vent_link_id } = body

    if (!vent_link_id) {
      return new Response(
        JSON.stringify({ error: 'vent_link_id is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client (service role for rate limit table access)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    )

    // Check rate limit
    const now = new Date()
    const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS)

    // Query recent messages from this IP for this vent link
    const { data: recentMessages, error: queryError } = await supabaseClient
      .from('vent_messages')
      .select('id, created_at')
      .eq('vent_link_id', vent_link_id)
      .eq('ip_hash', ipHash)
      .gte('created_at', windowStart.toISOString())
      .order('created_at', { ascending: false })

    if (queryError) {
      console.error('Error querying rate limit:', queryError)
      // Allow on error to avoid blocking legitimate users
    }

    const messageCount = recentMessages?.length || 0

    if (messageCount >= RATE_LIMIT_MESSAGES_PER_HOUR) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `You can only send ${RATE_LIMIT_MESSAGES_PER_HOUR} messages per hour. Please try again later.`,
          retryAfter: Math.ceil((RATE_LIMIT_WINDOW_MS - (now.getTime() - new Date(recentMessages?.[messageCount - 1]?.created_at || now).getTime())) / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Retry-After': '3600',
          },
        }
      )
    }

    // Rate limit passed - return success
    return new Response(
      JSON.stringify({
        allowed: true,
        remaining: RATE_LIMIT_MESSAGES_PER_HOUR - messageCount,
        resetAt: new Date(now.getTime() + RATE_LIMIT_WINDOW_MS).toISOString(),
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
    console.error('Error in rate limit function:', error)
    // Allow on error to avoid blocking legitimate users
    return new Response(
      JSON.stringify({ allowed: true, error: 'Rate limit check failed, allowing request' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

