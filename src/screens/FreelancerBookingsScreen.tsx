import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { theme } from '../constants/theme';
import { getFreelancerBookings, updateBookingStatus, type Booking } from '../lib/bookings';
import { getFreelancerProfile } from '../lib/profile';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'FreelancerBookings'>;

const previewBookings: Booking[] = [
  {
    id: 'preview-1',
    customer_id: 'preview-customer-1',
    freelancer_id: 'preview-freelancer',
    freelancer_service_id: 'preview-service-1',
    scheduled_date: '2026-09-12',
    start_time: '10:00',
    end_time: '11:00',
    service_name: 'Lash Lift',
    price: 120,
    duration_minutes: 60,
    customer_note: 'Please bring a natural brown tint if available.',
    status: 'pending',
    created_at: '2026-09-01T08:00:00Z',
  },
  {
    id: 'preview-2',
    customer_id: 'preview-customer-2',
    freelancer_id: 'preview-freelancer',
    freelancer_service_id: 'preview-service-2',
    scheduled_date: '2026-09-14',
    start_time: '14:00',
    end_time: '15:00',
    service_name: 'Lash Tint',
    price: 80,
    duration_minutes: 60,
    customer_note: '',
    status: 'confirmed',
    created_at: '2026-09-01T08:15:00Z',
  },
];

const statusLabels: Record<Booking['status'], string> = {
  pending: 'PENDING',
  confirmed: 'CONFIRMED',
  cancelled: 'CANCELLED',
  completed: 'COMPLETED',
};

export function FreelancerBookingsScreen({ navigation, route }: Props) {
  const isPreview = route.params?.preview ?? false;
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [updatingBookingId, setUpdatingBookingId] = useState('');

  useEffect(() => {
    if (isPreview) {
      setBookings(previewBookings);
      setIsLoading(false);
      return;
    }
    if (!supabase) {
      setError('Connect Supabase before loading bookings.');
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        navigation.replace('Welcome');
        return;
      }
      const profileResult = await getFreelancerProfile(data.user.id);
      if (!isMounted) {
        return;
      }
      if (profileResult.error) {
        setError(profileResult.error.message);
        setIsLoading(false);
        return;
      }
      if (!profileResult.profile || !profileResult.profile.onboarding_completed) {
        navigation.replace('FreelancerOnboarding');
        return;
      }
      const result = await getFreelancerBookings(data.user.id);
      if (!isMounted) {
        return;
      }
      if (result.error) {
        setError(result.error.message);
      } else {
        setBookings(result.bookings);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [isPreview, navigation]);

  const handleStatusChange = async (bookingId: string, action: 'confirm_booking' | 'reject_booking') => {
    setError('');
    if (!supabase) {
      setError('Connect Supabase before updating bookings.');
      return;
    }
    setUpdatingBookingId(bookingId);
    const result = await updateBookingStatus(bookingId, action);
    setUpdatingBookingId('');
    if (result.error || !result.booking) {
      setError(result.error?.message ?? 'Unable to update this booking.');
      return;
    }
    setBookings((current) => current.map((booking) => (booking.id === bookingId ? result.booking! : booking)));
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading booking requests…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>{isPreview ? 'BOOKING INBOX PREVIEW' : 'BOOKING INBOX'}</Text>
      <Text style={styles.title}>Manage your appointments</Text>
      <Text style={styles.subtitle}>
        {isPreview
          ? 'Review how booking requests and confirmed appointments will appear.'
          : 'Review new requests and keep your schedule up to date.'}
      </Text>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
      {bookings.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No bookings yet</Text>
          <Text style={styles.emptyBody}>New customer requests will appear here.</Text>
        </View>
      ) : (
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
            {!isPreview && booking.status === 'pending' && (
              <View style={styles.actions}>
                <Pressable
                  style={styles.primaryButton}
                  disabled={updatingBookingId === booking.id}
                  onPress={() => void handleStatusChange(booking.id, 'confirm_booking')}
                >
                  <Text style={styles.primaryButtonText}>
                    {updatingBookingId === booking.id ? 'Updating…' : 'Accept request'}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.secondaryButton}
                  disabled={updatingBookingId === booking.id}
                  onPress={() => void handleStatusChange(booking.id, 'reject_booking')}
                >
                  <Text style={styles.secondaryButtonText}>Reject</Text>
                </Pressable>
              </View>
            )}
          </View>
        ))
      )}
      <Pressable style={styles.secondaryButton} onPress={() => navigation.goBack()}>
        <Text style={styles.secondaryButtonText}>{isPreview ? 'Back to freelancer preview' : 'Back to dashboard'}</Text>
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
  emptyCard: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 24,
    padding: 20,
  },
  emptyTitle: { color: theme.colors.ink, fontSize: 18, fontWeight: '800' },
  emptyBody: { color: theme.colors.muted, marginTop: 6 },
  actions: { gap: 10, marginTop: 18 },
  primaryButton: { backgroundColor: theme.colors.ink, borderRadius: 14, padding: 15 },
  primaryButtonText: { color: theme.colors.white, fontWeight: '700', textAlign: 'center' },
  secondaryButton: { borderColor: theme.colors.border, borderRadius: 14, borderWidth: 1, marginTop: 12, padding: 15 },
  secondaryButtonText: { color: theme.colors.accent, fontWeight: '700', textAlign: 'center' },
});
