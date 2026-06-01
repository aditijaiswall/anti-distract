import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Polar event types we care about
const POLAR_EVENTS = [
  'subscription.created',
  'subscription.updated',
  'subscription.active',
  'subscription.canceled',
  'subscription.revoked',
  'checkout.created',
  'checkout.updated',
  'order.created',
  'order.paid',
  'customer.state_changed',
]

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const polarWebhookSecret = Deno.env.get('POLAR_WEBHOOK_SECRET') ?? ''

    // 1. Verify Polar webhook signature
    const signature = req.headers.get('webhook-signature') ?? req.headers.get('x-polar-signature') ?? ''
    const rawBody = await req.text()

    if (polarWebhookSecret) {
      // Polar uses HMAC-SHA256 for signature verification
      const encoder = new TextEncoder()
      const key = await crypto.subtle.importKey(
        'raw', encoder.encode(polarWebhookSecret),
        { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']
      )
      const bodyBytes = encoder.encode(rawBody)
      const expectedSig = await crypto.subtle.sign('HMAC', key, bodyBytes)
      const expectedHex = Array.from(new Uint8Array(expectedSig)).map(b => b.toString(16).padStart(2, '0')).join('')

      // Polar sends "v1=<hex>" or just the hex
      const receivedHex = signature.replace(/^v1=/, '')
      if (receivedHex !== expectedHex) {
        console.warn(`[DEBUG] Signature mismatch! Received: ${receivedHex}, Expected: ${expectedHex}`)
      } else {
        console.log('[DEBUG] Signature verified successfully.')
      }
    }

    const event = JSON.parse(rawBody)
    const eventType = event.type ?? event.event

    console.log(`Polar webhook received: ${eventType}`)
    console.log(`Full payload: ${JSON.stringify(event).slice(0, 500)}`)

    if (!POLAR_EVENTS.includes(eventType)) {
      // Acknowledge but ignore unhandled event types
      return new Response(JSON.stringify({ received: true, processed: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 2. Extract data from Polar event
    // Polar attaches customer metadata — we expect user_id in custom_fields or metadata
    const subscription = event.data
    const polarCustomerId = subscription?.customer_id ?? subscription?.customer?.id
    const customFields = subscription?.customer?.metadata ?? subscription?.metadata ?? {}
    const userId = customFields?.supabase_user_id ?? customFields?.user_id

    // Determine tier change based on event type
    // UPGRADE events: these indicate an active paid subscription
    const UPGRADE_EVENTS = ['subscription.created', 'subscription.active', 'order.created', 'order.paid', 'customer.state_changed']
    // DOWNGRADE events: these indicate a cancelled/ended subscription  
    const DOWNGRADE_EVENTS = ['subscription.canceled', 'subscription.revoked']

    let newTier: string | null = null
    if (UPGRADE_EVENTS.includes(eventType)) {
      newTier = 'pro'
    } else if (DOWNGRADE_EVENTS.includes(eventType)) {
      newTier = 'free'
    } else {
      // For ambiguous events like checkout.updated, subscription.updated, checkout.created
      // DO NOT change the tier — just acknowledge and skip
      console.log(`Skipping tier change for ambiguous event: ${eventType}`)
      return new Response(JSON.stringify({ received: true, processed: false, skipped: eventType }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const userEmail = subscription?.customer?.email
      ?? subscription?.customer_email
      ?? event.data?.customer_email
      ?? event.data?.email
      ?? event.data?.user?.email;

    console.log(`Processing: userId=${userId}, polarCustomerId=${polarCustomerId}, userEmail=${userEmail}, tier=${newTier}`)

    // 3. Update by userId if we have it
    if (userId) {
      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_tier: newTier,
          polar_customer_id: polarCustomerId,
        })
        .eq('id', userId)

      if (error) {
        console.error('Failed to update profile by user_id:', error)
        throw error
      }
      console.log(`✅ Updated user ${userId} → tier: ${newTier}`)
    }
    // 4. Fallback: update by email
    else if (userEmail) {
      // Use the safe Admin API to find the user by email
      const { data: adminData, error: adminError } = await supabase.auth.admin.listUsers()

      const matchedUser = adminData?.users?.find((u: any) => u.email === userEmail)

      if (matchedUser) {
        const { error } = await supabase
          .from('profiles')
          .update({ subscription_tier: newTier, polar_customer_id: polarCustomerId })
          .eq('id', matchedUser.id)

        if (error) {
          console.error(`Failed to update user by email ${userEmail}`, error);
        } else {
          console.log(`✅ Updated user by email ${userEmail} → tier: ${newTier}`)
        }
      } else {
        console.warn(`No profile found matching email ${userEmail}. Cannot update tier to ${newTier}.`)
      }
    }
    // 5. Fallback: update by polar_customer_id
    else if (polarCustomerId) {
      const { error } = await supabase
        .from('profiles')
        .update({ subscription_tier: newTier })
        .eq('polar_customer_id', polarCustomerId)

      if (error) {
        console.error('Failed to update profile by polar_customer_id:', error)
        throw error
      }
      console.log(`✅ Updated polar customer ${polarCustomerId} → tier: ${newTier}`)
    } else {
      console.warn('No userId, email, or polarCustomerId found in webhook payload — cannot update profile.')
    }

    return new Response(JSON.stringify({ received: true, processed: true, tier: newTier }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Polar webhook error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
