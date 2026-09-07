import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { theme } from '../constants/theme';
import { addPortfolioPhoto, deletePortfolioPhoto, getPortfolioPhotos, type PortfolioPhoto } from '../lib/portfolio';
import { getFreelancerProfile } from '../lib/profile';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'Portfolio'>;

export function PortfolioScreen({ navigation }: Props) {
  const [userId, setUserId] = useState('');
  const [photos, setPhotos] = useState<PortfolioPhoto[]>([]);
  const [caption, setCaption] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setError('Connect Supabase before managing your portfolio.');
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

      const photosResult = await getPortfolioPhotos(data.user.id);
      if (!isMounted) {
        return;
      }
      if (photosResult.error) {
        setError(photosResult.error.message);
      } else {
        setUserId(data.user.id);
        setPhotos(photosResult.photos);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [navigation]);

  const refreshPhotos = async () => {
    const photosResult = await getPortfolioPhotos(userId);
    if (photosResult.error) {
      setError(photosResult.error.message);
      return;
    }
    setPhotos(photosResult.photos);
  };

  const handleAdd = async (source: 'library' | 'camera') => {
    setError('');
    if (!supabase) {
      setError('Connect Supabase before managing your portfolio.');
      return;
    }

    setIsWorking(true);
    const result = await addPortfolioPhoto(userId, caption, source);
    setIsWorking(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setCaption('');
    await refreshPhotos();
  };

  const handleDelete = (photo: PortfolioPhoto) => {
    Alert.alert('Remove photo', 'Remove this photo from your portfolio?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setError('');
            setIsWorking(true);
            const result = await deletePortfolioPhoto(userId, photo);
            setIsWorking(false);
            if (result.error) {
              setError(result.error.message);
              return;
            }
            await refreshPhotos();
          })();
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your portfolio…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>PORTFOLIO</Text>
      <Text style={styles.title}>Showcase your work</Text>
      <Text style={styles.subtitle}>
        Add before-and-after photos and service examples. Customers see these on your profile.
      </Text>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
      <View style={styles.addCard}>
        <Text style={styles.addLabel}>New photo caption (optional)</Text>
        <TextInput
          value={caption}
          onChangeText={setCaption}
          placeholder="e.g. Classic set on a returning client"
          style={styles.input}
        />
        <Pressable style={styles.primaryButton} disabled={isWorking} onPress={() => void handleAdd('library')}>
          <Text style={styles.primaryButtonText}>{isWorking ? 'Working…' : 'Choose from library'}</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} disabled={isWorking} onPress={() => void handleAdd('camera')}>
          <Text style={styles.secondaryButtonText}>Take a photo</Text>
        </Pressable>
      </View>
      <Text style={styles.galleryHeading}>
        {photos.length} photo{photos.length === 1 ? '' : 's'}
      </Text>
      {photos.map((photo) => (
        <View key={photo.id} style={styles.photoCard}>
          <Image source={{ uri: photo.photo_url }} style={styles.photo} />
          <View style={styles.photoBody}>
            {!!photo.caption && <Text style={styles.photoCaption}>{photo.caption}</Text>}
            <Text style={styles.photoMeta}>Added {photo.created_at.slice(0, 10)}</Text>
            <Pressable style={styles.removeButton} disabled={isWorking} onPress={() => handleDelete(photo)}>
              <Text style={styles.removeButtonText}>Remove</Text>
            </Pressable>
          </View>
        </View>
      ))}
      {!photos.length && <Text style={styles.emptyText}>No portfolio photos yet. Add your first one above.</Text>}
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
  addCard: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  addLabel: { color: theme.colors.ink, fontSize: 14, fontWeight: '700' },
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
  primaryButton: { backgroundColor: theme.colors.ink, borderRadius: 12, marginTop: 14, padding: 14 },
  primaryButtonText: { color: theme.colors.white, fontWeight: '700', textAlign: 'center' },
  secondaryButton: { borderColor: theme.colors.border, borderRadius: 12, borderWidth: 1, marginTop: 10, padding: 14 },
  secondaryButtonText: { color: theme.colors.accent, fontWeight: '700', textAlign: 'center' },
  galleryHeading: { color: theme.colors.ink, fontSize: 16, fontWeight: '800', marginBottom: 12, marginTop: 22 },
  photoCard: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    padding: 14,
  },
  photo: { borderRadius: 12, height: 96, width: 96 },
  photoBody: { flex: 1, marginLeft: 12 },
  photoCaption: { color: theme.colors.ink, fontSize: 14, fontWeight: '700' },
  photoMeta: { color: theme.colors.muted, fontSize: 12, marginTop: 6 },
  removeButton: { borderColor: theme.colors.border, borderRadius: 10, borderWidth: 1, marginTop: 12, padding: 10 },
  removeButtonText: { color: '#B42318', fontWeight: '700', textAlign: 'center' },
  errorText: { color: '#B42318', fontSize: 13, marginBottom: 12, textAlign: 'center' },
  emptyText: { color: theme.colors.muted, marginTop: 8, textAlign: 'center' },
});
