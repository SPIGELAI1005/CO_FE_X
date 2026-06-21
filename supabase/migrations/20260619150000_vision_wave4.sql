-- Vision Wave 4: manual health log (native HealthKit deferred)

CREATE TABLE IF NOT EXISTS public.explorer_health_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  steps int,
  caffeine_mg int,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, log_date)
);

GRANT SELECT, INSERT, UPDATE ON public.explorer_health_logs TO authenticated;
ALTER TABLE public.explorer_health_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User own health logs" ON public.explorer_health_logs FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.upsert_health_log(_steps int DEFAULT NULL, _caffeine_mg int DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _user uuid := auth.uid();
  _today date := (now() AT TIME ZONE 'UTC')::date;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO public.explorer_health_logs (user_id, log_date, steps, caffeine_mg)
  VALUES (_user, _today, _steps, _caffeine_mg)
  ON CONFLICT (user_id, log_date) DO UPDATE SET
    steps = COALESCE(EXCLUDED.steps, explorer_health_logs.steps),
    caffeine_mg = COALESCE(EXCLUDED.caffeine_mg, explorer_health_logs.caffeine_mg);
  RETURN jsonb_build_object('log_date', _today, 'steps', _steps, 'caffeine_mg', _caffeine_mg);
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_health_log(int, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_today_health_log()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'steps', steps,
    'caffeine_mg', caffeine_mg,
    'log_date', log_date
  )
  FROM public.explorer_health_logs
  WHERE user_id = auth.uid() AND log_date = (now() AT TIME ZONE 'UTC')::date;
$$;

GRANT EXECUTE ON FUNCTION public.get_today_health_log() TO authenticated;
