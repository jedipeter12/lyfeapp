-- Run only in a disposable database after l6_auth_stub.sql,
-- l11_storage_stub.sql, and all four migrations in timestamp order.
begin;

insert into auth.users (id) values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222');
insert into public.pets (id, user_id, name, species) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Example A', 'Dog'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'Example B', 'Cat');
insert into public.attachments (id, user_id, entity_type, entity_id, storage_path, mime_type, size_bytes) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '11111111-1111-4111-8111-111111111111', 'pets', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111/cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'application/pdf', 10),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '22222222-2222-4222-8222-222222222222', 'pets', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222/dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'image/jpeg', 10);
insert into storage.objects (bucket_id, name, owner_id) values
  ('lyfe-attachments', '11111111-1111-4111-8111-111111111111/cccccccc-cccc-4ccc-8ccc-cccccccccccc', '11111111-1111-4111-8111-111111111111'),
  ('lyfe-attachments', '22222222-2222-4222-8222-222222222222/dddddddd-dddd-4ddd-8ddd-dddddddddddd', '22222222-2222-4222-8222-222222222222');

do $$
begin
  if not exists (
    select 1 from storage.buckets
    where id = 'lyfe-attachments' and public = false
      and file_size_limit = 10485760
      and allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  ) then raise exception 'private bucket limits are wrong'; end if;
  if not has_table_privilege('authenticated', 'public.attachments', 'DELETE') then
    raise exception 'attachment owner delete grant is missing';
  end if;
  if has_table_privilege('authenticated', 'public.pets', 'DELETE') then
    raise exception 'parent delete permission changed';
  end if;
  if has_column_privilege('authenticated', 'public.attachments', 'storage_path', 'UPDATE')
    or has_column_privilege('authenticated', 'public.attachments', 'mime_type', 'UPDATE')
    or has_column_privilege('authenticated', 'public.attachments', 'size_bytes', 'UPDATE') then
    raise exception 'attachment metadata remains mutable';
  end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
set constraints all immediate;

do $$
declare changed integer;
declare rejected boolean;
begin
  if (select count(*) from public.attachments) <> 1
    or (select count(*) from storage.objects where bucket_id = 'lyfe-attachments') <> 1 then
    raise exception 'owner read policy exposed a foreign attachment';
  end if;

  delete from public.attachments where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'foreign attachment metadata delete succeeded'; end if;
  delete from storage.objects where name = '22222222-2222-4222-8222-222222222222/dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'foreign storage object delete succeeded'; end if;

  update storage.objects set name = '11111111-1111-4111-8111-111111111111/ffffffff-ffff-4fff-8fff-ffffffffffff'
    where name = '11111111-1111-4111-8111-111111111111/cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'storage rename succeeded without UPDATE policy'; end if;

  rejected := false;
  begin
    insert into public.attachments (id, user_id, entity_type, entity_id, storage_path, mime_type, size_bytes)
      values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', '11111111-1111-4111-8111-111111111111', 'pets',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '22222222-2222-4222-8222-222222222222/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'application/pdf', 10);
  exception when check_violation then rejected := true;
  end;
  if not rejected then raise exception 'foreign metadata path succeeded'; end if;

  rejected := false;
  begin
    insert into public.attachments (id, user_id, entity_type, entity_id, storage_path, mime_type, size_bytes)
      values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', '11111111-1111-4111-8111-111111111111', 'pets',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'text/plain', 10);
  exception when check_violation then rejected := true;
  end;
  if not rejected then raise exception 'disallowed metadata MIME succeeded'; end if;

  rejected := false;
  begin
    insert into public.attachments (id, user_id, entity_type, entity_id, storage_path, mime_type, size_bytes)
      values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', '11111111-1111-4111-8111-111111111111', 'pets',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'application/pdf', 10485761);
  exception when check_violation then rejected := true;
  end;
  if not rejected then raise exception 'oversized metadata succeeded'; end if;

  rejected := false;
  begin
    insert into public.attachments (id, user_id, entity_type, entity_id, storage_path, mime_type, size_bytes)
      values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', '11111111-1111-4111-8111-111111111111', 'pets',
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'application/pdf', 10);
  exception when foreign_key_violation then rejected := true;
  end;
  if not rejected then raise exception 'foreign target succeeded'; end if;

  rejected := false;
  begin
    insert into storage.objects (bucket_id, name, owner_id)
      values ('lyfe-attachments', '22222222-2222-4222-8222-222222222222/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        '11111111-1111-4111-8111-111111111111');
  exception when insufficient_privilege then rejected := true;
  end;
  if not rejected then raise exception 'foreign storage path insert succeeded'; end if;

  rejected := false;
  begin
    insert into storage.objects (bucket_id, name, owner_id)
      values ('lyfe-attachments', '11111111-1111-4111-8111-111111111111/extra/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        '11111111-1111-4111-8111-111111111111');
  exception when insufficient_privilege then rejected := true;
  end;
  if not rejected then raise exception 'nested storage path insert succeeded'; end if;
end;
$$;

insert into storage.objects (bucket_id, name, owner_id)
  values ('lyfe-attachments', '11111111-1111-4111-8111-111111111111/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    '11111111-1111-4111-8111-111111111111');
delete from storage.objects
  where name = '11111111-1111-4111-8111-111111111111/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
delete from public.attachments where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
do $$
begin
  if (select count(*) from public.attachments) <> 1
    or (select count(*) from storage.objects where bucket_id = 'lyfe-attachments') <> 1 then
    raise exception 'second owner lost their attachment';
  end if;
end;
$$;

rollback;
