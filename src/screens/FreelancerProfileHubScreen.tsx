import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { theme } from '../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'FreelancerProfileHub'>;

export function FreelancerProfileHubScreen({ navigation }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>YOUR BUSINESS</Text>
      <Text style={styles.title}>Profile and business setup</Text>
      <Text style={styles.body}>Manage the details customers see and how you run your mobile lash service.</Text>
      <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('FreelancerOnboarding')}><Text style={styles.primaryButtonText}>Edit freelancer profile</Text></Pressable>
      <Pressable style={styles.button} onPress={() => navigation.navigate('FreelancerServices')}><Text style={styles.buttonText}>Services and pricing</Text></Pressable>
      <Pressable style={styles.button} onPress={() => navigation.navigate('FreelancerAvailability')}><Text style={styles.buttonText}>Availability</Text></Pressable>
      <Pressable style={styles.button} onPress={() => navigation.navigate('Portfolio')}><Text style={styles.buttonText}>Portfolio photos</Text></Pressable>
      <Pressable style={styles.button} onPress={() => navigation.navigate('SupportChat')}><Text style={styles.buttonText}>Chat with support</Text></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24 },
  eyebrow: { color: theme.colors.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginTop: 16 },
  title: { color: theme.colors.ink, fontSize: 30, fontWeight: '800', lineHeight: 36, marginTop: 12 },
  body: { color: theme.colors.muted, fontSize: 16, lineHeight: 23, marginTop: 12 },
  primaryButton: { backgroundColor: theme.colors.ink, borderRadius: 14, marginTop: 28, padding: 16 },
  primaryButtonText: { color: theme.colors.white, fontWeight: '700', textAlign: 'center' },
  button: { borderColor: theme.colors.border, borderRadius: 14, borderWidth: 1, marginTop: 12, padding: 16 },
  buttonText: { color: theme.colors.accent, fontWeight: '700', textAlign: 'center' },
});
