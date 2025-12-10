# Supabase Storage Setup

This guide will help you set up the Supabase Storage bucket required for image uploads.

## Required Storage Bucket

The app uses a Supabase Storage bucket called **`horses`** to store all horse images.

## Setup Instructions

### 1. Access Supabase Dashboard

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in to your account
3. Select your project

### 2. Create the Storage Bucket

1. In the left sidebar, click on **Storage**
2. Click the **New bucket** button
3. Fill in the following details:
   - **Name:** `horses`
   - **Public bucket:** ✅ **Check this box** (images need to be publicly accessible)
   - **File size limit:** 5 MB (recommended for mobile uploads)
   - **Allowed MIME types:** `image/jpeg, image/jpg, image/png, image/gif` (optional, for better security)

4. Click **Create bucket**

### 3. Set Up Storage Policies (RLS)

After creating the bucket, you need to set up Row Level Security policies:

1. Click on the **`horses`** bucket
2. Go to the **Policies** tab
3. Click **New policy**

#### Policy 1: Allow authenticated users to upload
```sql
-- Policy Name: "Authenticated users can upload to horses bucket"
-- Operation: INSERT
-- Target roles: authenticated

CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'horses');
```

#### Policy 2: Allow public access to read
```sql
-- Policy Name: "Public can read from horses bucket"
-- Operation: SELECT
-- Target roles: public, authenticated

CREATE POLICY "Public can read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'horses');
```

#### Policy 3: Allow owners to delete their files
```sql
-- Policy Name: "Authenticated users can delete own files"
-- Operation: DELETE
-- Target roles: authenticated

CREATE POLICY "Authenticated users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'horses' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### 4. Verify Setup

To verify the bucket is set up correctly:

1. Go to your app on your iPhone/device
2. Try to add a new horse with a photo
3. Check the console logs for detailed upload information
4. If successful, you should see the image URL in the database

### Troubleshooting

#### Error: "Bucket not found"
- Make sure you created a bucket named exactly `horses` (lowercase, no spaces)
- Verify the bucket is in the correct project

#### Error: "Access denied" or "403 Forbidden"
- Check that the bucket is marked as **Public**
- Verify the RLS policies are correctly set up
- Make sure you're authenticated when uploading

#### Error: "Base64 undefined" or upload fails
- Check the console logs in Expo Go for detailed error messages
- Verify the image picker is returning a valid URI
- Try with a smaller image (< 5MB)
- Make sure you have granted camera/photo library permissions

#### Images upload but don't display
- Verify the bucket is marked as **Public**
- Check that the public URL is being correctly generated
- Try opening the URL directly in a browser

## File Structure

Images are stored with the following path structure:
```
horses/
  ├── {horseId}-{timestamp}.jpg
  ├── {horseId}-{timestamp}.png
  └── ...
```

Example: `horses/abc123-1702345678901.jpg`

## Security Notes

- Images are publicly accessible (anyone with the URL can view them)
- Only authenticated users can upload
- Users can only delete their own files
- File size is limited to prevent abuse
- Consider adding virus scanning for production

## Need Help?

If you encounter issues:
1. Check the console logs in Expo Go
2. Verify all setup steps above
3. Check Supabase Dashboard > Storage > horses for uploaded files
4. Review the RLS policies in Supabase Dashboard > Storage > Policies
