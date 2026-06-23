-- Anti-fraud: trust status, audit events, QR scan logging, café reports, hardened RPCs

-- ── Explorer trust (internal moderation) ──
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trust_status text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS fraud_score smallint NOT NULL DEFAULT 0;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_trust_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_trust_status_check
  CHECK (trust_status IN ('normal', 'watch', 'flagged', 'restricted'));

COMMENT ON COLUMN public.profiles.trust_status IS 'Internal: normal|watch|flagged|restricted';
COMMENT ON COLUMN public.profiles.fraud_score IS 'Internal risk score; higher = more suspicious';

-- ── Campaign: optional repeat redemptions after prior reward is used ──
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS allow_multiple_redemptions boolean NOT NULL DEFAULT false;

-- One active unlocked reward per user per campaign; repeat only after prior reward is used
ALTER TABLE public.campaign_redemptions
  DROP CONSTRAINT IF EXISTS campaign_redemptions_campaign_id_user_id_key;

DROP INDEX IF EXISTS idx_campaign_redemption_one_per_user_strict;
DROP INDEX IF EXISTS idx_campaign_redemption_one_active_unlocked;

CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_redemption_one_active_unlocked
  ON public.campaign_redemptions (campaign_id, user_id)
  WHERE used_at IS NULL AND reward_status IN ('unlocked', 'locked');

-- ── Fraud audit log ──
CREATE TABLE IF NOT EXISTS public.fraud_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  partner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  shop_id uuid REFERENCES public.coffee_shops(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warn', 'high')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fraud_events_user_time ON public.fraud_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fraud_events_type_time ON public.fraud_events(event_type, created_at DESC);

ALTER TABLE public.fraud_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read fraud events" ON public.fraud_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.fraud_events TO authenticated;
GRANT ALL ON public.fraud_events TO service_role;
REVOKE INSERT ON public.fraud_events FROM authenticated;

-- ── QR / participation scan attempts ──
CREATE TABLE IF NOT EXISTS public.qr_scan_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  token text,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  shop_id uuid REFERENCES public.coffee_shops(id) ON DELETE SET NULL,
  result text NOT NULL,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qr_scan_attempts_time ON public.qr_scan_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qr_scan_attempts_user ON public.qr_scan_attempts(user_id, created_at DESC);

ALTER TABLE public.qr_scan_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read qr scans" ON public.qr_scan_attempts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Auth insert qr scans" ON public.qr_scan_attempts
  FOR INSERT TO authenticated WITH CHECK (user_id IS NULL OR user_id = auth.uid());

GRANT SELECT, INSERT ON public.qr_scan_attempts TO authenticated;

-- ── Café reports (partner → platform) ──
CREATE TABLE IF NOT EXISTS public.cafe_fraud_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  shop_id uuid NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed')),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_cafe_fraud_reports_status ON public.cafe_fraud_reports(status, created_at DESC);

ALTER TABLE public.cafe_fraud_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partners report from own shops" ON public.cafe_fraud_reports
  FOR INSERT TO authenticated WITH CHECK (
    reporter_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = shop_id AND s.partner_id = auth.uid())
  );
CREATE POLICY "Partners read own reports" ON public.cafe_fraud_reports
  FOR SELECT TO authenticated USING (
    reporter_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "Admins manage reports" ON public.cafe_fraud_reports
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, INSERT ON public.cafe_fraud_reports TO authenticated;

-- ── Richer verification audit ──
ALTER TABLE public.redemption_verifications
  ADD COLUMN IF NOT EXISTS explorer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ── Helpers ──
CREATE OR REPLACE FUNCTION public._user_shares_location(_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT CASE
      WHEN privacy_preferences ? 'share_location' THEN (privacy_preferences->>'share_location')::boolean
      ELSE true
    END FROM public.profiles WHERE id = _user),
    true
  );
$$;

CREATE OR REPLACE FUNCTION public._assert_user_not_restricted(_user uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _status text;
BEGIN
  SELECT trust_status INTO _status FROM public.profiles WHERE id = _user;
  IF _status = 'restricted' THEN
    RAISE EXCEPTION 'Account temporarily restricted — contact support if you think this is a mistake';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_fraud_event(
  _event_type text,
  _severity text DEFAULT 'info',
  _user_id uuid DEFAULT NULL,
  _partner_id uuid DEFAULT NULL,
  _shop_id uuid DEFAULT NULL,
  _campaign_id uuid DEFAULT NULL,
  _details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
  _delta smallint := 0;
BEGIN
  INSERT INTO public.fraud_events (user_id, partner_id, shop_id, campaign_id, event_type, severity, details)
  VALUES (_user_id, _partner_id, _shop_id, _campaign_id, _event_type, COALESCE(_severity, 'info'), COALESCE(_details, '{}'::jsonb))
  RETURNING id INTO _id;

  IF _user_id IS NOT NULL AND _severity IN ('warn', 'high') THEN
    _delta := CASE _severity WHEN 'high' THEN 3 WHEN 'warn' THEN 1 ELSE 0 END;
    UPDATE public.profiles
    SET fraud_score = LEAST(100, fraud_score + _delta),
        trust_status = CASE
          WHEN fraud_score + _delta >= 15 THEN 'flagged'
          WHEN fraud_score + _delta >= 8 THEN 'watch'
          ELSE trust_status
        END
    WHERE id = _user_id;
  END IF;

  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION public._campaign_is_live(_c public.campaigns)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  _hours jsonb;
  _start_time time;
  _end_time time;
  _now_time time := (now() AT TIME ZONE 'UTC')::time;
BEGIN
  IF _c.status IS DISTINCT FROM 'active' THEN RETURN false; END IF;
  IF _c.starts_at IS NOT NULL AND _c.starts_at > now() THEN RETURN false; END IF;
  IF _c.ends_at IS NOT NULL AND _c.ends_at < now() THEN RETURN false; END IF;

  _hours := _c.active_hours;
  IF _hours IS NOT NULL AND _hours ? 'start' AND _hours ? 'end' THEN
    _start_time := (_hours->>'start')::time;
    _end_time := (_hours->>'end')::time;
    IF _start_time <= _end_time THEN
      IF _now_time < _start_time OR _now_time > _end_time THEN RETURN false; END IF;
    ELSE
      IF _now_time < _start_time AND _now_time > _end_time THEN RETURN false; END IF;
    END IF;
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public._check_daily_redemption_limit(_campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _limit int;
  _used_today int;
BEGIN
  SELECT daily_redemption_limit INTO _limit FROM public.campaigns WHERE id = _campaign_id;
  IF _limit IS NULL THEN RETURN; END IF;

  SELECT COUNT(*) INTO _used_today
  FROM public.campaign_redemptions
  WHERE campaign_id = _campaign_id
    AND used_at IS NOT NULL
    AND used_at >= date_trunc('day', now());

  IF _used_today >= _limit THEN
    RAISE EXCEPTION 'Daily redemption limit reached for this campaign — try again tomorrow';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public._record_qr_scan(
  _user_id uuid,
  _token text,
  _campaign_id uuid,
  _shop_id uuid,
  _result text,
  _ip text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.qr_scan_attempts (user_id, token, campaign_id, shop_id, result, ip)
  VALUES (_user_id, upper(trim(COALESCE(_token, ''))), _campaign_id, _shop_id, _result, _ip);

  IF _user_id IS NOT NULL AND _result NOT IN ('ok', 'found') THEN
    PERFORM public.log_fraud_event(
      'qr_scan_failed', 'warn', _user_id, NULL, _shop_id, _campaign_id,
      jsonb_build_object('token', _token, 'result', _result)
    );
  END IF;
END;
$$;

-- ── validate participation token (QR join) ──
CREATE OR REPLACE FUNCTION public.validate_campaign_qr_token(
  _token text,
  _expected_campaign_id uuid DEFAULT NULL,
  _expected_shop_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _c record;
  _live boolean;
BEGIN
  SELECT c.*, s.id AS shop_id, s.name AS shop_name, s.slug AS shop_slug
  INTO _c
  FROM public.campaigns c
  JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
  WHERE c.participation_token = upper(trim(COALESCE(_token, '')));

  IF NOT FOUND THEN
    PERFORM public._record_qr_scan(_user, _token, NULL, NULL, 'not_found');
    RETURN jsonb_build_object('valid', false, 'reason', 'not_found');
  END IF;

  IF _expected_campaign_id IS NOT NULL AND _c.id <> _expected_campaign_id THEN
    PERFORM public._record_qr_scan(_user, _token, _c.id, _c.shop_id, 'campaign_mismatch');
    RETURN jsonb_build_object('valid', false, 'reason', 'campaign_mismatch');
  END IF;

  IF _expected_shop_id IS NOT NULL AND _c.shop_id <> _expected_shop_id THEN
    PERFORM public._record_qr_scan(_user, _token, _c.id, _c.shop_id, 'shop_mismatch');
    RETURN jsonb_build_object('valid', false, 'reason', 'shop_mismatch');
  END IF;

  _live := public._campaign_is_live(_c);
  IF NOT _live THEN
    PERFORM public._record_qr_scan(_user, _token, _c.id, _c.shop_id, 'inactive');
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'inactive',
      'campaign_id', _c.id,
      'status', _c.status
    );
  END IF;

  PERFORM public._record_qr_scan(_user, _token, _c.id, _c.shop_id, 'ok');

  RETURN jsonb_build_object(
    'valid', true,
    'campaign_id', _c.id,
    'title', _c.title,
    'shop_id', _c.shop_id,
    'shop_slug', _c.shop_slug,
    'shop_name', _c.shop_name,
    'fulfillment_mode', _c.fulfillment_mode
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_campaign_qr_token(text, uuid, uuid) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.get_campaign_by_token(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _v jsonb;
BEGIN
  _v := public.validate_campaign_qr_token(_token);
  IF NOT COALESCE((_v->>'valid')::boolean, false) THEN
    RETURN jsonb_build_object('found', false, 'reason', _v->>'reason');
  END IF;
  RETURN jsonb_build_object(
    'found', true,
    'campaign_id', _v->>'campaign_id',
    'title', _v->>'title',
    'shop_slug', _v->>'shop_slug',
    'shop_name', _v->>'shop_name',
    'fulfillment_mode', _v->>'fulfillment_mode',
    'status', 'active'
  );
END;
$$;

-- ── Partner report explorer ──
CREATE OR REPLACE FUNCTION public.report_cafe_fraud(
  _reported_user_id uuid,
  _shop_id uuid,
  _campaign_id uuid DEFAULT NULL,
  _reason text DEFAULT 'suspicious_activity',
  _details text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _partner uuid := auth.uid();
  _id uuid;
BEGIN
  IF _partner IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.coffee_shops WHERE id = _shop_id AND partner_id = _partner) THEN
    RAISE EXCEPTION 'Not your café';
  END IF;

  INSERT INTO public.cafe_fraud_reports (reporter_id, reported_user_id, shop_id, campaign_id, reason, details)
  VALUES (_partner, _reported_user_id, _shop_id, _campaign_id, trim(_reason), NULLIF(trim(_details), ''))
  RETURNING id INTO _id;

  PERFORM public.log_fraud_event(
    'cafe_report', 'warn', _reported_user_id, _partner, _shop_id, _campaign_id,
    jsonb_build_object('report_id', _id, 'reason', _reason)
  );

  RETURN jsonb_build_object('report_id', _id, 'status', 'open');
END;
$$;

GRANT EXECUTE ON FUNCTION public.report_cafe_fraud(uuid, uuid, uuid, text, text) TO authenticated;

-- ── Admin fraud dashboard ──
CREATE OR REPLACE FUNCTION public.get_admin_fraud_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN jsonb_build_object(
    'suspicious_users', COALESCE((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT p.id, p.display_name, p.handle, p.trust_status, p.fraud_score,
               p.total_check_ins, p.total_rewards_redeemed,
               (SELECT COUNT(*)::int FROM public.fraud_events fe WHERE fe.user_id = p.id AND fe.created_at > now() - interval '7 days') AS events_7d
        FROM public.profiles p
        WHERE p.trust_status IN ('watch', 'flagged', 'restricted') OR p.fraud_score >= 5
        ORDER BY p.fraud_score DESC, p.trust_status DESC
        LIMIT 30
      ) t
    ), '[]'::jsonb),
    'failed_scans', COALESCE((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT rv.id, rv.code, rv.result, rv.verified_at, rv.explorer_id,
               rv.campaign_id, c.title AS campaign_title, s.name AS shop_name
        FROM public.redemption_verifications rv
        LEFT JOIN public.campaigns c ON c.id = rv.campaign_id
        LEFT JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
        WHERE rv.result NOT IN ('ok', 'rate_limited')
          AND rv.verified_at > now() - interval '7 days'
        ORDER BY rv.verified_at DESC
        LIMIT 40
      ) t
    ), '[]'::jsonb),
    'rejected_proofs', COALESCE((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT ss.id, ss.user_id, ss.campaign_id, ss.platform, ss.status,
               ss.reviewed_at, ss.review_notes, c.title AS campaign_title,
               p.display_name AS explorer_name
        FROM public.social_submissions ss
        JOIN public.campaigns c ON c.id = ss.campaign_id
        LEFT JOIN public.profiles p ON p.id = ss.user_id
        WHERE ss.status = 'rejected' AND ss.reviewed_at > now() - interval '14 days'
        ORDER BY ss.reviewed_at DESC
        LIMIT 30
      ) t
    ), '[]'::jsonb),
    'high_redemption_users', COALESCE((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT cr.user_id, p.display_name, p.handle, p.trust_status,
               COUNT(*)::int AS redemptions_24h
        FROM public.campaign_redemptions cr
        JOIN public.profiles p ON p.id = cr.user_id
        WHERE cr.used_at > now() - interval '24 hours'
        GROUP BY cr.user_id, p.display_name, p.handle, p.trust_status
        HAVING COUNT(*) >= 3
        ORDER BY COUNT(*) DESC
        LIMIT 20
      ) t
    ), '[]'::jsonb),
    'cafe_reports', COALESCE((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT r.id, r.reason, r.details, r.status, r.created_at,
               r.reported_user_id, s.name AS shop_name, c.title AS campaign_title,
               rp.display_name AS reporter_name
        FROM public.cafe_fraud_reports r
        JOIN public.coffee_shops s ON s.id = r.shop_id
        LEFT JOIN public.campaigns c ON c.id = r.campaign_id
        LEFT JOIN public.profiles rp ON rp.id = r.reporter_id
        WHERE r.status = 'open'
        ORDER BY r.created_at DESC
        LIMIT 25
      ) t
    ), '[]'::jsonb),
    'qr_failures_7d', COALESCE((
      SELECT COUNT(*)::int FROM public.qr_scan_attempts
      WHERE result NOT IN ('ok', 'found') AND created_at > now() - interval '7 days'
    ), 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_fraud_dashboard() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_user_trust(
  _user_id uuid,
  _trust_status text,
  _fraud_score smallint DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF _trust_status NOT IN ('normal', 'watch', 'flagged', 'restricted') THEN
    RAISE EXCEPTION 'Invalid trust status';
  END IF;

  UPDATE public.profiles
  SET trust_status = _trust_status,
      fraud_score = COALESCE(_fraud_score, fraud_score)
  WHERE id = _user_id;

  PERFORM public.log_fraud_event(
    'admin_trust_update', 'info', _user_id, auth.uid(), NULL, NULL,
    jsonb_build_object('trust_status', _trust_status, 'fraud_score', _fraud_score, 'notes', _notes)
  );

  RETURN jsonb_build_object('user_id', _user_id, 'trust_status', _trust_status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_trust(uuid, text, smallint, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_review_cafe_report(
  _report_id uuid,
  _status text,
  _admin_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF _status NOT IN ('reviewed', 'dismissed') THEN RAISE EXCEPTION 'Invalid status'; END IF;

  UPDATE public.cafe_fraud_reports
  SET status = _status, admin_notes = NULLIF(trim(_admin_notes), ''), reviewed_at = now()
  WHERE id = _report_id;

  RETURN jsonb_build_object('report_id', _report_id, 'status', _status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_review_cafe_report(uuid, text, text) TO authenticated;
