begin;
-- Missing source metadata stays NULL, never zero or fabricated.
alter table public.books alter column author drop not null, alter column publisher drop not null, alter column pages drop not null;
alter table public.books add column is_monthly boolean not null default false,
 add column shelf_order integer check(shelf_order>0),
 add column source_genre text,
 add column list_price integer check(list_price>=0),
 add column source_sale_price integer check(source_sale_price>=0),
 add column availability text,
 add column selection_reason text,
 add column source_url text check(source_url is null or source_url ~ '^https?://'),
 add column verification_note text,
 add column source_checked_at date,
 add column source_row integer;
create index books_monthly_order on public.books(shelf_order) where is_monthly;
-- Existing owned books may have no purchase receipt. Do not invent a price/date.
do $$ declare c record; begin
 for c in select conname from pg_constraint where conrelid='public.library_items'::regclass and contype='c'
 and pg_get_constraintdef(oid) like '%kind%' and pg_get_constraintdef(oid) like '%store%' loop
 execute format('alter table public.library_items drop constraint %I',c.conname);
 end loop;
end $$;
-- The public projection must track the new nullable book fields automatically.
comment on table public.books is 'Shared catalog; source metadata from the supplied workbook. Only server administrators may import.';
comment on table public.library_items is 'Private ownership/reading state. Purchase price is not the source sale price.';
commit;
