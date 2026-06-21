-- CO(X) campaign & reward domain model — extends existing tables with future-ready fields.
-- Maps spec entities to: profiles, coffee_shops, campaigns, check_ins, social_submissions,
-- campaign_redemptions / catalog_redemptions, badges, points_ledger (XP).

-- ── Profiles (explorer) ──
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS explorer_level text NOT NULL DEFAULT 'rookie',
  ADD COLUMN IF NOT EXISTS total_rewards_redeemed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS privacy_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS preferred_drink_categories text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.profiles.total_points IS 'Primary XP/points balance (spec: XP)';
COMMENT ON COLUMN public.profiles.explorer_level IS 'Derived tier: rookie|seeker|hunter|master|nomad|legend';
COMMENT ON COLUMN public.profiles.preferred_drink_categories IS 'Preferred beverage categories for discovery (coffee, matcha, etc.)';

-- Sync level from total_points (matches src/lib/explorer-levels.ts)
CREATE OR REPLACE FUNCTION public.sync_explorer_level_from_points()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.explorer_level := CASE
    WHEN NEW.total_points >= 5000 THEN 'legend'
    WHEN NEW.total_points >= 1500 THEN 'nomad'
    WHEN NEW.total_points >= 500 THEN 'master'
    WHEN NEW.total_points >= 200 THEN 'hunter'
    WHEN NEW.total_points >= 50 THEN 'seeker'
    ELSE 'rookie'
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_sync_level ON public.profiles;
CREATE TRIGGER trg_profiles_sync_level
  BEFORE INSERT OR UPDATE OF total_points ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_explorer_level_from_points();

UPDATE public.profiles SET explorer_level = explorer_level;

-- Backfill preferred drinks from onboarding preferences
UPDATE public.profiles
SET preferred_drink_categories = COALESCE(
  (SELECT array_agg(x) FROM jsonb_array_elements_text(preferences->'coffee_tags') AS t(x)),
  '{}'::text[]
)
WHERE preferred_drink_categories = '{}'::text[]
  AND preferences ? 'coffee_tags';

-- ── Coffee shops (cafés) ──
ALTER TABLE public.coffee_shops
  ADD COLUMN IF NOT EXISTS opening_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.coffee_shops.partner_id IS 'Café owner (spec: owner id; app role: partner)';
COMMENT ON COLUMN public.coffee_shops.status IS 'Verification/listing status: pending|approved|rejected|suspended';
COMMENT ON COLUMN public.coffee_shops.opening_hours IS 'Weekly hours e.g. {"mon":{"open":"08:00","close":"18:00"}}';
COMMENT ON COLUMN public.coffee_shops.social_links IS 'instagram, tiktok, facebook, website URLs';

-- ── Campaigns ──
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS slogan text NOT NULL DEFAULT 'We give EEFFOC!',
  ADD COLUMN IF NOT EXISTS reward_type text NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS reward_quantity integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS available_quantity integer,
  ADD COLUMN IF NOT EXISTS hashtags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS terms_and_conditions text;

ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_reward_type_check;
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_reward_type_check
  CHECK (reward_type IN ('coffee', 'espresso', 'cappuccino', 'matcha', 'ice_cream', 'juice', 'cola', 'other'));

ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_status_check
  CHECK (status IN ('draft', 'active', 'paused', 'expired', 'completed', 'ended'));

-- Backfill hashtags from legacy single hashtag
UPDATE public.campaigns
SET hashtags = ARRAY[hashtag]
WHERE hashtag IS NOT NULL AND trim(hashtag) <> '' AND hashtags = '{}'::text[];

UPDATE public.campaigns
SET available_quantity = max_participants
WHERE available_quantity IS NULL AND max_participants IS NOT NULL;

-- ── Check-ins ──
ALTER TABLE public.check_ins
  ADD COLUMN IF NOT EXISTS check_in_status text NOT NULL DEFAULT 'started',
  ADD COLUMN IF NOT EXISTS qr_code_used text,
  ADD COLUMN IF NOT EXISTS location_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

ALTER TABLE public.check_ins DROP CONSTRAINT IF EXISTS check_ins_status_check;
ALTER TABLE public.check_ins ADD CONSTRAINT check_ins_status_check
  CHECK (check_in_status IN ('started', 'social_pending', 'reward_pending', 'redeemed', 'rejected'));

UPDATE public.check_ins
SET
  location_confirmed = verified,
  check_in_status = CASE WHEN verified THEN 'redeemed' ELSE 'started' END
WHERE check_in_status = 'started' AND verified = true;

-- ── Campaign redemptions (rewards) ──
ALTER TABLE public.campaign_redemptions
  ADD COLUMN IF NOT EXISTS reward_status text NOT NULL DEFAULT 'unlocked',
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

ALTER TABLE public.campaign_redemptions DROP CONSTRAINT IF EXISTS campaign_redemptions_status_check;
ALTER TABLE public.campaign_redemptions ADD CONSTRAINT campaign_redemptions_status_check
  CHECK (reward_status IN ('locked', 'unlocked', 'redeemed', 'expired'));

UPDATE public.campaign_redemptions
SET reward_status = CASE
  WHEN used_at IS NOT NULL THEN 'redeemed'
  WHEN expires_at IS NOT NULL AND expires_at < now() THEN 'expired'
  ELSE 'unlocked'
END;

ALTER TABLE public.catalog_redemptions
  ADD COLUMN IF NOT EXISTS reward_status text NOT NULL DEFAULT 'unlocked',
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

ALTER TABLE public.catalog_redemptions DROP CONSTRAINT IF EXISTS catalog_redemptions_status_check;
ALTER TABLE public.catalog_redemptions ADD CONSTRAINT catalog_redemptions_status_check
  CHECK (reward_status IN ('locked', 'unlocked', 'redeemed', 'expired'));

UPDATE public.catalog_redemptions
SET reward_status = CASE
  WHEN used_at IS NOT NULL THEN 'redeemed'
  WHEN expires_at IS NOT NULL AND expires_at < now() THEN 'expired'
  ELSE 'unlocked'
END;

-- Sync reward_status when used_at changes
CREATE OR REPLACE FUNCTION public.sync_redemption_reward_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.used_at IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.used_at IS NULL) THEN
    NEW.reward_status := 'redeemed';
    UPDATE public.profiles
    SET total_rewards_redeemed = total_rewards_redeemed + 1
    WHERE id = NEW.user_id;
  ELSIF NEW.expires_at IS NOT NULL AND NEW.expires_at < now() AND NEW.used_at IS NULL THEN
    NEW.reward_status := 'expired';
  ELSIF NEW.used_at IS NULL AND NEW.reward_status NOT IN ('locked', 'unlocked') THEN
    NEW.reward_status := 'unlocked';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_campaign_redemption_status ON public.campaign_redemptions;
CREATE TRIGGER trg_campaign_redemption_status
  BEFORE INSERT OR UPDATE OF used_at, expires_at ON public.campaign_redemptions
  FOR EACH ROW EXECUTE FUNCTION public.sync_redemption_reward_status();

DROP TRIGGER IF EXISTS trg_catalog_redemption_status ON public.catalog_redemptions;
CREATE TRIGGER trg_catalog_redemption_status
  BEFORE INSERT OR UPDATE OF used_at, expires_at ON public.catalog_redemptions
  FOR EACH ROW EXECUTE FUNCTION public.sync_redemption_reward_status();

-- ── Badges ──
ALTER TABLE public.badges
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS rarity text NOT NULL DEFAULT 'common';

ALTER TABLE public.badges DROP CONSTRAINT IF EXISTS badges_rarity_check;
ALTER TABLE public.badges ADD CONSTRAINT badges_rarity_check
  CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary'));

UPDATE public.badges SET category = COALESCE(criteria->>'type', 'general') WHERE category = 'general';

-- ── Views (spec aliases) ──

-- XP events (positive points_ledger entries)
CREATE OR REPLACE VIEW public.xp_events
WITH (security_invoker = true)
AS
SELECT
  id,
  user_id,
  source AS action_type,
  delta AS xp_value,
  ref_id AS related_id,
  ref_table AS related_type,
  metadata,
  created_at AS event_at
FROM public.points_ledger
WHERE delta > 0;

GRANT SELECT ON public.xp_events TO authenticated;

-- Social proofs (alias for social_submissions)
CREATE OR REPLACE VIEW public.social_proofs
WITH (security_invoker = true)
AS
SELECT
  id,
  user_id AS explorer_id,
  campaign_id,
  coffee_shop_id AS cafe_id,
  platform,
  url AS post_url,
  screenshot_path AS proof_image,
  submission_type,
  status AS verification_status,
  reviewed_by,
  reviewed_at,
  review_notes,
  points_awarded,
  redemption_code,
  created_at AS submitted_at
FROM public.social_submissions;

GRANT SELECT ON public.social_proofs TO authenticated;

-- Unified explorer rewards (campaign + wallet catalog)
CREATE OR REPLACE VIEW public.explorer_rewards
WITH (security_invoker = true)
AS
SELECT
  cr.id,
  cr.user_id AS explorer_id,
  cr.campaign_id,
  NULL::uuid AS catalog_id,
  cr.redemption_code AS reward_code,
  cr.redemption_code AS qr_value,
  cr.reward_status AS status,
  cr.points_awarded,
  cr.redeemed_at AS unlocked_at,
  cr.used_at AS redeemed_at,
  cr.expires_at,
  'campaign'::text AS source,
  c.title AS label,
  c.coffee_shop_id AS cafe_id
FROM public.campaign_redemptions cr
JOIN public.campaigns c ON c.id = cr.campaign_id
UNION ALL
SELECT
  cat.id,
  cat.user_id,
  NULL::uuid,
  cat.catalog_id,
  cat.redemption_code,
  cat.redemption_code,
  cat.reward_status,
  -cat.points_spent,
  cat.created_at,
  cat.used_at,
  cat.expires_at,
  'catalog'::text,
  rc.name,
  NULL::uuid
FROM public.catalog_redemptions cat
LEFT JOIN public.reward_catalog rc ON rc.id = cat.catalog_id;

GRANT SELECT ON public.explorer_rewards TO authenticated;

-- Café listing with campaign summary
CREATE OR REPLACE VIEW public.cafe_listings
WITH (security_invoker = true)
AS
SELECT
  s.*,
  EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.coffee_shop_id = s.id AND c.status = 'active'
      AND (c.ends_at IS NULL OR c.ends_at > now())
  ) AS has_active_campaign,
  (
    SELECT COUNT(*)::int FROM public.campaigns c
    WHERE c.coffee_shop_id = s.id AND c.status = 'active'
  ) AS active_campaign_count
FROM public.coffee_shops s;

GRANT SELECT ON public.cafe_listings TO anon, authenticated;

-- ── Patch perform_check_in to persist geo + workflow status ──
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
  _inserted int;
  _countries text[];
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
    check_in_status, location_confirmed, latitude, longitude
  )
  VALUES (
    _user, _shop_id, _points, true, _campaign_id, NULLIF(trim(_beverage_tag), ''),
    _check_status, true, _latitude, _longitude
  )
  RETURNING id INTO _check_in_id;

  PERFORM public.award_points(_user, _points, 'check_in', _check_in_id, 'check_ins', jsonb_build_object(
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
      IF _inserted > 0 THEN
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
    'beverage_tag', _beverage_tag,
    'check_in_status', _check_status
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.perform_check_in(uuid, uuid, double precision, double precision, text) TO authenticated;

-- Demo badge rarity/category refresh
UPDATE public.badges SET rarity = 'common', category = 'check_ins' WHERE slug = 'first-sip';
UPDATE public.badges SET rarity = 'uncommon', category = 'check_ins' WHERE slug IN ('coffee-curious', 'cafe-connoisseur');
UPDATE public.badges SET rarity = 'rare', category = 'tag' WHERE slug IN ('espresso-explorer', 'matcha-hunter');
UPDATE public.badges SET rarity = 'epic', category = 'city' WHERE slug LIKE '%-explorer';
UPDATE public.badges SET rarity = 'legendary', category = 'region' WHERE slug = 'european-coffee-legend';
