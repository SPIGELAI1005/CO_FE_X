-- Explorer Moments feed: permission-based discovery feed

-- Café can allow campaign highlights in the public feed
ALTER TABLE public.coffee_shops
  ADD COLUMN IF NOT EXISTS allow_feed_highlights boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.coffee_shops.allow_feed_highlights IS
  'When true, active campaign imagery may appear in the explorer Moments feed';

-- Per-submission opt-in for approved social proof in the feed
ALTER TABLE public.social_submissions
  ADD COLUMN IF NOT EXISTS public_feed_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_feed_opt_in_at timestamptz;

-- ── Feed core ──
CREATE TABLE IF NOT EXISTS public.feed_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN (
    'social_proof', 'user_moment', 'campaign_highlight', 'badge_unlock', 'trail_complete'
  )),
  source_id uuid,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coffee_shop_id uuid REFERENCES public.coffee_shops(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  image_path text,
  image_bucket text,
  image_url text,
  drink_type text,
  badge_slug text,
  badge_name text,
  caption text,
  campaign_slogan text,
  city text,
  latitude double precision,
  longitude double precision,
  like_count int NOT NULL DEFAULT 0,
  save_count int NOT NULL DEFAULT 0,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feed_items_source_unique UNIQUE (source_type, source_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_feed_items_published ON public.feed_items (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_items_drink ON public.feed_items (drink_type) WHERE drink_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feed_items_shop ON public.feed_items (coffee_shop_id) WHERE coffee_shop_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feed_items_engagement ON public.feed_items ((like_count + save_count) DESC, published_at DESC);

CREATE TABLE IF NOT EXISTS public.feed_item_likes (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feed_item_id uuid NOT NULL REFERENCES public.feed_items(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, feed_item_id)
);

CREATE TABLE IF NOT EXISTS public.feed_item_saves (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feed_item_id uuid NOT NULL REFERENCES public.feed_items(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, feed_item_id)
);

CREATE TABLE IF NOT EXISTS public.user_moments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coffee_shop_id uuid REFERENCES public.coffee_shops(id) ON DELETE SET NULL,
  image_path text NOT NULL,
  drink_type text,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feed_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_item_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_item_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_moments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own moments" ON public.user_moments
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own moments" ON public.user_moments
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own likes" ON public.feed_item_likes
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own saves" ON public.feed_item_saves
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feed_item_likes, public.feed_item_saves TO authenticated;
GRANT SELECT, INSERT ON public.user_moments TO authenticated;

-- Storage for explorer-uploaded moments (public read for feed display)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('explorer-moments', 'explorer-moments', true, 8388608, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload explorer moments" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'explorer-moments' AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "Public read explorer moments" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'explorer-moments');

-- ── Privacy helpers ──
CREATE OR REPLACE FUNCTION public._user_shares_moments(_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (privacy_preferences->>'share_moments_publicly')::boolean,
    false
  )
  FROM public.profiles WHERE id = _user;
$$;

CREATE OR REPLACE FUNCTION public._feed_friends_of(_viewer uuid)
RETURNS TABLE (friend_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT m2.user_id
  FROM public.crew_members m1
  JOIN public.crew_members m2 ON m2.crew_id = m1.crew_id AND m2.user_id <> m1.user_id
  WHERE m1.user_id = _viewer;
$$;

-- ── Sync helpers ──
CREATE OR REPLACE FUNCTION public._sync_feed_social_proof(_submission_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sub record;
  _c record;
  _shop record;
BEGIN
  SELECT ss.* INTO _sub FROM public.social_submissions ss WHERE ss.id = _submission_id;
  IF NOT FOUND OR _sub.status <> 'approved' OR NOT COALESCE(_sub.public_feed_opt_in, false) THEN
    DELETE FROM public.feed_items WHERE source_type = 'social_proof' AND source_id = _submission_id;
    RETURN;
  END IF;

  SELECT * INTO _c FROM public.campaigns WHERE id = _sub.campaign_id;
  SELECT * INTO _shop FROM public.coffee_shops WHERE id = _sub.coffee_shop_id;

  INSERT INTO public.feed_items (
    source_type, source_id, user_id, coffee_shop_id, campaign_id,
    image_path, image_bucket, drink_type, caption, campaign_slogan, city, latitude, longitude
  ) VALUES (
    'social_proof', _submission_id, _sub.user_id, _sub.coffee_shop_id, _sub.campaign_id,
    _sub.screenshot_path, 'social-proof', COALESCE(_c.reward_type, 'coffee'),
    NULLIF(trim(COALESCE(_sub.caption, '')), ''),
    _c.slogan, _shop.city, _shop.latitude, _shop.longitude
  )
  ON CONFLICT (source_type, source_id, user_id) DO UPDATE SET
    caption = EXCLUDED.caption,
    drink_type = EXCLUDED.drink_type,
    campaign_slogan = EXCLUDED.campaign_slogan,
    published_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public._sync_feed_badge_unlock(
  _user uuid, _slug text, _name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ub record;
BEGIN
  IF NOT public._user_shares_moments(_user) THEN RETURN; END IF;

  SELECT ub.id, ub.earned_at INTO _ub
  FROM public.user_badges ub
  JOIN public.badges b ON b.id = ub.badge_id
  WHERE ub.user_id = _user AND b.slug = _slug
  ORDER BY ub.earned_at DESC NULLS LAST
  LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;

  INSERT INTO public.feed_items (
    source_type, source_id, user_id, badge_slug, badge_name, caption, published_at
  ) VALUES (
    'badge_unlock', _ub.id, _user, _slug, _name,
    'Unlocked the ' || _name || ' badge', COALESCE(_ub.earned_at, now())
  )
  ON CONFLICT (source_type, source_id, user_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public._sync_feed_trail_complete(_user uuid, _crawl_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _crawl record;
BEGIN
  IF NOT public._user_shares_moments(_user) THEN RETURN; END IF;

  SELECT * INTO _crawl FROM public.coffee_crawls WHERE id = _crawl_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.user_crawl_completions WHERE user_id = _user AND crawl_id = _crawl_id
  ) THEN RETURN; END IF;

  INSERT INTO public.feed_items (
    source_type, source_id, user_id, badge_slug, caption, city, published_at
  ) VALUES (
    'trail_complete', _crawl_id, _user, _crawl.badge_slug,
    'Completed the ' || _crawl.title || ' trail', _crawl.city_slug, now()
  )
  ON CONFLICT (source_type, source_id, user_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public._sync_feed_user_moment(_moment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _m record;
  _shop record;
BEGIN
  SELECT * INTO _m FROM public.user_moments WHERE id = _moment_id;
  IF NOT FOUND OR NOT public._user_shares_moments(_m.user_id) THEN
    DELETE FROM public.feed_items WHERE source_type = 'user_moment' AND source_id = _moment_id;
    RETURN;
  END IF;

  IF _m.coffee_shop_id IS NOT NULL THEN
    SELECT * INTO _shop FROM public.coffee_shops WHERE id = _m.coffee_shop_id;
  END IF;

  INSERT INTO public.feed_items (
    source_type, source_id, user_id, coffee_shop_id,
    image_path, image_bucket, drink_type, caption, city, latitude, longitude
  ) VALUES (
    'user_moment', _moment_id, _m.user_id, _m.coffee_shop_id,
    _m.image_path, 'explorer-moments', _m.drink_type, _m.caption,
    _shop.city, _shop.latitude, _shop.longitude
  )
  ON CONFLICT (source_type, source_id, user_id) DO UPDATE SET
    caption = EXCLUDED.caption,
    drink_type = EXCLUDED.drink_type,
    published_at = now();
END;
$$;

-- Backfill campaign highlights for live campaigns
INSERT INTO public.feed_items (
  source_type, source_id, user_id, coffee_shop_id, campaign_id,
  image_url, drink_type, campaign_slogan, city, latitude, longitude, published_at
)
SELECT
  'campaign_highlight',
  c.id,
  COALESCE(s.partner_id, s.id),
  s.id,
  c.id,
  COALESCE(c.cover_image_url, s.cover_image_url),
  c.reward_type,
  c.slogan,
  s.city,
  s.latitude,
  s.longitude,
  COALESCE(c.starts_at, c.created_at, now())
FROM public.campaigns c
JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
WHERE public._campaign_is_live(c)
  AND COALESCE(s.allow_feed_highlights, true)
ON CONFLICT (source_type, source_id, user_id) DO NOTHING;

-- ── Feed RPC ──
CREATE OR REPLACE FUNCTION public.get_explorer_feed(
  _filter text DEFAULT 'trending',
  _latitude double precision DEFAULT NULL,
  _longitude double precision DEFAULT NULL,
  _cursor timestamptz DEFAULT NULL,
  _limit int DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _viewer uuid := auth.uid();
  _rows jsonb;
BEGIN
  IF _viewer IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  _limit := LEAST(GREATEST(COALESCE(_limit, 20), 1), 50);

  WITH base AS (
    SELECT
      fi.*,
      p.display_name AS explorer_name,
      p.avatar_url AS explorer_avatar,
      p.handle AS explorer_handle,
      s.name AS shop_name,
      s.slug AS shop_slug,
      s.cover_image_url AS shop_cover_url,
      s.created_at AS shop_created_at,
      CASE
        WHEN _latitude IS NOT NULL AND _longitude IS NOT NULL
          AND fi.latitude IS NOT NULL AND fi.longitude IS NOT NULL
        THEN (
          6371 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians(_latitude)) * cos(radians(fi.latitude))
              * cos(radians(fi.longitude) - radians(_longitude))
              + sin(radians(_latitude)) * sin(radians(fi.latitude))
            ))
          )
        )
        ELSE NULL
      END AS distance_km,
      EXISTS (
        SELECT 1 FROM public.feed_item_likes l
        WHERE l.feed_item_id = fi.id AND l.user_id = _viewer
      ) AS liked_by_me,
      EXISTS (
        SELECT 1 FROM public.feed_item_saves sv
        WHERE sv.feed_item_id = fi.id AND sv.user_id = _viewer
      ) AS saved_by_me
    FROM public.feed_items fi
    LEFT JOIN public.profiles p ON p.id = fi.user_id
    LEFT JOIN public.coffee_shops s ON s.id = fi.coffee_shop_id
    WHERE (_cursor IS NULL OR fi.published_at < _cursor)
      AND (
        fi.source_type = 'campaign_highlight'
        OR (fi.source_type = 'social_proof')
        OR (fi.source_type IN ('user_moment', 'badge_unlock', 'trail_complete')
            AND public._user_shares_moments(fi.user_id))
      )
      AND (
        _filter <> 'friends'
        OR fi.user_id IN (SELECT friend_id FROM public._feed_friends_of(_viewer))
        OR fi.user_id = _viewer
      )
      AND (
        _filter <> 'coffee'
        OR fi.drink_type IN ('coffee', 'espresso', 'cappuccino')
      )
      AND (_filter <> 'matcha' OR fi.drink_type = 'matcha')
      AND (_filter <> 'ice_cream' OR fi.drink_type = 'ice_cream')
      AND (
        _filter <> 'new_cafes'
        OR (s.created_at IS NOT NULL AND s.created_at > now() - interval '60 days')
      )
  ),
  filtered AS (
    SELECT * FROM base
    WHERE _filter <> 'nearby'
      OR distance_km IS NULL
      OR distance_km <= 50
  ),
  ordered AS (
    SELECT * FROM filtered
    ORDER BY
      CASE WHEN _filter = 'nearby' AND distance_km IS NOT NULL THEN distance_km END ASC NULLS LAST,
      CASE WHEN _filter = 'trending' THEN (like_count + save_count) END DESC NULLS LAST,
      published_at DESC
    LIMIT _limit
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', o.id,
      'source_type', o.source_type,
      'user_id', o.user_id,
      'explorer_name', o.explorer_name,
      'explorer_avatar', o.explorer_avatar,
      'explorer_handle', o.explorer_handle,
      'coffee_shop_id', o.coffee_shop_id,
      'shop_name', o.shop_name,
      'shop_slug', o.shop_slug,
      'shop_cover_url', o.shop_cover_url,
      'campaign_id', o.campaign_id,
      'image_path', o.image_path,
      'image_bucket', o.image_bucket,
      'image_url', COALESCE(o.image_url, o.shop_cover_url),
      'drink_type', o.drink_type,
      'badge_slug', o.badge_slug,
      'badge_name', o.badge_name,
      'caption', o.caption,
      'campaign_slogan', o.campaign_slogan,
      'city', o.city,
      'distance_km', o.distance_km,
      'like_count', o.like_count,
      'save_count', o.save_count,
      'liked_by_me', o.liked_by_me,
      'saved_by_me', o.saved_by_me,
      'published_at', o.published_at
    ) ORDER BY
      CASE WHEN _filter = 'nearby' AND o.distance_km IS NOT NULL THEN o.distance_km END ASC NULLS LAST,
      CASE WHEN _filter = 'trending' THEN (o.like_count + o.save_count) END DESC NULLS LAST,
      o.published_at DESC
  ), '[]'::jsonb) INTO _rows FROM ordered o;

  RETURN _rows;
END;
$$;

CREATE OR REPLACE FUNCTION public.toggle_feed_like(_feed_item_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _liked boolean;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.feed_items WHERE id = _feed_item_id) THEN
    RAISE EXCEPTION 'Moment not found';
  END IF;

  IF EXISTS (SELECT 1 FROM public.feed_item_likes WHERE user_id = _user AND feed_item_id = _feed_item_id) THEN
    DELETE FROM public.feed_item_likes WHERE user_id = _user AND feed_item_id = _feed_item_id;
    UPDATE public.feed_items SET like_count = GREATEST(like_count - 1, 0) WHERE id = _feed_item_id;
    _liked := false;
  ELSE
    INSERT INTO public.feed_item_likes (user_id, feed_item_id) VALUES (_user, _feed_item_id);
    UPDATE public.feed_items SET like_count = like_count + 1 WHERE id = _feed_item_id;
    _liked := true;
  END IF;

  RETURN jsonb_build_object(
    'liked', _liked,
    'like_count', (SELECT like_count FROM public.feed_items WHERE id = _feed_item_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.toggle_feed_save(_feed_item_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _saved boolean;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.feed_items WHERE id = _feed_item_id) THEN
    RAISE EXCEPTION 'Moment not found';
  END IF;

  IF EXISTS (SELECT 1 FROM public.feed_item_saves WHERE user_id = _user AND feed_item_id = _feed_item_id) THEN
    DELETE FROM public.feed_item_saves WHERE user_id = _user AND feed_item_id = _feed_item_id;
    UPDATE public.feed_items SET save_count = GREATEST(save_count - 1, 0) WHERE id = _feed_item_id;
    _saved := false;
  ELSE
    INSERT INTO public.feed_item_saves (user_id, feed_item_id) VALUES (_user, _feed_item_id);
    UPDATE public.feed_items SET save_count = save_count + 1 WHERE id = _feed_item_id;
    _saved := true;
  END IF;

  RETURN jsonb_build_object(
    'saved', _saved,
    'save_count', (SELECT save_count FROM public.feed_items WHERE id = _feed_item_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_user_moment(
  _image_path text,
  _coffee_shop_id uuid DEFAULT NULL,
  _drink_type text DEFAULT NULL,
  _caption text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _moment_id uuid;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public._user_shares_moments(_user) THEN
    RAISE EXCEPTION 'Enable “Share moments publicly” in your profile privacy settings first';
  END IF;
  IF _image_path IS NULL OR trim(_image_path) = '' THEN
    RAISE EXCEPTION 'Image required';
  END IF;

  INSERT INTO public.user_moments (user_id, coffee_shop_id, image_path, drink_type, caption)
  VALUES (_user, _coffee_shop_id, trim(_image_path), NULLIF(trim(_drink_type), ''), NULLIF(trim(_caption), ''))
  RETURNING id INTO _moment_id;

  PERFORM public._sync_feed_user_moment(_moment_id);

  RETURN jsonb_build_object('moment_id', _moment_id);
END;
$$;

-- Patch social approval → feed sync
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

  PERFORM public._sync_feed_social_proof(_submission_id);

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

-- Patch badge grant → feed
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
    _result := jsonb_build_object('slug', _slug, 'name', _name, 'rarity', _rarity);
    RETURN _result;
  END IF;
  RETURN NULL;
END;
$$;

-- Patch trail complete → feed
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
        PERFORM public._sync_feed_badge_unlock(_user, _crawl.badge_slug, _badge.name);
      END IF;
    END IF;
  END IF;

  PERFORM public.evaluate_user_badges(_user, jsonb_build_object('source', 'trail_complete', 'crawl_id', _crawl_id));
  PERFORM public._sync_feed_trail_complete(_user, _crawl_id);

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

-- Patch submit_social_proof: public feed opt-in
CREATE OR REPLACE FUNCTION public.submit_social_proof(
  _campaign_id uuid,
  _platform text,
  _submission_type text,
  _url text DEFAULT NULL,
  _screenshot_path text DEFAULT NULL,
  _caption text DEFAULT NULL,
  _explorer_note text DEFAULT NULL,
  _voluntary_proof_confirmed boolean DEFAULT false,
  _public_feed_opt_in boolean DEFAULT false
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

  IF NOT COALESCE(_voluntary_proof_confirmed, false) THEN
    RAISE EXCEPTION 'Please confirm you are submitting proof voluntarily and understand the campaign requirements';
  END IF;

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
    user_id, campaign_id, coffee_shop_id, platform, submission_type, url, screenshot_path,
    caption, explorer_note, proof_consent_at, public_feed_opt_in, public_feed_opt_in_at
  ) VALUES (
    _user, _campaign_id, _c.shop_id, _platform, _submission_type,
    NULLIF(trim(_url), ''), NULLIF(trim(_screenshot_path), ''),
    NULLIF(trim(_caption), ''), NULLIF(trim(_explorer_note), ''), now(),
    COALESCE(_public_feed_opt_in, false),
    CASE WHEN COALESCE(_public_feed_opt_in, false) THEN now() ELSE NULL END
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

GRANT EXECUTE ON FUNCTION public.get_explorer_feed(text, double precision, double precision, timestamptz, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_feed_like(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_feed_save(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_user_moment(text, uuid, text, text) TO authenticated;
