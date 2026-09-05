import { supabase } from './supabase';

export type FreelancerAvailability = {
  id: string;
  day_of_week: number;
  is_available: boolean;
  start_time: string;
  end_time: string;
};

export async function getFreelancerAvailability(userId: string) {
  if (!supabase) {
    return { availability: [], error: new Error('Supabase is not configured.') };
  }

  const { data, error } = await supabase
    .from('freelancer_availability')
    .select('id, day_of_week, is_available, start_time, end_time')
    .eq('freelancer_id', userId)
    .order('day_of_week');

  return { availability: data as FreelancerAvailability[], error };
}

export async function saveFreelancerAvailability(
  userId: string,
  dayOfWeek: number,
  values: { is_available: boolean; start_time: string; end_time: string },
) {
  if (!supabase) {
    return { availability: null, error: new Error('Supabase is not configured.') };
  }

  const { data, error } = await supabase
    .from('freelancer_availability')
    .upsert(
      {
        freelancer_id: userId,
        day_of_week: dayOfWeek,
        ...values,
      },
      { onConflict: 'freelancer_id,day_of_week' },
    )
    .select('id, day_of_week, is_available, start_time, end_time')
    .single();

  return { availability: data as FreelancerAvailability | null, error };
}
