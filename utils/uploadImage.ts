import * as FileSystem from 'expo-file-system';
import { supabase } from '@/lib/supabase';

export async function uploadImage(
  uri: string,
  fileNamePrefix: string
): Promise<string | null> {
  if (!uri || uri.trim() === '') {
    console.error('uploadImage: URI is empty or undefined');
    return null;
  }

  console.log('uploadImage: Starting upload for URI:', uri);

  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    console.log('uploadImage: File info:', fileInfo);

    if (!fileInfo.exists) {
      console.error('uploadImage: File does not exist at URI:', uri);
      return null;
    }

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    if (!base64 || base64.trim() === '') {
      console.error('uploadImage: Base64 encoding failed or returned empty string');
      return null;
    }

    console.log('uploadImage: Base64 encoded successfully, length:', base64.length);

    const binary = atob(base64);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }

    console.log('uploadImage: Converted to Uint8Array, size:', array.length, 'bytes');

    const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${fileNamePrefix}-${Date.now()}.${fileExt}`;
    const filePath = `horses/${fileName}`;

    console.log('uploadImage: Uploading to Supabase Storage:', filePath);

    const { error: uploadError } = await supabase.storage
      .from('horses')
      .upload(filePath, array, {
        contentType: `image/${fileExt}`,
        upsert: false,
      });

    if (uploadError) {
      console.error('uploadImage: Supabase upload error:', uploadError);
      throw uploadError;
    }

    console.log('uploadImage: Upload successful, getting public URL');

    const { data } = supabase.storage.from('horses').getPublicUrl(filePath);

    console.log('uploadImage: Public URL obtained:', data.publicUrl);

    return data.publicUrl;
  } catch (error) {
    console.error('uploadImage: Error during upload process:', error);
    if (error instanceof Error) {
      console.error('uploadImage: Error message:', error.message);
      console.error('uploadImage: Error stack:', error.stack);
    }
    return null;
  }
}
