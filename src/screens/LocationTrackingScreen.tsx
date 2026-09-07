import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { theme } from '../constants/theme';
import { getFreelancerLocation, saveFreelancerLocation, type FreelancerLocation } from '../lib/locations';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'LocationTracking'>;

const previewLocation: FreelancerLocation = {
  booking_id: 'preview-2',
  freelancer_id: 'preview-freelancer',
  latitude: 3.139,
  longitude: 101.6869,
  accuracy_meters: 18,
  sharing_enabled: true,
  updated_at: '2026-09-22T10:20:00Z',
};

function formatUpdatedAt(updatedAt: string) {
  return new Date(updatedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export function LocationTrackingScreen({ navigation, route }: Props) {
  const isPreview = route.params?.preview ?? false;
  const bookingId = route.params?.bookingId;
  const trackedFreelancerId = route.params?.freelancerId;
  const isFreelancerMode = !!bookingId && !trackedFreelancerId && !isPreview;
  const [location, setLocation] = useState<FreelancerLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState('');
  const subscription = useRef<Location.LocationSubscription | null>(null);
  const locationRef = useRef<FreelancerLocation | null>(null);
  const sharingGeneration = useRef(0);
  const writeQueue = useRef(Promise.resolve());

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  const queueWrite = useCallback(<T,>(operation: () => Promise<T>) => {
    const result = writeQueue.current.then(operation, operation);
    writeQueue.current = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }, []);

  const stopSharing = useCallback(
    async (silent = false) => {
      const generation = ++sharingGeneration.current;
      subscription.current?.remove();
      subscription.current = null;
      if (!supabase || !bookingId || !isFreelancerMode) {
        if (!silent) {
          setIsSharing(false);
        }
        return;
      }

      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        if (!silent) {
          navigation.replace('Welcome');
        }
        return;
      }
      const currentLocation = locationRef.current;
      if (!currentLocation) {
        if (!silent) {
          setIsSharing(false);
        }
        return;
      }

      const result = await queueWrite(() =>
        saveFreelancerLocation(bookingId, data.user.id, {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          accuracy_meters: currentLocation.accuracy_meters,
          sharing_enabled: false,
        }),
      );
      if (generation !== sharingGeneration.current) {
        return;
      }
      if (result.error) {
        if (!silent) {
          setError(result.error.message);
        }
        return;
      }
      if (!silent) {
        setLocation(result.location);
        setIsSharing(false);
      }
    },
    [bookingId, isFreelancerMode, navigation, queueWrite],
  );

  useEffect(() => {
    let isMounted = true;
    const loadLocation = async () => {
      if (isPreview) {
        setLocation(previewLocation);
        setIsSharing(false);
        setIsLoading(false);
        return;
      }
      if (!supabase) {
        setError('Connect Supabase before using location tracking.');
        setIsLoading(false);
        return;
      }

      const { data } = await supabase.auth.getUser();
      if (!isMounted) {
        return;
      }
      if (!data.user) {
        navigation.replace('Welcome');
        return;
      }

      if (!bookingId) {
        setError('Open a confirmed appointment from the booking inbox to share travel location.');
        setIsLoading(false);
        return;
      }
      const result = await getFreelancerLocation(bookingId);
      if (!isMounted) {
        return;
      }
      if (result.error) {
        setError(result.error.message);
      } else {
        setLocation(result.location);
        setIsSharing(result.location?.sharing_enabled ?? false);
      }
      setIsLoading(false);
    };

    void loadLocation();
    return () => {
      isMounted = false;
      void stopSharing(true);
    };
  }, [bookingId, isPreview, navigation, stopSharing, trackedFreelancerId]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        void stopSharing(true);
      }
    });
    return () => subscription.remove();
  }, [stopSharing]);

  const updateLocation = async (position: Location.LocationObject, generation: number) => {
    if (!supabase || !bookingId || generation !== sharingGeneration.current) {
      return false;
    }
    const { data } = await supabase.auth.getUser();
    if (!data.user || generation !== sharingGeneration.current) {
      return false;
    }

    const result = await queueWrite(() =>
      saveFreelancerLocation(bookingId, data.user.id, {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy_meters: position.coords.accuracy,
        sharing_enabled: true,
      }),
    );
    if (generation !== sharingGeneration.current) {
      return false;
    }
    if (result.error) {
      setError(result.error.message);
      return false;
    }
    setLocation(result.location);
    return true;
  };

  const startSharing = async () => {
    setError('');
    const generation = ++sharingGeneration.current;
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setError('Location permission is required before sharing your travel position.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (!(await updateLocation(position, generation))) {
        return;
      }
      subscription.current?.remove();
      subscription.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 50, timeInterval: 30000 },
        (nextPosition) => {
          void updateLocation(nextPosition, generation);
        },
      );
      if (generation === sharingGeneration.current) {
        setIsSharing(true);
      } else {
        subscription.current.remove();
        subscription.current = null;
      }
    } catch (caughtError) {
      if (generation === sharingGeneration.current) {
        await stopSharing(true);
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to start location sharing.');
        setIsSharing(false);
      }
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading location status…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>{isPreview ? 'TRAVEL TRACKING PREVIEW' : 'TRAVEL TRACKING'}</Text>
      <Text style={styles.title}>{isFreelancerMode ? 'Share your travel status' : 'Track your lash artist'}</Text>
      <Text style={styles.subtitle}>
        {isPreview
          ? 'Review the privacy-aware location experience before connecting a maps provider.'
          : isFreelancerMode
            ? 'Share your approximate live position only while traveling to a confirmed appointment.'
            : 'A confirmed booking can show the freelancer’s latest shared position while they travel.'}
      </Text>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {location?.sharing_enabled ? 'Location sharing is active' : 'Location sharing is off'}
        </Text>
        <Text style={styles.cardBody}>
          {location
            ? `Last update: ${formatUpdatedAt(location.updated_at)}`
            : 'No location has been shared for this booking yet.'}
        </Text>
        {location && (
          <Text style={styles.meta}>
            Accuracy: {location.accuracy_meters ? `${Math.round(location.accuracy_meters)} meters` : 'unavailable'}
          </Text>
        )}
        {isPreview ? (
          <Text style={styles.previewNote}>
            The production flow will request foreground device permission and update this record while sharing is
            enabled.
          </Text>
        ) : isFreelancerMode ? (
          <Pressable
            style={isSharing ? styles.stopButton : styles.primaryButton}
            onPress={() => void (isSharing ? stopSharing() : startSharing())}
          >
            <Text style={isSharing ? styles.stopButtonText : styles.primaryButtonText}>
              {isSharing ? 'Stop sharing location' : 'Start sharing location'}
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.previewNote}>
            Location access is limited to customers with a confirmed booking and active freelancer sharing.
          </Text>
        )}
      </View>
      <Pressable style={styles.secondaryButton} onPress={() => navigation.goBack()}>
        <Text style={styles.secondaryButtonText}>{isPreview ? 'Back to preview' : 'Back to dashboard'}</Text>
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
    marginTop: 24,
    padding: 18,
  },
  cardTitle: { color: theme.colors.ink, fontSize: 18, fontWeight: '800' },
  cardBody: { color: theme.colors.muted, lineHeight: 21, marginTop: 8 },
  meta: { color: theme.colors.muted, fontSize: 13, marginTop: 8 },
  previewNote: { color: theme.colors.muted, lineHeight: 20, marginTop: 16 },
  primaryButton: { backgroundColor: theme.colors.ink, borderRadius: 14, marginTop: 20, padding: 16 },
  primaryButtonText: { color: theme.colors.white, fontWeight: '700', textAlign: 'center' },
  stopButton: { borderColor: '#F1B5B0', borderRadius: 14, borderWidth: 1, marginTop: 20, padding: 15 },
  stopButtonText: { color: '#B42318', fontWeight: '700', textAlign: 'center' },
  secondaryButton: { borderColor: theme.colors.border, borderRadius: 14, borderWidth: 1, marginTop: 24, padding: 15 },
  secondaryButtonText: { color: theme.colors.accent, fontWeight: '700', textAlign: 'center' },
});
