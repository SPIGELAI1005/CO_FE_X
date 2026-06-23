-- Untyped record parameters cannot use (_c).starts_at at plan time; read via jsonb instead.

CREATE OR REPLACE FUNCTION public._campaign_is_live(_c record)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  _j jsonb := to_jsonb(_c);
  _status text := _j->>'status';
  _starts_at timestamptz := NULLIF(_j->>'starts_at', '')::timestamptz;
  _ends_at timestamptz := NULLIF(_j->>'ends_at', '')::timestamptz;
  _hours jsonb := _j->'active_hours';
  _start_time time;
  _end_time time;
  _now_time time := (now() AT TIME ZONE 'UTC')::time;
  _local_start timestamptz;
BEGIN
  IF _status IS DISTINCT FROM 'active' THEN RETURN false; END IF;

  IF _starts_at IS NOT NULL AND _starts_at > now() THEN
    IF _starts_at = ((_starts_at AT TIME ZONE 'UTC')::date::text || ' 00:00:00')::timestamp AT TIME ZONE 'UTC' THEN
      _local_start := (
        (_starts_at AT TIME ZONE 'UTC')::date::text || ' 00:00:00'
      )::timestamp AT TIME ZONE 'Europe/Berlin';
      IF now() < _local_start THEN RETURN false; END IF;
    ELSE
      RETURN false;
    END IF;
  END IF;

  IF _ends_at IS NOT NULL AND _ends_at < now() THEN RETURN false; END IF;

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
