import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

export type VerificationDocumentType = 'government_id' | 'certificate';
export type VerificationDocument = { id: string; freelancer_id: string; document_type: VerificationDocumentType; storage_path: string; file_name: string; mime_type: string; created_at: string };

const bucket = 'verification-documents';

function decodeBase64(base64: string) { return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0)); }

export async function getVerificationDocuments(freelancerId: string) {
  if (!supabase) return { documents: [] as VerificationDocument[], error: new Error('Supabase is not configured.') };
  const { data, error } = await supabase
    .from('freelancer_verification_documents')
    .select('id, freelancer_id, document_type, storage_path, file_name, mime_type, created_at')
    .eq('freelancer_id', freelancerId);
  return { documents: (data ?? []) as VerificationDocument[], error };
}

export async function uploadVerificationDocument(freelancerId: string, documentType: VerificationDocumentType) {
  if (!supabase) return { document: null, error: new Error('Supabase is not configured.') };
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { document: null, error: new Error('Photo library permission is required to upload verification documents.') };
  const selection = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.9, base64: true });
  if (selection.canceled || !selection.assets.length) return { document: null, error: null };
  const asset = selection.assets[0];
  if (!asset.base64) return { document: null, error: new Error('The selected document could not be read.') };
  const path = `${freelancerId}/${documentType}-${Date.now()}.jpg`;
  const { error: storageError } = await supabase.storage.from(bucket).upload(path, decodeBase64(asset.base64), { contentType: 'image/jpeg', upsert: false });
  if (storageError) return { document: null, error: storageError };
  const { data, error } = await supabase
    .from('freelancer_verification_documents')
    .upsert({ freelancer_id: freelancerId, document_type: documentType, storage_path: path, file_name: asset.fileName ?? `${documentType}.jpg`, mime_type: 'image/jpeg' }, { onConflict: 'freelancer_id,document_type' })
    .select('id, freelancer_id, document_type, storage_path, file_name, mime_type, created_at')
    .single();
  return { document: data as VerificationDocument | null, error };
}

export async function getVerificationDocumentUrl(storagePath: string) {
  if (!supabase) return { url: null, error: new Error('Supabase is not configured.') };
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, 60);
  return { url: data?.signedUrl ?? null, error };
}
