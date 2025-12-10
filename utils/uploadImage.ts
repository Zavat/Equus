import * as FileSystem from 'expo-file-system';
import { supabase } from '@/lib/supabase';

export async function uploadImage(
  uri: string,
  fileNamePrefix: string
): Promise<string | null> {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const binary = atob(base64);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }

    const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${fileNamePrefix}-${Date.now()}.${fileExt}`;
    const filePath = `horses/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('horses')
      .upload(filePath, array, {
        contentType: `image/${fileExt}`,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('horses').getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    return null;
  }
}
