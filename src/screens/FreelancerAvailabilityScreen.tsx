import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { theme } from '../constants/theme';
import { getFreelancerProfile } from '../lib/profile';
import {
  getFreelancerAvailability,
  saveFreelancerAvailability,
  type FreelancerAvailability,
} from '../lib/availability';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'FreelancerAvailability'>;
type AvailabilityDraft = { isAvailable: boolean; startTime: string; endTime: string };

const days = [
  { value: 0, label: 'Monday' },
  { value: 1, label: 'Tuesday' },
  { value: 2, label: 'Wednesday' },
  { value: 3, label: 'Thursday' },
  { value: 4, label: 'Friday' },
  { value: 5, label: 'Saturday' },
  { value: 6, label: 'Sunday' },
];

const defaultDraft: AvailabilityDraft = { isAvailable: false, startTime: '09:00', endTime: '18:00' };

function createDefaultDrafts() {
  return Object.fromEntries(days.map((day) => [day.value, { ...defaultDraft }])) as Record<number, AvailabilityDraft>;
}

function toDrafts(availability: FreelancerAvailability[]) {
  const drafts = createDefaultDrafts();
  availability.forEach((slot) => {
    drafts[slot.day_of_week] = {
      isAvailable: slot.is_available,
      startTime: slot.start_time.slice(0, 5),
      endTime: slot.end_time.slice(0, 5),
    };
  });
  return drafts;
}

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function FreelancerAvailabilityScreen({ navigation }: Props) {
  const [drafts, setDrafts] = useState<Record<number, AvailabilityDraft>>(createDefaultDrafts);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoaded(false);
    setLoadError('');

    if (!supabase) {
      setIsLoading(false);
      setIsLoaded(true);
      return;
    }

    setIsLoading(true);
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        navigation.replace('Welcome');
        return;
      }

      const profileResult = await getFreelancerProfile(data.user.id);
      if (!isMounted) {
        return;
      }
      if (profileResult.error) {
        setLoadError(profileResult.error.message);
        setIsLoading(false);
        return;
      }
      if (!profileResult.profile || !profileResult.profile.onboarding_completed) {
        navigation.replace('FreelancerOnboarding');
        return;
      }

      const result = await getFreelancerAvailability(data.user.id);
      if (!isMounted) {
        return;
      }
      if (result.error) {
        setLoadError(result.error.message);
      } else {
        setDrafts(toDrafts(result.availability));
        setIsLoaded(true);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [loadAttempt, navigation]);

  const updateDraft = (dayOfWeek: number, field: keyof AvailabilityDraft, value: boolean | string) => {
    setDrafts((current) => ({
      ...current,
      [dayOfWeek]: { ...current[dayOfWeek], [field]: value },
    }));
  };

  const handleSave = async () => {
    setError('');
    for (const day of days) {
      const draft = drafts[day.value];
      if (!isValidTime(draft.startTime) || !isValidTime(draft.endTime) || draft.endTime <= draft.startTime) {
        setError(`${day.label}: enter valid times in HH:MM format with the end time after the start time.`);
        return;
      }
    }
    if (!supabase || !isLoaded) {
      navigation.goBack();
      return;
    }

    setIsSaving(true);
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setError('Your session has expired. Please sign in again.');
      setIsSaving(false);
      return;
    }

    const result = await saveFreelancerAvailability(
      data.user.id,
      days.map((day) => {
        const draft = drafts[day.value];
        return {
          day_of_week: day.value,
          is_available: draft.isAvailable,
          start_time: draft.startTime,
          end_time: draft.endTime,
        };
      }),
    );
    setIsSaving(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    navigation.goBack();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your availability…</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{loadError}</Text>
        <Pressable style={styles.primaryButton} onPress={() => setLoadAttempt((current) => current + 1)}>
          <Text style={styles.primaryButtonText}>Retry loading availability</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>YOUR AVAILABILITY</Text>
      <Text style={styles.title}>Set your working hours</Text>
      <Text style={styles.subtitle}>
        Customers will only be able to request appointments inside these time windows.
      </Text>
      {days.map((day) => {
        const draft = drafts[day.value];
        return (
          <View key={day.value} style={styles.dayCard}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayLabel}>{day.label}</Text>
              <Pressable
                style={[styles.toggle, draft.isAvailable && styles.toggleActive]}
                onPress={() => updateDraft(day.value, 'isAvailable', !draft.isAvailable)}
              >
                <Text style={[styles.toggleText, draft.isAvailable && styles.toggleTextActive]}>
                  {draft.isAvailable ? 'Available' : 'Unavailable'}
                </Text>
              </Pressable>
            </View>
            {draft.isAvailable && (
              <View style={styles.timeRow}>
                <TextInput
                  value={draft.startTime}
                  onChangeText={(value) => updateDraft(day.value, 'startTime', value)}
                  placeholder="09:00"
                  keyboardType="numbers-and-punctuation"
                  style={styles.timeInput}
                />
                <Text style={styles.toText}>to</Text>
                <TextInput
                  value={draft.endTime}
                  onChangeText={(value) => updateDraft(day.value, 'endTime', value)}
                  placeholder="18:00"
                  keyboardType="numbers-and-punctuation"
                  style={styles.timeInput}
                />
              </View>
            )}
          </View>
        );
      })}
      {!!error && <Text style={styles.errorText}>{error}</Text>}
      <Pressable style={styles.primaryButton} disabled={isSaving} onPress={() => void handleSave()}>
        <Text style={styles.primaryButtonText}>{isSaving ? 'Saving…' : 'Save availability'}</Text>
      </Pressable>
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
  dayCard: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    padding: 16,
  },
  dayHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  dayLabel: { color: theme.colors.ink, fontSize: 16, fontWeight: '800' },
  toggle: {
    borderColor: theme.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toggleActive: { backgroundColor: theme.colors.ink, borderColor: theme.colors.ink },
  toggleText: { color: theme.colors.accent, fontSize: 13, fontWeight: '700' },
  toggleTextActive: { color: theme.colors.white },
  timeRow: { alignItems: 'center', flexDirection: 'row', marginTop: 12 },
  timeInput: {
    backgroundColor: theme.colors.cream,
    borderColor: theme.colors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: theme.colors.ink,
    flex: 1,
    fontSize: 16,
    padding: 12,
    textAlign: 'center',
  },
  toText: { color: theme.colors.muted, marginHorizontal: 10 },
  primaryButton: { backgroundColor: theme.colors.ink, borderRadius: 14, marginTop: 12, padding: 16 },
  primaryButtonText: { color: theme.colors.white, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  errorText: { color: '#B42318', fontSize: 13, marginBottom: 8, marginTop: 12, textAlign: 'center' },
});
