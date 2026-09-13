import { supabase } from './supabase';

export async function draftFreelancerBio(source: string) {
  if (!supabase) return { draft: null, error: new Error('Supabase is not configured.') };
  const { data, error } = await supabase.functions.invoke('ai-assist', { body: { action: 'freelancer_bio', source } });
  const draft = data && typeof data === 'object' && 'draft' in data && typeof data.draft === 'string' ? data.draft : null;
  return { draft, error };
}

export type ResearchSource = { title: string; url: string };

export async function researchLashTrends(source: string) {
  if (!supabase) return { draft: null, sources: [] as ResearchSource[], error: new Error('Supabase is not configured.') };
  const { data, error } = await supabase.functions.invoke('ai-assist', { body: { action: 'lash_trends', source } });
  const draft = data && typeof data === 'object' && 'draft' in data && typeof data.draft === 'string' ? data.draft : null;
  const rawSources: unknown[] = data && typeof data === 'object' && 'sources' in data && Array.isArray(data.sources)
    ? data.sources
    : [];
  const sources = rawSources.filter((item): item is ResearchSource =>
    !!item && typeof item === 'object' && 'title' in item && 'url' in item &&
    typeof item.title === 'string' && typeof item.url === 'string',
  );
  return { draft, sources, error };
}

export async function getOnboardingGuidance(action: 'starter_service_menu' | 'profile_review', source: string) {
  if (!supabase) return { draft: null, error: new Error('Supabase is not configured.') };
  const { data, error } = await supabase.functions.invoke('ai-assist', { body: { action, source } });
  const draft = data && typeof data === 'object' && 'draft' in data && typeof data.draft === 'string' ? data.draft : null;
  return { draft, error };
}
