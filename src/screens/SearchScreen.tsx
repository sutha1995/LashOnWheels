import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { theme } from '../constants/theme';
import { isValidDate, isValidTime } from '../lib/datetime';
import { searchMarketplace, type MarketplaceListing, type MarketplaceSortOption } from '../lib/marketplace';
import { getServiceCatalog, type Service } from '../lib/serviceCatalog';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'Search'>;

const sortOptions: Array<{ value: MarketplaceSortOption; label: string }> = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'rating', label: 'Top rated' },
  { value: 'price', label: 'Lowest price' },
];

const previewCatalog: Service[] = [
  {
    id: 'preview-service-lash-lift',
    name: 'Lash Lift',
    description: 'A natural curl and lift for your lashes.',
    duration_minutes: 60,
    base_price: 80,
  },
  {
    id: 'preview-service-lash-tint',
    name: 'Lash Tint',
    description: 'A rich tint to define your natural lashes.',
    duration_minutes: 30,
    base_price: 45,
  },
  {
    id: 'preview-service-classic',
    name: 'Classic Lash Extension',
    description: 'Lightweight one-to-one extensions for everyday definition.',
    duration_minutes: 120,
    base_price: 120,
  },
];

const previewListings: MarketplaceListing[] = [
  {
    id: 'preview-listing-1',
    service_id: 'preview-service-lash-lift',
    description: 'Gentle, long-lasting lifts tailored to your natural lashes.',
    duration_minutes: 60,
    price: 85,
    service: previewCatalog[0],
    freelancer: {
      id: 'preview-freelancer-1',
      display_name: 'Sarah Lee',
      bio: 'Certified lash artist with a mobile studio serving Rawang.',
      experience_years: 5,
      service_area: 'Rawang, Selangor',
      travel_fee: 5,
      profile_photo_url: null,
      onboarding_completed: true,
    },
    rating: { averageRating: 4.9, reviewCount: 27 },
    completedBookings: 31,
  },
  {
    id: 'preview-listing-2',
    service_id: 'preview-service-classic',
    description: 'Full-volume classic sets applied with medical-grade adhesive.',
    duration_minutes: 120,
    price: 130,
    service: previewCatalog[2],
    freelancer: {
      id: 'preview-freelancer-2',
      display_name: 'Aina Sofea',
      bio: 'Lash extension specialist covering Kuala Selangor.',
      experience_years: 3,
      service_area: 'Kuala Selangor',
      travel_fee: 0,
      profile_photo_url: null,
      onboarding_completed: true,
    },
    rating: { averageRating: null, reviewCount: 0 },
    completedBookings: 4,
  },
  {
    id: 'preview-listing-3',
    service_id: 'preview-service-lash-tint',
    description: 'Rich, long-lasting tint for naturally defined lashes.',
    duration_minutes: 30,
    price: 45,
    service: previewCatalog[1],
    freelancer: {
      id: 'preview-freelancer-2',
      display_name: 'Aina Sofea',
      bio: 'Lash extension specialist covering Kuala Selangor.',
      experience_years: 3,
      service_area: 'Kuala Selangor',
      travel_fee: 0,
      profile_photo_url: null,
      onboarding_completed: true,
    },
    rating: { averageRating: 4.6, reviewCount: 9 },
    completedBookings: 12,
  },
];

function getInitials(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}

function getRatingLabel(listing: MarketplaceListing) {
  const { averageRating, reviewCount } = listing.rating;
  return averageRating !== null ? `★ ${averageRating.toFixed(1)} · ${reviewCount} reviews` : 'New artist';
}

export function SearchScreen({ navigation, route }: Props) {
  const isPreview = route.params?.preview ?? false;
  const initialServiceId = route.params?.serviceId ?? '';
  const [catalog, setCatalog] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [sort, setSort] = useState<MarketplaceSortOption>('recommended');
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (isPreview) {
      setCatalog(previewCatalog);
      setSelectedServiceId(initialServiceId);
      setListings(initialServiceId ? previewListings.filter((listing) => listing.service_id === initialServiceId) : previewListings);
      setHasSearched(true);
      setIsLoading(false);
      return;
    }
    if (!supabase) {
      setError('Connect Supabase before searching for freelancers.');
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const loadInitial = async () => {
      const catalogResult = await getServiceCatalog();
      if (!isMounted) {
        return;
      }
      if (catalogResult.error) {
        setError(catalogResult.error.message);
        setIsLoading(false);
        return;
      }
      setCatalog(catalogResult.services);
      setSelectedServiceId(initialServiceId);

      const result = await searchMarketplace(initialServiceId ? { serviceId: initialServiceId } : {}, 'recommended');
      if (!isMounted) {
        return;
      }
      if (result.error) {
        setError(result.error.message);
      } else {
        setListings(result.listings);
        setHasSearched(true);
      }
      setIsLoading(false);
    };
    void loadInitial();

    return () => {
      isMounted = false;
    };
  }, [initialServiceId, isPreview]);

  const runSearch = async () => {
    setError('');
    if (!supabase) {
      setError('Connect Supabase before searching for freelancers.');
      return;
    }

    const dateFilter = scheduledDate.trim();
    const timeFilter = startTime.trim();
    if (dateFilter && !isValidDate(dateFilter)) {
      setError('Enter a valid date in YYYY-MM-DD format.');
      return;
    }
    if (timeFilter && !isValidTime(timeFilter)) {
      setError('Enter a valid time in HH:MM format.');
      return;
    }
    if (timeFilter && !dateFilter) {
      setError('Add a date when filtering by time.');
      return;
    }

    setIsSearching(true);
    const result = await searchMarketplace(
      {
        serviceId: selectedServiceId || undefined,
        locationQuery: locationQuery.trim() || undefined,
        scheduledDate: dateFilter || undefined,
        startTime: timeFilter || undefined,
      },
      sort,
    );
    setIsSearching(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setListings(result.listings);
    setHasSearched(true);
  };

  const clearFilters = () => {
    setSelectedServiceId('');
    setLocationQuery('');
    setScheduledDate('');
    setStartTime('');
    setSort('recommended');
    setError('');
  };

  const selectListing = (listing: MarketplaceListing) => {
    navigation.navigate('FreelancerProfile', {
      freelancerId: listing.freelancer.id,
      serviceId: listing.service_id,
      preview: isPreview || undefined,
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Searching for available artists…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>SEARCH</Text>
      <Text style={styles.title}>Find your lash artist</Text>
      <Text style={styles.subtitle}>
        Filter by service, location, and a date with time. Results only show artists working within their set hours.
      </Text>
      <View style={styles.filterCard}>
        <Text style={styles.filterLabel}>Service</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <Pressable
            style={[styles.chip, !selectedServiceId && styles.chipSelected]}
            onPress={() => setSelectedServiceId('')}
          >
            <Text style={[styles.chipText, !selectedServiceId && styles.chipTextSelected]}>All services</Text>
          </Pressable>
          {catalog.map((service) => (
            <Pressable
              key={service.id}
              style={[styles.chip, service.id === selectedServiceId && styles.chipSelected]}
              onPress={() => setSelectedServiceId(service.id)}
            >
              <Text style={[styles.chipText, service.id === selectedServiceId && styles.chipTextSelected]}>
                {service.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={styles.filterLabel}>Location</Text>
        <TextInput
          value={locationQuery}
          onChangeText={setLocationQuery}
          placeholder="e.g. Rawang"
          style={styles.input}
        />
        <Text style={styles.filterLabel}>Date</Text>
        <TextInput
          value={scheduledDate}
          onChangeText={setScheduledDate}
          placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
          style={styles.input}
        />
        <Text style={styles.filterLabel}>Start time</Text>
        <TextInput
          value={startTime}
          onChangeText={setStartTime}
          placeholder="14:00"
          keyboardType="numbers-and-punctuation"
          style={styles.input}
        />
        <Text style={styles.filterLabel}>Sort by</Text>
        <View style={styles.sortRow}>
          {sortOptions.map((option) => (
            <Pressable
              key={option.value}
              style={[styles.sortChip, sort === option.value && styles.chipSelected]}
              onPress={() => setSort(option.value)}
            >
              <Text style={[styles.sortChipText, sort === option.value && styles.chipTextSelected]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
        {!!error && <Text style={styles.errorText}>{error}</Text>}
        <View style={styles.searchActions}>
          <Pressable style={styles.searchButton} disabled={isSearching} onPress={() => void runSearch()}>
            <Text style={styles.searchButtonText}>{isSearching ? 'Searching…' : 'Search'}</Text>
          </Pressable>
          <Pressable style={styles.resetButton} onPress={clearFilters}>
            <Text style={styles.resetButtonText}>Clear filters</Text>
          </Pressable>
        </View>
      </View>
      <Text style={styles.resultsHeading}>
        {hasSearched ? `${listings.length} result${listings.length === 1 ? '' : 's'}` : 'Run a search to see results'}
      </Text>
      {listings.map((listing) => (
        <Pressable key={listing.id} style={styles.resultCard} onPress={() => selectListing(listing)}>
          {listing.freelancer.profile_photo_url ? (
            <Image source={{ uri: listing.freelancer.profile_photo_url }} style={styles.resultPhoto} />
          ) : (
            <View style={styles.resultInitials}>
              <Text style={styles.resultInitialsText}>{getInitials(listing.freelancer.display_name)}</Text>
            </View>
          )}
          <View style={styles.resultBody}>
            <Text style={styles.resultName}>{listing.freelancer.display_name}</Text>
            <Text style={styles.resultRating}>{getRatingLabel(listing)}</Text>
            <Text style={styles.resultService}>
              {listing.service.name} · RM{listing.price.toFixed(2)} · {listing.duration_minutes} minutes
            </Text>
            <Text style={styles.resultArea}>Serves {listing.freelancer.service_area || 'Malaysia'}</Text>
          </View>
        </Pressable>
      ))}
      {hasSearched && !listings.length && (
        <Text style={styles.emptyText}>No artists match these filters yet. Try clearing the date or location.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  container: { padding: 24, paddingBottom: 48 },
  loadingContainer: { alignItems: 'center', backgroundColor: theme.colors.cream, flex: 1, justifyContent: 'center' },
  loadingText: { color: theme.colors.muted, fontSize: 16 },
  eyebrow: { color: theme.colors.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginTop: 16 },
  title: { color: theme.colors.ink, fontSize: 30, fontWeight: '800', lineHeight: 36, marginTop: 12 },
  subtitle: { color: theme.colors.muted, fontSize: 16, lineHeight: 23, marginBottom: 20, marginTop: 10 },
  filterCard: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  filterLabel: { color: theme.colors.ink, fontSize: 14, fontWeight: '700', marginTop: 12 },
  input: {
    backgroundColor: theme.colors.cream,
    borderColor: theme.colors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: theme.colors.ink,
    fontSize: 16,
    marginTop: 6,
    padding: 12,
  },
  chipRow: { gap: 8, marginTop: 8, paddingRight: 8 },
  chip: {
    borderColor: theme.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipSelected: { backgroundColor: theme.colors.ink, borderColor: theme.colors.ink },
  chipText: { color: theme.colors.accent, fontWeight: '700' },
  chipTextSelected: { color: theme.colors.white },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  sortChip: {
    borderColor: theme.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  sortChipText: { color: theme.colors.accent, fontWeight: '700' },
  errorText: { color: '#B42318', fontSize: 13, marginTop: 12, textAlign: 'center' },
  searchActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  searchButton: { backgroundColor: theme.colors.ink, borderRadius: 12, flex: 1, padding: 14 },
  searchButtonText: { color: theme.colors.white, fontWeight: '700', textAlign: 'center' },
  resetButton: { borderColor: theme.colors.border, borderRadius: 12, borderWidth: 1, padding: 14 },
  resetButtonText: { color: theme.colors.accent, fontWeight: '700', textAlign: 'center' },
  resultsHeading: { color: theme.colors.ink, fontSize: 16, fontWeight: '800', marginBottom: 12, marginTop: 22 },
  resultCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    padding: 14,
  },
  resultPhoto: { borderRadius: 28, height: 56, width: 56 },
  resultInitials: {
    alignItems: 'center',
    backgroundColor: theme.colors.blush,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  resultInitialsText: { color: theme.colors.ink, fontSize: 18, fontWeight: '800' },
  resultBody: { flex: 1, marginLeft: 12 },
  resultName: { color: theme.colors.ink, fontSize: 17, fontWeight: '800' },
  resultRating: { color: theme.colors.accent, fontSize: 13, fontWeight: '700', marginTop: 4 },
  resultService: { color: theme.colors.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  resultArea: { color: theme.colors.muted, fontSize: 13, marginTop: 4 },
  emptyText: { color: theme.colors.muted, marginTop: 8, textAlign: 'center' },
});
