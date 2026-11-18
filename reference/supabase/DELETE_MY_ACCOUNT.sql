begin;
create or replace function public.delete_my_account(p_confirm boolean default false)
returns boolean language plpgsql security definer set search_path = '' as $$
declare who uuid := auth.uid();
begin
 if who is null or not exists(select 1 from auth.users where id=who) then
   raise exception '로그인이 필요합니다.';
 end if;
 if p_confirm is not true then return false; end if;
 if exists(select 1 from storage.objects where bucket_id='avatars' and split_part(name,'/',1)=who::text) then
   raise exception '프로필 사진 삭제가 완료되지 않았습니다. 다시 시도해 주세요.';
 end if;
 -- Clear own room first so cascading library deletion does not update its frames.
 delete from public.room_layout where user_id=who;
 delete from auth.users where id=who;
 return true;
end $$;
revoke all on function public.delete_my_account(boolean) from public, anon;
grant execute on function public.delete_my_account(boolean) to authenticated;
commit;
-- This installs the endpoint only; no account is deleted by this script.
