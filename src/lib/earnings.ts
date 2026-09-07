import type { Booking } from './bookings';

export type EarningsSummary = {
  paidBookingCount: number;
  paidTotal: number;
  pendingBookingCount: number;
  pendingTotal: number;
  failedBookingCount: number;
  failedTotal: number;
  refundedBookingCount: number;
  refundedTotal: number;
};

export function summarizeEarnings(bookings: Booking[]): EarningsSummary {
  return bookings.reduce(
    (summary, booking) => {
      if (booking.status !== 'completed') {
        return summary;
      }
      if (booking.payment_status === 'paid') {
        summary.paidBookingCount += 1;
        summary.paidTotal += booking.price;
      } else if (booking.payment_status === 'unpaid' || booking.payment_status === 'pending') {
        summary.pendingBookingCount += 1;
        summary.pendingTotal += booking.price;
      } else if (booking.payment_status === 'failed') {
        summary.failedBookingCount += 1;
        summary.failedTotal += booking.price;
      } else if (booking.payment_status === 'refunded') {
        summary.refundedBookingCount += 1;
        summary.refundedTotal += booking.price;
      }
      return summary;
    },
    {
      paidBookingCount: 0,
      paidTotal: 0,
      pendingBookingCount: 0,
      pendingTotal: 0,
      failedBookingCount: 0,
      failedTotal: 0,
      refundedBookingCount: 0,
      refundedTotal: 0,
    },
  );
}
