
-- 1. Restrict profiles SELECT to authenticated users only (drop public access)
DROP POLICY IF EXISTS "Profiles public read" ON public.profiles;
CREATE POLICY "Profiles authenticated read" ON public.profiles
  FOR SELECT TO authenticated USING (true);

-- 2. Allow applicants to delete their own pending partner applications
CREATE POLICY "Delete own pending application" ON public.partner_applications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND status = 'pending');

-- 3. Fix mutable search_path on profiles_set_referral_code
CREATE OR REPLACE FUNCTION public.profiles_set_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := upper(substring(replace(gen_random_uuid()::text,'-',''),1,8));
  END IF;
  RETURN NEW;
END;
$function$;

-- 4. Revoke EXECUTE from anon on SECURITY DEFINER RPCs (none need anonymous access)
REVOKE EXECUTE ON FUNCTION public.get_leaderboard(text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.award_points(uuid, integer, text, uuid, text, jsonb) FROM anon;
