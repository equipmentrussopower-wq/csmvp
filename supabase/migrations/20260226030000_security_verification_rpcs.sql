-- ============================================================
-- Security: Server-side validation helpers
-- These functions allow the frontend to check codes without 
-- fetching them, preventing "fake works" and client-side bypass.
-- ============================================================

-- 1. Verify Transaction PIN
CREATE OR REPLACE FUNCTION public.verify_user_pin(p_pin_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stored_hash TEXT;
BEGIN
  SELECT pin_hash INTO v_stored_hash FROM public.user_pins WHERE user_id = auth.uid();
  IF NOT FOUND THEN RETURN FALSE; END IF;
  -- Strict comparison
  RETURN (v_stored_hash IS NOT NULL AND p_pin_hash IS NOT NULL AND v_stored_hash = p_pin_hash);
END;
$$;

-- 2. Verify COT Code
CREATE OR REPLACE FUNCTION public.verify_cot_code(p_cot_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active BOOLEAN;
  v_stored_code TEXT;
BEGIN
  SELECT is_cot_active, cot_code INTO v_active, v_stored_code 
  FROM public.profiles WHERE user_id = auth.uid();
  
  -- If not active, it's "valid" (skip check)
  IF NOT v_active THEN RETURN TRUE; END IF;
  
  -- If active, must match exactly and not be null
  RETURN (v_stored_code IS NOT NULL AND p_cot_code IS NOT NULL AND v_stored_code = p_cot_code);
END;
$$;

-- 3. Verify Secure ID Code
CREATE OR REPLACE FUNCTION public.verify_secure_id_code(p_secure_id_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active BOOLEAN;
  v_stored_code TEXT;
BEGIN
  SELECT is_secure_id_active, secure_id_code INTO v_active, v_stored_code 
  FROM public.profiles WHERE user_id = auth.uid();
  
  -- If not active, it's "valid" (skip check)
  IF NOT v_active THEN RETURN TRUE; END IF;
  
  -- If active, must match exactly and not be null
  RETURN (v_stored_code IS NOT NULL AND p_secure_id_code IS NOT NULL AND v_stored_code = p_secure_id_code);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.verify_user_pin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_cot_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_secure_id_code(TEXT) TO authenticated;
