-- Add COT and SecurePass columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_cot_active BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS cot_code TEXT,
ADD COLUMN IF NOT EXISTS is_secure_id_active BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS secure_id_code TEXT;

-- Update transfer_with_pin function to include COT and SecurePass checks
CREATE OR REPLACE FUNCTION public.transfer_with_pin(
  p_sender_account_id UUID,
  p_receiver_account_id UUID,
  p_amount NUMERIC,
  p_pin_hash TEXT,
  p_narration TEXT DEFAULT NULL,
  p_cot_code TEXT DEFAULT NULL,
  p_secure_id_code TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stored_pin_hash TEXT;
  v_is_cot_active BOOLEAN;
  v_stored_cot_code TEXT;
  v_is_secure_id_active BOOLEAN;
  v_stored_secure_id_code TEXT;
  v_txn_id UUID;
BEGIN
  -- 1. Verify PIN
  SELECT pin_hash INTO v_stored_pin_hash FROM public.user_pins WHERE user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No PIN set. Please set your PIN in Settings first.';
  END IF;

  IF v_stored_pin_hash != p_pin_hash THEN
    RAISE EXCEPTION 'Incorrect PIN. Please try again.';
  END IF;

  -- 2. Fetch Security Settings from Profile
  SELECT 
    is_cot_active, cot_code, is_secure_id_active, secure_id_code
  INTO 
    v_is_cot_active, v_stored_cot_code, v_is_secure_id_active, v_stored_secure_id_code
  FROM public.profiles
  WHERE user_id = auth.uid();

  -- 3. Verify COT Code if active
  IF v_is_cot_active THEN
    IF p_cot_code IS NULL OR p_cot_code != v_stored_cot_code THEN
      RAISE EXCEPTION 'Invalid COT Code.';
    END IF;
  END IF;

  -- 4. Verify Secure ID Code if active
  IF v_is_secure_id_active THEN
    IF p_secure_id_code IS NULL OR p_secure_id_code != v_stored_secure_id_code THEN
      RAISE EXCEPTION 'Invalid Secure ID Code.';
    END IF;
  END IF;

  -- 5. Execute Transfer
  v_txn_id := public.transfer_funds(p_sender_account_id, p_receiver_account_id, p_amount, p_narration);

  RETURN v_txn_id;
END;
$$;
