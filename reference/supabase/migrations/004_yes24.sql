begin;
alter table public.books add column if not exists isbn13 text,
 add column if not exists yes24_id text,
 add column if not exists cover_url text,
 add column if not exists yes24_url text,
 add column if not exists metadata_updated_at timestamptz;
create unique index if not exists books_yes24_id on public.books(yes24_id) where yes24_id is not null;
create index if not exists books_isbn13 on public.books(isbn13);
-- Short-lived API responses, not a mirror of the provider's entire catalog.
create table if not exists public.yes24_cache(
 key text primary key, payload jsonb not null, expires_at timestamptz not null,
 updated_at timestamptz not null default now()
);
alter table public.yes24_cache enable row level security;
revoke all on public.yes24_cache from anon,authenticated;
grant all on public.yes24_cache to service_role;
-- Shared, bounded provider budget; only the backend may call this function.
create table if not exists public.yes24_budget(bucket text primary key, used integer not null);
alter table public.yes24_budget enable row level security;
revoke all on public.yes24_budget from anon,authenticated;
create or replace function public.take_yes24_budget() returns boolean
language plpgsql security definer set search_path='' as $$
declare n integer; begin
 insert into public.yes24_budget(bucket,used) values(to_char(now(),'YYYY-MM-DD-HH24'),1)
 on conflict(bucket) do update set used=public.yes24_budget.used+1 returning used into n;
 delete from public.yes24_budget where bucket < to_char(now()-interval '2 days','YYYY-MM-DD-HH24');
 return n<=400;
end $$;
revoke all on function public.take_yes24_budget() from public,anon,authenticated;
grant execute on function public.take_yes24_budget() to service_role;
commit;
