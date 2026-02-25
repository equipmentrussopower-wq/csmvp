-- ============================================================
-- Fix: Add missing COT & Secure ID columns to profiles table
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_cot_active      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cot_code           TEXT,
  ADD COLUMN IF NOT EXISTS is_secure_id_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS secure_id_code     TEXT;
