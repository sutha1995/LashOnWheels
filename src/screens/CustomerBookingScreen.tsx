import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { theme } from '../constants/theme';
import { createBooking, getMarketplaceServices, type MarketplaceService } from '../lib/bookings';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'CustomerBooking'>;

function getTomorrow() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().slice(0, 10);
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.getUTCFullYear() === Number(value.slice(0, 4)) &&
    date.getUTCMonth() + 1 === Number(value.slice(5, 7)) &&
    date.getUTCDate() === Number(value.slice(8, 10))
  );
}

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function addMinutes(time: string, minutes: number) {
  const [hours, mins] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  if (totalMinutes >= 24 * 60) {
    return '23:59';
  }
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
}

export function CustomerBookingScreen({ navigation }: Props) {
  const [services, setServices] = useState<MarketplaceService[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [scheduledDate, setScheduledDate] = useState(getTomorrow);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [customerNote, setCustomerNote] = useState('');
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
        setSelectedServiceId(result.services[0]?.id ?? '');
        if (result.services[0]) {
          setEndTime(addMinutes(startTime, result.services[0].duration_minutes));
        }
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId),
    [selectedServiceId, services],
  );

  const selectService = (service: MarketplaceService) => {
    setSelectedServiceId(service.id);
    setEndTime(addMinutes(startTime, service.duration_minutes));
  };

  const handleBook = async () => {
    setError('');
    if (!selectedServiceId) {
      setError('Choose a service first.');
      return;
    }
    if (!isValidDate(scheduledDate) || new Date(`${scheduledDate}T00:00:00Z`) < new Date()) {
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

    setIsSaving(true);
    const result = await createBooking(selectedServiceId, {
      scheduled_date: scheduledDate,
      start_time: startTime,
      end_time: endTime,
      customer_note: customerNote.trim(),
    });
    setIsSaving(false);
    if (result.error || !result.booking) {
      setError(result.error?.message ?? 'Unable to create the booking.');
      return;
    }
    navigation.goBack();
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
  primaryButton: { backgroundColor: theme.colors.ink, borderRadius: 14, marginTop: 16, padding: 16 },
  primaryButtonText: { color: theme.colors.white, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  errorText: { color: '#B42318', fontSize: 13, marginBottom: 12, textAlign: 'center' },
  emptyText: { color: theme.colors.muted, marginTop: 24, textAlign: 'center' },
});
