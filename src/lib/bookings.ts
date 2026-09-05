import type { FreelancerProfile } from './profile';
import type { Service } from './serviceCatalog';
import { supabase } from './supabase';

export type MarketplaceService = {
  id: string;
  freelancer_id: string;
  service_id: string;
  description: string;
  duration_minutes: number;
  price: number;
  service: Service;
  freelancer: Pick<FreelancerProfile, 'id' | 'display_name' | 'service_area' | 'travel_fee'>;
};

export type Booking = {
  id: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  service_name: string;
  price: number;
  duration_minutes: number;
  customer_note: string;
  status: string;
};

export async function getMarketplaceServices() {
  if (!supabase) {
    return { services: [], error: new Error('Supabase is not configured.') };
  }

  const { data, error } = await supabase
    .from('freelancer_services')
    .select(
      'id, freelancer_id, service_id, description, duration_minutes, price, service:services(id, name, description, duration_minutes, base_price)',
    )
    .eq('active', true)
    .order('created_at');

  if (error || !data) {
    return { services: [], error };
  }

  const serviceRows = data as Array<Omit<MarketplaceService, 'freelancer'> & { service: Service[] }>;
  const freelancerIds = [...new Set(serviceRows.map((service) => service.freelancer_id))];
  if (!freelancerIds.length) {
    return { services: [], error: null };
  }
  const profileResult = await supabase
    .from('freelancer_profiles')
    .select('id, display_name, service_area, travel_fee')
    .in('id', freelancerIds);

  if (profileResult.error) {
    return { services: [], error: profileResult.error };
  }

  const profiles = profileResult.data as MarketplaceService['freelancer'][];
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
  const services = serviceRows
    .map((service) => {
      const freelancer = profilesById.get(service.freelancer_id);
      const catalogService = service.service[0];
      return freelancer && catalogService ? { ...service, service: catalogService, freelancer } : null;
    })
    .filter((service): service is MarketplaceService => service !== null);

  return { services, error: null };
}

export async function createBooking(
  serviceId: string,
  values: { scheduled_date: string; start_time: string; end_time: string; customer_note: string },
) {
  if (!supabase) {
    return { booking: null, error: new Error('Supabase is not configured.') };
  }

  const { data, error } = await supabase.rpc('create_booking', {
    p_freelancer_service_id: serviceId,
    p_scheduled_date: values.scheduled_date,
    p_start_time: values.start_time,
    p_end_time: values.end_time,
    p_customer_note: values.customer_note,
  });

  return { booking: data as Booking | null, error };
}
