-- Integration: bridge partner plans + shop Stripe subscriptions (Option C),
-- public SEO policies for reviews & shop images.

-- ---------------------------------------------------------------------------
-- 1. Public SEO: anon can read reviews on approved cafés
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Reviews readable by authenticated" ON public.reviews;
DROP POLICY IF EXISTS "Reviews public" ON public.reviews;
DROP POLICY IF EXISTS "Reviews readable for approved shops (public SEO)" ON public.reviews;

CREATE POLICY "Reviews readable by authenticated"
  ON public.reviews FOR SELECT TO authenticated USING (true);

CREATE POLICY "Reviews readable for approved shops (public SEO)"
  ON public.reviews FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.coffee_shops s
      WHERE s.id = reviews.coffee_shop_id AND s.status = 'approved'
    )
  );

-- Marketing images on public shop pages (covers / gallery)
DROP POLICY IF EXISTS "Partners read own shop-images" ON storage.objects;
DROP POLICY IF EXISTS "Public read shop marketing images" ON storage.objects;
DROP POLICY IF EXISTS "Partners upload own shop-images" ON storage.objects;
DROP POLICY IF EXISTS "Partners update own shop-images" ON storage.objects;
DROP POLICY IF EXISTS "Partners delete own shop-images" ON storage.objects;

CREATE POLICY "Public read shop marketing images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'shop-images');

CREATE POLICY "Partners upload own shop-images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'shop-images'
    AND public.has_role(auth.uid(), 'partner'::app_role)
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Partners update own shop-images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'shop-images' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'shop-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Partners delete own shop-images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'shop-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- 2. Billing bridge: partner plans (subscriptions/plans) + shop_subscriptions
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_partner_unique
  ON public.subscriptions (partner_id);

ALTER TABLE public.shop_subscriptions
  ADD COLUMN IF NOT EXISTS partner_subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.partner_plan_row(_partner uuid)
RETURNS TABLE(plan_code text, max_shops int, max_campaigns_per_month int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.code, p.max_shops, p.max_campaigns_per_month
  FROM public.subscriptions s
  JOIN public.plans p ON p.id = s.plan_id
  WHERE s.partner_id = _partner
    AND s.status IN ('trialing', 'active')
  ORDER BY p.sort_order DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.partner_has_shop_stripe_pro(_partner uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.coffee_shops s
    JOIN public.shop_subscriptions ss ON ss.coffee_shop_id = s.id
    WHERE s.partner_id = _partner
      AND ss.plan = 'pro'
      AND ss.status IN ('active', 'trialing')
  );
$$;

CREATE OR REPLACE FUNCTION public.effective_shop_plan(_shop_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _shop_plan text;
  _partner uuid;
  _partner_code text;
BEGIN
  SELECT ss.plan INTO _shop_plan
  FROM public.shop_subscriptions ss
  WHERE ss.coffee_shop_id = _shop_id
    AND ss.status IN ('active', 'trialing')
  LIMIT 1;

  IF _shop_plan IN ('pro', 'campaign_boost') THEN
    RETURN _shop_plan;
  END IF;

  SELECT partner_id INTO _partner FROM public.coffee_shops WHERE id = _shop_id;

  IF _partner IS NOT NULL THEN
    SELECT plan_code INTO _partner_code FROM public.partner_plan_row(_partner);
    IF _partner_code = 'pro' THEN
      RETURN 'pro';
    END IF;
    IF _partner_code = 'growth' AND COALESCE(_shop_plan, 'listing') = 'listing' THEN
      RETURN 'campaign_boost';
    END IF;
  END IF;

  RETURN COALESCE(_shop_plan, 'listing');
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_partner_shop_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _shop_count int;
  _max_shops int;
  _partner_code text;
BEGIN
  IF NEW.partner_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.partner_has_shop_stripe_pro(NEW.partner_id) THEN
    RETURN NEW;
  END IF;

  SELECT plan_code, max_shops INTO _partner_code, _max_shops
  FROM public.partner_plan_row(NEW.partner_id);

  IF _partner_code = 'pro' OR _max_shops IS NULL THEN
    RETURN NEW;
  END IF;

  _max_shops := COALESCE(_max_shops, 1);

  SELECT COUNT(*) INTO _shop_count
  FROM public.coffee_shops
  WHERE partner_id = NEW.partner_id
    AND id IS DISTINCT FROM COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF _shop_count >= _max_shops THEN
    RAISE EXCEPTION 'Plan limit: % plan allows % shop listing(s). Upgrade at /partner/billing.', COALESCE(_partner_code, 'starter'), _max_shops;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_partner_subscription_from_shop(
  _shop_id uuid,
  _shop_plan text,
  _stripe_customer_id text DEFAULT NULL,
  _stripe_subscription_id text DEFAULT NULL,
  _status text DEFAULT 'active'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _partner uuid;
  _plan_id uuid;
  _partner_plan_code text;
  _sub_id uuid;
BEGIN
  SELECT partner_id INTO _partner FROM public.coffee_shops WHERE id = _shop_id;
  IF _partner IS NULL THEN
    RETURN;
  END IF;

  _partner_plan_code := CASE
    WHEN _shop_plan = 'pro' THEN 'pro'
    WHEN _shop_plan = 'campaign_boost' THEN 'growth'
    ELSE 'starter'
  END;

  SELECT id INTO _plan_id FROM public.plans WHERE code = _partner_plan_code LIMIT 1;
  IF _plan_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.subscriptions (
    partner_id, plan_id, status, stripe_customer_id, stripe_subscription_id,
    current_period_start, current_period_end
  )
  VALUES (
    _partner, _plan_id, _status, _stripe_customer_id, _stripe_subscription_id,
    now(), now() + interval '1 month'
  )
  ON CONFLICT (partner_id) DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    status = EXCLUDED.status,
    stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, subscriptions.stripe_customer_id),
    stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, subscriptions.stripe_subscription_id),
    current_period_end = EXCLUDED.current_period_end,
    updated_at = now()
  RETURNING id INTO _sub_id;

  UPDATE public.shop_subscriptions
  SET partner_subscription_id = _sub_id
  WHERE coffee_shop_id = _shop_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_partner_subscription_from_shop(uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_partner_subscription_from_shop(uuid, text, text, text, text) TO service_role;
