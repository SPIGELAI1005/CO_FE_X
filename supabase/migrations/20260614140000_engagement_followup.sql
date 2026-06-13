-- Leaderboard self-rank + challenge defs as single source of truth for RPC

CREATE TABLE IF NOT EXISTS public.explorer_challenge_defs (
  id text PRIMARY KEY,
  title text NOT NULL,
  subtitle text NOT NULL,
  stat_key text NOT NULL,
  target int NOT NULL,
  reward int NOT NULL,
  period_type text NOT NULL CHECK (period_type IN ('weekly', 'lifetime')),
  sort_order int NOT NULL DEFAULT 0
);

INSERT INTO public.explorer_challenge_defs (id, title, subtitle, stat_key, target, reward, period_type, sort_order)
VALUES
  ('weekly', 'Weekly Wanderer', 'Check in 5 times this week', 'visits_this_week', 5, 50, 'weekly', 1),
  ('new3', 'Three New Doors', 'Visit 3 cafés you''ve never been to this week', 'new_shops_this_week', 3, 75, 'weekly', 2),
  ('streak', 'On Fire', 'Hit a 5-day check-in streak', 'streak_days', 5, 100, 'lifetime', 3),
  ('cities', 'City Hopper', 'Explore 3 different cities', 'cities_explored', 3, 150, 'lifetime', 4)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  stat_key = EXCLUDED.stat_key,
  target = EXCLUDED.target,
  reward = EXCLUDED.reward,
  period_type = EXCLUDED.period_type,
  sort_order = EXCLUDED.sort_order;

ALTER TABLE public.explorer_challenge_defs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "challenge defs public read" ON public.explorer_challenge_defs FOR SELECT USING (true);
GRANT SELECT ON public.explorer_challenge_defs TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.get_my_leaderboard_rank(_metric text DEFAULT 'points')
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _row record;
  _total bigint;
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
  ),
  ranked AS (
    SELECT
      b.*,
      ROW_NUMBER() OVER (
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

REVOKE ALL ON FUNCTION public.get_my_leaderboard_rank(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_leaderboard_rank(text) TO authenticated;

-- Read challenge rules from explorer_challenge_defs
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

  _stats := public.get_explorer_challenge_stats(_user);
  _progress := COALESCE((_stats->>_def.stat_key)::int, 0);

  IF _progress < _def.target THEN
    RAISE EXCEPTION 'Challenge not complete (% / %)', _progress, _def.target;
  END IF;

  _period_key := CASE
    WHEN _def.period_type = 'lifetime' THEN 'lifetime'
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
