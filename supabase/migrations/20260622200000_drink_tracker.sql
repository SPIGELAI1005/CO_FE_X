-- Playful drink tracker: logs drinks when campaign rewards are redeemed at counter.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS daily_drink_limit smallint
    CHECK (daily_drink_limit IS NULL OR (daily_drink_limit >= 1 AND daily_drink_limit <= 20));

COMMENT ON COLUMN public.profiles.daily_drink_limit IS
  'Optional personal soft goal for the playful drink tracker — not medical advice.';

CREATE TABLE IF NOT EXISTS public.drink_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  drink_category text NOT NULL,
  redemption_id uuid NOT NULL UNIQUE REFERENCES public.campaign_redemptions(id) ON DELETE CASCADE,
  coffee_shop_id uuid REFERENCES public.coffee_shops(id) ON DELETE SET NULL,
  shop_name text,
  logged_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT drink_logs_category_check CHECK (
    drink_category IN (
      'espresso', 'cappuccino', 'latte', 'americano', 'matcha',
      'tea', 'cola', 'juice', 'ice_cream', 'other'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_drink_logs_user_logged
  ON public.drink_logs (user_id, logged_at DESC);

CREATE INDEX IF NOT EXISTS idx_drink_logs_user_category
  ON public.drink_logs (user_id, drink_category);

ALTER TABLE public.drink_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own drink logs" ON public.drink_logs;
CREATE POLICY "users read own drink logs" ON public.drink_logs
  FOR SELECT TO authenticated USING (user_id = auth.uid());

GRANT SELECT ON public.drink_logs TO authenticated;
GRANT ALL ON public.drink_logs TO service_role;

CREATE OR REPLACE FUNCTION public.resolve_drink_category(_reward_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE lower(trim(COALESCE(_reward_type, '')))
    WHEN 'espresso' THEN 'espresso'
    WHEN 'cappuccino' THEN 'cappuccino'
    WHEN 'latte' THEN 'latte'
    WHEN 'americano' THEN 'americano'
    WHEN 'matcha' THEN 'matcha'
    WHEN 'tea' THEN 'tea'
    WHEN 'cola' THEN 'cola'
    WHEN 'juice' THEN 'juice'
    WHEN 'ice_cream' THEN 'ice_cream'
    ELSE 'other'
  END;
$$;

CREATE OR REPLACE FUNCTION public.create_drink_log_from_redemption()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _c record;
  _s record;
  _category text;
BEGIN
  IF NEW.used_at IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.used_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT c.reward_type, c.coffee_shop_id INTO _c
    FROM public.campaigns c
   WHERE c.id = NEW.campaign_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  SELECT s.name INTO _s
    FROM public.coffee_shops s
   WHERE s.id = _c.coffee_shop_id;

  _category := public.resolve_drink_category(COALESCE(_c.reward_type, 'other'));

  INSERT INTO public.drink_logs (
    user_id, drink_category, redemption_id, coffee_shop_id, shop_name, logged_at
  ) VALUES (
    NEW.user_id, _category, NEW.id, _c.coffee_shop_id, _s.name, COALESCE(NEW.used_at, now())
  )
  ON CONFLICT (redemption_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_drink_log_on_campaign_redeem ON public.campaign_redemptions;
CREATE TRIGGER trg_drink_log_on_campaign_redeem
  AFTER INSERT OR UPDATE OF used_at ON public.campaign_redemptions
  FOR EACH ROW
  WHEN (NEW.used_at IS NOT NULL)
  EXECUTE FUNCTION public.create_drink_log_from_redemption();

-- Backfill from existing redemptions
INSERT INTO public.drink_logs (
  user_id, drink_category, redemption_id, coffee_shop_id, shop_name, logged_at
)
SELECT
  cr.user_id,
  public.resolve_drink_category(COALESCE(c.reward_type, 'other')),
  cr.id,
  c.coffee_shop_id,
  s.name,
  cr.used_at
FROM public.campaign_redemptions cr
JOIN public.campaigns c ON c.id = cr.campaign_id
JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
WHERE cr.used_at IS NOT NULL
ON CONFLICT (redemption_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.set_daily_drink_limit(_limit smallint DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _user uuid := auth.uid();
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _limit IS NOT NULL AND (_limit < 1 OR _limit > 20) THEN
    RAISE EXCEPTION 'Limit must be between 1 and 20, or null to clear';
  END IF;
  UPDATE public.profiles SET daily_drink_limit = _limit WHERE id = _user;
  RETURN jsonb_build_object('daily_drink_limit', _limit);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_daily_drink_limit(smallint) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_drink_tracker()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _today_start timestamptz := date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  _week_start timestamptz := date_trunc('week', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  _today_count int;
  _week_count int;
  _daily_limit smallint;
  _energy_pct int;
  _energy_vibe text;
  _favorite record;
  _top_week record;
  _today_by jsonb;
  _week_by jsonb;
  _today_drinks jsonb;
  _meter_cap int;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT daily_drink_limit INTO _daily_limit FROM public.profiles WHERE id = _user;

  SELECT COUNT(*)::int INTO _today_count
    FROM public.drink_logs
   WHERE user_id = _user AND logged_at >= _today_start;

  SELECT COUNT(*)::int INTO _week_count
    FROM public.drink_logs
   WHERE user_id = _user AND logged_at >= _week_start;

  _meter_cap := COALESCE(_daily_limit, 6);
  _energy_pct := LEAST(100, GREATEST(0, round((_today_count::numeric / GREATEST(_meter_cap, 1)) * 100)));

  _energy_vibe := CASE
    WHEN _today_count = 0 THEN 'sleepy'
    WHEN _today_count = 1 THEN 'warming_up'
    WHEN _today_count <= 3 THEN 'cozy_buzz'
    WHEN _today_count <= 5 THEN 'fully_brewed'
    ELSE 'espresso_mode'
  END;

  SELECT drink_category, COUNT(*)::int AS cnt
    INTO _favorite
    FROM public.drink_logs
   WHERE user_id = _user
   GROUP BY drink_category
   ORDER BY cnt DESC, drink_category
   LIMIT 1;

  SELECT drink_category, COUNT(*)::int AS cnt
    INTO _top_week
    FROM public.drink_logs
   WHERE user_id = _user AND logged_at >= _week_start
   GROUP BY drink_category
   ORDER BY cnt DESC, drink_category
   LIMIT 1;

  SELECT COALESCE(jsonb_object_agg(drink_category, cnt), '{}'::jsonb)
    INTO _today_by
    FROM (
      SELECT drink_category, COUNT(*)::int AS cnt
        FROM public.drink_logs
       WHERE user_id = _user AND logged_at >= _today_start
       GROUP BY drink_category
    ) t;

  SELECT COALESCE(jsonb_object_agg(drink_category, cnt), '{}'::jsonb)
    INTO _week_by
    FROM (
      SELECT drink_category, COUNT(*)::int AS cnt
        FROM public.drink_logs
       WHERE user_id = _user AND logged_at >= _week_start
       GROUP BY drink_category
    ) t;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id,
    'drink_category', drink_category,
    'shop_name', shop_name,
    'logged_at', logged_at
  ) ORDER BY logged_at DESC), '[]'::jsonb)
    INTO _today_drinks
    FROM public.drink_logs
   WHERE user_id = _user AND logged_at >= _today_start;

  RETURN jsonb_build_object(
    'today_count', _today_count,
    'week_count', _week_count,
    'daily_limit', _daily_limit,
    'energy_pct', _energy_pct,
    'energy_vibe', _energy_vibe,
    'favorite_category', _favorite.drink_category,
    'favorite_count', COALESCE(_favorite.cnt, 0),
    'top_category_week', _top_week.drink_category,
    'top_category_week_count', COALESCE(_top_week.cnt, 0),
    'today_by_category', _today_by,
    'week_by_category', _week_by,
    'today_drinks', _today_drinks
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_drink_tracker() TO authenticated;
