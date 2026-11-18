-- Run only against a disposable database after the Auth stub and all migrations.
-- This verifies the database marker and owner permissions; app filtering is a
-- separate repository contract.
begin;

insert into auth.users (id) values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222');
insert into public.tasks (id, user_id, title, status, priority) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   '11111111-1111-4111-8111-111111111111', 'Synthetic task', 'open', 'normal'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
   '22222222-2222-4222-8222-222222222222', 'Other task', 'open', 'normal');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);

do $$
begin
  if not has_column_privilege('authenticated', 'public.tasks', 'deleted_at', 'UPDATE') then
    raise exception 'task marker cannot be updated';
  end if;
  if has_table_privilege('authenticated', 'public.tasks', 'DELETE') then
    raise exception 'task physical deletion is permitted';
  end if;
end;
$$;

update public.tasks set deleted_at = now()
  where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

do $$
declare changed_rows integer;
begin
  if exists (select 1 from public.tasks
      where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and deleted_at is null) then
    raise exception 'marked task appears in an active filter';
  end if;
  if not exists (select 1 from public.tasks
      where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and deleted_at is not null) then
    raise exception 'marked task is unavailable for restoration';
  end if;
  update public.tasks set deleted_at = now()
    where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'cross-user task marker update succeeded';
  end if;
end;
$$;

update public.tasks set deleted_at = null
  where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $$
begin
  if not exists (select 1 from public.tasks
      where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and deleted_at is null) then
    raise exception 'restored task is missing from active filter';
  end if;
end;
$$;

rollback;
