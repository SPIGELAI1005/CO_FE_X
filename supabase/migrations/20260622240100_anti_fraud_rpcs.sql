-- Anti-fraud RPC hardening (privacy-conscious location, limits, audit)

-- ── perform_check_in: optional location when privacy disables sharing ──
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
  _shops_1h int;
  _check_status text := 'redeemed';
  _share_location boolean;
  _store_lat double precision;
  _store_lon double precision;
  _location_confirmed boolean := false;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM public._assert_user_not_restricted(_user);

  SELECT COUNT(*) INTO _recent_attempts
  FROM public.check_ins
  WHERE user_id = _user AND created_at > now() - interval '1 hour';

  IF _recent_attempts >= 20 THEN
    PERFORM public.log_fraud_event('check_in_rate_limit', 'warn', _user, NULL, _shop_id, _campaign_id, '{}'::jsonb);
    RAISE EXCEPTION 'Too many check-in attempts. Try again in an hour.';
  END IF;

  _share_location := public._user_shares_location(_user);

  IF _share_location THEN
    IF _latitude IS NULL OR _longitude IS NULL THEN
      RAISE EXCEPTION 'Location required — enable GPS or allow location sharing in profile privacy settings';
    END IF;
    _store_lat := _latitude;
    _store_lon := _longitude;
  ELSE
    _store_lat := NULL;
    _store_lon := NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.coffee_shops WHERE id = _shop_id AND status = 'approved') THEN
    RAISE EXCEPTION 'Coffee shop not available';
  END IF;

  IF _share_location THEN
    SELECT latitude, longitude INTO _shop_lat, _shop_lon
    FROM public.coffee_shops WHERE id = _shop_id;

    IF _shop_lat IS NULL OR _shop_lon IS NULL THEN
      RAISE EXCEPTION 'This café has no location on file yet';
    END IF;

    _distance_m := public.haversine_metres(_latitude, _longitude, _shop_lat, _shop_lon);
    IF _distance_m > 200 THEN
      PERFORM public.log_fraud_event(
        'check_in_distance_fail', 'warn', _user, NULL, _shop_id, _campaign_id,
        jsonb_build_object('distance_m', round(_distance_m))
      );
      RAISE EXCEPTION 'You must be within 200 m of the café to check in (currently ~%s m away)', round(_distance_m)::text;
    END IF;
    _location_confirmed := true;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.check_ins
    WHERE user_id = _user AND coffee_shop_id = _shop_id
      AND created_at > now() - interval '24 hours'
  ) THEN
    RAISE EXCEPTION 'You already checked in here in the last 24h';
  END IF;

  SELECT COUNT(DISTINCT coffee_shop_id) INTO _shops_1h
  FROM public.check_ins
  WHERE user_id = _user AND created_at > now() - interval '1 hour';

  IF _shops_1h >= 5 THEN
    PERFORM public.log_fraud_event(
      'rapid_multi_shop_checkins', 'warn', _user, NULL, _shop_id, _campaign_id,
      jsonb_build_object('shops_last_hour', _shops_1h + 1)
    );
  END IF;

  IF _campaign_id IS NOT NULL THEN
    SELECT * INTO _c FROM public.campaigns WHERE id = _campaign_id AND coffee_shop_id = _shop_id;
    IF NOT FOUND OR NOT public._campaign_is_live(_c) THEN
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
    _user, _shop_id, _points, _location_confirmed, _campaign_id, NULLIF(trim(_beverage_tag), ''),
    _check_status, _location_confirmed, _store_lat, _store_lon, NULLIF(trim(_weather_tag), '')
  )
  RETURNING id INTO _check_in_id;

  PERFORM public.award_xp(_user, 'check_in', _check_in_id::text, _check_in_id, 'check_ins', jsonb_build_object(
    'shop_id', _shop_id,
    'multiplier', _multiplier,
    'bonus', _bonus_label,
    'beverage_tag', _beverage_tag,
    'location_confirmed', _location_confirmed
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
    'distance_metres', CASE WHEN _location_confirmed THEN round(_distance_m) ELSE NULL END,
    'beverage_tag', _beverage_tag,
    'check_in_status', _check_status,
    'location_confirmed', _location_confirmed
  );
END;
$function$;

-- ── join_campaign: live window + trust ──
CREATE OR REPLACE FUNCTION public.join_campaign(
  _campaign_id uuid,
  _join_source text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _c record;
  _count int;
  _explorer_name text;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM public._assert_user_not_restricted(_user);

  SELECT c.*, s.partner_id AS partner_id, s.name AS shop_name INTO _c
  FROM public.campaigns c JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
  WHERE c.id = _campaign_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Campaign not found'; END IF;

  IF NOT public._campaign_is_live(_c) THEN
    RAISE EXCEPTION 'Campaign not available';
  END IF;

  IF _c.available_quantity IS NOT NULL AND _c.available_quantity <= 0 AND NOT EXISTS (
    SELECT 1 FROM public.campaign_participants WHERE campaign_id = _campaign_id AND user_id = _user
  ) THEN
    RAISE EXCEPTION 'All rewards for this campaign have been claimed';
  END IF;

  IF _c.max_participants IS NOT NULL THEN
    SELECT COUNT(*) INTO _count FROM public.campaign_participants WHERE campaign_id = _campaign_id;
    IF _count >= _c.max_participants AND NOT EXISTS (
      SELECT 1 FROM public.campaign_participants WHERE campaign_id = _campaign_id AND user_id = _user
    ) THEN RAISE EXCEPTION 'This campaign is full'; END IF;
  END IF;

  INSERT INTO public.campaign_participants (campaign_id, user_id, joined_source)
  VALUES (_campaign_id, _user, NULLIF(trim(_join_source), ''))
  ON CONFLICT (campaign_id, user_id) DO UPDATE
    SET joined_source = COALESCE(EXCLUDED.joined_source, campaign_participants.joined_source);

  SELECT display_name INTO _explorer_name FROM public.profiles WHERE id = _user;

  IF NOT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = _user AND type = 'campaign_joined'
      AND payload->>'campaign_id' = _campaign_id::text
      AND created_at > now() - interval '1 minute'
  ) THEN
    IF _c.partner_id IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, type, title, body, link, payload) VALUES (
        _c.partner_id, 'campaign_join',
        'New campaign participant',
        COALESCE(_explorer_name,'Someone') || ' joined "' || _c.title || '"',
        '/partner/analytics',
        jsonb_build_object('campaign_id', _campaign_id, 'explorer_id', _user, 'source', _join_source)
      );
    END IF;
    INSERT INTO public.notifications(user_id, type, title, body, link, payload) VALUES (
      _user, 'campaign_joined',
      'You joined ' || _c.title,
      CASE _c.fulfillment_mode
        WHEN 'social_proof' THEN 'Create your post and submit proof to unlock your free reward.'
        WHEN 'hybrid' THEN 'Check in at ' || _c.shop_name || ', then post on social to unlock your reward.'
        ELSE 'Visit ' || _c.shop_name || ' and check in to qualify for the reward.'
      END,
      '/campaign/' || _campaign_id::text,
      jsonb_build_object('campaign_id', _campaign_id, 'source', _join_source)
    );
  END IF;

  RETURN jsonb_build_object('joined', true, 'campaign_id', _campaign_id, 'fulfillment_mode', _c.fulfillment_mode);
END;
$$;

-- ── redeem_campaign: limits + duplicate guard ──
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
  _existing record;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM public._assert_user_not_restricted(_user);

  SELECT c.*, s.partner_id, s.name AS shop_name INTO _c
  FROM public.campaigns c JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
  WHERE c.id = _campaign_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Campaign not found'; END IF;

  IF NOT public._campaign_is_live(_c) THEN
    RAISE EXCEPTION 'Campaign not available';
  END IF;

  PERFORM public._check_daily_redemption_limit(_campaign_id);

  SELECT * INTO _existing FROM public.campaign_redemptions
  WHERE campaign_id = _campaign_id AND user_id = _user
  ORDER BY redeemed_at DESC LIMIT 1;

  IF FOUND THEN
    IF NOT COALESCE(_c.allow_multiple_redemptions, false) THEN
      RETURN jsonb_build_object(
        'already_redeemed', true,
        'redemption_code', _existing.redemption_code,
        'points_awarded', _existing.points_awarded,
        'expires_at', _existing.expires_at,
        'reward_status', _existing.reward_status
      );
    END IF;
    IF _existing.used_at IS NULL AND _existing.reward_status IN ('unlocked', 'locked') THEN
      RAISE EXCEPTION 'You already have an unused reward for this campaign';
    END IF;
  END IF;

  IF COALESCE(_c.fulfillment_mode, 'check_in') = 'social_proof' THEN
    RAISE EXCEPTION 'This campaign unlocks via social post approval — submit your proof and wait for café review';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.campaign_participants WHERE campaign_id = _campaign_id AND user_id = _user) THEN
    RAISE EXCEPTION 'Join the campaign first';
  END IF;

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

-- ── submit_social_proof: duplicate URL detection ──
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
  _norm_url text;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM public._assert_user_not_restricted(_user);

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
  WHERE c.id = _campaign_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Campaign not found'; END IF;

  IF NOT public._campaign_is_live(_c) THEN
    RAISE EXCEPTION 'Campaign not available';
  END IF;

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

  IF _submission_type = 'link' THEN
    _norm_url := lower(regexp_replace(trim(_url), '[?#].*$', ''));
    IF EXISTS (
      SELECT 1 FROM public.social_submissions ss
      WHERE ss.url IS NOT NULL
        AND lower(regexp_replace(trim(ss.url), '[?#].*$', '')) = _norm_url
        AND ss.user_id <> _user
        AND ss.status IN ('pending', 'approved')
    ) THEN
      PERFORM public.log_fraud_event(
        'duplicate_social_url', 'high', _user, NULL, _c.shop_id, _campaign_id,
        jsonb_build_object('url', _norm_url)
      );
      RAISE EXCEPTION 'This post URL was already submitted by another explorer';
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

-- ── review_social_submission: audit trail on reject ──
CREATE OR REPLACE FUNCTION public.review_social_submission(_submission_id uuid, _decision text, _notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _partner uuid := auth.uid();
  _sub record;
  _c record;
BEGIN
  IF _partner IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _decision NOT IN ('approved', 'rejected') THEN RAISE EXCEPTION 'Invalid decision'; END IF;
  SELECT ss.*, s.partner_id INTO _sub
  FROM public.social_submissions ss
  JOIN public.coffee_shops s ON s.id = ss.coffee_shop_id
  WHERE ss.id = _submission_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found'; END IF;
  IF _sub.partner_id <> _partner THEN RAISE EXCEPTION 'Not your shop'; END IF;
  IF _sub.status <> 'pending' THEN RAISE EXCEPTION 'Already reviewed'; END IF;

  SELECT * INTO _c FROM public.campaigns WHERE id = _sub.campaign_id;

  IF _decision = 'rejected' THEN
    UPDATE public.social_submissions SET status = 'rejected', reviewed_by = _partner, reviewed_at = now(), review_notes = _notes
    WHERE id = _submission_id;

    PERFORM public.log_fraud_event(
      'social_proof_rejected', 'info', _sub.user_id, _partner, _sub.coffee_shop_id, _sub.campaign_id,
      jsonb_build_object('submission_id', _submission_id, 'notes', _notes)
    );

    INSERT INTO public.notifications(user_id, type, title, body, link, payload) VALUES (
      _sub.user_id, 'submission_rejected', 'Submission needs another try',
      'Your post for "' || _c.title || '" wasn''t approved.' || COALESCE(' ' || _notes, ''),
      '/campaign/' || _sub.campaign_id::text, jsonb_build_object('submission_id', _submission_id));
    RETURN jsonb_build_object('status', 'rejected');
  END IF;

  RETURN public._approve_social_submission_internal(_submission_id, _notes);
END;
$$;

-- ── verify_redemption_code: explorer audit + repeated failure detection ──
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
  _failed_explorer int;
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
         c.status AS campaign_status, c.coffee_shop_id,
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
    INSERT INTO public.redemption_verifications(partner_id, code, result, ip, explorer_id)
      VALUES (_partner, _code, _result, _ip, _cat.user_id);
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
    INSERT INTO public.redemption_verifications(partner_id, campaign_id, redemption_id, code, result, ip, explorer_id)
      VALUES (_partner, _r.campaign_id, _r.redemption_id, _code, 'not_yours', _ip, _r.explorer_id);
    PERFORM public.log_fraud_event(
      'verify_wrong_shop', 'warn', _r.explorer_id, _partner, _r.coffee_shop_id, _r.campaign_id,
      jsonb_build_object('code', _code)
    );
    RETURN jsonb_build_object(
      'result', 'not_yours',
      'redemption_code', _code,
      'campaign_title', _r.campaign_title,
      'shop_name', _r.shop_name,
      'kind', 'campaign'
    );
  END IF;

  IF public._reward_gift_is_pending(_r.redemption_id) THEN
    INSERT INTO public.redemption_verifications(partner_id, campaign_id, redemption_id, code, result, ip, explorer_id)
      VALUES (_partner, _r.campaign_id, _r.redemption_id, _code, 'gift_pending', _ip, _r.explorer_id);
    RETURN jsonb_build_object(
      'result', 'gift_pending',
      'redemption_code', _code,
      'campaign_title', _r.campaign_title,
      'shop_name', _r.shop_name,
      'kind', 'campaign'
    );
  END IF;

  _campaign_ended := (_r.expires_at IS NOT NULL AND _r.expires_at < now())
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
      PERFORM public.log_fraud_event(
        'verify_invalid_token', 'warn', _r.explorer_id, _partner, _r.coffee_shop_id, _r.campaign_id,
        jsonb_build_object('code', _code)
      );
    ELSE
      _ctx := public.build_redemption_completion_context(_r.explorer_id, _r.coffee_shop_id);
      UPDATE public.campaign_redemptions
      SET used_at = now(), reward_status = 'redeemed', completion_context = _ctx
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
    SET used_at = now(), reward_status = 'redeemed', completion_context = _ctx
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

  INSERT INTO public.redemption_verifications(partner_id, campaign_id, redemption_id, code, result, ip, explorer_id)
    VALUES (_partner, _r.campaign_id, _r.redemption_id, _code, _result, _ip, _r.explorer_id);

  IF _result IN ('already_used', 'invalid_token', 'not_yours') THEN
    SELECT COUNT(*) INTO _failed_explorer
    FROM public.redemption_verifications
    WHERE explorer_id = _r.explorer_id AND result NOT IN ('ok', 'rate_limited')
      AND verified_at > now() - interval '24 hours';
    IF _failed_explorer >= 5 THEN
      PERFORM public.log_fraud_event(
        'repeated_failed_verifications', 'high', _r.explorer_id, _partner, _r.coffee_shop_id, _r.campaign_id,
        jsonb_build_object('count_24h', _failed_explorer)
      );
    END IF;
  END IF;

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
