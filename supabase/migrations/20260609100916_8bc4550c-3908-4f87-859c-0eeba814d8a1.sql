
-- ============== LEDGER ==============
CREATE TABLE public.points_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta int NOT NULL,
  balance_after int NOT NULL,
  source text NOT NULL,
  ref_id uuid,
  ref_table text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ledger_user ON public.points_ledger(user_id, created_at DESC);

GRANT SELECT ON public.points_ledger TO authenticated;
GRANT ALL ON public.points_ledger TO service_role;
ALTER TABLE public.points_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own ledger" ON public.points_ledger
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ============== CATALOG ==============
CREATE TABLE public.reward_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  cost_points int NOT NULL CHECK (cost_points > 0),
  emoji text DEFAULT '☕',
  tier text DEFAULT 'standard',
  active boolean NOT NULL DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reward_catalog TO authenticated, anon;
GRANT ALL ON public.reward_catalog TO service_role;
ALTER TABLE public.reward_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "catalog public read" ON public.reward_catalog FOR SELECT USING (active = true);

INSERT INTO public.reward_catalog (name, description, cost_points, emoji, tier, sort_order) VALUES
  ('Free Espresso', 'A complimentary espresso shot at any partner café.', 100, '☕', 'standard', 1),
  ('Free Cappuccino', 'A warm cappuccino on the house.', 300, '🥛', 'standard', 2),
  ('Premium Reward', 'A specialty drink + sweet pairing at a partner café.', 500, '✨', 'premium', 3);

-- ============== CATALOG REDEMPTIONS ==============
CREATE TABLE public.catalog_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  catalog_id uuid NOT NULL REFERENCES public.reward_catalog(id),
  points_spent int NOT NULL,
  redemption_code text NOT NULL UNIQUE
    DEFAULT upper(substring(replace(gen_random_uuid()::text,'-',''),1,8)),
  used_at timestamptz,
  used_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.catalog_redemptions TO authenticated;
GRANT ALL ON public.catalog_redemptions TO service_role;
ALTER TABLE public.catalog_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own catalog redemptions" ON public.catalog_redemptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
-- partner verification path uses SECURITY DEFINER below

-- ============== REFERRALS ==============
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES auth.users(id);

-- backfill codes
UPDATE public.profiles SET referral_code = upper(substring(replace(gen_random_uuid()::text,'-',''),1,8))
 WHERE referral_code IS NULL;

CREATE OR REPLACE FUNCTION public.profiles_set_referral_code() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := upper(substring(replace(gen_random_uuid()::text,'-',''),1,8));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_profiles_referral_code ON public.profiles;
CREATE TRIGGER trg_profiles_referral_code BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_set_referral_code();

-- ============== AWARD HELPER ==============
CREATE OR REPLACE FUNCTION public.award_points(
  _user uuid, _delta int, _source text, _ref_id uuid DEFAULT NULL, _ref_table text DEFAULT NULL, _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _new int;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'user required'; END IF;
  UPDATE public.profiles SET total_points = COALESCE(total_points,0) + _delta
    WHERE id = _user RETURNING total_points INTO _new;
  IF _new IS NULL THEN RAISE EXCEPTION 'profile not found'; END IF;
  IF _new < 0 THEN
    -- revert
    UPDATE public.profiles SET total_points = COALESCE(total_points,0) - _delta WHERE id = _user;
    RAISE EXCEPTION 'Insufficient points';
  END IF;
  INSERT INTO public.points_ledger(user_id, delta, balance_after, source, ref_id, ref_table, metadata)
    VALUES (_user, _delta, _new, _source, _ref_id, _ref_table, COALESCE(_metadata,'{}'::jsonb));
  RETURN _new;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.award_points(uuid,int,text,uuid,text,jsonb) FROM PUBLIC;

-- ============== UPDATE EXISTING FLOWS TO USE LEDGER ==============
-- perform_check_in
CREATE OR REPLACE FUNCTION public.perform_check_in(_shop_id uuid, _campaign_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user uuid := auth.uid();
  _points int := 10;
  _check_in_id uuid;
  _total_check_ins int;
  _unique_shops int;
  _new_badges jsonb := '[]'::jsonb;
  _b record; _ctype text; _threshold int; _value text; _count int;
  _qualifies boolean; _inserted boolean; _countries text[];
  _campaign_progress jsonb := NULL; _c record;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.coffee_shops WHERE id = _shop_id AND status='approved') THEN
    RAISE EXCEPTION 'Coffee shop not available'; END IF;
  IF EXISTS (SELECT 1 FROM public.check_ins WHERE user_id = _user AND coffee_shop_id = _shop_id AND created_at > now() - interval '24 hours') THEN
    RAISE EXCEPTION 'You already checked in here in the last 24h'; END IF;
  IF _campaign_id IS NOT NULL THEN
    SELECT * INTO _c FROM public.campaigns WHERE id = _campaign_id AND coffee_shop_id = _shop_id AND status = 'active';
    IF NOT FOUND THEN _campaign_id := NULL; END IF;
  END IF;

  INSERT INTO public.check_ins (user_id, coffee_shop_id, points_awarded, verified, campaign_id)
    VALUES (_user, _shop_id, _points, false, _campaign_id) RETURNING id INTO _check_in_id;

  UPDATE public.profiles SET total_check_ins = COALESCE(total_check_ins,0) + 1 WHERE id = _user;
  PERFORM public.award_points(_user, _points, 'check_in', _check_in_id, 'check_ins',
    jsonb_build_object('shop_id', _shop_id, 'campaign_id', _campaign_id));

  SELECT total_check_ins INTO _total_check_ins FROM public.profiles WHERE id = _user;
  SELECT COUNT(DISTINCT coffee_shop_id) INTO _unique_shops FROM public.check_ins WHERE user_id = _user;

  FOR _b IN SELECT id, slug, name, criteria FROM public.badges LOOP
    _ctype := _b.criteria->>'type';
    _threshold := COALESCE((_b.criteria->>'threshold')::int, 1);
    _value := _b.criteria->>'value';
    _qualifies := false;
    IF _ctype = 'check_ins' THEN _qualifies := _total_check_ins >= _threshold;
    ELSIF _ctype = 'unique_shops' THEN _qualifies := _unique_shops >= _threshold;
    ELSIF _ctype = 'tag' THEN
      SELECT COUNT(*) INTO _count FROM public.check_ins ci JOIN public.coffee_shops s ON s.id = ci.coffee_shop_id
       WHERE ci.user_id = _user AND _value = ANY(s.tags);
      _qualifies := _count >= _threshold;
    ELSIF _ctype = 'city' THEN
      SELECT COUNT(DISTINCT ci.coffee_shop_id) INTO _count FROM public.check_ins ci JOIN public.coffee_shops s ON s.id = ci.coffee_shop_id
       WHERE ci.user_id = _user AND lower(s.city) = lower(_value);
      _qualifies := _count >= _threshold;
    ELSIF _ctype = 'country' THEN
      SELECT COUNT(DISTINCT ci.coffee_shop_id) INTO _count FROM public.check_ins ci JOIN public.coffee_shops s ON s.id = ci.coffee_shop_id
       WHERE ci.user_id = _user AND lower(s.country) = lower(_value);
      _qualifies := _count >= _threshold;
    ELSIF _ctype = 'region_countries' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(_b.criteria->'countries')) INTO _countries;
      SELECT COUNT(DISTINCT lower(s.country)) INTO _count FROM public.check_ins ci JOIN public.coffee_shops s ON s.id = ci.coffee_shop_id
       WHERE ci.user_id = _user AND lower(s.country) = ANY(SELECT lower(c) FROM unnest(_countries) c);
      _qualifies := _count >= _threshold;
    END IF;
    IF _qualifies THEN
      INSERT INTO public.user_badges (user_id, badge_id) VALUES (_user, _b.id) ON CONFLICT DO NOTHING;
      GET DIAGNOSTICS _inserted = ROW_COUNT;
      IF _inserted THEN
        _new_badges := _new_badges || jsonb_build_object('slug', _b.slug, 'name', _b.name);
      END IF;
    END IF;
  END LOOP;

  IF _campaign_id IS NOT NULL THEN
    SELECT jsonb_build_object('campaign_id', _campaign_id,
      'qualifying_check_ins', (SELECT COUNT(*) FROM public.check_ins WHERE user_id=_user AND campaign_id=_campaign_id),
      'required', GREATEST(COALESCE(_c.required_check_ins,1),1)) INTO _campaign_progress;
  END IF;

  RETURN jsonb_build_object(
    'check_in_id', _check_in_id, 'points_awarded', _points,
    'total_points', (SELECT total_points FROM public.profiles WHERE id = _user),
    'total_check_ins', _total_check_ins, 'unique_shops', _unique_shops,
    'new_badges', _new_badges, 'campaign_progress', _campaign_progress
  );
END;
$$;

-- redeem_campaign
CREATE OR REPLACE FUNCTION public.redeem_campaign(_campaign_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user uuid := auth.uid(); _c record; _qualifying int;
  _existing public.campaign_redemptions%ROWTYPE;
  _new_code text; _explorer_name text;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT c.*, s.partner_id AS partner_id, s.name AS shop_name INTO _c
    FROM public.campaigns c JOIN public.coffee_shops s ON s.id = c.coffee_shop_id WHERE c.id = _campaign_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Campaign not found'; END IF;

  SELECT * INTO _existing FROM public.campaign_redemptions WHERE campaign_id = _campaign_id AND user_id = _user;
  IF FOUND THEN
    RETURN jsonb_build_object('already_redeemed', true, 'redemption_code', _existing.redemption_code, 'points_awarded', _existing.points_awarded);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.campaign_participants WHERE campaign_id = _campaign_id AND user_id = _user) THEN
    RAISE EXCEPTION 'Join the campaign first'; END IF;

  SELECT COUNT(*) INTO _qualifying FROM public.check_ins
   WHERE user_id = _user AND coffee_shop_id = _c.coffee_shop_id
     AND (campaign_id = _campaign_id OR campaign_id IS NULL);
  IF _qualifying < GREATEST(COALESCE(_c.required_check_ins,1),1) THEN
    RAISE EXCEPTION 'You need % check-in(s) at the host café to redeem', GREATEST(COALESCE(_c.required_check_ins,1),1);
  END IF;

  INSERT INTO public.campaign_redemptions (campaign_id, user_id, points_awarded)
    VALUES (_campaign_id, _user, COALESCE(_c.points_reward, 0)) RETURNING redemption_code INTO _new_code;

  IF COALESCE(_c.points_reward,0) > 0 THEN
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
    _user, 'reward_unlocked', 'Reward unlocked! ' || COALESCE(_c.reward_description,_c.title),
    'Show code ' || _new_code || ' at ' || _c.shop_name || ' to claim your reward.',
    '/campaign/' || _campaign_id::text, jsonb_build_object('campaign_id', _campaign_id, 'code', _new_code));

  RETURN jsonb_build_object('redeemed', true, 'redemption_code', _new_code, 'points_awarded', COALESCE(_c.points_reward, 0));
END;
$$;

-- review_social_submission
CREATE OR REPLACE FUNCTION public.review_social_submission(_submission_id uuid, _decision text, _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _partner uuid := auth.uid(); _sub record; _c record;
  _new_code text; _existing_redemption record; _points int := 0;
BEGIN
  IF _partner IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _decision NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Invalid decision'; END IF;
  SELECT ss.*, s.partner_id, s.name AS shop_name INTO _sub
    FROM public.social_submissions ss JOIN public.coffee_shops s ON s.id = ss.coffee_shop_id WHERE ss.id = _submission_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found'; END IF;
  IF _sub.partner_id <> _partner THEN RAISE EXCEPTION 'Not your shop'; END IF;
  IF _sub.status <> 'pending' THEN RAISE EXCEPTION 'Already reviewed'; END IF;

  SELECT * INTO _c FROM public.campaigns WHERE id = _sub.campaign_id;

  IF _decision = 'rejected' THEN
    UPDATE public.social_submissions SET status='rejected', reviewed_by=_partner, reviewed_at=now(), review_notes=_notes
     WHERE id=_submission_id;
    INSERT INTO public.notifications(user_id, type, title, body, link, payload) VALUES (
      _sub.user_id, 'submission_rejected', 'Submission needs another try',
      'Your post for "' || _c.title || '" wasn''t approved.' || COALESCE(' ' || _notes, ''),
      '/campaign/' || _sub.campaign_id::text, jsonb_build_object('submission_id', _submission_id));
    RETURN jsonb_build_object('status','rejected');
  END IF;

  INSERT INTO public.campaign_participants(campaign_id, user_id) VALUES (_sub.campaign_id, _sub.user_id) ON CONFLICT DO NOTHING;
  _points := COALESCE(_c.points_reward, 0);

  SELECT * INTO _existing_redemption FROM public.campaign_redemptions WHERE campaign_id = _sub.campaign_id AND user_id = _sub.user_id;

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

  -- bonus 25 pts for an approved social post
  PERFORM public.award_points(_sub.user_id, 25, 'social_post', _submission_id, 'social_submissions',
    jsonb_build_object('platform', _sub.platform, 'campaign_id', _sub.campaign_id));

  UPDATE public.social_submissions
     SET status='approved', reviewed_by=_partner, reviewed_at=now(),
         review_notes=_notes, points_awarded=_points + 25, redemption_code=_new_code
   WHERE id=_submission_id;

  INSERT INTO public.notifications(user_id, type, title, body, link, payload) VALUES (
    _sub.user_id, 'submission_approved', 'Social proof approved! +' || (_points + 25) || ' pts',
    'Your reward for "' || _c.title || '" is unlocked. Code ' || _new_code,
    '/campaign/' || _sub.campaign_id::text, jsonb_build_object('submission_id', _submission_id, 'code', _new_code));

  RETURN jsonb_build_object('status','approved','redemption_code',_new_code,'points_awarded',_points + 25);
END;
$$;

-- ============== REVIEW POINTS (5 pts per review) ==============
CREATE OR REPLACE FUNCTION public.handle_new_review() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.award_points(NEW.user_id, 5, 'review', NEW.id, 'reviews',
    jsonb_build_object('shop_id', NEW.coffee_shop_id));
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_reviews_award ON public.reviews;
CREATE TRIGGER trg_reviews_award AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_review();

-- ============== REDEEM CATALOG ITEM ==============
CREATE OR REPLACE FUNCTION public.redeem_catalog_item(_item_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user uuid := auth.uid(); _item record; _balance int; _red record;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _item FROM public.reward_catalog WHERE id = _item_id AND active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reward not available'; END IF;
  SELECT total_points INTO _balance FROM public.profiles WHERE id = _user;
  IF COALESCE(_balance,0) < _item.cost_points THEN RAISE EXCEPTION 'Need % more points', _item.cost_points - COALESCE(_balance,0); END IF;

  INSERT INTO public.catalog_redemptions(user_id, catalog_id, points_spent)
    VALUES (_user, _item_id, _item.cost_points) RETURNING * INTO _red;
  PERFORM public.award_points(_user, -_item.cost_points, 'catalog_redemption', _red.id, 'catalog_redemptions',
    jsonb_build_object('item', _item.name));

  INSERT INTO public.notifications(user_id, type, title, body, link, payload) VALUES (
    _user, 'catalog_redeemed', 'Reward ready: ' || _item.name,
    'Show code ' || _red.redemption_code || ' at any partner café.', '/wallet',
    jsonb_build_object('code', _red.redemption_code, 'item', _item.name));

  RETURN jsonb_build_object('redemption_code', _red.redemption_code, 'item', _item.name, 'cost', _item.cost_points);
END;
$$;

-- ============== CLAIM REFERRAL ==============
CREATE OR REPLACE FUNCTION public.claim_referral(_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _user uuid := auth.uid(); _ref uuid; _me_profile record;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  _code := upper(trim(_code));
  SELECT * INTO _me_profile FROM public.profiles WHERE id = _user;
  IF _me_profile.referred_by IS NOT NULL THEN RAISE EXCEPTION 'Referral already claimed'; END IF;
  SELECT id INTO _ref FROM public.profiles WHERE referral_code = _code;
  IF _ref IS NULL THEN RAISE EXCEPTION 'Invalid referral code'; END IF;
  IF _ref = _user THEN RAISE EXCEPTION 'You cannot refer yourself'; END IF;

  UPDATE public.profiles SET referred_by = _ref WHERE id = _user;
  PERFORM public.award_points(_user, 50, 'referral_bonus', _ref, 'profiles', jsonb_build_object('role','referee'));
  PERFORM public.award_points(_ref, 100, 'referral_reward', _user, 'profiles', jsonb_build_object('role','referrer'));

  INSERT INTO public.notifications(user_id, type, title, body, link, payload) VALUES (
    _ref, 'referral_used', 'Someone joined with your code! +100 pts',
    'Thanks for spreading CO:FE(X).', '/wallet', jsonb_build_object('referee', _user));

  RETURN jsonb_build_object('ok', true, 'awarded', 50);
END;
$$;
