import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import logo from './assets/lash-on-wheels-logo.png';
import { theme } from './src/constants/theme';
import { AuthScreen } from './src/screens/AuthScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { FreelancerOnboardingScreen } from './src/screens/FreelancerOnboardingScreen';
import { FreelancerServicesScreen } from './src/screens/FreelancerServicesScreen';
import { SupabaseStatus } from './src/components/SupabaseStatus';
import { ensureProfile, type UserRole } from './src/lib/profile';
import { supabase } from './src/lib/supabase';

export type RootStackParamList = {
  Welcome: undefined;
  Auth: undefined;
  Customer: { role: 'customer'; preview?: boolean };
  Freelancer: { role: 'freelancer'; preview?: boolean };
  FreelancerOnboarding: undefined;
  FreelancerServices: undefined;
  Admin: { role: 'admin'; preview?: boolean };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function WelcomeScreen({ navigation }: { navigation: { navigate: (screen: 'Auth') => void } }) {
  return (
    <View style={styles.container}>
      <Image source={logo} style={styles.logo} resizeMode="contain" />
      <Text style={styles.tagline}>Professional lash services, wherever you are.</Text>
      <SupabaseStatus />
      <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('Auth')}>
        <Text style={styles.primaryButtonText}>Get started</Text>
      </Pressable>
      <StatusBar style="dark" />
    </View>
  );
}

export default function App() {
  const [isAuthLoading, setIsAuthLoading] = useState(Boolean(supabase));
  const [hasSession, setHasSession] = useState(false);
  const [role, setRole] = useState<UserRole>('customer');
  const [requestedRole, setRequestedRole] = useState<'customer' | 'freelancer'>('customer');

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isMounted = true;
    let authVersion = 0;
    const updateAuthState = async (user: User | null) => {
      const version = ++authVersion;
      if (!user) {
        if (!isMounted || version !== authVersion) {
          return;
        }
        setHasSession(false);
        setRole('customer');
        setRequestedRole('customer');
        setIsAuthLoading(false);
        return;
      }

      setIsAuthLoading(true);
      const { profile } = await ensureProfile(user);
      if (!isMounted || version !== authVersion) {
        return;
      }
      setHasSession(true);
      setRole(profile?.role ?? 'customer');
      setRequestedRole(profile?.requested_role ?? 'customer');
      setIsAuthLoading(false);
    };

    void supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        void updateAuthState(data.session?.user ?? null);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      void updateAuthState(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  if (isAuthLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        key={hasSession ? 'authenticated' : 'anonymous'}
        initialRouteName={
          hasSession
            ? role === 'admin'
              ? 'Admin'
              : role === 'freelancer' || requestedRole === 'freelancer'
                ? 'Freelancer'
                : 'Customer'
            : 'Welcome'
        }
        screenOptions={{
          headerTintColor: theme.colors.ink,
          headerStyle: { backgroundColor: theme.colors.blush },
          contentStyle: { backgroundColor: theme.colors.cream },
        }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Auth" component={AuthScreen} options={{ title: 'Welcome back' }} />
        <Stack.Screen name="Customer" component={DashboardScreen} initialParams={{ role: 'customer' }} />
        <Stack.Screen name="Freelancer" component={DashboardScreen} initialParams={{ role: 'freelancer' }} />
        <Stack.Screen
          name="FreelancerOnboarding"
          component={FreelancerOnboardingScreen}
          options={{ title: 'Your profile' }}
        />
        <Stack.Screen
          name="FreelancerServices"
          component={FreelancerServicesScreen}
          options={{ title: 'Services and pricing' }}
        />
        <Stack.Screen name="Admin" component={DashboardScreen} initialParams={{ role: 'admin' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { alignItems: 'center', backgroundColor: theme.colors.cream, flex: 1, justifyContent: 'center' },
  loadingText: { color: theme.colors.muted, fontSize: 16 },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  logo: { width: '100%', height: 190, marginBottom: 12 },
  tagline: { color: theme.colors.muted, fontSize: 17, textAlign: 'center', marginBottom: 28 },
  primaryButton: {
    backgroundColor: theme.colors.ink,
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 16,
    minWidth: 220,
  },
  primaryButtonText: { color: theme.colors.white, fontSize: 16, fontWeight: '700', textAlign: 'center' },
});
