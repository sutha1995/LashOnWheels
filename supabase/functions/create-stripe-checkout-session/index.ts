import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.109.0';
import { handleCors, jsonResponse } from '../_shared/cors.ts';
import { stripeRequest } from '../_shared/stripe.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (request) => {
  const corsResponse = handleCors(request);
  if (corsResponse) {
    return corsResponse;
  }

  let adminClient: ReturnType<typeof createClient> | null = null;
  let claimToken = '';
  let claimedBookingId = '';
  let checkoutClaimed = false;
  let stripeSessionId = '';

  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'You must be signed in to start checkout.' }, 401);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return jsonResponse({ error: 'Your session is invalid or expired.' }, 401);
    }

    const { bookingId } = await request.json();
    if (typeof bookingId !== 'string' || !bookingId) {
      return jsonResponse({ error: 'A booking ID is required.' }, 400);
    }

    adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
    claimedBookingId = bookingId;
    const { data: booking, error: bookingError } = await adminClient
      .from('bookings')
      .select('id, customer_id, service_name, price, status, payment_status')
      .eq('id', bookingId)
      .maybeSingle();

    if (bookingError) {
      throw bookingError;
    }
    if (!booking || booking.customer_id !== userData.user.id) {
      return jsonResponse({ error: 'Booking not found.' }, 404);
    }
    const amount = Math.round(Number(booking.price) * 100);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return jsonResponse({ error: 'This booking has an invalid payment amount.' }, 400);
    }

    const successUrl = Deno.env.get('STRIPE_SUCCESS_URL');
    const cancelUrl = Deno.env.get('STRIPE_CANCEL_URL');
    if (!successUrl || !cancelUrl) {
      throw new Error('STRIPE_SUCCESS_URL and STRIPE_CANCEL_URL are not configured.');
    }

    claimToken = crypto.randomUUID();
    const { data: claimData, error: claimError } = await adminClient.rpc('claim_booking_checkout', {
      p_booking_id: bookingId,
      p_customer_id: userData.user.id,
      p_claim_token: claimToken,
    });
    if (claimError) {
      throw claimError;
    }
    const claim = (claimData as Array<{ claimed: boolean; payment_reference: string | null }> | null)?.[0];
    if (!claim?.claimed) {
      return jsonResponse({ error: 'A checkout session is already being processed for this booking.' }, 409);
    }
    if (claim.payment_reference) {
      claimToken = claim.payment_reference;
    }
    checkoutClaimed = true;

    const params = new URLSearchParams();
    params.set('mode', 'payment');
    params.set('line_items[0][price_data][currency]', 'myr');
    params.set('line_items[0][price_data][product_data][name]', booking.service_name);
    params.set('line_items[0][price_data][unit_amount]', String(amount));
    params.set('line_items[0][quantity]', '1');
    params.set('client_reference_id', booking.id);
    params.set('metadata[booking_id]', booking.id);
    params.set('metadata[customer_id]', userData.user.id);
    params.set('metadata[checkout_claim_token]', claimToken);
    params.set('success_url', successUrl);
    params.set('cancel_url', cancelUrl);

    const session = await stripeRequest('checkout/sessions', params, `booking-checkout-${booking.id}-${claimToken}`);
    stripeSessionId = session.id;
    const { error: paymentError } = await adminClient.rpc('finalize_booking_checkout', {
      p_booking_id: booking.id,
      p_claim_token: claimToken,
      p_session_id: session.id,
    });
    if (paymentError) {
      throw paymentError;
    }

    return jsonResponse({ url: session.url });
  } catch (error) {
    if (adminClient && checkoutClaimed && claimToken && !stripeSessionId) {
      await adminClient.rpc('set_booking_payment_status', {
        p_booking_id: claimedBookingId,
        p_payment_status: 'failed',
        p_payment_provider: 'stripe',
        p_payment_reference: claimToken,
      });
    }
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unable to start checkout.' }, 500);
  }
});
