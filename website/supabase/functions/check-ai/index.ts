import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Verify Auth using Supabase REST API directly (supports ES256)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Verify user via Supabase Auth REST API (handles ES256 natively)
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': authHeader,
        'apikey': supabaseKey
      }
    });

    if (!userRes.ok) {
      const errBody = await userRes.text();
      console.error('Auth verification failed:', userRes.status, errBody);
      return new Response(JSON.stringify({ error: 'Unauthorized', detail: errBody }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const user = await userRes.json();
    if (!user || !user.id) {
      return new Response(JSON.stringify({ error: 'Invalid user' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('Verified user:', user.email);

    // ── SCAN LIMIT ENFORCEMENT ────────────────────────────────────────────────
    // Atomically increment daily_scans_used and check if under limit
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? supabaseKey;
    const limitRes = await fetch(`${supabaseUrl}/rest/v1/rpc/increment_scan_and_check`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_user_id: user.id })
    });

    let limitData = null;
    if (limitRes.ok) {
      const [rawLimitData] = await limitRes.json();
      limitData = rawLimitData;
      if (limitData && !limitData.allowed) {
        console.log(`User ${user.email} hit scan limit: ${limitData.scans_used}/${limitData.scan_limit} (${limitData.tier})`);
        return new Response(JSON.stringify({
          error: 'Daily scan limit reached',
          limitReached: true,
          scansUsed: limitData.scans_used,
          scanLimit: limitData.scan_limit,
          tier: limitData.tier,
          upgradeUrl: 'https://antidistract.app/settings/billing'
        }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    } else {
      // If the RPC fails (e.g. profiles table not set up yet), log but don't block the user
      console.warn('Scan limit check failed (non-blocking):', await limitRes.text());
    }
    // ─────────────────────────────────────────────────────────────────────────

    const { goal, videoTitle, videoDescription, videoChannel, url, userJustification } = await req.json();

    if (!goal || (!videoTitle && !videoDescription)) {
      return new Response(JSON.stringify({ error: 'Goal and page context required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Call Gemini
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not set in Edge Function' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let prompt = `You are a focus assistant for a productivity extension. Determine if this web page is relevant to the user's goal.\n\nUser's Goal: "${goal}"\n\nPage Info:\n- Title: ${videoTitle}\n- Site/Channel: ${videoChannel || 'N/A'}\n- URL: ${url || 'N/A'}\n- Description/Content: ${(videoDescription || '').slice(0, 500)}`;

    if (userJustification) {
      prompt += `\n\nThe user was previously blocked from this page, but submitted this justification:\n"${userJustification}"\n\nEvaluate if this justification makes logical sense for their goal. If they provide a valid, reasonable explanation for how this page helps them accomplish their goal, allow it (isRelevant: true). Block it only if the justification is nonsensical or a clear excuse to view entertainment.`;
    } else {
      prompt += `\n\nIMPORTANT RULES:
1. SEMANTIC MATCH: The page content must directly aid, research, or facilitate the user's stated goal. 
2. DOMAIN AGNOSTIC: This applies to ANY profession (coding, writing, design, law, studying, etc.). If the goal is "write fantasy novel", a wiki about medieval armor is relevant, but a tutorial on Docker is NOT.
3. PRODUCTIVITY TOOLS: Search engines and AI Tools (ChatGPT, Claude) are relevant ONLY IF the visible query or context relates to the goal. 
4. BLOCK DISTRACTIONS: Social media feeds, entertainment, gaming, and news are NOT relevant UNLESS the user's specific goal directly requires them (e.g., goal is "research social media marketing").
5. AVOID FALSE POSITIVES: If a page appears to be a genuine learning resource, reference material, or working tool directly tied to their goal, allow it.`;
    }

    prompt += `\n\nReply ONLY with a JSON object, no markdown, no code fences:\n{"isRelevant": true/false, "confidence": 0.5, "reasoning": "one short sentence explaining why"}`;

    // We STRICTLY use this curated list to avoid audio-only/experimental models crashing the prompt
    // Ordered by priority (Custom cheap, then flash, then next-gen)
    const models = [
      'gemini-2.5-flash-lite',
      'gemini-2.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-3-flash'
    ];

    let geminiData = null;
    let lastError = '';

    for (const model of models) {
      const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      const responseBody = await geminiResponse.json();

      if (geminiResponse.ok) {
        console.log(`AI scan completed with model: ${model}`);
        geminiData = responseBody;
        break;
      }

      console.warn(`Model ${model} failed (${geminiResponse.status}):`, responseBody?.error?.message ?? JSON.stringify(responseBody));
      lastError = `${model} unavailable (${geminiResponse.status}): ${responseBody?.error?.message ?? 'unknown'}`;

      // Continue to next model on rate-limit, overload, or not-found
      if (geminiResponse.status === 503 || geminiResponse.status === 429 || geminiResponse.status === 404) {
        continue;
      }

      // Any other error (400 bad key, 401/403 auth) — stop immediately
      throw new Error(`Gemini API error (${model}): ${JSON.stringify(responseBody)}`);
    }

    if (!geminiData) {
      throw new Error(`All Gemini models unavailable. Last error: ${lastError}`);
    }

    const text = geminiData.candidates[0].content.parts[0].text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid AI response format: ' + text);

    const aiResult = JSON.parse(jsonMatch[0]);

    // Attach authoritative scan usage so the client can sync
    const responsePayload = {
      ...aiResult,
      ...(limitData ? {
        _usage: {
          scansUsed: limitData.scans_used,
          scanLimit: limitData.scan_limit,
          tier: limitData.tier
        }
      } : {})
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Edge function error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
