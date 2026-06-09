
INSERT INTO public.badges (slug, name, description, criteria, points_required)
VALUES
  ('first-sip','First Sip','Complete your very first café check-in.','{"type":"check_ins","threshold":1}'::jsonb,0),
  ('coffee-curious','Coffee Curious','Visit 5 different cafés.','{"type":"unique_shops","threshold":5}'::jsonb,0),
  ('cafe-connoisseur','Café Connoisseur','Visit 15 different cafés.','{"type":"unique_shops","threshold":15}'::jsonb,0)
ON CONFLICT (slug) DO NOTHING;

CREATE OR REPLACE FUNCTION public.perform_check_in(_shop_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _points int := 10;
  _check_in_id uuid;
  _total_check_ins int;
  _unique_shops int;
  _new_badges jsonb := '[]'::jsonb;
  _b record;
BEGIN
  IF _user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

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
    IF (_b.criteria->>'type') = 'check_ins' AND _total_check_ins >= (_b.criteria->>'threshold')::int THEN
      INSERT INTO public.user_badges (user_id, badge_id) VALUES (_user, _b.id) ON CONFLICT DO NOTHING;
      IF FOUND THEN _new_badges := _new_badges || jsonb_build_object('slug', _b.slug, 'name', _b.name); END IF;
    ELSIF (_b.criteria->>'type') = 'unique_shops' AND _unique_shops >= (_b.criteria->>'threshold')::int THEN
      INSERT INTO public.user_badges (user_id, badge_id) VALUES (_user, _b.id) ON CONFLICT DO NOTHING;
      IF FOUND THEN _new_badges := _new_badges || jsonb_build_object('slug', _b.slug, 'name', _b.name); END IF;
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
$$;

GRANT EXECUTE ON FUNCTION public.perform_check_in(uuid) TO authenticated;
