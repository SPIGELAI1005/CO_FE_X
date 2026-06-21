-- Vision Wave 2: spawns, mayor, beans, stories, map theme

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS beans_balance int NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS map_theme text NOT NULL DEFAULT 'default';

ALTER TABLE public.coffee_shops ADD COLUMN IF NOT EXISTS soundscape_url text;

CREATE TABLE IF NOT EXISTS public.spawn_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coffee_shop_id uuid NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  rarity text NOT NULL DEFAULT 'legendary' CHECK (rarity IN ('rare', 'legendary', 'epic')),
  bonus_points int NOT NULL DEFAULT 50,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  title text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spawn_events_active ON public.spawn_events (ends_at) WHERE active = true;

CREATE TABLE IF NOT EXISTS public.shop_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coffee_shop_id uuid NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  media_url text NOT NULL,
  caption text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_stories_active ON public.shop_stories (coffee_shop_id, expires_at);

GRANT SELECT ON public.spawn_events TO authenticated, anon;
GRANT SELECT ON public.shop_stories TO authenticated, anon;
GRANT INSERT, DELETE ON public.shop_stories TO authenticated;

ALTER TABLE public.spawn_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read spawns" ON public.spawn_events FOR SELECT USING (active = true AND now() BETWEEN starts_at AND ends_at);
CREATE POLICY "Public read stories" ON public.shop_stories FOR SELECT USING (expires_at > now());
CREATE POLICY "Partner manage own stories" ON public.shop_stories FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = coffee_shop_id AND s.partner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = coffee_shop_id AND s.partner_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.get_active_spawns(_lat double precision DEFAULT NULL, _lng double precision DEFAULT NULL, _radius_km double precision DEFAULT 5)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', e.id,
    'shop_id', e.coffee_shop_id,
    'shop_name', s.name,
    'shop_slug', s.slug,
    'rarity', e.rarity,
    'bonus_points', e.bonus_points,
    'title', COALESCE(e.title, s.name || ' spawn'),
    'ends_at', e.ends_at,
    'distance_km', CASE WHEN _lat IS NOT NULL AND s.latitude IS NOT NULL THEN
      round((public.haversine_metres(_lat, _lng, s.latitude, s.longitude) / 1000.0)::numeric, 2)
    ELSE NULL END
  ) ORDER BY e.ends_at), '[]'::jsonb)
  FROM public.spawn_events e
  JOIN public.coffee_shops s ON s.id = e.coffee_shop_id
  WHERE e.active = true AND now() BETWEEN e.starts_at AND e.ends_at
    AND s.status = 'approved'
    AND (
      _lat IS NULL OR s.latitude IS NULL
      OR public.haversine_metres(_lat, _lng, s.latitude, s.longitude) <= _radius_km * 1000
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_active_spawns(double precision, double precision, double precision) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.get_shop_mayor(_shop_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH shop AS (
    SELECT latitude, longitude FROM public.coffee_shops WHERE id = _shop_id AND latitude IS NOT NULL
  ),
  cell AS (
    SELECT round(s.latitude::numeric, 2) AS cell_lat, round(s.longitude::numeric, 2) AS cell_lng FROM shop s
  ),
  counts AS (
    SELECT ci.user_id, COUNT(*) AS cnt
    FROM public.check_ins ci
    JOIN public.coffee_shops sh ON sh.id = ci.coffee_shop_id
    CROSS JOIN cell c
    WHERE round(sh.latitude::numeric, 2) = c.cell_lat
      AND round(sh.longitude::numeric, 2) = c.cell_lng
      AND ci.created_at > date_trunc('week', now())
    GROUP BY ci.user_id
    ORDER BY cnt DESC
    LIMIT 1
  )
  SELECT CASE WHEN c.user_id IS NULL THEN NULL ELSE jsonb_build_object(
    'user_id', c.user_id,
    'display_name', p.display_name,
    'check_ins', c.cnt,
    'week_of', date_trunc('week', now())
  ) END
  FROM counts c
  LEFT JOIN public.profiles p ON p.id = c.user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_shop_mayor(uuid) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.award_beans(_user uuid, _delta int, _reason text DEFAULT 'streak')
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _new int;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'user required'; END IF;
  UPDATE public.profiles SET beans_balance = GREATEST(0, COALESCE(beans_balance, 0) + _delta)
    WHERE id = _user RETURNING beans_balance INTO _new;
  IF _delta > 0 THEN
    INSERT INTO public.notifications(user_id, type, title, body, link, payload) VALUES (
      _user, 'beans_earned',
      '+' || _delta || ' Beans',
      'You earned ' || _delta || ' Beans from ' || _reason || '.',
      '/wallet',
      jsonb_build_object('delta', _delta, 'reason', _reason)
    );
  END IF;
  RETURN _new;
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_beans(uuid, int, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_map_theme(_theme text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _user uuid := auth.uid();
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _theme NOT IN ('default', 'sunrise', 'neon', 'luxury', 'spring') THEN
    RAISE EXCEPTION 'Invalid theme';
  END IF;
  UPDATE public.profiles SET map_theme = _theme WHERE id = _user;
  RETURN jsonb_build_object('map_theme', _theme);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_map_theme(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_active_shop_stories(_shop_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id,
    'media_url', media_url,
    'caption', caption,
    'expires_at', expires_at
  ) ORDER BY created_at DESC), '[]'::jsonb)
  FROM public.shop_stories
  WHERE coffee_shop_id = _shop_id AND expires_at > now();
$$;

GRANT EXECUTE ON FUNCTION public.get_active_shop_stories(uuid) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.trg_award_beans_on_streak_claim()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.challenge_id = 'streak' THEN
    PERFORM public.award_beans(NEW.user_id, 10, 'streak challenge');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_beans_on_streak_claim ON public.user_challenge_claims;
CREATE TRIGGER trg_award_beans_on_streak_claim
  AFTER INSERT ON public.user_challenge_claims
  FOR EACH ROW EXECUTE FUNCTION public.trg_award_beans_on_streak_claim();
