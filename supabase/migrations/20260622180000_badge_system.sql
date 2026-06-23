-- Badge system v2: centralized evaluation, campaign-based achievements, rarity.

ALTER TABLE public.coffee_shops
  ADD COLUMN IF NOT EXISTS neighborhood text;

COMMENT ON COLUMN public.coffee_shops.neighborhood IS
  'District / neighborhood (e.g. Allach, Schwabing) for location badges.';

ALTER TABLE public.check_ins
  ADD COLUMN IF NOT EXISTS weather_tag text;

COMMENT ON COLUMN public.check_ins.weather_tag IS
  'Optional weather at check-in (rain, sunny, etc.) for contextual badges.';

ALTER TABLE public.campaign_redemptions
  ADD COLUMN IF NOT EXISTS completion_context jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.campaign_redemptions.completion_context IS
  'Snapshot when reward redeemed at counter: hour, dow, weather, city, neighborhood.';

-- ── Grant helper (deduped via user_badges unique) ──
CREATE OR REPLACE FUNCTION public.grant_badge_if_qualified(
  _user uuid,
  _badge_id uuid,
  _slug text,
  _name text,
  _rarity text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inserted int;
BEGIN
  INSERT INTO public.user_badges (user_id, badge_id)
  VALUES (_user, _badge_id)
  ON CONFLICT (user_id, badge_id) DO NOTHING;
  GET DIAGNOSTICS _inserted = ROW_COUNT;
  IF _inserted > 0 THEN
    PERFORM public.award_xp(_user, 'badge_unlock', _badge_id::text, _badge_id, 'badges',
      jsonb_build_object('slug', _slug, 'name', _name, 'rarity', _rarity));
    RETURN jsonb_build_object('slug', _slug, 'name', _name, 'rarity', _rarity);
  END IF;
  RETURN NULL;
END;
$$;

-- ── Progress snapshot for one user ──
CREATE OR REPLACE FUNCTION public.get_explorer_badge_stats(_user uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _stats jsonb;
BEGIN
  IF _user IS NULL THEN RETURN '{}'::jsonb; END IF;

  SELECT jsonb_build_object(
    'campaigns_completed', (
      SELECT COUNT(*)::int FROM public.campaign_redemptions
      WHERE user_id = _user AND used_at IS NOT NULL
    ),
    'reward_type_counts', COALESCE((
      SELECT jsonb_object_agg(c.reward_type, cnt)
      FROM (
        SELECT c.reward_type, COUNT(*)::int AS cnt
        FROM public.campaign_redemptions cr
        JOIN public.campaigns c ON c.id = cr.campaign_id
        WHERE cr.user_id = _user AND cr.used_at IS NOT NULL
        GROUP BY c.reward_type
      ) c
    ), '{}'::jsonb),
    'unique_local_shops', (
      SELECT COUNT(DISTINCT ci.coffee_shop_id)::int
      FROM public.check_ins ci
      JOIN public.coffee_shops s ON s.id = ci.coffee_shop_id
      WHERE ci.user_id = _user
        AND (
          'local-hero' = ANY(s.tags) OR 'local_hero' = ANY(s.tags)
          OR 'local' = ANY(s.tags)
        )
    ),
    'low_discovery_visits', (
      SELECT COUNT(DISTINCT ci.coffee_shop_id)::int
      FROM public.check_ins ci
      WHERE ci.user_id = _user
        AND (
          SELECT COUNT(*) FROM public.check_ins x WHERE x.coffee_shop_id = ci.coffee_shop_id
        ) <= 25
    ),
    'social_posts', (
      SELECT COUNT(*)::int FROM public.social_submissions
      WHERE user_id = _user AND status = 'approved'
    ),
    'gifts_sent', (
      SELECT COUNT(*)::int FROM public.gift_credits WHERE sender_id = _user
    ),
    'sunday_campaigns', (
      SELECT COUNT(*)::int FROM public.campaign_redemptions
      WHERE user_id = _user AND used_at IS NOT NULL
        AND EXTRACT(DOW FROM used_at AT TIME ZONE 'Europe/Berlin') = 0
    ),
    'rainy_campaigns', (
      SELECT COUNT(*)::int FROM public.campaign_redemptions cr
      WHERE cr.user_id = _user AND cr.used_at IS NOT NULL
        AND lower(COALESCE(cr.completion_context->>'weather', '')) IN ('rain', 'rainy', 'drizzle', 'storm')
    ),
    'allach_campaigns', (
      SELECT COUNT(*)::int FROM public.campaign_redemptions cr
      JOIN public.campaigns c ON c.id = cr.campaign_id
      JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
      WHERE cr.user_id = _user AND cr.used_at IS NOT NULL
        AND lower(COALESCE(cr.completion_context->>'neighborhood', s.neighborhood, '')) = 'allach'
    ),
    'munich_districts', (
      SELECT COUNT(DISTINCT lower(COALESCE(cr.completion_context->>'neighborhood', s.neighborhood)))::int
      FROM public.campaign_redemptions cr
      JOIN public.campaigns c ON c.id = cr.campaign_id
      JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
      WHERE cr.user_id = _user AND cr.used_at IS NOT NULL
        AND lower(COALESCE(s.city, cr.completion_context->>'city', '')) = 'munich'
        AND COALESCE(cr.completion_context->>'neighborhood', s.neighborhood) IS NOT NULL
        AND trim(COALESCE(cr.completion_context->>'neighborhood', s.neighborhood, '')) <> ''
    ),
    'early_bird_campaigns', (
      SELECT COUNT(*)::int FROM public.campaign_redemptions
      WHERE user_id = _user AND used_at IS NOT NULL
        AND COALESCE((completion_context->>'hour')::int, EXTRACT(HOUR FROM used_at AT TIME ZONE 'Europe/Berlin')::int) < 10
    ),
    'night_owl_campaigns', (
      SELECT COUNT(*)::int FROM public.campaign_redemptions
      WHERE user_id = _user AND used_at IS NOT NULL
        AND COALESCE((completion_context->>'hour')::int, EXTRACT(HOUR FROM used_at AT TIME ZONE 'Europe/Berlin')::int) >= 18
    ),
    'total_check_ins', (
      SELECT COUNT(*)::int FROM public.check_ins WHERE user_id = _user
    ),
    'unique_shops', (
      SELECT COUNT(DISTINCT coffee_shop_id)::int FROM public.check_ins WHERE user_id = _user
    ),
    'tag_counts', COALESCE((
      SELECT jsonb_object_agg(tag, cnt)
      FROM (
        SELECT lower(t.tag) AS tag, COUNT(*)::int AS cnt
        FROM public.check_ins ci
        JOIN public.coffee_shops s ON s.id = ci.coffee_shop_id
        CROSS JOIN LATERAL unnest(s.tags) AS t(tag)
        WHERE ci.user_id = _user
        GROUP BY lower(t.tag)
      ) x
    ), '{}'::jsonb),
    'city_counts', COALESCE((
      SELECT jsonb_object_agg(city, cnt)
      FROM (
        SELECT lower(s.city) AS city, COUNT(DISTINCT s.id)::int AS cnt
        FROM public.check_ins ci
        JOIN public.coffee_shops s ON s.id = ci.coffee_shop_id
        WHERE ci.user_id = _user AND s.city IS NOT NULL
        GROUP BY lower(s.city)
      ) x
    ), '{}'::jsonb),
    'countries_visited', COALESCE((
      SELECT jsonb_agg(DISTINCT lower(s.country))
      FROM public.check_ins ci
      JOIN public.coffee_shops s ON s.id = ci.coffee_shop_id
      WHERE ci.user_id = _user AND s.country IS NOT NULL
    ), '[]'::jsonb)
  ) INTO _stats;

  RETURN _stats;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_explorer_badge_stats(uuid) TO authenticated;

-- ── Criteria evaluator ──
CREATE OR REPLACE FUNCTION public.badge_user_meets_criteria(_user uuid, _criteria jsonb)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _type text := _criteria->>'type';
  _threshold int := GREATEST(COALESCE((_criteria->>'threshold')::int, 1), 1);
  _value text := _criteria->>'value';
  _stats jsonb;
  _current int;
  _countries text[];
  _count int;
BEGIN
  _stats := public.get_explorer_badge_stats(_user);

  CASE _type
    WHEN 'check_ins' THEN
      _current := COALESCE((_stats->>'total_check_ins')::int, 0);
    WHEN 'unique_shops' THEN
      _current := COALESCE((_stats->>'unique_shops')::int, 0);
    WHEN 'tag' THEN
      _current := COALESCE((_stats->'tag_counts'->>lower(_value))::int, 0);
    WHEN 'city' THEN
      _current := COALESCE((_stats->'city_counts'->>lower(_value))::int, 0);
    WHEN 'beverage' THEN
      SELECT COUNT(*)::int INTO _current FROM public.check_ins
      WHERE user_id = _user AND COALESCE(beverage_tag, 'coffee') = _value;
    WHEN 'region_countries' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(_criteria->'countries')) INTO _countries;
      SELECT COUNT(DISTINCT lower(s.country))::int INTO _count
      FROM public.check_ins ci JOIN public.coffee_shops s ON s.id = ci.coffee_shop_id
      WHERE ci.user_id = _user AND lower(s.country) = ANY(SELECT lower(c) FROM unnest(_countries) c);
      _current := _count;
    WHEN 'campaigns_completed' THEN
      _current := COALESCE((_stats->>'campaigns_completed')::int, 0);
    WHEN 'reward_type_redeemed' THEN
      _current := COALESCE((_stats->'reward_type_counts'->>_value)::int, 0);
    WHEN 'unique_local_shops' THEN
      _current := COALESCE((_stats->>'unique_local_shops')::int, 0);
    WHEN 'low_discovery_shops' THEN
      _current := COALESCE((_stats->>'low_discovery_visits')::int, 0);
    WHEN 'social_posts' THEN
      _current := COALESCE((_stats->>'social_posts')::int, 0);
    WHEN 'gifts_sent' THEN
      _current := COALESCE((_stats->>'gifts_sent')::int, 0);
    WHEN 'campaign_sunday' THEN
      _current := COALESCE((_stats->>'sunday_campaigns')::int, 0);
    WHEN 'campaign_rainy' THEN
      _current := COALESCE((_stats->>'rainy_campaigns')::int, 0);
    WHEN 'neighborhood_completed' THEN
      IF lower(_value) = 'allach' THEN
        _current := COALESCE((_stats->>'allach_campaigns')::int, 0);
      ELSE
        SELECT COUNT(*)::int INTO _current
        FROM public.campaign_redemptions cr
        JOIN public.campaigns c ON c.id = cr.campaign_id
        JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
        WHERE cr.user_id = _user AND cr.used_at IS NOT NULL
          AND lower(COALESCE(cr.completion_context->>'neighborhood', s.neighborhood, '')) = lower(_value);
      END IF;
    WHEN 'munich_districts' THEN
      _current := COALESCE((_stats->>'munich_districts')::int, 0);
    WHEN 'campaign_before_hour' THEN
      _current := COALESCE((_stats->>'early_bird_campaigns')::int, 0);
    WHEN 'campaign_after_hour' THEN
      _current := COALESCE((_stats->>'night_owl_campaigns')::int, 0);
    ELSE
      RETURN false;
  END CASE;

  RETURN _current >= _threshold;
END;
$$;

-- ── Evaluate all badges; return newly granted ──
CREATE OR REPLACE FUNCTION public.evaluate_user_badges(
  _user uuid,
  _context jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _b record;
  _new jsonb := '[]'::jsonb;
  _granted jsonb;
BEGIN
  IF _user IS NULL THEN RETURN '[]'::jsonb; END IF;

  FOR _b IN SELECT id, slug, name, rarity, criteria FROM public.badges ORDER BY slug LOOP
    IF public.badge_user_meets_criteria(_user, _b.criteria) THEN
      _granted := public.grant_badge_if_qualified(_user, _b.id, _b.slug, _b.name, _b.rarity);
      IF _granted IS NOT NULL THEN
        _new := _new || _granted;
      END IF;
    END IF;
  END LOOP;

  RETURN _new;
END;
$$;

GRANT EXECUTE ON FUNCTION public.evaluate_user_badges(uuid, jsonb) TO authenticated;

-- ── Seed / update badge catalog ──
INSERT INTO public.badges (slug, name, description, criteria, rarity, category, points_required) VALUES
  ('first-sip', 'First Sip', 'Complete your first campaign reward at the counter.',
    '{"type":"campaigns_completed","threshold":1}'::jsonb, 'common', 'campaign', 0),
  ('espresso-hunter', 'Espresso Hunter', 'Redeem 5 coffee rewards at partner cafés.',
    '{"type":"reward_type_redeemed","value":"coffee","threshold":5}'::jsonb, 'rare', 'reward', 0),
  ('matcha-master', 'Matcha Master', 'Redeem 5 matcha rewards.',
    '{"type":"reward_type_redeemed","value":"matcha","threshold":5}'::jsonb, 'rare', 'reward', 0),
  ('ice-cream-explorer', 'Ice Cream Explorer', 'Redeem 3 ice cream rewards.',
    '{"type":"reward_type_redeemed","value":"ice_cream","threshold":3}'::jsonb, 'uncommon', 'reward', 0),
  ('local-hero', 'Local Hero', 'Support 10 independent local cafés.',
    '{"type":"unique_local_shops","threshold":10}'::jsonb, 'epic', 'discovery', 0),
  ('hidden-gem-finder', 'Hidden Gem Finder', 'Visit 5 low-discovery cafés (under 25 total check-ins).',
    '{"type":"low_discovery_shops","threshold":5,"max_shop_check_ins":25}'::jsonb, 'epic', 'discovery', 0),
  ('sunday-explorer', 'Sunday Explorer', 'Complete a campaign on a Sunday.',
    '{"type":"campaign_sunday","threshold":1}'::jsonb, 'uncommon', 'time', 0),
  ('rainy-day-coffee', 'Rainy Day Coffee', 'Complete a campaign on a rainy day.',
    '{"type":"campaign_rainy","threshold":1}'::jsonb, 'rare', 'time', 0),
  ('allach-explorer', 'Allach Explorer', 'Complete a campaign in Allach.',
    '{"type":"neighborhood_completed","value":"Allach","threshold":1}'::jsonb, 'uncommon', 'location', 0),
  ('munich-coffee-trail', 'Munich Coffee Trail', 'Redeem rewards in 3 different Munich districts.',
    '{"type":"munich_districts","threshold":3}'::jsonb, 'epic', 'location', 0),
  ('early-bird', 'Early Bird', 'Complete a campaign before 10:00.',
    '{"type":"campaign_before_hour","hour":10,"threshold":1}'::jsonb, 'uncommon', 'time', 0),
  ('night-owl', 'Night Owl', 'Complete a campaign after 18:00.',
    '{"type":"campaign_after_hour","hour":18,"threshold":1}'::jsonb, 'uncommon', 'time', 0),
  ('social-spark', 'Social Spark', 'Get 10 social posts approved.',
    '{"type":"social_posts","threshold":10}'::jsonb, 'rare', 'social', 0),
  ('eeffoc-friend', 'EEFFOC Friend', 'Gift a reward to a friend.',
    '{"type":"gifts_sent","threshold":1}'::jsonb, 'uncommon', 'social', 0),
  ('eeffoc-legend', 'EEFFOC Legend', 'Complete 50 campaigns.',
    '{"type":"campaigns_completed","threshold":50}'::jsonb, 'legendary', 'campaign', 0)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  criteria = EXCLUDED.criteria,
  rarity = EXCLUDED.rarity,
  category = EXCLUDED.category;

-- Keep legacy badges updated
UPDATE public.badges SET rarity = 'common', category = 'check_ins' WHERE slug = 'first-sip' AND criteria->>'type' = 'check_ins';
UPDATE public.badges SET rarity = 'uncommon' WHERE slug IN ('coffee-curious', 'cappuccino-collector');
UPDATE public.badges SET rarity = 'rare' WHERE slug IN ('espresso-explorer', 'matcha-hunter', 'ice-cream-explorer');
UPDATE public.badges SET rarity = 'epic' WHERE slug IN ('cafe-connoisseur', 'munich-explorer', 'berlin-explorer');
UPDATE public.badges SET rarity = 'legendary' WHERE slug = 'european-coffee-legend';

-- ── Build completion context on counter redeem ──
CREATE OR REPLACE FUNCTION public.build_redemption_completion_context(
  _explorer_id uuid,
  _shop_id uuid
)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'hour', EXTRACT(HOUR FROM now() AT TIME ZONE 'Europe/Berlin')::int,
    'dow', EXTRACT(DOW FROM now() AT TIME ZONE 'Europe/Berlin')::int,
    'city', s.city,
    'neighborhood', s.neighborhood,
    'weather', (
      SELECT ci.weather_tag FROM public.check_ins ci
      WHERE ci.user_id = _explorer_id AND ci.coffee_shop_id = _shop_id
      ORDER BY ci.created_at DESC LIMIT 1
    )
  )
  FROM public.coffee_shops s
  WHERE s.id = _shop_id;
$$;

-- Patch verify_redemption_code: context + badge evaluation
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
  _shop_id uuid;
  _new_badges jsonb;
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
    'kind', 'campaign'
  );
END;
$function$;

-- Social approval → evaluate badges
CREATE OR REPLACE FUNCTION public._approve_social_submission_internal(
  _submission_id uuid,
  _notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sub record;
  _c record;
  _new_code text;
  _existing_redemption record;
  _points int := 0;
  _check_ins int;
  _partner uuid;
  _expires timestamptz;
  _campaign_xp int;
  _new_badges jsonb;
BEGIN
  SELECT ss.*, s.partner_id, s.name AS shop_name INTO _sub
  FROM public.social_submissions ss
  JOIN public.coffee_shops s ON s.id = ss.coffee_shop_id
  WHERE ss.id = _submission_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found'; END IF;
  IF _sub.status <> 'pending' THEN RAISE EXCEPTION 'Already reviewed'; END IF;

  _partner := _sub.partner_id;
  SELECT * INTO _c FROM public.campaigns WHERE id = _sub.campaign_id;

  IF COALESCE(_c.fulfillment_mode, 'check_in') = 'hybrid' THEN
    SELECT COUNT(*) INTO _check_ins FROM public.check_ins
    WHERE user_id = _sub.user_id AND coffee_shop_id = _c.coffee_shop_id;
    IF _check_ins < GREATEST(COALESCE(_c.required_check_ins, 1), 1) THEN
      RAISE EXCEPTION 'Explorer must check in before social approval';
    END IF;
  END IF;

  INSERT INTO public.campaign_participants(campaign_id, user_id)
  VALUES (_sub.campaign_id, _sub.user_id) ON CONFLICT DO NOTHING;
  _points := COALESCE(_c.points_reward, 0);

  SELECT * INTO _existing_redemption FROM public.campaign_redemptions
  WHERE campaign_id = _sub.campaign_id AND user_id = _sub.user_id;

  IF _existing_redemption.id IS NULL THEN
    PERFORM public._reserve_campaign_reward_slot(_sub.campaign_id);
    _expires := public.compute_reward_expires_at(_c.ends_at, _c.reward_validity_days);
    INSERT INTO public.campaign_redemptions(campaign_id, user_id, points_awarded, expires_at, reward_status)
      VALUES (_sub.campaign_id, _sub.user_id, _points, _expires, 'unlocked')
      RETURNING redemption_code INTO _new_code;
    _campaign_xp := GREATEST(_points, (SELECT xp_amount FROM public.xp_config WHERE event_key = 'campaign_complete'));
    PERFORM public.award_xp(_sub.user_id, 'campaign_complete', _sub.campaign_id::text, _sub.campaign_id, 'campaigns',
      jsonb_build_object('campaign_title', _c.title, 'via', 'social_submission'), _campaign_xp);
  ELSE
    _new_code := _existing_redemption.redemption_code;
  END IF;

  PERFORM public.award_xp(_sub.user_id, 'social_post', _submission_id::text, _submission_id, 'social_submissions',
    jsonb_build_object('platform', _sub.platform, 'campaign_id', _sub.campaign_id), NULL);

  UPDATE public.social_submissions
  SET status = 'approved', reviewed_by = _partner, reviewed_at = now(),
      review_notes = _notes, points_awarded = _points + 25, redemption_code = _new_code
  WHERE id = _submission_id;

  _new_badges := public.evaluate_user_badges(_sub.user_id, jsonb_build_object('source', 'social_approved'));

  INSERT INTO public.notifications(user_id, type, title, body, link, payload) VALUES (
    _sub.user_id, 'submission_approved', 'Social proof approved!',
    'Your reward for "' || _c.title || '" is unlocked. Show your QR at the counter.',
    '/campaign/' || _sub.campaign_id::text, jsonb_build_object('submission_id', _submission_id, 'code', _new_code));

  RETURN jsonb_build_object(
    'status', 'approved',
    'redemption_code', _new_code,
    'points_awarded', _points + 25,
    'new_badges', _new_badges,
    'expires_at', (SELECT expires_at FROM public.campaign_redemptions WHERE campaign_id = _sub.campaign_id AND user_id = _sub.user_id)
  );
END;
$$;

-- Gift → evaluate badges
CREATE OR REPLACE FUNCTION public.send_gift_credit(_recipient_id uuid, _message text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _user uuid := auth.uid();
  _gift public.gift_credits%ROWTYPE;
  _cost int := 100;
  _new_badges jsonb;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _recipient_id = _user THEN RAISE EXCEPTION 'Cannot gift yourself'; END IF;
  PERFORM public.award_points(_user, -_cost, 'catalog_redemption', NULL, NULL, jsonb_build_object('gift', true));
  INSERT INTO public.gift_credits (sender_id, recipient_id, message, points_value)
  VALUES (_user, _recipient_id, _message, _cost)
  RETURNING * INTO _gift;
  PERFORM public.award_xp(_user, 'gift_sent', _gift.id::text, _gift.id, 'gift_credits',
    jsonb_build_object('recipient_id', _recipient_id), NULL);
  _new_badges := public.evaluate_user_badges(_user, jsonb_build_object('source', 'gift_sent'));
  INSERT INTO public.notifications(user_id, type, title, body, link, payload) VALUES (
    _recipient_id, 'gift_received',
    'You received a coffee gift!',
    COALESCE(_message, 'A friend sent you a free coffee. Redeem with code ' || _gift.redemption_code),
    '/wallet',
    jsonb_build_object('gift_id', _gift.id, 'code', _gift.redemption_code)
  );
  RETURN jsonb_build_object('gift_id', _gift.id, 'code', _gift.redemption_code, 'new_badges', _new_badges);
END;
$$;

-- perform_check_in: delegate badges to evaluate_user_badges
CREATE OR REPLACE FUNCTION public.perform_check_in(
  _shop_id uuid,
  _campaign_id uuid DEFAULT NULL,
  _latitude double precision DEFAULT NULL,
  _longitude double precision DEFAULT NULL,
  _beverage_tag text DEFAULT NULL,
  _weather_tag text DEFAULT NULL
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
  _campaign_progress jsonb := NULL;
  _c record;
  _shop_lat double precision;
  _shop_lon double precision;
  _distance_m double precision;
  _recent_attempts int;
  _check_status text := 'redeemed';
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
    IF NOT FOUND THEN
      _campaign_id := NULL;
    ELSIF _c.fulfillment_mode IN ('social_proof', 'hybrid') THEN
      _check_status := 'social_pending';
    END IF;
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

  INSERT INTO public.check_ins (
    user_id, coffee_shop_id, points_awarded, verified, campaign_id, beverage_tag,
    check_in_status, location_confirmed, latitude, longitude, weather_tag
  )
  VALUES (
    _user, _shop_id, _points, true, _campaign_id, NULLIF(trim(_beverage_tag), ''),
    _check_status, true, _latitude, _longitude, NULLIF(trim(_weather_tag), '')
  )
  RETURNING id INTO _check_in_id;

  PERFORM public.award_xp(_user, 'check_in', _check_in_id::text, _check_in_id, 'check_ins', jsonb_build_object(
    'shop_id', _shop_id,
    'multiplier', _multiplier,
    'bonus', _bonus_label,
    'beverage_tag', _beverage_tag
  ), _points);

  UPDATE public.profiles
     SET total_check_ins = COALESCE(total_check_ins, 0) + 1
   WHERE id = _user;

  PERFORM public.record_crawl_stop(_user, _shop_id);

  SELECT total_check_ins INTO _total_check_ins FROM public.profiles WHERE id = _user;
  SELECT COUNT(DISTINCT coffee_shop_id) INTO _unique_shops FROM public.check_ins WHERE user_id = _user;

  _new_badges := public.evaluate_user_badges(_user, jsonb_build_object(
    'source', 'check_in',
    'shop_id', _shop_id,
    'weather', NULLIF(trim(_weather_tag), '')
  ));

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
    'beverage_tag', _beverage_tag,
    'check_in_status', _check_status
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.perform_check_in(uuid, uuid, double precision, double precision, text, text) TO authenticated;
