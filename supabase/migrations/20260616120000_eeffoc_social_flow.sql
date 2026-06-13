-- EEFFOC social flow: fulfillment modes, social_submissions, participation QR, gated redeem

-- ============== CAMPAIGN FIELDS ==============
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS fulfillment_mode text NOT NULL DEFAULT 'check_in'
    CHECK (fulfillment_mode IN ('check_in', 'social_proof', 'hybrid')),
  ADD COLUMN IF NOT EXISTS social_requirements jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS participation_token text UNIQUE;

CREATE INDEX IF NOT EXISTS idx_campaigns_participation_token ON public.campaigns(participation_token)
  WHERE participation_token IS NOT NULL;

-- Backfill participation tokens for existing campaigns
UPDATE public.campaigns
SET participation_token = upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 10))
WHERE participation_token IS NULL;

ALTER TABLE public.campaigns
  ALTER COLUMN participation_token SET DEFAULT upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 10));

ALTER TABLE public.campaign_participants
  ADD COLUMN IF NOT EXISTS joined_source text;

CREATE OR REPLACE FUNCTION public.campaigns_set_participation_token()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.participation_token IS NULL OR NEW.participation_token = '' THEN
    NEW.participation_token := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_campaigns_participation_token ON public.campaigns;
CREATE TRIGGER trg_campaigns_participation_token
  BEFORE INSERT ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.campaigns_set_participation_token();

-- Template defaults
UPDATE public.campaigns SET fulfillment_mode = 'social_proof', social_requirements = jsonb_build_object(
  'platforms', jsonb_build_array('tiktok', 'instagram_post', 'instagram_story', 'facebook_post'),
  'caption_template', 'Just had an amazing coffee at {shop_name}! {hashtag}'
) WHERE campaign_type = 'social_story' AND fulfillment_mode = 'check_in';

-- ============== SOCIAL SUBMISSIONS ==============
CREATE TABLE IF NOT EXISTS public.social_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  coffee_shop_id uuid NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  platform text NOT NULL,
  submission_type text NOT NULL CHECK (submission_type IN ('link', 'screenshot')),
  url text,
  screenshot_path text,
  caption text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  review_notes text,
  points_awarded int,
  redemption_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Drop overly strict unique if re-run (pending only one per user/campaign)
ALTER TABLE public.social_submissions DROP CONSTRAINT IF EXISTS social_submissions_user_id_campaign_id_platform_status_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_social_submissions_one_pending
  ON public.social_submissions(user_id, campaign_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_social_submissions_campaign ON public.social_submissions(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_social_submissions_user ON public.social_submissions(user_id, created_at DESC);

ALTER TABLE public.social_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own social submissions" ON public.social_submissions;
CREATE POLICY "users read own social submissions" ON public.social_submissions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "partners read shop submissions" ON public.social_submissions;
CREATE POLICY "partners read shop submissions" ON public.social_submissions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.coffee_shops s
      WHERE s.id = social_submissions.coffee_shop_id AND s.partner_id = auth.uid()
    )
  );

GRANT SELECT ON public.social_submissions TO authenticated;
GRANT ALL ON public.social_submissions TO service_role;

-- Storage bucket for screenshots (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('social-proof', 'social-proof', false, 8388608, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "users upload own social proof" ON storage.objects;
CREATE POLICY "users upload own social proof" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'social-proof' AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "users read own social proof" ON storage.objects;
CREATE POLICY "users read own social proof" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'social-proof' AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "partners read social proof for their shops" ON storage.objects;
CREATE POLICY "partners read social proof for their shops" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'social-proof' AND EXISTS (
      SELECT 1 FROM public.coffee_shops s
      WHERE s.partner_id = auth.uid()
        AND (storage.foldername(name))[2] IN (
          SELECT c.id::text FROM public.campaigns c WHERE c.coffee_shop_id = s.id
        )
    )
  );

-- ============== submit_social_proof ==============
CREATE OR REPLACE FUNCTION public.submit_social_proof(
  _campaign_id uuid,
  _platform text,
  _submission_type text,
  _url text DEFAULT NULL,
  _screenshot_path text DEFAULT NULL,
  _caption text DEFAULT NULL
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
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _submission_type NOT IN ('link', 'screenshot') THEN RAISE EXCEPTION 'Invalid submission type'; END IF;
  IF _submission_type = 'link' AND (_url IS NULL OR trim(_url) = '') THEN
    RAISE EXCEPTION 'Post URL required';
  END IF;
  IF _submission_type = 'screenshot' AND (_screenshot_path IS NULL OR trim(_screenshot_path) = '') THEN
    RAISE EXCEPTION 'Screenshot required';
  END IF;

  SELECT c.*, s.id AS shop_id INTO _c
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
    user_id, campaign_id, coffee_shop_id, platform, submission_type, url, screenshot_path, caption
  ) VALUES (
    _user, _campaign_id, _c.shop_id, _platform, _submission_type,
    NULLIF(trim(_url), ''), NULLIF(trim(_screenshot_path), ''), NULLIF(trim(_caption), '')
  )
  RETURNING id INTO _sub_id;

  IF _c.partner_id IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, type, title, body, link, payload) VALUES (
      (SELECT partner_id FROM public.coffee_shops WHERE id = _c.shop_id),
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

REVOKE ALL ON FUNCTION public.submit_social_proof(uuid, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_social_proof(uuid, text, text, text, text, text) TO authenticated;

-- ============== join_campaign with source tracking ==============
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
  _inserted boolean;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT c.*, s.partner_id AS partner_id, s.name AS shop_name INTO _c
  FROM public.campaigns c JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
  WHERE c.id = _campaign_id AND c.status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Campaign not available'; END IF;
  IF _c.ends_at IS NOT NULL AND _c.ends_at < now() THEN RAISE EXCEPTION 'Campaign has ended'; END IF;

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
  GET DIAGNOSTICS _inserted = ROW_COUNT;

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

-- ============== redeem_campaign — gated by fulfillment_mode ==============
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
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT c.*, s.partner_id AS partner_id, s.name AS shop_name INTO _c
  FROM public.campaigns c JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
  WHERE c.id = _campaign_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Campaign not found'; END IF;

  IF COALESCE(_c.fulfillment_mode, 'check_in') = 'social_proof' THEN
    RAISE EXCEPTION 'This campaign unlocks via social post approval — submit your proof and wait for café review';
  END IF;

  SELECT * INTO _existing FROM public.campaign_redemptions WHERE campaign_id = _campaign_id AND user_id = _user;
  IF FOUND THEN
    RETURN jsonb_build_object('already_redeemed', true, 'redemption_code', _existing.redemption_code, 'points_awarded', _existing.points_awarded);
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

  INSERT INTO public.campaign_redemptions (campaign_id, user_id, points_awarded)
    VALUES (_campaign_id, _user, COALESCE(_c.points_reward, 0)) RETURNING redemption_code INTO _new_code;

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
    '/campaign/' || _campaign_id::text, jsonb_build_object('campaign_id', _campaign_id, 'code', _new_code));

  RETURN jsonb_build_object('redeemed', true, 'redemption_code', _new_code, 'points_awarded', COALESCE(_c.points_reward, 0));
END;
$$;

-- ============== review_social_submission — hybrid check-in gate ==============
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
  _new_code text;
  _existing_redemption record;
  _points int := 0;
  _check_ins int;
BEGIN
  IF _partner IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _decision NOT IN ('approved', 'rejected') THEN RAISE EXCEPTION 'Invalid decision'; END IF;
  SELECT ss.*, s.partner_id, s.name AS shop_name INTO _sub
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
    INSERT INTO public.notifications(user_id, type, title, body, link, payload) VALUES (
      _sub.user_id, 'submission_rejected', 'Submission needs another try',
      'Your post for "' || _c.title || '" wasn''t approved.' || COALESCE(' ' || _notes, ''),
      '/campaign/' || _sub.campaign_id::text, jsonb_build_object('submission_id', _submission_id));
    RETURN jsonb_build_object('status', 'rejected');
  END IF;

  IF COALESCE(_c.fulfillment_mode, 'check_in') = 'hybrid' THEN
    SELECT COUNT(*) INTO _check_ins FROM public.check_ins
    WHERE user_id = _sub.user_id AND coffee_shop_id = _c.coffee_shop_id;
    IF _check_ins < GREATEST(COALESCE(_c.required_check_ins, 1), 1) THEN
      RAISE EXCEPTION 'Explorer must check in before social approval';
    END IF;
  END IF;

  INSERT INTO public.campaign_participants(campaign_id, user_id) VALUES (_sub.campaign_id, _sub.user_id) ON CONFLICT DO NOTHING;
  _points := COALESCE(_c.points_reward, 0);

  SELECT * INTO _existing_redemption FROM public.campaign_redemptions
  WHERE campaign_id = _sub.campaign_id AND user_id = _sub.user_id;

  IF _existing_redemption.id IS NULL THEN
    INSERT INTO public.campaign_redemptions(campaign_id, user_id, points_awarded)
      VALUES (_sub.campaign_id, _sub.user_id, _points) RETURNING redemption_code INTO _new_code;
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

  RETURN jsonb_build_object('status', 'approved', 'redemption_code', _new_code, 'points_awarded', _points + 25);
END;
$$;

-- Resolve campaign by participation token (for QR deep links)
CREATE OR REPLACE FUNCTION public.get_campaign_by_token(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _c record;
BEGIN
  SELECT c.id, c.title, c.status, c.ends_at, c.fulfillment_mode, s.slug AS shop_slug, s.name AS shop_name
  INTO _c
  FROM public.campaigns c
  JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
  WHERE c.participation_token = upper(trim(_token));
  IF NOT FOUND THEN RETURN jsonb_build_object('found', false); END IF;
  RETURN jsonb_build_object(
    'found', true,
    'campaign_id', _c.id,
    'title', _c.title,
    'status', _c.status,
    'ends_at', _c.ends_at,
    'fulfillment_mode', _c.fulfillment_mode,
    'shop_slug', _c.shop_slug,
    'shop_name', _c.shop_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_campaign_by_token(text) TO authenticated, anon;
