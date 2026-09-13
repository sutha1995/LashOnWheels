export function calculateBookingTotal(price: number, travelFee: number) {
  return Math.round((price + travelFee) * 100) / 100;
}

export function calculateDistanceKm(latitude: number, longitude: number, targetLatitude: number | null, targetLongitude: number | null) {
  if (targetLatitude === null || targetLongitude === null) return null;
  const radians = (value: number) => (value * Math.PI) / 180;
  const a = Math.sin(radians(targetLatitude - latitude) / 2) ** 2 + Math.cos(radians(latitude)) * Math.cos(radians(targetLatitude)) * Math.sin(radians(targetLongitude - longitude) / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}
