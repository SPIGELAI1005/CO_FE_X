-- Vision Wave 1: crawls, beverage passport, time bonuses, origin, photo reviews, rotating verify

-- ── Schema extensions ──
ALTER TABLE public.check_ins ADD COLUMN IF NOT EXISTS beverage_tag text;

ALTER TABLE public.coffee_shops ADD COLUMN IF NOT EXISTS origin_region text;
ALTER TABLE public.coffee_shops ADD COLUMN IF NOT EXISTS roaster_name text;
ALTER TABLE public.coffee_shops ADD COLUMN IF NOT EXISTS fair_trade boolean NOT NULL DEFAULT false;
ALTER TABLE public.coffee_shops ADD COLUMN IF NOT EXISTS co2_note text;

ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS media_urls text[] NOT NULL DEFAULT '{}';

-- Coffee crawls
CREATE TABLE IF NOT EXISTS public.coffee_crawls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  city_slug text NOT NULL,
  description text,
  reward_points int NOT NULL DEFAULT 150,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crawl_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crawl_id uuid NOT NULL REFERENCES public.coffee_crawls(id) ON DELETE CASCADE,
  coffee_shop_id uuid NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  stop_order int NOT NULL,
  hint text,
  UNIQUE (crawl_id, stop_order),
  UNIQUE (crawl_id, coffee_shop_id)
);

CREATE TABLE IF NOT EXISTS public.user_crawl_completions (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  crawl_id uuid NOT NULL REFERENCES public.coffee_crawls(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, crawl_id)
);

CREATE TABLE IF NOT EXISTS public.user_crawl_stops (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  crawl_id uuid NOT NULL REFERENCES public.coffee_crawls(id) ON DELETE CASCADE,
  coffee_shop_id uuid NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, crawl_id, coffee_shop_id)
);

GRANT SELECT ON public.coffee_crawls, public.crawl_stops TO authenticated, anon;
GRANT SELECT, INSERT ON public.user_crawl_stops, public.user_crawl_completions TO authenticated;
ALTER TABLE public.coffee_crawls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crawl_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_crawl_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_crawl_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read crawls" ON public.coffee_crawls FOR SELECT USING (active = true);
CREATE POLICY "Public read crawl stops" ON public.crawl_stops FOR SELECT USING (true);
CREATE POLICY "User read own crawl stops" ON public.user_crawl_stops FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "User insert own crawl stops" ON public.user_crawl_stops FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "User read own crawl completions" ON public.user_crawl_completions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "User insert own crawl completions" ON public.user_crawl_completions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Photo review challenges
CREATE TABLE IF NOT EXISTS public.photo_challenge_defs (
  id text PRIMARY KEY,
  theme text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  reward_points int NOT NULL DEFAULT 50,
  active boolean NOT NULL DEFAULT true
);

GRANT SELECT ON public.photo_challenge_defs TO authenticated, anon;
ALTER TABLE public.photo_challenge_defs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read photo challenges" ON public.photo_challenge_defs FOR SELECT USING (active = true AND now() BETWEEN starts_at AND ends_at);

INSERT INTO public.photo_challenge_defs (id, theme, starts_at, ends_at, reward_points)
VALUES (
  'latte-art-week',
  'Best latte art this week',
  date_trunc('week', now()),
  date_trunc('week', now()) + interval '7 days',
  75
)
ON CONFLICT (id) DO NOTHING;

-- Seed crawls (Lisbon + Munich)
INSERT INTO public.coffee_crawls (slug, title, city_slug, description, reward_points)
VALUES
  ('lisbon-alfama-crawl', 'Alfama Coffee Crawl', 'lisbon', 'Five gems in Alfama — complete in one day.', 200),
  ('munich-centre-crawl', 'Munich Centre Crawl', 'munich', 'Discover the old town coffee trail.', 200)
ON CONFLICT (slug) DO NOTHING;

-- Time-of-day multiplier helper (shop local time approximated via server UTC + offset not stored — use UTC hour buckets)
CREATE OR REPLACE FUNCTION public.check_in_time_multiplier(_at timestamptz DEFAULT now())
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN EXTRACT(HOUR FROM _at AT TIME ZONE 'UTC') < 8 THEN 2.0
    WHEN EXTRACT(HOUR FROM _at AT TIME ZONE 'UTC') BETWEEN 14 AND 16 THEN 1.5
    WHEN EXTRACT(HOUR FROM _at AT TIME ZONE 'UTC') >= 22 THEN 1.25
    ELSE 1.0
  END;
$$;

-- Crawl progress after check-in
CREATE OR REPLACE FUNCTION public.record_crawl_stop(_user uuid, _shop_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _crawl record;
  _total int;
  _done int;
BEGIN
  IF _user IS NULL THEN RETURN; END IF;

  FOR _crawl IN
    SELECT c.id, c.reward_points, c.title
    FROM public.coffee_crawls c
    JOIN public.crawl_stops s ON s.crawl_id = c.id
    WHERE s.coffee_shop_id = _shop_id AND c.active = true
  LOOP
    INSERT INTO public.user_crawl_stops (user_id, crawl_id, coffee_shop_id)
    VALUES (_user, _crawl.id, _shop_id)
    ON CONFLICT DO NOTHING;

    SELECT COUNT(*) INTO _total FROM public.crawl_stops WHERE crawl_id = _crawl.id;
    SELECT COUNT(*) INTO _done FROM public.user_crawl_stops WHERE user_id = _user AND crawl_id = _crawl.id;

    IF _done >= _total AND _total > 0 AND NOT EXISTS (
      SELECT 1 FROM public.user_crawl_completions WHERE user_id = _user AND crawl_id = _crawl.id
    ) THEN
      INSERT INTO public.user_crawl_completions (user_id, crawl_id) VALUES (_user, _crawl.id);
      PERFORM public.award_points(_user, _crawl.reward_points, 'challenge_reward', NULL, NULL, jsonb_build_object('crawl_id', _crawl.id));
      INSERT INTO public.notifications(user_id, type, title, body, link, payload) VALUES (
        _user, 'crawl_complete',
        'Coffee crawl complete!',
        'You finished "' || _crawl.title || '" and earned ' || _crawl.reward_points || ' points.',
        '/crawls',
        jsonb_build_object('crawl_id', _crawl.id)
      );
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_crawl_stop(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_coffee_crawls(_city_slug text DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(row ORDER BY row->>'title'), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
      'id', c.id,
      'slug', c.slug,
      'title', c.title,
      'city_slug', c.city_slug,
      'description', c.description,
      'reward_points', c.reward_points,
      'stop_count', (SELECT COUNT(*) FROM public.crawl_stops s WHERE s.crawl_id = c.id),
      'stops', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'order', s.stop_order,
          'shop_id', s.coffee_shop_id,
          'shop_name', sh.name,
          'shop_slug', sh.slug,
          'hint', s.hint
        ) ORDER BY s.stop_order)
        FROM public.crawl_stops s
        JOIN public.coffee_shops sh ON sh.id = s.coffee_shop_id
        WHERE s.crawl_id = c.id
      ), '[]'::jsonb)
    ) AS row
    FROM public.coffee_crawls c
    WHERE c.active = true
      AND (_city_slug IS NULL OR c.city_slug = _city_slug)
  ) t;
$$;

GRANT EXECUTE ON FUNCTION public.get_coffee_crawls(text) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.get_user_crawl_progress(_user uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'crawl_id', c.id,
    'slug', c.slug,
    'title', c.title,
    'completed', EXISTS (SELECT 1 FROM public.user_crawl_completions cc WHERE cc.user_id = _user AND cc.crawl_id = c.id),
    'stops_done', (SELECT COUNT(*) FROM public.user_crawl_stops ucs WHERE ucs.user_id = _user AND ucs.crawl_id = c.id),
    'stop_count', (SELECT COUNT(*) FROM public.crawl_stops s WHERE s.crawl_id = c.id)
  )), '[]'::jsonb)
  FROM public.coffee_crawls c
  WHERE c.active = true;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_crawl_progress(uuid) TO authenticated;

-- Beverage passport stats
CREATE OR REPLACE FUNCTION public.get_beverage_passport(_user uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_object_agg(beverage_tag, cnt), '{}'::jsonb)
  FROM (
    SELECT COALESCE(beverage_tag, 'coffee') AS beverage_tag, COUNT(*) AS cnt
    FROM public.check_ins
    WHERE user_id = _user
    GROUP BY COALESCE(beverage_tag, 'coffee')
  ) t;
$$;

GRANT EXECUTE ON FUNCTION public.get_beverage_passport(uuid) TO authenticated;

-- Rotating verify token (6-digit, 30s windows) for display alongside static code
CREATE OR REPLACE FUNCTION public.get_rotating_verify_token(_code text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lpad(
    ((hashtext(_code || '|' || (extract(epoch FROM now())::bigint / 30)::text) % 1000000)::text),
    6, '0'
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_rotating_verify_token(text) TO authenticated, anon;

-- Updated perform_check_in with beverage + time multiplier
CREATE OR REPLACE FUNCTION public.perform_check_in(
  _shop_id uuid,
  _campaign_id uuid DEFAULT NULL,
  _latitude double precision DEFAULT NULL,
  _longitude double precision DEFAULT NULL,
  _beverage_tag text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user uuid := auth.uid();
  _base_points int := 10;
  _multiplier numeric;
  _points int;
  _bonus_label text := NULL;
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
  _shop_lat double precision;
  _shop_lon double precision;
  _distance_m double precision;
  _recent_attempts int;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT COUNT(*) INTO _recent_attempts
  FROM public.check_ins
  WHERE user_id = _user AND created_at > now() - interval '1 hour';

  IF _recent_attempts >= 20 THEN
    RAISE EXCEPTION 'Too many check-in attempts. Try again in an hour.';
  END IF;

  IF _latitude IS NULL OR _longitude IS NULL THEN
    RAISE EXCEPTION 'Location required — enable GPS to check in at the café';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.coffee_shops WHERE id = _shop_id AND status = 'approved') THEN
    RAISE EXCEPTION 'Coffee shop not available';
  END IF;

  SELECT latitude, longitude INTO _shop_lat, _shop_lon
  FROM public.coffee_shops WHERE id = _shop_id;

  IF _shop_lat IS NULL OR _shop_lon IS NULL THEN
    RAISE EXCEPTION 'This café has no location on file yet';
  END IF;

  _distance_m := public.haversine_metres(_latitude, _longitude, _shop_lat, _shop_lon);
  IF _distance_m > 200 THEN
    RAISE EXCEPTION 'You must be within 200 m of the café to check in (currently ~%s m away)', round(_distance_m)::text;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.check_ins
    WHERE user_id = _user AND coffee_shop_id = _shop_id
      AND created_at > now() - interval '24 hours'
  ) THEN
    RAISE EXCEPTION 'You already checked in here in the last 24h';
  END IF;

  IF _campaign_id IS NOT NULL THEN
    SELECT * INTO _c FROM public.campaigns WHERE id = _campaign_id AND coffee_shop_id = _shop_id AND status = 'active';
    IF NOT FOUND THEN _campaign_id := NULL; END IF;
  END IF;

  _multiplier := public.check_in_time_multiplier(now());
  _points := GREATEST(1, round(_base_points * _multiplier)::int);
  IF _multiplier > 1.0 THEN
    _bonus_label := CASE
      WHEN _multiplier >= 2.0 THEN 'early_bird'
      WHEN _multiplier >= 1.5 THEN 'happy_hour'
      ELSE 'night_owl'
    END;
  END IF;

  INSERT INTO public.check_ins (user_id, coffee_shop_id, points_awarded, verified, campaign_id, beverage_tag)
  VALUES (_user, _shop_id, _points, true, _campaign_id, NULLIF(trim(_beverage_tag), ''))
  RETURNING id INTO _check_in_id;

  PERFORM public.award_points(_user, _points, 'check_in', NULL, NULL, jsonb_build_object(
    'shop_id', _shop_id,
    'multiplier', _multiplier,
    'bonus', _bonus_label,
    'beverage_tag', _beverage_tag
  ));

  UPDATE public.profiles
     SET total_check_ins = COALESCE(total_check_ins, 0) + 1
   WHERE id = _user;

  PERFORM public.record_crawl_stop(_user, _shop_id);

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
    ELSIF _ctype = 'beverage' THEN
      SELECT COUNT(*) INTO _count FROM public.check_ins ci
       WHERE ci.user_id = _user AND COALESCE(ci.beverage_tag, 'coffee') = _value;
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
      'qualifying_check_ins', (SELECT COUNT(*) FROM public.check_ins WHERE user_id = _user AND campaign_id = _campaign_id),
      'required', GREATEST(COALESCE(_c.required_check_ins, 1), 1)
    ) INTO _campaign_progress;
  END IF;

  RETURN jsonb_build_object(
    'check_in_id', _check_in_id,
    'points_awarded', _points,
    'time_bonus', _bonus_label,
    'multiplier', _multiplier,
    'total_points', (SELECT total_points FROM public.profiles WHERE id = _user),
    'total_check_ins', _total_check_ins,
    'unique_shops', _unique_shops,
    'new_badges', _new_badges,
    'campaign_progress', _campaign_progress,
    'distance_metres', round(_distance_m),
    'beverage_tag', _beverage_tag
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.perform_check_in(uuid, uuid, double precision, double precision, text) TO authenticated;
