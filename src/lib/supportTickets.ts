import { supabase } from './supabase';

export type SupportTicketMessage = { sender: 'assistant' | 'user'; text: string };

export async function createSupportTicket(message: string, conversation: SupportTicketMessage[]) {
  if (!supabase) return { ticketId: null, error: new Error('Supabase is not configured.') };
  const { data, error } = await supabase.functions.invoke('create-support-ticket', {
    body: { message: message.trim().slice(0, 3000), conversation: conversation.slice(-12) },
  });
  const ticketId = data && typeof data === 'object' && 'ticketId' in data && typeof data.ticketId === 'string' ? data.ticketId : null;
  const emailSent = data && typeof data === 'object' && 'emailSent' in data && data.emailSent === true;
  return { ticketId, emailSent, error: await getFunctionError(error) };
}

async function getFunctionError(error: unknown) {
  if (error && typeof error === 'object' && 'context' in error && error.context instanceof Response) {
    try {
      const payload = await error.context.clone().json();
      if (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string') return new Error(payload.error);
    } catch {
      // Use the SDK error below.
    }
  }
  return error instanceof Error ? error : null;
}
