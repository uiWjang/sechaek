-- Replace the three email values with the actual accounts created in Supabase Auth.
-- This links existing Auth accounts; it does not create passwords or bypass email verification.
begin;
do $$
declare
  emails text[] := array['USER1_EMAIL_HERE','USER2_EMAIL_HERE','USER3_EMAIL_HERE'];
  ids uuid[] := '{}';
  uid uuid;
  i integer;
begin
  if (select count(distinct lower(e)) from unnest(emails) e) <> 3 then
    raise exception '세 계정의 이메일은 서로 달라야 합니다.';
  end if;
  for i in 1..3 loop
    select id into uid from auth.users where lower(email)=lower(emails[i]);
    if uid is null then raise exception 'Auth에 계정이 없습니다: user%',i; end if;
    ids := array_append(ids,uid);
  end loop;
  for i in 1..3 loop
    update public.profiles set nickname='user'||i where id=ids[i];
  end loop;
  insert into public.library_items(id,user_id,book_id,kind,status,genres,is_public)
  select source.library_id,ids[1],b.id,'owned','planned',b.genres,false
  from (values
('a05d3a48-69b5-5650-a08e-d8fbfe15269d'::uuid, '7bdf71fe-9546-5964-bc32-5fe53235dbb7'::uuid),
('bafb6c1d-1215-56b6-a7c6-f44aeae38aae'::uuid, 'c1734ac7-07f8-5132-bebc-919fe3b54b99'::uuid),
('d2f06f54-729d-5b0e-b1cb-f78dd99ca968'::uuid, 'e3fa435c-0bdb-5e14-8c05-0a5abe7d5ef8'::uuid),
('56bd28ce-b462-594f-b734-6ce8afa6569e'::uuid, '1490735b-b091-573f-b6a2-925ecf4b3494'::uuid),
('51a49a8f-77c5-59f9-9aec-11bc09adee86'::uuid, '1a921e6a-f916-5aaa-8bb6-cdba65d39309'::uuid),
('3e8bf6e4-0246-50e0-bcd9-5d321ff42406'::uuid, 'f525304a-80cf-550f-96ce-677505fed089'::uuid),
('5f3b98dc-7f8c-56ca-8a88-71586ecf7146'::uuid, '599c55a3-cd2b-5792-a5cc-7e20db473a31'::uuid),
('0f0b6c3e-f630-5319-a79d-e37a9ecc0b94'::uuid, '15f67d79-be29-56f7-aefd-c48276e3d09f'::uuid),
('4b7682a8-f9e2-56f8-a0eb-7b78806980f2'::uuid, '8b144694-bfef-529a-b538-9cf956a997e7'::uuid),
('fdaf16f6-a350-59d2-812b-87fc0c4fa047'::uuid, 'bb0ef033-4ded-5fcc-aa02-2f2d305c6354'::uuid),
('0c476049-f207-55f6-b087-bf73d5e853a0'::uuid, '46ac52cd-6693-568b-967f-41e0522702e0'::uuid)
  ) as source(library_id,book_id)
  join public.books b on b.id=source.book_id
  on conflict(user_id,book_id,kind) do nothing;
end $$;
commit;