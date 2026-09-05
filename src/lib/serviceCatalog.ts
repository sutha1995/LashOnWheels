import { supabase } from './supabase';

export type Service = {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  base_price: number;
};

export type FreelancerService = {
  id: string;
  service_id: string;
  description: string;
  duration_minutes: number;
  price: number;
  active: boolean;
  service: Service[];
};

export async function getServiceCatalog() {
  if (!supabase) {
    return { services: [], error: new Error('Supabase is not configured.') };
  }

  const { data, error } = await supabase
    .from('services')
    .select('id, name, description, duration_minutes, base_price')
    .eq('active', true)
    .order('name');

  return { services: data as Service[], error };
}

export async function getFreelancerServices(userId: string) {
  if (!supabase) {
    return { services: [], error: new Error('Supabase is not configured.') };
  }

  const { data, error } = await supabase
    .from('freelancer_services')
    .select(
      'id, service_id, description, duration_minutes, price, active, service:services(id, name, description, duration_minutes, base_price)',
    )
    .eq('freelancer_id', userId)
    .eq('active', true)
    .order('created_at');

  return { services: data as FreelancerService[], error };
}

export async function saveFreelancerService(
  userId: string,
  serviceId: string,
  values: { description: string; duration_minutes: number; price: number },
) {
  if (!supabase) {
    return { service: null, error: new Error('Supabase is not configured.') };
  }

  const { data, error } = await supabase
    .from('freelancer_services')
    .upsert(
      {
        freelancer_id: userId,
        service_id: serviceId,
        ...values,
        active: true,
      },
      { onConflict: 'freelancer_id,service_id' },
    )
    .select(
      'id, service_id, description, duration_minutes, price, active, service:services(id, name, description, duration_minutes, base_price)',
    )
    .single();

  return { service: data as FreelancerService | null, error };
}

export async function deactivateFreelancerService(userId: string, serviceId: string) {
  if (!supabase) {
    return { error: new Error('Supabase is not configured.') };
  }

  const { error } = await supabase
    .from('freelancer_services')
    .update({ active: false })
    .eq('freelancer_id', userId)
    .eq('service_id', serviceId);

  return { error };
}
