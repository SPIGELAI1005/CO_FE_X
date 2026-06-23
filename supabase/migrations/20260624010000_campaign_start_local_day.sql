-- Custom wizard dates were stored as UTC midnight; align starts_at to local (Europe/Berlin) start of day
-- and treat UTC-midnight starts as live from that calendar day in _campaign_is_live.

UPDATE public.campaigns c
SET starts_at = (
  (c.starts_at AT TIME ZONE 'UTC')::date::text || ' 00:00:00'
)::timestamp AT TIME ZONE 'Europe/Berlin'
WHERE c.starts_at IS NOT NULL
  AND c.starts_at = ((c.starts_at AT TIME ZONE 'UTC')::date::text || ' 00:00:00')::timestamp AT TIME ZONE 'UTC';

CREATE OR REPLACE FUNCTION public._campaign_is_live(_c public.campaigns)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  _hours jsonb;
  _start_time time;
  _end_time time;
  _now_time time := (now() AT TIME ZONE 'UTC')::time;
  _local_start timestamptz;
BEGIN
  IF _c.status IS DISTINCT FROM 'active' THEN RETURN false; END IF;

  IF _c.starts_at IS NOT NULL AND _c.starts_at > now() THEN
    IF _c.starts_at = (( _c.starts_at AT TIME ZONE 'UTC')::date::text || ' 00:00:00')::timestamp AT TIME ZONE 'UTC' THEN
      _local_start := (
        (_c.starts_at AT TIME ZONE 'UTC')::date::text || ' 00:00:00'
      )::timestamp AT TIME ZONE 'Europe/Berlin';
      IF now() < _local_start THEN RETURN false; END IF;
    ELSE
      RETURN false;
    END IF;
  END IF;

  IF _c.ends_at IS NOT NULL AND _c.ends_at < now() THEN RETURN false; END IF;

  _hours := _c.active_hours;
  IF _hours IS NOT NULL AND _hours ? 'start' AND _hours ? 'end' THEN
    _start_time := (_hours->>'start')::time;
    _end_time := (_hours->>'end')::time;
    IF _start_time <= _end_time THEN
      IF _now_time < _start_time OR _now_time > _end_time THEN RETURN false; END IF;
    ELSE
      IF _now_time < _start_time AND _now_time > _end_time THEN RETURN false; END IF;
    END IF;
  END IF;

  RETURN true;
END;
$$;
