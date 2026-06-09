
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS required_check_ins integer NOT NULL DEFAULT 1;

-- Participants
CREATE TABLE IF NOT EXISTS public.campaign_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.campaign_participants TO authenticated;
GRANT ALL ON public.campaign_participants TO service_role;
ALTER TABLE public.campaign_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User views own participation" ON public.campaign_participants FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "User joins self" ON public.campaign_participants FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "User leaves self" ON public.campaign_participants FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Partners view participants of own campaigns" ON public.campaign_participants FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.campaigns c
    JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
    WHERE c.id = campaign_participants.campaign_id AND s.partner_id = auth.uid()
  )
);
CREATE POLICY "Admins manage participants" ON public.campaign_participants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Redemptions
CREATE TABLE IF NOT EXISTS public.campaign_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redemption_code text NOT NULL UNIQUE DEFAULT upper(substr(md5(random()::text), 1, 8)),
  points_awarded integer NOT NULL DEFAULT 0,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz,
  UNIQUE (campaign_id, user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.campaign_redemptions TO authenticated;
GRANT ALL ON public.campaign_redemptions TO service_role;
ALTER TABLE public.campaign_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User views own redemptions" ON public.campaign_redemptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Partner views redemptions of own campaigns" ON public.campaign_redemptions FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.campaigns c
    JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
    WHERE c.id = campaign_redemptions.campaign_id AND s.partner_id = auth.uid()
  )
);
CREATE POLICY "Partner marks own redemption used" ON public.campaign_redemptions FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.campaigns c
    JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
    WHERE c.id = campaign_redemptions.campaign_id AND s.partner_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.campaigns c
    JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
    WHERE c.id = campaign_redemptions.campaign_id AND s.partner_id = auth.uid()
  )
);
CREATE POLICY "Admins manage redemptions" ON public.campaign_redemptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- join_campaign RPC
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
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _c FROM public.campaigns WHERE id = _campaign_id AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Campaign not available'; END IF;
  IF _c.ends_at IS NOT NULL AND _c.ends_at < now() THEN RAISE EXCEPTION 'Campaign has ended'; END IF;

  IF _c.max_participants IS NOT NULL THEN
    SELECT COUNT(*) INTO _count FROM public.campaign_participants WHERE campaign_id = _campaign_id;
    IF _count >= _c.max_participants AND NOT EXISTS (
      SELECT 1 FROM public.campaign_participants WHERE campaign_id = _campaign_id AND user_id = _user
    ) THEN
      RAISE EXCEPTION 'This campaign is full';
    END IF;
  END IF;

  INSERT INTO public.campaign_participants (campaign_id, user_id)
    VALUES (_campaign_id, _user)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('joined', true, 'campaign_id', _campaign_id);
END;
$$;

-- redeem_campaign RPC
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
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _c FROM public.campaigns WHERE id = _campaign_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Campaign not found'; END IF;

  -- Already redeemed?
  SELECT * INTO _existing FROM public.campaign_redemptions WHERE campaign_id = _campaign_id AND user_id = _user;
  IF FOUND THEN
    RETURN jsonb_build_object('already_redeemed', true, 'redemption_code', _existing.redemption_code, 'points_awarded', _existing.points_awarded);
  END IF;

  -- Must be a participant
  IF NOT EXISTS (SELECT 1 FROM public.campaign_participants WHERE campaign_id = _campaign_id AND user_id = _user) THEN
    RAISE EXCEPTION 'Join the campaign first';
  END IF;

  -- Count qualifying check-ins at the host shop linked to this campaign
  SELECT COUNT(*) INTO _qualifying
    FROM public.check_ins
   WHERE user_id = _user
     AND coffee_shop_id = _c.coffee_shop_id
     AND (campaign_id = _campaign_id OR campaign_id IS NULL);

  IF _qualifying < GREATEST(COALESCE(_c.required_check_ins, 1), 1) THEN
    RAISE EXCEPTION 'You need % check-in(s) at the host café to redeem', GREATEST(COALESCE(_c.required_check_ins,1),1);
  END IF;

  INSERT INTO public.campaign_redemptions (campaign_id, user_id, points_awarded)
    VALUES (_campaign_id, _user, COALESCE(_c.points_reward, 0))
    RETURNING redemption_code INTO _new_code;

  UPDATE public.profiles
     SET total_points = COALESCE(total_points, 0) + COALESCE(_c.points_reward, 0)
   WHERE id = _user;

  RETURN jsonb_build_object(
    'redeemed', true,
    'redemption_code', _new_code,
    'points_awarded', COALESCE(_c.points_reward, 0)
  );
END;
$$;

-- perform_check_in now accepts an optional campaign id and links the check-in
CREATE OR REPLACE FUNCTION public.perform_check_in(_shop_id uuid, _campaign_id uuid DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user uuid := auth.uid();
  _points int := 10;
  _check_in_id uuid;
  _total_check_ins int;
  _unique_shops int;
  _new_badges jsonb := '[]'::jsonb;
  _b record;
  _ctype text;
  _threshold int;
  _value text;
  _count int;
  _qualifies boolean;
  _inserted boolean;
  _countries text[];
  _campaign_progress jsonb := NULL;
  _c record;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.coffee_shops WHERE id = _shop_id AND status='approved') THEN
    RAISE EXCEPTION 'Coffee shop not available';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.check_ins
    WHERE user_id = _user AND coffee_shop_id = _shop_id
      AND created_at > now() - interval '24 hours'
  ) THEN
    RAISE EXCEPTION 'You already checked in here in the last 24h';
  END IF;

  -- validate campaign link
  IF _campaign_id IS NOT NULL THEN
    SELECT * INTO _c FROM public.campaigns WHERE id = _campaign_id AND coffee_shop_id = _shop_id AND status = 'active';
    IF NOT FOUND THEN _campaign_id := NULL; END IF;
  END IF;

  INSERT INTO public.check_ins (user_id, coffee_shop_id, points_awarded, verified, campaign_id)
  VALUES (_user, _shop_id, _points, false, _campaign_id)
  RETURNING id INTO _check_in_id;

  UPDATE public.profiles
     SET total_points = COALESCE(total_points,0) + _points,
         total_check_ins = COALESCE(total_check_ins,0) + 1
   WHERE id = _user;

  SELECT total_check_ins INTO _total_check_ins FROM public.profiles WHERE id = _user;
  SELECT COUNT(DISTINCT coffee_shop_id) INTO _unique_shops FROM public.check_ins WHERE user_id = _user;

  FOR _b IN SELECT id, slug, name, criteria FROM public.badges LOOP
    _ctype := _b.criteria->>'type';
    _threshold := COALESCE((_b.criteria->>'threshold')::int, 1);
    _value := _b.criteria->>'value';
    _qualifies := false;

    IF _ctype = 'check_ins' THEN
      _qualifies := _total_check_ins >= _threshold;
    ELSIF _ctype = 'unique_shops' THEN
      _qualifies := _unique_shops >= _threshold;
    ELSIF _ctype = 'tag' THEN
      SELECT COUNT(*) INTO _count FROM public.check_ins ci JOIN public.coffee_shops s ON s.id = ci.coffee_shop_id
       WHERE ci.user_id = _user AND _value = ANY(s.tags);
      _qualifies := _count >= _threshold;
    ELSIF _ctype = 'city' THEN
      SELECT COUNT(DISTINCT ci.coffee_shop_id) INTO _count FROM public.check_ins ci JOIN public.coffee_shops s ON s.id = ci.coffee_shop_id
       WHERE ci.user_id = _user AND lower(s.city) = lower(_value);
      _qualifies := _count >= _threshold;
    ELSIF _ctype = 'country' THEN
      SELECT COUNT(DISTINCT ci.coffee_shop_id) INTO _count FROM public.check_ins ci JOIN public.coffee_shops s ON s.id = ci.coffee_shop_id
       WHERE ci.user_id = _user AND lower(s.country) = lower(_value);
      _qualifies := _count >= _threshold;
    ELSIF _ctype = 'region_countries' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(_b.criteria->'countries')) INTO _countries;
      SELECT COUNT(DISTINCT lower(s.country)) INTO _count FROM public.check_ins ci JOIN public.coffee_shops s ON s.id = ci.coffee_shop_id
       WHERE ci.user_id = _user AND lower(s.country) = ANY(SELECT lower(c) FROM unnest(_countries) c);
      _qualifies := _count >= _threshold;
    END IF;

    IF _qualifies THEN
      INSERT INTO public.user_badges (user_id, badge_id) VALUES (_user, _b.id) ON CONFLICT DO NOTHING;
      GET DIAGNOSTICS _inserted = ROW_COUNT;
      IF _inserted THEN
        _new_badges := _new_badges || jsonb_build_object('slug', _b.slug, 'name', _b.name);
      END IF;
    END IF;
  END LOOP;

  IF _campaign_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'campaign_id', _campaign_id,
      'qualifying_check_ins', (SELECT COUNT(*) FROM public.check_ins WHERE user_id=_user AND campaign_id=_campaign_id),
      'required', GREATEST(COALESCE(_c.required_check_ins,1),1)
    ) INTO _campaign_progress;
  END IF;

  RETURN jsonb_build_object(
    'check_in_id', _check_in_id,
    'points_awarded', _points,
    'total_points', (SELECT total_points FROM public.profiles WHERE id = _user),
    'total_check_ins', _total_check_ins,
    'unique_shops', _unique_shops,
    'new_badges', _new_badges,
    'campaign_progress', _campaign_progress
  );
END;
$function$;
