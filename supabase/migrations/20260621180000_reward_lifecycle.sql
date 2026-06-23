-- Reward lifecycle: expiry on unlock, quantity enforcement, structured verify results.

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS reward_validity_days integer NOT NULL DEFAULT 7;

COMMENT ON COLUMN public.campaigns.reward_validity_days IS
  'Days after unlock before reward code expires (capped by campaign ends_at).';

CREATE OR REPLACE FUNCTION public.compute_reward_expires_at(
  _ends_at timestamptz,
  _validity_days integer DEFAULT 7
)
RETURNS timestamptz
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _ends_at IS NOT NULL AND _ends_at < now() + make_interval(days => GREATEST(COALESCE(_validity_days, 7), 1))
      THEN _ends_at
    ELSE now() + make_interval(days => GREATEST(COALESCE(_validity_days, 7), 1))
  END;
$$;

-- Reserve one reward slot and return updated quantity (NULL = unlimited).
CREATE OR REPLACE FUNCTION public._reserve_campaign_reward_slot(_campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _qty int;
BEGIN
  SELECT available_quantity INTO _qty FROM public.campaigns WHERE id = _campaign_id FOR UPDATE;
  IF _qty IS NOT NULL AND _qty <= 0 THEN
    RAISE EXCEPTION 'All rewards for this campaign have been claimed';
  END IF;
  IF _qty IS NOT NULL THEN
    UPDATE public.campaigns SET available_quantity = _qty - 1 WHERE id = _campaign_id;
  END IF;
END;
$$;

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
    IF _points > 0 THEN
      PERFORM public.award_points(_sub.user_id, _points, 'campaign_redemption', _sub.campaign_id, 'campaign_redemptions',
        jsonb_build_object('campaign_title', _c.title, 'via', 'social_submission'));
    END IF;
  ELSE
    _new_code := _existing_redemption.redemption_code;
  END IF;

  PERFORM public.award_points(_sub.user_id, 25, 'social_post', _submission_id, 'social_submissions',
    jsonb_build_object('platform', _sub.platform, 'campaign_id', _sub.campaign_id));

  UPDATE public.social_submissions
  SET status = 'approved', reviewed_by = _partner, reviewed_at = now(),
      review_notes = _notes, points_awarded = _points + 25, redemption_code = _new_code
  WHERE id = _submission_id;

  INSERT INTO public.notifications(user_id, type, title, body, link, payload) VALUES (
    _sub.user_id, 'submission_approved', 'Social proof approved! +' || (_points + 25) || ' pts',
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

CREATE OR REPLACE FUNCTION public.redeem_campaign(_campaign_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _c record;
  _qualifying int;
  _existing public.campaign_redemptions%ROWTYPE;
  _new_code text;
  _explorer_name text;
  _approved_social boolean;
  _expires timestamptz;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT c.*, s.partner_id AS partner_id, s.name AS shop_name INTO _c
  FROM public.campaigns c JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
  WHERE c.id = _campaign_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Campaign not found'; END IF;

  IF _c.ends_at IS NOT NULL AND _c.ends_at < now() THEN
    RAISE EXCEPTION 'Campaign has ended';
  END IF;

  IF COALESCE(_c.fulfillment_mode, 'check_in') = 'social_proof' THEN
    RAISE EXCEPTION 'This campaign unlocks via social post approval — submit your proof and wait for café review';
  END IF;

  SELECT * INTO _existing FROM public.campaign_redemptions WHERE campaign_id = _campaign_id AND user_id = _user;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'already_redeemed', true,
      'redemption_code', _existing.redemption_code,
      'points_awarded', _existing.points_awarded,
      'expires_at', _existing.expires_at,
      'reward_status', _existing.reward_status
    );
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

  IF COALESCE(_c.points_reward, 0) > 0 THEN
    PERFORM public.award_points(_user, _c.points_reward, 'campaign_redemption', _campaign_id, 'campaign_redemptions',
      jsonb_build_object('campaign_title', _c.title));
  END IF;

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
  SELECT c.*, s.partner_id AS partner_id, s.name AS shop_name INTO _c
  FROM public.campaigns c JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
  WHERE c.id = _campaign_id AND c.status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Campaign not available'; END IF;
  IF _c.ends_at IS NOT NULL AND _c.ends_at < now() THEN RAISE EXCEPTION 'Campaign has ended'; END IF;

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

-- Backfill expiry for existing unlocked codes
UPDATE public.campaign_redemptions cr
SET expires_at = public.compute_reward_expires_at(c.ends_at, COALESCE(c.reward_validity_days, 7))
FROM public.campaigns c
WHERE cr.campaign_id = c.id
  AND cr.expires_at IS NULL
  AND cr.used_at IS NULL;

GRANT EXECUTE ON FUNCTION public.compute_reward_expires_at(timestamptz, integer) TO authenticated;
REVOKE ALL ON FUNCTION public._reserve_campaign_reward_slot(uuid) FROM PUBLIC, anon, authenticated;
