import { supabase } from './supabase';

async function getAiFunctionError(error: unknown) {
  if (error && typeof error === 'object' && 'context' in error && error.context instanceof Response) {
    try {
      const payload = await error.context.clone().json();
      if (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string') {
        return new Error(payload.error);
      }
    } catch {
      // Fall through to the SDK error message.
    }
  }
  return error instanceof Error ? error : null;
}

export async function draftFreelancerBio(source: string) {
  if (!supabase) return { draft: null, error: new Error('Supabase is not configured.') };
  const { data, error } = await supabase.functions.invoke('ai-assist', { body: { action: 'freelancer_bio', source } });
  const draft = data && typeof data === 'object' && 'draft' in data && typeof data.draft === 'string' ? data.draft : null;
  return { draft, error: await getAiFunctionError(error) };
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
  return { draft, sources, error: await getAiFunctionError(error) };
}

export async function getOnboardingGuidance(action: 'starter_service_menu' | 'profile_review', source: string) {
  if (!supabase) return { draft: null, error: new Error('Supabase is not configured.') };
  const { data, error } = await supabase.functions.invoke('ai-assist', { body: { action, source } });
  const draft = data && typeof data === 'object' && 'draft' in data && typeof data.draft === 'string' ? data.draft : null;
  return { draft, error: await getAiFunctionError(error) };
}

export async function askSupportAssistant(question: string) {
  if (!supabase) return { answer: null, error: new Error('Supabase is not configured.') };
  const { data, error } = await supabase.functions.invoke('ai-assist', { body: { action: 'support_chat', source: question } });
  const answer = data && typeof data === 'object' && 'draft' in data && typeof data.draft === 'string' ? data.draft : null;
  return { answer, error: await getAiFunctionError(error) };
}
