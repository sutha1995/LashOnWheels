import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { theme } from '../constants/theme';
import { getFreelancerProfile, getProfile, saveFreelancerProfile } from '../lib/profile';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'FreelancerOnboarding'>;

export function FreelancerOnboardingScreen({ navigation }: Props) {
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [experienceYears, setExperienceYears] = useState('0');
  const [serviceArea, setServiceArea] = useState('');
  const [maxTravelDistance, setMaxTravelDistance] = useState('10');
  const [travelFee, setTravelFee] = useState('0');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        navigation.replace('Welcome');
        return;
      }

      const [accountResult, result] = await Promise.all([getProfile(data.user.id), getFreelancerProfile(data.user.id)]);
      if (!isMounted) {
        return;
      }
      if (accountResult.error) {
        setError(accountResult.error.message);
      } else if (
        !accountResult.profile ||
        (accountResult.profile.role !== 'freelancer' && accountResult.profile.requested_role !== 'freelancer')
      ) {
        navigation.replace('Customer', { role: 'customer' });
        return;
      } else if (result.error) {
        setError(result.error.message);
      } else if (result.profile) {
        setDisplayName(result.profile.display_name);
        setBio(result.profile.bio);
        setExperienceYears(String(result.profile.experience_years));
        setServiceArea(result.profile.service_area);
        setMaxTravelDistance(String(result.profile.max_travel_distance_km));
        setTravelFee(String(result.profile.travel_fee));
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [navigation]);

  const handleSave = async () => {
    setError('');
    const experience = Number(experienceYears);
    const maxDistance = Number(maxTravelDistance);
    const fee = Number(travelFee);
    if (!displayName.trim() || !serviceArea.trim()) {
      setError('Add your display name and service area.');
      return;
    }
    if (!Number.isInteger(experience) || experience < 0 || experience > 80) {
      setError('Years of experience must be a whole number from 0 to 80.');
      return;
    }
    if (!Number.isFinite(maxDistance) || maxDistance <= 0 || maxDistance > 500) {
      setError('Maximum travel distance must be greater than 0 and no more than 500 km.');
      return;
    }
    if (!Number.isFinite(fee) || fee < 0 || fee > 9999.99) {
      setError('Travel fee must be between RM0 and RM9,999.99.');
      return;
    }
    if (!supabase) {
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

    const result = await saveFreelancerProfile(data.user.id, {
      display_name: displayName.trim(),
      bio: bio.trim(),
      experience_years: experience,
      service_area: serviceArea.trim(),
      max_travel_distance_km: maxDistance,
      travel_fee: fee,
    });
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
        <Text style={styles.loadingText}>Loading your profile…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>FREELANCER ONBOARDING</Text>
      <Text style={styles.title}>Tell customers about your work</Text>
      <Text style={styles.subtitle}>You can add services, portfolio photos, and availability next.</Text>
      <TextInput
        placeholder="Professional display name"
        value={displayName}
        onChangeText={setDisplayName}
        style={styles.input}
      />
      <TextInput
        placeholder="Short bio"
        value={bio}
        onChangeText={setBio}
        multiline
        style={[styles.input, styles.multilineInput]}
      />
      <TextInput
        placeholder="Years of experience"
        value={experienceYears}
        onChangeText={setExperienceYears}
        keyboardType="numeric"
        style={styles.input}
      />
      <TextInput
        placeholder="Service area (e.g. Rawang, Selangor)"
        value={serviceArea}
        onChangeText={setServiceArea}
        style={styles.input}
      />
      <Text style={styles.sectionLabel}>Travel settings</Text>
      <TextInput
        placeholder="Maximum travel distance in km"
        value={maxTravelDistance}
        onChangeText={setMaxTravelDistance}
        keyboardType="decimal-pad"
        style={styles.input}
      />
      <TextInput
        placeholder="Base travel fee in RM"
        value={travelFee}
        onChangeText={setTravelFee}
        keyboardType="decimal-pad"
        style={styles.input}
      />
      {!!error && <Text style={styles.errorText}>{error}</Text>}
      <Pressable style={styles.primaryButton} disabled={isSaving} onPress={() => void handleSave()}>
        <Text style={styles.primaryButtonText}>{isSaving ? 'Saving…' : 'Save and continue'}</Text>
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
  subtitle: { color: theme.colors.muted, fontSize: 16, lineHeight: 23, marginBottom: 26, marginTop: 10 },
  input: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: theme.colors.ink,
    fontSize: 16,
    marginBottom: 14,
    padding: 16,
  },
  multilineInput: { minHeight: 110, textAlignVertical: 'top' },
  sectionLabel: { color: theme.colors.ink, fontSize: 16, fontWeight: '800', marginBottom: 12, marginTop: 10 },
  primaryButton: { backgroundColor: theme.colors.ink, borderRadius: 14, marginTop: 8, padding: 16 },
  primaryButtonText: { color: theme.colors.white, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  errorText: { color: '#B42318', fontSize: 13, marginBottom: 8, textAlign: 'center' },
});
