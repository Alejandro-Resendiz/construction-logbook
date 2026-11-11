-- ============================================================
-- Migration: profiles_and_avatars
-- Creates public.profiles table with RLS policies and
-- SQL-level storage.objects policies for the avatars bucket.
--
-- NOTE: The "avatars" storage bucket itself CANNOT be created
-- via SQL migration. You must create it manually in the
-- Supabase Dashboard (Storage → New bucket):
--
--   Name        : avatars
--   Public      : OFF (private)
--   File size   : 5242880 bytes (5 MB)
--   MIME types  : image/jpeg, image/png, image/gif, image/webp
--
-- After creating the bucket, the SQL policies below will
-- already be in place and will apply immediately.
-- ============================================================


-- ============================================================
-- 1. public.profiles table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    avatar_path TEXT,          -- Storage object path only, never a signed URL
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ---- RLS Policies ----

DROP POLICY IF EXISTS "Users can select own profile"  ON public.profiles;
CREATE POLICY "Users can select own profile"
    ON public.profiles
    FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own profile"  ON public.profiles;
CREATE POLICY "Users can insert own profile"
    ON public.profiles
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile"  ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());


-- ---- updated_at trigger (idempotent) ----

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- 2. GRANTs for public.profiles
-- ============================================================

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


-- ============================================================
-- 3. Storage bucket and policies for the "avatars" bucket
-- ============================================================

-- Programmatically provision the avatars bucket if supported in the environment
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    false,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- INSERT: owner can upload files whose path starts with their uid
DROP POLICY IF EXISTS "Avatars: owner can insert" ON storage.objects;
CREATE POLICY "Avatars: owner can insert"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- UPDATE: owner can replace their own files
DROP POLICY IF EXISTS "Avatars: owner can update" ON storage.objects;
CREATE POLICY "Avatars: owner can update"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- DELETE: owner can remove their own files
DROP POLICY IF EXISTS "Avatars: owner can delete" ON storage.objects;
CREATE POLICY "Avatars: owner can delete"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- SELECT: owner can read their own files (required for signed URL generation)
DROP POLICY IF EXISTS "Avatars: owner can select" ON storage.objects;
CREATE POLICY "Avatars: owner can select"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );
