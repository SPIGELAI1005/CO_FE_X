-- Trails / quests: curated multi-stop routes with join flow, campaign-aware progress, rewards.

ALTER TABLE public.coffee_crawls
  ADD COLUMN IF NOT EXISTS theme text,
  ADD COLUMN IF NOT EXISTS estimated_walk_minutes int NOT NULL DEFAULT 45,
  ADD COLUMN IF NOT EXISTS estimated_distance_m int NOT NULL DEFAULT 2500,
  ADD COLUMN IF NOT EXISTS badge_slug text,
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS progress_mode text NOT NULL DEFAULT 'either';

ALTER TABLE public.coffee_crawls DROP CONSTRAINT IF EXISTS coffee_crawls_progress_mode_check;
ALTER TABLE public.coffee_crawls ADD CONSTRAINT coffee_crawls_progress_mode_check
  CHECK (progress_mode IN ('check_in', 'campaign_redeem', 'either'));

COMMENT ON COLUMN public.coffee_crawls.progress_mode IS
  'How stops count: check_in, campaign_redeem (used_at), or either.';

ALTER TABLE public.crawl_stops
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.user_trail_joins (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  crawl_id uuid NOT NULL REFERENCES public.coffee_crawls(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, crawl_id)
);

ALTER TABLE public.user_trail_joins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user trail joins read own" ON public.user_trail_joins;
CREATE POLICY "user trail joins read own" ON public.user_trail_joins
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "user trail joins insert own" ON public.user_trail_joins;
CREATE POLICY "user trail joins insert own" ON public.user_trail_joins
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
GRANT SELECT, INSERT ON public.user_trail_joins TO authenticated;

-- ── Trail catalog seeds ──
INSERT INTO public.coffee_crawls (
  slug, title, city_slug, description, reward_points, theme,
  estimated_walk_minutes, estimated_distance_m, badge_slug, progress_mode, active
) VALUES
  (
    'allach-coffee-walk',
    'Allach Coffee Walk',
    'munich',
    'A relaxed loop through Allach — discover neighborhood roasters and cozy corners.',
    120, 'neighborhood', 50, 3200, 'allach-explorer', 'either', true
  ),
  (
    'schwabing-cappuccino-route',
    'Schwabing Cappuccino Route',
    'munich',
    'Foam art, velvet microfoam, and classic Schwabing café culture.',
    150, 'cappuccino', 55, 3800, NULL, 'either', true
  ),
  (
    'munich-matcha-quest',
    'Munich Matcha Quest',
    'munich',
    'Hunt the city''s best matcha — complete campaigns at each stop.',
    175, 'matcha', 60, 4200, 'matcha-master', 'campaign_redeem', true
  ),
  (
    'ice-cream-summer-trail',
    'Ice Cream Summer Trail',
    'munich',
    'Seasonal frozen treats paired with specialty coffee stops.',
    140, 'seasonal', 40, 2800, 'ice-cream-explorer', 'either', true
  ),
  (
    'hidden-gems-weekend',
    'Hidden Gems Weekend',
    'munich',
    'Low-discovery cafés worth the detour — perfect for a slow Saturday.',
    160, 'hidden_gem', 65, 4500, 'hidden-gem-finder', 'either', true
  ),
  (
    'rainy-day-cafe-route',
    'Rainy Day Café Route',
    'munich',
    'Cozy interiors and comfort drinks when the weather turns grey.',
    130, 'rainy', 35, 2400, 'rainy-day-coffee', 'either', true
  ),
  (
    'local-heroes-tour',
    'Local Heroes Tour',
    'munich',
    'Support independent cafés making Munich''s coffee scene shine.',
    180, 'local_hero', 70, 5000, 'local-hero', 'campaign_redeem', true
  ),
  (
    'munich-centre-crawl',
    'Munich Centre Crawl',
    'munich',
    'The classic old-town coffee trail — still a rite of passage.',
    200, 'classic', 45, 3000, 'munich-coffee-trail', 'either', true
  )
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  theme = EXCLUDED.theme,
  estimated_walk_minutes = EXCLUDED.estimated_walk_minutes,
  estimated_distance_m = EXCLUDED.estimated_distance_m,
  badge_slug = EXCLUDED.badge_slug,
  progress_mode = EXCLUDED.progress_mode,
  reward_points = EXCLUDED.reward_points;

-- Seasonal window for summer trail
UPDATE public.coffee_crawls
SET starts_at = date_trunc('year', now()) + interval '5 months',
    ends_at = date_trunc('year', now()) + interval '8 months'
WHERE slug = 'ice-cream-summer-trail';

-- Populate stops from approved shops when missing (theme-aware heuristics)
CREATE OR REPLACE FUNCTION public._seed_trail_stops(_slug text, _limit int, _filter_sql text DEFAULT 'true')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _crawl_id uuid;
  _shop record;
  _order int := 0;
BEGIN
  SELECT id INTO _crawl_id FROM public.coffee_crawls WHERE slug = _slug;
  IF _crawl_id IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.crawl_stops WHERE crawl_id = _crawl_id) THEN RETURN; END IF;

  FOR _shop IN EXECUTE format(
    $q$
    SELECT s.id, s.name,
      (SELECT c.id FROM public.campaigns c
       WHERE c.coffee_shop_id = s.id AND c.status = 'active'
         AND (c.ends_at IS NULL OR c.ends_at > now())
       ORDER BY c.created_at DESC LIMIT 1) AS campaign_id
    FROM public.coffee_shops s
    WHERE s.status = 'approved' AND (%s)
    ORDER BY s.name
    LIMIT %s
    $q$, _filter_sql, _limit
  ) LOOP
    _order := _order + 1;
    INSERT INTO public.crawl_stops (crawl_id, coffee_shop_id, stop_order, hint, campaign_id)
    VALUES (_crawl_id, _shop.id, _order, 'Stop ' || _order || ' — ' || _shop.name, _shop.campaign_id)
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

SELECT public._seed_trail_stops('allach-coffee-walk', 4,
  $$lower(COALESCE(s.neighborhood, '')) = 'allach' OR (lower(COALESCE(s.city, '')) = 'munich' AND s.tags && ARRAY['local', 'local-hero', 'local_hero'])$$);
SELECT public._seed_trail_stops('schwabing-cappuccino-route', 4,
  $$lower(COALESCE(s.neighborhood, '')) = 'schwabing' OR lower(COALESCE(s.city, '')) = 'munich'$$);
SELECT public._seed_trail_stops('munich-matcha-quest', 4,
  $$lower(COALESCE(s.city, '')) = 'munich' AND (s.tags && ARRAY['matcha'] OR EXISTS (SELECT 1 FROM campaigns c WHERE c.coffee_shop_id = s.id AND c.reward_type = 'matcha' AND c.status = 'active'))$$);
SELECT public._seed_trail_stops('ice-cream-summer-trail', 3,
  $$lower(COALESCE(s.city, '')) = 'munich'$$);
SELECT public._seed_trail_stops('hidden-gems-weekend', 5,
  $$s.tags && ARRAY['hidden-gem', 'hidden_gem'] OR lower(COALESCE(s.city, '')) = 'munich'$$);
SELECT public._seed_trail_stops('rainy-day-cafe-route', 3,
  $$lower(COALESCE(s.city, '')) = 'munich'$$);
SELECT public._seed_trail_stops('local-heroes-tour', 5,
  $$s.tags && ARRAY['local-hero', 'local_hero', 'local'] OR lower(COALESCE(s.city, '')) = 'munich'$$);
SELECT public._seed_trail_stops('munich-centre-crawl', 5,
  $$lower(COALESCE(s.city, '')) = 'munich'$$);

-- ── Complete trail (XP + optional badge) ──
CREATE OR REPLACE FUNCTION public._complete_trail_if_ready(_user uuid, _crawl_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _crawl record;
  _total int;
  _done int;
  _badge record;
  _inserted int;
BEGIN
  SELECT * INTO _crawl FROM public.coffee_crawls WHERE id = _crawl_id;
  IF NOT FOUND THEN RETURN false; END IF;

  SELECT COUNT(*) INTO _total FROM public.crawl_stops WHERE crawl_id = _crawl_id;
  SELECT COUNT(*) INTO _done FROM public.user_crawl_stops WHERE user_id = _user AND crawl_id = _crawl_id;

  IF _total = 0 OR _done < _total THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.user_crawl_completions WHERE user_id = _user AND crawl_id = _crawl_id) THEN
    RETURN false;
  END IF;

  INSERT INTO public.user_crawl_completions (user_id, crawl_id) VALUES (_user, _crawl_id);

  PERFORM public.award_xp(
    _user, 'trail_complete', _crawl_id::text, _crawl_id, 'coffee_crawls',
    jsonb_build_object('title', _crawl.title, 'slug', _crawl.slug),
    GREATEST(_crawl.reward_points, (SELECT xp_amount FROM public.xp_config WHERE event_key = 'trail_complete'))
  );

  IF _crawl.badge_slug IS NOT NULL THEN
    SELECT id, name, rarity INTO _badge FROM public.badges WHERE slug = _crawl.badge_slug;
    IF FOUND THEN
      INSERT INTO public.user_badges (user_id, badge_id)
      VALUES (_user, _badge.id)
      ON CONFLICT DO NOTHING;
      GET DIAGNOSTICS _inserted = ROW_COUNT;
      IF _inserted > 0 THEN
        PERFORM public.award_xp(_user, 'badge_unlock', _badge.id::text, _badge.id, 'badges',
          jsonb_build_object('slug', _crawl.badge_slug, 'via', 'trail_complete'), NULL);
      END IF;
    END IF;
  END IF;

  PERFORM public.evaluate_user_badges(_user, jsonb_build_object('source', 'trail_complete', 'crawl_id', _crawl_id));

  INSERT INTO public.notifications(user_id, type, title, body, link, payload) VALUES (
    _user, 'trail_complete',
    'Trail complete: ' || _crawl.title,
    'You finished the route and earned XP. Check your passport for badges!',
    '/crawls/' || _crawl.slug,
    jsonb_build_object('crawl_id', _crawl_id, 'slug', _crawl.slug)
  );

  RETURN true;
END;
$$;

-- ── Record stop progress (check-in or campaign redeem) ──
CREATE OR REPLACE FUNCTION public.record_trail_progress(
  _user uuid,
  _shop_id uuid,
  _source text DEFAULT 'check_in'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _crawl record;
  _newly_completed jsonb := '[]'::jsonb;
BEGIN
  IF _user IS NULL THEN RETURN '[]'::jsonb; END IF;

  FOR _crawl IN
    SELECT c.*
    FROM public.coffee_crawls c
    JOIN public.crawl_stops s ON s.crawl_id = c.id
    WHERE s.coffee_shop_id = _shop_id
      AND c.active = true
      AND (c.starts_at IS NULL OR c.starts_at <= now())
      AND (c.ends_at IS NULL OR c.ends_at >= now())
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.user_trail_joins WHERE user_id = _user AND crawl_id = _crawl.id) THEN
      CONTINUE;
    END IF;

    IF _crawl.progress_mode = 'check_in' AND _source <> 'check_in' THEN CONTINUE; END IF;
    IF _crawl.progress_mode = 'campaign_redeem' AND _source <> 'campaign_redeem' THEN CONTINUE; END IF;

    INSERT INTO public.user_crawl_stops (user_id, crawl_id, coffee_shop_id)
    VALUES (_user, _crawl.id, _shop_id)
    ON CONFLICT DO NOTHING;

    IF public._complete_trail_if_ready(_user, _crawl.id) THEN
      _newly_completed := _newly_completed || jsonb_build_object(
        'slug', _crawl.slug, 'title', _crawl.title, 'crawl_id', _crawl.id
      );
    END IF;
  END LOOP;

  RETURN _newly_completed;
END;
$$;

-- Replace crawl stop recorder used by check-in
CREATE OR REPLACE FUNCTION public.record_crawl_stop(_user uuid, _shop_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.record_trail_progress(_user, _shop_id, 'check_in');
END;
$$;

-- ── Join trail ──
CREATE OR REPLACE FUNCTION public.join_trail(_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _crawl record;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _crawl FROM public.coffee_crawls
  WHERE slug = _slug AND active = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now());
  IF NOT FOUND THEN RAISE EXCEPTION 'Trail not available'; END IF;

  INSERT INTO public.user_trail_joins (user_id, crawl_id)
  VALUES (_user, _crawl.id)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.notifications(user_id, type, title, body, link, payload) VALUES (
    _user, 'trail_joined',
    'Trail started: ' || _crawl.title,
    'Visit each stop and complete campaigns to finish the route.',
    '/crawls/' || _crawl.slug,
    jsonb_build_object('crawl_id', _crawl.id, 'slug', _crawl.slug)
  );

  RETURN jsonb_build_object(
    'joined', true,
    'slug', _crawl.slug,
    'crawl_id', _crawl.id,
    'title', _crawl.title
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_trail(text) TO authenticated;

-- ── List trails (enhanced) ──
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
      'theme', c.theme,
      'estimated_walk_minutes', c.estimated_walk_minutes,
      'estimated_distance_m', c.estimated_distance_m,
      'badge_slug', c.badge_slug,
      'starts_at', c.starts_at,
      'ends_at', c.ends_at,
      'progress_mode', c.progress_mode,
      'seasonal', c.starts_at IS NOT NULL OR c.ends_at IS NOT NULL,
      'joined', EXISTS (
        SELECT 1 FROM public.user_trail_joins j
        WHERE j.crawl_id = c.id AND j.user_id = auth.uid()
      ),
      'stop_count', (SELECT COUNT(*) FROM public.crawl_stops s WHERE s.crawl_id = c.id),
      'stops', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'order', s.stop_order,
          'shop_id', s.coffee_shop_id,
          'shop_name', sh.name,
          'shop_slug', sh.slug,
          'hint', s.hint,
          'latitude', sh.latitude,
          'longitude', sh.longitude,
          'campaign_id', s.campaign_id,
          'campaign_title', (SELECT title FROM public.campaigns cam WHERE cam.id = s.campaign_id)
        ) ORDER BY s.stop_order)
        FROM public.crawl_stops s
        JOIN public.coffee_shops sh ON sh.id = s.coffee_shop_id
        WHERE s.crawl_id = c.id
      ), '[]'::jsonb)
    ) AS row
    FROM public.coffee_crawls c
    WHERE c.active = true
      AND (c.starts_at IS NULL OR c.starts_at <= now())
      AND (c.ends_at IS NULL OR c.ends_at >= now())
      AND (_city_slug IS NULL OR c.city_slug = _city_slug)
  ) t;
$$;

-- ── Trail detail + user progress ──
CREATE OR REPLACE FUNCTION public.get_trail_detail(_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _crawl record;
  _result jsonb;
BEGIN
  SELECT * INTO _crawl FROM public.coffee_crawls WHERE slug = _slug AND active = true;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT jsonb_build_object(
    'id', c.id,
    'slug', c.slug,
    'title', c.title,
    'city_slug', c.city_slug,
    'description', c.description,
    'reward_points', c.reward_points,
    'theme', c.theme,
    'estimated_walk_minutes', c.estimated_walk_minutes,
    'estimated_distance_m', c.estimated_distance_m,
    'badge_slug', c.badge_slug,
    'badge_name', (SELECT name FROM public.badges b WHERE b.slug = c.badge_slug),
    'starts_at', c.starts_at,
    'ends_at', c.ends_at,
    'progress_mode', c.progress_mode,
    'seasonal', c.starts_at IS NOT NULL OR c.ends_at IS NOT NULL,
    'joined', EXISTS (SELECT 1 FROM public.user_trail_joins j WHERE j.crawl_id = c.id AND j.user_id = _user),
    'completed', EXISTS (SELECT 1 FROM public.user_crawl_completions cc WHERE cc.crawl_id = c.id AND cc.user_id = _user),
    'stops_done', (SELECT COUNT(*) FROM public.user_crawl_stops ucs WHERE ucs.crawl_id = c.id AND ucs.user_id = _user),
    'stop_count', (SELECT COUNT(*) FROM public.crawl_stops s WHERE s.crawl_id = c.id),
    'stops', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'order', s.stop_order,
        'shop_id', s.coffee_shop_id,
        'shop_name', sh.name,
        'shop_slug', sh.slug,
        'hint', s.hint,
        'latitude', sh.latitude,
        'longitude', sh.longitude,
        'neighborhood', sh.neighborhood,
        'campaign_id', s.campaign_id,
        'campaign_title', (SELECT title FROM public.campaigns cam WHERE cam.id = s.campaign_id),
        'done', EXISTS (
          SELECT 1 FROM public.user_crawl_stops ucs
          WHERE ucs.user_id = _user AND ucs.crawl_id = c.id AND ucs.coffee_shop_id = s.coffee_shop_id
        )
      ) ORDER BY s.stop_order)
      FROM public.crawl_stops s
      JOIN public.coffee_shops sh ON sh.id = s.coffee_shop_id
      WHERE s.crawl_id = c.id
    ), '[]'::jsonb)
  ) INTO _result
  FROM public.coffee_crawls c
  WHERE c.id = _crawl.id;

  RETURN _result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_trail_detail(text) TO authenticated, anon;

-- ── User progress list ──
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
    'joined', EXISTS (SELECT 1 FROM public.user_trail_joins j WHERE j.user_id = _user AND j.crawl_id = c.id),
    'completed', EXISTS (SELECT 1 FROM public.user_crawl_completions cc WHERE cc.user_id = _user AND cc.crawl_id = c.id),
    'stops_done', (SELECT COUNT(*) FROM public.user_crawl_stops ucs WHERE ucs.user_id = _user AND ucs.crawl_id = c.id),
    'stop_count', (SELECT COUNT(*) FROM public.crawl_stops s WHERE s.crawl_id = c.id)
  )), '[]'::jsonb)
  FROM public.coffee_crawls c
  WHERE c.active = true;
$$;

-- Hook campaign redemption into trail progress
CREATE OR REPLACE FUNCTION public.verify_redemption_code(
  _code text,
  _ip text DEFAULT NULL,
  _rotating_token text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _partner uuid := auth.uid();
  _attempts int;
  _r record;
  _result text;
  _cat record;
  _expected_token text;
  _campaign_ended boolean;
  _ctx jsonb;
  _new_badges jsonb;
  _trail_completed jsonb;
BEGIN
  IF _partner IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT COUNT(*) INTO _attempts
    FROM public.redemption_verifications
   WHERE partner_id = _partner AND verified_at > now() - interval '1 hour';
  IF _attempts >= 60 THEN
    INSERT INTO public.redemption_verifications(partner_id, code, result, ip)
      VALUES (_partner, upper(coalesce(_code,'')), 'rate_limited', _ip);
    RETURN jsonb_build_object('result', 'rate_limited', 'redemption_code', upper(coalesce(_code,'')));
  END IF;

  _code := upper(trim(coalesce(_code, '')));
  IF _rotating_token IS NULL AND position(' ' IN _code) > 0 THEN
    _rotating_token := trim(split_part(_code, ' ', 2));
    _code := upper(trim(split_part(_code, ' ', 1)));
  END IF;

  IF _code IS NULL OR length(_code) < 4 THEN
    INSERT INTO public.redemption_verifications(partner_id, code, result, ip)
      VALUES (_partner, coalesce(_code,''), 'not_found', _ip);
    RETURN jsonb_build_object('result', 'not_found', 'redemption_code', coalesce(_code,''));
  END IF;

  SELECT cr.id AS redemption_id, cr.campaign_id, cr.user_id AS explorer_id, cr.points_awarded,
         cr.used_at, cr.expires_at, cr.reward_status,
         c.title AS campaign_title, c.reward_description, c.ends_at AS campaign_ends_at,
         c.coffee_shop_id,
         s.partner_id AS shop_owner, s.name AS shop_name
    INTO _r
    FROM public.campaign_redemptions cr
    JOIN public.campaigns c ON c.id = cr.campaign_id
    JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
   WHERE cr.redemption_code = _code;

  IF _r IS NULL THEN
    SELECT cr.id, cr.user_id, cr.points_spent, cr.used_at, cr.expires_at, cr.reward_status, rc.name AS item_name
      INTO _cat
      FROM public.catalog_redemptions cr JOIN public.reward_catalog rc ON rc.id = cr.catalog_id
     WHERE cr.redemption_code = _code;
    IF _cat IS NULL THEN
      INSERT INTO public.redemption_verifications(partner_id, code, result, ip)
        VALUES (_partner, _code, 'not_found', _ip);
      RETURN jsonb_build_object('result', 'not_found', 'redemption_code', _code);
    END IF;

    _campaign_ended := _cat.expires_at IS NOT NULL AND _cat.expires_at < now();
    IF _cat.used_at IS NOT NULL THEN
      _result := 'already_used';
    ELSIF _campaign_ended OR _cat.reward_status = 'expired' THEN
      _result := 'expired';
    ELSIF _rotating_token IS NOT NULL AND _rotating_token <> public.get_rotating_verify_token(_code) THEN
      _result := 'invalid_token';
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
      'shop_name', null,
      'used_at', (SELECT used_at FROM public.catalog_redemptions WHERE id = _cat.id),
      'expires_at', _cat.expires_at,
      'points_awarded', _cat.points_spent, 'kind', 'wallet'
    );
  END IF;

  IF _r.shop_owner <> _partner THEN
    INSERT INTO public.redemption_verifications(partner_id, campaign_id, redemption_id, code, result, ip)
      VALUES (_partner, _r.campaign_id, _r.redemption_id, _code, 'not_yours', _ip);
    RETURN jsonb_build_object(
      'result', 'not_yours',
      'redemption_code', _code,
      'campaign_title', _r.campaign_title,
      'shop_name', _r.shop_name,
      'kind', 'campaign'
    );
  END IF;

  _campaign_ended := (_r.campaign_ends_at IS NOT NULL AND _r.campaign_ends_at < now())
    OR (_r.expires_at IS NOT NULL AND _r.expires_at < now())
    OR _r.reward_status = 'expired';

  _new_badges := '[]'::jsonb;
  _trail_completed := '[]'::jsonb;

  IF _r.used_at IS NOT NULL OR _r.reward_status = 'redeemed' THEN
    _result := 'already_used';
  ELSIF _campaign_ended THEN
    _result := 'expired';
  ELSIF _rotating_token IS NOT NULL AND trim(_rotating_token) <> '' THEN
    _expected_token := public.get_rotating_verify_token(_code);
    IF lpad(trim(_rotating_token), 6, '0') <> _expected_token THEN
      _result := 'invalid_token';
    ELSE
      _ctx := public.build_redemption_completion_context(_r.explorer_id, _r.coffee_shop_id);
      UPDATE public.campaign_redemptions
      SET used_at = now(), completion_context = _ctx
      WHERE id = _r.redemption_id;
      PERFORM public.award_xp(_r.explorer_id, 'reward_redeemed', _r.redemption_id::text, _r.redemption_id, 'campaign_redemptions',
        jsonb_build_object('campaign_id', _r.campaign_id, 'code', _code), NULL);
      _trail_completed := public.record_trail_progress(_r.explorer_id, _r.coffee_shop_id, 'campaign_redeem');
      _new_badges := public.evaluate_user_badges(_r.explorer_id, _ctx || jsonb_build_object('source', 'reward_redeemed'));
      INSERT INTO public.notifications(user_id, type, title, body, link, payload) VALUES (
        _r.explorer_id, 'campaign_code_redeemed',
        'Reward redeemed at ' || _r.shop_name,
        'Your code ' || _code || ' was just used. Enjoy!',
        '/campaign/' || _r.campaign_id::text,
        jsonb_build_object('code', _code, 'campaign_id', _r.campaign_id));
      _result := 'ok';
    END IF;
  ELSE
    _ctx := public.build_redemption_completion_context(_r.explorer_id, _r.coffee_shop_id);
    UPDATE public.campaign_redemptions
    SET used_at = now(), completion_context = _ctx
    WHERE id = _r.redemption_id;
    PERFORM public.award_xp(_r.explorer_id, 'reward_redeemed', _r.redemption_id::text, _r.redemption_id, 'campaign_redemptions',
      jsonb_build_object('campaign_id', _r.campaign_id, 'code', _code), NULL);
    _trail_completed := public.record_trail_progress(_r.explorer_id, _r.coffee_shop_id, 'campaign_redeem');
    _new_badges := public.evaluate_user_badges(_r.explorer_id, _ctx || jsonb_build_object('source', 'reward_redeemed'));
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
    'result', _result,
    'redemption_code', _code,
    'campaign_id', _r.campaign_id,
    'campaign_title', _r.campaign_title,
    'reward', _r.reward_description,
    'shop_name', _r.shop_name,
    'used_at', (SELECT used_at FROM public.campaign_redemptions WHERE id = _r.redemption_id),
    'expires_at', _r.expires_at,
    'points_awarded', _r.points_awarded,
    'new_badges', _new_badges,
    'trails_completed', _trail_completed,
    'kind', 'campaign'
  );
END;
$function$;

DROP FUNCTION IF EXISTS public._seed_trail_stops(text, int, text);
