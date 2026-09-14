import { supabase } from './supabase';

export type FreelancerOnboardingDraft = {
  displayName: string;
  bio: string;
  experienceYears: string;
  serviceArea: string;
  maxTravelDistance: string;
  travelFee: string;
  profilePhotoUrl: string | null;
  baseCoordinates: { latitude: number; longitude: number } | null;
};

type DraftRow = { payload: FreelancerOnboardingDraft };

export async function getFreelancerOnboardingDraft(userId: string) {
  if (!supabase) {
    return { draft: null, error: new Error('Supabase is not configured.') };
  }

  const { data, error } = await supabase
    .from('freelancer_onboarding_drafts')
    .select('payload')
    .eq('user_id', userId)
    .maybeSingle();

  return { draft: (data as DraftRow | null)?.payload ?? null, error };
}

export async function saveFreelancerOnboardingDraft(userId: string, draft: FreelancerOnboardingDraft) {
  if (!supabase) {
    return { error: new Error('Supabase is not configured.') };
  }

  const { error } = await supabase
    .from('freelancer_onboarding_drafts')
    .upsert({ user_id: userId, payload: draft }, { onConflict: 'user_id' });

  return { error };
}

export async function clearFreelancerOnboardingDraft(userId: string) {
  if (!supabase) {
    return { error: new Error('Supabase is not configured.') };
  }

  const { error } = await supabase.from('freelancer_onboarding_drafts').delete().eq('user_id', userId);
  return { error };
}
