-- L-6: the remaining tables in the frozen Architecture v1.0 baseline.
-- App roles have no DELETE grant. Parent links use deferred NO ACTION so a
-- future delete flow must explicitly handle dependants before removing parents.
-- Removing an auth user cascades through profiles to all of their rows.

create table public.pets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  species text not null check (length(btrim(species)) > 0),
  breed text,
  birth_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id)
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  year integer not null check (year >= 0),
  make text not null check (length(btrim(make)) > 0),
  model text not null check (length(btrim(model)) > 0),
  vin text,
  current_mileage integer check (current_mileage >= 0),
  unique (user_id, id),
  unique (user_id, vin)
);

create function public.normalize_vehicle_vin()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.vin := nullif(upper(regexp_replace(new.vin, '[[:space:]]', '', 'g')), '');
  return new;
end;
$$;
revoke all on function public.normalize_vehicle_vin() from public;
create trigger vehicles_normalize_vin before insert or update of vin on public.vehicles
  for each row execute function public.normalize_vehicle_vin();

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  description text,
  status text not null check (length(btrim(status)) > 0),
  priority text not null check (length(btrim(priority)) > 0),
  due_at timestamptz,
  completed_at timestamptz,
  pet_id uuid,
  vehicle_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  constraint tasks_one_entity check (num_nonnulls(pet_id, vehicle_id) <= 1),
  constraint tasks_pet_owner foreign key (user_id, pet_id)
    references public.pets(user_id, id) deferrable initially deferred,
  constraint tasks_vehicle_owner foreign key (user_id, vehicle_id)
    references public.vehicles(user_id, id) deferrable initially deferred
);

create table public.recurrence_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  task_id uuid not null,
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly', 'yearly')),
  interval integer not null default 1 check (interval > 0),
  weekdays smallint[],
  timezone text not null check (length(btrim(timezone)) > 0),
  end_at timestamptz,
  constraint recurrence_weekdays check (
    weekdays is null or weekdays <@ array[0,1,2,3,4,5,6]::smallint[]
  ),
  constraint recurrence_task_owner foreign key (user_id, task_id)
    references public.tasks(user_id, id) deferrable initially deferred
);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  task_id uuid not null,
  remind_at timestamptz not null,
  status text not null check (length(btrim(status)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reminders_task_owner foreign key (user_id, task_id)
    references public.tasks(user_id, id) deferrable initially deferred
);

create table public.pet_weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  pet_id uuid not null,
  weight_kg numeric not null check (weight_kg > 0),
  measured_at timestamptz not null,
  constraint pet_weight_owner foreign key (user_id, pet_id)
    references public.pets(user_id, id) deferrable initially deferred
);

create table public.pet_health_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  pet_id uuid not null,
  event_type text not null check (length(btrim(event_type)) > 0),
  occurred_at timestamptz not null,
  notes text,
  constraint pet_health_owner foreign key (user_id, pet_id)
    references public.pets(user_id, id) deferrable initially deferred
);

create table public.pet_medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  pet_id uuid not null,
  name text not null check (length(btrim(name)) > 0),
  dosage_text text,
  start_date date,
  end_date date,
  constraint pet_medication_dates check (end_date is null or start_date is null or end_date >= start_date),
  constraint pet_medications_owner foreign key (user_id, pet_id)
    references public.pets(user_id, id) deferrable initially deferred
);

create table public.pet_vaccinations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  pet_id uuid not null,
  name text not null check (length(btrim(name)) > 0),
  administered_on date,
  due_on date,
  constraint pet_vaccinations_owner foreign key (user_id, pet_id)
    references public.pets(user_id, id) deferrable initially deferred
);

create table public.vehicle_service_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  vehicle_id uuid not null,
  service_type text not null check (length(btrim(service_type)) > 0),
  performed_on date not null,
  odometer integer check (odometer >= 0),
  cost numeric check (cost >= 0),
  currency_code text check (currency_code ~ '^[A-Z]{3}$'),
  constraint vehicle_service_owner foreign key (user_id, vehicle_id)
    references public.vehicles(user_id, id) deferrable initially deferred
);

create table public.vehicle_mileage_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  vehicle_id uuid not null,
  odometer integer not null check (odometer >= 0),
  recorded_at timestamptz not null,
  constraint vehicle_mileage_owner foreign key (user_id, vehicle_id)
    references public.vehicles(user_id, id) deferrable initially deferred
);

create table public.custom_field_definitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  module_type text not null check (module_type in ('tasks', 'pets', 'vehicles')),
  name text not null check (length(btrim(name)) > 0),
  field_type text not null check (field_type in ('text', 'number', 'date', 'boolean', 'single-select')),
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  unique (user_id, id)
);

create table public.custom_field_values (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  definition_id uuid not null,
  entity_id uuid not null,
  value jsonb not null,
  unique (definition_id, entity_id),
  constraint custom_value_definition_owner foreign key (user_id, definition_id)
    references public.custom_field_definitions(user_id, id) deferrable initially deferred
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  storage_path text not null check (length(btrim(storage_path)) > 0),
  mime_type text not null check (length(btrim(mime_type)) > 0),
  size_bytes bigint not null check (size_bytes >= 0),
  unique (storage_path),
  constraint attachment_entity_type check (entity_type in (
    'tasks', 'pets', 'pet_weight_entries', 'pet_health_events',
    'pet_medications', 'pet_vaccinations', 'vehicles',
    'vehicle_service_records', 'vehicle_mileage_entries'
  ))
);

create table public.module_preferences (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  module_type text not null check (module_type in ('tasks', 'pets', 'vehicles')),
  enabled boolean not null default true,
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  primary key (user_id, module_type)
);

-- Entity checks run with the caller's permissions. Every referenced table has
-- owner RLS, so a missing or foreign entity produces the same rejection.
create function public.check_owned_entity(entity_table text, entity_id uuid, owner_id uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare found_entity boolean;
begin
  if entity_table not in (
    'tasks', 'pets', 'pet_weight_entries', 'pet_health_events',
    'pet_medications', 'pet_vaccinations', 'vehicles',
    'vehicle_service_records', 'vehicle_mileage_entries'
  ) then
    return false;
  end if;
  execute format('select exists (select 1 from public.%I where id = $1 and user_id = $2)', entity_table)
    into found_entity using entity_id, owner_id;
  return found_entity;
end;
$$;
revoke all on function public.check_owned_entity(text, uuid, uuid) from public;
grant execute on function public.check_owned_entity(text, uuid, uuid) to authenticated;

create function public.validate_attachment_entity()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if not public.check_owned_entity(new.entity_type, new.entity_id, new.user_id) then
    raise exception 'attachment entity is unavailable to this user' using errcode = '23503';
  end if;
  return new;
end;
$$;
revoke all on function public.validate_attachment_entity() from public;
create trigger attachments_validate_entity before insert or update of entity_type, entity_id, user_id
  on public.attachments for each row execute function public.validate_attachment_entity();

create function public.validate_custom_field_definition()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.field_type = 'single-select' then
    if jsonb_typeof(new.config -> 'options') is distinct from 'array' then
      raise exception 'single-select requires a string options array' using errcode = '23514';
    end if;
    if jsonb_array_length(new.config -> 'options') = 0 or exists (
      select 1 from jsonb_array_elements(new.config -> 'options') as option_value
      where jsonb_typeof(option_value) <> 'string'
    ) then
      raise exception 'single-select requires a nonempty string options array' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.validate_custom_field_definition() from public;
create trigger custom_field_definitions_validate before insert or update of field_type, config
  on public.custom_field_definitions for each row execute function public.validate_custom_field_definition();

create function public.validate_custom_field_value()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare definition record;
declare value_text text;
begin
  select module_type, field_type, config into definition
    from public.custom_field_definitions
    where id = new.definition_id and user_id = new.user_id;
  if not found or not public.check_owned_entity(definition.module_type, new.entity_id, new.user_id) then
    raise exception 'custom field entity or definition is unavailable to this user' using errcode = '23503';
  end if;
  value_text := new.value #>> '{}';
  if not (
    (definition.field_type = 'text' and jsonb_typeof(new.value) = 'string')
    or (definition.field_type = 'number' and jsonb_typeof(new.value) = 'number')
    or (definition.field_type = 'boolean' and jsonb_typeof(new.value) = 'boolean')
    or (definition.field_type = 'single-select' and jsonb_typeof(new.value) = 'string'
        and definition.config -> 'options' ? value_text)
    or (definition.field_type = 'date' and jsonb_typeof(new.value) = 'string'
        and value_text ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        and to_char(value_text::date, 'YYYY-MM-DD') = value_text)
  ) then
    raise exception 'custom field value does not match its definition' using errcode = '23514';
  end if;
  return new;
exception when invalid_datetime_format or datetime_field_overflow then
  raise exception 'invalid custom field date' using errcode = '23514';
end;
$$;
revoke all on function public.validate_custom_field_value() from public;
create trigger custom_field_values_validate before insert or update of definition_id, entity_id, user_id, value
  on public.custom_field_values for each row execute function public.validate_custom_field_value();

create function public.touch_baseline_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.touch_baseline_updated_at() from public;
create trigger pets_updated_at before update on public.pets
  for each row execute function public.touch_baseline_updated_at();
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.touch_baseline_updated_at();
create trigger reminders_updated_at before update on public.reminders
  for each row execute function public.touch_baseline_updated_at();

-- RLS and grants apply to every table, including tables reached by triggers.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'pets', 'vehicles', 'tasks', 'recurrence_rules', 'reminders',
    'pet_weight_entries', 'pet_health_events', 'pet_medications', 'pet_vaccinations',
    'vehicle_service_records', 'vehicle_mileage_entries',
    'custom_field_definitions', 'custom_field_values', 'attachments', 'module_preferences'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from public, anon, authenticated', table_name);
    execute format('grant select, insert on public.%I to authenticated', table_name);
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)', table_name || '_select_own', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', table_name || '_insert_own', table_name);
    execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name || '_update_own', table_name);
  end loop;
end;
$$;

grant update (name, species, breed, birth_date, notes) on public.pets to authenticated;
grant update (year, make, model, vin, current_mileage) on public.vehicles to authenticated;
grant update (title, description, status, priority, due_at, completed_at, pet_id, vehicle_id) on public.tasks to authenticated;
grant update (frequency, interval, weekdays, timezone, end_at) on public.recurrence_rules to authenticated;
grant update (remind_at, status) on public.reminders to authenticated;
grant update (weight_kg, measured_at) on public.pet_weight_entries to authenticated;
grant update (event_type, occurred_at, notes) on public.pet_health_events to authenticated;
grant update (name, dosage_text, start_date, end_date) on public.pet_medications to authenticated;
grant update (name, administered_on, due_on) on public.pet_vaccinations to authenticated;
grant update (service_type, performed_on, odometer, cost, currency_code) on public.vehicle_service_records to authenticated;
grant update (odometer, recorded_at) on public.vehicle_mileage_entries to authenticated;
grant update (name) on public.custom_field_definitions to authenticated;
grant update (value) on public.custom_field_values to authenticated;
grant update (storage_path, mime_type, size_bytes) on public.attachments to authenticated;
grant update (enabled, settings) on public.module_preferences to authenticated;

-- FK and owner lookup indexes. PK and UNIQUE constraints cover other references.
create index tasks_pet_idx on public.tasks (user_id, pet_id) where pet_id is not null;
create index tasks_vehicle_idx on public.tasks (user_id, vehicle_id) where vehicle_id is not null;
create index tasks_due_idx on public.tasks (user_id, due_at) where due_at is not null;
create index recurrence_rules_task_idx on public.recurrence_rules (user_id, task_id);
create index reminders_task_idx on public.reminders (user_id, task_id);
create index reminders_remind_idx on public.reminders (user_id, remind_at);
create index pet_weight_entries_pet_idx on public.pet_weight_entries (user_id, pet_id);
create index pet_health_events_pet_idx on public.pet_health_events (user_id, pet_id);
create index pet_medications_pet_idx on public.pet_medications (user_id, pet_id);
create index pet_vaccinations_pet_idx on public.pet_vaccinations (user_id, pet_id);
create index vehicle_service_records_vehicle_idx on public.vehicle_service_records (user_id, vehicle_id);
create index vehicle_mileage_entries_vehicle_idx on public.vehicle_mileage_entries (user_id, vehicle_id);
create index custom_field_values_definition_idx on public.custom_field_values (user_id, definition_id);
create index custom_field_values_entity_idx on public.custom_field_values (user_id, entity_id);
create index attachments_entity_idx on public.attachments (user_id, entity_type, entity_id);
