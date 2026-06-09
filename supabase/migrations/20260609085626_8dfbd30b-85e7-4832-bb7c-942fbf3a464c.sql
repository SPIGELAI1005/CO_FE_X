-- Lock down SECURITY DEFINER helper functions: only the database itself uses them.
revoke execute on function public.has_role(uuid, public.app_role) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.update_updated_at_column() from public, anon, authenticated;

-- Tighten partner check-in verification: replace the permissive WITH CHECK (true).
drop policy if exists "Partners verify check-ins" on public.check_ins;
create policy "Partners verify check-ins" on public.check_ins
  for update to authenticated
  using (exists (select 1 from public.coffee_shops s where s.id = coffee_shop_id and s.partner_id = auth.uid()))
  with check (exists (select 1 from public.coffee_shops s where s.id = coffee_shop_id and s.partner_id = auth.uid()));