-- Admin moderation: content reports, feed/moment status, extended dashboards

-- ── Moderation status on UGC ──
ALTER TABLE public.feed_items
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'visible',
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderation_notes text;

ALTER TABLE public.feed_items DROP CONSTRAINT IF EXISTS feed_items_moderation_status_check;
ALTER TABLE public.feed_items ADD CONSTRAINT feed_items_moderation_status_check
  CHECK (moderation_status IN ('visible', 'hidden', 'removed'));

ALTER TABLE public.user_moments
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'visible',
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderation_notes text;

ALTER TABLE public.user_moments DROP CONSTRAINT IF EXISTS user_moments_moderation_status_check;
ALTER TABLE public.user_moments ADD CONSTRAINT user_moments_moderation_status_check
  CHECK (moderation_status IN ('visible', 'hidden', 'removed'));

CREATE INDEX IF NOT EXISTS idx_feed_items_moderation ON public.feed_items (moderation_status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_moments_moderation ON public.user_moments (moderation_status, created_at DESC);

-- ── User-submitted content reports ──
CREATE TABLE IF NOT EXISTS public.content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('feed_item', 'user_moment', 'review', 'user', 'campaign')),
  target_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed', 'action_taken')),
  admin_notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_content_reports_status ON public.content_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_reports_target ON public.content_reports (target_type, target_id);

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users submit content reports" ON public.content_reports
  FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users read own reports" ON public.content_reports
  FOR SELECT TO authenticated USING (reporter_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage content reports" ON public.content_reports
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, INSERT ON public.content_reports TO authenticated;

CREATE POLICY "Admins read all moments" ON public.user_moments
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage all moments" ON public.user_moments
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins read all feed items" ON public.feed_items
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage feed items" ON public.feed_items
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ── Admin user detail ──
CREATE OR REPLACE FUNCTION public.get_admin_user_detail(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _profile jsonb;
  _roles jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT to_jsonb(p) INTO _profile
  FROM public.profiles p WHERE p.id = _user_id;

  IF _profile IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT COALESCE(jsonb_agg(ur.role), '[]'::jsonb) INTO _roles
  FROM public.user_roles ur WHERE ur.user_id = _user_id;

  RETURN jsonb_build_object(
    'found', true,
    'profile', _profile,
    'roles', _roles,
    'activity', jsonb_build_object(
      'check_ins_total', COALESCE((_profile->>'total_check_ins')::int, 0),
      'points_total', COALESCE((_profile->>'total_points')::int, 0),
      'rewards_redeemed', COALESCE((_profile->>'total_rewards_redeemed')::int, 0),
      'check_ins_30d', (
        SELECT COUNT(*)::int FROM public.check_ins
        WHERE user_id = _user_id AND created_at > now() - interval '30 days'
      ),
      'campaigns_joined', (
        SELECT COUNT(*)::int FROM public.campaign_participants WHERE user_id = _user_id
      ),
      'fraud_events_7d', (
        SELECT COUNT(*)::int FROM public.fraud_events
        WHERE user_id = _user_id AND created_at > now() - interval '7 days'
      ),
      'recent_check_ins', COALESCE((
        SELECT jsonb_agg(row_to_json(t))
        FROM (
          SELECT ci.id, ci.created_at, s.name AS shop_name, s.city
          FROM public.check_ins ci
          JOIN public.coffee_shops s ON s.id = ci.coffee_shop_id
          WHERE ci.user_id = _user_id
          ORDER BY ci.created_at DESC
          LIMIT 8
        ) t
      ), '[]'::jsonb)
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_user_detail(uuid) TO authenticated;

-- ── Moderation queue ──
CREATE OR REPLACE FUNCTION public.get_admin_moderation_queue()
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
    'feed_items', COALESCE((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT fi.id, fi.source_type, fi.caption, fi.image_url, fi.image_path, fi.image_bucket,
               fi.moderation_status, fi.published_at, fi.user_id,
               p.display_name AS author_name, p.handle AS author_handle,
               s.name AS shop_name
        FROM public.feed_items fi
        LEFT JOIN public.profiles p ON p.id = fi.user_id
        LEFT JOIN public.coffee_shops s ON s.id = fi.coffee_shop_id
        WHERE fi.moderation_status = 'visible'
        ORDER BY fi.published_at DESC
        LIMIT 40
      ) t
    ), '[]'::jsonb),
    'moments', COALESCE((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT um.id, um.caption, um.image_path, um.drink_type, um.moderation_status,
               um.created_at, um.user_id, p.display_name AS author_name, s.name AS shop_name
        FROM public.user_moments um
        LEFT JOIN public.profiles p ON p.id = um.user_id
        LEFT JOIN public.coffee_shops s ON s.id = um.coffee_shop_id
        WHERE um.moderation_status = 'visible'
        ORDER BY um.created_at DESC
        LIMIT 40
      ) t
    ), '[]'::jsonb),
    'reports', COALESCE((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT cr.id, cr.target_type, cr.target_id, cr.reason, cr.details, cr.status,
               cr.created_at, rp.display_name AS reporter_name
        FROM public.content_reports cr
        LEFT JOIN public.profiles rp ON rp.id = cr.reporter_id
        WHERE cr.status = 'open'
        ORDER BY cr.created_at DESC
        LIMIT 30
      ) t
    ), '[]'::jsonb),
    'hidden_count', COALESCE((
      SELECT COUNT(*)::int FROM public.feed_items WHERE moderation_status IN ('hidden', 'removed')
    ), 0) + COALESCE((
      SELECT COUNT(*)::int FROM public.user_moments WHERE moderation_status IN ('hidden', 'removed')
    ), 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_moderation_queue() TO authenticated;

-- ── Moderate feed item / moment ──
CREATE OR REPLACE FUNCTION public.admin_moderate_feed_item(
  _feed_item_id uuid,
  _status text,
  _notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF _status NOT IN ('visible', 'hidden', 'removed') THEN RAISE EXCEPTION 'Invalid status'; END IF;

  UPDATE public.feed_items
  SET moderation_status = _status,
      moderated_at = now(),
      moderated_by = auth.uid(),
      moderation_notes = _notes
  WHERE id = _feed_item_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Feed item not found'; END IF;

  IF _status IN ('hidden', 'removed') THEN
  PERFORM public.log_fraud_event(
    'content_moderated', 'info', NULL, auth.uid(), NULL, NULL,
    jsonb_build_object('target', 'feed_item', 'feed_item_id', _feed_item_id, 'status', _status, 'notes', _notes)
  );
  END IF;

  RETURN jsonb_build_object('ok', true, 'status', _status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_moderate_feed_item(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_moderate_moment(
  _moment_id uuid,
  _status text,
  _notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF _status NOT IN ('visible', 'hidden', 'removed') THEN RAISE EXCEPTION 'Invalid status'; END IF;

  UPDATE public.user_moments
  SET moderation_status = _status,
      moderated_at = now(),
      moderated_by = auth.uid(),
      moderation_notes = _notes
  WHERE id = _moment_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Moment not found'; END IF;

  UPDATE public.feed_items
  SET moderation_status = _status,
      moderated_at = now(),
      moderated_by = auth.uid(),
      moderation_notes = _notes
  WHERE source_type = 'user_moment' AND source_id = _moment_id;

  IF _status IN ('hidden', 'removed') THEN
  PERFORM public.log_fraud_event(
    'content_moderated', 'info', NULL, auth.uid(), NULL, NULL,
    jsonb_build_object('target', 'user_moment', 'moment_id', _moment_id, 'status', _status, 'notes', _notes)
  );
  END IF;

  RETURN jsonb_build_object('ok', true, 'status', _status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_moderate_moment(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_review_content_report(
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
  IF _status NOT IN ('reviewed', 'dismissed', 'action_taken') THEN RAISE EXCEPTION 'Invalid status'; END IF;

  UPDATE public.content_reports
  SET status = _status,
      admin_notes = _admin_notes,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE id = _report_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Report not found'; END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_review_content_report(uuid, text, text) TO authenticated;

-- ── Campaign metrics for admin ──
CREATE OR REPLACE FUNCTION public.get_admin_campaign_metrics()
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

  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(t))
    FROM (
      SELECT c.id, c.title, c.status, c.starts_at, c.ends_at, c.points_reward, c.reward_type,
             c.coffee_shop_id, s.name AS shop_name, s.city AS shop_city,
             (SELECT COUNT(*)::int FROM public.campaign_participants cp WHERE cp.campaign_id = c.id) AS participants,
             (SELECT COUNT(*)::int FROM public.campaign_redemptions cr WHERE cr.campaign_id = c.id) AS redemptions,
             (SELECT COUNT(*)::int FROM public.campaign_redemptions cr WHERE cr.campaign_id = c.id AND cr.used_at IS NOT NULL) AS used_rewards,
             (SELECT COUNT(*)::int FROM public.social_submissions ss WHERE ss.campaign_id = c.id AND ss.status = 'approved') AS approved_proofs
      FROM public.campaigns c
      JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
      ORDER BY c.created_at DESC
      LIMIT 100
    ) t
  ), '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_campaign_metrics() TO authenticated;

-- ── Extend fraud dashboard: duplicate redemptions + QR failures detail ──
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
    'duplicate_redemptions', COALESCE((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT rv.id, rv.code, rv.result, rv.verified_at, rv.explorer_id,
               p.display_name AS explorer_name, c.title AS campaign_title, s.name AS shop_name
        FROM public.redemption_verifications rv
        LEFT JOIN public.profiles p ON p.id = rv.explorer_id
        LEFT JOIN public.campaigns c ON c.id = rv.campaign_id
        LEFT JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
        WHERE rv.result = 'already_used'
          AND rv.verified_at > now() - interval '7 days'
        ORDER BY rv.verified_at DESC
        LIMIT 30
      ) t
    ), '[]'::jsonb),
    'qr_scan_failures', COALESCE((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT qs.id, qs.result, qs.token, qs.created_at, qs.user_id,
               p.display_name AS user_name, s.name AS shop_name
        FROM public.qr_scan_attempts qs
        LEFT JOIN public.profiles p ON p.id = qs.user_id
        LEFT JOIN public.coffee_shops s ON s.id = qs.shop_id
        WHERE qs.result NOT IN ('ok', 'found')
          AND qs.created_at > now() - interval '7 days'
        ORDER BY qs.created_at DESC
        LIMIT 30
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
    ), 0),
    'open_content_reports', COALESCE((
      SELECT COUNT(*)::int FROM public.content_reports WHERE status = 'open'
    ), 0)
  );
END;
$$;
