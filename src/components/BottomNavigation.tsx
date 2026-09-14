import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../constants/theme';

type MenuItem = { label: string; icon: string; activeRoutes: string[]; target: 'home' | 'bookings' | 'updates' | 'help' | 'earnings' | 'profile' };

const customerItems: MenuItem[] = [
  { label: 'Discover', icon: '⌂', activeRoutes: ['Customer', 'Search', 'FreelancerProfile', 'CustomerBooking'], target: 'home' },
  { label: 'Bookings', icon: '▣', activeRoutes: ['CustomerBookings', 'CustomerReview'], target: 'bookings' },
  { label: 'Updates', icon: '●', activeRoutes: ['Notifications'], target: 'updates' },
  { label: 'Help', icon: '?', activeRoutes: ['SupportChat'], target: 'help' },
];

const freelancerItems: MenuItem[] = [
  { label: 'Home', icon: '⌂', activeRoutes: ['Freelancer'], target: 'home' },
  { label: 'Bookings', icon: '▣', activeRoutes: ['FreelancerBookings'], target: 'bookings' },
  { label: 'Updates', icon: '●', activeRoutes: ['Notifications'], target: 'updates' },
  { label: 'Earnings', icon: '$', activeRoutes: ['FreelancerEarnings'], target: 'earnings' },
  { label: 'Profile', icon: '◉', activeRoutes: ['FreelancerProfileHub', 'FreelancerOnboarding', 'FreelancerServices', 'FreelancerAvailability', 'Portfolio', 'ClientLogbook'], target: 'profile' },
];

type Props = { audience: 'customer' | 'freelancer'; activeRoute: string; onSelect: (target: MenuItem['target']) => void };

export function BottomNavigation({ audience, activeRoute, onSelect }: Props) {
  const items = audience === 'customer' ? customerItems : freelancerItems;
  return (
    <View style={styles.shell}>
      <View style={styles.menu}>
        {items.map((item) => {
          const active = item.activeRoutes.includes(activeRoute);
          return (
            <Pressable key={item.label} style={[styles.item, active && styles.activeItem]} onPress={() => onSelect(item.target)}>
              <Text style={[styles.icon, active && styles.activeText]}>{item.icon}</Text>
              <Text style={[styles.label, active && styles.activeText]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { backgroundColor: theme.colors.blush, paddingHorizontal: 18, paddingTop: 10 },
  menu: { backgroundColor: theme.colors.white, borderRadius: 22, flexDirection: 'row', padding: 8 },
  item: { alignItems: 'center', borderRadius: 14, flex: 1, minHeight: 60, justifyContent: 'center' },
  activeItem: { backgroundColor: theme.colors.accent },
  icon: { color: theme.colors.ink, fontSize: 18, fontWeight: '800', lineHeight: 20 },
  label: { color: theme.colors.ink, fontSize: 11, fontWeight: '800', marginTop: 3 },
  activeText: { color: theme.colors.white },
});
