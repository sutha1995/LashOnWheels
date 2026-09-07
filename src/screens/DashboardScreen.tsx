import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { theme } from '../constants/theme';
import { hasSupabaseConfig } from '../lib/env';
import { getFreelancerProfile } from '../lib/profile';
import { getServiceCatalog, type Service } from '../lib/serviceCatalog';
import { supabase } from '../lib/supabase';
import { signOut } from '../services/auth';

type Props = NativeStackScreenProps<RootStackParamList, 'Customer' | 'Freelancer' | 'Admin'>;

const copy = {
  customer: {
    eyebrow: 'YOUR BEAUTY, YOUR WAY',
    title: 'Find your perfect lash artist',
    body: 'Browse trusted professionals who bring salon-quality services to your door.',
  },
  freelancer: {
    eyebrow: 'YOUR BUSINESS, ON THE MOVE',
    title: 'Grow your beauty business',
    body: 'Build your professional profile, then add services and availability as the marketplace grows.',
    cards: [
      { title: 'Professional profile', body: 'Tell customers what makes your work special.' },
      { title: 'Services and pricing', body: 'Set your own prices for each lash service.' },
      { title: 'Availability', body: 'Define weekly working hours and days off.' },
    ],
  },
  admin: {
    eyebrow: 'PLATFORM OVERVIEW',
    title: 'Lash On Wheels control centre',
    body: 'Manage users, freelancers, services, and bookings from one place.',
    cards: [
      { title: 'Verify freelancers', body: 'Freelancer verification is coming soon.' },
      { title: 'Review bookings', body: 'Inspect every appointment and its current lifecycle.' },
      { title: 'View analytics', body: 'Platform analytics are coming soon.' },
    ],
  },
} as const;

const previewCatalogServices: Service[] = [
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

export function DashboardScreen({ navigation, route }: Props) {
  const [serviceAccessError, setServiceAccessError] = useState('');
  const [catalogServices, setCatalogServices] = useState<Service[]>([]);
  const [catalogError, setCatalogError] = useState('');
  const role = route.params?.role ?? 'customer';
  const isPreview = route.params?.preview ?? false;
  const content = copy[role];

  useEffect(() => {
    if (role !== 'customer' || isPreview || !supabase) {
      return;
    }

    let isMounted = true;
    void getServiceCatalog().then((result) => {
      if (!isMounted) {
        return;
      }
      if (result.error) {
        setCatalogError(result.error.message);
      } else {
        setCatalogServices(result.services);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isPreview, role]);

  const openFreelancerServices = async () => {
    setServiceAccessError('');
    if (!supabase) {
      navigation.navigate('FreelancerServices');
      return;
    }

    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setServiceAccessError('Your session has expired. Please sign in again.');
      return;
    }

    const result = await getFreelancerProfile(data.user.id);
    if (result.error) {
      setServiceAccessError(result.error.message);
      return;
    }
    if (!result.profile || !result.profile.onboarding_completed) {
      setServiceAccessError('Complete your freelancer profile before adding services.');
      navigation.navigate('FreelancerOnboarding');
      return;
    }

    navigation.navigate('FreelancerServices');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>{content.eyebrow}</Text>
      <Text style={styles.title}>{content.title}</Text>
      <Text style={styles.body}>{content.body}</Text>
      <View style={styles.section}>
        {role === 'freelancer' &&
          copy.freelancer.cards.map((card) => (
            <View key={card.title} style={styles.card}>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardBody}>{card.body}</Text>
            </View>
          ))}
        {role === 'admin' &&
          copy.admin.cards.map((card) => (
            <View key={card.title} style={styles.card}>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardBody}>{card.body}</Text>
            </View>
          ))}
        {role === 'customer' && (
          <>
            {(isPreview ? previewCatalogServices : catalogServices).map((service) => (
              <Pressable
                key={service.id}
                style={styles.card}
                onPress={() => navigation.navigate('Search', { serviceId: service.id, preview: isPreview || undefined })}
              >
                <Text style={styles.cardNumber}>LASH SERVICES</Text>
                <Text style={styles.cardTitle}>{service.name}</Text>
                <Text style={styles.cardBody}>{service.description}</Text>
                <Text style={styles.cardPrice}>
                  From RM{service.base_price.toFixed(2)} · {service.duration_minutes} minutes
                </Text>
              </Pressable>
            ))}
            {!!catalogError && <Text style={styles.errorText}>{catalogError}</Text>}
            {!isPreview && !catalogServices.length && !catalogError && (
              <Text style={styles.emptyText}>No services are published yet.</Text>
            )}
          </>
        )}
      </View>
      {role === 'admin' && (
        <View style={styles.previewSection}>
          <Text style={styles.previewTitle}>Booking oversight</Text>
          <Text style={styles.previewBody}>Review every customer appointment and its current lifecycle status.</Text>
          <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('AdminBookings')}>
            <Text style={styles.primaryButtonText}>Review all bookings</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('Notifications')}>
            <Text style={styles.secondaryButtonText}>View notifications</Text>
          </Pressable>
        </View>
      )}
      {role === 'admin' && (
        <View style={styles.previewSection}>
          <Text style={styles.previewTitle}>Preview customer and freelancer experiences</Text>
          <Text style={styles.previewBody}>
            These read-only previews do not change your admin permissions or grant access to protected data.
          </Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Customer', { role: 'customer', preview: true })}
          >
            <Text style={styles.primaryButtonText}>Preview customer experience</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Freelancer', { role: 'freelancer', preview: true })}
          >
            <Text style={styles.secondaryButtonText}>Preview freelancer experience</Text>
          </Pressable>
        </View>
      )}
      {role === 'customer' && !isPreview && (
        <>
          <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('Search')}>
            <Text style={styles.primaryButtonText}>Search freelancers</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('CustomerBooking')}>
            <Text style={styles.secondaryButtonText}>Browse all services</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('CustomerBookings')}>
            <Text style={styles.secondaryButtonText}>View my bookings</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('Notifications')}>
            <Text style={styles.secondaryButtonText}>View notifications</Text>
          </Pressable>
        </>
      )}
      {role === 'customer' && isPreview && (
        <View style={styles.previewSection}>
          <Text style={styles.previewTitle}>Preview customer tools</Text>
          <Text style={styles.previewBody}>
            Review how search, booking history, and status updates will appear for customers.
          </Text>
          <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('Search', { preview: true })}>
            <Text style={styles.primaryButtonText}>Preview search</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('CustomerBookings', { preview: true })}
          >
            <Text style={styles.secondaryButtonText}>Preview booking history</Text>
          </Pressable>
        </View>
      )}
      {role === 'freelancer' && !isPreview && (
        <>
          <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('FreelancerOnboarding')}>
            <Text style={styles.primaryButtonText}>Complete freelancer profile</Text>
          </Pressable>
          {!!serviceAccessError && <Text style={styles.errorText}>{serviceAccessError}</Text>}
          <Pressable style={styles.secondaryButton} onPress={() => void openFreelancerServices()}>
            <Text style={styles.secondaryButtonText}>Manage services and pricing</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('Portfolio')}>
            <Text style={styles.secondaryButtonText}>Manage portfolio photos</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('FreelancerAvailability')}>
            <Text style={styles.secondaryButtonText}>Set availability</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('FreelancerBookings')}>
            <Text style={styles.secondaryButtonText}>Manage bookings</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('FreelancerEarnings')}>
            <Text style={styles.secondaryButtonText}>View earnings</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('Notifications')}>
            <Text style={styles.secondaryButtonText}>View notifications</Text>
          </Pressable>
        </>
      )}
      {role === 'freelancer' && isPreview && (
        <View style={styles.previewSection}>
          <Text style={styles.previewTitle}>Preview freelancer tools</Text>
          <Text style={styles.previewBody}>
            Review example pricing and availability without accessing protected freelancer data.
          </Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => navigation.navigate('FreelancerServices', { preview: true })}
          >
            <Text style={styles.primaryButtonText}>Preview services and pricing</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('FreelancerAvailability', { preview: true })}
          >
            <Text style={styles.secondaryButtonText}>Preview availability</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('FreelancerBookings', { preview: true })}
          >
            <Text style={styles.secondaryButtonText}>Preview booking inbox</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('FreelancerEarnings', { preview: true })}
          >
            <Text style={styles.secondaryButtonText}>Preview earnings</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Notifications', { preview: true })}
          >
            <Text style={styles.secondaryButtonText}>Preview notifications</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('LocationTracking', { preview: true })}
          >
            <Text style={styles.secondaryButtonText}>Preview travel tracking</Text>
          </Pressable>
        </View>
      )}
      {isPreview ? (
        <Pressable style={styles.signOutButton} onPress={() => navigation.goBack()}>
          <Text style={styles.signOutText}>Back to Admin control centre</Text>
        </Pressable>
      ) : (
        <Pressable
          style={styles.signOutButton}
          onPress={() => {
            if (!hasSupabaseConfig) {
              navigation.replace('Welcome');
              return;
            }
            void signOut();
          }}
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24 },
  eyebrow: { color: theme.colors.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginTop: 16 },
  title: { color: theme.colors.ink, fontSize: 34, fontWeight: '800', lineHeight: 40, marginTop: 12 },
  body: { color: theme.colors.muted, fontSize: 17, lineHeight: 25, marginTop: 14 },
  section: { gap: 12, marginTop: 30 },
  previewSection: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 24,
    padding: 18,
  },
  previewTitle: { color: theme.colors.ink, fontSize: 18, fontWeight: '800' },
  previewBody: { color: theme.colors.muted, lineHeight: 20, marginTop: 6 },
  card: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  cardNumber: { color: theme.colors.accent, fontSize: 12, fontWeight: '800' },
  cardTitle: { color: theme.colors.ink, fontSize: 18, fontWeight: '800', marginTop: 12 },
  cardBody: { color: theme.colors.muted, marginTop: 6 },
  cardPrice: { color: theme.colors.accent, fontSize: 13, fontWeight: '700', marginTop: 10 },
  signOutButton: { borderColor: theme.colors.border, borderRadius: 14, borderWidth: 1, marginTop: 28, padding: 15 },
  signOutText: { color: theme.colors.accent, fontWeight: '700', textAlign: 'center' },
  primaryButton: { backgroundColor: theme.colors.ink, borderRadius: 14, marginTop: 24, padding: 16 },
  primaryButtonText: { color: theme.colors.white, fontWeight: '700', textAlign: 'center' },
  secondaryButton: { borderColor: theme.colors.border, borderRadius: 14, borderWidth: 1, marginTop: 12, padding: 15 },
  secondaryButtonText: { color: theme.colors.accent, fontWeight: '700', textAlign: 'center' },
  errorText: { color: '#B42318', fontSize: 13, marginTop: 12, textAlign: 'center' },
  emptyText: { color: theme.colors.muted, marginTop: 12, textAlign: 'center' },
});
