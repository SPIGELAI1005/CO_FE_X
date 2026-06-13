-- Epic 1: City collections · Epic 3: Seasonal challenges · Epic 4: Explorer events · Epic 5: City leaderboard

-- ============ City collection milestones ============
CREATE TABLE IF NOT EXISTS public.city_collection_milestones (
  city_slug text PRIMARY KEY,
  city_name text NOT NULL,
  country text,
  shops_target int NOT NULL DEFAULT 5,
  badge_slug text,
  sort_order int NOT NULL DEFAULT 0
);

INSERT INTO public.city_collection_milestones (city_slug, city_name, country, shops_target, badge_slug, sort_order)
VALUES
  ('lisbon', 'Lisbon', 'Portugal', 5, NULL, 1),
  ('munich', 'Munich', 'Germany', 5, 'munich-explorer', 2),
  ('berlin', 'Berlin', 'Germany', 5, 'berlin-explorer', 3)
ON CONFLICT (city_slug) DO UPDATE SET
  city_name = EXCLUDED.city_name,
  country = EXCLUDED.country,
  shops_target = EXCLUDED.shops_target,
  badge_slug = EXCLUDED.badge_slug,
  sort_order = EXCLUDED.sort_order;

ALTER TABLE public.city_collection_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "city milestones public read" ON public.city_collection_milestones FOR SELECT USING (true);
GRANT SELECT ON public.city_collection_milestones TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.get_city_collection_progress(_city_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _m record;
  _visited int;
  _next_shop jsonb;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _m FROM public.city_collection_milestones WHERE city_slug = _city_slug;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT COUNT(DISTINCT ci.coffee_shop_id) INTO _visited
  FROM public.check_ins ci
  JOIN public.coffee_shops s ON s.id = ci.coffee_shop_id
  WHERE ci.user_id = _user
    AND (
      lower(replace(trim(s.city), ' ', '-')) = _city_slug
      OR lower(trim(s.city)) = lower(_m.city_name)
    );

  SELECT jsonb_build_object(
    'id', s.id,
    'slug', s.slug,
    'name', s.name
  ) INTO _next_shop
  FROM public.coffee_shops s
  WHERE s.status = 'approved'
    AND (lower(replace(trim(s.city), ' ', '-')) = _city_slug OR lower(trim(s.city)) = lower(_m.city_name))
    AND NOT EXISTS (
      SELECT 1 FROM public.check_ins ci
      WHERE ci.user_id = _user AND ci.coffee_shop_id = s.id
    )
  ORDER BY s.rating DESC NULLS LAST
  LIMIT 1;

  RETURN jsonb_build_object(
    'found', true,
    'city_slug', _m.city_slug,
    'city_name', _m.city_name,
    'country', _m.country,
    'shops_target', _m.shops_target,
    'badge_slug', _m.badge_slug,
    'visited', COALESCE(_visited, 0),
    'pct', LEAST(100, ROUND((COALESCE(_visited, 0)::numeric / NULLIF(_m.shops_target, 0)) * 100)),
    'complete', COALESCE(_visited, 0) >= _m.shops_target,
    'next_shop', COALESCE(_next_shop, 'null'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_city_collection_progress(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_city_collection_progress(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_user_city_collections()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _result jsonb := '[]'::jsonb;
  _m record;
  _visited int;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  FOR _m IN SELECT * FROM public.city_collection_milestones ORDER BY sort_order LOOP
    SELECT COUNT(DISTINCT ci.coffee_shop_id) INTO _visited
    FROM public.check_ins ci
    JOIN public.coffee_shops s ON s.id = ci.coffee_shop_id
    WHERE ci.user_id = _user
      AND (
        lower(replace(trim(s.city), ' ', '-')) = _m.city_slug
        OR lower(trim(s.city)) = lower(_m.city_name)
      );

    _result := _result || jsonb_build_array(jsonb_build_object(
      'city_slug', _m.city_slug,
      'city_name', _m.city_name,
      'country', _m.country,
      'shops_target', _m.shops_target,
      'badge_slug', _m.badge_slug,
      'visited', COALESCE(_visited, 0),
      'pct', LEAST(100, ROUND((COALESCE(_visited, 0)::numeric / NULLIF(_m.shops_target, 0)) * 100)),
      'complete', COALESCE(_visited, 0) >= _m.shops_target
    ));
  END LOOP;

  RETURN _result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_city_collections() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_city_collections() TO authenticated;

-- ============ Seasonal / limited challenges ============
ALTER TABLE public.explorer_challenge_defs
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS campaign_tag text;

ALTER TABLE public.explorer_challenge_defs DROP CONSTRAINT IF EXISTS explorer_challenge_defs_period_type_check;
ALTER TABLE public.explorer_challenge_defs
  ADD CONSTRAINT explorer_challenge_defs_period_type_check
  CHECK (period_type IN ('weekly', 'lifetime', 'limited'));

INSERT INTO public.explorer_challenge_defs (
  id, title, subtitle, stat_key, target, reward, period_type, sort_order, starts_at, ends_at, campaign_tag
)
VALUES (
  'matcha-week',
  'Matcha Week',
  'Check in at 3 matcha cafés this week',
  'visits_this_week',
  3,
  80,
  'limited',
  0,
  date_trunc('week', now()),
  date_trunc('week', now()) + interval '7 days',
  'matcha-week-' || to_char(now(), 'IYYY-"W"IW')
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  starts_at = EXCLUDED.starts_at,
  ends_at = EXCLUDED.ends_at,
  campaign_tag = EXCLUDED.campaign_tag,
  period_type = EXCLUDED.period_type,
  sort_order = EXCLUDED.sort_order;

CREATE OR REPLACE FUNCTION public.claim_explorer_challenge(_challenge_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _stats jsonb;
  _def record;
  _progress int;
  _period_key text;
  _total_points int;
  _claim_id uuid;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _def FROM public.explorer_challenge_defs WHERE id = _challenge_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown challenge'; END IF;

  IF _def.period_type = 'limited' THEN
    IF _def.starts_at IS NOT NULL AND now() < _def.starts_at THEN
      RAISE EXCEPTION 'Challenge not started yet';
    END IF;
    IF _def.ends_at IS NOT NULL AND now() > _def.ends_at THEN
      RAISE EXCEPTION 'Challenge has ended';
    END IF;
  END IF;

  _stats := public.get_explorer_challenge_stats(_user);
  _progress := COALESCE((_stats->>_def.stat_key)::int, 0);

  IF _progress < _def.target THEN
    RAISE EXCEPTION 'Challenge not complete (% / %)', _progress, _def.target;
  END IF;

  _period_key := CASE
    WHEN _def.period_type = 'lifetime' THEN 'lifetime'
    WHEN _def.period_type = 'limited' THEN COALESCE(_def.campaign_tag, 'limited:' || _challenge_id)
    ELSE to_char(date_trunc('week', now()), 'IYYY-"W"IW')
  END;

  IF EXISTS (
    SELECT 1 FROM public.user_challenge_claims
    WHERE user_id = _user AND challenge_id = _challenge_id AND period_key = _period_key
  ) THEN
    RAISE EXCEPTION 'Already claimed';
  END IF;

  _total_points := public.award_points(
    _user,
    _def.reward,
    'challenge_reward',
    NULL,
    'user_challenge_claims',
    jsonb_build_object('challenge_id', _challenge_id, 'period_key', _period_key)
  );

  INSERT INTO public.user_challenge_claims (user_id, challenge_id, period_key, points_awarded)
  VALUES (_user, _challenge_id, _period_key, _def.reward)
  RETURNING id INTO _claim_id;

  RETURN jsonb_build_object(
    'claim_id', _claim_id,
    'challenge_id', _challenge_id,
    'period_key', _period_key,
    'points_awarded', _def.reward,
    'total_points', _total_points
  );
END;
$$;

-- ============ Explorer events (analytics) ============
CREATE TABLE IF NOT EXISTS public.explorer_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name text NOT NULL,
  props jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS explorer_events_name_created_idx
  ON public.explorer_events (event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS explorer_events_user_created_idx
  ON public.explorer_events (user_id, created_at DESC);

ALTER TABLE public.explorer_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users insert own explorer events" ON public.explorer_events
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "admins read explorer events" ON public.explorer_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

GRANT INSERT ON public.explorer_events TO authenticated;
GRANT SELECT ON public.explorer_events TO authenticated;

CREATE OR REPLACE FUNCTION public.log_explorer_event(_event_name text, _props jsonb DEFAULT '{}')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  INSERT INTO public.explorer_events (user_id, event_name, props)
  VALUES (auth.uid(), _event_name, COALESCE(_props, '{}'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public.log_explorer_event(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_explorer_event(text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_explorer_funnel_kpis(_days int DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _since timestamptz := now() - (_days || ' days')::interval;
  _sheets bigint;
  _actions bigint;
  _leaderboard bigint;
  _claims bigint;
  _dau bigint;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT COUNT(*) INTO _sheets FROM public.explorer_events
    WHERE event_name = 'post_checkin_sheet_opened' AND created_at >= _since;
  SELECT COUNT(*) INTO _actions FROM public.explorer_events
    WHERE event_name = 'post_checkin_action' AND created_at >= _since;
  SELECT COUNT(*) INTO _leaderboard FROM public.explorer_events
    WHERE event_name = 'leaderboard_opened' AND created_at >= _since;
  SELECT COUNT(*) INTO _claims FROM public.user_challenge_claims
    WHERE claimed_at >= _since;
  SELECT COUNT(DISTINCT user_id) INTO _dau FROM public.check_ins
    WHERE created_at >= _since;

  RETURN jsonb_build_object(
    'days', _days,
    'daily_active_explorers', _dau,
    'leaderboard_opens', _leaderboard,
    'post_checkin_sheets', _sheets,
    'post_checkin_actions', _actions,
    'post_checkin_action_rate', CASE WHEN _sheets > 0 THEN ROUND((_actions::numeric / _sheets) * 100, 1) ELSE 0 END,
    'challenge_claims', _claims
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_explorer_funnel_kpis(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_explorer_funnel_kpis(int) TO authenticated;

-- ============ City-scoped leaderboard ============
DROP FUNCTION IF EXISTS public.get_leaderboard(text, int);

CREATE OR REPLACE FUNCTION public.get_leaderboard(
  _metric text DEFAULT 'points',
  _limit int DEFAULT 50,
  _city_slug text DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  city text,
  total_points int,
  cafes_visited bigint,
  reviews_written bigint,
  campaigns_completed bigint,
  social_posts bigint,
  rank bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH base AS (
    SELECT
      p.id AS user_id,
      p.display_name,
      p.avatar_url,
      p.city,
      COALESCE(p.total_points, 0) AS total_points,
      COALESCE((SELECT COUNT(DISTINCT ci.coffee_shop_id) FROM public.check_ins ci WHERE ci.user_id = p.id), 0) AS cafes_visited,
      COALESCE((SELECT COUNT(*) FROM public.reviews r WHERE r.user_id = p.id), 0) AS reviews_written,
      COALESCE((SELECT COUNT(*) FROM public.campaign_redemptions cr WHERE cr.user_id = p.id), 0) AS campaigns_completed,
      COALESCE((SELECT COUNT(*) FROM public.social_submissions ss WHERE ss.user_id = p.id AND ss.status = 'approved'), 0) AS social_posts
    FROM public.profiles p
    WHERE _city_slug IS NULL OR EXISTS (
      SELECT 1 FROM public.check_ins ci
      JOIN public.coffee_shops s ON s.id = ci.coffee_shop_id
      WHERE ci.user_id = p.id
        AND (lower(replace(trim(s.city), ' ', '-')) = lower(_city_slug)
             OR lower(trim(s.city)) = lower(replace(_city_slug, '-', ' ')))
    )
  )
  SELECT
    b.user_id, b.display_name, b.avatar_url, b.city,
    b.total_points::int, b.cafes_visited, b.reviews_written, b.campaigns_completed, b.social_posts,
    ROW_NUMBER() OVER (ORDER BY
      CASE _metric
        WHEN 'cafes' THEN b.cafes_visited
        WHEN 'reviews' THEN b.reviews_written
        WHEN 'campaigns' THEN b.campaigns_completed
        WHEN 'social' THEN b.social_posts
        ELSE b.total_points::bigint
      END DESC,
      b.total_points DESC
    ) AS rank
  FROM base b
  ORDER BY rank ASC
  LIMIT _limit;
END;
$$;

REVOKE ALL ON FUNCTION public.get_leaderboard(text, int, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, int, text) TO authenticated;

DROP FUNCTION IF EXISTS public.get_my_leaderboard_rank(text);

CREATE OR REPLACE FUNCTION public.get_my_leaderboard_rank(
  _metric text DEFAULT 'points',
  _city_slug text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _row record;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  WITH base AS (
    SELECT
      p.id AS user_id,
      p.display_name,
      p.avatar_url,
      p.city,
      COALESCE(p.total_points, 0) AS total_points,
      COALESCE((SELECT COUNT(DISTINCT ci.coffee_shop_id) FROM public.check_ins ci WHERE ci.user_id = p.id), 0) AS cafes_visited,
      COALESCE((SELECT COUNT(*) FROM public.reviews r WHERE r.user_id = p.id), 0) AS reviews_written,
      COALESCE((SELECT COUNT(*) FROM public.campaign_redemptions cr WHERE cr.user_id = p.id), 0) AS campaigns_completed,
      COALESCE((SELECT COUNT(*) FROM public.social_submissions ss WHERE ss.user_id = p.id AND ss.status = 'approved'), 0) AS social_posts
    FROM public.profiles p
    WHERE _city_slug IS NULL OR EXISTS (
      SELECT 1 FROM public.check_ins ci
      JOIN public.coffee_shops s ON s.id = ci.coffee_shop_id
      WHERE ci.user_id = p.id
        AND (lower(replace(trim(s.city), ' ', '-')) = lower(_city_slug)
             OR lower(trim(s.city)) = lower(replace(_city_slug, '-', ' ')))
    )
  ),
  ranked AS (
    SELECT b.*, ROW_NUMBER() OVER (
      ORDER BY
        CASE _metric
          WHEN 'cafes' THEN b.cafes_visited
          WHEN 'reviews' THEN b.reviews_written
          WHEN 'campaigns' THEN b.campaigns_completed
          WHEN 'social' THEN b.social_posts
          ELSE b.total_points::bigint
        END DESC,
        b.total_points DESC
    ) AS rank
    FROM base b
  )
  SELECT r.*, (SELECT COUNT(*) FROM ranked) AS total_explorers
  INTO _row
  FROM ranked r
  WHERE r.user_id = _user;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('rank', null, 'total_explorers', 0);
  END IF;

  RETURN jsonb_build_object(
    'user_id', _row.user_id,
    'display_name', _row.display_name,
    'avatar_url', _row.avatar_url,
    'city', _row.city,
    'total_points', _row.total_points,
    'cafes_visited', _row.cafes_visited,
    'reviews_written', _row.reviews_written,
    'campaigns_completed', _row.campaigns_completed,
    'social_posts', _row.social_posts,
    'rank', _row.rank,
    'total_explorers', _row.total_explorers
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_leaderboard_rank(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_leaderboard_rank(text, text) TO authenticated;
