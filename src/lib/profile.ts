import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type UserRole = 'customer' | 'freelancer' | 'admin';

export type Profile = {
  id: string;
  full_name: string;
  role: UserRole;
};

export async function saveProfile(user: User, fullName: string, role: Exclude<UserRole, 'admin'>) {
  if (!supabase) {
    return { profile: null, error: new Error('Supabase is not configured.') };
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, full_name: fullName.trim(), role }, { onConflict: 'id' })
    .select('id, full_name, role')
    .single();

  return { profile: data as Profile | null, error };
}

export async function getProfile(userId: string) {
  if (!supabase) {
    return { profile: null, error: new Error('Supabase is not configured.') };
  }

  const { data, error } = await supabase.from('profiles').select('id, full_name, role').eq('id', userId).single();
  return { profile: data as Profile | null, error };
}

export async function ensureProfile(user: User) {
  const { profile, error } = await getProfile(user.id);
  const isMissingProfile = error && 'code' in error && error.code === 'PGRST116';
  if (profile || !isMissingProfile) {
    return { profile, error };
  }

  const metadataRole = user.user_metadata.role;
  const role: Exclude<UserRole, 'admin'> = metadataRole === 'freelancer' ? 'freelancer' : 'customer';
  const fullName = typeof user.user_metadata.full_name === 'string' ? user.user_metadata.full_name : '';
  return saveProfile(user, fullName, role);
}
