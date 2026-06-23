-- Campaign wizard: daily limits, active hours, extended partner update

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS daily_redemption_limit integer,
  ADD COLUMN IF NOT EXISTS active_hours jsonb;

COMMENT ON COLUMN public.campaigns.daily_redemption_limit IS 'Max redemptions per calendar day; NULL = no daily cap';
COMMENT ON COLUMN public.campaigns.active_hours IS 'Optional daily window e.g. {"start":"15:00","end":"17:00"}';

ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_daily_redemption_limit_check;
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_daily_redemption_limit_check
  CHECK (daily_redemption_limit IS NULL OR daily_redemption_limit > 0);

-- Extend partner partial update for wizard fields
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
    hashtags = CASE WHEN _patch ? 'hashtags' THEN
      ARRAY(SELECT jsonb_array_elements_text(_patch->'hashtags')) ELSE hashtags END,
    points_reward = COALESCE((_patch->>'points_reward')::int, points_reward),
    max_participants = CASE WHEN _patch ? 'max_participants' THEN (_patch->>'max_participants')::int ELSE max_participants END,
    available_quantity = CASE WHEN _patch ? 'available_quantity' THEN (_patch->>'available_quantity')::int
      WHEN _patch ? 'max_participants' THEN (_patch->>'max_participants')::int ELSE available_quantity END,
    reward_type = COALESCE(_patch->>'reward_type', reward_type),
    reward_quantity = COALESCE((_patch->>'reward_quantity')::int, reward_quantity),
    daily_redemption_limit = CASE WHEN _patch ? 'daily_redemption_limit' THEN
      NULLIF((_patch->>'daily_redemption_limit')::int, 0) ELSE daily_redemption_limit END,
    active_hours = CASE WHEN _patch ? 'active_hours' THEN _patch->'active_hours' ELSE active_hours END,
    terms_and_conditions = CASE WHEN _patch ? 'terms_and_conditions' THEN NULLIF(_patch->>'terms_and_conditions', '')
      ELSE terms_and_conditions END,
    starts_at = CASE WHEN _patch ? 'starts_at' THEN (_patch->>'starts_at')::timestamptz ELSE starts_at END,
    ends_at = CASE WHEN _patch ? 'ends_at' THEN (_patch->>'ends_at')::timestamptz ELSE ends_at END,
    status = CASE WHEN _participants = 0 AND _patch ? 'status' THEN _patch->>'status' ELSE status END,
    auto_approve_social = CASE WHEN _patch ? 'auto_approve_social' THEN (_patch->>'auto_approve_social')::boolean ELSE auto_approve_social END,
    fulfillment_mode = CASE WHEN _participants = 0 AND _patch ? 'fulfillment_mode' THEN _patch->>'fulfillment_mode' ELSE fulfillment_mode END,
    social_requirements = CASE WHEN _participants = 0 AND _patch ? 'social_requirements' THEN _patch->'social_requirements' ELSE social_requirements END
  WHERE id = _campaign_id;

  RETURN jsonb_build_object('campaign_id', _campaign_id, 'updated', true);
END;
$$;
