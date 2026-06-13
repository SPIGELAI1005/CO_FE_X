
CREATE OR REPLACE FUNCTION public.get_coffee_radar(
  _lat double precision DEFAULT NULL,
  _lng double precision DEFAULT NULL,
  _radius_km double precision DEFAULT 5
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _free jsonb;
  _matcha jsonb;
  _campaigns jsonb;
  _stats jsonb;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Free coffee nearby (today)
  WITH nearby AS (
    SELECT s.id, s.slug, s.name, s.city, s.cover_image_url, s.tags, s.rating, s.latitude, s.longitude,
      CASE WHEN _lat IS NULL OR _lng IS NULL THEN NULL ELSE
        6371 * acos(GREATEST(-1, LEAST(1,
          cos(radians(_lat))*cos(radians(s.latitude))*cos(radians(s.longitude)-radians(_lng))
          + sin(radians(_lat))*sin(radians(s.latitude))
        ))) END AS distance_km
    FROM public.coffee_shops s
    WHERE s.status = 'approved'
      AND s.free_coffee_available = true
      AND s.latitude IS NOT NULL AND s.longitude IS NOT NULL
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY COALESCE(x.distance_km, 9999) ASC), '[]'::jsonb) INTO _free
  FROM (
    SELECT id, slug, name, city, cover_image_url, tags, rating, latitude, longitude,
           ROUND(distance_km::numeric, 2) AS distance_km
    FROM nearby
    WHERE _lat IS NULL OR distance_km <= _radius_km
    ORDER BY COALESCE(distance_km, 9999) ASC
    LIMIT 8
  ) x;

  -- Trending Matcha (last 14 days check-in velocity)
  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.recent_visits DESC NULLS LAST), '[]'::jsonb) INTO _matcha
  FROM (
    SELECT s.id, s.slug, s.name, s.city, s.cover_image_url, s.tags, s.rating,
      (SELECT COUNT(*) FROM public.check_ins ci
        WHERE ci.coffee_shop_id = s.id AND ci.created_at > now() - interval '14 days') AS recent_visits
    FROM public.coffee_shops s
    WHERE s.status = 'approved' AND 'Matcha' = ANY(s.tags)
    ORDER BY recent_visits DESC NULLS LAST, s.rating DESC
    LIMIT 6
  ) t;

  -- New EEFFOC campaigns (active, created in last 21 days)
  SELECT COALESCE(jsonb_agg(to_jsonb(c) ORDER BY c.created_at DESC), '[]'::jsonb) INTO _campaigns
  FROM (
    SELECT c.id, c.title, c.reward_description, c.points_reward, c.cover_image_url,
           c.hashtag, c.campaign_type, c.ends_at, c.created_at,
           s.id AS shop_id, s.slug AS shop_slug, s.name AS shop_name, s.city AS shop_city,
           (SELECT COUNT(*) FROM public.campaign_participants p WHERE p.campaign_id = c.id) AS participants
    FROM public.campaigns c
    JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
    WHERE c.status = 'active'
      AND (c.ends_at IS NULL OR c.ends_at > now())
      AND c.created_at > now() - interval '21 days'
    ORDER BY c.created_at DESC
    LIMIT 8
  ) c;

  -- Personal stats (feed challenges client-side)
  SELECT jsonb_build_object(
    'total_check_ins', COALESCE(p.total_check_ins,0),
    'total_points', COALESCE(p.total_points,0),
    'visits_this_week', (SELECT COUNT(*) FROM public.check_ins ci
      WHERE ci.user_id = _user AND ci.created_at > date_trunc('week', now())),
    'new_shops_this_week', (SELECT COUNT(DISTINCT ci.coffee_shop_id) FROM public.check_ins ci
      WHERE ci.user_id = _user AND ci.created_at > date_trunc('week', now())),
    'unique_shops', (SELECT COUNT(DISTINCT ci.coffee_shop_id) FROM public.check_ins ci WHERE ci.user_id = _user),
    'cities_explored', (SELECT COUNT(DISTINCT s.city) FROM public.check_ins ci
      JOIN public.coffee_shops s ON s.id = ci.coffee_shop_id WHERE ci.user_id = _user AND s.city IS NOT NULL),
    'active_campaigns', (SELECT COUNT(*) FROM public.campaign_participants cp
      JOIN public.campaigns ca ON ca.id = cp.campaign_id
      WHERE cp.user_id = _user AND ca.status = 'active' AND (ca.ends_at IS NULL OR ca.ends_at > now())),
    'streak_days', (
      WITH days AS (
        SELECT DISTINCT date_trunc('day', created_at)::date AS d
        FROM public.check_ins WHERE user_id = _user AND created_at > now() - interval '30 days'
      ), ranked AS (
        SELECT d, ROW_NUMBER() OVER (ORDER BY d DESC) AS rn FROM days
      )
      SELECT COUNT(*) FROM ranked WHERE d = (CURRENT_DATE - (rn - 1))
    )
  ) INTO _stats
  FROM public.profiles p WHERE p.id = _user;

  RETURN jsonb_build_object(
    'free_today', _free,
    'trending_matcha', _matcha,
    'new_campaigns', _campaigns,
    'stats', COALESCE(_stats, '{}'::jsonb),
    'generated_at', now(),
    'center', CASE WHEN _lat IS NULL THEN NULL ELSE jsonb_build_object('lat', _lat, 'lng', _lng) END,
    'radius_km', _radius_km
  );
END $$;

REVOKE ALL ON FUNCTION public.get_coffee_radar(double precision, double precision, double precision) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_coffee_radar(double precision, double precision, double precision) TO authenticated;
