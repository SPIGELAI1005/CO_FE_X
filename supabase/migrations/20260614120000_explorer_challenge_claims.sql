-- Explorer challenge claims: server-verified weekly/milestone rewards

CREATE TABLE IF NOT EXISTS public.user_challenge_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id text NOT NULL,
  period_key text NOT NULL,
  points_awarded int NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, challenge_id, period_key)
);

CREATE INDEX IF NOT EXISTS idx_challenge_claims_user ON public.user_challenge_claims(user_id, claimed_at DESC);

ALTER TABLE public.user_challenge_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own challenge claims"
  ON public.user_challenge_claims FOR SELECT
  USING (auth.uid() = user_id);

GRANT SELECT ON public.user_challenge_claims TO authenticated;
GRANT ALL ON public.user_challenge_claims TO service_role;

-- Stats mirror get_coffee_radar personal stats block
CREATE OR REPLACE FUNCTION public.get_explorer_challenge_stats(_user uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _visits int;
  _new_shops int;
  _cities int;
  _streak int;
BEGIN
  SELECT COUNT(*)::int INTO _visits
  FROM public.check_ins ci
  WHERE ci.user_id = _user AND ci.created_at > date_trunc('week', now());

  SELECT COUNT(DISTINCT ci.coffee_shop_id)::int INTO _new_shops
  FROM public.check_ins ci
  WHERE ci.user_id = _user AND ci.created_at > date_trunc('week', now());

  SELECT COUNT(DISTINCT s.city)::int INTO _cities
  FROM public.check_ins ci
  JOIN public.coffee_shops s ON s.id = ci.coffee_shop_id
  WHERE ci.user_id = _user AND s.city IS NOT NULL;

  WITH days AS (
    SELECT DISTINCT date_trunc('day', created_at)::date AS d
    FROM public.check_ins WHERE user_id = _user AND created_at > now() - interval '30 days'
  ), ranked AS (
    SELECT d, ROW_NUMBER() OVER (ORDER BY d DESC) AS rn FROM days
  )
  SELECT COUNT(*)::int INTO _streak FROM ranked WHERE d = (CURRENT_DATE - (rn - 1));

  RETURN jsonb_build_object(
    'visits_this_week', COALESCE(_visits, 0),
    'new_shops_this_week', COALESCE(_new_shops, 0),
    'cities_explored', COALESCE(_cities, 0),
    'streak_days', COALESCE(_streak, 0),
    'week_period_key', to_char(date_trunc('week', now()), 'IYYY-"W"IW')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_explorer_challenge_stats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_explorer_challenge_stats(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_explorer_challenge(_challenge_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _stats jsonb;
  _progress int;
  _target int;
  _reward int;
  _period_key text;
  _total_points int;
  _claim_id uuid;
BEGIN
  IF _user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  _stats := public.get_explorer_challenge_stats(_user);

  CASE _challenge_id
    WHEN 'weekly' THEN
      _progress := COALESCE((_stats->>'visits_this_week')::int, 0);
      _target := 5;
      _reward := 50;
      _period_key := to_char(date_trunc('week', now()), 'IYYY-"W"IW');
    WHEN 'new3' THEN
      _progress := COALESCE((_stats->>'new_shops_this_week')::int, 0);
      _target := 3;
      _reward := 75;
      _period_key := to_char(date_trunc('week', now()), 'IYYY-"W"IW');
    WHEN 'streak' THEN
      _progress := COALESCE((_stats->>'streak_days')::int, 0);
      _target := 5;
      _reward := 100;
      _period_key := 'lifetime';
    WHEN 'cities' THEN
      _progress := COALESCE((_stats->>'cities_explored')::int, 0);
      _target := 3;
      _reward := 150;
      _period_key := 'lifetime';
    ELSE
      RAISE EXCEPTION 'Unknown challenge';
  END CASE;

  IF _progress < _target THEN
    RAISE EXCEPTION 'Challenge not complete (% / %)', _progress, _target;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_challenge_claims
    WHERE user_id = _user AND challenge_id = _challenge_id AND period_key = _period_key
  ) THEN
    RAISE EXCEPTION 'Already claimed';
  END IF;

  _total_points := public.award_points(
    _user,
    _reward,
    'challenge_reward',
    NULL,
    'user_challenge_claims',
    jsonb_build_object('challenge_id', _challenge_id, 'period_key', _period_key)
  );

  INSERT INTO public.user_challenge_claims (user_id, challenge_id, period_key, points_awarded)
  VALUES (_user, _challenge_id, _period_key, _reward)
  RETURNING id INTO _claim_id;

  RETURN jsonb_build_object(
    'claim_id', _claim_id,
    'challenge_id', _challenge_id,
    'period_key', _period_key,
    'points_awarded', _reward,
    'total_points', _total_points
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_explorer_challenge(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_explorer_challenge(text) TO authenticated;

-- Friendly notification label for challenge rewards
CREATE OR REPLACE FUNCTION public.award_points(
  _user uuid,
  _delta integer,
  _source text,
  _ref_id uuid DEFAULT NULL::uuid,
  _ref_table text DEFAULT NULL::text,
  _metadata jsonb DEFAULT '{}'::jsonb
)
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
      WHEN 'challenge_reward' THEN 'explorer challenge'
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

-- Week period key for client claim state (matches claim_explorer_challenge)
CREATE OR REPLACE FUNCTION public.get_challenge_week_period_key()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT to_char(date_trunc('week', now()), 'IYYY-"W"IW');
$$;

REVOKE ALL ON FUNCTION public.get_challenge_week_period_key() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_challenge_week_period_key() TO authenticated;
