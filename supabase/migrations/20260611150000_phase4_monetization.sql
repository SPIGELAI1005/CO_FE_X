-- Phase 4: partner subscriptions + plan enforcement

CREATE TABLE IF NOT EXISTS public.shop_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coffee_shop_id uuid REFERENCES public.coffee_shops(id) ON DELETE CASCADE NOT NULL UNIQUE,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text NOT NULL DEFAULT 'listing' CHECK (plan IN ('listing', 'pro', 'campaign_boost')),
  status text NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'incomplete')),
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_subscriptions_plan_status
  ON public.shop_subscriptions (plan, status);

GRANT SELECT ON public.shop_subscriptions TO authenticated;
GRANT ALL ON public.shop_subscriptions TO service_role;
ALTER TABLE public.shop_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners read own shop subscriptions"
  ON public.shop_subscriptions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coffee_shops s
      WHERE s.id = shop_subscriptions.coffee_shop_id
        AND s.partner_id = auth.uid()
    )
  );

CREATE POLICY "Admins manage shop subscriptions"
  ON public.shop_subscriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER shop_subscriptions_updated_at
  BEFORE UPDATE ON public.shop_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.effective_shop_plan(_shop_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT ss.plan
      FROM public.shop_subscriptions ss
      WHERE ss.coffee_shop_id = _shop_id
        AND ss.status IN ('active', 'trialing')
      LIMIT 1
    ),
    'listing'
  );
$$;

CREATE OR REPLACE FUNCTION public.enforce_campaign_plan_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plan text;
  _active int;
  _max int;
BEGIN
  IF NEW.status IS DISTINCT FROM 'active' THEN
    RETURN NEW;
  END IF;

  _plan := public.effective_shop_plan(NEW.coffee_shop_id);

  IF _plan = 'listing' THEN
    _max := 1;
  ELSIF _plan = 'campaign_boost' THEN
    _max := 5;
  ELSE
    _max := NULL;
  END IF;

  IF _max IS NOT NULL THEN
    SELECT COUNT(*) INTO _active
    FROM public.campaigns c
    WHERE c.coffee_shop_id = NEW.coffee_shop_id
      AND c.status = 'active'
      AND (c.ends_at IS NULL OR c.ends_at > now())
      AND c.id IS DISTINCT FROM NEW.id;

    IF _active >= _max THEN
      RAISE EXCEPTION 'Plan limit: % plan allows % active campaign(s). Upgrade at /partner/billing.', _plan, _max;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_campaign_plan_limit_trg ON public.campaigns;
CREATE TRIGGER enforce_campaign_plan_limit_trg
  BEFORE INSERT OR UPDATE OF status ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.enforce_campaign_plan_limit();

CREATE OR REPLACE FUNCTION public.enforce_partner_shop_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _shop_count int;
  _has_pro boolean;
BEGIN
  IF NEW.partner_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.coffee_shops s
    JOIN public.shop_subscriptions ss ON ss.coffee_shop_id = s.id
    WHERE s.partner_id = NEW.partner_id
      AND ss.plan = 'pro'
      AND ss.status IN ('active', 'trialing')
  ) INTO _has_pro;

  IF _has_pro THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO _shop_count
  FROM public.coffee_shops
  WHERE partner_id = NEW.partner_id
    AND id IS DISTINCT FROM COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF _shop_count >= 1 THEN
    RAISE EXCEPTION 'Free plan allows 1 listing. Upgrade to Pro at /partner/billing for multiple locations.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_partner_shop_limit_trg ON public.coffee_shops;
CREATE TRIGGER enforce_partner_shop_limit_trg
  BEFORE INSERT ON public.coffee_shops
  FOR EACH ROW EXECUTE FUNCTION public.enforce_partner_shop_limit();

CREATE OR REPLACE FUNCTION public.ensure_shop_subscription_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.shop_subscriptions (coffee_shop_id, plan, status)
  VALUES (NEW.id, 'listing', 'trialing')
  ON CONFLICT (coffee_shop_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_shop_subscription_row_trg ON public.coffee_shops;
CREATE TRIGGER ensure_shop_subscription_row_trg
  AFTER INSERT ON public.coffee_shops
  FOR EACH ROW EXECUTE FUNCTION public.ensure_shop_subscription_row();
