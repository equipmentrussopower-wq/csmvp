-- ============================================================
-- Admin: Approve pending COT/SecureID transactions
-- Approving moves the money (debit sender, credit receiver)
-- and marks status as 'completed'.
-- Cancelling marks status as 'reversed' without moving money.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_approve_transaction(p_transaction_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_txn RECORD;
  v_sender_balance NUMERIC;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  SELECT * INTO v_txn FROM public.transactions WHERE id = p_transaction_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  IF v_txn.status != 'pending' THEN
    RAISE EXCEPTION 'Only pending transactions can be approved (current status: %)', v_txn.status;
  END IF;

  -- Check sender has sufficient funds
  IF v_txn.sender_account_id IS NOT NULL THEN
    SELECT balance INTO v_sender_balance
    FROM public.accounts WHERE id = v_txn.sender_account_id FOR UPDATE;

    IF v_sender_balance < v_txn.amount THEN
      RAISE EXCEPTION 'Insufficient funds in sender account to approve this transfer';
    END IF;

    -- Debit sender
    UPDATE public.accounts
    SET balance = balance - v_txn.amount
    WHERE id = v_txn.sender_account_id;
  END IF;

  -- Credit receiver (if internal account)
  IF v_txn.receiver_account_id IS NOT NULL THEN
    UPDATE public.accounts
    SET balance = balance + v_txn.amount
    WHERE id = v_txn.receiver_account_id;
  END IF;

  -- Mark transaction as completed
  UPDATE public.transactions
  SET status = 'completed'
  WHERE id = p_transaction_id;

END;
$$;

-- Allow admins to call this function
GRANT EXECUTE ON FUNCTION public.admin_approve_transaction(UUID) TO authenticated;

-- ── Cancel pending transaction (no money moved) ──────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_cancel_transaction(p_transaction_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  UPDATE public.transactions
  SET status = 'reversed'
  WHERE id = p_transaction_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending transaction not found or already processed';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_cancel_transaction(UUID) TO authenticated;
