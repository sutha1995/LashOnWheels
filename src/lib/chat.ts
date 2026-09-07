import { supabase } from './supabase';

export type BookingMessage = {
  id: string;
  booking_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

const contactSharingPatterns = [
  /whatsapp/i,
  /\bwa\.me\b/i,
  /\bcall\s+me\b/i,
  /\btext\s+me\b/i,
  /\bcontact\s+me\b/i,
  /\bmessage\s+me\b/i,
  /\bmy\s+(?:phone|number)\b/i,
];
const formattedPhonePattern =
  /(?:\+\d[\d\s().-]{6,}\d|\(\d{3}\)[\s.-]?\d{3}[\s.-]?\d{4}|\b\d{3}[\s.-]\d{3}[\s.-]\d{4}\b|\b\d{3}[\s.-]\d{4}\b)/;
const contextualPhonePattern = /\b(?:phone|number|call|text|whatsapp|wa)\D{0,12}\d{7,15}\b/i;

export function getBookingMessageValidationError(body: string) {
  const normalizedBody = body.trim();
  if (!normalizedBody) {
    return 'Write a message before sending.';
  }
  if (
    formattedPhonePattern.test(normalizedBody) ||
    contextualPhonePattern.test(normalizedBody) ||
    contactSharingPatterns.some((pattern) => pattern.test(normalizedBody))
  ) {
    return 'For safety, phone numbers and WhatsApp contact details must stay out of booking chat.';
  }
  return null;
}

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
  const validationError = getBookingMessageValidationError(body);
  if (validationError) {
    return { message: null, error: new Error(validationError) };
  }

  const { data, error } = await supabase
    .from('booking_messages')
    .insert({ booking_id: bookingId, body })
    .select('id, booking_id, sender_id, body, created_at')
    .single();

  return { message: data as BookingMessage | null, error };
}
