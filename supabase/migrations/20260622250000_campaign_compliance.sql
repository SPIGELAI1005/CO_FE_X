-- Campaign compliance: terms acceptance, disclosure acknowledgment, voluntary proof consent

ALTER TABLE public.campaign_participants
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS disclosure_acknowledged_at timestamptz;

ALTER TABLE public.social_submissions
  ADD COLUMN IF NOT EXISTS proof_consent_at timestamptz;

COMMENT ON COLUMN public.campaign_participants.terms_accepted_at IS 'Explorer accepted platform + café campaign terms';
COMMENT ON COLUMN public.campaign_participants.disclosure_acknowledged_at IS 'Explorer acknowledged paid/sponsored post disclosure duty';
COMMENT ON COLUMN public.social_submissions.proof_consent_at IS 'Explorer confirmed voluntary proof submission';

CREATE OR REPLACE FUNCTION public.join_campaign(
  _campaign_id uuid,
  _join_source text DEFAULT NULL,
  _terms_accepted boolean DEFAULT false,
  _disclosure_acknowledged boolean DEFAULT false
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
  _needs_disclosure boolean;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM public._assert_user_not_restricted(_user);

  IF NOT COALESCE(_terms_accepted, false) THEN
    RAISE EXCEPTION 'You must accept the campaign terms before joining';
  END IF;

  SELECT c.*, s.partner_id AS partner_id, s.name AS shop_name INTO _c
  FROM public.campaigns c JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
  WHERE c.id = _campaign_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Campaign not found'; END IF;

  _needs_disclosure := COALESCE(_c.fulfillment_mode, 'check_in') IN ('social_proof', 'hybrid');
  IF _needs_disclosure AND NOT COALESCE(_disclosure_acknowledged, false) THEN
    RAISE EXCEPTION 'You must acknowledge advertising disclosure requirements for this social campaign';
  END IF;

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

  INSERT INTO public.campaign_participants (
    campaign_id, user_id, joined_source, terms_accepted_at, disclosure_acknowledged_at
  )
  VALUES (
    _campaign_id,
    _user,
    NULLIF(trim(_join_source), ''),
    now(),
    CASE WHEN _needs_disclosure AND COALESCE(_disclosure_acknowledged, false) THEN now() ELSE NULL END
  )
  ON CONFLICT (campaign_id, user_id) DO UPDATE
    SET joined_source = COALESCE(EXCLUDED.joined_source, campaign_participants.joined_source),
        terms_accepted_at = COALESCE(campaign_participants.terms_accepted_at, EXCLUDED.terms_accepted_at),
        disclosure_acknowledged_at = COALESCE(
          campaign_participants.disclosure_acknowledged_at,
          EXCLUDED.disclosure_acknowledged_at
        );

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

-- Patch submit_social_proof: voluntary proof consent
CREATE OR REPLACE FUNCTION public.submit_social_proof(
  _campaign_id uuid,
  _platform text,
  _submission_type text,
  _url text DEFAULT NULL,
  _screenshot_path text DEFAULT NULL,
  _caption text DEFAULT NULL,
  _explorer_note text DEFAULT NULL,
  _voluntary_proof_confirmed boolean DEFAULT false
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
    user_id, campaign_id, coffee_shop_id, platform, submission_type, url, screenshot_path, caption, explorer_note, proof_consent_at
  ) VALUES (
    _user, _campaign_id, _c.shop_id, _platform, _submission_type,
    NULLIF(trim(_url), ''), NULLIF(trim(_screenshot_path), ''), NULLIF(trim(_caption), ''),
    NULLIF(trim(_explorer_note), ''), now()
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
