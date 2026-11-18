-- Run as the project administrator in the Supabase SQL Editor.
begin;
alter table public.profiles add column if not exists avatar_url text;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('avatars','avatars',true,2097152,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=2097152,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists avatar_upload_owner on storage.objects;
create policy avatar_upload_owner on storage.objects for insert to authenticated
with check(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists avatar_delete_owner on storage.objects;
create policy avatar_delete_owner on storage.objects for delete to authenticated
using(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists avatar_read on storage.objects;
create policy avatar_read on storage.objects for select to anon,authenticated
using(bucket_id='avatars');
commit;
