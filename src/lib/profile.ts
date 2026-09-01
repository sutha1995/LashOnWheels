import type { User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export type UserRole = 'customer' | 'freelancer' | 'admin';
export type SignupRole = Exclude<UserRole, 'admin'>;
const pendingRoleKey = 'lash-on-wheels.pending-role';

export type Profile = {
  id: string;
  full_name: string;
  role: UserRole;
  requested_role: SignupRole;
};

export async function saveProfile(user: User, fullName: string, requestedRole: SignupRole) {
  if (!supabase) {
    return { profile: null, error: new Error('Supabase is not configured.') };
  }

  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: user.id, full_name: fullName.trim(), role: 'customer', requested_role: requestedRole })
    .select('id, full_name, role, requested_role')
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
  const metadataRequestedRole: SignupRole = metadataRole === 'freelancer' ? 'freelancer' : 'customer';
  const pendingRole = await AsyncStorage.getItem(pendingRoleKey);
  const requestedRole: SignupRole = pendingRole === 'freelancer' ? 'freelancer' : metadataRequestedRole;
  const fullName = typeof user.user_metadata.full_name === 'string' ? user.user_metadata.full_name : '';
  const result = await saveProfile(user, fullName, requestedRole);
  if (!result.error) {
    await AsyncStorage.removeItem(pendingRoleKey);
  }
  return result;
}

export async function setPendingSignupRole(role: SignupRole) {
  await AsyncStorage.setItem(pendingRoleKey, role);
}
