
-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create enum for account type
CREATE TYPE public.account_type AS ENUM ('savings', 'current');

-- Create enum for account status
CREATE TYPE public.account_status AS ENUM ('active', 'frozen');

-- Create enum for transaction type
CREATE TYPE public.transaction_type AS ENUM ('transfer', 'deposit', 'withdrawal', 'reversal');

-- Create enum for transaction status
CREATE TYPE public.transaction_status AS ENUM ('pending', 'completed', 'reversed');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles: users can read their own roles, admins can read all
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Accounts table
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_number TEXT NOT NULL UNIQUE,
  account_type account_type NOT NULL DEFAULT 'savings',
  balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  status account_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own accounts" ON public.accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all accounts" ON public.accounts FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update accounts" ON public.accounts FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code TEXT NOT NULL UNIQUE DEFAULT ('TXN-' || upper(substr(gen_random_uuid()::text, 1, 8))),
  sender_account_id UUID REFERENCES public.accounts(id),
  receiver_account_id UUID REFERENCES public.accounts(id),
  amount NUMERIC(12,2) NOT NULL,
  transaction_type transaction_type NOT NULL,
  narration TEXT,
  status transaction_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Users can view transactions involving their accounts
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.accounts
    WHERE accounts.user_id = auth.uid()
    AND (accounts.id = transactions.sender_account_id OR accounts.id = transactions.receiver_account_id)
  )
);
CREATE POLICY "Admins can view all transactions" ON public.transactions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update transactions" ON public.transactions FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- OTP codes table
CREATE TABLE public.otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own OTP codes" ON public.otp_codes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own OTP codes" ON public.otp_codes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own OTP codes" ON public.otp_codes FOR UPDATE USING (auth.uid() = user_id);

-- Function to generate unique account numbers
CREATE OR REPLACE FUNCTION public.generate_account_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_number TEXT;
BEGIN
  LOOP
    new_number := 'EB' || LPAD(floor(random() * 10000000000)::bigint::text, 10, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.accounts WHERE account_number = new_number);
  END LOOP;
  RETURN new_number;
END;
$$;

-- Trigger to auto-generate account numbers
CREATE OR REPLACE FUNCTION public.set_account_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.account_number IS NULL OR NEW.account_number = '' THEN
    NEW.account_number := public.generate_account_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_account_number
  BEFORE INSERT ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_account_number();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
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

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Transfer funds RPC (atomic transaction)
CREATE OR REPLACE FUNCTION public.transfer_funds(
  p_sender_account_id UUID,
  p_receiver_account_id UUID,
  p_amount NUMERIC,
  p_narration TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_balance NUMERIC;
  v_sender_status account_status;
  v_receiver_status account_status;
  v_sender_user_id UUID;
  v_txn_id UUID;
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Transfer amount must be positive';
  END IF;

  -- Lock and check sender account
  SELECT balance, status, user_id INTO v_sender_balance, v_sender_status, v_sender_user_id
  FROM public.accounts WHERE id = p_sender_account_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sender account not found';
  END IF;

  IF v_sender_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: not your account';
  END IF;

  IF v_sender_status = 'frozen' THEN
    RAISE EXCEPTION 'Sender account is frozen';
  END IF;

  IF v_sender_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient funds';
  END IF;

  -- Lock and check receiver account
  SELECT status INTO v_receiver_status
  FROM public.accounts WHERE id = p_receiver_account_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Receiver account not found';
  END IF;

  IF v_receiver_status = 'frozen' THEN
    RAISE EXCEPTION 'Receiver account is frozen';
  END IF;

  -- Debit sender
  UPDATE public.accounts SET balance = balance - p_amount WHERE id = p_sender_account_id;

  -- Credit receiver
  UPDATE public.accounts SET balance = balance + p_amount WHERE id = p_receiver_account_id;

  -- Record transaction
  INSERT INTO public.transactions (sender_account_id, receiver_account_id, amount, transaction_type, narration, status)
  VALUES (p_sender_account_id, p_receiver_account_id, p_amount, 'transfer', p_narration, 'completed')
  RETURNING id INTO v_txn_id;

  RETURN v_txn_id;
END;
$$;

-- Admin: credit/debit account
CREATE OR REPLACE FUNCTION public.admin_adjust_balance(
  p_account_id UUID,
  p_amount NUMERIC,
  p_type transaction_type,
  p_narration TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_txn_id UUID;
  v_balance NUMERIC;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  IF p_type NOT IN ('deposit', 'withdrawal') THEN
    RAISE EXCEPTION 'Invalid type for admin adjustment';
  END IF;

  SELECT balance INTO v_balance FROM public.accounts WHERE id = p_account_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found';
  END IF;

  IF p_type = 'withdrawal' AND v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient funds for withdrawal';
  END IF;

  IF p_type = 'deposit' THEN
    UPDATE public.accounts SET balance = balance + p_amount WHERE id = p_account_id;
    INSERT INTO public.transactions (receiver_account_id, amount, transaction_type, narration, status)
    VALUES (p_account_id, p_amount, 'deposit', p_narration, 'completed') RETURNING id INTO v_txn_id;
  ELSE
    UPDATE public.accounts SET balance = balance - p_amount WHERE id = p_account_id;
    INSERT INTO public.transactions (sender_account_id, amount, transaction_type, narration, status)
    VALUES (p_account_id, p_amount, 'withdrawal', p_narration, 'completed') RETURNING id INTO v_txn_id;
  END IF;

  RETURN v_txn_id;
END;
$$;

-- Admin: reverse transaction
CREATE OR REPLACE FUNCTION public.admin_reverse_transaction(p_transaction_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_txn RECORD;
  v_reversal_id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  SELECT * INTO v_txn FROM public.transactions WHERE id = p_transaction_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  IF v_txn.status = 'reversed' THEN
    RAISE EXCEPTION 'Transaction already reversed';
  END IF;

  -- Reverse the balances
  IF v_txn.sender_account_id IS NOT NULL THEN
    UPDATE public.accounts SET balance = balance + v_txn.amount WHERE id = v_txn.sender_account_id;
  END IF;

  IF v_txn.receiver_account_id IS NOT NULL THEN
    UPDATE public.accounts SET balance = balance - v_txn.amount WHERE id = v_txn.receiver_account_id;
  END IF;

  -- Mark original as reversed
  UPDATE public.transactions SET status = 'reversed' WHERE id = p_transaction_id;

  -- Create reversal record
  INSERT INTO public.transactions (sender_account_id, receiver_account_id, amount, transaction_type, narration, status)
  VALUES (v_txn.receiver_account_id, v_txn.sender_account_id, v_txn.amount, 'reversal',
    'Reversal of ' || v_txn.reference_code, 'completed')
  RETURNING id INTO v_reversal_id;

  RETURN v_reversal_id;
END;
$$;

-- Admin: freeze/unfreeze account
CREATE OR REPLACE FUNCTION public.admin_toggle_account_status(p_account_id UUID, p_status account_status)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  UPDATE public.accounts SET status = p_status WHERE id = p_account_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found';
  END IF;
END;
$$;

-- Admins can read all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Users can insert their own accounts
CREATE POLICY "Users can insert own accounts" ON public.accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
