import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';

export async function uploadImage(
  uri: string,
  fileNamePrefix: string
): Promise<string | null> {
  if (!uri || uri.trim() === '') {
    console.warn('uploadImage: URI is empty or undefined');
    return null;
  }

  // Se è già un URL http/https (già caricata su Supabase), non ha senso ricaricarla
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    console.log('uploadImage: URI is already a remote URL, returning as-is');
    return uri;
  }

  try {
    console.log('uploadImage: starting for', uri);

    // (Opzionale ma utile per debugging)
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      console.error('uploadImage: file does not exist at', uri);
      return null;
    }

    // 1) Leggi il file come base64
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    if (!base64 || base64.trim() === '') {
      console.error('uploadImage: base64 string is empty');
      return null;
    }

    // 2) Base64 -> ArrayBuffer (compatibile con supabase-js)
    const arrayBuffer = decode(base64);

    // 3) Determina estensione (fallback jpg)
    const extMatch = uri.match(/\.(\w+)(\?|$)/);
    const fileExt = (extMatch?.[1] || 'jpg').toLowerCase();

    const fileName = `${fileNamePrefix}-${Date.now()}.${fileExt}`;
    const filePath = `horses/${fileName}`;

    console.log('uploadImage: uploading to', filePath);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('horses')
      .upload(filePath, arrayBuffer, {
        contentType: `image/${fileExt}`,
        upsert: false,
      });

    if (uploadError) {
      console.error('uploadImage: Supabase upload error:', uploadError);
      throw uploadError;
    }

    console.log('uploadImage: upload success', uploadData);

    const { data: publicData } = supabase.storage
      .from('horses')
      .getPublicUrl(filePath);

    console.log('uploadImage: public URL:', publicData.publicUrl);

    return publicData.publicUrl ?? null;
  } catch (error) {
    console.error('uploadImage: error during upload:', error);
    return null;
  }
}