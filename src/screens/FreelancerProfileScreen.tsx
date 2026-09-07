import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { theme } from '../constants/theme';
import { getFreelancerMarketplaceProfile, type FreelancerMarketplaceProfile } from '../lib/marketplace';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'FreelancerProfile'>;

const previewProfile: FreelancerMarketplaceProfile = {
  freelancer: {
    id: 'preview-freelancer-1',
    display_name: 'Sarah Lee',
    bio: 'Certified lash artist with five years of experience and a fully equipped mobile studio.',
    experience_years: 5,
    service_area: 'Rawang, Kuala Selangor',
    travel_fee: 5,
    profile_photo_url: null,
    onboarding_completed: true,
  },
  services: [
    {
      id: 'preview-listing-1',
      service_id: 'preview-service-lash-lift',
      description: 'Gentle, long-lasting lifts tailored to your natural lashes.',
      duration_minutes: 60,
      price: 85,
      service: {
        id: 'preview-service-lash-lift',
        name: 'Lash Lift',
        description: 'A natural curl and lift for your lashes.',
        duration_minutes: 60,
        base_price: 80,
      },
    },
    {
      id: 'preview-listing-2',
      service_id: 'preview-service-classic',
      description: 'Full-volume classic sets applied with medical-grade adhesive.',
      duration_minutes: 120,
      price: 130,
      service: {
        id: 'preview-service-classic',
        name: 'Classic Lash Extension',
        description: 'Lightweight one-to-one extensions for everyday definition.',
        duration_minutes: 120,
        base_price: 120,
      },
    },
  ],
  portfolio: [],
  rating: { averageRating: 4.9, reviewCount: 27 },
  completedBookings: 31,
};

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

export function FreelancerProfileScreen({ navigation, route }: Props) {
  const isPreview = route.params?.preview ?? false;
  const [profile, setProfile] = useState<FreelancerMarketplaceProfile | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isPreview) {
      setProfile(previewProfile);
      setIsLoading(false);
      return;
    }
    if (!supabase) {
      setError('Connect Supabase before viewing freelancer profiles.');
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    void getFreelancerMarketplaceProfile(route.params.freelancerId).then((result) => {
      if (!isMounted) {
        return;
      }
      if (result.error || !result.profile) {
        setError(result.error?.message ?? 'This freelancer profile is not available.');
      } else {
        setProfile(result.profile);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [isPreview, route.params.freelancerId]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading profile…</Text>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{error || 'This freelancer profile is not available.'}</Text>
      </View>
    );
  }

  const { freelancer, services, portfolio, rating, completedBookings } = profile;
  const ratingLabel =
    rating.averageRating !== null ? `★ ${rating.averageRating.toFixed(1)} · ${rating.reviewCount} reviews` : 'New artist';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        {freelancer.profile_photo_url ? (
          <Image source={{ uri: freelancer.profile_photo_url }} style={styles.profilePhoto} />
        ) : (
          <View style={styles.profileInitials}>
            <Text style={styles.profileInitialsText}>{getInitials(freelancer.display_name)}</Text>
          </View>
        )}
        <View style={styles.headerBody}>
          <Text style={styles.name}>{freelancer.display_name}</Text>
          <Text style={styles.rating}>{ratingLabel}</Text>
          <Text style={styles.completed}>{completedBookings} completed bookings</Text>
        </View>
      </View>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.body}>{freelancer.bio || 'This artist has not added a bio yet.'}</Text>
        <Text style={styles.meta}>Experience: {freelancer.experience_years} year{freelancer.experience_years === 1 ? '' : 's'}</Text>
        <Text style={styles.meta}>Serves: {freelancer.service_area || 'Not set'}</Text>
        {!!freelancer.travel_fee && <Text style={styles.meta}>Travel fee: RM{freelancer.travel_fee.toFixed(2)}</Text>}
      </View>
      {!!portfolio.length && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Portfolio</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.portfolioRow}>
            {portfolio.map((photo) => (
              <View key={photo.id} style={styles.portfolioItem}>
                <Image source={{ uri: photo.photo_url }} style={styles.portfolioPhoto} />
                {!!photo.caption && <Text style={styles.portfolioCaption}>{photo.caption}</Text>}
              </View>
            ))}
          </ScrollView>
        </View>
      )}
      <Text style={styles.servicesHeading}>Services</Text>
      {services.map((offering) => (
        <View key={offering.id} style={styles.sectionCard}>
          <Text style={styles.serviceName}>{offering.service.name}</Text>
          <Text style={styles.serviceMeta}>
            RM{offering.price.toFixed(2)} · {offering.duration_minutes} minutes
          </Text>
          <Text style={styles.body}>{offering.description || offering.service.description}</Text>
          {isPreview ? (
            <Text style={styles.previewNote}>Bookings are disabled in preview mode.</Text>
          ) : (
            <Pressable
              style={styles.bookButton}
              onPress={() => navigation.navigate('CustomerBooking', { preselectedServiceId: offering.id })}
            >
              <Text style={styles.bookButtonText}>Book {offering.service.name}</Text>
            </Pressable>
          )}
        </View>
      ))}
      {!services.length && <Text style={styles.emptyText}>This artist has no active services yet.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingBottom: 48 },
  loadingContainer: { alignItems: 'center', backgroundColor: theme.colors.cream, flex: 1, justifyContent: 'center', padding: 24 },
  loadingText: { color: theme.colors.muted, fontSize: 16 },
  errorText: { color: '#B42318', fontSize: 14, textAlign: 'center' },
  headerRow: { alignItems: 'center', flexDirection: 'row', marginTop: 16 },
  profilePhoto: { borderRadius: 44, height: 88, width: 88 },
  profileInitials: {
    alignItems: 'center',
    backgroundColor: theme.colors.blush,
    borderRadius: 44,
    height: 88,
    justifyContent: 'center',
    width: 88,
  },
  profileInitialsText: { color: theme.colors.ink, fontSize: 28, fontWeight: '800' },
  headerBody: { flex: 1, marginLeft: 16 },
  name: { color: theme.colors.ink, fontSize: 26, fontWeight: '800' },
  rating: { color: theme.colors.accent, fontSize: 14, fontWeight: '700', marginTop: 4 },
  completed: { color: theme.colors.muted, fontSize: 13, marginTop: 4 },
  sectionCard: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 16,
    padding: 16,
  },
  sectionTitle: { color: theme.colors.ink, fontSize: 16, fontWeight: '800' },
  body: { color: theme.colors.muted, lineHeight: 21, marginTop: 8 },
  meta: { color: theme.colors.muted, fontSize: 13, marginTop: 6 },
  portfolioRow: { gap: 12, marginTop: 12 },
  portfolioItem: { maxWidth: 180 },
  portfolioPhoto: { borderRadius: 12, height: 140, width: 140 },
  portfolioCaption: { color: theme.colors.muted, fontSize: 12, marginTop: 6 },
  servicesHeading: { color: theme.colors.ink, fontSize: 18, fontWeight: '800', marginBottom: 4, marginTop: 22 },
  serviceName: { color: theme.colors.ink, fontSize: 17, fontWeight: '800' },
  serviceMeta: { color: theme.colors.accent, fontSize: 13, fontWeight: '700', marginTop: 4 },
  bookButton: { backgroundColor: theme.colors.ink, borderRadius: 12, marginTop: 12, padding: 13 },
  bookButtonText: { color: theme.colors.white, fontWeight: '700', textAlign: 'center' },
  previewNote: { color: theme.colors.muted, fontSize: 13, fontStyle: 'italic', marginTop: 12 },
  emptyText: { color: theme.colors.muted, marginTop: 12, textAlign: 'center' },
});
