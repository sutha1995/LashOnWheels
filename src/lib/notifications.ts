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

export type NotificationCursor = Pick<Notification, 'created_at' | 'id'>;

const NOTIFICATION_PAGE_SIZE = 50;

export async function getNotifications(userId: string, cursor?: NotificationCursor) {
  if (!supabase) {
    return { notifications: [], nextCursor: null, error: new Error('Supabase is not configured.') };
  }

  let query = supabase
    .from('notifications')
    .select('id, recipient_id, booking_id, notification_type, title, body, read_at, created_at')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(NOTIFICATION_PAGE_SIZE);

  if (cursor) {
    query = query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
  }

  const { data, error } = await query;
  const notifications = (data ?? []) as Notification[];
  const lastNotification = notifications[notifications.length - 1];

  return {
    notifications,
    nextCursor:
      notifications.length === NOTIFICATION_PAGE_SIZE && lastNotification
        ? { created_at: lastNotification.created_at, id: lastNotification.id }
        : null,
    error,
  };
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
