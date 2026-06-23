-- Social post assistant: optional explorer note on proof submissions.

ALTER TABLE public.social_submissions
  ADD COLUMN IF NOT EXISTS explorer_note text;

COMMENT ON COLUMN public.social_submissions.explorer_note IS
  'Optional note from explorer when submitting proof (e.g. private account, story highlight).';

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
