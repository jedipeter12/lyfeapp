-- Run only in a disposable database after l6_auth_stub.sql and all migrations.
-- Two fictional accounts exercise every baseline table. The transaction rolls back.
begin;

insert into auth.users (id) values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222');
insert into public.pets (id, user_id, name, species) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Example A', 'Dog'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'Example B', 'Cat');
insert into public.vehicles (id, user_id, year, make, model) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '11111111-1111-4111-8111-111111111111', 2020, 'Example', 'A'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '22222222-2222-4222-8222-222222222222', 2021, 'Example', 'B');
insert into public.tasks (id, user_id, title, status, priority) values
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', '11111111-1111-4111-8111-111111111111', 'Example A', 'open', 'normal'),
  ('ffffffff-ffff-4fff-8fff-ffffffffffff', '22222222-2222-4222-8222-222222222222', 'Example B', 'open', 'normal');
insert into public.recurrence_rules (user_id, task_id, frequency, timezone) values
  ('11111111-1111-4111-8111-111111111111', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'monthly', 'UTC'),
  ('22222222-2222-4222-8222-222222222222', 'ffffffff-ffff-4fff-8fff-ffffffffffff', 'monthly', 'UTC');
insert into public.reminders (user_id, task_id, remind_at, status) values
  ('11111111-1111-4111-8111-111111111111', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', now(), 'pending'),
  ('22222222-2222-4222-8222-222222222222', 'ffffffff-ffff-4fff-8fff-ffffffffffff', now(), 'pending');
insert into public.pet_weight_entries (user_id, pet_id, weight_kg, measured_at) values
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 5, now()),
  ('22222222-2222-4222-8222-222222222222', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 6, now());
insert into public.pet_health_events (user_id, pet_id, event_type, occurred_at) values
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'example', now()),
  ('22222222-2222-4222-8222-222222222222', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'example', now());
insert into public.pet_medications (user_id, pet_id, name) values
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Example A'),
  ('22222222-2222-4222-8222-222222222222', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Example B');
insert into public.pet_vaccinations (user_id, pet_id, name) values
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Example A'),
  ('22222222-2222-4222-8222-222222222222', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Example B');
insert into public.vehicle_service_records (user_id, vehicle_id, service_type, performed_on) values
  ('11111111-1111-4111-8111-111111111111', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'example', current_date),
  ('22222222-2222-4222-8222-222222222222', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'example', current_date);
insert into public.vehicle_mileage_entries (user_id, vehicle_id, odometer, recorded_at) values
  ('11111111-1111-4111-8111-111111111111', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 100, now()),
  ('22222222-2222-4222-8222-222222222222', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 200, now());
insert into public.custom_field_definitions (id, user_id, module_type, name, field_type) values
  ('10000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'pets', 'Example A', 'text'),
  ('20000000-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', 'pets', 'Example B', 'text');
insert into public.custom_field_values (user_id, definition_id, entity_id, value) values
  ('11111111-1111-4111-8111-111111111111', '10000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '"a"'),
  ('22222222-2222-4222-8222-222222222222', '20000000-0000-4000-8000-000000000002', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '"b"');
insert into public.attachments (user_id, entity_type, entity_id, storage_path, mime_type, size_bytes) values
  ('11111111-1111-4111-8111-111111111111', 'pets', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a/example.pdf', 'application/pdf', 10),
  ('22222222-2222-4222-8222-222222222222', 'pets', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b/example.pdf', 'application/pdf', 10);
insert into public.module_preferences (user_id, module_type) values
  ('11111111-1111-4111-8111-111111111111', 'pets'),
  ('22222222-2222-4222-8222-222222222222', 'pets');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
set constraints all immediate;

do $$
declare table_name text;
declare visible_count integer;
begin
  foreach table_name in array array[
    'profiles', 'tasks', 'recurrence_rules', 'reminders', 'attachments', 'pets',
    'pet_weight_entries', 'pet_health_events', 'pet_medications', 'pet_vaccinations',
    'vehicles', 'vehicle_service_records', 'vehicle_mileage_entries',
    'custom_field_definitions', 'custom_field_values', 'module_preferences'
  ] loop
    execute format('select count(*) from public.%I', table_name) into visible_count;
    if visible_count <> 1 then
      raise exception 'owner read isolation failed for %: saw % rows', table_name, visible_count;
    end if;
    if has_table_privilege('authenticated', format('public.%I', table_name), 'DELETE') then
      raise exception 'authenticated DELETE privilege exists on %', table_name;
    end if;
    if has_column_privilege('authenticated', format('public.%I', table_name), 'user_id', 'UPDATE') then
      raise exception 'authenticated can change owner on %', table_name;
    end if;
    if not (select rowsecurity from pg_tables where schemaname = 'public' and tablename = table_name) then
      raise exception 'RLS disabled on %', table_name;
    end if;
    if has_table_privilege('anon', format('public.%I', table_name), 'SELECT') then
      raise exception 'anonymous SELECT privilege exists on %', table_name;
    end if;
  end loop;
end;
$$;

-- A visible owner can update its task; a foreign task is invisible to UPDATE.
update public.tasks set title = 'Updated A' where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
do $$
declare changed_count integer;
begin
  if (select title from public.tasks where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee') <> 'Updated A' then
    raise exception 'owner UPDATE failed';
  end if;
  update public.tasks set title = 'Stolen' where id = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
  get diagnostics changed_count = row_count;
  if changed_count <> 0 then raise exception 'cross-user UPDATE succeeded'; end if;
end;
$$;

-- Each link must reject a same-table entity owned by another account.
do $$
declare attack text;
declare rejected boolean;
begin
  foreach attack in array array[
    $q$insert into public.tasks (user_id, title, status, priority, pet_id) values ('11111111-1111-4111-8111-111111111111','bad','open','normal','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')$q$,
    $q$insert into public.tasks (user_id, title, status, priority, vehicle_id) values ('11111111-1111-4111-8111-111111111111','bad','open','normal','dddddddd-dddd-4ddd-8ddd-dddddddddddd')$q$,
    $q$insert into public.recurrence_rules (user_id, task_id, frequency, timezone) values ('11111111-1111-4111-8111-111111111111','ffffffff-ffff-4fff-8fff-ffffffffffff','daily','UTC')$q$,
    $q$insert into public.reminders (user_id, task_id, remind_at, status) values ('11111111-1111-4111-8111-111111111111','ffffffff-ffff-4fff-8fff-ffffffffffff',now(),'pending')$q$,
    $q$insert into public.pet_weight_entries (user_id, pet_id, weight_kg, measured_at) values ('11111111-1111-4111-8111-111111111111','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',5,now())$q$,
    $q$insert into public.pet_health_events (user_id, pet_id, event_type, occurred_at) values ('11111111-1111-4111-8111-111111111111','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','bad',now())$q$,
    $q$insert into public.pet_medications (user_id, pet_id, name) values ('11111111-1111-4111-8111-111111111111','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','bad')$q$,
    $q$insert into public.pet_vaccinations (user_id, pet_id, name) values ('11111111-1111-4111-8111-111111111111','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','bad')$q$,
    $q$insert into public.vehicle_service_records (user_id, vehicle_id, service_type, performed_on) values ('11111111-1111-4111-8111-111111111111','dddddddd-dddd-4ddd-8ddd-dddddddddddd','bad',current_date)$q$,
    $q$insert into public.vehicle_mileage_entries (user_id, vehicle_id, odometer, recorded_at) values ('11111111-1111-4111-8111-111111111111','dddddddd-dddd-4ddd-8ddd-dddddddddddd',5,now())$q$,
    $q$insert into public.custom_field_values (user_id, definition_id, entity_id, value) values ('11111111-1111-4111-8111-111111111111','20000000-0000-4000-8000-000000000002','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','"bad"')$q$,
    $q$insert into public.attachments (user_id, entity_type, entity_id, storage_path, mime_type, size_bytes) values ('11111111-1111-4111-8111-111111111111','pets','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','bad/path','application/pdf',10)$q$
  ] loop
    rejected := false;
    begin
      execute attack;
      set constraints all immediate;
    exception when foreign_key_violation then rejected := true;
    end;
    if not rejected then raise exception 'cross-user reference succeeded: %', attack; end if;
  end loop;
end;
$$;

-- Polymorphic checks also reject a valid ID used with the wrong entity type.
do $$
declare rejected boolean := false;
begin
  begin
    insert into public.attachments (user_id, entity_type, entity_id, storage_path, mime_type, size_bytes)
      values ('11111111-1111-4111-8111-111111111111', 'vehicles',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bad/type', 'application/pdf', 10);
  exception when foreign_key_violation then rejected := true;
  end;
  if not rejected then raise exception 'wrong polymorphic entity type succeeded'; end if;
end;
$$;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
do $$
declare table_name text;
declare visible_count integer;
begin
  foreach table_name in array array[
    'profiles', 'tasks', 'recurrence_rules', 'reminders', 'attachments', 'pets',
    'pet_weight_entries', 'pet_health_events', 'pet_medications', 'pet_vaccinations',
    'vehicles', 'vehicle_service_records', 'vehicle_mileage_entries',
    'custom_field_definitions', 'custom_field_values', 'module_preferences'
  ] loop
    execute format('select count(*) from public.%I', table_name) into visible_count;
    if visible_count <> 1 then
      raise exception 'second owner read isolation failed for %: saw % rows', table_name, visible_count;
    end if;
  end loop;
  if (select title from public.tasks where id = 'ffffffff-ffff-4fff-8fff-ffffffffffff') <> 'Example B' then
    raise exception 'foreign UPDATE altered the task';
  end if;
end;
$$;

rollback;
