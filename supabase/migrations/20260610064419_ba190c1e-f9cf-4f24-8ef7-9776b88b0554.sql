
-- 1. Expiration columns
ALTER TABLE public.points_ledger ADD COLUMN IF NOT EXISTS expires_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_ledger_user_expires ON public.points_ledger(user_id, expires_at) WHERE expires_at IS NOT NULL AND delta > 0;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS points_expire_days int;

-- 2. award_points: set expiration + notify on positive delta
CREATE OR REPLACE FUNCTION public.award_points(_user uuid, _delta integer, _source text, _ref_id uuid DEFAULT NULL::uuid, _ref_table text DEFAULT NULL::text, _metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _new int; _expires timestamptz; _days int; _label text;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'user required'; END IF;
  UPDATE public.profiles SET total_points = COALESCE(total_points,0) + _delta
    WHERE id = _user RETURNING total_points, points_expire_days INTO _new, _days;
  IF _new IS NULL THEN RAISE EXCEPTION 'profile not found'; END IF;
  IF _new < 0 THEN
    UPDATE public.profiles SET total_points = COALESCE(total_points,0) - _delta WHERE id = _user;
    RAISE EXCEPTION 'Insufficient points';
  END IF;
  IF _delta > 0 AND _days IS NOT NULL AND _days > 0 THEN
    _expires := now() + (_days || ' days')::interval;
  END IF;
  INSERT INTO public.points_ledger(user_id, delta, balance_after, source, ref_id, ref_table, metadata, expires_at)
    VALUES (_user, _delta, _new, _source, _ref_id, _ref_table, COALESCE(_metadata,'{}'::jsonb), _expires);

  IF _delta > 0 AND _source <> 'referral_bonus' THEN
    _label := CASE _source
      WHEN 'check_in' THEN 'check-in'
      WHEN 'review' THEN 'review'
      WHEN 'campaign_redemption' THEN 'campaign reward'
      WHEN 'social_post' THEN 'approved social post'
      WHEN 'referral_reward' THEN 'referral'
      ELSE _source END;
    INSERT INTO public.notifications(user_id, type, title, body, link, payload) VALUES (
      _user, 'points_earned',
      '+' || _delta || ' CO:FE(X) points',
      'You earned ' || _delta || ' pts from your ' || _label || '. New balance: ' || _new || ' pts.',
      '/wallet',
      jsonb_build_object('delta', _delta, 'balance', _new, 'source', _source, 'expires_at', _expires)
    );
  END IF;
  RETURN _new;
END;
$function$;

-- 3. User-facing policy setter
CREATE OR REPLACE FUNCTION public.set_points_expiration_policy(_days int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _user uuid := auth.uid();
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _days IS NOT NULL AND (_days < 30 OR _days > 3650) THEN RAISE EXCEPTION 'Window must be between 30 and 3650 days'; END IF;
  UPDATE public.profiles SET points_expire_days = _days WHERE id = _user;
  RETURN jsonb_build_object('points_expire_days', _days);
END; $$;

-- 4. Aggregated expiring buckets for timeline
CREATE OR REPLACE FUNCTION public.get_expiring_points_buckets()
RETURNS TABLE(bucket text, expires_at timestamptz, amount bigint)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT
    CASE
      WHEN expires_at < now() THEN 'expired'
      WHEN expires_at < now() + interval '7 days' THEN '7d'
      WHEN expires_at < now() + interval '30 days' THEN '30d'
      WHEN expires_at < now() + interval '90 days' THEN '90d'
      ELSE 'later' END AS bucket,
    date_trunc('day', expires_at) AS expires_at,
    SUM(delta)::bigint AS amount
  FROM public.points_ledger
  WHERE user_id = auth.uid() AND expires_at IS NOT NULL AND delta > 0
  GROUP BY 1, 2
  ORDER BY 2 ASC;
$$;

-- 5. Partner marks a wallet code used + notify explorer
CREATE OR REPLACE FUNCTION public.partner_mark_catalog_code_used(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _partner uuid := auth.uid(); _r record;
BEGIN
  IF _partner IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_role(_partner, 'partner') AND NOT public.has_role(_partner, 'admin') THEN
    RAISE EXCEPTION 'Only partners can mark codes used';
  END IF;
  SELECT cr.*, rc.name AS item_name INTO _r
    FROM public.catalog_redemptions cr JOIN public.reward_catalog rc ON rc.id = cr.catalog_id
   WHERE cr.redemption_code = upper(trim(_code));
  IF NOT FOUND THEN RAISE EXCEPTION 'Code not found'; END IF;
  IF _r.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('result','already_used','used_at', _r.used_at,'item', _r.item_name);
  END IF;
  UPDATE public.catalog_redemptions SET used_at = now(), used_by = _partner WHERE id = _r.id;
  INSERT INTO public.notifications(user_id, type, title, body, link, payload) VALUES (
    _r.user_id, 'wallet_code_redeemed',
    'Reward redeemed: ' || _r.item_name,
    'Your code ' || _r.redemption_code || ' was just used. Enjoy!',
    '/wallet',
    jsonb_build_object('code', _r.redemption_code, 'item', _r.item_name)
  );
  RETURN jsonb_build_object('result','ok','item', _r.item_name,'code', _r.redemption_code,'points_spent', _r.points_spent);
END; $$;

-- 6. Extend verify_redemption_code to fall back to wallet (catalog) codes
CREATE OR REPLACE FUNCTION public.verify_redemption_code(_code text, _ip text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _partner uuid := auth.uid();
  _attempts int;
  _r record;
  _result text;
  _cat record;
BEGIN
  IF _partner IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT COUNT(*) INTO _attempts
    FROM public.redemption_verifications
   WHERE partner_id = _partner AND verified_at > now() - interval '1 hour';
  IF _attempts >= 60 THEN
    INSERT INTO public.redemption_verifications(partner_id, code, result, ip)
      VALUES (_partner, upper(coalesce(_code,'')), 'rate_limited', _ip);
    RAISE EXCEPTION 'Too many verification attempts. Please wait a few minutes.';
  END IF;

  _code := upper(trim(_code));
  IF _code IS NULL OR length(_code) < 4 THEN
    INSERT INTO public.redemption_verifications(partner_id, code, result, ip)
      VALUES (_partner, coalesce(_code,''), 'not_found', _ip);
    RAISE EXCEPTION 'Invalid code';
  END IF;

  SELECT cr.id AS redemption_id, cr.campaign_id, cr.user_id AS explorer_id, cr.points_awarded,
         cr.used_at, c.title AS campaign_title, c.reward_description, s.partner_id AS shop_owner, s.name AS shop_name
    INTO _r
    FROM public.campaign_redemptions cr
    JOIN public.campaigns c ON c.id = cr.campaign_id
    JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
   WHERE cr.redemption_code = _code;

  IF _r IS NULL THEN
    -- Fallback: wallet catalog code
    SELECT cr.id, cr.user_id, cr.points_spent, cr.used_at, rc.name AS item_name
      INTO _cat
      FROM public.catalog_redemptions cr JOIN public.reward_catalog rc ON rc.id = cr.catalog_id
     WHERE cr.redemption_code = _code;
    IF _cat IS NULL THEN
      INSERT INTO public.redemption_verifications(partner_id, code, result, ip)
        VALUES (_partner, _code, 'not_found', _ip);
      RAISE EXCEPTION 'Code not found';
    END IF;
    IF _cat.used_at IS NOT NULL THEN
      _result := 'already_used';
    ELSE
      UPDATE public.catalog_redemptions SET used_at = now(), used_by = _partner WHERE id = _cat.id;
      INSERT INTO public.notifications(user_id, type, title, body, link, payload) VALUES (
        _cat.user_id, 'wallet_code_redeemed',
        'Reward redeemed: ' || _cat.item_name,
        'Your code ' || _code || ' was just used. Enjoy!',
        '/wallet', jsonb_build_object('code', _code, 'item', _cat.item_name));
      _result := 'ok';
    END IF;
    INSERT INTO public.redemption_verifications(partner_id, code, result, ip)
      VALUES (_partner, _code, _result, _ip);
    RETURN jsonb_build_object(
      'result', _result, 'redemption_code', _code,
      'campaign_title', _cat.item_name, 'reward', 'Wallet reward',
      'shop_name', null, 'used_at', (SELECT used_at FROM public.catalog_redemptions WHERE id = _cat.id),
      'points_awarded', _cat.points_spent, 'kind', 'wallet'
    );
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
    INSERT INTO public.notifications(user_id, type, title, body, link, payload) VALUES (
      _r.explorer_id, 'campaign_code_redeemed',
      'Reward redeemed at ' || _r.shop_name,
      'Your code ' || _code || ' was just used. Enjoy!',
      '/campaign/' || _r.campaign_id::text,
      jsonb_build_object('code', _code, 'campaign_id', _r.campaign_id));
    _result := 'ok';
  END IF;

  INSERT INTO public.redemption_verifications(partner_id, campaign_id, redemption_id, code, result, ip)
    VALUES (_partner, _r.campaign_id, _r.redemption_id, _code, _result, _ip);

  RETURN jsonb_build_object(
    'result', _result, 'redemption_code', _code, 'campaign_id', _r.campaign_id,
    'campaign_title', _r.campaign_title, 'reward', _r.reward_description,
    'shop_name', _r.shop_name,
    'used_at', (SELECT used_at FROM public.campaign_redemptions WHERE id = _r.redemption_id),
    'points_awarded', _r.points_awarded, 'kind', 'campaign'
  );
END;
$function$;
