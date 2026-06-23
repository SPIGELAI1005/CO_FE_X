-- Gift unlocked campaign rewards to friends (transfer on accept).

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS gifting_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.campaigns.gifting_enabled IS
  'When false, explorers cannot gift rewards from this campaign.';

CREATE TABLE IF NOT EXISTS public.reward_gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  redemption_id uuid NOT NULL UNIQUE REFERENCES public.campaign_redemptions(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  gift_token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  message text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'cancelled')),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reward_gifts_sender ON public.reward_gifts (sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reward_gifts_recipient ON public.reward_gifts (recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reward_gifts_token ON public.reward_gifts (gift_token) WHERE status = 'pending';

ALTER TABLE public.reward_gifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read own reward gifts" ON public.reward_gifts;
CREATE POLICY "read own reward gifts" ON public.reward_gifts
  FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

GRANT SELECT ON public.reward_gifts TO authenticated;
GRANT ALL ON public.reward_gifts TO service_role;

CREATE OR REPLACE FUNCTION public._reward_gift_is_pending(_redemption_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.reward_gifts
    WHERE redemption_id = _redemption_id AND status = 'pending'
  );
$$;

CREATE OR REPLACE FUNCTION public.resolve_explorer_by_handle(_handle text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object('id', id, 'display_name', display_name, 'handle', handle)
  FROM public.profiles
  WHERE lower(trim(handle)) = lower(trim(regexp_replace(COALESCE(_handle, ''), '^@', '')))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_explorer_by_handle(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_reward_gift(
  _redemption_id uuid,
  _recipient_id uuid DEFAULT NULL,
  _message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _r record;
  _gift public.reward_gifts%ROWTYPE;
  _new_badges jsonb;
  _sent_today int;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _recipient_id IS NOT NULL AND _recipient_id = _user THEN
    RAISE EXCEPTION 'Cannot gift yourself';
  END IF;

  SELECT
    cr.id AS redemption_id,
    cr.user_id,
    cr.used_at,
    cr.expires_at,
    cr.reward_status,
    cr.redemption_code,
    c.id AS campaign_id,
    c.title AS campaign_title,
    c.gifting_enabled,
    c.reward_description,
    s.name AS shop_name
  INTO _r
  FROM public.campaign_redemptions cr
  JOIN public.campaigns c ON c.id = cr.campaign_id
  JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
  WHERE cr.id = _redemption_id AND cr.user_id = _user;

  IF NOT FOUND THEN RAISE EXCEPTION 'Reward not found'; END IF;
  IF _r.used_at IS NOT NULL OR _r.reward_status = 'redeemed' THEN
    RAISE EXCEPTION 'Redeemed rewards cannot be gifted';
  END IF;
  IF _r.reward_status = 'expired'
    OR (_r.expires_at IS NOT NULL AND _r.expires_at < now()) THEN
    RAISE EXCEPTION 'Expired rewards cannot be gifted';
  END IF;
  IF NOT COALESCE(_r.gifting_enabled, true) THEN
    RAISE EXCEPTION 'Gifting is disabled for this campaign';
  END IF;
  IF public._reward_gift_is_pending(_redemption_id) THEN
    RAISE EXCEPTION 'This reward already has a pending gift';
  END IF;

  SELECT COUNT(*)::int INTO _sent_today
  FROM public.reward_gifts
  WHERE sender_id = _user AND created_at > now() - interval '24 hours';

  IF _sent_today >= 10 THEN
    RAISE EXCEPTION 'Gift limit reached — try again tomorrow';
  END IF;

  IF _recipient_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _recipient_id) THEN
    RAISE EXCEPTION 'Recipient not found';
  END IF;

  INSERT INTO public.reward_gifts (redemption_id, sender_id, recipient_id, message)
  VALUES (_redemption_id, _user, _recipient_id, NULLIF(trim(_message), ''))
  RETURNING * INTO _gift;

  PERFORM public.award_xp(_user, 'gift_sent', _gift.id::text, _gift.id, 'reward_gifts',
    jsonb_build_object('campaign_id', _r.campaign_id, 'kind', 'reward_gift'), NULL);
  _new_badges := public.evaluate_user_badges(_user, jsonb_build_object('source', 'gift_sent'));

  IF _recipient_id IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, type, title, body, link, payload) VALUES (
      _recipient_id,
      'reward_gift_received',
      'You received a coffee moment!',
      COALESCE(NULLIF(trim(_message), ''), 'A friend gifted you a campaign reward.'),
      '/gift/' || _gift.gift_token,
      jsonb_build_object(
        'gift_id', _gift.id,
        'gift_token', _gift.gift_token,
        'campaign_title', _r.campaign_title,
        'shop_name', _r.shop_name
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'gift_id', _gift.id,
    'gift_token', _gift.gift_token,
    'status', _gift.status,
    'campaign_title', _r.campaign_title,
    'shop_name', _r.shop_name,
    'reward_description', _r.reward_description,
    'new_badges', _new_badges
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_reward_gift(uuid, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_reward_gift_preview(_gift_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _g record;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT
    g.id AS gift_id,
    g.gift_token,
    g.message,
    g.status,
    g.sender_id,
    g.recipient_id,
    g.created_at,
    g.accepted_at,
    cr.used_at,
    cr.expires_at,
    cr.reward_status,
    cr.user_id AS redemption_user_id,
    c.id AS campaign_id,
    c.title AS campaign_title,
    c.reward_description,
    c.reward_type,
    s.name AS shop_name,
    s.slug AS shop_slug,
    sp.display_name AS sender_name,
    sp.handle AS sender_handle
  INTO _g
  FROM public.reward_gifts g
  JOIN public.campaign_redemptions cr ON cr.id = g.redemption_id
  JOIN public.campaigns c ON c.id = cr.campaign_id
  JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
  LEFT JOIN public.profiles sp ON sp.id = g.sender_id
  WHERE g.gift_token = trim(_gift_token);

  IF NOT FOUND THEN RETURN NULL; END IF;

  IF _g.status = 'pending'
    AND (_g.used_at IS NOT NULL OR _g.reward_status = 'redeemed') THEN
    UPDATE public.reward_gifts SET status = 'cancelled' WHERE id = _g.gift_id;
    _g.status := 'cancelled';
  END IF;

  IF _g.status = 'pending'
    AND (_g.reward_status = 'expired' OR (_g.expires_at IS NOT NULL AND _g.expires_at < now())) THEN
    UPDATE public.reward_gifts SET status = 'cancelled' WHERE id = _g.gift_id;
    _g.status := 'cancelled';
  END IF;

  RETURN jsonb_build_object(
    'gift_id', _g.gift_id,
    'gift_token', _g.gift_token,
    'message', _g.message,
    'status', _g.status,
    'sender_id', _g.sender_id,
    'sender_name', COALESCE(_g.sender_name, 'A friend'),
    'sender_handle', _g.sender_handle,
    'recipient_id', _g.recipient_id,
    'campaign_id', _g.campaign_id,
    'campaign_title', _g.campaign_title,
    'reward_description', _g.reward_description,
    'reward_type', _g.reward_type,
    'shop_name', _g.shop_name,
    'shop_slug', _g.shop_slug,
    'expires_at', _g.expires_at,
    'can_accept',
      _g.status = 'pending'
      AND _g.sender_id <> _user
      AND (_g.recipient_id IS NULL OR _g.recipient_id = _user),
    'is_sender', _g.sender_id = _user,
    'is_recipient', _g.recipient_id = _user OR _g.redemption_user_id = _user,
    'accepted_at', _g.accepted_at,
    'created_at', _g.created_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_reward_gift_preview(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_reward_gift(_gift_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _g record;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT
    g.id AS gift_id,
    g.sender_id,
    g.recipient_id,
    g.status,
    cr.id AS redemption_id,
    cr.campaign_id,
    cr.used_at,
    cr.expires_at,
    cr.reward_status,
    c.title AS campaign_title,
    s.name AS shop_name
  INTO _g
  FROM public.reward_gifts g
  JOIN public.campaign_redemptions cr ON cr.id = g.redemption_id
  JOIN public.campaigns c ON c.id = cr.campaign_id
  JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
  WHERE g.gift_token = trim(_gift_token)
  FOR UPDATE OF g;

  IF NOT FOUND THEN RAISE EXCEPTION 'Gift not found'; END IF;
  IF _g.status <> 'pending' THEN RAISE EXCEPTION 'This gift is no longer available'; END IF;
  IF _g.sender_id = _user THEN RAISE EXCEPTION 'Cannot accept your own gift'; END IF;
  IF _g.recipient_id IS NOT NULL AND _g.recipient_id <> _user THEN
    RAISE EXCEPTION 'This gift is for someone else';
  END IF;
  IF _g.used_at IS NOT NULL OR _g.reward_status = 'redeemed' THEN
    RAISE EXCEPTION 'This reward was already redeemed';
  END IF;
  IF _g.reward_status = 'expired'
    OR (_g.expires_at IS NOT NULL AND _g.expires_at < now()) THEN
    RAISE EXCEPTION 'This reward has expired';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.campaign_redemptions
    WHERE campaign_id = _g.campaign_id AND user_id = _user
  ) THEN
    RAISE EXCEPTION 'You already have a reward for this campaign';
  END IF;

  UPDATE public.campaign_redemptions
  SET user_id = _user
  WHERE id = _g.redemption_id;

  UPDATE public.reward_gifts
  SET status = 'accepted', recipient_id = _user, accepted_at = now()
  WHERE id = _g.gift_id;

  INSERT INTO public.notifications(user_id, type, title, body, link, payload) VALUES (
    _g.sender_id,
    'reward_gift_accepted',
    'Your gift was accepted!',
    'Your friend claimed the reward for "' || _g.campaign_title || '".',
    '/campaign/' || _g.campaign_id::text,
    jsonb_build_object('gift_id', _g.gift_id, 'campaign_id', _g.campaign_id)
  );

  INSERT INTO public.notifications(user_id, type, title, body, link, payload) VALUES (
    _user,
    'reward_gift_accepted',
    'Gift accepted — enjoy!',
    'Show your QR at ' || _g.shop_name || ' when you are ready.',
    '/campaign/' || _g.campaign_id::text,
    jsonb_build_object('gift_id', _g.gift_id, 'campaign_id', _g.campaign_id)
  );

  RETURN jsonb_build_object(
    'gift_id', _g.gift_id,
    'campaign_id', _g.campaign_id,
    'campaign_title', _g.campaign_title,
    'shop_name', _g.shop_name,
    'status', 'accepted'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_reward_gift(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_reward_gift(_gift_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _user uuid := auth.uid();
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.reward_gifts
  SET status = 'cancelled'
  WHERE id = _gift_id AND sender_id = _user AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Gift not found or not cancellable'; END IF;
  RETURN jsonb_build_object('status', 'cancelled');
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_reward_gift(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_reward_gift_history()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH _user AS (SELECT auth.uid() AS id)
  SELECT jsonb_build_object(
    'sent', COALESCE((
      SELECT jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC)
      FROM (
        SELECT
          g.id,
          g.gift_token,
          g.status,
          g.message,
          g.created_at,
          g.accepted_at,
          c.title AS campaign_title,
          s.name AS shop_name,
          rp.display_name AS recipient_name,
          rp.handle AS recipient_handle
        FROM public.reward_gifts g
        JOIN public.campaign_redemptions cr ON cr.id = g.redemption_id
        JOIN public.campaigns c ON c.id = cr.campaign_id
        JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
        LEFT JOIN public.profiles rp ON rp.id = g.recipient_id
        WHERE g.sender_id = (SELECT id FROM _user)
        ORDER BY g.created_at DESC
        LIMIT 50
      ) t
    ), '[]'::jsonb),
    'received', COALESCE((
      SELECT jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC)
      FROM (
        SELECT
          g.id,
          g.gift_token,
          g.status,
          g.message,
          g.created_at,
          g.accepted_at,
          c.title AS campaign_title,
          s.name AS shop_name,
          sp.display_name AS sender_name,
          sp.handle AS sender_handle
        FROM public.reward_gifts g
        JOIN public.campaign_redemptions cr ON cr.id = g.redemption_id
        JOIN public.campaigns c ON c.id = cr.campaign_id
        JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
        JOIN public.profiles sp ON sp.id = g.sender_id
        WHERE g.recipient_id = (SELECT id FROM _user)
           OR (g.status = 'accepted' AND cr.user_id = (SELECT id FROM _user) AND g.recipient_id IS NULL)
        ORDER BY g.created_at DESC
        LIMIT 50
      ) t
    ), '[]'::jsonb)
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_reward_gift_history() TO authenticated;

-- Block café verify while a gift is pending (sender cannot redeem out from under recipient)
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

  IF public._reward_gift_is_pending(_r.redemption_id) THEN
    INSERT INTO public.redemption_verifications(partner_id, campaign_id, redemption_id, code, result, ip)
      VALUES (_partner, _r.campaign_id, _r.redemption_id, _code, 'gift_pending', _ip);
    RETURN jsonb_build_object(
      'result', 'gift_pending',
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

-- Include reward gifts in gifts_sent badge stat
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
    ) + (
      SELECT COUNT(*)::int FROM public.reward_gifts
      WHERE sender_id = _user AND status IN ('pending', 'accepted')
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
