import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { theme } from '../constants/theme';
import { cancelBooking, getCustomerBookings, type Booking } from '../lib/bookings';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'CustomerBookings'>;

const previewBookings: Booking[] = [
  {
    id: 'preview-customer-booking-1',
    customer_id: 'preview-customer',
    freelancer_id: 'preview-freelancer-1',
    freelancer_service_id: 'preview-service-1',
    scheduled_date: '2026-09-18',
    start_time: '10:00',
    end_time: '11:00',
    service_name: 'Lash Lift',
    price: 120,
    duration_minutes: 60,
    customer_note: 'Please bring a natural brown tint if available.',
    status: 'confirmed',
    created_at: '2026-09-01T08:00:00Z',
  },
  {
    id: 'preview-customer-booking-2',
    customer_id: 'preview-customer',
    freelancer_id: 'preview-freelancer-2',
    freelancer_service_id: 'preview-service-2',
    scheduled_date: '2026-08-22',
    start_time: '14:00',
    end_time: '15:00',
    service_name: 'Classic Extensions',
    price: 180,
    duration_minutes: 60,
    customer_note: '',
    status: 'completed',
    created_at: '2026-08-10T08:15:00Z',
  },
];

const statusLabels: Record<Booking['status'], string> = {
  pending: 'PENDING',
  confirmed: 'CONFIRMED',
  cancelled: 'CANCELLED',
  completed: 'COMPLETED',
};

export function CustomerBookingsScreen({ navigation, route }: Props) {
  const isPreview = route.params?.preview ?? false;
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingBookingId, setCancellingBookingId] = useState('');

  useEffect(() => {
    let isMounted = true;
    const loadBookings = async () => {
      if (isPreview) {
        setBookings(previewBookings);
        setLoadError('');
        setActionError('');
        setIsLoading(false);
        return;
      }
      if (!supabase) {
        setLoadError('Connect Supabase before loading bookings.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError('');
      const { data } = await supabase.auth.getUser();
      if (!isMounted) {
        return;
      }
      if (!data.user) {
        navigation.replace('Welcome');
        return;
      }
      const result = await getCustomerBookings(data.user.id);
      if (!isMounted) {
        return;
      }
      if (result.error) {
        setLoadError(result.error.message);
        setBookings([]);
      } else {
        setLoadError('');
        setBookings(result.bookings);
      }
      setIsLoading(false);
    };

    void loadBookings();
    const unsubscribe = navigation.addListener('focus', () => {
      if (!isPreview) {
        void loadBookings();
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [isPreview, navigation]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your bookings…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>{isPreview ? 'BOOKING HISTORY PREVIEW' : 'MY BOOKINGS'}</Text>
      <Text style={styles.title}>Track your appointments</Text>
      <Text style={styles.subtitle}>
        {isPreview
          ? 'Review how pending, confirmed, and completed appointments will appear.'
          : 'See the latest status and details for every booking you have requested.'}
      </Text>
      {!!loadError && <Text style={styles.errorText}>{loadError}</Text>}
      {!!actionError && <Text style={styles.errorText}>{actionError}</Text>}
      {!loadError && bookings.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No bookings yet</Text>
          <Text style={styles.emptyBody}>Your requested appointments will appear here.</Text>
        </View>
      ) : !loadError ? (
        bookings.map((booking) => (
          <View key={booking.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleBlock}>
                <Text style={styles.cardTitle}>{booking.service_name}</Text>
                <Text style={styles.cardDate}>
                  {booking.scheduled_date} · {booking.start_time}–{booking.end_time}
                </Text>
              </View>
              <Text style={[styles.status, styles[`status_${booking.status}`]]}>{statusLabels[booking.status]}</Text>
            </View>
            <Text style={styles.price}>RM{booking.price.toFixed(2)}</Text>
            <Text style={styles.meta}>{booking.duration_minutes} minutes</Text>
            {!!booking.customer_note && <Text style={styles.note}>“{booking.customer_note}”</Text>}
            {!isPreview && (booking.status === 'pending' || booking.status === 'confirmed') && (
              <Pressable
                style={styles.cancelButton}
                disabled={cancellingBookingId !== ''}
                onPress={() => {
                  setActionError('');
                  setCancellingBookingId(booking.id);
                  void cancelBooking(booking.id).then((result) => {
                    setCancellingBookingId('');
                    if (result.error || !result.booking) {
                      setActionError(result.error?.message ?? 'Unable to cancel this booking.');
                      return;
                    }
                    setBookings((current) =>
                      current.map((currentBooking) =>
                        currentBooking.id === booking.id ? result.booking! : currentBooking,
                      ),
                    );
                  });
                }}
              >
                <Text style={styles.cancelButtonText}>
                  {cancellingBookingId === booking.id ? 'Cancelling…' : 'Cancel booking'}
                </Text>
              </Pressable>
            )}
          </View>
        ))
      ) : null}
      <Pressable style={styles.secondaryButton} onPress={() => navigation.goBack()}>
        <Text style={styles.secondaryButtonText}>{isPreview ? 'Back to customer preview' : 'Back to dashboard'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  container: { padding: 24 },
  loadingContainer: { alignItems: 'center', backgroundColor: theme.colors.cream, flex: 1, justifyContent: 'center' },
  loadingText: { color: theme.colors.muted, fontSize: 16 },
  eyebrow: { color: theme.colors.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginTop: 16 },
  title: { color: theme.colors.ink, fontSize: 32, fontWeight: '800', lineHeight: 38, marginTop: 12 },
  subtitle: { color: theme.colors.muted, fontSize: 16, lineHeight: 24, marginTop: 10 },
  errorText: { color: '#B42318', fontSize: 13, marginTop: 16 },
  card: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 18,
    padding: 18,
  },
  cardHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  cardTitleBlock: { flex: 1 },
  cardTitle: { color: theme.colors.ink, fontSize: 18, fontWeight: '800' },
  cardDate: { color: theme.colors.muted, marginTop: 6 },
  status: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  status_pending: { color: theme.colors.accent },
  status_confirmed: { color: '#067647' },
  status_cancelled: { color: '#B42318' },
  status_completed: { color: theme.colors.muted },
  price: { color: theme.colors.ink, fontSize: 20, fontWeight: '800', marginTop: 18 },
  meta: { color: theme.colors.muted, marginTop: 4 },
  note: { color: theme.colors.muted, fontStyle: 'italic', lineHeight: 20, marginTop: 14 },
  cancelButton: { borderColor: '#F1B5B0', borderRadius: 10, borderWidth: 1, marginTop: 16, padding: 12 },
  cancelButtonText: { color: '#B42318', fontWeight: '700', textAlign: 'center' },
  emptyCard: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 18,
    padding: 20,
  },
  emptyTitle: { color: theme.colors.ink, fontSize: 18, fontWeight: '800' },
  emptyBody: { color: theme.colors.muted, lineHeight: 20, marginTop: 6 },
  secondaryButton: { borderColor: theme.colors.border, borderRadius: 14, borderWidth: 1, marginTop: 24, padding: 15 },
  secondaryButtonText: { color: theme.colors.accent, fontWeight: '700', textAlign: 'center' },
});
