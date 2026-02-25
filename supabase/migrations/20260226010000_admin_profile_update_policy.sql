-- ============================================================
-- Fix: Allow admins to UPDATE all profiles
-- (COT code, Secure ID, and other security settings)
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- Add admin UPDATE policy for profiles table
CREATE POLICY IF NOT EXISTS "Admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Also ensure the COT/SecureID columns exist (safe to re-run)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_cot_active       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cot_code            TEXT,
  ADD COLUMN IF NOT EXISTS is_secure_id_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS secure_id_code      TEXT;
