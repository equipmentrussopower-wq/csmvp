
-- Add 'checking' to the account_type enum (keeping 'current' for backward compat)
ALTER TYPE public.account_type ADD VALUE IF NOT EXISTS 'checking';

-- Update handle_new_user to auto-create savings + checking accounts on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'));

  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  -- Auto-create a Savings account
  INSERT INTO public.accounts (user_id, account_type, account_number)
  VALUES (NEW.id, 'savings', public.generate_account_number());

  -- Auto-create a Checking account
  INSERT INTO public.accounts (user_id, account_type, account_number)
  VALUES (NEW.id, 'checking', public.generate_account_number());

  RETURN NEW;
END;
$$;
