
ALTER TABLE public.coffee_shops
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS amenities text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS rating numeric(2,1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_coffee_available boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gallery_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS price_level smallint NOT NULL DEFAULT 2;

CREATE INDEX IF NOT EXISTS coffee_shops_tags_idx ON public.coffee_shops USING gin (tags);
CREATE INDEX IF NOT EXISTS coffee_shops_amenities_idx ON public.coffee_shops USING gin (amenities);
CREATE INDEX IF NOT EXISTS coffee_shops_status_idx ON public.coffee_shops (status);

-- Make sure anon can read approved shops for public discovery (Explore page).
-- Existing policies for authenticated already exist; add anon read of approved.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='coffee_shops' AND policyname='Anyone can view approved coffee shops') THEN
    CREATE POLICY "Anyone can view approved coffee shops"
      ON public.coffee_shops FOR SELECT
      TO anon, authenticated
      USING (status = 'approved');
  END IF;
END $$;

GRANT SELECT ON public.coffee_shops TO anon;
