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
  customer_id: string;
  freelancer_id: string;
  freelancer_service_id: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  service_name: string;
  price: number;
  duration_minutes: number;
  customer_note: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
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

  const serviceRows = data as Array<Omit<MarketplaceService, 'freelancer'> & { service: Service | Service[] | null }>;
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
      const catalogService = Array.isArray(service.service) ? service.service[0] : service.service;
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

export async function getFreelancerBookings(userId: string) {
  if (!supabase) {
    return { bookings: [], error: new Error('Supabase is not configured.') };
  }

  const { data, error } = await supabase
    .from('bookings')
    .select(
      'id, customer_id, freelancer_id, freelancer_service_id, scheduled_date, start_time, end_time, service_name, price, duration_minutes, customer_note, status, created_at',
    )
    .eq('freelancer_id', userId)
    .order('scheduled_date', { ascending: true })
    .order('start_time', { ascending: true });

  return { bookings: (data ?? []) as Booking[], error };
}

export async function getCustomerBookings(userId: string) {
  if (!supabase) {
    return { bookings: [], error: new Error('Supabase is not configured.') };
  }

  const { data, error } = await supabase
    .from('bookings')
    .select(
      'id, customer_id, freelancer_id, freelancer_service_id, scheduled_date, start_time, end_time, service_name, price, duration_minutes, customer_note, status, created_at',
    )
    .eq('customer_id', userId)
    .order('scheduled_date', { ascending: false })
    .order('start_time', { ascending: false });

  return { bookings: (data ?? []) as Booking[], error };
}

export async function getAdminBookings() {
  if (!supabase) {
    return { bookings: [], error: new Error('Supabase is not configured.') };
  }

  const pageSize = 1000;
  const bookings: Booking[] = [];
  let pageStart = 0;

  while (true) {
    const { data, error } = await supabase
      .from('bookings')
      .select(
        'id, customer_id, freelancer_id, freelancer_service_id, scheduled_date, start_time, end_time, service_name, price, duration_minutes, customer_note, status, created_at',
      )
      .order('scheduled_date', { ascending: true })
      .order('start_time', { ascending: true })
      .order('id', { ascending: true })
      .range(pageStart, pageStart + pageSize - 1);

    if (error) {
      return { bookings: [], error };
    }

    const page = (data ?? []) as Booking[];
    bookings.push(...page);
    if (page.length < pageSize) {
      return { bookings, error: null };
    }
    pageStart += pageSize;
  }
}

export async function cancelBooking(bookingId: string) {
  if (!supabase) {
    return { booking: null, error: new Error('Supabase is not configured.') };
  }

  const { data, error } = await supabase.rpc('cancel_booking', { p_booking_id: bookingId });
  return { booking: data as Booking | null, error };
}

export async function updateBookingStatus(bookingId: string, action: 'confirm_booking' | 'reject_booking') {
  if (!supabase) {
    return { booking: null, error: new Error('Supabase is not configured.') };
  }

  const { data, error } = await supabase.rpc(action, { p_booking_id: bookingId });
  return { booking: data as Booking | null, error };
}
