
-- Verification audit log
CREATE TABLE IF NOT EXISTS public.redemption_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  redemption_id uuid REFERENCES public.campaign_redemptions(id) ON DELETE SET NULL,
  code text NOT NULL,
  result text NOT NULL, -- ok | already_used | not_found | not_yours | rate_limited
  ip text,
  verified_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_redver_partner_time ON public.redemption_verifications(partner_id, verified_at DESC);
GRANT SELECT, INSERT ON public.redemption_verifications TO authenticated;
GRANT ALL ON public.redemption_verifications TO service_role;
ALTER TABLE public.redemption_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partner reads own verifications" ON public.redemption_verifications
  FOR SELECT TO authenticated USING (partner_id = auth.uid());
CREATE POLICY "Admins manage verifications" ON public.redemption_verifications
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  payload jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_time ON public.notifications(user_id, created_at DESC);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User reads own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "User updates own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins manage notifications" ON public.notifications
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Verify redemption code RPC
CREATE OR REPLACE FUNCTION public.verify_redemption_code(_code text, _ip text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _partner uuid := auth.uid();
  _attempts int;
  _r record;
  _result text;
  _shop_owner uuid;
BEGIN
  IF _partner IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Rate limit: 60 verifications per hour per partner
  SELECT COUNT(*) INTO _attempts
    FROM public.redemption_verifications
   WHERE partner_id = _partner AND verified_at > now() - interval '1 hour';
  IF _attempts >= 60 THEN
    INSERT INTO public.redemption_verifications(partner_id, code, result, ip)
      VALUES (_partner, upper(coalesce(_code,'')), 'rate_limited', _ip);
    RAISE EXCEPTION 'Too many verification attempts. Please wait a few minutes.';
  END IF;

  -- Normalise code
  _code := upper(trim(_code));
  IF _code IS NULL OR length(_code) < 4 THEN
    INSERT INTO public.redemption_verifications(partner_id, code, result, ip)
      VALUES (_partner, coalesce(_code,''), 'not_found', _ip);
    RAISE EXCEPTION 'Invalid code';
  END IF;

  -- Look up redemption + ownership
  SELECT cr.id AS redemption_id, cr.campaign_id, cr.user_id AS explorer_id, cr.points_awarded,
         cr.used_at, c.title AS campaign_title, c.reward_description, s.partner_id AS shop_owner, s.name AS shop_name
    INTO _r
    FROM public.campaign_redemptions cr
    JOIN public.campaigns c ON c.id = cr.campaign_id
    JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
   WHERE cr.redemption_code = _code;

  IF _r IS NULL THEN
    INSERT INTO public.redemption_verifications(partner_id, code, result, ip)
      VALUES (_partner, _code, 'not_found', _ip);
    RAISE EXCEPTION 'Code not found';
  END IF;

  IF _r.shop_owner <> _partner THEN
    INSERT INTO public.redemption_verifications(partner_id, campaign_id, redemption_id, code, result, ip)
      VALUES (_partner, _r.campaign_id, _r.redemption_id, _code, 'not_yours', _ip);
    RAISE EXCEPTION 'This code does not belong to your café';
  END IF;

  IF _r.used_at IS NOT NULL THEN
    _result := 'already_used';
  ELSE
    UPDATE public.campaign_redemptions SET used_at = now() WHERE id = _r.redemption_id;
    _result := 'ok';
  END IF;

  INSERT INTO public.redemption_verifications(partner_id, campaign_id, redemption_id, code, result, ip)
    VALUES (_partner, _r.campaign_id, _r.redemption_id, _code, _result, _ip);

  RETURN jsonb_build_object(
    'result', _result,
    'redemption_code', _code,
    'campaign_id', _r.campaign_id,
    'campaign_title', _r.campaign_title,
    'reward', _r.reward_description,
    'shop_name', _r.shop_name,
    'used_at', (SELECT used_at FROM public.campaign_redemptions WHERE id = _r.redemption_id),
    'points_awarded', _r.points_awarded
  );
END;
$$;

-- Update join_campaign to notify partner + explorer
CREATE OR REPLACE FUNCTION public.join_campaign(_campaign_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _c record;
  _count int;
  _shop_owner uuid;
  _shop_name text;
  _explorer_name text;
  _inserted boolean;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT c.*, s.partner_id AS partner_id, s.name AS shop_name INTO _c
    FROM public.campaigns c JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
   WHERE c.id = _campaign_id AND c.status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Campaign not available'; END IF;
  IF _c.ends_at IS NOT NULL AND _c.ends_at < now() THEN RAISE EXCEPTION 'Campaign has ended'; END IF;

  IF _c.max_participants IS NOT NULL THEN
    SELECT COUNT(*) INTO _count FROM public.campaign_participants WHERE campaign_id = _campaign_id;
    IF _count >= _c.max_participants AND NOT EXISTS (
      SELECT 1 FROM public.campaign_participants WHERE campaign_id = _campaign_id AND user_id = _user
    ) THEN RAISE EXCEPTION 'This campaign is full'; END IF;
  END IF;

  INSERT INTO public.campaign_participants (campaign_id, user_id)
    VALUES (_campaign_id, _user) ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS _inserted = ROW_COUNT;

  IF _inserted THEN
    SELECT display_name INTO _explorer_name FROM public.profiles WHERE id = _user;
    -- notify partner
    IF _c.partner_id IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, type, title, body, link, payload) VALUES (
        _c.partner_id, 'campaign_join',
        'New campaign participant',
        COALESCE(_explorer_name,'Someone') || ' joined "' || _c.title || '"',
        '/partner/analytics',
        jsonb_build_object('campaign_id', _campaign_id, 'explorer_id', _user)
      );
    END IF;
    -- notify explorer
    INSERT INTO public.notifications(user_id, type, title, body, link, payload) VALUES (
      _user, 'campaign_joined',
      'You joined ' || _c.title,
      'Visit ' || _c.shop_name || ' and check in to qualify for the reward.',
      '/campaign/' || _campaign_id::text,
      jsonb_build_object('campaign_id', _campaign_id)
    );
  END IF;

  RETURN jsonb_build_object('joined', true, 'campaign_id', _campaign_id);
END;
$$;

-- Update redeem_campaign to notify partner
CREATE OR REPLACE FUNCTION public.redeem_campaign(_campaign_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _c record;
  _qualifying int;
  _existing public.campaign_redemptions%ROWTYPE;
  _new_code text;
  _shop_owner uuid;
  _shop_name text;
  _explorer_name text;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT c.*, s.partner_id AS partner_id, s.name AS shop_name INTO _c
    FROM public.campaigns c JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
   WHERE c.id = _campaign_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Campaign not found'; END IF;

  SELECT * INTO _existing FROM public.campaign_redemptions WHERE campaign_id = _campaign_id AND user_id = _user;
  IF FOUND THEN
    RETURN jsonb_build_object('already_redeemed', true, 'redemption_code', _existing.redemption_code, 'points_awarded', _existing.points_awarded);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.campaign_participants WHERE campaign_id = _campaign_id AND user_id = _user) THEN
    RAISE EXCEPTION 'Join the campaign first';
  END IF;

  SELECT COUNT(*) INTO _qualifying
    FROM public.check_ins
   WHERE user_id = _user AND coffee_shop_id = _c.coffee_shop_id
     AND (campaign_id = _campaign_id OR campaign_id IS NULL);

  IF _qualifying < GREATEST(COALESCE(_c.required_check_ins,1),1) THEN
    RAISE EXCEPTION 'You need % check-in(s) at the host café to redeem', GREATEST(COALESCE(_c.required_check_ins,1),1);
  END IF;

  INSERT INTO public.campaign_redemptions (campaign_id, user_id, points_awarded)
    VALUES (_campaign_id, _user, COALESCE(_c.points_reward, 0))
    RETURNING redemption_code INTO _new_code;

  UPDATE public.profiles SET total_points = COALESCE(total_points,0) + COALESCE(_c.points_reward,0)
   WHERE id = _user;

  SELECT display_name INTO _explorer_name FROM public.profiles WHERE id = _user;

  IF _c.partner_id IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, type, title, body, link, payload) VALUES (
      _c.partner_id, 'campaign_redeemed',
      'Reward unlocked at ' || _c.shop_name,
      COALESCE(_explorer_name,'An explorer') || ' unlocked "' || _c.title || '". Code ' || _new_code,
      '/partner/verify',
      jsonb_build_object('campaign_id', _campaign_id, 'code', _new_code, 'explorer_id', _user)
    );
  END IF;

  INSERT INTO public.notifications(user_id, type, title, body, link, payload) VALUES (
    _user, 'reward_unlocked',
    'Reward unlocked! ' || COALESCE(_c.reward_description,_c.title),
    'Show code ' || _new_code || ' at ' || _c.shop_name || ' to claim your reward.',
    '/campaign/' || _campaign_id::text,
    jsonb_build_object('campaign_id', _campaign_id, 'code', _new_code)
  );

  RETURN jsonb_build_object(
    'redeemed', true,
    'redemption_code', _new_code,
    'points_awarded', COALESCE(_c.points_reward, 0)
  );
END;
$$;
