import { supabase } from './supabase';

export async function draftFreelancerBio(source: string) {
  if (!supabase) return { draft: null, error: new Error('Supabase is not configured.') };
  const { data, error } = await supabase.functions.invoke('ai-assist', { body: { action: 'freelancer_bio', source } });
  const draft = data && typeof data === 'object' && 'draft' in data && typeof data.draft === 'string' ? data.draft : null;
  return { draft, error };
}
