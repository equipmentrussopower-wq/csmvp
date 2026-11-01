-- 1. notifications: admin-only inserts (was WITH CHECK (true))
DROP POLICY IF EXISTS "Admin insert notifications" ON public.notifications;
CREATE POLICY "Admins can insert notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. platform_settings: no longer readable by everyone; admins read all,
--    authenticated users read only the public pricing key
DROP POLICY IF EXISTS "Everyone can view platform settings" ON public.platform_settings;
CREATE POLICY "Authenticated can view public platform settings"
  ON public.platform_settings
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR key = 'debit_card_cost');

-- 3. storage kyc-documents: bind uploads to the uploader's own folder
DROP POLICY IF EXISTS "Allow Auth Upload" ON storage.objects;
CREATE POLICY "KYC docs: authenticated upload to own folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. storage kyc-documents: replace public read with owner- and admin-bound reads
DROP POLICY IF EXISTS "Allow Public View" ON storage.objects;
CREATE POLICY "KYC docs: users read own folder"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "KYC docs: admins read all"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND public.has_role(auth.uid(), 'admin')
  );