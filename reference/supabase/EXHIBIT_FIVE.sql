begin;
do $migration$
declare c record;
begin
 for c in select conname from pg_constraint where conrelid='public.room_layout'::regclass and contype='c' and pg_get_constraintdef(oid) like '%jsonb_array_length(frames)%' loop
 execute format('alter table public.room_layout drop constraint %I',c.conname);
 end loop;
end $migration$;
alter table public.room_layout add constraint room_exhibit_max_five check(jsonb_typeof(frames)='array' and jsonb_array_length(frames)<=5);
alter table public.room_layout alter column frames set default '[]'::jsonb;
commit;
select conname from pg_constraint where conrelid='public.room_layout'::regclass and conname='room_exhibit_max_five';
