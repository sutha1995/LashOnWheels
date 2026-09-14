import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

export type ClientLog = {
  id: string;
  freelancer_id: string;
  booking_id: string;
  extension_style: string;
  curl: string;
  length_mm: string;
  diameter_mm: string;
  mapping_notes: string;
  treatment_notes: string;
  photo_path: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientLogDraft = Omit<ClientLog, 'id' | 'freelancer_id' | 'created_at' | 'updated_at'>;

const bucketName = 'client-logbook';
const logColumns = 'id, freelancer_id, booking_id, extension_style, curl, length_mm, diameter_mm, mapping_notes, treatment_notes, photo_path, created_at, updated_at';

function decodeBase64Image(base64: string) {
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

export async function getClientLogs(freelancerId: string) {
  if (!supabase) return { logs: [] as ClientLog[], error: new Error('Supabase is not configured.') };
  const { data, error } = await supabase.from('freelancer_client_logs').select(logColumns).eq('freelancer_id', freelancerId);
  return { logs: (data ?? []) as ClientLog[], error };
}

export async function saveClientLog(freelancerId: string, draft: ClientLogDraft) {
  if (!supabase) return { log: null, error: new Error('Supabase is not configured.') };
  const { data, error } = await supabase
    .from('freelancer_client_logs')
    .upsert({ ...draft, freelancer_id: freelancerId }, { onConflict: 'booking_id' })
    .select(logColumns)
    .single();
  return { log: data as ClientLog | null, error };
}

export async function pickClientLogPhoto(freelancerId: string, bookingId: string) {
  if (!supabase) return { photoPath: null, error: new Error('Supabase is not configured.') };
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { photoPath: null, error: new Error('Photo library permission is required to add a treatment photo.') };
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.7, base64: true });
  if (result.canceled || !result.assets.length) return { photoPath: null, error: null };
  const asset = result.assets[0];
  if (!asset.base64) return { photoPath: null, error: new Error('The selected photo could not be read.') };
  const photoPath = `${freelancerId}/${bookingId}-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from(bucketName).upload(photoPath, decodeBase64Image(asset.base64), { contentType: 'image/jpeg', upsert: false });
  return { photoPath: error ? null : photoPath, error };
}

export async function getClientLogPhotoUrl(photoPath: string) {
  if (!supabase) return null;
  const { data, error } = await supabase.storage.from(bucketName).createSignedUrl(photoPath, 60 * 60);
  return error ? null : data.signedUrl;
}
