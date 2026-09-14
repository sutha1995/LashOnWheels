import { useEffect, useMemo, useState } from 'react';
import * as Location from 'expo-location';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { theme } from '../constants/theme';
import { createBooking, getMarketplaceServices, type MarketplaceService } from '../lib/bookings';
import { calculateBookingTotal } from '../lib/bookingRules';
import { addMinutesToTime, formatDateKey, getTomorrowDateKey, isValidDate, isValidTime } from '../lib/datetime';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'CustomerBooking'>;

export function CustomerBookingScreen({ navigation, route }: Props) {
  const [services, setServices] = useState<MarketplaceService[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [scheduledDate, setScheduledDate] = useState(getTomorrowDateKey);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [customerNote, setCustomerNote] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medications, setMedications] = useState('');
  const [healthDisclosureConsent, setHealthDisclosureConsent] = useState(false);
  const [serviceConsent, setServiceConsent] = useState(false);
  const [serviceAddress, setServiceAddress] = useState('');
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    void getMarketplaceServices().then((result) => {
      if (!isMounted) {
        return;
      }
      if (result.error) {
        setError(result.error.message);
      } else {
        setServices(result.services);
        const preselected = result.services.find(
          (service) => service.id === route.params?.preselectedServiceId,
        );
        const initialService = preselected ?? result.services[0];
        setSelectedServiceId(initialService?.id ?? '');
        if (initialService) {
          setEndTime(addMinutesToTime(startTime, initialService.duration_minutes));
        }
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [route.params?.preselectedServiceId]);

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId),
    [selectedServiceId, services],
  );

  const selectService = (service: MarketplaceService) => {
    setSelectedServiceId(service.id);
    setEndTime(addMinutesToTime(startTime, service.duration_minutes));
  };

  const handleBook = async () => {
    setError('');
    if (!selectedServiceId) {
      setError('Choose a service first.');
      return;
    }
    if (!isValidDate(scheduledDate) || scheduledDate <= formatDateKey(new Date())) {
      setError('Choose a valid future date in YYYY-MM-DD format.');
      return;
    }
    if (!isValidTime(startTime) || !isValidTime(endTime) || endTime <= startTime) {
      setError('Enter valid times in HH:MM format with the end time after the start time.');
      return;
    }
    if (!supabase) {
      setError('Connect Supabase before creating a booking.');
      return;
    }
    if (!serviceAddress.trim()) {
      setError('Enter the address where the service will be provided.');
      return;
    }
    if (!coordinates) {
      setError('Use your current location to confirm the service location.');
      return;
    }
    if ((allergies.trim() || medications.trim()) && !healthDisclosureConsent) {
      setError('Confirm consent before sharing allergies or medications with the assigned freelancer.');
      return;
    }
    if (!serviceConsent) {
      setError('Confirm the treatment consent before requesting a booking.');
      return;
    }

    setIsSaving(true);
    const result = await createBooking(selectedServiceId, {
      scheduled_date: scheduledDate,
      start_time: startTime,
      end_time: endTime,
      customer_note: customerNote.trim(),
      service_address: serviceAddress.trim(),
      ...coordinates,
      allergies: allergies.trim(),
      medications: medications.trim(),
      health_disclosure_consent: healthDisclosureConsent,
      service_consent: serviceConsent,
    });
    setIsSaving(false);
    if (result.error || !result.booking) {
      setError(result.error?.message ?? 'Unable to create the booking.');
      return;
    }
    navigation.goBack();
  };

  const useCurrentLocation = async () => {
    setError('');
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      setError('Location permission is required to confirm the service location.');
      return;
    }
    const current = await Location.getCurrentPositionAsync({});
    setCoordinates({ latitude: current.coords.latitude, longitude: current.coords.longitude });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading available services…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>BOOK A LASH SERVICE</Text>
      <Text style={styles.title}>Choose a service and time</Text>
      <Text style={styles.subtitle}>
        Select an active freelancer service, then request a time inside their working hours.
      </Text>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
      {services.map((service) => (
        <Pressable
          key={service.id}
          style={[styles.serviceCard, service.id === selectedServiceId && styles.serviceCardSelected]}
          onPress={() => selectService(service)}
        >
          <Text style={styles.serviceName}>{service.service.name}</Text>
          <Text style={styles.serviceMeta}>
            {service.freelancer.display_name} · RM{service.price.toFixed(2)} · {service.duration_minutes} minutes
          </Text>
          <Text style={styles.serviceDescription}>{service.description || service.service.description}</Text>
        </Pressable>
      ))}
      {!services.length && <Text style={styles.emptyText}>No freelancer services are available yet.</Text>}
      {!!selectedService && (
        <View style={styles.formCard}>
          <Text style={styles.formLabel}>Date</Text>
          <TextInput
            value={scheduledDate}
            onChangeText={setScheduledDate}
            placeholder="YYYY-MM-DD"
            style={styles.input}
          />
          <Text style={styles.formLabel}>Start time</Text>
          <TextInput
            value={startTime}
            onChangeText={setStartTime}
            placeholder="10:00"
            keyboardType="numbers-and-punctuation"
            style={styles.input}
          />
          <Text style={styles.formLabel}>End time</Text>
          <TextInput
            value={endTime}
            onChangeText={setEndTime}
            placeholder="11:00"
            keyboardType="numbers-and-punctuation"
            style={styles.input}
          />
          <Text style={styles.formLabel}>Note for the freelancer</Text>
          <TextInput
            value={customerNote}
            onChangeText={setCustomerNote}
            placeholder="Optional location or appointment note"
            multiline
            style={[styles.input, styles.multilineInput]}
          />
          <Text style={styles.formLabel}>Service address</Text>
          <TextInput
            value={serviceAddress}
            onChangeText={setServiceAddress}
            placeholder="Street, area, postcode, city"
            multiline
            style={[styles.input, styles.multilineInput]}
          />
          <Text style={styles.healthTitle}>Optional treatment information</Text>
          <Text style={styles.healthBody}>Share only allergies or medications that may affect a lash treatment. This is not medical advice and is visible only to the assigned freelancer for this booking.</Text>
          <Text style={styles.formLabel}>Relevant allergies</Text>
          <TextInput value={allergies} onChangeText={setAllergies} placeholder="Optional" multiline style={[styles.input, styles.multilineInput]} />
          <Text style={styles.formLabel}>Relevant medications</Text>
          <TextInput value={medications} onChangeText={setMedications} placeholder="Optional" multiline style={[styles.input, styles.multilineInput]} />
          <Pressable style={styles.consentRow} onPress={() => setHealthDisclosureConsent((value) => !value)}>
            <Text style={styles.consentBox}>{healthDisclosureConsent ? '✓' : ''}</Text>
            <Text style={styles.consentText}>I consent to share this information with the assigned freelancer for this appointment.</Text>
          </Pressable>
          <Text style={styles.consentTitle}>Treatment consent</Text>
          <Text style={styles.healthBody}>Please review before requesting. This cosmetic service is not medical care; the freelancer may decline or stop if they believe it is unsafe. Share any changes before the appointment and follow the aftercare provided.</Text>
          <Pressable style={styles.consentRow} onPress={() => setServiceConsent((value) => !value)}>
            <Text style={styles.consentBox}>{serviceConsent ? '✓' : ''}</Text>
            <Text style={styles.consentText}>I confirm the information is accurate and consent to this treatment consultation and service.</Text>
          </Pressable>
          <Pressable style={styles.locationButton} onPress={() => void useCurrentLocation()}>
            <Text style={styles.locationButtonText}>
              {coordinates ? 'Service location confirmed' : 'Use my current location'}
            </Text>
          </Pressable>
          <Text style={styles.totalText}>
            Total: RM{calculateBookingTotal(selectedService.price, selectedService.freelancer.travel_fee).toFixed(2)}
            {selectedService.freelancer.travel_fee > 0
              ? ` (includes RM${selectedService.freelancer.travel_fee.toFixed(2)} travel fee)`
              : ''}
          </Text>
          <Pressable style={styles.primaryButton} disabled={isSaving} onPress={() => void handleBook()}>
            <Text style={styles.primaryButtonText}>{isSaving ? 'Requesting…' : 'Request booking'}</Text>
          </Pressable>
        </View>
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
  serviceCard: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    padding: 16,
  },
  serviceCardSelected: { borderColor: theme.colors.ink, borderWidth: 2 },
  serviceName: { color: theme.colors.ink, fontSize: 17, fontWeight: '800' },
  serviceMeta: { color: theme.colors.accent, fontSize: 13, fontWeight: '700', marginTop: 6 },
  serviceDescription: { color: theme.colors.muted, lineHeight: 20, marginTop: 6 },
  formCard: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
    padding: 16,
  },
  formLabel: { color: theme.colors.ink, fontSize: 14, fontWeight: '700', marginTop: 10 },
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
  multilineInput: { minHeight: 76, textAlignVertical: 'top' },
  healthTitle: { color: theme.colors.ink, fontSize: 16, fontWeight: '800', marginTop: 20 },
  consentTitle: { color: theme.colors.ink, fontSize: 16, fontWeight: '800', marginTop: 20 },
  healthBody: { color: theme.colors.muted, fontSize: 13, lineHeight: 19, marginTop: 6 },
  consentRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 10, marginTop: 12 },
  consentBox: { borderColor: theme.colors.accent, borderRadius: 4, borderWidth: 1, color: theme.colors.accent, fontWeight: '800', height: 20, textAlign: 'center', width: 20 },
  consentText: { color: theme.colors.muted, flex: 1, fontSize: 13, lineHeight: 19 },
  primaryButton: { backgroundColor: theme.colors.ink, borderRadius: 14, marginTop: 16, padding: 16 },
  primaryButtonText: { color: theme.colors.white, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  locationButton: { borderColor: theme.colors.border, borderRadius: 10, borderWidth: 1, marginTop: 12, padding: 12 },
  locationButtonText: { color: theme.colors.accent, fontWeight: '700', textAlign: 'center' },
  totalText: { color: theme.colors.ink, fontSize: 16, fontWeight: '800', marginTop: 14 },
  errorText: { color: '#B42318', fontSize: 13, marginBottom: 12, textAlign: 'center' },
  emptyText: { color: theme.colors.muted, marginTop: 24, textAlign: 'center' },
});
