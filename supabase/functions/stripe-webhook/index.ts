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
    const { data: booking, error: bookingError } = await adminClient
      .from('bookings')
      .select('status, payment_status, payment_reference')
      .eq('id', bookingId)
      .maybeSingle();
    if (bookingError) {
      throw bookingError;
    }
    if (
      !booking ||
      booking.status !== 'confirmed' ||
      booking.payment_status === 'paid' ||
      (booking.payment_reference && booking.payment_reference !== session.id)
    ) {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error } = await adminClient.rpc('set_booking_payment_status', {
      p_booking_id: bookingId,
      p_payment_status: paymentStatus,
      p_payment_provider: 'stripe',
      p_payment_reference: session.id,
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
