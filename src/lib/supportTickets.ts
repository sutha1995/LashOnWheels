import { supabase } from './supabase';

export type SupportTicketMessage = { sender: 'assistant' | 'user'; text: string };

export async function createSupportTicket(message: string, conversation: SupportTicketMessage[]) {
  if (!supabase) return { ticketId: null, error: new Error('Supabase is not configured.') };
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ticketId: null, error: new Error('Your session has expired. Please sign in again.') };

  const { data, error } = await supabase
    .from('support_tickets')
    .insert({ user_id: auth.user.id, message: message.trim().slice(0, 3000), conversation: conversation.slice(-12) })
    .select('id')
    .single();
  const ticketId = data && typeof data === 'object' && 'id' in data && typeof data.id === 'string' ? data.id : null;
  return { ticketId, error };
}
