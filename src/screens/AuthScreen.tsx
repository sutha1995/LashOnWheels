import { useState } from 'react';
import { Alert } from 'react-native';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { theme } from '../constants/theme';
import { hasSupabaseConfig } from '../lib/env';
import { setPendingSignupRole } from '../lib/profile';
import { signInWithEmail, signInWithGithub, signUpWithEmail } from '../services/auth';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

export function AuthScreen({ navigation }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [role, setRole] = useState<'customer' | 'freelancer'>('customer');
  const [loginRole, setLoginRole] = useState<'customer' | 'freelancer'>('customer');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGithubLoading, setIsGithubLoading] = useState(false);

  const navigateToRole = (selectedRole: 'customer' | 'freelancer') => {
    if (selectedRole === 'freelancer') {
      navigation.replace('Freelancer', { role: selectedRole });
      return;
    }
    navigation.replace('Customer', { role: selectedRole });
  };

  const handleEmailAuth = async () => {
    setAuthError('');
    const selectedRole = mode === 'login' ? loginRole : role;
    if (!hasSupabaseConfig) {
      navigateToRole(selectedRole);
      return;
    }

    if (!email.trim() || password.length < 6 || (mode === 'register' && !fullName.trim())) {
      setAuthError(
        mode === 'register'
          ? 'Enter your name, email, and a password of at least 6 characters.'
          : 'Enter your email and password.',
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const result =
        mode === 'login'
          ? await signInWithEmail(email, password)
          : await signUpWithEmail(email, password, fullName, role);

      if (result.error) {
        setAuthError(result.error.message);
        return;
      }

      if (mode === 'register' && result.needsConfirmation) {
        setAuthError('Check your email to confirm your account before signing in.');
        return;
      }

      navigateToRole(selectedRole);
    } catch (error: unknown) {
      setAuthError(error instanceof Error ? error.message : 'Unexpected authentication error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGithubSignIn = async () => {
    setAuthError('');
    setIsGithubLoading(true);
    try {
      const selectedRole = mode === 'login' ? loginRole : role;
      await setPendingSignupRole(mode === 'register' ? role : 'customer');
      const { error } = await signInWithGithub();
      if (error) {
        Alert.alert('GitHub sign-in unavailable', error.message);
        return;
      }

      navigateToRole(mode === 'login' ? selectedRole : 'customer');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unexpected GitHub sign-in error.';
      Alert.alert('GitHub sign-in unavailable', message);
    } finally {
      setIsGithubLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{mode === 'register' ? 'Create your account' : 'Sign in to continue'}</Text>
      <Text style={styles.subtitle}>Book beautiful lash services at home.</Text>
      {mode === 'register' && (
        <TextInput placeholder="Full name" value={fullName} onChangeText={setFullName} style={styles.input} />
      )}
      <TextInput
        placeholder="Email address"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
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
        disabled={isSubmitting || isGithubLoading}
        onPress={() => void handleEmailAuth()}
      >
        <Text style={styles.primaryButtonText}>
          {isSubmitting ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Sign in'}
        </Text>
      </Pressable>
      {!!authError && <Text style={styles.errorText}>{authError}</Text>}
      <Text style={styles.orLabel}>OR</Text>
      <Pressable
        accessibilityRole="button"
        disabled={!hasSupabaseConfig || isSubmitting || isGithubLoading}
        style={[styles.githubButton, (!hasSupabaseConfig || isSubmitting || isGithubLoading) && styles.disabledButton]}
        onPress={() => void handleGithubSignIn()}
      >
        <Text style={styles.githubButtonText}>{isGithubLoading ? 'Opening GitHub…' : 'Continue with GitHub'}</Text>
      </Pressable>
      {!hasSupabaseConfig && (
        <Text style={styles.helperText}>Add Supabase values to .env to enable GitHub sign-in.</Text>
      )}
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
  orLabel: { color: theme.colors.muted, fontSize: 12, fontWeight: '800', marginVertical: 18, textAlign: 'center' },
  githubButton: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.ink,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  githubButtonText: { color: theme.colors.ink, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  disabledButton: { opacity: 0.5 },
  helperText: { color: theme.colors.muted, fontSize: 12, marginTop: 8, textAlign: 'center' },
  errorText: { color: '#B42318', fontSize: 13, marginTop: 12, textAlign: 'center' },
  link: { color: theme.colors.accent, fontWeight: '700', marginTop: 22, textAlign: 'center' },
});
