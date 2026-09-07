import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.109.0';
import { corsHeaders, handleCors, jsonResponse } from '../_shared/cors.ts';
import { verifyStripeSignature } from '../_shared/stripe.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (request) => {
  const corsResponse = handleCors(request);
  if (corsResponse) {
    return corsResponse;
  }

  try {
    const signature = request.headers.get('Stripe-Signature');
    if (!signature) {
      return jsonResponse({ error: 'Missing Stripe signature.' }, 400);
    }

    const payload = await request.text();
    if (!(await verifyStripeSignature(payload, signature))) {
      return jsonResponse({ error: 'Invalid Stripe signature.' }, 400);
    }

    const event = JSON.parse(payload);
    const session = event.data?.object;
    const bookingId = session?.metadata?.booking_id;
    const metadataClaimToken = session?.metadata?.checkout_claim_token;
    const claimToken = typeof metadataClaimToken === 'string' ? metadataClaimToken : null;
    if (typeof bookingId !== 'string') {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const paymentStatus =
      event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded'
        ? session.payment_status === 'paid'
          ? 'paid'
          : 'pending'
        : event.type === 'checkout.session.async_payment_failed' || event.type === 'checkout.session.expired'
          ? 'failed'
          : null;

    if (!paymentStatus) {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { error } = await adminClient.rpc('apply_stripe_payment_event', {
      p_booking_id: bookingId,
      p_session_id: session.id,
      p_claim_token: claimToken,
      p_payment_status: paymentStatus,
    });
    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Webhook processing failed.' }, 500);
  }
});
