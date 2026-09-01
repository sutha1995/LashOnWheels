import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import logo from './assets/lash-on-wheels-logo.png';
import { theme } from './src/constants/theme';
import { AuthScreen } from './src/screens/AuthScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { SupabaseStatus } from './src/components/SupabaseStatus';

export type RootStackParamList = {
  Welcome: undefined;
  Auth: undefined;
  Customer: { role: 'customer' };
  Freelancer: { role: 'freelancer' };
  Admin: { role: 'admin' };
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
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={{
          headerTintColor: theme.colors.ink,
          headerStyle: { backgroundColor: theme.colors.blush },
          contentStyle: { backgroundColor: theme.colors.cream },
        }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Auth" component={AuthScreen} options={{ title: 'Welcome back' }} />
        <Stack.Screen name="Customer" component={DashboardScreen} />
        <Stack.Screen name="Freelancer" component={DashboardScreen} />
        <Stack.Screen name="Admin" component={DashboardScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
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
