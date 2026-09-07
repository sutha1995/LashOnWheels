import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { theme } from '../constants/theme';
import { getNotifications, markNotificationRead, type Notification } from '../lib/notifications';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

const previewNotifications: Notification[] = [
  {
    id: 'preview-notification-1',
    recipient_id: 'preview-user',
    booking_id: 'preview-booking-1',
    notification_type: 'booking_status_changed',
    title: 'Booking status updated',
    body: 'Lash Lift is now CONFIRMED.',
    read_at: null,
    created_at: '2026-09-17T08:00:00Z',
  },
  {
    id: 'preview-notification-2',
    recipient_id: 'preview-user',
    booking_id: 'preview-booking-2',
    notification_type: 'booking_created',
    title: 'New booking activity',
    body: 'A customer requested Classic Extensions on 2026-09-22.',
    read_at: '2026-09-16T08:00:00Z',
    created_at: '2026-09-16T08:00:00Z',
  },
];

function formatCreatedAt(createdAt: string) {
  return new Date(createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export function NotificationsScreen({ navigation, route }: Props) {
  const isPreview = route.params?.preview ?? false;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadNotifications = async () => {
      if (isPreview) {
        setNotifications(previewNotifications);
        setIsLoading(false);
        return;
      }
      if (!supabase) {
        setLoadError('Connect Supabase before loading notifications.');
        setIsLoading(false);
        return;
      }

      const { data } = await supabase.auth.getUser();
      if (!isMounted) {
        return;
      }
      if (!data.user) {
        navigation.replace('Welcome');
        return;
      }

      setLoadError('');
      setIsLoading(true);
      const result = await getNotifications(data.user.id);
      if (!isMounted) {
        return;
      }
      if (result.error) {
        setLoadError(result.error.message);
        setNotifications([]);
      } else {
        setNotifications(result.notifications);
      }
      setIsLoading(false);
    };

    void loadNotifications();
    const unsubscribe = navigation.addListener('focus', () => {
      if (!isPreview) {
        void loadNotifications();
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [isPreview, navigation]);

  const markAsRead = async (notification: Notification) => {
    if (isPreview || notification.read_at) {
      return;
    }

    setActionError('');
    const result = await markNotificationRead(notification.id);
    if (result.error || !result.notification) {
      setActionError(result.error?.message ?? 'Unable to mark notification as read.');
      return;
    }
    setNotifications((current) => current.map((item) => (item.id === notification.id ? result.notification! : item)));
  };

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>{isPreview ? 'NOTIFICATIONS PREVIEW' : 'NOTIFICATIONS'}</Text>
      <Text style={styles.title}>Stay up to date</Text>
      <Text style={styles.subtitle}>
        {isPreview
          ? 'See the booking updates customers, freelancers, and admins receive.'
          : 'Booking and payment updates will appear here.'}
      </Text>
      {!!loadError && <Text style={styles.errorText}>{loadError}</Text>}
      {!!actionError && <Text style={styles.errorText}>{actionError}</Text>}
      {!isLoading && !loadError && notifications.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>You are all caught up</Text>
          <Text style={styles.emptyBody}>New booking activity will appear here.</Text>
        </View>
      )}
      {isLoading ? (
        <Text style={styles.loadingText}>Loading notifications…</Text>
      ) : (
        notifications.map((notification) => (
          <Pressable
            key={notification.id}
            style={[styles.card, !notification.read_at && styles.unreadCard]}
            onPress={() => void markAsRead(notification)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{notification.title}</Text>
              {!notification.read_at && <Text style={styles.unreadLabel}>NEW</Text>}
            </View>
            <Text style={styles.cardBody}>{notification.body}</Text>
            <Text style={styles.cardDate}>{formatCreatedAt(notification.created_at)}</Text>
          </Pressable>
        ))
      )}
      <Pressable style={styles.secondaryButton} onPress={() => navigation.goBack()}>
        <Text style={styles.secondaryButtonText}>{isPreview ? 'Back to preview' : 'Back to dashboard'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  container: { padding: 24 },
  eyebrow: { color: theme.colors.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginTop: 16 },
  title: { color: theme.colors.ink, fontSize: 32, fontWeight: '800', lineHeight: 38, marginTop: 12 },
  subtitle: { color: theme.colors.muted, fontSize: 16, lineHeight: 24, marginTop: 10 },
  loadingText: { color: theme.colors.muted, marginTop: 24 },
  errorText: { color: '#B42318', fontSize: 13, marginTop: 16 },
  emptyCard: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 24,
    padding: 18,
  },
  emptyTitle: { color: theme.colors.ink, fontSize: 18, fontWeight: '800' },
  emptyBody: { color: theme.colors.muted, marginTop: 6 },
  card: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 18,
    padding: 18,
  },
  unreadCard: { borderColor: theme.colors.accent },
  cardHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  cardTitle: { color: theme.colors.ink, flex: 1, fontSize: 18, fontWeight: '800' },
  unreadLabel: { color: theme.colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  cardBody: { color: theme.colors.muted, lineHeight: 21, marginTop: 8 },
  cardDate: { color: theme.colors.muted, fontSize: 12, marginTop: 14 },
  secondaryButton: { borderColor: theme.colors.border, borderRadius: 14, borderWidth: 1, marginTop: 24, padding: 15 },
  secondaryButtonText: { color: theme.colors.accent, fontWeight: '700', textAlign: 'center' },
});
