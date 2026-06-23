-- Digital passport: collectible stamps created when campaign rewards are redeemed at counter.

CREATE TABLE IF NOT EXISTS public.passport_stamps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  redemption_id uuid NOT NULL UNIQUE REFERENCES public.campaign_redemptions(id) ON DELETE CASCADE,
  coffee_shop_id uuid NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  campaign_title text NOT NULL,
  reward_type text NOT NULL DEFAULT 'coffee',
  stamp_category text NOT NULL DEFAULT 'coffee',
  stamp_variant smallint NOT NULL DEFAULT 1 CHECK (stamp_variant BETWEEN 1 AND 6),
  shop_name text NOT NULL,
  shop_logo_url text,
  city text,
  country text,
  earned_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_passport_stamps_user_earned
  ON public.passport_stamps (user_id, earned_at DESC);

CREATE INDEX IF NOT EXISTS idx_passport_stamps_user_category
  ON public.passport_stamps (user_id, stamp_category);

ALTER TABLE public.passport_stamps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own passport stamps" ON public.passport_stamps;
CREATE POLICY "users read own passport stamps" ON public.passport_stamps
  FOR SELECT TO authenticated USING (user_id = auth.uid());

GRANT SELECT ON public.passport_stamps TO authenticated;
GRANT ALL ON public.passport_stamps TO service_role;

CREATE OR REPLACE FUNCTION public.resolve_passport_stamp_category(
  _reward_type text,
  _campaign_type text,
  _fulfillment_mode text,
  _shop_tags text[],
  _ends_at timestamptz
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _reward_type = 'matcha' THEN 'matcha'
    WHEN _reward_type = 'ice_cream' THEN 'ice_cream'
    WHEN _reward_type IN ('juice', 'cola') THEN 'juice'
    WHEN lower(COALESCE(_campaign_type, '')) IN ('seasonal', 'limited', 'holiday') THEN 'seasonal'
    WHEN _ends_at IS NOT NULL AND _ends_at > now() - interval '90 days' AND _ends_at < now() + interval '14 days' THEN 'seasonal'
    WHEN _shop_tags IS NOT NULL AND ('hidden-gem' = ANY(_shop_tags) OR 'hidden_gem' = ANY(_shop_tags)) THEN 'hidden_gem'
    WHEN COALESCE(_fulfillment_mode, 'check_in') IN ('social_proof', 'hybrid') THEN 'local_hero'
    ELSE 'coffee'
  END;
$$;

CREATE OR REPLACE FUNCTION public.create_passport_stamp_from_redemption()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _c record;
  _s record;
  _category text;
  _variant smallint;
BEGIN
  IF NEW.used_at IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.used_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT c.title, c.reward_type, c.campaign_type, c.fulfillment_mode, c.ends_at, c.coffee_shop_id
    INTO _c
    FROM public.campaigns c
   WHERE c.id = NEW.campaign_id;

  SELECT s.name, s.logo_url, s.city, s.country, s.tags
    INTO _s
    FROM public.coffee_shops s
   WHERE s.id = _c.coffee_shop_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  _category := public.resolve_passport_stamp_category(
    COALESCE(_c.reward_type, 'coffee'),
    _c.campaign_type,
    _c.fulfillment_mode,
    _s.tags,
    _c.ends_at
  );

  _variant := ((abs(hashtext(NEW.id::text)) % 6) + 1)::smallint;

  INSERT INTO public.passport_stamps (
    user_id, campaign_id, redemption_id, coffee_shop_id,
    campaign_title, reward_type, stamp_category, stamp_variant,
    shop_name, shop_logo_url, city, country, earned_at
  ) VALUES (
    NEW.user_id, NEW.campaign_id, NEW.id, _c.coffee_shop_id,
    _c.title, COALESCE(_c.reward_type, 'coffee'), _category, _variant,
    _s.name, _s.logo_url, _s.city, _s.country, COALESCE(NEW.used_at, now())
  )
  ON CONFLICT (redemption_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_passport_stamp_on_campaign_redeem ON public.campaign_redemptions;
CREATE TRIGGER trg_passport_stamp_on_campaign_redeem
  AFTER INSERT OR UPDATE OF used_at ON public.campaign_redemptions
  FOR EACH ROW
  WHEN (NEW.used_at IS NOT NULL)
  EXECUTE FUNCTION public.create_passport_stamp_from_redemption();

-- Backfill stamps for already-redeemed rewards
INSERT INTO public.passport_stamps (
  user_id, campaign_id, redemption_id, coffee_shop_id,
  campaign_title, reward_type, stamp_category, stamp_variant,
  shop_name, shop_logo_url, city, country, earned_at
)
SELECT
  cr.user_id,
  cr.campaign_id,
  cr.id,
  c.coffee_shop_id,
  c.title,
  COALESCE(c.reward_type, 'coffee'),
  public.resolve_passport_stamp_category(
    COALESCE(c.reward_type, 'coffee'),
    c.campaign_type,
    c.fulfillment_mode,
    s.tags,
    c.ends_at
  ),
  ((abs(hashtext(cr.id::text)) % 6) + 1)::smallint,
  s.name,
  s.logo_url,
  s.city,
  s.country,
  cr.used_at
FROM public.campaign_redemptions cr
JOIN public.campaigns c ON c.id = cr.campaign_id
JOIN public.coffee_shops s ON s.id = c.coffee_shop_id
WHERE cr.used_at IS NOT NULL
ON CONFLICT (redemption_id) DO NOTHING;
