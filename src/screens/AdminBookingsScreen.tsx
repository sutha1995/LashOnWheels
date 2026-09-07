import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { theme } from '../constants/theme';
import { getAdminBookings, type Booking } from '../lib/bookings';
import { getProfile } from '../lib/profile';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminBookings'>;

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

export function AdminBookingsScreen({ navigation }: Props) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadBookings = async () => {
      if (!supabase) {
        setError('Connect Supabase before loading bookings.');
        setBookings([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const { data } = await supabase.auth.getUser();
      if (!isMounted) {
        return;
      }
      if (!data.user) {
        navigation.replace('Welcome');
        return;
      }

      const profileResult = await getProfile(data.user.id);
      if (!isMounted) {
        return;
      }
      if (profileResult.error) {
        setError(profileResult.error.message);
        setBookings([]);
        setIsLoading(false);
        return;
      }
      if (profileResult.profile?.role !== 'admin') {
        setError('Only admin accounts can view all bookings.');
        setBookings([]);
        setIsLoading(false);
        return;
      }

      const result = await getAdminBookings();
      if (!isMounted) {
        return;
      }
      if (result.error) {
        setError(result.error.message);
        setBookings([]);
      } else {
        setError('');
        setBookings(result.bookings);
      }
      setIsLoading(false);
    };

    void loadBookings();
    const unsubscribe = navigation.addListener('focus', () => {
      void loadBookings();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [navigation]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading platform bookings…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>ADMIN BOOKING OVERSIGHT</Text>
      <Text style={styles.title}>Review all bookings</Text>
      <Text style={styles.subtitle}>
        Monitor appointment status across customers and freelancers. This view is read-only.
      </Text>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
      {!error && bookings.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No bookings yet</Text>
          <Text style={styles.emptyBody}>Customer requests will appear here when they are created.</Text>
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
            <Text style={styles.meta}>Payment: {paymentStatusLabels[booking.payment_status]}</Text>
            <Text style={styles.meta}>Customer: {booking.customer_id}</Text>
            <Text style={styles.meta}>Freelancer: {booking.freelancer_id}</Text>
            {!!booking.customer_note && <Text style={styles.note}>“{booking.customer_note}”</Text>}
          </View>
        ))
      )}
      <Pressable style={styles.secondaryButton} onPress={() => navigation.goBack()}>
        <Text style={styles.secondaryButtonText}>Back to Admin control centre</Text>
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
  meta: { color: theme.colors.muted, marginTop: 6 },
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
  secondaryButton: { borderColor: theme.colors.border, borderRadius: 14, borderWidth: 1, marginTop: 24, padding: 15 },
  secondaryButtonText: { color: theme.colors.accent, fontWeight: '700', textAlign: 'center' },
});
