-- Run only against a disposable database after the auth stub and all migrations.
-- Every row is synthetic and rolled back.
begin;
insert into auth.users (id) values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222');
insert into public.pets (id, user_id, name, species) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Example pet', 'dog'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'Other pet', 'cat');
insert into public.vehicles (id, user_id, year, make, model) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '11111111-1111-4111-8111-111111111111', 2020, 'Example', 'Car');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
set constraints all immediate;

insert into public.custom_field_definitions (id, user_id, module_type, name, field_type, config) values
  ('10000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'pets', 'Color', 'single-select', '{"options":["brown","black"]}'),
  ('10000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'pets', 'Weight note', 'text', '{}'),
  ('10000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'pets', 'Rating', 'number', '{}'),
  ('10000000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'pets', 'Observed', 'date', '{}'),
  ('10000000-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', 'pets', 'Active', 'boolean', '{}');

insert into public.custom_field_values (user_id, definition_id, entity_id, value) values
  ('11111111-1111-4111-8111-111111111111', '10000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '"brown"'),
  ('11111111-1111-4111-8111-111111111111', '10000000-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '"Example"'),
  ('11111111-1111-4111-8111-111111111111', '10000000-0000-4000-8000-000000000003', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '2.5'),
  ('11111111-1111-4111-8111-111111111111', '10000000-0000-4000-8000-000000000004', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '"2024-02-29"'),
  ('11111111-1111-4111-8111-111111111111', '10000000-0000-4000-8000-000000000005', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'false');

do $$
declare rejected boolean;
begin
  rejected := false;
  begin
    insert into public.custom_field_values (user_id, definition_id, entity_id, value)
      values ('11111111-1111-4111-8111-111111111111',
        '10000000-0000-4000-8000-000000000001',
        'cccccccc-cccc-4ccc-8ccc-cccccccccccc', '"brown"');
  exception when foreign_key_violation then rejected := true;
  end;
  if not rejected then raise exception 'cross-module value succeeded'; end if;

  rejected := false;
  begin
    insert into public.custom_field_values (user_id, definition_id, entity_id, value)
      values ('11111111-1111-4111-8111-111111111111',
        '10000000-0000-4000-8000-000000000001',
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '"brown"');
  exception when foreign_key_violation then rejected := true;
  end;
  if not rejected then raise exception 'foreign entity value succeeded'; end if;

  rejected := false;
  begin
    update public.custom_field_values set value = '"blue"'
      where definition_id = '10000000-0000-4000-8000-000000000001';
  exception when check_violation then rejected := true;
  end;
  if not rejected then raise exception 'unknown select option succeeded'; end if;

  rejected := false;
  begin
    update public.custom_field_values set value = '"2.5"'
      where definition_id = '10000000-0000-4000-8000-000000000003';
  exception when check_violation then rejected := true;
  end;
  if not rejected then raise exception 'wrong number type succeeded'; end if;

  rejected := false;
  begin
    update public.custom_field_values set value = '"2025-02-29"'
      where definition_id = '10000000-0000-4000-8000-000000000004';
  exception when check_violation then rejected := true;
  end;
  if not rejected then raise exception 'invalid date succeeded'; end if;

  rejected := false;
  begin
    update public.custom_field_values set value = '"false"'
      where definition_id = '10000000-0000-4000-8000-000000000005';
  exception when check_violation then rejected := true;
  end;
  if not rejected then raise exception 'wrong boolean type succeeded'; end if;
end;
$$;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
do $$
declare rejected boolean := false;
begin
  if exists (select 1 from public.custom_field_definitions)
    or exists (select 1 from public.custom_field_values) then
    raise exception 'cross-user read succeeded';
  end if;
  begin
    insert into public.custom_field_values (user_id, definition_id, entity_id, value)
      values ('22222222-2222-4222-8222-222222222222',
        '10000000-0000-4000-8000-000000000001',
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '"brown"');
  exception when foreign_key_violation then rejected := true;
  end;
  if not rejected then raise exception 'cross-user definition reference succeeded'; end if;
end;
$$;

rollback;
