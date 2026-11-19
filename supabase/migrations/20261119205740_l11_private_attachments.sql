-- L-11: private attachment storage and the ADR-002 owner-only deletion exception.
-- Keep previously applied migrations immutable. Existing attachment rows are not
-- rewritten; NOT VALID checks apply to all new inserts and updates.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lyfe-attachments',
  'lyfe-attachments',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
);

alter table public.attachments
  add constraint attachments_l11_owner_path
  check (storage_path = user_id::text || '/' || id::text) not valid;
alter table public.attachments
  add constraint attachments_l11_file_limits
  check (
    size_bytes between 1 and 10485760
    and mime_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')
  ) not valid;

grant delete on public.attachments to authenticated;
revoke update (storage_path, mime_type, size_bytes) on public.attachments
  from authenticated;
create policy attachments_delete_own on public.attachments
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- The key is exactly <owner UUID>/<attachment UUID>. No UPDATE policy is
-- provided, so clients cannot overwrite, rename, or move objects.
create policy lyfe_attachments_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'lyfe-attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );
create policy lyfe_attachments_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'lyfe-attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy lyfe_attachments_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'lyfe-attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
