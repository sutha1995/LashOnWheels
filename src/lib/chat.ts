import { supabase } from './supabase';

export type BookingMessage = {
  id: string;
  booking_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export async function getBookingMessages(bookingId: string) {
  if (!supabase) {
    return { messages: [], error: new Error('Supabase is not configured.') };
  }

  const { data, error } = await supabase
    .from('booking_messages')
    .select('id, booking_id, sender_id, body, created_at')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });

  return { messages: (data ?? []) as BookingMessage[], error };
}

export async function sendBookingMessage(bookingId: string, body: string) {
  if (!supabase) {
    return { message: null, error: new Error('Supabase is not configured.') };
  }

  const { data, error } = await supabase
    .from('booking_messages')
    .insert({ booking_id: bookingId, body })
    .select('id, booking_id, sender_id, body, created_at')
    .single();

  return { message: data as BookingMessage | null, error };
}
