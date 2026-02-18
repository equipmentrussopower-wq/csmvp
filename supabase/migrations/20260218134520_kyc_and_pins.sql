
-- KYC status enum
CREATE TYPE public.kyc_status AS ENUM ('pending', 'approved', 'rejected');

-- KYC submissions table
CREATE TABLE public.kyc_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  id_type TEXT NOT NULL,  -- e.g. 'passport', 'drivers_license', 'national_id'
  id_number TEXT NOT NULL,
  status kyc_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;

-- Users can view and insert their own KYC
CREATE POLICY "Users can view own KYC" ON public.kyc_submissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own KYC" ON public.kyc_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Admins can view and update all KYC
CREATE POLICY "Admins can view all KYC" ON public.kyc_submissions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update KYC" ON public.kyc_submissions FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- User PINs table (hashed)
CREATE TABLE public.user_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  pin_hash TEXT NOT NULL,  -- store bcrypt or sha256 hash of the PIN
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own PIN" ON public.user_pins FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER update_user_pins_updated_at
  BEFORE UPDATE ON public.user_pins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function: Admin approves KYC → creates savings + checking accounts
CREATE OR REPLACE FUNCTION public.admin_approve_kyc(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  -- Update KYC status
  UPDATE public.kyc_submissions
  SET status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
  WHERE user_id = p_user_id;

  -- Create savings account if not already exists
  IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE user_id = p_user_id AND account_type = 'savings') THEN
    INSERT INTO public.accounts (user_id, account_type, account_number)
    VALUES (p_user_id, 'savings', public.generate_account_number());
  END IF;

  -- Create checking account if not already exists
  IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE user_id = p_user_id AND account_type = 'checking') THEN
    INSERT INTO public.accounts (user_id, account_type, account_number)
    VALUES (p_user_id, 'checking', public.generate_account_number());
  END IF;
END;
$$;

-- Function: Admin rejects KYC
CREATE OR REPLACE FUNCTION public.admin_reject_kyc(p_user_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  UPDATE public.kyc_submissions
  SET status = 'rejected', rejection_reason = p_reason, reviewed_at = now(), reviewed_by = auth.uid()
  WHERE user_id = p_user_id;
END;
$$;

-- Function: Verify PIN and execute transfer
CREATE OR REPLACE FUNCTION public.transfer_with_pin(
  p_sender_account_id UUID,
  p_receiver_account_id UUID,
  p_amount NUMERIC,
  p_pin_hash TEXT,
  p_narration TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stored_hash TEXT;
  v_txn_id UUID;
BEGIN
  -- Verify PIN
  SELECT pin_hash INTO v_stored_hash FROM public.user_pins WHERE user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No PIN set. Please set your PIN in Settings first.';
  END IF;

  IF v_stored_hash != p_pin_hash THEN
    RAISE EXCEPTION 'Incorrect PIN. Please try again.';
  END IF;

  -- Delegate to existing transfer_funds
  v_txn_id := public.transfer_funds(p_sender_account_id, p_receiver_account_id, p_amount, p_narration);

  RETURN v_txn_id;
END;
$$;

-- Update handle_new_user: do NOT auto-create accounts (accounts created after KYC approval)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'));

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  -- Accounts are created only after KYC approval by admin
  RETURN NEW;
END;
$$;



