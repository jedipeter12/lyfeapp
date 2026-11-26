-- Run only in a disposable database after the Auth stub and Lyfe migrations.
-- Synthetic records roll back, including the pet-linked due task.
begin;

insert into auth.users (id) values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
set constraints all immediate;

insert into public.pets (id, user_id, name, species) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Example pet', 'Cat');

insert into public.pet_health_events (id, user_id, pet_id, event_type, occurred_at, notes) values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Checkup', '2026-11-01T12:00:00Z', 'Synthetic visit');
insert into public.pet_medications (id, user_id, pet_id, name, dosage_text, start_date, end_date) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '11111111-1111-4111-8111-111111111111',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Example medicine', '1 unit', '2026-11-01', '2026-11-30');
insert into public.pet_vaccinations (id, user_id, pet_id, name, administered_on, due_on) values
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '11111111-1111-4111-8111-111111111111',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Example vaccine', '2026-11-01', '2027-11-01');

update public.pet_health_events set notes = 'Corrected visit'
  where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
update public.pet_medications set dosage_text = '2 units'
  where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
update public.pet_vaccinations set due_on = '2027-12-01'
  where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

insert into public.tasks (id, user_id, title, status, priority, due_at, pet_id) values
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', '11111111-1111-4111-8111-111111111111',
   'Example pet: Example vaccine vaccination', 'pending', 'medium',
   '2027-12-01T09:00:00Z', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

do $$
begin
  if not exists (select 1 from public.pet_health_events where notes = 'Corrected visit')
    or not exists (select 1 from public.pet_medications where dosage_text = '2 units')
    or not exists (select 1 from public.pet_vaccinations where due_on = '2027-12-01')
    or not exists (select 1 from public.tasks where pet_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and due_at = '2027-12-01T09:00:00Z') then
    raise exception 'pet care edit or due task flow failed';
  end if;
  begin
    insert into public.pet_medications (user_id, pet_id, name, start_date, end_date) values
      ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       'Invalid dates', '2027-12-02', '2027-12-01');
    raise exception 'invalid medication dates were accepted';
  exception when check_violation then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
do $$
begin
  if exists (select 1 from public.pet_health_events)
    or exists (select 1 from public.pet_medications)
    or exists (select 1 from public.pet_vaccinations)
    or exists (select 1 from public.tasks) then
    raise exception 'another owner can read pet care or due task';
  end if;
  update public.pet_vaccinations set due_on = '2028-01-01'
    where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  if found then raise exception 'another owner can edit vaccination'; end if;
end;
$$;

rollback;
