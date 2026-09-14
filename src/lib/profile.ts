import type { User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export type UserRole = 'customer' | 'freelancer' | 'admin';
export type SignupRole = Exclude<UserRole, 'admin'>;
const pendingRoleKey = 'lash-on-wheels.pending-role';
const pendingTermsKey = 'lash-on-wheels.pending-terms';
const pendingRoleLifetimeMs = 15 * 60 * 1000;

export type Profile = {
  id: string;
  full_name: string;
  role: UserRole;
  requested_role: SignupRole;
  phone: string | null;
  terms_accepted_at: string | null;
  terms_version: string | null;
};

export type FreelancerProfile = {
  id: string;
  display_name: string;
  bio: string;
  experience_years: number;
  service_area: string;
  max_travel_distance_km: number;
  travel_fee: number;
  profile_photo_url: string | null;
  onboarding_completed: boolean;
  verification_status: 'pending' | 'approved' | 'rejected';
  base_latitude: number | null;
  base_longitude: number | null;
};

export async function saveProfile(user: User, fullName: string, phone: string, requestedRole: SignupRole) {
  if (!supabase) {
    return { profile: null, error: new Error('Supabase is not configured.') };
  }

  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: user.id, full_name: fullName.trim(), phone: phone.trim() || null, role: 'customer', requested_role: requestedRole })
    .select('id, full_name, role, requested_role, phone, terms_accepted_at, terms_version')
    .single();

  return { profile: data as Profile | null, error };
}

export async function requestFreelancerAccess() {
  if (!supabase) {
    return { profile: null, error: new Error('Supabase is not configured.') };
  }
  const { data, error } = await supabase.rpc('request_freelancer_access');
  return { profile: data as Profile | null, error };
}

export async function getProfile(userId: string) {
  if (!supabase) {
    return { profile: null, error: new Error('Supabase is not configured.') };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, requested_role, phone, terms_accepted_at, terms_version')
    .eq('id', userId)
    .single();
  return { profile: data as Profile | null, error };
}

export async function getFreelancerProfile(userId: string) {
  if (!supabase) {
    return { profile: null, error: new Error('Supabase is not configured.') };
  }

  const { data, error } = await supabase
    .from('freelancer_profiles')
    .select(
      'id, display_name, bio, experience_years, service_area, max_travel_distance_km, travel_fee, profile_photo_url, onboarding_completed, verification_status, base_latitude, base_longitude',
    )
    .eq('id', userId)
    .maybeSingle();

  return { profile: data as FreelancerProfile | null, error };
}

export type FreelancerProfileValues = Omit<
  FreelancerProfile,
  'id' | 'onboarding_completed' | 'profile_photo_url' | 'verification_status' | 'base_latitude' | 'base_longitude'
> & {
  profile_photo_url?: string | null;
  base_latitude?: number | null;
  base_longitude?: number | null;
};

export async function saveFreelancerProfile(userId: string, values: FreelancerProfileValues) {
  if (!supabase) {
    return { profile: null, error: new Error('Supabase is not configured.') };
  }

  const { data, error } = await supabase
    .from('freelancer_profiles')
    .upsert({ id: userId, ...values, onboarding_completed: true })
    .select(
      'id, display_name, bio, experience_years, service_area, max_travel_distance_km, travel_fee, profile_photo_url, onboarding_completed, verification_status, base_latitude, base_longitude',
    )
    .single();

  return { profile: data as FreelancerProfile | null, error };
}

export async function ensureProfile(user: User) {
  const { profile, error } = await getProfile(user.id);
  const isMissingProfile = error && 'code' in error && error.code === 'PGRST116';
  if (profile) {
    if (await hasPendingTermsAcceptance()) await acceptTerms(user.id);
    await clearPendingSignupRole();
    return { profile, error };
  }
  if (!isMissingProfile) {
    return { profile, error };
  }

  const metadataRole = user.user_metadata.role;
  const metadataRequestedRole: SignupRole = metadataRole === 'freelancer' ? 'freelancer' : 'customer';
  const pendingRole = await getPendingSignupRole();
  const requestedRole = pendingRole ?? metadataRequestedRole;
  const fullName = typeof user.user_metadata.full_name === 'string' ? user.user_metadata.full_name : '';
  const phone = typeof user.user_metadata.phone === 'string' ? user.user_metadata.phone : '';
  const result = await saveProfile(user, fullName, phone, requestedRole);
  if (!result.error && await hasPendingTermsAcceptance()) await acceptTerms(user.id);
  if (!result.error) {
    await clearPendingSignupRole();
  }
  return result;
}

export async function setPendingSignupRole(role: SignupRole) {
  await AsyncStorage.setItem(pendingRoleKey, JSON.stringify({ role, createdAt: Date.now() }));
}

export async function clearPendingSignupRole() {
  try {
    await AsyncStorage.removeItem(pendingRoleKey);
  } catch {
    return;
  }
}

export async function setPendingTermsAcceptance() { await AsyncStorage.setItem(pendingTermsKey, 'accepted'); }

async function hasPendingTermsAcceptance() { return (await AsyncStorage.getItem(pendingTermsKey)) === 'accepted'; }

export async function acceptTerms(userId: string) {
  if (!supabase) return { error: new Error('Supabase is not configured.') };
  const { error } = await supabase.from('profiles').update({ terms_accepted_at: new Date().toISOString(), terms_version: '2026-10-14' }).eq('id', userId);
  if (!error) await AsyncStorage.removeItem(pendingTermsKey);
  return { error };
}

async function getPendingSignupRole(): Promise<SignupRole | null> {
  const pendingRoleValue = await AsyncStorage.getItem(pendingRoleKey);
  if (!pendingRoleValue) {
    return null;
  }

  try {
    const pendingRole = JSON.parse(pendingRoleValue) as { createdAt?: unknown; role?: unknown };
    if (
      typeof pendingRole.createdAt !== 'number' ||
      pendingRole.createdAt > Date.now() ||
      Date.now() - pendingRole.createdAt > pendingRoleLifetimeMs ||
      (pendingRole.role !== 'customer' && pendingRole.role !== 'freelancer')
    ) {
      await clearPendingSignupRole();
      return null;
    }
    return pendingRole.role;
  } catch {
    await clearPendingSignupRole();
    return null;
  }
}
