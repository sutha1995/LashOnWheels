import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

export type PortfolioPhoto = {
  id: string;
  freelancer_id: string;
  photo_url: string;
  storage_path: string;
  caption: string;
  position: number;
  created_at: string;
};

export type PhotoSource = 'library' | 'camera';

const bucketName = 'portfolio';
const maxCaptionLength = 200;

export async function getPortfolioPhotos(freelancerId: string) {
  if (!supabase) {
    return { photos: [], error: new Error('Supabase is not configured.') };
  }

  const { data, error } = await supabase
    .from('freelancer_portfolio_photos')
    .select('id, freelancer_id, photo_url, storage_path, caption, position, created_at')
    .eq('freelancer_id', freelancerId)
    .order('position')
    .order('created_at');

  return { photos: (data ?? []) as PortfolioPhoto[], error };
}

function decodeBase64Image(base64: string) {
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

async function pickPhoto(source: PhotoSource) {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return {
      photo: null,
      error: new Error(
        source === 'camera'
          ? 'Camera permission is required to take a photo.'
          : 'Photo library permission is required to choose a photo.',
      ),
    };
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.7,
    base64: true,
  };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets.length) {
    return { photo: null, error: null };
  }

  const asset = result.assets[0];
  if (!asset.base64) {
    return { photo: null, error: new Error('The selected photo could not be read.') };
  }
  return { photo: { base64: asset.base64 }, error: null };
}

async function uploadImage(userId: string, path: string, base64: string, upsert: boolean) {
  const { error } = await supabase!.storage.from(bucketName).upload(path, decodeBase64Image(base64), {
    contentType: 'image/jpeg',
    upsert,
  });
  return error;
}

export async function pickProfilePhotoUrl(userId: string, source: PhotoSource = 'library') {
  if (!supabase) {
    return { url: null, error: new Error('Supabase is not configured.') };
  }

  const { photo, error: pickError } = await pickPhoto(source);
  if (pickError || !photo) {
    return { url: null, error: pickError };
  }

  const path = `${userId}/profile.jpg`;
  const uploadError = await uploadImage(userId, path, photo.base64, true);
  if (uploadError) {
    return { url: null, error: uploadError };
  }

  const { data } = supabase.storage.from(bucketName).getPublicUrl(path);
  return { url: `${data.publicUrl}?v=${Date.now()}`, error: null };
}

export async function addPortfolioPhoto(userId: string, caption: string, source: PhotoSource = 'library') {
  if (!supabase) {
    return { photo: null, error: new Error('Supabase is not configured.') };
  }

  const trimmedCaption = caption.trim();
  if (trimmedCaption.length > maxCaptionLength) {
    return { photo: null, error: new Error('Captions must be 200 characters or fewer.') };
  }

  const { photo, error: pickError } = await pickPhoto(source);
  if (pickError || !photo) {
    return { photo: null, error: pickError };
  }

  const path = `${userId}/gallery-${Date.now()}.jpg`;
  const uploadError = await uploadImage(userId, path, photo.base64, false);
  if (uploadError) {
    return { photo: null, error: uploadError };
  }

  const existingResult = await getPortfolioPhotos(userId);
  if (existingResult.error) {
    return { photo: null, error: existingResult.error };
  }

  const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(path);
  const { data: inserted, error: insertError } = await supabase
    .from('freelancer_portfolio_photos')
    .insert({
      freelancer_id: userId,
      photo_url: publicUrlData.publicUrl,
      storage_path: path,
      caption: trimmedCaption,
      position: existingResult.photos.length,
    })
    .select('id, freelancer_id, photo_url, storage_path, caption, position, created_at')
    .single();

  return { photo: inserted as PortfolioPhoto | null, error: insertError };
}

export async function deletePortfolioPhoto(userId: string, photo: PortfolioPhoto) {
  if (!supabase) {
    return { error: new Error('Supabase is not configured.') };
  }

  const { error: deleteError } = await supabase
    .from('freelancer_portfolio_photos')
    .delete()
    .eq('id', photo.id)
    .eq('freelancer_id', userId);
  if (deleteError) {
    return { error: deleteError };
  }

  const { error: storageError } = await supabase.storage.from(bucketName).remove([photo.storage_path]);
  return { error: storageError };
}
