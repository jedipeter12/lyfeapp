-- Run only in a disposable database after l6_auth_stub.sql and the L5, L6,
-- task-soft-delete migrations in timestamp order. All synthetic rows roll back.
begin;

insert into auth.users (id) values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
set constraints all immediate;

insert into public.pets (id, user_id, name, species) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Example pet', 'Dog');
insert into public.vehicles (id, user_id, year, make, model) values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111', 2020, 'Example', 'Car');
insert into public.tasks (id, user_id, title, description, status, priority, due_at, pet_id) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '11111111-1111-4111-8111-111111111111',
   'Synthetic task', 'Example only', 'pending', 'medium', '2027-05-01T09:00:00Z',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

do $$
begin
  if (select count(*) from public.tasks where deleted_at is null and completed_at is null
      and due_at = '2027-05-01T09:00:00Z') <> 1 then
    raise exception 'pending filter failed';
  end if;
end;
$$;

update public.tasks set title = 'Updated synthetic task', priority = 'high',
  pet_id = null, vehicle_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
update public.tasks set status = 'completed', completed_at = '2027-05-01T10:00:00Z'
  where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

do $$
begin
  if (select count(*) from public.tasks where deleted_at is null and completed_at is not null
      and priority = 'high' and vehicle_id is not null and pet_id is null) <> 1 then
    raise exception 'edit, link, or completed filter failed';
  end if;
end;
$$;

update public.tasks set status = 'pending', completed_at = null
  where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
do $$
begin
  if exists (select 1 from public.tasks where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc') then
    raise exception 'other owner can read task';
  end if;
  update public.tasks set status = 'completed'
    where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  if found then
    raise exception 'other owner can update task';
  end if;
end;
$$;

rollback;
