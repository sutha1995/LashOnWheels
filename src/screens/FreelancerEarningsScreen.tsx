import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { theme } from '../constants/theme';
import { getFreelancerEarningsBookings, type Booking } from '../lib/bookings';
import { summarizeEarnings } from '../lib/earnings';
import { getFreelancerProfile } from '../lib/profile';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'FreelancerEarnings'>;

const previewBookings: Booking[] = [
  {
    id: 'preview-earnings-1',
    customer_id: 'preview-customer-1',
    freelancer_id: 'preview-freelancer',
    freelancer_service_id: 'preview-service-1',
    scheduled_date: '2026-08-22',
    start_time: '10:00',
    end_time: '11:00',
    service_name: 'Lash Lift',
    price: 120,
    duration_minutes: 60,
    customer_note: '',
    status: 'completed',
    payment_status: 'paid',
    created_at: '2026-08-10T08:00:00Z',
  },
  {
    id: 'preview-earnings-2',
    customer_id: 'preview-customer-2',
    freelancer_id: 'preview-freelancer',
    freelancer_service_id: 'preview-service-2',
    scheduled_date: '2026-08-28',
    start_time: '14:00',
    end_time: '15:00',
    service_name: 'Lash Tint',
    price: 80,
    duration_minutes: 60,
    customer_note: '',
    status: 'completed',
    payment_status: 'pending',
    created_at: '2026-08-20T08:00:00Z',
  },
  {
    id: 'preview-earnings-3',
    customer_id: 'preview-customer-3',
    freelancer_id: 'preview-freelancer',
    freelancer_service_id: 'preview-service-3',
    scheduled_date: '2026-08-30',
    start_time: '09:00',
    end_time: '10:00',
    service_name: 'Classic Set',
    price: 150,
    duration_minutes: 60,
    customer_note: '',
    status: 'completed',
    payment_status: 'failed',
    created_at: '2026-08-21T08:00:00Z',
  },
  {
    id: 'preview-earnings-4',
    customer_id: 'preview-customer-4',
    freelancer_id: 'preview-freelancer',
    freelancer_service_id: 'preview-service-4',
    scheduled_date: '2026-08-31',
    start_time: '11:00',
    end_time: '12:00',
    service_name: 'Volume Set',
    price: 180,
    duration_minutes: 60,
    customer_note: '',
    status: 'completed',
    payment_status: 'refunded',
    created_at: '2026-08-22T08:00:00Z',
  },
];

export function FreelancerEarningsScreen({ navigation, route }: Props) {
  const isPreview = route.params?.preview ?? false;
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isPreview) {
      setBookings(previewBookings);
      setIsLoading(false);
      return;
    }
    if (!supabase) {
      setError('Connect Supabase before loading earnings.');
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
      const result = await getFreelancerEarningsBookings(data.user.id);
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

  const summary = summarizeEarnings(bookings);
  const paidBookings = bookings.filter(
    (booking) => booking.status === 'completed' && booking.payment_status === 'paid',
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading earnings…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>{isPreview ? 'EARNINGS PREVIEW' : 'EARNINGS'}</Text>
      <Text style={styles.title}>Track your paid work</Text>
      <Text style={styles.subtitle}>
        {isPreview
          ? 'Preview a read-only earnings summary based on completed bookings.'
          : 'Only completed bookings marked paid by the payment service are included.'}
      </Text>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>PAID COMPLETED EARNINGS</Text>
        <Text style={styles.total}>RM{summary.paidTotal.toFixed(2)}</Text>
        <Text style={styles.summaryMeta}>
          {summary.paidBookingCount} paid appointment{summary.paidBookingCount === 1 ? '' : 's'}
        </Text>
      </View>
      {summary.pendingBookingCount > 0 && (
        <View style={styles.pendingCard}>
          <Text style={styles.pendingTitle}>Payment still pending</Text>
          <Text style={styles.pendingBody}>
            {summary.pendingBookingCount} completed appointment{summary.pendingBookingCount === 1 ? '' : 's'} totaling
            RM
            {summary.pendingTotal.toFixed(2)} are not included until payment is confirmed.
          </Text>
        </View>
      )}
      {summary.failedBookingCount > 0 && (
        <View style={styles.pendingCard}>
          <Text style={styles.failedTitle}>Payment failed</Text>
          <Text style={styles.pendingBody}>
            {summary.failedBookingCount} completed appointment{summary.failedBookingCount === 1 ? '' : 's'} totaling RM
            {summary.failedTotal.toFixed(2)} require a separate payment resolution.
          </Text>
        </View>
      )}
      {summary.refundedBookingCount > 0 && (
        <View style={styles.pendingCard}>
          <Text style={styles.refundedTitle}>Payment refunded</Text>
          <Text style={styles.pendingBody}>
            {summary.refundedBookingCount} completed appointment{summary.refundedBookingCount === 1 ? '' : 's'} totaling
            RM
            {summary.refundedTotal.toFixed(2)} are excluded from paid earnings.
          </Text>
        </View>
      )}
      <Text style={styles.sectionTitle}>Paid appointments</Text>
      {paidBookings.length === 0 ? (
        <Text style={styles.emptyText}>Paid completed appointments will appear here.</Text>
      ) : (
        paidBookings.map((booking) => (
          <View key={booking.id} style={styles.bookingCard}>
            <View style={styles.bookingHeader}>
              <Text style={styles.bookingTitle}>{booking.service_name}</Text>
              <Text style={styles.bookingPrice}>RM{booking.price.toFixed(2)}</Text>
            </View>
            <Text style={styles.bookingMeta}>
              {booking.scheduled_date} · {booking.start_time}–{booking.end_time}
            </Text>
            <Text style={styles.paidLabel}>PAID</Text>
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
  summaryCard: { backgroundColor: theme.colors.ink, borderRadius: 18, marginTop: 24, padding: 22 },
  summaryLabel: { color: theme.colors.blush, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  total: { color: theme.colors.white, fontSize: 36, fontWeight: '800', marginTop: 12 },
  summaryMeta: { color: theme.colors.blush, marginTop: 6 },
  pendingCard: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
    padding: 18,
  },
  pendingTitle: { color: theme.colors.accent, fontSize: 16, fontWeight: '800' },
  failedTitle: { color: '#B54708', fontSize: 16, fontWeight: '800' },
  refundedTitle: { color: '#B42318', fontSize: 16, fontWeight: '800' },
  pendingBody: { color: theme.colors.muted, lineHeight: 20, marginTop: 6 },
  sectionTitle: { color: theme.colors.ink, fontSize: 20, fontWeight: '800', marginTop: 28 },
  emptyText: { color: theme.colors.muted, marginTop: 12 },
  bookingCard: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
    padding: 18,
  },
  bookingHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  bookingTitle: { color: theme.colors.ink, flex: 1, fontSize: 17, fontWeight: '800' },
  bookingPrice: { color: theme.colors.ink, fontSize: 17, fontWeight: '800' },
  bookingMeta: { color: theme.colors.muted, marginTop: 6 },
  paidLabel: { color: '#067647', fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginTop: 10 },
  secondaryButton: { borderColor: theme.colors.border, borderRadius: 14, borderWidth: 1, marginTop: 24, padding: 15 },
  secondaryButtonText: { color: theme.colors.accent, fontWeight: '700', textAlign: 'center' },
});
