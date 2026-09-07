import type { Booking } from './bookings';

export type EarningsSummary = {
  paidBookingCount: number;
  paidTotal: number;
  completedUnpaidCount: number;
  completedUnpaidTotal: number;
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
      } else {
        summary.completedUnpaidCount += 1;
        summary.completedUnpaidTotal += booking.price;
      }
      return summary;
    },
    { paidBookingCount: 0, paidTotal: 0, completedUnpaidCount: 0, completedUnpaidTotal: 0 },
  );
}
