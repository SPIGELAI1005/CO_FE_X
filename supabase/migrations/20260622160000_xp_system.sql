-- Centralized XP system: configurable events, deduplication, 10 explorer levels.

-- ── Config ──
CREATE TABLE IF NOT EXISTS public.xp_config (
  event_key text PRIMARY KEY,
  xp_amount integer NOT NULL DEFAULT 0,
  label text NOT NULL,
  description text,
  enabled boolean NOT NULL DEFAULT true,
  sort_order smallint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.xp_config (event_key, xp_amount, label, description, sort_order) VALUES
  ('check_in', 10, 'Check-in', 'Base XP per café check-in (time bonuses apply as override)', 1),
  ('first_check_in', 25, 'First sip', 'First check-in ever', 2),
  ('new_cafe', 15, 'New café', 'First visit to a café', 3),
  ('new_neighborhood', 20, 'New neighborhood', 'First check-in in a city', 4),
  ('campaign_complete', 50, 'Campaign complete', 'Unlock campaign reward', 5),
  ('reward_redeemed', 30, 'Reward redeemed', 'Redeem reward at counter', 6),
  ('proof_posted', 10, 'Proof posted', 'Submit social proof', 7),
  ('social_post', 25, 'Social approved', 'Partner approved your post', 8),
  ('trail_complete', 75, 'Trail complete', 'Finish a coffee crawl (override per trail)', 9),
  ('badge_unlock', 40, 'Badge unlocked', 'Earn a new badge', 10),
  ('friend_invite', 100, 'Friend invited', 'Someone joined with your code', 11),
  ('friend_joined', 50, 'Joined via invite', 'Used a friend referral code', 12),
  ('gift_sent', 15, 'Gift sent', 'Gift a reward to a friend', 13),
  ('review', 5, 'Review', 'Write a café review', 14),
  ('challenge_reward', 50, 'Challenge', 'Claim an explorer challenge', 15)
ON CONFLICT (event_key) DO NOTHING;

ALTER TABLE public.xp_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "xp config readable" ON public.xp_config;
CREATE POLICY "xp config readable" ON public.xp_config FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.xp_config TO authenticated;
GRANT ALL ON public.xp_config TO service_role;

-- ── Deduplication log ──
CREATE TABLE IF NOT EXISTS public.xp_award_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_key text NOT NULL REFERENCES public.xp_config(event_key),
  dedupe_key text NOT NULL,
  ref_id uuid,
  ref_table text,
  xp_awarded integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_key, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_xp_award_log_user_created
  ON public.xp_award_log (user_id, created_at DESC);

ALTER TABLE public.xp_award_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users read own xp awards" ON public.xp_award_log;
CREATE POLICY "users read own xp awards" ON public.xp_award_log
  FOR SELECT TO authenticated USING (user_id = auth.uid());
GRANT SELECT ON public.xp_award_log TO authenticated;
GRANT ALL ON public.xp_award_log TO service_role;

-- ── Core award function ──
CREATE OR REPLACE FUNCTION public.award_xp(
  _user uuid,
  _event_key text,
  _dedupe_key text,
  _ref_id uuid DEFAULT NULL,
  _ref_table text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb,
  _amount_override integer DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cfg record;
  _amount int;
  _log_id uuid;
  _balance int;
BEGIN
  IF _user IS NULL OR _dedupe_key IS NULL OR trim(_dedupe_key) = '' THEN
    SELECT total_points INTO _balance FROM public.profiles WHERE id = _user;
    RETURN COALESCE(_balance, 0);
  END IF;

  SELECT * INTO _cfg FROM public.xp_config WHERE event_key = _event_key AND enabled = true;
  IF NOT FOUND THEN
    SELECT total_points INTO _balance FROM public.profiles WHERE id = _user;
    RETURN COALESCE(_balance, 0);
  END IF;

  _amount := COALESCE(_amount_override, _cfg.xp_amount);
  IF _amount IS NULL OR _amount <= 0 THEN
    SELECT total_points INTO _balance FROM public.profiles WHERE id = _user;
    RETURN COALESCE(_balance, 0);
  END IF;

  INSERT INTO public.xp_award_log (user_id, event_key, dedupe_key, ref_id, ref_table, xp_awarded)
  VALUES (_user, _event_key, _dedupe_key, _ref_id, _ref_table, _amount)
  ON CONFLICT (user_id, event_key, dedupe_key) DO NOTHING
  RETURNING id INTO _log_id;

  IF _log_id IS NULL THEN
    SELECT total_points INTO _balance FROM public.profiles WHERE id = _user;
    RETURN COALESCE(_balance, 0);
  END IF;

  RETURN public.award_points(_user, _amount, _event_key, _ref_id, _ref_table, _metadata);
END;
$$;

REVOKE ALL ON FUNCTION public.award_xp(uuid, text, text, uuid, text, jsonb, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_xp(uuid, text, text, uuid, text, jsonb, integer) TO authenticated, service_role;

-- ── 10 explorer levels (matches src/lib/explorer-levels.ts) ──
CREATE OR REPLACE FUNCTION public.sync_explorer_level_from_points()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.explorer_level := CASE
    WHEN NEW.total_points >= 8000 THEN 'local_legend'
    WHEN NEW.total_points >= 5000 THEN 'cofex_ambassador'
    WHEN NEW.total_points >= 3200 THEN 'city_explorer'
    WHEN NEW.total_points >= 2000 THEN 'eeffoc_pro'
    WHEN NEW.total_points >= 1200 THEN 'hidden_gem_finder'
    WHEN NEW.total_points >= 700 THEN 'local_supporter'
    WHEN NEW.total_points >= 400 THEN 'matcha_hunter'
    WHEN NEW.total_points >= 200 THEN 'cappuccino_collector'
    WHEN NEW.total_points >= 75 THEN 'espresso_explorer'
    ELSE 'coffee_rookie'
  END;
  RETURN NEW;
END;
$$;

UPDATE public.profiles SET total_points = total_points;

COMMENT ON COLUMN public.profiles.explorer_level IS
  'Derived tier: coffee_rookie … local_legend (10 levels)';

-- ── Notification labels for XP events ──
CREATE OR REPLACE FUNCTION public.award_points(
  _user uuid,
  _delta integer,
  _source text,
  _ref_id uuid DEFAULT NULL::uuid,
  _ref_table text DEFAULT NULL::text,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE _new int; _expires timestamptz; _days int; _label text;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'user required'; END IF;
  UPDATE public.profiles SET total_points = COALESCE(total_points,0) + _delta
    WHERE id = _user RETURNING total_points, points_expire_days INTO _new, _days;
  IF _new IS NULL THEN RAISE EXCEPTION 'profile not found'; END IF;
  IF _new < 0 THEN
    UPDATE public.profiles SET total_points = COALESCE(total_points,0) - _delta WHERE id = _user;
    RAISE EXCEPTION 'Insufficient points';
  END IF;
  IF _delta > 0 AND _days IS NOT NULL AND _days > 0 THEN
    _expires := now() + (_days || ' days')::interval;
  END IF;
  INSERT INTO public.points_ledger(user_id, delta, balance_after, source, ref_id, ref_table, metadata, expires_at)
    VALUES (_user, _delta, _new, _source, _ref_id, _ref_table, COALESCE(_metadata,'{}'::jsonb), _expires);

  IF _delta > 0 AND _source NOT IN ('referral_bonus', 'friend_joined') THEN
    _label := CASE _source
      WHEN 'check_in' THEN 'check-in'
      WHEN 'first_check_in' THEN 'first check-in'
      WHEN 'new_cafe' THEN 'new café visit'
      WHEN 'new_neighborhood' THEN 'new neighborhood'
      WHEN 'campaign_complete' THEN 'campaign completion'
      WHEN 'campaign_redemption' THEN 'campaign reward'
      WHEN 'reward_redeemed' THEN 'reward redemption'
      WHEN 'proof_posted' THEN 'social proof'
      WHEN 'social_post' THEN 'approved social post'
      WHEN 'trail_complete' THEN 'coffee crawl'
      WHEN 'challenge_reward' THEN 'explorer challenge'
      WHEN 'badge_unlock' THEN 'badge unlock'
      WHEN 'friend_invite' THEN 'friend invite'
      WHEN 'gift_sent' THEN 'gift sent'
      WHEN 'review' THEN 'review'
      WHEN 'referral_reward' THEN 'referral'
      ELSE COALESCE((SELECT label FROM public.xp_config WHERE event_key = _source), _source)
    END;
    INSERT INTO public.notifications(user_id, type, title, body, link, payload) VALUES (
      _user, 'points_earned',
      '+' || _delta || ' XP',
      'You earned ' || _delta || ' XP from ' || _label || '. Level progress updated.',
      '/profile',
      jsonb_build_object('delta', _delta, 'balance', _new, 'source', _source, 'expires_at', _expires)
    );
  END IF;
  RETURN _new;
END;
$function$;

-- ── Check-in XP bonuses (trigger) ──
CREATE OR REPLACE FUNCTION public.explorer_xp_after_check_in()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _total int;
  _shop_city text;
BEGIN
  SELECT total_check_ins INTO _total FROM public.profiles WHERE id = NEW.user_id;

  IF COALESCE(_total, 0) = 1 THEN
    PERFORM public.award_xp(NEW.user_id, 'first_check_in', 'lifetime', NEW.id, 'check_ins',
      jsonb_build_object('shop_id', NEW.coffee_shop_id), NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.check_ins
    WHERE user_id = NEW.user_id AND coffee_shop_id = NEW.coffee_shop_id AND id <> NEW.id
  ) THEN
    PERFORM public.award_xp(NEW.user_id, 'new_cafe', NEW.coffee_shop_id::text, NEW.coffee_shop_id, 'coffee_shops',
      jsonb_build_object('shop_id', NEW.coffee_shop_id), NULL);
  END IF;

  SELECT city INTO _shop_city FROM public.coffee_shops WHERE id = NEW.coffee_shop_id;
  IF _shop_city IS NOT NULL AND trim(_shop_city) <> '' AND NOT EXISTS (
    SELECT 1 FROM public.check_ins ci
    JOIN public.coffee_shops s ON s.id = ci.coffee_shop_id
    WHERE ci.user_id = NEW.user_id AND ci.id <> NEW.id AND lower(s.city) = lower(_shop_city)
  ) THEN
    PERFORM public.award_xp(NEW.user_id, 'new_neighborhood', lower(trim(_shop_city)), NEW.coffee_shop_id, 'coffee_shops',
      jsonb_build_object('city', _shop_city), NULL);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_explorer_xp_after_check_in ON public.check_ins;
CREATE TRIGGER trg_explorer_xp_after_check_in
  AFTER INSERT ON public.check_ins
  FOR EACH ROW EXECUTE FUNCTION public.explorer_xp_after_check_in();

-- ── perform_check_in: use award_xp + badge XP ──
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
        PERFORM public.award_xp(_user, 'badge_unlock', _b.id::text, _b.id, 'badges',
          jsonb_build_object('slug', _b.slug, 'name', _b.name), NULL);
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

-- ── Social proof submit ──
CREATE OR REPLACE FUNCTION public.submit_social_proof(
  _campaign_id uuid,
  _platform text,
  _submission_type text,
  _url text DEFAULT NULL,
  _screenshot_path text DEFAULT NULL,
  _caption text DEFAULT NULL,
  _explorer_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _c record;
  _sub_id uuid;
  _approval jsonb;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _submission_type NOT IN ('link', 'screenshot') THEN RAISE EXCEPTION 'Invalid submission type'; END IF;
  IF _submission_type = 'link' AND (_url IS NULL OR trim(_url) = '') THEN
    RAISE EXCEPTION 'Post URL required';
  END IF;
  IF _submission_type = 'screenshot' AND (_screenshot_path IS NULL OR trim(_screenshot_path) = '') THEN
    RAISE EXCEPTION 'Screenshot required';
  END IF;

  SELECT c.*, s.id AS shop_id, s.partner_id INTO _c
  FROM public.campaigns c
  JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
  WHERE c.id = _campaign_id AND c.status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Campaign not available'; END IF;

  IF _c.fulfillment_mode NOT IN ('social_proof', 'hybrid') THEN
    RAISE EXCEPTION 'This campaign does not require social proof';
  END IF;

  IF _c.fulfillment_mode = 'hybrid' THEN
    IF (SELECT COUNT(*) FROM public.check_ins
        WHERE user_id = _user AND coffee_shop_id = _c.coffee_shop_id) <
       GREATEST(COALESCE(_c.required_check_ins, 1), 1) THEN
      RAISE EXCEPTION 'Check in at the café before submitting your post';
    END IF;
  END IF;

  INSERT INTO public.campaign_participants (campaign_id, user_id)
  VALUES (_campaign_id, _user) ON CONFLICT DO NOTHING;

  IF EXISTS (
    SELECT 1 FROM public.social_submissions
    WHERE user_id = _user AND campaign_id = _campaign_id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'You already have a submission pending review';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.social_submissions
    WHERE user_id = _user AND campaign_id = _campaign_id AND status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Your post was already approved for this campaign';
  END IF;

  INSERT INTO public.social_submissions (
    user_id, campaign_id, coffee_shop_id, platform, submission_type, url, screenshot_path, caption, explorer_note
  ) VALUES (
    _user, _campaign_id, _c.shop_id, _platform, _submission_type,
    NULLIF(trim(_url), ''), NULLIF(trim(_screenshot_path), ''), NULLIF(trim(_caption), ''),
    NULLIF(trim(_explorer_note), '')
  )
  RETURNING id INTO _sub_id;

  PERFORM public.award_xp(_user, 'proof_posted', _sub_id::text, _sub_id, 'social_submissions',
    jsonb_build_object('campaign_id', _campaign_id, 'platform', _platform), NULL);

  IF COALESCE(_c.auto_approve_social, false) THEN
    _approval := public._approve_social_submission_internal(_sub_id, 'Auto-approved');
    RETURN jsonb_build_object('submission_id', _sub_id, 'status', 'approved', 'auto_approved', true) || _approval;
  END IF;

  IF _c.partner_id IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, type, title, body, link, payload) VALUES (
      _c.partner_id,
      'social_submission',
      'New social post to review',
      'An explorer submitted proof for "' || _c.title || '"',
      '/partner/submissions',
      jsonb_build_object('submission_id', _sub_id, 'campaign_id', _campaign_id)
    );
  END IF;

  RETURN jsonb_build_object('submission_id', _sub_id, 'status', 'pending');
END;
$$;

-- ── Social approval + campaign unlock ──
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

  INSERT INTO public.notifications(user_id, type, title, body, link, payload) VALUES (
    _sub.user_id, 'submission_approved', 'Social proof approved!',
    'Your reward for "' || _c.title || '" is unlocked. Show your QR at the counter.',
    '/campaign/' || _sub.campaign_id::text, jsonb_build_object('submission_id', _submission_id, 'code', _new_code));

  RETURN jsonb_build_object(
    'status', 'approved',
    'redemption_code', _new_code,
    'points_awarded', _points + 25,
    'expires_at', (SELECT expires_at FROM public.campaign_redemptions WHERE campaign_id = _sub.campaign_id AND user_id = _sub.user_id)
  );
END;
$$;

-- ── Campaign redeem (check-in path) ──
CREATE OR REPLACE FUNCTION public.redeem_campaign(_campaign_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _c record;
  _new_code text;
  _qualifying int;
  _approved_social boolean;
  _explorer_name text;
  _expires timestamptz;
  _campaign_xp int;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT c.*, s.partner_id, s.name AS shop_name INTO _c
  FROM public.campaigns c JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
  WHERE c.id = _campaign_id AND c.status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Campaign not available'; END IF;

  SELECT COUNT(*) INTO _qualifying FROM public.check_ins
  WHERE user_id = _user AND coffee_shop_id = _c.coffee_shop_id
    AND (campaign_id = _campaign_id OR campaign_id IS NULL);
  IF _qualifying < GREATEST(COALESCE(_c.required_check_ins, 1), 1) THEN
    RAISE EXCEPTION 'You need % check-in(s) at the host café to redeem', GREATEST(COALESCE(_c.required_check_ins, 1), 1);
  END IF;

  IF COALESCE(_c.fulfillment_mode, 'check_in') = 'hybrid' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.social_submissions
      WHERE user_id = _user AND campaign_id = _campaign_id AND status = 'approved'
    ) INTO _approved_social;
    IF NOT _approved_social THEN
      RAISE EXCEPTION 'Submit and get your social post approved before redeeming';
    END IF;
  END IF;

  PERFORM public._reserve_campaign_reward_slot(_campaign_id);
  _expires := public.compute_reward_expires_at(_c.ends_at, _c.reward_validity_days);

  INSERT INTO public.campaign_redemptions (campaign_id, user_id, points_awarded, expires_at, reward_status)
    VALUES (_campaign_id, _user, COALESCE(_c.points_reward, 0), _expires, 'unlocked')
    RETURNING redemption_code INTO _new_code;

  _campaign_xp := GREATEST(COALESCE(_c.points_reward, 0), (SELECT xp_amount FROM public.xp_config WHERE event_key = 'campaign_complete'));
  PERFORM public.award_xp(_user, 'campaign_complete', _campaign_id::text, _campaign_id, 'campaigns',
    jsonb_build_object('campaign_title', _c.title), _campaign_xp);

  SELECT display_name INTO _explorer_name FROM public.profiles WHERE id = _user;
  IF _c.partner_id IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, type, title, body, link, payload) VALUES (
      _c.partner_id, 'campaign_redeemed', 'Reward unlocked at ' || _c.shop_name,
      COALESCE(_explorer_name,'An explorer') || ' unlocked "' || _c.title || '". Code ' || _new_code,
      '/partner/verify', jsonb_build_object('campaign_id', _campaign_id, 'code', _new_code, 'explorer_id', _user));
  END IF;
  INSERT INTO public.notifications(user_id, type, title, body, link, payload) VALUES (
    _user, 'reward_unlocked', 'Reward unlocked! ' || COALESCE(_c.reward_description, _c.title),
    'Show your QR code or code ' || _new_code || ' at ' || _c.shop_name,
    '/campaign/' || _campaign_id::text,
    jsonb_build_object('campaign_id', _campaign_id, 'code', _new_code, 'expires_at', _expires));

  RETURN jsonb_build_object(
    'redeemed', true,
    'redemption_code', _new_code,
    'points_awarded', COALESCE(_c.points_reward, 0),
    'expires_at', _expires,
    'reward_status', 'unlocked'
  );
END;
$$;

-- ── Counter redemption ──
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

  IF _r.used_at IS NOT NULL OR _r.reward_status = 'redeemed' THEN
    _result := 'already_used';
  ELSIF _campaign_ended THEN
    _result := 'expired';
  ELSIF _rotating_token IS NOT NULL AND trim(_rotating_token) <> '' THEN
    _expected_token := public.get_rotating_verify_token(_code);
    IF lpad(trim(_rotating_token), 6, '0') <> _expected_token THEN
      _result := 'invalid_token';
    ELSE
      UPDATE public.campaign_redemptions SET used_at = now() WHERE id = _r.redemption_id;
      PERFORM public.award_xp(_r.explorer_id, 'reward_redeemed', _r.redemption_id::text, _r.redemption_id, 'campaign_redemptions',
        jsonb_build_object('campaign_id', _r.campaign_id, 'code', _code), NULL);
      INSERT INTO public.notifications(user_id, type, title, body, link, payload) VALUES (
        _r.explorer_id, 'campaign_code_redeemed',
        'Reward redeemed at ' || _r.shop_name,
        'Your code ' || _code || ' was just used. Enjoy!',
        '/campaign/' || _r.campaign_id::text,
        jsonb_build_object('code', _code, 'campaign_id', _r.campaign_id));
      _result := 'ok';
    END IF;
  ELSE
    UPDATE public.campaign_redemptions SET used_at = now() WHERE id = _r.redemption_id;
    PERFORM public.award_xp(_r.explorer_id, 'reward_redeemed', _r.redemption_id::text, _r.redemption_id, 'campaign_redemptions',
      jsonb_build_object('campaign_id', _r.campaign_id, 'code', _code), NULL);
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
    'kind', 'campaign'
  );
END;
$function$;

-- ── Coffee crawl / trail ──
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
      PERFORM public.award_xp(_user, 'trail_complete', _crawl.id::text, _crawl.id, 'coffee_crawls',
        jsonb_build_object('title', _crawl.title), GREATEST(_crawl.reward_points, (SELECT xp_amount FROM public.xp_config WHERE event_key = 'trail_complete')));
      INSERT INTO public.notifications(user_id, type, title, body, link, payload) VALUES (
        _user, 'crawl_complete',
        'Coffee crawl complete!',
        'You finished "' || _crawl.title || '" and earned XP.',
        '/crawls',
        jsonb_build_object('crawl_id', _crawl.id)
      );
    END IF;
  END LOOP;
END;
$$;

-- ── Gift ──
CREATE OR REPLACE FUNCTION public.send_gift_credit(_recipient_id uuid, _message text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _user uuid := auth.uid();
  _gift public.gift_credits%ROWTYPE;
  _cost int := 100;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _recipient_id = _user THEN RAISE EXCEPTION 'Cannot gift yourself'; END IF;
  PERFORM public.award_points(_user, -_cost, 'catalog_redemption', NULL, NULL, jsonb_build_object('gift', true));
  INSERT INTO public.gift_credits (sender_id, recipient_id, message, points_value)
  VALUES (_user, _recipient_id, _message, _cost)
  RETURNING * INTO _gift;
  PERFORM public.award_xp(_user, 'gift_sent', _gift.id::text, _gift.id, 'gift_credits',
    jsonb_build_object('recipient_id', _recipient_id), NULL);
  INSERT INTO public.notifications(user_id, type, title, body, link, payload) VALUES (
    _recipient_id, 'gift_received',
    'You received a coffee gift!',
    COALESCE(_message, 'A friend sent you a free coffee. Redeem with code ' || _gift.redemption_code),
    '/wallet',
    jsonb_build_object('gift_id', _gift.id, 'code', _gift.redemption_code)
  );
  RETURN jsonb_build_object('gift_id', _gift.id, 'code', _gift.redemption_code);
END;
$$;

-- ── Referral ──
CREATE OR REPLACE FUNCTION public.claim_referral(_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _user uuid := auth.uid(); _ref uuid; _me_profile record;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  _code := upper(trim(_code));
  SELECT * INTO _me_profile FROM public.profiles WHERE id = _user;
  IF _me_profile.referred_by IS NOT NULL THEN RAISE EXCEPTION 'Referral already claimed'; END IF;
  SELECT id INTO _ref FROM public.profiles WHERE referral_code = _code;
  IF _ref IS NULL THEN RAISE EXCEPTION 'Invalid referral code'; END IF;
  IF _ref = _user THEN RAISE EXCEPTION 'You cannot refer yourself'; END IF;

  UPDATE public.profiles SET referred_by = _ref WHERE id = _user;
  PERFORM public.award_xp(_user, 'friend_joined', _user::text, _user, 'profiles', jsonb_build_object('role','referee'), NULL);
  PERFORM public.award_xp(_ref, 'friend_invite', _user::text, _user, 'profiles', jsonb_build_object('role','referrer'), NULL);

  INSERT INTO public.notifications(user_id, type, title, body, link, payload) VALUES (
    _ref, 'referral_used', 'Someone joined with your code!',
    'Thanks for spreading CO:FE(X).', '/profile', jsonb_build_object('referee', _user));

  RETURN jsonb_build_object('ok', true, 'awarded', (SELECT xp_amount FROM public.xp_config WHERE event_key = 'friend_joined'));
END;
$$;

-- ── Review XP ──
CREATE OR REPLACE FUNCTION public.trg_review_xp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.award_xp(NEW.user_id, 'review', NEW.id::text, NEW.id, 'reviews',
    jsonb_build_object('shop_id', NEW.coffee_shop_id), NULL);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reviews_award ON public.reviews;
DROP TRIGGER IF EXISTS trg_review_award_xp ON public.reviews;
CREATE TRIGGER trg_review_award_xp
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.trg_review_xp();

-- ── Explorer challenge claims via award_xp ──
CREATE OR REPLACE FUNCTION public.claim_explorer_challenge(_challenge_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _stats jsonb;
  _progress int;
  _target int;
  _reward int;
  _period_key text;
  _total_points int;
  _claim_id uuid;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  _stats := public.get_explorer_challenge_stats(_user);

  CASE _challenge_id
    WHEN 'weekly' THEN
      _progress := COALESCE((_stats->>'visits_this_week')::int, 0);
      _target := 5;
      _reward := 50;
      _period_key := to_char(date_trunc('week', now()), 'IYYY-"W"IW');
    WHEN 'new3' THEN
      _progress := COALESCE((_stats->>'new_shops_this_week')::int, 0);
      _target := 3;
      _reward := 75;
      _period_key := to_char(date_trunc('week', now()), 'IYYY-"W"IW');
    WHEN 'streak' THEN
      _progress := COALESCE((_stats->>'streak_days')::int, 0);
      _target := 5;
      _reward := 100;
      _period_key := 'lifetime';
    WHEN 'cities' THEN
      _progress := COALESCE((_stats->>'cities_explored')::int, 0);
      _target := 3;
      _reward := 150;
      _period_key := 'lifetime';
    ELSE
      RAISE EXCEPTION 'Unknown challenge';
  END CASE;

  IF _progress < _target THEN
    RAISE EXCEPTION 'Challenge not complete (% / %)', _progress, _target;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_challenge_claims
    WHERE user_id = _user AND challenge_id = _challenge_id AND period_key = _period_key
  ) THEN
    RAISE EXCEPTION 'Already claimed';
  END IF;

  _total_points := public.award_xp(
    _user,
    'challenge_reward',
    _challenge_id || ':' || _period_key,
    NULL,
    'user_challenge_claims',
    jsonb_build_object('challenge_id', _challenge_id, 'period_key', _period_key),
    _reward
  );

  INSERT INTO public.user_challenge_claims (user_id, challenge_id, period_key, points_awarded)
  VALUES (_user, _challenge_id, _period_key, _reward)
  RETURNING id INTO _claim_id;

  RETURN jsonb_build_object(
    'claim_id', _claim_id,
    'challenge_id', _challenge_id,
    'period_key', _period_key,
    'points_awarded', _reward,
    'total_points', _total_points
  );
END;
$$;

