-- Remove strict campaigns overload; join_campaign passes a wider record type.
DROP FUNCTION IF EXISTS public._campaign_is_live(public.campaigns);
