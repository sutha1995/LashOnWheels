import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { theme } from '../constants/theme';
import {
  deactivateFreelancerService,
  getFreelancerServices,
  getServiceCatalog,
  saveFreelancerService,
  type FreelancerService,
  type Service,
} from '../lib/serviceCatalog';
import { getFreelancerProfile } from '../lib/profile';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'FreelancerServices'>;
type Draft = { description: string; duration: string; price: string };

const previewServices = [
  {
    name: 'Lash Lift',
    description: 'A natural curl and lift for your lashes.',
    price: 'RM120',
    duration: '60 minutes',
  },
  {
    name: 'Lash Tint',
    description: 'A darker lash look without daily mascara.',
    price: 'RM80',
    duration: '45 minutes',
  },
  {
    name: 'Classic Lash Extension',
    description: 'Lightweight individual extensions for an everyday look.',
    price: 'RM180',
    duration: '120 minutes',
  },
];

export function FreelancerServicesScreen({ navigation, route }: Props) {
  const isPreview = route.params?.preview ?? false;
  const [catalog, setCatalog] = useState<Service[]>([]);
  const [offeredServices, setOfferedServices] = useState<FreelancerService[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [savingServiceId, setSavingServiceId] = useState('');

  const offeredByServiceId = useMemo(
    () => new Map(offeredServices.map((service) => [service.service_id, service])),
    [offeredServices],
  );

  useEffect(() => {
    if (isPreview) {
      setIsLoading(false);
      return;
    }
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

      const profileResult = await getFreelancerProfile(data.user.id);
      if (profileResult.error) {
        if (isMounted) {
          setError(profileResult.error.message);
          setIsLoading(false);
        }
        return;
      }
      if (!profileResult.profile || !profileResult.profile.onboarding_completed) {
        navigation.replace('FreelancerOnboarding');
        return;
      }

      const [catalogResult, offeredResult] = await Promise.all([
        getServiceCatalog(),
        getFreelancerServices(data.user.id),
      ]);
      if (!isMounted) {
        return;
      }
      if (catalogResult.error || offeredResult.error) {
        setError(catalogResult.error?.message ?? offeredResult.error?.message ?? 'Unable to load services.');
      } else {
        setCatalog(catalogResult.services);
        setOfferedServices(offeredResult.services);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [isPreview, navigation]);

  const getDraft = (service: Service): Draft => {
    const existing = offeredByServiceId.get(service.id);
    return (
      drafts[service.id] ?? {
        description: existing?.description ?? service.description,
        duration: String(existing?.duration_minutes ?? service.duration_minutes),
        price: String(existing?.price ?? service.base_price),
      }
    );
  };

  const updateDraft = (service: Service, field: keyof Draft, value: string) => {
    setDrafts((currentDrafts) => {
      const current = currentDrafts[service.id] ?? getDraft(service);
      return { ...currentDrafts, [service.id]: { ...current, [field]: value } };
    });
  };

  const handleSave = async (service: Service) => {
    setError('');
    const draft = getDraft(service);
    const duration = Number(draft.duration);
    const price = Number(draft.price);
    if (!Number.isInteger(duration) || duration <= 0 || duration > 1440) {
      setError(`${service.name}: duration must be a whole number from 1 to 1,440 minutes.`);
      return;
    }
    if (!Number.isFinite(price) || price < 0 || price > 99999999.99) {
      setError(`${service.name}: price must be between RM0 and RM99,999,999.99.`);
      return;
    }
    if (!supabase) {
      setError('Connect Supabase before saving services.');
      return;
    }

    setSavingServiceId(service.id);
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setError('Your session has expired. Please sign in again.');
      setSavingServiceId('');
      return;
    }
    const result = await saveFreelancerService(data.user.id, service.id, {
      description: draft.description.trim(),
      duration_minutes: duration,
      price,
    });
    setSavingServiceId('');
    if (result.error || !result.service) {
      setError(result.error?.message ?? 'Unable to save this service.');
      return;
    }
    setOfferedServices((current) => [
      ...current.filter((item) => item.service_id !== service.id),
      result.service as FreelancerService,
    ]);
  };

  const handleDeactivate = async (service: Service) => {
    if (!supabase) {
      return;
    }
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setError('Your session has expired. Please sign in again.');
      return;
    }
    const result = await deactivateFreelancerService(data.user.id, service.id);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setOfferedServices((current) => current.filter((item) => item.service_id !== service.id));
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading service catalog…</Text>
      </View>
    );
  }

  if (isPreview) {
    return (
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>SERVICES AND PRICING PREVIEW</Text>
        <Text style={styles.title}>Example freelancer pricing</Text>
        <Text style={styles.subtitle}>
          This read-only preview shows how services and pricing will appear to customers.
        </Text>
        {previewServices.map((service) => (
          <View key={service.name} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleBlock}>
                <Text style={styles.cardTitle}>{service.name}</Text>
                <Text style={styles.cardDescription}>{service.description}</Text>
              </View>
              <Text style={styles.activeLabel}>PREVIEW</Text>
            </View>
            <Text style={styles.previewValue}>{service.price}</Text>
            <Text style={styles.previewMeta}>{service.duration}</Text>
          </View>
        ))}
        <Pressable style={styles.secondaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryButtonText}>Back to freelancer preview</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>SERVICES AND PRICING</Text>
      <Text style={styles.title}>Choose what you offer</Text>
      <Text style={styles.subtitle}>Set your own price and duration for each service you provide.</Text>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
      {catalog.map((service) => {
        const offered = offeredByServiceId.has(service.id);
        const draft = getDraft(service);
        return (
          <View key={service.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleBlock}>
                <Text style={styles.cardTitle}>{service.name}</Text>
                <Text style={styles.cardDescription}>{service.description}</Text>
              </View>
              {offered && <Text style={styles.activeLabel}>ACTIVE</Text>}
            </View>
            <TextInput
              placeholder="Your price in RM"
              value={draft.price}
              onChangeText={(value) => updateDraft(service, 'price', value)}
              keyboardType="decimal-pad"
              style={styles.input}
            />
            <TextInput
              placeholder="Duration in minutes"
              value={draft.duration}
              onChangeText={(value) => updateDraft(service, 'duration', value)}
              keyboardType="numeric"
              style={styles.input}
            />
            <TextInput
              placeholder="Optional service description"
              value={draft.description}
              onChangeText={(value) => updateDraft(service, 'description', value)}
              multiline
              style={[styles.input, styles.multilineInput]}
            />
            <Pressable
              style={styles.primaryButton}
              disabled={savingServiceId === service.id}
              onPress={() => void handleSave(service)}
            >
              <Text style={styles.primaryButtonText}>
                {savingServiceId === service.id ? 'Saving…' : offered ? 'Update service' : 'Add service'}
              </Text>
            </Pressable>
            {offered && (
              <Pressable style={styles.secondaryButton} onPress={() => void handleDeactivate(service)}>
                <Text style={styles.secondaryButtonText}>Remove from profile</Text>
              </Pressable>
            )}
          </View>
        );
      })}
      {!catalog.length && <Text style={styles.emptyText}>No active services are available yet.</Text>}
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
  card: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    padding: 18,
  },
  cardHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  cardTitleBlock: { flex: 1, paddingRight: 10 },
  cardTitle: { color: theme.colors.ink, fontSize: 19, fontWeight: '800' },
  cardDescription: { color: theme.colors.muted, lineHeight: 20, marginTop: 6 },
  activeLabel: { color: theme.colors.success, fontSize: 11, fontWeight: '800' },
  previewValue: { color: theme.colors.ink, fontSize: 24, fontWeight: '800', marginTop: 18 },
  previewMeta: { color: theme.colors.muted, fontSize: 14, marginTop: 4 },
  input: {
    backgroundColor: theme.colors.cream,
    borderColor: theme.colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: theme.colors.ink,
    fontSize: 16,
    marginTop: 12,
    padding: 14,
  },
  multilineInput: { minHeight: 78, textAlignVertical: 'top' },
  primaryButton: { backgroundColor: theme.colors.ink, borderRadius: 12, marginTop: 14, padding: 14 },
  primaryButtonText: { color: theme.colors.white, fontWeight: '700', textAlign: 'center' },
  secondaryButton: { borderColor: theme.colors.border, borderRadius: 12, borderWidth: 1, marginTop: 10, padding: 13 },
  secondaryButtonText: { color: theme.colors.accent, fontWeight: '700', textAlign: 'center' },
  errorText: { color: '#B42318', fontSize: 13, marginBottom: 12, textAlign: 'center' },
  emptyText: { color: theme.colors.muted, textAlign: 'center' },
});
