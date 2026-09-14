import { supabase } from './supabase';
import type { VerificationDocument } from './verificationDocuments';

export type AdminAccount = {
  id: string;
  full_name: string;
  phone: string | null;
  requested_role: 'customer' | 'freelancer' | 'admin';
  suspended_at: string | null;
  verification_status: 'pending' | 'approved' | 'rejected' | null;
  onboarding_completed: boolean;
};

export type AdminMetrics = { users_count: number; freelancers_pending: number; bookings_count: number; gross_booking_value: number };
export type AdminService = { id: string; name: string; active: boolean; base_price: number; duration_minutes: number };

function unavailable() { return new Error('Supabase is not configured.'); }

export async function getAdminAccounts() {
  if (!supabase) return { accounts: [] as AdminAccount[], error: unavailable() };
  const { data, error } = await supabase.rpc('admin_list_accounts');
  return { accounts: (data ?? []) as AdminAccount[], error };
}

export async function getAdminMetrics() {
  if (!supabase) return { metrics: null as AdminMetrics | null, error: unavailable() };
  const { data, error } = await supabase.rpc('admin_platform_metrics');
  return { metrics: (data?.[0] ?? null) as AdminMetrics | null, error };
}

export async function getAdminServices() {
  if (!supabase) return { services: [] as AdminService[], error: unavailable() };
  const { data, error } = await supabase.rpc('admin_list_services');
  return { services: (data ?? []) as AdminService[], error };
}

export async function setFreelancerVerification(id: string, status: 'pending' | 'approved' | 'rejected') {
  if (!supabase) return { error: unavailable() };
  return supabase.rpc('admin_set_freelancer_verification', { p_freelancer_id: id, p_status: status });
}

export async function setAccountSuspension(id: string, suspended: boolean) {
  if (!supabase) return { error: unavailable() };
  return supabase.rpc('admin_set_account_suspension', { p_user_id: id, p_suspend: suspended });
}

export async function setServiceActive(id: string, active: boolean) {
  if (!supabase) return { error: unavailable() };
  return supabase.rpc('admin_set_service_active', { p_service_id: id, p_active: active });
}

export async function getAdminVerificationDocuments(freelancerId: string) {
  if (!supabase) return { documents: [] as VerificationDocument[], error: unavailable() };
  const { data, error } = await supabase
    .from('freelancer_verification_documents')
    .select('id, freelancer_id, document_type, storage_path, file_name, mime_type, created_at')
    .eq('freelancer_id', freelancerId);
  return { documents: (data ?? []) as VerificationDocument[], error };
}
