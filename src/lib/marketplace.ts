import type { FreelancerAvailability } from './availability';
import { addMinutesToTime, getAvailabilityDayOfWeek, isValidDate, isValidTime, timeToMinutes } from './datetime';
import type { FreelancerProfile } from './profile';
import { getPortfolioPhotos, type PortfolioPhoto } from './portfolio';
import type { Service } from './serviceCatalog';
import { supabase } from './supabase';

export type MarketplaceFreelancer = Pick<
  FreelancerProfile,
  'id' | 'display_name' | 'bio' | 'experience_years' | 'service_area' | 'travel_fee' | 'profile_photo_url' | 'onboarding_completed'
>;

export type FreelancerServiceOffering = {
  id: string;
  service_id: string;
  description: string;
  duration_minutes: number;
  price: number;
  service: Service;
};

export type FreelancerRating = { averageRating: number | null; reviewCount: number };

export type MarketplaceListing = FreelancerServiceOffering & {
  freelancer: MarketplaceFreelancer;
  rating: FreelancerRating;
  completedBookings: number;
};

export type MarketplaceSearchFilters = {
  serviceId?: string;
  locationQuery?: string;
  scheduledDate?: string;
  startTime?: string;
};

export type MarketplaceSortOption = 'recommended' | 'rating' | 'price';

type FreelancerServiceRow = {
  id: string;
  service_id: string;
  description: string;
  duration_minutes: number;
  price: number;
  service: Service | Service[] | null;
};

type RatingSummaryRow = { freelancer_id: string; average_rating: number | null; review_count: number };
type CompletedSummaryRow = { freelancer_id: string; completed_bookings: number };
type AvailabilityRow = FreelancerAvailability & { freelancer_id: string };

const noRating: FreelancerRating = { averageRating: null, reviewCount: 0 };

function toOffering(row: FreelancerServiceRow): FreelancerServiceOffering | null {
  const service = Array.isArray(row.service) ? row.service[0] : row.service;
  if (!service) {
    return null;
  }
  return {
    id: row.id,
    service_id: row.service_id,
    description: row.description,
    duration_minutes: row.duration_minutes,
    price: row.price,
    service,
  };
}

function sortListings(listings: MarketplaceListing[], sort: MarketplaceSortOption) {
  const ratingValue = (listing: MarketplaceListing) => listing.rating.averageRating ?? -1;
  if (sort === 'price') {
    return [...listings].sort((a, b) => a.price - b.price);
  }
  if (sort === 'rating') {
    return [...listings].sort((a, b) => ratingValue(b) - ratingValue(a) || b.rating.reviewCount - a.rating.reviewCount);
  }
  return [...listings].sort(
    (a, b) => ratingValue(b) - ratingValue(a) || b.completedBookings - a.completedBookings || a.price - b.price,
  );
}

export async function searchMarketplace(filters: MarketplaceSearchFilters = {}, sort: MarketplaceSortOption = 'recommended') {
  if (!supabase) {
    return { listings: [], error: new Error('Supabase is not configured.') };
  }

  let servicesQuery = supabase
    .from('freelancer_services')
    .select('id, service_id, description, duration_minutes, price, service:services(id, name, description, duration_minutes, base_price)')
    .eq('active', true);
  if (filters.serviceId) {
    servicesQuery = servicesQuery.eq('service_id', filters.serviceId);
  }
  const { data: serviceRows, error: servicesError } = await servicesQuery.order('created_at');
  if (servicesError || !serviceRows) {
    return { listings: [], error: servicesError };
  }

  const rows = serviceRows as Array<FreelancerServiceRow & { freelancer_id: string }>;
  const freelancerIds = [...new Set(rows.map((row) => row.freelancer_id))];
  if (!freelancerIds.length) {
    return { listings: [], error: null };
  }

  const requestedDate = filters.scheduledDate && isValidDate(filters.scheduledDate) ? filters.scheduledDate : null;
  const requestedStartTime = filters.startTime && isValidTime(filters.startTime) ? filters.startTime : null;

  const [profilesResult, ratingsResult, completedResult, availabilityResult] = await Promise.all([
    supabase
      .from('freelancer_profiles')
      .select('id, display_name, bio, experience_years, service_area, travel_fee, profile_photo_url, onboarding_completed')
      .in('id', freelancerIds),
    supabase.from('freelancer_rating_summaries').select('freelancer_id, average_rating, review_count').in('freelancer_id', freelancerIds),
    supabase.from('freelancer_completed_booking_summaries').select('freelancer_id, completed_bookings').in('freelancer_id', freelancerIds),
    requestedDate
      ? supabase
          .from('freelancer_availability')
          .select('freelancer_id, day_of_week, is_available, start_time, end_time')
          .in('freelancer_id', freelancerIds)
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (profilesResult.error) {
    return { listings: [], error: profilesResult.error };
  }
  if (ratingsResult.error) {
    return { listings: [], error: ratingsResult.error };
  }
  if (completedResult.error) {
    return { listings: [], error: completedResult.error };
  }
  if (availabilityResult.error) {
    return { listings: [], error: availabilityResult.error };
  }

  const profilesById = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile as MarketplaceFreelancer]));
  const ratingsByFreelancer = new Map(
    ((ratingsResult.data ?? []) as RatingSummaryRow[]).map((row) => [
      row.freelancer_id,
      { averageRating: row.average_rating, reviewCount: row.review_count },
    ]),
  );
  const completedByFreelancer = new Map(
    ((completedResult.data ?? []) as CompletedSummaryRow[]).map((row) => [row.freelancer_id, row.completed_bookings]),
  );
  const availabilityByFreelancer = new Map<string, AvailabilityRow[]>();
  for (const row of (availabilityResult.data ?? []) as AvailabilityRow[]) {
    const existing = availabilityByFreelancer.get(row.freelancer_id) ?? [];
    existing.push(row);
    availabilityByFreelancer.set(row.freelancer_id, existing);
  }

  const locationQuery = filters.locationQuery?.trim().toLowerCase() ?? '';
  const dayOfWeek = requestedDate !== null ? getAvailabilityDayOfWeek(requestedDate) : null;

  const listings: MarketplaceListing[] = [];
  for (const row of rows) {
    const freelancer = profilesById.get(row.freelancer_id);
    const offering = toOffering(row);
    if (!freelancer || !offering) {
      continue;
    }

    if (locationQuery && !freelancer.service_area.toLowerCase().includes(locationQuery)) {
      continue;
    }

    if (dayOfWeek !== null) {
      const slots = availabilityByFreelancer.get(freelancer.id) ?? [];
      const slot = slots.find((entry) => entry.day_of_week === dayOfWeek);
      if (!slot || !slot.is_available) {
        continue;
      }
      if (requestedStartTime) {
        const requestedEnd = addMinutesToTime(requestedStartTime, offering.duration_minutes);
        if (timeToMinutes(slot.start_time) > timeToMinutes(requestedStartTime) || timeToMinutes(slot.end_time) < timeToMinutes(requestedEnd)) {
          continue;
        }
      }
    }

    listings.push({
      ...offering,
      freelancer,
      rating: ratingsByFreelancer.get(freelancer.id) ?? noRating,
      completedBookings: completedByFreelancer.get(freelancer.id) ?? 0,
    });
  }

  return { listings: sortListings(listings, sort), error: null };
}

export type FreelancerMarketplaceProfile = {
  freelancer: MarketplaceFreelancer;
  services: FreelancerServiceOffering[];
  portfolio: PortfolioPhoto[];
  rating: FreelancerRating;
  completedBookings: number;
};

export async function getFreelancerMarketplaceProfile(freelancerId: string) {
  if (!supabase) {
    return { profile: null, error: new Error('Supabase is not configured.') };
  }

  const [profileResult, servicesResult, ratingResult, completedResult, portfolioResult] = await Promise.all([
    supabase
      .from('freelancer_profiles')
      .select('id, display_name, bio, experience_years, service_area, travel_fee, profile_photo_url, onboarding_completed')
      .eq('id', freelancerId)
      .maybeSingle(),
    supabase
      .from('freelancer_services')
      .select('id, service_id, description, duration_minutes, price, service:services(id, name, description, duration_minutes, base_price)')
      .eq('freelancer_id', freelancerId)
      .eq('active', true)
      .order('created_at'),
    supabase.from('freelancer_rating_summaries').select('freelancer_id, average_rating, review_count').eq('freelancer_id', freelancerId).maybeSingle(),
    supabase.from('freelancer_completed_booking_summaries').select('freelancer_id, completed_bookings').eq('freelancer_id', freelancerId).maybeSingle(),
    getPortfolioPhotos(freelancerId),
  ]);

  if (profileResult.error) {
    return { profile: null, error: profileResult.error };
  }
  const freelancer = profileResult.data as MarketplaceFreelancer | null;
  if (!freelancer || !freelancer.onboarding_completed) {
    return { profile: null, error: new Error('This freelancer profile is not available.') };
  }
  if (servicesResult.error) {
    return { profile: null, error: servicesResult.error };
  }
  if (portfolioResult.error) {
    return { profile: null, error: portfolioResult.error };
  }

  const ratingRow = ratingResult.data as RatingSummaryRow | null;
  const services = ((servicesResult.data ?? []) as Array<FreelancerServiceRow & { freelancer_id: string }>)
    .map((row) => toOffering(row))
    .filter((offering): offering is FreelancerServiceOffering => offering !== null);

  return {
    profile: {
      freelancer,
      services,
      portfolio: portfolioResult.photos,
      rating: ratingRow ? { averageRating: ratingRow.average_rating, reviewCount: ratingRow.review_count } : noRating,
      completedBookings: ((completedResult.data as CompletedSummaryRow | null)?.completed_bookings ?? 0),
    } satisfies FreelancerMarketplaceProfile,
    error: null,
  };
}
