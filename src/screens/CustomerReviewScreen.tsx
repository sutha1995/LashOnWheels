import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { theme } from '../constants/theme';
import { createBookingReview, getReviewsForBookings, type BookingReview } from '../lib/reviews';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'CustomerReview'>;

export function CustomerReviewScreen({ navigation, route }: Props) {
  const { bookingId, serviceName, preview } = route.params;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [existingReview, setExistingReview] = useState<BookingReview | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(!preview);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (preview) {
      setIsLoading(false);
      return;
    }
    if (!supabase) {
      setError('Connect Supabase before loading reviews.');
      setIsLoading(false);
      return;
    }

    void getReviewsForBookings([bookingId]).then((result) => {
      if (result.error) {
        setError(result.error.message);
      } else {
        setExistingReview(result.reviews[0] ?? null);
      }
      setIsLoading(false);
    });
  }, [bookingId, preview]);

  const handleSave = async () => {
    if (!rating) {
      setError('Choose a rating before submitting.');
      return;
    }
    setError('');
    setIsSaving(true);
    const result = await createBookingReview(bookingId, rating, comment);
    setIsSaving(false);
    if (result.error || !result.review) {
      setError(result.error?.message ?? 'Unable to save your review.');
      return;
    }
    setExistingReview(result.review);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading review status…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>{preview ? 'REVIEW PREVIEW' : 'YOUR REVIEW'}</Text>
      <Text style={styles.title}>How was your appointment?</Text>
      <Text style={styles.subtitle}>
        {preview ? 'Preview the feedback experience after a completed lash appointment.' : serviceName}
      </Text>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
      {existingReview ? (
        <View style={styles.reviewCard}>
          <Text style={styles.cardTitle}>Review submitted</Text>
          <Text style={styles.rating}>
            {'★'.repeat(existingReview.rating)}
            {'☆'.repeat(5 - existingReview.rating)}
          </Text>
          {!!existingReview.comment && <Text style={styles.comment}>“{existingReview.comment}”</Text>}
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Rate your experience</Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((value) => (
                <Pressable key={value} onPress={() => setRating(value)} accessibilityLabel={`${value} stars`}>
                  <Text style={styles.star}>{value <= rating ? '★' : '☆'}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              multiline
              maxLength={1000}
              onChangeText={setComment}
              placeholder="Tell other customers what stood out."
              placeholderTextColor={theme.colors.muted}
              style={styles.input}
              value={comment}
            />
            {!preview && (
              <Pressable disabled={isSaving} onPress={() => void handleSave()} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>{isSaving ? 'Submitting…' : 'Submit review'}</Text>
              </Pressable>
            )}
            {preview && <Text style={styles.previewNote}>Preview mode is read-only.</Text>}
          </View>
        </>
      )}
      <Pressable style={styles.secondaryButton} onPress={() => navigation.goBack()}>
        <Text style={styles.secondaryButtonText}>{preview ? 'Back to customer preview' : 'Back to bookings'}</Text>
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
    marginTop: 22,
    padding: 18,
  },
  reviewCard: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 22,
    padding: 18,
  },
  cardTitle: { color: theme.colors.ink, fontSize: 18, fontWeight: '800' },
  ratingRow: { flexDirection: 'row', gap: 8, marginTop: 18 },
  rating: { color: theme.colors.accent, fontSize: 28, letterSpacing: 2, marginTop: 18 },
  star: { color: theme.colors.accent, fontSize: 36 },
  input: {
    borderColor: theme.colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: theme.colors.ink,
    minHeight: 120,
    padding: 14,
    textAlignVertical: 'top',
    marginTop: 18,
  },
  comment: { color: theme.colors.muted, fontStyle: 'italic', lineHeight: 20, marginTop: 12 },
  primaryButton: { backgroundColor: theme.colors.ink, borderRadius: 14, marginTop: 18, padding: 15 },
  primaryButtonText: { color: theme.colors.white, fontWeight: '700', textAlign: 'center' },
  previewNote: { color: theme.colors.muted, lineHeight: 20, marginTop: 16 },
  secondaryButton: { borderColor: theme.colors.border, borderRadius: 14, borderWidth: 1, marginTop: 24, padding: 15 },
  secondaryButtonText: { color: theme.colors.accent, fontWeight: '700', textAlign: 'center' },
});
