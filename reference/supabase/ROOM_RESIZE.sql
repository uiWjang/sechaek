begin;
alter table public.room_layout add column if not exists shelf_transform jsonb not null default '{"x":24,"y":76,"scale":1}'::jsonb;
alter table public.room_layout drop constraint if exists shelf_transform_bounds;
alter table public.room_layout add constraint shelf_transform_bounds check (
 jsonb_typeof(shelf_transform)='object' and
 shelf_transform ?& array['x','y','scale'] and
 (shelf_transform->>'x')::numeric between 7 and 93 and
 (shelf_transform->>'y')::numeric between 12 and 87 and
 (shelf_transform->>'scale')::numeric between 0.4 and 2
);
commit;
select column_name from information_schema.columns where table_schema='public' and table_name='room_layout' and column_name='shelf_transform';
