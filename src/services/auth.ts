import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

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
    return { error };
  }

  if (Platform.OS === 'web') {
    if (data.url) {
      globalThis.location.assign(data.url);
    }
    return { error: null };
  }

  if (!data.url) {
    return { error: new Error('Supabase did not return a GitHub sign-in URL.') };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') {
    return { error: new Error('GitHub sign-in was cancelled.') };
  }

  const callbackUrl = new URL(result.url);
  const code = callbackUrl.searchParams.get('code');
  if (!code) {
    return { error: new Error('GitHub sign-in did not return an authorization code.') };
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  return { error: exchangeError };
}
