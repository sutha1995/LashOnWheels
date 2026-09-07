import { supabase } from './supabase';

export type BookingReview = {
  id: string;
  booking_id: string;
  customer_id: string;
  freelancer_id: string;
  rating: number;
  comment: string;
  created_at: string;
};

export function summarizeReviews(reviews: BookingReview[]) {
  if (!reviews.length) {
    return { count: 0, averageRating: null };
  }

  const totalRating = reviews.reduce((total, review) => total + review.rating, 0);
  return { count: reviews.length, averageRating: totalRating / reviews.length };
}

export async function getReviewsForBookings(bookingIds: string[]) {
  if (!supabase) {
    return { reviews: [], error: new Error('Supabase is not configured.') };
  }
  if (!bookingIds.length) {
    return { reviews: [], error: null };
  }

  const { data, error } = await supabase
    .from('booking_reviews')
    .select('id, booking_id, customer_id, freelancer_id, rating, comment, created_at')
    .in('booking_id', bookingIds);

  return { reviews: (data ?? []) as BookingReview[], error };
}

export async function createBookingReview(bookingId: string, rating: number, comment: string) {
  if (!supabase) {
    return { review: null, error: new Error('Supabase is not configured.') };
  }

  const { data, error } = await supabase.rpc('create_booking_review', {
    p_booking_id: bookingId,
    p_rating: rating,
    p_comment: comment,
  });

  return { review: data as BookingReview | null, error };
}
