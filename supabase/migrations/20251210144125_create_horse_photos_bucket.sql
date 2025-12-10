/*
  # Create Storage Bucket for Horse Photos

  1. New Storage Bucket
    - `horse-photos` - Public bucket for storing horse photos
  
  2. Security Policies
    - Public read access - Anyone can view horse photos
    - Authenticated upload - Only authenticated users can upload photos
    - Authenticated update - Only authenticated users can update photos
    - Authenticated delete - Only authenticated users can delete photos
  
  3. Notes
    - Photos are publicly readable to allow easy sharing
    - Only authenticated users can manage photos
    - File size limits should be configured in Supabase dashboard if needed
*/

-- Create the bucket for horse photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'horse-photos',
  'horse-photos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Anyone can view horse photos
CREATE POLICY "Public read access for horse photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'horse-photos');

-- Policy: Authenticated users can upload horse photos
CREATE POLICY "Authenticated users can upload horse photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'horse-photos');

-- Policy: Authenticated users can update their uploads
CREATE POLICY "Authenticated users can update horse photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'horse-photos')
WITH CHECK (bucket_id = 'horse-photos');

-- Policy: Authenticated users can delete horse photos
CREATE POLICY "Authenticated users can delete horse photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'horse-photos');