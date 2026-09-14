import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { theme } from '../constants/theme';
import { pickProfilePhotoUrl } from '../lib/portfolio';
import { draftFreelancerBio, getOnboardingGuidance, researchLashTrends, type ResearchSource } from '../lib/ai';
import {
  clearFreelancerOnboardingDraft,
  getFreelancerOnboardingDraft,
  saveFreelancerOnboardingDraft,
  type FreelancerOnboardingDraft,
} from '../lib/onboardingDraft';
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
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [baseCoordinates, setBaseCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isPickingPhoto, setIsPickingPhoto] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftStatus, setDraftStatus] = useState('');
  const [isDraftingBio, setIsDraftingBio] = useState(false);
  const [trendIdeas, setTrendIdeas] = useState('');
  const [trendSources, setTrendSources] = useState<ResearchSource[]>([]);
  const [isResearchingTrends, setIsResearchingTrends] = useState(false);
  const [starterMenu, setStarterMenu] = useState('');
  const [profileReview, setProfileReview] = useState('');
  const [isSuggestingMenu, setIsSuggestingMenu] = useState(false);
  const [isReviewingProfile, setIsReviewingProfile] = useState(false);

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

      const [accountResult, result, draftResult] = await Promise.all([
        getProfile(data.user.id),
        getFreelancerProfile(data.user.id),
        getFreelancerOnboardingDraft(data.user.id),
      ]);
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
        setProfilePhotoUrl(result.profile.profile_photo_url);
        if (result.profile.base_latitude !== null && result.profile.base_longitude !== null) {
          setBaseCoordinates({ latitude: result.profile.base_latitude, longitude: result.profile.base_longitude });
        }
      } else if (draftResult.error) {
        setError(draftResult.error.message);
      } else if (draftResult.draft) {
        applyDraft(draftResult.draft);
        setDraftStatus('Your saved draft has been restored.');
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [navigation]);

  const getDraftValues = (): FreelancerOnboardingDraft => ({
    displayName,
    bio,
    experienceYears,
    serviceArea,
    maxTravelDistance,
    travelFee,
    profilePhotoUrl,
    baseCoordinates,
  });

  const applyDraft = (draft: FreelancerOnboardingDraft) => {
    setDisplayName(draft.displayName ?? '');
    setBio(draft.bio ?? '');
    setExperienceYears(draft.experienceYears ?? '0');
    setServiceArea(draft.serviceArea ?? '');
    setMaxTravelDistance(draft.maxTravelDistance ?? '10');
    setTravelFee(draft.travelFee ?? '0');
    setProfilePhotoUrl(draft.profilePhotoUrl ?? null);
    setBaseCoordinates(draft.baseCoordinates ?? null);
  };

  const handleSaveDraft = async () => {
    setError('');
    setDraftStatus('');
    if (!supabase) {
      setError('Connect Supabase before saving a draft.');
      return;
    }

    setIsSavingDraft(true);
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setError('Your session has expired. Please sign in again.');
      setIsSavingDraft(false);
      return;
    }

    const result = await saveFreelancerOnboardingDraft(data.user.id, getDraftValues());
    setIsSavingDraft(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setDraftStatus('Draft saved. You can come back and continue anytime.');
  };

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
      profile_photo_url: profilePhotoUrl,
      base_latitude: baseCoordinates?.latitude ?? null,
      base_longitude: baseCoordinates?.longitude ?? null,
    });
    setIsSaving(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    void clearFreelancerOnboardingDraft(data.user.id);
    navigation.goBack();
  };

  const setCurrentBaseLocation = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') { setError('Location permission is required to set your search location.'); return; }
    const current = await Location.getCurrentPositionAsync({});
    setBaseCoordinates({ latitude: current.coords.latitude, longitude: current.coords.longitude });
  };

  const handleChoosePhoto = async () => {
    setError('');
    if (!supabase) {
      setError('Connect Supabase before adding a profile photo.');
      return;
    }

    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setError('Your session has expired. Please sign in again.');
      return;
    }

    setIsPickingPhoto(true);
    const result = await pickProfilePhotoUrl(data.user.id);
    setIsPickingPhoto(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    if (result.url) {
      setProfilePhotoUrl(result.url);
    }
  };

  const handleDraftBio = async () => {
    setError('');
    if (!displayName.trim() || !serviceArea.trim()) { setError('Add your display name and service area first.'); return; }
    setIsDraftingBio(true);
    const result = await draftFreelancerBio(`Name: ${displayName.trim()}\nService area: ${serviceArea.trim()}\nExperience: ${experienceYears} years\nCurrent bio: ${bio.trim() || 'None'}`);
    setIsDraftingBio(false);
    if (result.error || !result.draft) { setError(result.error?.message ?? 'Unable to draft a bio.'); return; }
    setBio(result.draft);
  };

  const handleResearchTrends = async () => {
    setError('');
    if (!serviceArea.trim()) { setError('Add your service area first.'); return; }
    setIsResearchingTrends(true);
    const result = await researchLashTrends(`Service area: ${serviceArea.trim()}. Artist name: ${displayName.trim() || 'Mobile lash artist'}.`);
    setIsResearchingTrends(false);
    if (result.error || !result.draft) { setError(result.error?.message ?? 'Unable to research lash trends.'); return; }
    setTrendIdeas(result.draft);
    setTrendSources(result.sources);
  };

  const onboardingContext = () => `Name: ${displayName.trim() || 'Not provided'}\nBio: ${bio.trim() || 'Not provided'}\nExperience: ${experienceYears || 'Not provided'} years\nService area: ${serviceArea.trim() || 'Not provided'}\nTravel distance: ${maxTravelDistance || 'Not provided'} km\nTravel fee: RM${travelFee || 'Not provided'}\nProfile photo: ${profilePhotoUrl ? 'Added' : 'Not added'}`;

  const handleSuggestMenu = async () => {
    setError('');
    if (!serviceArea.trim()) { setError('Add your service area first.'); return; }
    setIsSuggestingMenu(true);
    const result = await getOnboardingGuidance('starter_service_menu', onboardingContext());
    setIsSuggestingMenu(false);
    if (result.error || !result.draft) { setError(result.error?.message ?? 'Unable to suggest a starter menu.'); return; }
    setStarterMenu(result.draft);
  };

  const handleReviewProfile = async () => {
    setError('');
    setIsReviewingProfile(true);
    const result = await getOnboardingGuidance('profile_review', onboardingContext());
    setIsReviewingProfile(false);
    if (result.error || !result.draft) { setError(result.error?.message ?? 'Unable to review your profile.'); return; }
    setProfileReview(result.draft);
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
      <Text style={styles.subtitle}>Your photo is shown to customers when they find you in search.</Text>
      <View style={styles.photoRow}>
        {profilePhotoUrl ? (
          <Image source={{ uri: profilePhotoUrl }} style={styles.profilePhoto} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderText}>Add a photo</Text>
          </View>
        )}
        <View style={styles.photoActions}>
          <Pressable style={styles.photoButton} disabled={isPickingPhoto} onPress={() => void handleChoosePhoto()}>
            <Text style={styles.photoButtonText}>{isPickingPhoto ? 'Uploading…' : 'Choose profile photo'}</Text>
          </Pressable>
          {!!profilePhotoUrl && (
            <Pressable style={styles.photoRemoveButton} onPress={() => setProfilePhotoUrl(null)}>
              <Text style={styles.photoRemoveButtonText}>Remove photo</Text>
            </Pressable>
          )}
        </View>
      </View>
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
      <Pressable style={styles.photoButton} disabled={isDraftingBio} onPress={() => void handleDraftBio()}>
        <Text style={styles.photoButtonText}>{isDraftingBio ? 'Drafting…' : 'Draft bio with AI'}</Text>
      </Pressable>
      <Pressable style={styles.photoButton} disabled={isResearchingTrends} onPress={() => void handleResearchTrends()}>
        <Text style={styles.photoButtonText}>{isResearchingTrends ? 'Researching…' : 'Research lash trends'}</Text>
      </Pressable>
      <Pressable style={styles.photoButton} disabled={isSuggestingMenu} onPress={() => void handleSuggestMenu()}>
        <Text style={styles.photoButtonText}>{isSuggestingMenu ? 'Suggesting…' : 'Suggest starter menu'}</Text>
      </Pressable>
      <Pressable style={styles.photoButton} disabled={isReviewingProfile} onPress={() => void handleReviewProfile()}>
        <Text style={styles.photoButtonText}>{isReviewingProfile ? 'Reviewing…' : 'Review my profile'}</Text>
      </Pressable>
      {!!trendIdeas && (
        <View style={styles.researchCard}>
          <Text style={styles.researchTitle}>Content ideas</Text>
          <Text style={styles.researchBody}>{trendIdeas}</Text>
          {!!trendSources.length && <Text style={styles.researchSources}>Sources: {trendSources.map((source) => source.title).join(' · ')}</Text>}
        </View>
      )}
      {!!starterMenu && (
        <View style={styles.researchCard}>
          <Text style={styles.researchTitle}>Suggested starter menu</Text>
          <Text style={styles.researchBody}>{starterMenu}</Text>
        </View>
      )}
      {!!profileReview && (
        <View style={styles.researchCard}>
          <Text style={styles.researchTitle}>Profile checklist</Text>
          <Text style={styles.researchBody}>{profileReview}</Text>
        </View>
      )}
      <Pressable style={styles.photoButton} onPress={() => void setCurrentBaseLocation()}>
        <Text style={styles.photoButtonText}>{baseCoordinates ? 'Search location saved' : 'Set search location'}</Text>
      </Pressable>
      <Text style={styles.fieldLabel}>Years of experience</Text>
      <Text style={styles.fieldHint}>Enter the number of full years you have worked as a lash technician.</Text>
      <TextInput
        placeholder="For example: 3 years"
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
      <Text style={styles.helperText}>
        Choose how far you are willing to travel to customers and the fixed fee you charge for travelling. For example, 10 km and RM20 means you accept bookings within 10 km and add RM20 to the booking total.
      </Text>
      <Text style={styles.fieldLabel}>Maximum travel distance (km)</Text>
      <Text style={styles.fieldHint}>For example: 10 means you accept bookings up to 10 km away.</Text>
      <TextInput
        placeholder="For example: 10 km"
        value={maxTravelDistance}
        onChangeText={setMaxTravelDistance}
        keyboardType="decimal-pad"
        style={styles.input}
      />
      <Text style={styles.fieldLabel}>Base travel fee (RM)</Text>
      <Text style={styles.fieldHint}>This fixed amount is added to each booking within your travel area.</Text>
      <TextInput
        placeholder="For example: RM20"
        value={travelFee}
        onChangeText={setTravelFee}
        keyboardType="decimal-pad"
        style={styles.input}
      />
      {!!error && <Text style={styles.errorText}>{error}</Text>}
      {!!draftStatus && <Text style={styles.draftStatus}>{draftStatus}</Text>}
      <Pressable style={styles.draftButton} disabled={isSavingDraft || isSaving} onPress={() => void handleSaveDraft()}>
        <Text style={styles.draftButtonText}>{isSavingDraft ? 'Saving draft…' : 'Save draft'}</Text>
      </Pressable>
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
  photoRow: { alignItems: 'center', flexDirection: 'row', marginBottom: 14 },
  profilePhoto: { borderRadius: 44, height: 88, width: 88 },
  photoPlaceholder: {
    alignItems: 'center',
    backgroundColor: theme.colors.blush,
    borderRadius: 44,
    height: 88,
    justifyContent: 'center',
    width: 88,
  },
  photoPlaceholderText: { color: theme.colors.ink, fontSize: 13, fontWeight: '700' },
  photoActions: { flex: 1, marginLeft: 16 },
  photoButton: { backgroundColor: theme.colors.ink, borderRadius: 12, padding: 14 },
  photoButtonText: { color: theme.colors.white, fontWeight: '700', textAlign: 'center' },
  researchCard: { backgroundColor: theme.colors.white, borderColor: theme.colors.border, borderRadius: 12, borderWidth: 1, marginTop: 12, padding: 14 },
  researchTitle: { color: theme.colors.ink, fontWeight: '800' },
  researchBody: { color: theme.colors.muted, lineHeight: 20, marginTop: 8 },
  researchSources: { color: theme.colors.muted, fontSize: 12, marginTop: 10 },
  photoRemoveButton: { borderColor: theme.colors.border, borderRadius: 12, borderWidth: 1, marginTop: 10, padding: 12 },
  photoRemoveButtonText: { color: '#B42318', fontWeight: '700', textAlign: 'center' },
  sectionLabel: { color: theme.colors.ink, fontSize: 16, fontWeight: '800', marginBottom: 12, marginTop: 10 },
  helperText: { color: theme.colors.muted, fontSize: 13, lineHeight: 19, marginBottom: 14, marginTop: -4 },
  fieldLabel: { color: theme.colors.ink, fontSize: 15, fontWeight: '800', marginBottom: 4, marginTop: 2 },
  fieldHint: { color: theme.colors.muted, fontSize: 13, lineHeight: 18, marginBottom: 8 },
  draftStatus: { color: '#067647', fontSize: 13, marginBottom: 10, textAlign: 'center' },
  draftButton: { borderColor: theme.colors.ink, borderRadius: 14, borderWidth: 1, marginTop: 8, padding: 16 },
  draftButtonText: { color: theme.colors.ink, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  primaryButton: { backgroundColor: theme.colors.ink, borderRadius: 14, marginTop: 8, padding: 16 },
  primaryButtonText: { color: theme.colors.white, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  errorText: { color: '#B42318', fontSize: 13, marginBottom: 8, textAlign: 'center' },
});
