-- L-5: the first table of the frozen 16-table baseline. Later migrations add the rest.
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (char_length(display_name) <= 120),
  constraint profiles_timezone_length check (char_length(timezone) between 1 and 100)
);

alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, timezone) on public.profiles to authenticated;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create function public.set_profile_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.set_profile_updated_at() from public;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_profile_updated_at();

create function public.create_auth_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id) values (new.id);
  return new;
end;
$$;
revoke all on function public.create_auth_profile() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_auth_profile();

-- Account for development projects with users created before this migration.
insert into public.profiles (user_id)
select id from auth.users
on conflict (user_id) do nothing;
