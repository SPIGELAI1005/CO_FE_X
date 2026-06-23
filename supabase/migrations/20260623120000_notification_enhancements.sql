-- Notification enhancements: preferences, centralized notify helper, missing event types

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_preferences jsonb NOT NULL DEFAULT '{
    "in_app_enabled": true,
    "categories": {
      "campaigns": true,
      "rewards": true,
      "social": true,
      "badges": true,
      "trails": true,
      "gifts": true,
      "partner_activity": true,
      "analytics": true
    }
  }'::jsonb;

COMMENT ON COLUMN public.profiles.notification_preferences IS
  'Per-user in-app notification category toggles';

-- ── Category + preference helpers ──
CREATE OR REPLACE FUNCTION public._notification_category(_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE _type
    WHEN 'campaign_nearby' THEN 'campaigns'
    WHEN 'campaign_joined' THEN 'campaigns'
    WHEN 'campaign_join' THEN 'campaigns'
    WHEN 'campaign_expired' THEN 'campaigns'
    WHEN 'campaign_low_quantity' THEN 'campaigns'
    WHEN 'seasonal_event_started' THEN 'campaigns'
    WHEN 'spawn_nearby' THEN 'campaigns'
    WHEN 'reward_unlocked' THEN 'rewards'
    WHEN 'reward_expiring_soon' THEN 'rewards'
    WHEN 'campaign_code_redeemed' THEN 'rewards'
    WHEN 'wallet_code_redeemed' THEN 'rewards'
    WHEN 'catalog_redeemed' THEN 'rewards'
    WHEN 'campaign_redeemed' THEN 'rewards'
    WHEN 'submission_approved' THEN 'social'
    WHEN 'submission_rejected' THEN 'social'
    WHEN 'social_submission' THEN 'social'
    WHEN 'badge_unlocked' THEN 'badges'
    WHEN 'points_earned' THEN 'badges'
    WHEN 'beans_earned' THEN 'badges'
    WHEN 'trail_progress' THEN 'trails'
    WHEN 'trail_complete' THEN 'trails'
    WHEN 'trail_joined' THEN 'trails'
    WHEN 'crawl_complete' THEN 'trails'
    WHEN 'gift_received' THEN 'gifts'
    WHEN 'reward_gift_received' THEN 'gifts'
    WHEN 'reward_gift_accepted' THEN 'gifts'
    WHEN 'partner_check_in' THEN 'partner_activity'
    WHEN 'partner_reward_redeemed' THEN 'partner_activity'
    WHEN 'explorer_arriving' THEN 'partner_activity'
    WHEN 'analytics_summary' THEN 'analytics'
    ELSE 'campaigns'
  END;
$$;

CREATE OR REPLACE FUNCTION public._should_notify(_user uuid, _type text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _prefs jsonb;
  _cat text;
BEGIN
  IF _user IS NULL THEN RETURN false; END IF;
  SELECT notification_preferences INTO _prefs FROM public.profiles WHERE id = _user;
  IF COALESCE((_prefs->>'in_app_enabled')::boolean, true) = false THEN RETURN false; END IF;
  _cat := public._notification_category(_type);
  RETURN COALESCE((_prefs->'categories'->>_cat)::boolean, true);
END;
$$;

CREATE OR REPLACE FUNCTION public._notify_user(
  _user uuid,
  _type text,
  _title text,
  _body text DEFAULT NULL,
  _link text DEFAULT NULL,
  _payload jsonb DEFAULT '{}'::jsonb,
  _dedup_hours int DEFAULT 0
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _dedup_key text;
BEGIN
  IF NOT public._should_notify(_user, _type) THEN RETURN false; END IF;

  _dedup_key := _payload->>'dedup_key';
  IF _dedup_key IS NOT NULL AND _dedup_hours > 0 THEN
    IF EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = _user
        AND n.type = _type
        AND n.payload->>'dedup_key' = _dedup_key
        AND n.created_at > now() - make_interval(hours => _dedup_hours)
    ) THEN
      RETURN false;
    END IF;
  END IF;

  INSERT INTO public.notifications(user_id, type, title, body, link, payload)
  VALUES (_user, _type, _title, _body, _link, _payload);
  RETURN true;
END;
$$;

-- ── Low-quantity alerts when reserving reward slots ──
CREATE OR REPLACE FUNCTION public._reserve_campaign_reward_slot(_campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _qty int;
  _new_qty int;
  _c record;
  _partner uuid;
BEGIN
  SELECT c.id, c.title, c.available_quantity, s.partner_id, s.name AS shop_name
  INTO _c
  FROM public.campaigns c
  JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
  WHERE c.id = _campaign_id
  FOR UPDATE OF c;

  _qty := _c.available_quantity;
  IF _qty IS NOT NULL AND _qty <= 0 THEN
    RAISE EXCEPTION 'All rewards for this campaign have been claimed';
  END IF;

  IF _qty IS NOT NULL THEN
    _new_qty := _qty - 1;
    UPDATE public.campaigns SET available_quantity = _new_qty WHERE id = _campaign_id;
    _partner := _c.partner_id;
    IF _partner IS NOT NULL AND _new_qty > 0 AND _new_qty <= 3 THEN
      PERFORM public._notify_user(
        _partner,
        'campaign_low_quantity',
        'Campaign rewards running low',
        '"' || _c.title || '" has ' || _new_qty::text || ' rewards left at ' || _c.shop_name || '.',
        '/partner/campaigns',
        jsonb_build_object(
          'campaign_id', _campaign_id,
          'remaining', _new_qty,
          'dedup_key', 'low_qty:' || _campaign_id::text || ':' || _new_qty::text
        ),
        24
      );
    END IF;
  END IF;
END;
$$;

-- ── Check-in: notify café partner ──
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
  _shop record;
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
  _explorer_name text;
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

  SELECT s.partner_id, s.name INTO _shop FROM public.coffee_shops s WHERE s.id = _shop_id;
  SELECT display_name INTO _explorer_name FROM public.profiles WHERE id = _user;
  IF _shop.partner_id IS NOT NULL THEN
    PERFORM public._notify_user(
      _shop.partner_id,
      'partner_check_in',
      COALESCE(_explorer_name, 'An explorer') || ' checked in',
      'New visit at ' || _shop.name || '.',
      '/partner',
      jsonb_build_object(
        'shop_id', _shop_id,
        'shop_name', _shop.name,
        'explorer_id', _user,
        'explorer_name', _explorer_name,
        'dedup_key', 'check_in:' || _check_in_id::text
      ),
      0
    );
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

-- ── Badge unlock inbox notification ──
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
  _result jsonb;
BEGIN
  INSERT INTO public.user_badges (user_id, badge_id)
  VALUES (_user, _badge_id)
  ON CONFLICT (user_id, badge_id) DO NOTHING;
  GET DIAGNOSTICS _inserted = ROW_COUNT;
  IF _inserted > 0 THEN
    PERFORM public.award_xp(_user, 'badge_unlock', _badge_id::text, _badge_id, 'badges',
      jsonb_build_object('slug', _slug, 'name', _name, 'rarity', _rarity));
    PERFORM public._sync_feed_badge_unlock(_user, _slug, _name);
    PERFORM public._notify_user(
      _user,
      'badge_unlocked',
      'Badge unlocked: ' || _name,
      'You earned the ' || _name || ' badge — check your passport.',
      '/passport',
      jsonb_build_object('slug', _slug, 'name', _name, 'rarity', _rarity, 'dedup_key', 'badge:' || _slug),
      0
    );
    _result := jsonb_build_object('slug', _slug, 'name', _name, 'rarity', _rarity);
    RETURN _result;
  END IF;
  RETURN NULL;
END;
$$;

-- ── Trail progress milestones ──
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
  _total int;
  _done int;
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

    SELECT COUNT(*) INTO _total FROM public.crawl_stops WHERE crawl_id = _crawl.id;
    SELECT COUNT(*) INTO _done FROM public.user_crawl_stops WHERE user_id = _user AND crawl_id = _crawl.id;

    IF _total > 1 AND _done = _total - 1 THEN
      PERFORM public._notify_user(
        _user,
        'trail_progress',
        'One stop left on ' || _crawl.title,
        'You are almost done — one more café to complete the trail.',
        '/crawls/' || _crawl.slug,
        jsonb_build_object('crawl_id', _crawl.id, 'slug', _crawl.slug, 'crawl_title', _crawl.title, 'dedup_key', 'trail_almost:' || _crawl.id::text),
        72
      );
    ELSIF _total > 2 AND _done >= ceil(_total::numeric / 2) AND _done < _total THEN
      PERFORM public._notify_user(
        _user,
        'trail_progress',
        'Halfway on ' || _crawl.title,
        'You have visited ' || _done::text || ' of ' || _total::text || ' stops.',
        '/crawls/' || _crawl.slug,
        jsonb_build_object('crawl_id', _crawl.id, 'slug', _crawl.slug, 'crawl_title', _crawl.title, 'dedup_key', 'trail_half:' || _crawl.id::text),
        72
      );
    END IF;

    IF public._complete_trail_if_ready(_user, _crawl.id) THEN
      _newly_completed := _newly_completed || jsonb_build_object(
        'slug', _crawl.slug, 'title', _crawl.title, 'crawl_id', _crawl.id
      );
    END IF;
  END LOOP;

  RETURN _newly_completed;
END;
$$;

-- ── Partner notified when campaign reward marked used at counter ──
CREATE OR REPLACE FUNCTION public._trg_partner_redemption_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _partner uuid;
  _campaign_title text;
  _shop_name text;
  _explorer_name text;
BEGIN
  IF NEW.used_at IS NULL OR (OLD.used_at IS NOT NULL) THEN
    RETURN NEW;
  END IF;

  SELECT s.partner_id, c.title, s.name, p.display_name
  INTO _partner, _campaign_title, _shop_name, _explorer_name
  FROM public.campaigns c
  JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
  LEFT JOIN public.profiles p ON p.id = NEW.user_id
  WHERE c.id = NEW.campaign_id;

  IF _partner IS NOT NULL THEN
    PERFORM public._notify_user(
      _partner,
      'partner_reward_redeemed',
      'Reward redeemed at counter',
      COALESCE(_explorer_name, 'An explorer') || ' redeemed "' || _campaign_title || '" (' || NEW.redemption_code || ').',
      '/partner/analytics',
      jsonb_build_object(
        'code', NEW.redemption_code,
        'campaign_id', NEW.campaign_id,
        'explorer_name', _explorer_name,
        'shop_name', _shop_name,
        'dedup_key', 'partner_redeem:' || NEW.id::text
      ),
      0
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_partner_redemption_notify ON public.campaign_redemptions;
CREATE TRIGGER trg_partner_redemption_notify
  AFTER UPDATE OF used_at ON public.campaign_redemptions
  FOR EACH ROW
  EXECUTE FUNCTION public._trg_partner_redemption_notify();

-- ── Reminder sync (expiring rewards, nearby campaigns, seasonal trails, partner digests) ──
CREATE OR REPLACE FUNCTION public.sync_notification_reminders(
  _latitude double precision DEFAULT NULL,
  _longitude double precision DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _created int := 0;
  _r record;
  _c record;
  _trail record;
  _partner_shops int;
  _checkins_7d int;
  _redemptions_7d int;
  _subs_7d int;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Expiring rewards (48h window)
  FOR _r IN
    SELECT cr.id, cr.redemption_code, cr.expires_at, c.id AS campaign_id, c.title, s.name AS shop_name
    FROM public.campaign_redemptions cr
    JOIN public.campaigns c ON c.id = cr.campaign_id
    JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
    WHERE cr.user_id = _user
      AND cr.used_at IS NULL
      AND cr.reward_status = 'unlocked'
      AND cr.expires_at IS NOT NULL
      AND cr.expires_at > now()
      AND cr.expires_at <= now() + interval '48 hours'
  LOOP
    IF public._notify_user(
      _user,
      'reward_expiring_soon',
      'Reward expiring soon',
      'Your reward for "' || _r.title || '" at ' || _r.shop_name || ' expires soon — show your QR before it is too late.',
      '/campaign/' || _r.campaign_id::text,
      jsonb_build_object(
        'campaign_id', _r.campaign_id,
        'code', _r.redemption_code,
        'expires_at', _r.expires_at,
        'shop_name', _r.shop_name,
        'dedup_key', 'expiring:' || _r.id::text
      ),
      24
    ) THEN
      _created := _created + 1;
    END IF;
  END LOOP;

  -- Nearby / new EEFFOC campaigns (when coords provided)
  IF _latitude IS NOT NULL AND _longitude IS NOT NULL THEN
    FOR _c IN
      SELECT c.id, c.title, s.name AS shop_name, s.slug,
             public.haversine_metres(_latitude, _longitude, s.latitude, s.longitude) AS dist_m
      FROM public.campaigns c
      JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
      WHERE public._campaign_is_live(c)
        AND s.latitude IS NOT NULL AND s.longitude IS NOT NULL
        AND COALESCE(c.created_at, c.starts_at, now()) > now() - interval '7 days'
        AND public.haversine_metres(_latitude, _longitude, s.latitude, s.longitude) <= 15000
      ORDER BY dist_m ASC
      LIMIT 3
    LOOP
      IF public._notify_user(
        _user,
        'campaign_nearby',
        'New EEFFOC campaign nearby',
        '"' || _c.title || '" at ' || _c.shop_name || ' — join before rewards run out.',
        '/campaign/' || _c.id::text,
        jsonb_build_object(
          'campaign_id', _c.id,
          'shop_name', _c.shop_name,
          'slug', _c.slug,
          'dedup_key', 'nearby_campaign:' || _c.id::text
        ),
        72
      ) THEN
        _created := _created + 1;
      END IF;
    END LOOP;
  END IF;

  -- Seasonal trail / event started
  FOR _trail IN
    SELECT c.id, c.slug, c.title
    FROM public.coffee_crawls c
    WHERE c.active = true
      AND c.starts_at IS NOT NULL
      AND c.starts_at <= now()
      AND c.starts_at > now() - interval '7 days'
      AND NOT EXISTS (SELECT 1 FROM public.user_trail_joins j WHERE j.user_id = _user AND j.crawl_id = c.id)
    LIMIT 2
  LOOP
    IF public._notify_user(
      _user,
      'seasonal_event_started',
      'Seasonal trail started',
      _trail.title || ' is live — join the route and earn XP.',
      '/crawls/' || _trail.slug,
      jsonb_build_object('crawl_id', _trail.id, 'slug', _trail.slug, 'crawl_title', _trail.title, 'dedup_key', 'seasonal:' || _trail.id::text),
      168
    ) THEN
      _created := _created + 1;
    END IF;
  END LOOP;

  -- Partner: expired campaigns in last 24h
  SELECT COUNT(*) INTO _partner_shops FROM public.coffee_shops WHERE partner_id = _user;
  IF _partner_shops > 0 THEN
    FOR _c IN
      SELECT c.id, c.title
      FROM public.campaigns c
      JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
      WHERE s.partner_id = _user
        AND c.ends_at IS NOT NULL
        AND c.ends_at < now()
        AND c.ends_at > now() - interval '24 hours'
    LOOP
      IF public._notify_user(
        _user,
        'campaign_expired',
        'Campaign ended',
        '"' || _c.title || '" has ended. Review results in analytics.',
        '/partner/analytics',
        jsonb_build_object('campaign_id', _c.id, 'dedup_key', 'expired:' || _c.id::text),
        48
      ) THEN
        _created := _created + 1;
      END IF;
    END LOOP;

    -- Weekly analytics summary (max once per 7 days)
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = _user AND type = 'analytics_summary'
        AND created_at > now() - interval '7 days'
    ) THEN
      SELECT COUNT(*) INTO _checkins_7d
      FROM public.check_ins ci
      JOIN public.coffee_shops s ON s.id = ci.coffee_shop_id
      WHERE s.partner_id = _user AND ci.created_at > now() - interval '7 days';

      SELECT COUNT(*) INTO _redemptions_7d
      FROM public.campaign_redemptions cr
      JOIN public.campaigns c ON c.id = cr.campaign_id
      JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
      WHERE s.partner_id = _user AND cr.used_at > now() - interval '7 days';

      SELECT COUNT(*) INTO _subs_7d
      FROM public.social_submissions ss
      JOIN public.coffee_shops s ON s.id = ss.coffee_shop_id
      WHERE s.partner_id = _user AND ss.created_at > now() - interval '7 days';

      IF _checkins_7d + _redemptions_7d + _subs_7d > 0 THEN
        IF public._notify_user(
          _user,
          'analytics_summary',
          'Your weekly café pulse',
          _checkins_7d::text || ' check-ins · ' || _redemptions_7d::text || ' rewards redeemed · ' || _subs_7d::text || ' social proofs this week.',
          '/partner/analytics',
          jsonb_build_object(
            'check_ins', _checkins_7d,
            'redemptions', _redemptions_7d,
            'social_proofs', _subs_7d,
            'dedup_key', 'analytics:' || to_char(now(), 'IYYY-IW')
          ),
          0
        ) THEN
          _created := _created + 1;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object('created', _created);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_notification_reminders(double precision, double precision) TO authenticated;
