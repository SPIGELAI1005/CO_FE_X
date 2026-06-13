
-- Fix: restrict reviews SELECT to authenticated
DROP POLICY IF EXISTS "Reviews public" ON public.reviews;
CREATE POLICY "Reviews readable by authenticated" ON public.reviews
  FOR SELECT TO authenticated USING (true);

-- Fix: restrict user_badges SELECT to authenticated
DROP POLICY IF EXISTS "User badges public" ON public.user_badges;
CREATE POLICY "User badges readable by authenticated" ON public.user_badges
  FOR SELECT TO authenticated USING (true);

-- Fix: scope shop-images SELECT to folder owner (matches insert/update/delete pattern)
DROP POLICY IF EXISTS "Partners read own shop-images" ON storage.objects;
CREATE POLICY "Partners read own shop-images" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'shop-images' AND (storage.foldername(name))[1] = auth.uid()::text);
