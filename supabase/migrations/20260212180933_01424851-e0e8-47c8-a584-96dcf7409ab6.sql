
-- Fix generate_account_number search_path
CREATE OR REPLACE FUNCTION public.generate_account_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
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

-- Fix set_account_number search_path
CREATE OR REPLACE FUNCTION public.set_account_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.account_number IS NULL OR NEW.account_number = '' THEN
    NEW.account_number := public.generate_account_number();
  END IF;
  RETURN NEW;
END;
$$;
