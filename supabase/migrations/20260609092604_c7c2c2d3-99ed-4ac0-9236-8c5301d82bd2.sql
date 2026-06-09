
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS campaign_type text NOT NULL DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS requirements text,
  ADD COLUMN IF NOT EXISTS max_participants integer;
