-- Function to generate a random card number (Mock)
CREATE OR REPLACE FUNCTION public.generate_card_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_num TEXT;
BEGIN
  v_num := '4' || floor(random() * 1000000000000000)::text;
  WHILE length(v_num) < 16 LOOP
    v_num := v_num || floor(random() * 10)::text;
  END LOOP;
  RETURN substring(v_num, 1, 16);
END;
$$;

-- Function to request a debit card
CREATE OR REPLACE FUNCTION public.request_debit_card(
  p_account_id UUID,
  p_type TEXT DEFAULT 'virtual'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cost NUMERIC;
  v_balance NUMERIC;
  v_card_id UUID;
  v_card_num TEXT;
BEGIN
  -- 1. Get cost
  SELECT value::numeric INTO v_cost FROM public.platform_settings WHERE key = 'debit_card_cost';
  IF NOT FOUND THEN
    v_cost := 1230; -- Fallback
  END IF;

  -- 2. Check balance
  SELECT balance INTO v_balance FROM public.accounts WHERE id = p_account_id AND user_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found or access denied.';
  END IF;

  IF v_balance < v_cost THEN
    RAISE EXCEPTION 'Insufficient balance to cover debit card fee ($%)', v_cost;
  END IF;

  -- 3. Deduct fee
  UPDATE public.accounts SET balance = balance - v_cost WHERE id = p_account_id;

  -- 4. Record transaction
  INSERT INTO public.transactions (
    sender_account_id,
    amount,
    transaction_type,
    status,
    narration,
    reference_code
  ) VALUES (
    p_account_id,
    v_cost,
    'withdrawal',
    'completed',
    'Debit Card Issuance Fee',
    'CARD-' || upper(substring(gen_random_uuid()::text, 1, 8))
  );

  -- 5. Create card
  v_card_num := public.generate_card_number();
  INSERT INTO public.cards (
    user_id,
    account_id,
    card_number,
    expiry_date,
    cvv,
    type,
    status
  ) VALUES (
    auth.uid(),
    p_account_id,
    v_card_num,
    now() + interval '4 years',
    floor(random() * 899 + 100)::text,
    p_type,
    'active'
  ) RETURNING id INTO v_card_id;

  RETURN v_card_id;
END;
$$;

-- Update transfer_with_pin to require active card
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
  v_has_active_card BOOLEAN;
  v_txn_id UUID;
BEGIN
  -- 0. Check for Active Debit Card
  SELECT EXISTS (
    SELECT 1 FROM public.cards 
    WHERE user_id = auth.uid() AND status = 'active'
  ) INTO v_has_active_card;

  IF NOT v_has_active_card THEN
    RAISE EXCEPTION 'Debit card activation required to enable transfer functions.';
  END IF;

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
