
CREATE OR REPLACE FUNCTION public.get_leaderboard(_metric text DEFAULT 'points', _limit int DEFAULT 50)
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
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH base AS (
    SELECT
      p.id AS user_id,
      p.display_name,
      p.avatar_url,
      p.city,
      COALESCE(p.total_points,0) AS total_points,
      COALESCE((SELECT COUNT(DISTINCT ci.coffee_shop_id) FROM public.check_ins ci WHERE ci.user_id = p.id), 0) AS cafes_visited,
      COALESCE((SELECT COUNT(*) FROM public.reviews r WHERE r.user_id = p.id), 0) AS reviews_written,
      COALESCE((SELECT COUNT(*) FROM public.campaign_redemptions cr WHERE cr.user_id = p.id), 0) AS campaigns_completed,
      COALESCE((SELECT COUNT(*) FROM public.social_submissions ss WHERE ss.user_id = p.id AND ss.status='approved'), 0) AS social_posts
    FROM public.profiles p
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

GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, int) TO authenticated, anon;
