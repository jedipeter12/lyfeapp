-- Disposable PostgreSQL only. Minimal Storage objects needed to exercise the
-- L-11 migration and policies; this is not the Supabase Storage API.
create schema storage;
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null references storage.buckets(id),
  name text not null,
  owner_id text
);
create function storage.foldername(object_name text)
returns text[] language sql stable as $$
  select string_to_array(regexp_replace(object_name, '/[^/]*$', ''), '/')
$$;
alter table storage.objects enable row level security;
grant usage on schema storage to authenticated, anon;
grant select, insert, update, delete on storage.objects to authenticated;
grant execute on function storage.foldername(text) to authenticated, anon;
