-- Partner next steps: campaign lifecycle, auto-approve social, shop delete

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS auto_approve_social boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.campaigns.auto_approve_social IS
  'When true, social submissions are approved automatically on submit (trusted partners / low-risk campaigns).';

-- Internal approval helper (used by manual review + auto-approve on submit)
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

-- Refactor review_social_submission to use internal helper
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
    INSERT INTO public.notifications(user_id, type, title, body, link, payload) VALUES (
      _sub.user_id, 'submission_rejected', 'Submission needs another try',
      'Your post for "' || _c.title || '" wasn''t approved.' || COALESCE(' ' || _notes, ''),
      '/campaign/' || _sub.campaign_id::text, jsonb_build_object('submission_id', _submission_id));
    RETURN jsonb_build_object('status', 'rejected');
  END IF;

  RETURN public._approve_social_submission_internal(_submission_id, _notes);
END;
$$;

-- Auto-approve on submit when campaign flag is set
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
    user_id, campaign_id, coffee_shop_id, platform, submission_type, url, screenshot_path, caption
  ) VALUES (
    _user, _campaign_id, _c.shop_id, _platform, _submission_type,
    NULLIF(trim(_url), ''), NULLIF(trim(_screenshot_path), ''), NULLIF(trim(_caption), '')
  )
  RETURNING id INTO _sub_id;

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

-- Partner campaign status (pause / resume / end)
CREATE OR REPLACE FUNCTION public.partner_set_campaign_status(_campaign_id uuid, _status text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _partner uuid := auth.uid();
  _c record;
  _active int;
  _limits record;
BEGIN
  IF _partner IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_role(_partner, 'partner') THEN RAISE EXCEPTION 'Partner access required'; END IF;
  IF _status NOT IN ('active', 'paused', 'ended') THEN RAISE EXCEPTION 'Invalid status'; END IF;

  SELECT c.*, s.partner_id INTO _c
  FROM public.campaigns c
  JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
  WHERE c.id = _campaign_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Campaign not found'; END IF;
  IF _c.partner_id <> _partner THEN RAISE EXCEPTION 'Not your campaign'; END IF;

  IF _status = 'active' AND _c.status <> 'active' THEN
    SELECT COUNT(*) INTO _active
    FROM public.campaigns c2
    WHERE c2.coffee_shop_id = _c.coffee_shop_id AND c2.status = 'active' AND c2.id <> _campaign_id
      AND (c2.ends_at IS NULL OR c2.ends_at > now());
    -- plan limit enforced by trigger on UPDATE status
  END IF;

  UPDATE public.campaigns
  SET status = _status,
      ends_at = CASE WHEN _status = 'ended' THEN COALESCE(ends_at, now()) ELSE ends_at END
  WHERE id = _campaign_id;

  RETURN jsonb_build_object('campaign_id', _campaign_id, 'status', _status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.partner_set_campaign_status(uuid, text) TO authenticated;

-- Partner partial campaign update
CREATE OR REPLACE FUNCTION public.partner_update_campaign(_campaign_id uuid, _patch jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _partner uuid := auth.uid();
  _c record;
  _participants int;
  _new_max int;
  _new_points int;
  _new_ends timestamptz;
BEGIN
  IF _partner IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT c.*, s.partner_id INTO _c
  FROM public.campaigns c JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
  WHERE c.id = _campaign_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Campaign not found'; END IF;
  IF _c.partner_id <> _partner THEN RAISE EXCEPTION 'Not your campaign'; END IF;

  SELECT COUNT(*) INTO _participants FROM public.campaign_participants WHERE campaign_id = _campaign_id;

  IF _participants > 0 AND _patch ? 'fulfillment_mode' THEN
    RAISE EXCEPTION 'Fulfillment mode cannot change after explorers have joined';
  END IF;

  IF _patch ? 'max_participants' THEN
    _new_max := (_patch->>'max_participants')::int;
    IF _participants > 0 AND _c.max_participants IS NOT NULL AND _new_max < _c.max_participants THEN
      RAISE EXCEPTION 'Participant cap can only be increased on a live campaign';
    END IF;
    IF _new_max < _participants THEN
      RAISE EXCEPTION 'Participant cap cannot be below current join count';
    END IF;
  END IF;

  IF _patch ? 'points_reward' AND _participants > 0 THEN
    _new_points := (_patch->>'points_reward')::int;
    IF _new_points < _c.points_reward THEN
      RAISE EXCEPTION 'Bonus points can only be increased after explorers have joined';
    END IF;
  END IF;

  IF _patch ? 'ends_at' AND _participants > 0 AND _c.ends_at IS NOT NULL THEN
    _new_ends := (_patch->>'ends_at')::timestamptz;
    IF _new_ends < _c.ends_at THEN
      RAISE EXCEPTION 'End date can only be extended on a live campaign';
    END IF;
  END IF;

  UPDATE public.campaigns SET
    title = COALESCE(_patch->>'title', title),
    description = COALESCE(_patch->>'description', description),
    reward_description = COALESCE(_patch->>'reward_description', reward_description),
    requirements = CASE WHEN _patch ? 'requirements' THEN NULLIF(_patch->>'requirements', '') ELSE requirements END,
    hashtag = COALESCE(_patch->>'hashtag', hashtag),
    points_reward = COALESCE((_patch->>'points_reward')::int, points_reward),
    max_participants = CASE WHEN _patch ? 'max_participants' THEN (_patch->>'max_participants')::int ELSE max_participants END,
    ends_at = CASE WHEN _patch ? 'ends_at' THEN (_patch->>'ends_at')::timestamptz ELSE ends_at END,
    auto_approve_social = CASE WHEN _patch ? 'auto_approve_social' THEN (_patch->>'auto_approve_social')::boolean ELSE auto_approve_social END,
    fulfillment_mode = CASE WHEN _participants = 0 AND _patch ? 'fulfillment_mode' THEN _patch->>'fulfillment_mode' ELSE fulfillment_mode END
  WHERE id = _campaign_id;

  RETURN jsonb_build_object('campaign_id', _campaign_id, 'updated', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.partner_update_campaign(uuid, jsonb) TO authenticated;

-- Partner delete shop (must have no active campaigns)
CREATE OR REPLACE FUNCTION public.partner_delete_shop(_shop_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _partner uuid := auth.uid();
  _active int;
BEGIN
  IF _partner IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.coffee_shops WHERE id = _shop_id AND partner_id = _partner) THEN
    RAISE EXCEPTION 'Shop not found';
  END IF;

  SELECT COUNT(*) INTO _active FROM public.campaigns
  WHERE coffee_shop_id = _shop_id AND status = 'active'
    AND (ends_at IS NULL OR ends_at > now());
  IF _active > 0 THEN
    RAISE EXCEPTION 'End or pause active campaigns before deleting this shop';
  END IF;

  DELETE FROM public.coffee_shops WHERE id = _shop_id AND partner_id = _partner;
  IF NOT FOUND THEN RAISE EXCEPTION 'Could not delete shop'; END IF;

  RETURN jsonb_build_object('deleted', true, 'shop_id', _shop_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.partner_delete_shop(uuid) TO authenticated;
