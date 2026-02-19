-- Update request_debit_card to be an application only (no fee, pending status)
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
  v_card_id UUID;
  v_card_num TEXT;
BEGIN
  -- Check if user already has a pending or active card to prevent spam
  IF EXISTS (SELECT 1 FROM public.cards WHERE user_id = auth.uid() AND status IN ('pending', 'active')) THEN
    RAISE EXCEPTION 'You already have a card or a pending application.';
  END IF;

  -- Generate card number (placeholder for now, or real one)
  v_card_num := public.generate_card_number();

  -- Insert card with 'pending' status
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
    'pending'
  ) RETURNING id INTO v_card_id;

  RETURN v_card_id;
END;
$$;

-- Function for Admin to activate a card
CREATE OR REPLACE FUNCTION public.admin_activate_card(
  p_card_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE public.cards
  SET status = 'active', updated_at = now()
  WHERE id = p_card_id;
END;
$$;
