
-- Extend perform_check_in to support tag/city/country/region criteria, and seed new badges

CREATE OR REPLACE FUNCTION public.perform_check_in(_shop_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user uuid := auth.uid();
  _points int := 10;
  _check_in_id uuid;
  _total_check_ins int;
  _unique_shops int;
  _new_badges jsonb := '[]'::jsonb;
  _b record;
  _ctype text;
  _threshold int;
  _value text;
  _count int;
  _qualifies boolean;
  _inserted boolean;
  _countries text[];
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.coffee_shops WHERE id = _shop_id AND status='approved') THEN
    RAISE EXCEPTION 'Coffee shop not available';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.check_ins
    WHERE user_id = _user AND coffee_shop_id = _shop_id
      AND created_at > now() - interval '24 hours'
  ) THEN
    RAISE EXCEPTION 'You already checked in here in the last 24h';
  END IF;

  INSERT INTO public.check_ins (user_id, coffee_shop_id, points_awarded, verified)
  VALUES (_user, _shop_id, _points, false)
  RETURNING id INTO _check_in_id;

  UPDATE public.profiles
     SET total_points = COALESCE(total_points,0) + _points,
         total_check_ins = COALESCE(total_check_ins,0) + 1
   WHERE id = _user;

  SELECT total_check_ins INTO _total_check_ins FROM public.profiles WHERE id = _user;
  SELECT COUNT(DISTINCT coffee_shop_id) INTO _unique_shops FROM public.check_ins WHERE user_id = _user;

  FOR _b IN SELECT id, slug, name, criteria FROM public.badges LOOP
    _ctype := _b.criteria->>'type';
    _threshold := COALESCE((_b.criteria->>'threshold')::int, 1);
    _value := _b.criteria->>'value';
    _qualifies := false;

    IF _ctype = 'check_ins' THEN
      _qualifies := _total_check_ins >= _threshold;
    ELSIF _ctype = 'unique_shops' THEN
      _qualifies := _unique_shops >= _threshold;
    ELSIF _ctype = 'tag' THEN
      SELECT COUNT(*) INTO _count
      FROM public.check_ins ci
      JOIN public.coffee_shops s ON s.id = ci.coffee_shop_id
      WHERE ci.user_id = _user AND _value = ANY(s.tags);
      _qualifies := _count >= _threshold;
    ELSIF _ctype = 'city' THEN
      SELECT COUNT(DISTINCT ci.coffee_shop_id) INTO _count
      FROM public.check_ins ci
      JOIN public.coffee_shops s ON s.id = ci.coffee_shop_id
      WHERE ci.user_id = _user AND lower(s.city) = lower(_value);
      _qualifies := _count >= _threshold;
    ELSIF _ctype = 'country' THEN
      SELECT COUNT(DISTINCT ci.coffee_shop_id) INTO _count
      FROM public.check_ins ci
      JOIN public.coffee_shops s ON s.id = ci.coffee_shop_id
      WHERE ci.user_id = _user AND lower(s.country) = lower(_value);
      _qualifies := _count >= _threshold;
    ELSIF _ctype = 'region_countries' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(_b.criteria->'countries')) INTO _countries;
      SELECT COUNT(DISTINCT lower(s.country)) INTO _count
      FROM public.check_ins ci
      JOIN public.coffee_shops s ON s.id = ci.coffee_shop_id
      WHERE ci.user_id = _user AND lower(s.country) = ANY(SELECT lower(c) FROM unnest(_countries) c);
      _qualifies := _count >= _threshold;
    END IF;

    IF _qualifies THEN
      INSERT INTO public.user_badges (user_id, badge_id) VALUES (_user, _b.id)
      ON CONFLICT DO NOTHING;
      GET DIAGNOSTICS _inserted = ROW_COUNT;
      IF _inserted THEN
        _new_badges := _new_badges || jsonb_build_object('slug', _b.slug, 'name', _b.name);
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'check_in_id', _check_in_id,
    'points_awarded', _points,
    'total_points', (SELECT total_points FROM public.profiles WHERE id = _user),
    'total_check_ins', _total_check_ins,
    'unique_shops', _unique_shops,
    'new_badges', _new_badges
  );
END;
$function$;

-- Seed new badges (idempotent)
INSERT INTO public.badges (slug, name, description, criteria, points_required) VALUES
  ('espresso-explorer', 'Espresso Explorer', 'Check in at 5 espresso-focused cafés.', '{"type":"tag","value":"espresso","threshold":5}'::jsonb, 0),
  ('cappuccino-collector', 'Cappuccino Collector', 'Check in at 5 cappuccino spots.', '{"type":"tag","value":"cappuccino","threshold":5}'::jsonb, 0),
  ('matcha-hunter', 'Matcha Hunter', 'Check in at 3 matcha cafés.', '{"type":"tag","value":"matcha","threshold":3}'::jsonb, 0),
  ('coffee-nomad', 'Coffee Nomad', 'Visit cafés in 3 different countries.', '{"type":"region_countries","countries":["Germany","France","Italy","Spain","Netherlands","Austria","Belgium","Portugal","Switzerland","Sweden","Denmark","Norway","Finland","Poland","Czechia","Greece","Ireland","United Kingdom"],"threshold":3}'::jsonb, 0),
  ('munich-explorer', 'Munich Explorer', 'Visit 5 unique cafés in Munich.', '{"type":"city","value":"Munich","threshold":5}'::jsonb, 0),
  ('berlin-explorer', 'Berlin Explorer', 'Visit 5 unique cafés in Berlin.', '{"type":"city","value":"Berlin","threshold":5}'::jsonb, 0),
  ('european-coffee-legend', 'European Coffee Legend', 'Visit cafés in 7 European countries.', '{"type":"region_countries","countries":["Germany","France","Italy","Spain","Netherlands","Austria","Belgium","Portugal","Switzerland","Sweden","Denmark","Norway","Finland","Poland","Czechia","Greece","Ireland","United Kingdom"],"threshold":7}'::jsonb, 0)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  criteria = EXCLUDED.criteria;
