-- CO_FE_X: geolocation check-ins + admin moderation RPCs

CREATE OR REPLACE FUNCTION public.haversine_metres(
  lat1 double precision,
  lon1 double precision,
  lat2 double precision,
  lon2 double precision
)
RETURNS double precision
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 6371000 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lon2 - lon1) / 2), 2)
  ));
$$;

CREATE OR REPLACE FUNCTION public.perform_check_in(
  _shop_id uuid,
  _campaign_id uuid DEFAULT NULL,
  _latitude double precision DEFAULT NULL,
  _longitude double precision DEFAULT NULL
)
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
  _campaign_progress jsonb := NULL;
  _c record;
  _shop_lat double precision;
  _shop_lon double precision;
  _distance_m double precision;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF _latitude IS NULL OR _longitude IS NULL THEN
    RAISE EXCEPTION 'Location required — enable GPS to check in at the café';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.coffee_shops WHERE id = _shop_id AND status = 'approved') THEN
    RAISE EXCEPTION 'Coffee shop not available';
  END IF;

  SELECT latitude, longitude INTO _shop_lat, _shop_lon
  FROM public.coffee_shops WHERE id = _shop_id;

  IF _shop_lat IS NULL OR _shop_lon IS NULL THEN
    RAISE EXCEPTION 'This café has no location on file yet';
  END IF;

  _distance_m := public.haversine_metres(_latitude, _longitude, _shop_lat, _shop_lon);
  IF _distance_m > 200 THEN
    RAISE EXCEPTION 'You must be within 200 m of the café to check in (currently ~%s m away)', round(_distance_m)::text;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.check_ins
    WHERE user_id = _user AND coffee_shop_id = _shop_id
      AND created_at > now() - interval '24 hours'
  ) THEN
    RAISE EXCEPTION 'You already checked in here in the last 24h';
  END IF;

  IF _campaign_id IS NOT NULL THEN
    SELECT * INTO _c FROM public.campaigns WHERE id = _campaign_id AND coffee_shop_id = _shop_id AND status = 'active';
    IF NOT FOUND THEN _campaign_id := NULL; END IF;
  END IF;

  INSERT INTO public.check_ins (user_id, coffee_shop_id, points_awarded, verified, campaign_id)
  VALUES (_user, _shop_id, _points, true, _campaign_id)
  RETURNING id INTO _check_in_id;

  UPDATE public.profiles
     SET total_points = COALESCE(total_points, 0) + _points,
         total_check_ins = COALESCE(total_check_ins, 0) + 1
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
    SELECT jsonb_build_object(
      'qualifying_check_ins', (SELECT COUNT(*) FROM public.check_ins WHERE user_id = _user AND campaign_id = _campaign_id),
      'required', GREATEST(COALESCE(_c.required_check_ins, 1), 1)
    ) INTO _campaign_progress;
  END IF;

  RETURN jsonb_build_object(
    'check_in_id', _check_in_id,
    'points_awarded', _points,
    'total_points', (SELECT total_points FROM public.profiles WHERE id = _user),
    'total_check_ins', _total_check_ins,
    'unique_shops', _unique_shops,
    'new_badges', _new_badges,
    'campaign_progress', _campaign_progress,
    'distance_metres', round(_distance_m)
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.perform_check_in(uuid, uuid, double precision, double precision) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_partner_application(
  _application_id uuid,
  _decision text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _admin uuid := auth.uid();
  _app record;
BEGIN
  IF _admin IS NULL OR NOT public.has_role(_admin, 'admin') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  IF _decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Decision must be approved or rejected';
  END IF;

  SELECT * INTO _app FROM public.partner_applications WHERE id = _application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;
  IF _app.status <> 'pending' THEN RAISE EXCEPTION 'Application already reviewed'; END IF;

  UPDATE public.partner_applications
     SET status = _decision,
         reviewed_by = _admin,
         reviewed_at = now()
   WHERE id = _application_id;

  IF _decision = 'approved' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_app.user_id, 'partner')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN jsonb_build_object('status', _decision, 'user_id', _app.user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.review_partner_application(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_shop_status(
  _shop_id uuid,
  _status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  IF _status NOT IN ('pending', 'approved', 'rejected', 'suspended') THEN
    RAISE EXCEPTION 'Invalid shop status';
  END IF;

  UPDATE public.coffee_shops SET status = _status WHERE id = _shop_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Shop not found'; END IF;

  RETURN jsonb_build_object('shop_id', _shop_id, 'status', _status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_shop_status(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_campaign_status(
  _campaign_id uuid,
  _status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  IF _status NOT IN ('draft', 'active', 'paused', 'ended', 'rejected') THEN
    RAISE EXCEPTION 'Invalid campaign status';
  END IF;

  UPDATE public.campaigns SET status = _status WHERE id = _campaign_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Campaign not found'; END IF;

  RETURN jsonb_build_object('campaign_id', _campaign_id, 'status', _status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_campaign_status(uuid, text) TO authenticated;
