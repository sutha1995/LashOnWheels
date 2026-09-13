import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.109.0';
import { handleCors, jsonResponse } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const cronSecret = Deno.env.get('BOOKING_REMINDER_CRON_SECRET');

Deno.serve(async (request) => {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);
  if (!cronSecret || request.headers.get('x-cron-secret') !== cronSecret) {
    return jsonResponse({ error: 'Unauthorized.' }, 401);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase.rpc('create_booking_reminders');
  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ created: data ?? 0 });
});
