import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { clearPendingSignupRole, type SignupRole } from '../lib/profile';

WebBrowser.maybeCompleteAuthSession();

export async function signInWithEmail(email: string, password: string) {
  if (!supabase) {
    return { user: null, needsConfirmation: false, error: new Error('Supabase is not configured.') };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  return { user: data.user, needsConfirmation: false, error };
}

export async function signUpWithEmail(email: string, password: string, fullName: string, role: SignupRole) {
  if (!supabase) {
    return { user: null, needsConfirmation: false, error: new Error('Supabase is not configured.') };
  }

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { full_name: fullName.trim(), role } },
  });

  if (error || !data.user || !data.session) {
    return { user: data.user, needsConfirmation: Boolean(data.user && !data.session), error };
  }

  return { user: data.user, needsConfirmation: false, error: null };
}

export async function signOut() {
  if (supabase) {
    return supabase.auth.signOut();
  }
  return { error: null };
}

export async function signInWithGithub(): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error('Supabase is not configured.') };
  }

  const redirectTo = Linking.createURL('auth/callback');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo,
      skipBrowserRedirect: Platform.OS !== 'web',
    },
  });

  if (error) {
    await clearPendingSignupRole();
    return { error };
  }

  if (Platform.OS === 'web') {
    if (!data.url) {
      await clearPendingSignupRole();
      return { error: new Error('Supabase did not return a GitHub sign-in URL.') };
    }
    return { error: null };
  }

  if (!data.url) {
    await clearPendingSignupRole();
    return { error: new Error('Supabase did not return a GitHub sign-in URL.') };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') {
    await clearPendingSignupRole();
    return { error: new Error('GitHub sign-in was cancelled.') };
  }

  const callbackUrl = new URL(result.url);
  const code = callbackUrl.searchParams.get('code');
  if (!code) {
    await clearPendingSignupRole();
    return { error: new Error('GitHub sign-in did not return an authorization code.') };
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    await clearPendingSignupRole();
  }
  return { error: exchangeError };
}
