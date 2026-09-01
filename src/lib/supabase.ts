import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { env, hasSupabaseConfig } from './env';

export const supabase = hasSupabaseConfig ? createClient(env.supabaseUrl, env.supabaseAnonKey) : null;
