import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { theme } from '../constants/theme';
import { getFreelancerBookings, updateBookingStatus, type Booking } from '../lib/bookings';
import { getFreelancerProfile } from '../lib/profile';
import { getReviewsForBookings, summarizeReviews, type BookingReview } from '../lib/reviews';
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
    payment_status: 'unpaid',
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
    payment_status: 'pending',
    created_at: '2026-09-01T08:15:00Z',
  },
  {
    id: 'preview-3',
    customer_id: 'preview-customer-3',
    freelancer_id: 'preview-freelancer',
    freelancer_service_id: 'preview-service-1',
    scheduled_date: '2026-09-10',
    start_time: '16:00',
    end_time: '17:00',
    service_name: 'Lash Lift',
    price: 120,
    duration_minutes: 60,
    customer_note: '',
    status: 'completed',
    payment_status: 'paid',
    created_at: '2026-09-01T08:30:00Z',
  },
];

const previewReviews: BookingReview[] = [
  {
    id: 'preview-review-1',
    booking_id: 'preview-3',
    customer_id: 'preview-customer-3',
    freelancer_id: 'preview-freelancer',
    rating: 5,
    comment: 'Beautiful result and very professional service.',
    created_at: '2026-09-10T18:00:00Z',
  },
];

const statusLabels: Record<Booking['status'], string> = {
  pending: 'PENDING',
  confirmed: 'CONFIRMED',
  cancelled: 'CANCELLED',
  completed: 'COMPLETED',
};

const paymentStatusLabels: Record<Booking['payment_status'], string> = {
  unpaid: 'PAYMENT UNPAID',
  pending: 'PAYMENT PENDING',
  paid: 'PAID',
  failed: 'PAYMENT FAILED',
  refunded: 'REFUNDED',
};

export function FreelancerBookingsScreen({ navigation, route }: Props) {
  const isPreview = route.params?.preview ?? false;
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [updatingBookingId, setUpdatingBookingId] = useState('');
  const [reviewsByBookingId, setReviewsByBookingId] = useState<Record<string, BookingReview>>({});

  useEffect(() => {
    if (isPreview) {
      setBookings(previewBookings);
      setReviewsByBookingId(Object.fromEntries(previewReviews.map((review) => [review.booking_id, review])));
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
        const reviewResult = await getReviewsForBookings(result.bookings.map((booking) => booking.id));
        if (!reviewResult.error) {
          setReviewsByBookingId(Object.fromEntries(reviewResult.reviews.map((review) => [review.booking_id, review])));
        }
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [isPreview, navigation]);

  const reviews = Object.values(reviewsByBookingId);
  const reviewSummary = summarizeReviews(reviews);

  const handleStatusChange = async (
    bookingId: string,
    action: 'confirm_booking' | 'reject_booking' | 'complete_booking',
  ) => {
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
          ? 'Review how booking requests, completed appointments, and customer feedback will appear.'
          : 'Review new requests, completed appointments, and customer feedback.'}
      </Text>
      {reviewSummary.count > 0 && (
        <Text style={styles.reviewSummary}>
          {reviewSummary.averageRating?.toFixed(1)}/5 from {reviewSummary.count} customer review
          {reviewSummary.count === 1 ? '' : 's'}
        </Text>
      )}
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
            <Text style={[styles.paymentStatus, styles[`payment_${booking.payment_status}`]]}>
              {paymentStatusLabels[booking.payment_status]}
            </Text>
            {!!booking.customer_note && <Text style={styles.note}>“{booking.customer_note}”</Text>}
            {!!reviewsByBookingId[booking.id] && (
              <View style={styles.reviewCard}>
                <Text style={styles.reviewLabel}>CUSTOMER FEEDBACK</Text>
                <Text style={styles.reviewRating}>
                  {'★'.repeat(reviewsByBookingId[booking.id].rating)}
                  {'☆'.repeat(5 - reviewsByBookingId[booking.id].rating)}
                </Text>
                {!!reviewsByBookingId[booking.id].comment && (
                  <Text style={styles.reviewComment}>“{reviewsByBookingId[booking.id].comment}”</Text>
                )}
              </View>
            )}
            {booking.status !== 'cancelled' && (
              <Pressable
                style={styles.secondaryButton}
                onPress={() =>
                  navigation.navigate('BookingChat', {
                    bookingId: booking.id,
                    serviceName: booking.service_name,
                    ...(isPreview ? { preview: true } : {}),
                  })
                }
              >
                <Text style={styles.secondaryButtonText}>Open booking chat</Text>
              </Pressable>
            )}
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
            {booking.status === 'confirmed' && (
              <>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() =>
                    navigation.navigate('LocationTracking', {
                      bookingId: booking.id,
                      ...(isPreview ? { preview: true } : {}),
                    })
                  }
                >
                  <Text style={styles.secondaryButtonText}>Share travel location</Text>
                </Pressable>
                {!isPreview && (
                  <Pressable
                    style={styles.primaryButton}
                    disabled={updatingBookingId === booking.id}
                    onPress={() => void handleStatusChange(booking.id, 'complete_booking')}
                  >
                    <Text style={styles.primaryButtonText}>
                      {updatingBookingId === booking.id ? 'Updating…' : 'Mark completed'}
                    </Text>
                  </Pressable>
                )}
              </>
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
  reviewSummary: { color: theme.colors.accent, fontSize: 14, fontWeight: '700', marginTop: 14 },
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
  paymentStatus: { fontSize: 11, fontWeight: '800', letterSpacing: 0.7, marginTop: 12 },
  payment_unpaid: { color: theme.colors.accent },
  payment_pending: { color: theme.colors.accent },
  payment_paid: { color: '#067647' },
  payment_failed: { color: '#B42318' },
  payment_refunded: { color: theme.colors.muted },
  note: { color: theme.colors.muted, fontStyle: 'italic', lineHeight: 20, marginTop: 14 },
  reviewCard: { backgroundColor: theme.colors.cream, borderRadius: 12, marginTop: 16, padding: 14 },
  reviewLabel: { color: theme.colors.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  reviewRating: { color: theme.colors.accent, fontSize: 20, letterSpacing: 1, marginTop: 6 },
  reviewComment: { color: theme.colors.muted, fontStyle: 'italic', lineHeight: 20, marginTop: 4 },
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
