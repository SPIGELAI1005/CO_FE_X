-- Partner: duplicate an existing campaign as a paused copy.

CREATE OR REPLACE FUNCTION public.partner_duplicate_campaign(_campaign_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _partner uuid := auth.uid();
  _c public.campaigns%ROWTYPE;
  _new_id uuid;
  _duration interval;
BEGIN
  IF _partner IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_role(_partner, 'partner') THEN RAISE EXCEPTION 'Partner access required'; END IF;

  SELECT c.* INTO _c
  FROM public.campaigns c
  JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
  WHERE c.id = _campaign_id AND s.partner_id = _partner;

  IF NOT FOUND THEN RAISE EXCEPTION 'Campaign not found'; END IF;

  _duration := COALESCE(_c.ends_at, now() + interval '14 days') - COALESCE(_c.starts_at, now());
  IF _duration < interval '1 day' THEN _duration := interval '14 days'; END IF;

  INSERT INTO public.campaigns (
    coffee_shop_id, title, slogan, description, reward_description, requirements,
    hashtag, hashtags, points_reward, max_participants, available_quantity,
    campaign_type, fulfillment_mode, social_requirements, auto_approve_social,
    reward_type, gifting_enabled, status, starts_at, ends_at, required_check_ins,
    terms_and_conditions, cover_image_url
  ) VALUES (
    _c.coffee_shop_id,
    left(_c.title || ' (Copy)', 120),
    COALESCE(_c.slogan, 'We give EEFFOC!'),
    _c.description,
    _c.reward_description,
    _c.requirements,
    _c.hashtag,
    _c.hashtags,
    _c.points_reward,
    _c.max_participants,
    _c.available_quantity,
    _c.campaign_type,
    _c.fulfillment_mode,
    COALESCE(_c.social_requirements, '{}'::jsonb),
    COALESCE(_c.auto_approve_social, false),
    COALESCE(_c.reward_type, 'coffee'),
    COALESCE(_c.gifting_enabled, true),
    'paused',
    now(),
    now() + _duration,
    COALESCE(_c.required_check_ins, 1),
    _c.terms_and_conditions,
    _c.cover_image_url
  )
  RETURNING id INTO _new_id;

  RETURN jsonb_build_object('id', _new_id, 'title', left(_c.title || ' (Copy)', 120));
END;
$$;

GRANT EXECUTE ON FUNCTION public.partner_duplicate_campaign(uuid) TO authenticated;
