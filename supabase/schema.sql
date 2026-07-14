create extension if not exists pgcrypto;

create table if not exists public.app_records (
  id uuid primary key default gen_random_uuid(),
  entity text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists app_records_entity_idx on public.app_records (entity);
create index if not exists app_records_data_gin_idx on public.app_records using gin (data);
create index if not exists app_records_updated_at_idx on public.app_records (updated_at desc);

create or replace function public.set_app_records_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_records_set_updated_at on public.app_records;
create trigger app_records_set_updated_at
before update on public.app_records
for each row
execute function public.set_app_records_updated_at();

alter table public.app_records enable row level security;

drop policy if exists "Open read access" on public.app_records;
drop policy if exists "Open insert access" on public.app_records;
drop policy if exists "Open update access" on public.app_records;
drop policy if exists "Open delete access" on public.app_records;

create policy "Open read access"
on public.app_records for select
to anon, authenticated
using (true);

create policy "Open insert access"
on public.app_records for insert
to anon, authenticated
with check (true);

create policy "Open update access"
on public.app_records for update
to anon, authenticated
using (true)
with check (true);

create policy "Open delete access"
on public.app_records for delete
to anon, authenticated
using (true);

grant select, insert, update, delete on public.app_records to anon, authenticated;
grant all on public.app_records to service_role;

insert into storage.buckets (id, name, public)
values ('procurement_uploads', 'procurement_uploads', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Open upload read access" on storage.objects;
drop policy if exists "Open upload insert access" on storage.objects;
drop policy if exists "Open upload update access" on storage.objects;
drop policy if exists "Open upload delete access" on storage.objects;

create policy "Open upload read access"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'procurement_uploads');

create policy "Open upload insert access"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'procurement_uploads');

create policy "Open upload update access"
on storage.objects for update
to anon, authenticated
using (bucket_id = 'procurement_uploads')
with check (bucket_id = 'procurement_uploads');

create policy "Open upload delete access"
on storage.objects for delete
to anon, authenticated
using (bucket_id = 'procurement_uploads');
