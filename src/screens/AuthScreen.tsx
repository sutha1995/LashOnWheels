import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { theme } from '../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

export function AuthScreen({ navigation }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [role, setRole] = useState<'customer' | 'freelancer'>('customer');
  const [loginRole, setLoginRole] = useState<'customer' | 'freelancer'>('customer');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{mode === 'register' ? 'Create your account' : 'Sign in to continue'}</Text>
      <Text style={styles.subtitle}>Book beautiful lash services at home.</Text>
      {mode === 'register' && <TextInput placeholder="Full name" style={styles.input} />}
      <TextInput placeholder="Email address" keyboardType="email-address" autoCapitalize="none" style={styles.input} />
      <TextInput placeholder="Password" secureTextEntry style={styles.input} />
      {mode === 'register' && (
        <View style={styles.roleRow}>
          {(['customer', 'freelancer'] as const).map((item) => (
            <Pressable
              key={item}
              style={[styles.roleButton, role === item && styles.roleButtonActive]}
              onPress={() => setRole(item)}
            >
              <Text style={[styles.roleText, role === item && styles.roleTextActive]}>
                {item === 'customer' ? 'I need a service' : 'I provide services'}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      {mode === 'login' && (
        <View style={styles.roleRow}>
          <Text style={styles.roleLabel}>Continue as</Text>
          {(['customer', 'freelancer'] as const).map((item) => (
            <Pressable
              key={item}
              style={[styles.roleButton, loginRole === item && styles.roleButtonActive]}
              onPress={() => setLoginRole(item)}
            >
              <Text style={[styles.roleText, loginRole === item && styles.roleTextActive]}>
                {item === 'customer' ? 'Customer' : 'Freelancer'}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      <Pressable
        style={styles.primaryButton}
        onPress={() => {
          const selectedRole = mode === 'login' ? loginRole : role;
          if (selectedRole === 'freelancer') {
            navigation.replace('Freelancer', { role: selectedRole });
            return;
          }
          navigation.replace('Customer', { role: selectedRole });
        }}
      >
        <Text style={styles.primaryButtonText}>{mode === 'register' ? 'Create account' : 'Sign in'}</Text>
      </Pressable>
      <Pressable onPress={() => setMode(mode === 'register' ? 'login' : 'register')}>
        <Text style={styles.link}>
          {mode === 'register' ? 'Already have an account? Sign in' : 'New here? Create an account'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { color: theme.colors.ink, fontSize: 28, fontWeight: '800', marginTop: 24 },
  subtitle: { color: theme.colors.muted, fontSize: 16, marginTop: 8, marginBottom: 28 },
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
  roleRow: { gap: 10, marginVertical: 8 },
  roleLabel: { color: theme.colors.muted, fontSize: 13, fontWeight: '700', marginBottom: 2 },
  roleButton: { borderColor: theme.colors.border, borderRadius: 12, borderWidth: 1, padding: 15 },
  roleButtonActive: { backgroundColor: theme.colors.blush, borderColor: theme.colors.accent },
  roleText: { color: theme.colors.muted, fontWeight: '600', textAlign: 'center' },
  roleTextActive: { color: theme.colors.ink },
  primaryButton: { backgroundColor: theme.colors.ink, borderRadius: 14, marginTop: 18, padding: 16 },
  primaryButtonText: { color: theme.colors.white, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  link: { color: theme.colors.accent, fontWeight: '700', marginTop: 22, textAlign: 'center' },
});
