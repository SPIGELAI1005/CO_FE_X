-- Partner application inbox: notify applicant on submit and on admin review.

CREATE OR REPLACE FUNCTION public.notify_partner_application_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications(user_id, type, title, body, link, payload)
  VALUES (
    NEW.user_id,
    'partner_application_received',
    'Partner application received',
    'Thank you for applying with ' || COALESCE(NEW.business_name, 'your café')
      || '. We''re reviewing your application and will get back to you soon.',
    '/profile',
    jsonb_build_object('application_id', NEW.id, 'business_name', NEW.business_name)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_partner_application_notify_submitted ON public.partner_applications;
CREATE TRIGGER trg_partner_application_notify_submitted
  AFTER INSERT ON public.partner_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_partner_application_submitted();

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

    INSERT INTO public.notifications(user_id, type, title, body, link, payload)
    VALUES (
      _app.user_id,
      'partner_application_approved',
      'Partner application approved',
      'Welcome to CO:FE(X) Partner! Set up your café profile and launch your first EEFFOC campaign.',
      '/partner',
      jsonb_build_object('application_id', _application_id, 'business_name', _app.business_name)
    );
  ELSE
    INSERT INTO public.notifications(user_id, type, title, body, link, payload)
    VALUES (
      _app.user_id,
      'partner_application_rejected',
      'Partner application update',
      'We couldn''t approve your application for ' || COALESCE(_app.business_name, 'your café')
        || ' at this time. You can update your details and contact us if you have questions.',
      '/profile',
      jsonb_build_object('application_id', _application_id, 'business_name', _app.business_name)
    );
  END IF;

  RETURN jsonb_build_object('status', _decision, 'user_id', _app.user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.review_partner_application(uuid, text) TO authenticated;
