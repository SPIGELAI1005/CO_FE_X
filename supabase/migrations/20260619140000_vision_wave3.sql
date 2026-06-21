-- Vision Wave 3: crews, gifting, arrivals, push subscriptions

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_subscription jsonb;

CREATE TABLE IF NOT EXISTS public.crews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  invite_code text NOT NULL UNIQUE DEFAULT upper(substr(md5(random()::text), 1, 8)),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crew_members (
  crew_id uuid NOT NULL REFERENCES public.crews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (crew_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.gift_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text,
  points_value int NOT NULL DEFAULT 100,
  redemption_code text NOT NULL UNIQUE DEFAULT upper(substr(md5(random()::text), 1, 8)),
  redeemed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shop_arrivals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coffee_shop_id uuid NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  eta_minutes int NOT NULL DEFAULT 5,
  message text,
  status text NOT NULL DEFAULT 'incoming' CHECK (status IN ('incoming', 'arrived', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_arrivals_shop ON public.shop_arrivals (coffee_shop_id, status, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.crews, public.crew_members, public.gift_credits, public.shop_arrivals TO authenticated;

ALTER TABLE public.crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_arrivals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read crew" ON public.crews FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.crew_members m WHERE m.crew_id = id AND m.user_id = auth.uid()));
CREATE POLICY "Owner create crew" ON public.crews FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Members read crew members" ON public.crew_members FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.crew_members m WHERE m.crew_id = crew_id AND m.user_id = auth.uid()));
CREATE POLICY "Join crew" ON public.crew_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Read own gifts" ON public.gift_credits FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());
CREATE POLICY "Send gift" ON public.gift_credits FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
CREATE POLICY "User manage own arrivals" ON public.shop_arrivals FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Partner read shop arrivals" ON public.shop_arrivals FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = coffee_shop_id AND s.partner_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.create_crew(_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _user uuid := auth.uid();
  _crew public.crews%ROWTYPE;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO public.crews (name, owner_id) VALUES (_name, _user) RETURNING * INTO _crew;
  INSERT INTO public.crew_members (crew_id, user_id) VALUES (_crew.id, _user);
  RETURN jsonb_build_object('id', _crew.id, 'name', _crew.name, 'invite_code', _crew.invite_code);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_crew(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.join_crew(_invite_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _user uuid := auth.uid();
  _crew public.crews%ROWTYPE;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _crew FROM public.crews WHERE invite_code = upper(trim(_invite_code));
  IF NOT FOUND THEN RAISE EXCEPTION 'Crew not found'; END IF;
  INSERT INTO public.crew_members (crew_id, user_id) VALUES (_crew.id, _user) ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('id', _crew.id, 'name', _crew.name);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_crew(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.send_gift_credit(_recipient_id uuid, _message text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _user uuid := auth.uid();
  _gift public.gift_credits%ROWTYPE;
  _cost int := 100;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _recipient_id = _user THEN RAISE EXCEPTION 'Cannot gift yourself'; END IF;
  PERFORM public.award_points(_user, -_cost, 'catalog_redemption', NULL, NULL, jsonb_build_object('gift', true));
  INSERT INTO public.gift_credits (sender_id, recipient_id, message, points_value)
  VALUES (_user, _recipient_id, _message, _cost)
  RETURNING * INTO _gift;
  INSERT INTO public.notifications(user_id, type, title, body, link, payload) VALUES (
    _recipient_id, 'gift_received',
    'You received a coffee gift!',
    COALESCE(_message, 'A friend sent you a free coffee. Redeem with code ' || _gift.redemption_code),
    '/wallet',
    jsonb_build_object('gift_id', _gift.id, 'code', _gift.redemption_code)
  );
  RETURN jsonb_build_object('gift_id', _gift.id, 'code', _gift.redemption_code);
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_gift_credit(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.announce_shop_arrival(_shop_id uuid, _eta_minutes int DEFAULT 5, _message text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _user uuid := auth.uid();
  _shop record;
  _arrival_id uuid;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT id, name, partner_id INTO _shop FROM public.coffee_shops WHERE id = _shop_id AND status = 'approved';
  IF NOT FOUND THEN RAISE EXCEPTION 'Shop not found'; END IF;

  INSERT INTO public.shop_arrivals (coffee_shop_id, user_id, eta_minutes, message)
  VALUES (_shop_id, _user, _eta_minutes, _message)
  RETURNING id INTO _arrival_id;

  IF _shop.partner_id IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, type, title, body, link, payload) VALUES (
      _shop.partner_id, 'explorer_arriving',
      'Explorer on the way',
      (SELECT COALESCE(display_name, 'An explorer') FROM public.profiles WHERE id = _user)
        || ' is ~' || _eta_minutes || ' min away · ' || COALESCE(_shop.name, 'your café'),
      '/partner',
      jsonb_build_object('arrival_id', _arrival_id, 'shop_id', _shop_id)
    );
  END IF;

  RETURN jsonb_build_object('arrival_id', _arrival_id, 'eta_minutes', _eta_minutes);
END;
$$;

GRANT EXECUTE ON FUNCTION public.announce_shop_arrival(uuid, int, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_partner_arrivals(_shop_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', a.id,
    'shop_id', a.coffee_shop_id,
    'shop_name', s.name,
    'explorer_name', p.display_name,
    'eta_minutes', a.eta_minutes,
    'message', a.message,
    'created_at', a.created_at
  ) ORDER BY a.created_at DESC), '[]'::jsonb)
  FROM public.shop_arrivals a
  JOIN public.coffee_shops s ON s.id = a.coffee_shop_id
  LEFT JOIN public.profiles p ON p.id = a.user_id
  WHERE a.status = 'incoming'
    AND a.created_at > now() - interval '2 hours'
    AND s.partner_id = auth.uid()
    AND (_shop_id IS NULL OR a.coffee_shop_id = _shop_id);
$$;

GRANT EXECUTE ON FUNCTION public.get_partner_arrivals(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.save_push_subscription(_subscription jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _user uuid := auth.uid();
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.profiles SET push_subscription = _subscription WHERE id = _user;
  RETURN jsonb_build_object('saved', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_push_subscription(jsonb) TO authenticated;
