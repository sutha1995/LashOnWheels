import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { theme } from '../constants/theme';
import { hasSupabaseConfig } from '../lib/env';
import { signOut } from '../services/auth';

type Props = NativeStackScreenProps<RootStackParamList, 'Customer' | 'Freelancer' | 'Admin'>;

const copy = {
  customer: {
    eyebrow: 'YOUR BEAUTY, YOUR WAY',
    title: 'Find your perfect lash artist',
    body: 'Browse trusted professionals who bring salon-quality services to your door.',
    cards: ['Lash Lift', 'Classic Extensions', 'Lash Tint'],
  },
  freelancer: {
    eyebrow: 'YOUR BUSINESS, ON THE MOVE',
    title: 'Grow your beauty business',
    body: 'Set your availability, manage bookings, and bring your craft to more customers.',
    cards: ['Complete your profile', 'Add your services', 'Set your availability'],
  },
  admin: {
    eyebrow: 'PLATFORM OVERVIEW',
    title: 'Lash On Wheels control centre',
    body: 'Manage users, freelancers, services, and bookings from one place.',
    cards: ['Verify freelancers', 'Review bookings', 'View analytics'],
  },
} as const;

export function DashboardScreen({ navigation, route }: Props) {
  const content = copy[route.params?.role ?? 'customer'];
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>{content.eyebrow}</Text>
      <Text style={styles.title}>{content.title}</Text>
      <Text style={styles.body}>{content.body}</Text>
      <View style={styles.section}>
        {content.cards.map((card, index) => (
          <View key={card} style={styles.card}>
            <Text style={styles.cardNumber}>0{index + 1}</Text>
            <Text style={styles.cardTitle}>{card}</Text>
            <Text style={styles.cardBody}>Ready for Phase {index + 1} implementation.</Text>
          </View>
        ))}
      </View>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24 },
  eyebrow: { color: theme.colors.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginTop: 16 },
  title: { color: theme.colors.ink, fontSize: 34, fontWeight: '800', lineHeight: 40, marginTop: 12 },
  body: { color: theme.colors.muted, fontSize: 17, lineHeight: 25, marginTop: 14 },
  section: { gap: 12, marginTop: 30 },
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
  signOutButton: { borderColor: theme.colors.border, borderRadius: 14, borderWidth: 1, marginTop: 28, padding: 15 },
  signOutText: { color: theme.colors.accent, fontWeight: '700', textAlign: 'center' },
});
