import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.109.0';
import { handleCors, jsonResponse } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const nebiusApiKey = Deno.env.get('NEBIUS_API_KEY');
const nebiusBaseUrl = Deno.env.get('NEBIUS_BASE_URL') ?? 'https://api.tokenfactory.nebius.com/v1';
const nebiusModel = Deno.env.get('NEBIUS_MODEL');

const prompts = {
  freelancer_bio:
    'Write a warm, professional freelancer profile bio for a mobile lash artist. Keep it under 70 words. Do not invent qualifications, guarantees, prices, or safety claims. Return only the draft.',
  service_description:
    'Write a clear, appealing service description for a mobile lash service. Keep it under 45 words. Do not invent qualifications, guarantees, prices, or safety claims. Return only the draft.',
} as const;

type Action = keyof typeof prompts;

Deno.serve(async (request) => {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);
  if (!nebiusApiKey || !nebiusModel) return jsonResponse({ error: 'AI assistance is not configured.' }, 503);

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return jsonResponse({ error: 'You must be signed in.' }, 401);
  const userClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authorization } } });
  const { data: userData } = await userClient.auth.getUser();
  if (!userData.user) return jsonResponse({ error: 'Your session is invalid.' }, 401);

  const { data: profile } = await userClient
    .from('profiles')
    .select('requested_role, role, suspended_at')
    .eq('id', userData.user.id)
    .maybeSingle();
  if (!profile || profile.suspended_at || (profile.role !== 'freelancer' && profile.requested_role !== 'freelancer')) {
    return jsonResponse({ error: 'Only active freelancer accounts can use AI drafting.' }, 403);
  }

  const body = await request.json();
  const action = body?.action as Action;
  const source = typeof body?.source === 'string' ? body.source.trim().slice(0, 1500) : '';
  if (!prompts[action] || !source) return jsonResponse({ error: 'A supported action and source text are required.' }, 400);

  const response = await fetch(`${nebiusBaseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${nebiusApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: nebiusModel, temperature: 0.4, max_tokens: 180, messages: [{ role: 'system', content: prompts[action] }, { role: 'user', content: source }] }),
  });
  if (!response.ok) return jsonResponse({ error: 'AI drafting is temporarily unavailable.' }, 502);
  const result = await response.json();
  const draft = result?.choices?.[0]?.message?.content;
  if (typeof draft !== 'string' || !draft.trim()) return jsonResponse({ error: 'AI drafting returned no text.' }, 502);
  return jsonResponse({ draft: draft.trim() });
});
