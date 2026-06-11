
-- Storage policies for shop-images bucket
CREATE POLICY "Partners read own shop-images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'shop-images');

CREATE POLICY "Partners upload own shop-images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'shop-images'
  AND public.has_role(auth.uid(), 'partner'::app_role)
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Partners update own shop-images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'shop-images' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'shop-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Partners delete own shop-images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'shop-images' AND (storage.foldername(name))[1] = auth.uid()::text);
