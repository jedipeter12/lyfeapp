-- Run only against a disposable database after l6_auth_stub.sql and both migrations.
-- Synthetic users and rows are rolled back at the end.
begin;

insert into auth.users (id) values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222');
insert into public.pets (id, user_id, name, species) values
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '22222222-2222-4222-8222-222222222222', 'Other pet', 'Cat');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
set constraints all immediate;

insert into public.pets (id, user_id, name, species) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Fictional pet', 'Dog');
insert into public.vehicles (id, user_id, year, make, model, vin) values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111', 2020, 'Example', 'Model', ' 1hgcm82633a004352 ');
insert into public.tasks (id, user_id, title, status, priority, pet_id) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '11111111-1111-4111-8111-111111111111', 'Sample', 'open', 'normal', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

do $$
declare rejected boolean;
begin
  if (select vin from public.vehicles where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') <> '1HGCM82633A004352' then
    raise exception 'VIN was not normalized';
  end if;
  if has_table_privilege('authenticated', 'public.pets', 'DELETE') then
    raise exception 'app role can delete pets';
  end if;
  if has_column_privilege('authenticated', 'public.pets', 'user_id', 'UPDATE') then
    raise exception 'app role can change ownership';
  end if;

  rejected := false;
  begin
    insert into public.pets (user_id, name, species)
      values ('22222222-2222-4222-8222-222222222222', 'Foreign', 'Dog');
  exception when insufficient_privilege then rejected := true;
  end;
  if not rejected then raise exception 'foreign owner INSERT succeeded'; end if;

  rejected := false;
  begin
    insert into public.tasks (user_id, title, status, priority, pet_id)
      values ('11111111-1111-4111-8111-111111111111', 'Foreign pet', 'open', 'normal',
        'dddddddd-dddd-4ddd-8ddd-dddddddddddd');
  exception when foreign_key_violation then rejected := true;
  end;
  if not rejected then raise exception 'invalid pet reference succeeded'; end if;

  rejected := false;
  begin
    insert into public.tasks (user_id, title, status, priority, pet_id, vehicle_id)
      values ('11111111-1111-4111-8111-111111111111', 'Two links', 'open', 'normal',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  exception when check_violation then rejected := true;
  end;
  if not rejected then raise exception 'two task entity links succeeded'; end if;

  rejected := false;
  begin
    insert into public.attachments (user_id, entity_type, entity_id, storage_path, mime_type, size_bytes)
      values ('11111111-1111-4111-8111-111111111111', 'pets',
        'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'fake/path', 'image/jpeg', 10);
  exception when foreign_key_violation then rejected := true;
  end;
  if not rejected then raise exception 'orphan attachment succeeded'; end if;

  rejected := false;
  begin
    insert into public.pet_weight_entries (user_id, pet_id, weight_kg, measured_at)
      values ('11111111-1111-4111-8111-111111111111',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 0, now());
  exception when check_violation then rejected := true;
  end;
  if not rejected then raise exception 'zero weight succeeded'; end if;

  rejected := false;
  begin
    insert into public.pet_weight_entries (user_id, pet_id, weight_kg, measured_at)
      values ('11111111-1111-4111-8111-111111111111',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'NaN'::numeric, now());
  exception when check_violation then rejected := true;
  end;
  if not rejected then raise exception 'NaN weight succeeded'; end if;

  rejected := false;
  begin
    insert into public.pet_weight_entries (user_id, pet_id, weight_kg, measured_at)
      values ('11111111-1111-4111-8111-111111111111',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Infinity'::numeric, now());
  exception when check_violation then rejected := true;
  end;
  if not rejected then raise exception 'infinite weight succeeded'; end if;

  rejected := false;
  begin
    insert into public.vehicle_service_records (user_id, vehicle_id, service_type, performed_on, cost)
      values ('11111111-1111-4111-8111-111111111111',
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Synthetic service', current_date, 'NaN'::numeric);
  exception when check_violation then rejected := true;
  end;
  if not rejected then raise exception 'NaN cost succeeded'; end if;
end;
$$;

insert into public.attachments (user_id, entity_type, entity_id, storage_path, mime_type, size_bytes)
  values ('11111111-1111-4111-8111-111111111111', 'pets',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'fake/path', 'image/jpeg', 10);
insert into public.custom_field_definitions (id, user_id, module_type, name, field_type, config)
  values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', '11111111-1111-4111-8111-111111111111',
    'pets', 'Color', 'single-select', '{"options":["brown","black"]}');
insert into public.custom_field_values (user_id, definition_id, entity_id, value)
  values ('11111111-1111-4111-8111-111111111111',
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '"brown"');
insert into public.custom_field_definitions (id, user_id, module_type, name, field_type)
  values ('ffffffff-ffff-4fff-8fff-ffffffffffff',
    '11111111-1111-4111-8111-111111111111', 'pets', 'Date', 'date');

do $$
declare rejected boolean := false;
begin
  begin
    update public.custom_field_values set value = '"blue"'
      where definition_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  exception when check_violation then rejected := true;
  end;
  if not rejected then raise exception 'invalid select value succeeded'; end if;

  rejected := false;
  begin
    insert into public.custom_field_values (user_id, definition_id, entity_id, value)
      values ('11111111-1111-4111-8111-111111111111',
        'ffffffff-ffff-4fff-8fff-ffffffffffff',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '"2025-02-30"');
  exception when check_violation then rejected := true;
  end;
  if not rejected then raise exception 'invalid date value succeeded'; end if;

  rejected := false;
  begin
    insert into public.custom_field_definitions (user_id, module_type, name, field_type, config)
      values ('11111111-1111-4111-8111-111111111111',
        'pets', 'Bad options', 'single-select', '{"options":5}');
  exception when check_violation then rejected := true;
  end;
  if not rejected then raise exception 'invalid options config succeeded'; end if;
end;
$$;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
do $$
begin
  if exists (select 1 from public.pets where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
    or exists (select 1 from public.attachments)
    or exists (select 1 from public.custom_field_values) then
    raise exception 'owner RLS exposed another user''s data';
  end if;
end;
$$;

reset role;
do $$
begin
  if (select count(*) from pg_tables where schemaname = 'public' and tablename in (
    'profiles', 'tasks', 'recurrence_rules', 'reminders', 'attachments', 'pets',
    'pet_weight_entries', 'pet_health_events', 'pet_medications', 'pet_vaccinations',
    'vehicles', 'vehicle_service_records', 'vehicle_mileage_entries',
    'custom_field_definitions', 'custom_field_values', 'module_preferences'
  )) <> 16 then raise exception 'baseline table count is not 16'; end if;
  if (select count(*) from pg_tables where schemaname = 'public' and rowsecurity and tablename in (
    'profiles', 'tasks', 'recurrence_rules', 'reminders', 'attachments', 'pets',
    'pet_weight_entries', 'pet_health_events', 'pet_medications', 'pet_vaccinations',
    'vehicles', 'vehicle_service_records', 'vehicle_mileage_entries',
    'custom_field_definitions', 'custom_field_values', 'module_preferences'
  )) <> 16 then raise exception 'baseline RLS coverage is not 16'; end if;
end;
$$;

-- The auth deletion path clears every user-owned row, including polymorphic
-- records. Deferred parent FKs permit the complete account cascade.
set constraints all deferred;
delete from auth.users where id = '11111111-1111-4111-8111-111111111111';
do $$
begin
  if exists (select 1 from public.profiles where user_id = '11111111-1111-4111-8111-111111111111')
    or exists (select 1 from public.pets where user_id = '11111111-1111-4111-8111-111111111111')
    or exists (select 1 from public.tasks where user_id = '11111111-1111-4111-8111-111111111111')
    or exists (select 1 from public.attachments where user_id = '11111111-1111-4111-8111-111111111111')
    or exists (select 1 from public.custom_field_values where user_id = '11111111-1111-4111-8111-111111111111') then
    raise exception 'account cascade left owned rows behind';
  end if;
end;
$$;

rollback;
