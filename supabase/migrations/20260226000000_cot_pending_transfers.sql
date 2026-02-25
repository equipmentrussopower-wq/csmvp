-- ============================================================
-- COT / SecureID Transactions → Always "pending" on dashboard
-- ============================================================
-- When a transfer requires COT or Secure ID verification,
-- the transaction is recorded as 'pending' and the balance is
-- NOT moved immediately. The admin must approve/complete it.
-- Only plain PIN-only transfers complete instantly.
-- ============================================================

CREATE OR REPLACE FUNCTION public.transfer_with_pin(
  p_sender_account_id   UUID,
  p_receiver_account_id UUID,
  p_amount              NUMERIC,
  p_pin_hash            TEXT,
  p_narration           TEXT    DEFAULT NULL,
  p_cot_code            TEXT    DEFAULT NULL,
  p_secure_id_code      TEXT    DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stored_pin_hash       TEXT;
  v_is_cot_active         BOOLEAN;
  v_stored_cot_code       TEXT;
  v_is_secure_id_active   BOOLEAN;
  v_stored_secure_id_code TEXT;
  v_has_active_card       BOOLEAN;
  v_sender_balance        NUMERIC;
  v_sender_status         account_status;
  v_sender_user_id        UUID;
  v_receiver_status       account_status;
  v_needs_security        BOOLEAN;
  v_txn_id                UUID;
BEGIN

  -- 0. Active debit card check
  SELECT EXISTS (
    SELECT 1 FROM public.cards
    WHERE user_id = auth.uid() AND status = 'active'
  ) INTO v_has_active_card;

  IF NOT v_has_active_card THEN
    RAISE EXCEPTION 'Debit card activation required to enable transfer functions.';
  END IF;

  -- 1. Verify PIN
  SELECT pin_hash INTO v_stored_pin_hash
  FROM public.user_pins WHERE user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No PIN set. Please set your PIN in Profile → Change PIN.';
  END IF;

  IF v_stored_pin_hash != p_pin_hash THEN
    RAISE EXCEPTION 'Incorrect PIN. Please try again.';
  END IF;

  -- 2. Fetch security settings
  SELECT
    is_cot_active, cot_code,
    is_secure_id_active, secure_id_code
  INTO
    v_is_cot_active, v_stored_cot_code,
    v_is_secure_id_active, v_stored_secure_id_code
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

  -- 5. Determine if this transfer goes through a security layer
  v_needs_security := v_is_cot_active OR v_is_secure_id_active;

  -- 6. Validate sender account
  SELECT balance, status, user_id
  INTO v_sender_balance, v_sender_status, v_sender_user_id
  FROM public.accounts WHERE id = p_sender_account_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sender account not found.';
  END IF;

  IF v_sender_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: not your account.';
  END IF;

  IF v_sender_status = 'frozen' THEN
    RAISE EXCEPTION 'Sender account is frozen.';
  END IF;

  IF v_sender_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient funds.';
  END IF;

  -- 7. Validate receiver account
  SELECT status INTO v_receiver_status
  FROM public.accounts WHERE id = p_receiver_account_id FOR UPDATE;

  -- Note: receiver may be NULL/external for wire transfers – only validate if present
  IF FOUND AND v_receiver_status = 'frozen' THEN
    RAISE EXCEPTION 'Receiver account is frozen.';
  END IF;

  -- 8. Branch: security-gated (COT / SecureID) → PENDING
  IF v_needs_security THEN
    -- Debit sender immediately so their balance updates on the dashboard
    UPDATE public.accounts SET balance = balance - p_amount WHERE id = p_sender_account_id;

    INSERT INTO public.transactions (
      sender_account_id,
      receiver_account_id,
      amount,
      transaction_type,
      narration,
      status
    )
    VALUES (
      p_sender_account_id,
      p_receiver_account_id,
      p_amount,
      'transfer',
      COALESCE(p_narration, 'Wire Transfer – pending security review'),
      'pending'
    )
    RETURNING id INTO v_txn_id;

    RETURN v_txn_id;
  END IF;

  -- 9. Plain PIN-only transfer → complete instantly (legacy path)
  UPDATE public.accounts SET balance = balance - p_amount WHERE id = p_sender_account_id;
  UPDATE public.accounts SET balance = balance + p_amount WHERE id = p_receiver_account_id;

  INSERT INTO public.transactions (
    sender_account_id,
    receiver_account_id,
    amount,
    transaction_type,
    narration,
    status
  )
  VALUES (
    p_sender_account_id,
    p_receiver_account_id,
    p_amount,
    'transfer',
    p_narration,
    'completed'
  )
  RETURNING id INTO v_txn_id;

  RETURN v_txn_id;

END;
$$;
