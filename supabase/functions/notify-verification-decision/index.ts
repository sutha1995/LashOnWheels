import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.109.0';
import { handleCors, jsonResponse } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const resendApiKey = Deno.env.get('RESEND_API_KEY');
const sender = Deno.env.get('RESEND_FROM_EMAIL') ?? 'Lash On Wheels <onboarding@resend.dev>';

Deno.serve(async (request) => {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return jsonResponse({ error: 'You must be signed in.' }, 401);

  const userClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authorization } } });
  const { data: callerData } = await userClient.auth.getUser();
  if (!callerData.user) return jsonResponse({ error: 'Your session is invalid.' }, 401);
  const { data: callerProfile } = await userClient.from('profiles').select('role').eq('id', callerData.user.id).maybeSingle();
  if (callerProfile?.role !== 'admin') return jsonResponse({ error: 'Admin access is required.' }, 403);

  const body = await request.json();
  const freelancerId = typeof body?.freelancerId === 'string' ? body.freelancerId : '';
  const status = body?.status === 'approved' || body?.status === 'rejected' || body?.status === 'pending' ? body.status : null;
  if (!freelancerId || !status) return jsonResponse({ error: 'A freelancer and a valid decision are required.' }, 400);

  const { error: decisionError } = await userClient.rpc('admin_set_freelancer_verification', { p_freelancer_id: freelancerId, p_status: status });
  if (decisionError) return jsonResponse({ error: decisionError.message }, 400);
  if (!resendApiKey) return jsonResponse({ emailSent: false });

  const serviceClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: freelancerData } = await serviceClient.auth.admin.getUserById(freelancerId);
  const recipient = freelancerData.user?.email;
  if (!recipient) return jsonResponse({ emailSent: false });
  const approved = status === 'approved';
  const subject = approved ? 'Your Lash On Wheels application is approved' : status === 'rejected' ? 'Your Lash On Wheels application needs attention' : 'Your Lash On Wheels application is under review';
  const text = approved
    ? 'Your freelancer application has been approved. You can now complete your services, availability, and profile to be discovered by customers.'
    : status === 'rejected'
      ? 'Your freelancer application was not approved at this time. Please review your submitted IC and certification documents, then contact support if you need help.'
      : 'Your freelancer application is still under review. We will email you when a decision is made.';
  const emailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: sender, to: [recipient], subject, text }),
  });
  return jsonResponse({ emailSent: emailResponse.ok });
});
