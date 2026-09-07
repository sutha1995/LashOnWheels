import { supabase } from './supabase';

export type FreelancerLocation = {
  booking_id: string;
  freelancer_id: string;
  latitude: number;
  longitude: number;
  accuracy_meters: number | null;
  sharing_enabled: boolean;
  updated_at: string;
  expires_at?: string;
  server_now?: string;
};

export async function getFreelancerLocation(bookingId: string) {
  if (!supabase) {
    return { location: null, error: new Error('Supabase is not configured.') };
  }

  const { data, error } = await supabase.rpc('get_freelancer_location', { p_booking_id: bookingId }).maybeSingle();

  return { location: data as FreelancerLocation | null, error };
}

export async function saveFreelancerLocation(
  bookingId: string,
  freelancerId: string,
  values: Pick<FreelancerLocation, 'latitude' | 'longitude' | 'accuracy_meters' | 'sharing_enabled'>,
) {
  if (!supabase) {
    return { location: null, error: new Error('Supabase is not configured.') };
  }

  const { data, error } = await supabase
    .from('freelancer_locations')
    .upsert({ booking_id: bookingId, freelancer_id: freelancerId, ...values }, { onConflict: 'booking_id' })
    .select('booking_id, freelancer_id, latitude, longitude, accuracy_meters, sharing_enabled, updated_at')
    .single();

  return { location: data as FreelancerLocation | null, error };
}
