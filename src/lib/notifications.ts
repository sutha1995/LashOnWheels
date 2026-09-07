import { supabase } from './supabase';

export type Notification = {
  id: string;
  recipient_id: string;
  booking_id: string | null;
  notification_type: 'booking_created' | 'booking_status_changed' | 'payment_status_changed';
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export async function getNotifications(userId: string) {
  if (!supabase) {
    return { notifications: [], error: new Error('Supabase is not configured.') };
  }

  const { data, error } = await supabase
    .from('notifications')
    .select('id, recipient_id, booking_id, notification_type, title, body, read_at, created_at')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false });

  return { notifications: (data ?? []) as Notification[], error };
}

export async function markNotificationRead(notificationId: string) {
  if (!supabase) {
    return { notification: null, error: new Error('Supabase is not configured.') };
  }

  const { data, error } = await supabase.rpc('mark_notification_read', {
    p_notification_id: notificationId,
  });

  return { notification: data as Notification | null, error };
}
