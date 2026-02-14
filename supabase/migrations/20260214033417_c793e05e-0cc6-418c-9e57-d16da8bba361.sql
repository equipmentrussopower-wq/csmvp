CREATE OR REPLACE FUNCTION public.generate_account_number()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  new_number TEXT;
BEGIN
  LOOP
    new_number := LPAD(floor(random() * 10000000000)::bigint::text, 10, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.accounts WHERE account_number = new_number);
  END LOOP;
  RETURN new_number;
END;
$function$