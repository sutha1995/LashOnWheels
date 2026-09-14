import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.109.0';
import { handleCors, jsonResponse } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const resendApiKey = Deno.env.get('RESEND_API_KEY');
const recipient = Deno.env.get('SUPPORT_TICKET_TO_EMAIL') ?? 'info@astramartechlab.com';
const sender = Deno.env.get('RESEND_FROM_EMAIL') ?? 'Lash On Wheels <onboarding@resend.dev>';

type ChatMessage = { sender?: unknown; text?: unknown };

Deno.serve(async (request) => {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);
  if (!resendApiKey) return jsonResponse({ error: 'Ticket email is not configured.' }, 503);

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return jsonResponse({ error: 'You must be signed in.' }, 401);
  const userClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authorization } } });
  const { data: userData } = await userClient.auth.getUser();
  if (!userData.user) return jsonResponse({ error: 'Your session is invalid.' }, 401);

  const body = await request.json();
  const message = typeof body?.message === 'string' ? body.message.trim().slice(0, 3000) : '';
  const conversation = Array.isArray(body?.conversation)
    ? body.conversation
        .slice(-12)
        .map((item: ChatMessage) => ({
          sender: item.sender === 'assistant' ? 'assistant' : 'user',
          text: typeof item.text === 'string' ? item.text.slice(0, 1500) : '',
        }))
        .filter((item) => item.text)
    : [];
  if (!message) return jsonResponse({ error: 'Tell us what you need help with before creating a ticket.' }, 400);

  const { data: ticket, error: ticketError } = await userClient
    .from('support_tickets')
    .insert({ user_id: userData.user.id, message, conversation })
    .select('id')
    .single();
  if (ticketError || !ticket) return jsonResponse({ error: 'Unable to create a support ticket.' }, 500);

  const transcript = conversation.map((item) => `${item.sender === 'assistant' ? 'Assistant' : 'User'}: ${item.text}`).join('\n\n');
  const emailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: sender,
      to: [recipient],
      subject: `Lash On Wheels support ticket ${ticket.id.slice(0, 8).toUpperCase()}`,
      text: `Ticket ID: ${ticket.id}\nUser email: ${userData.user.email ?? 'Not available'}\n\nIssue:\n${message}\n\nChat transcript:\n${transcript || 'Not available'}`,
    }),
  });
  if (!emailResponse.ok) return jsonResponse({ ticketId: ticket.id, emailSent: false }, 201);
  return jsonResponse({ ticketId: ticket.id, emailSent: true }, 201);
});
