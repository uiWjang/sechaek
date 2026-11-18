-- Run once on a new Supabase project. PostgreSQL 15+.
begin;
create table public.profiles(id uuid primary key references auth.users(id) on delete cascade,nickname text not null check(char_length(nickname) between 1 and 30),intro text not null default '' check(char_length(intro)<=160));
create table public.books(id uuid primary key default gen_random_uuid(),title text not null,author text not null,publisher text not null,genres text[] not null default '{}',pages integer not null check(pages>0),description text not null default '');
create table public.store_prices(id uuid primary key default gen_random_uuid(),book_id uuid not null references public.books on delete cascade,store text not null check(store in ('교보문고','알라딘','예스24','리디')),format text not null check(format in ('paper','ebook')),list_price integer not null check(list_price>=0),discount integer not null default 0 check(discount>=0),coupon integer not null default 0 check(coupon>=0),points integer not null default 0 check(points>=0),unique(book_id,store,format));
create table public.library_items(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles on delete cascade,book_id uuid not null references public.books,kind text not null check(kind in ('owned','wishlist')),status text not null default 'planned' check(status in ('planned','reading','finished','paused')),started_at date,finished_at date,store text check(store in ('교보문고','알라딘','예스24','리디')),price integer check(price>=0),purchased_at date,is_public boolean not null default false,read_pages integer not null default 0 check(read_pages>=0),rating integer not null default 0 check(rating between 0 and 5),genres text[] not null default '{}',format text not null default '종이책' check(format in ('종이책','전자책')),possession text not null default '소장' check(possession in ('소장','대여','미소장')),unique(user_id,book_id,kind),unique(id,user_id),check(kind<>'owned' or (store is not null and price is not null and purchased_at is not null)),check(started_at is null or finished_at is null or started_at<=finished_at));
create table public.reading_logs(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles on delete cascade,library_item_id uuid not null,pages integer not null check(pages>=0),content text not null check(char_length(content) between 1 and 2000),created_at timestamptz not null default now(),foreign key(library_item_id,user_id) references public.library_items(id,user_id) on delete cascade);
create table public.notes(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles on delete cascade,book_id uuid not null references public.books,summary text not null default '',story text not null default '',impression text not null default '',quotes jsonb not null default '[]' check(jsonb_typeof(quotes)='array'),unique(user_id,book_id));
create table public.reviews(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles on delete cascade,book_id uuid not null references public.books,content text not null check(char_length(content) between 1 and 4000),rating integer not null check(rating between 0 and 5),visibility text not null default 'private' check(visibility in ('private','followers','public')),created_at timestamptz not null default now());
create table public.follows(id uuid primary key default gen_random_uuid(),follower_id uuid not null references public.profiles on delete cascade,following_id uuid not null references public.profiles on delete cascade,unique(follower_id,following_id),check(follower_id<>following_id));
create table public.bookmark_ledger(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles on delete cascade,amount integer not null,reason text not null,created_at timestamptz not null default now());
create table public.shop_items(id uuid primary key default gen_random_uuid(),name text not null,theme text not null check(theme in ('기본','추리','SF','로맨스','판타지')),category text not null,price integer not null check((theme='기본' and price=0) or (theme<>'기본' and price between 20 and 80)),shape text not null check(shape in ('wall','floor','shelf','frame','lamp','plant','rug','clock','outfit')));
create table public.room_items(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles on delete cascade,item_id uuid not null references public.shop_items,unique(user_id,item_id));
create table public.room_layout(id uuid primary key default gen_random_uuid(),user_id uuid not null unique references public.profiles on delete cascade,placements jsonb not null default '[]' check(jsonb_typeof(placements)='array'),frames jsonb not null default '[null,null,null]' check(jsonb_typeof(frames)='array' and jsonb_array_length(frames)=3),wallpaper uuid references public.shop_items,floor uuid references public.shop_items,shelf uuid references public.shop_items,frame uuid references public.shop_items,outfit uuid references public.shop_items);
create table public.diary_entries(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles on delete cascade,book_id uuid not null references public.books,content text not null check(char_length(content) between 1 and 2000),visibility text not null default 'private' check(visibility in ('private','followers','public')),is_featured boolean not null default false,created_at timestamptz not null default now());
create unique index one_featured_per_user on public.diary_entries(user_id) where is_featured;
create table public.guestbook_entries(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles on delete cascade,owner_id uuid not null references public.profiles on delete cascade,book_id uuid not null references public.books,content text not null check(char_length(content) between 1 and 1000),created_at timestamptz not null default now());
create table public.monthly_picks(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles on delete cascade,book_id uuid not null references public.books,reason text not null check(char_length(reason) between 1 and 500),month text not null check(month ~ '^\d{4}-(0[1-9]|1[0-2])$'),unique(user_id,month));
create table public.room_visits(id uuid primary key default gen_random_uuid(),owner_id uuid not null references public.profiles on delete cascade,user_id uuid not null references public.profiles on delete cascade,visited_at date not null default (now() at time zone 'Asia/Seoul')::date,unique(owner_id,user_id,visited_at));
create index library_owner on public.library_items(user_id);
create index logs_owner on public.reading_logs(user_id);
create index ledger_owner on public.bookmark_ledger(user_id);
create index reviews_book on public.reviews(book_id);
create index diary_owner on public.diary_entries(user_id);
create index guest_owner on public.guestbook_entries(owner_id);
create index follows_author on public.follows(following_id,follower_id);

-- All tables are protected, including those containing public projections.
do $$ declare t text; begin foreach t in array array['profiles','books','store_prices','library_items','reading_logs','notes','reviews','follows','bookmark_ledger','shop_items','room_items','room_layout','diary_entries','guestbook_entries','monthly_picks','room_visits'] loop execute format('alter table public.%I enable row level security',t); end loop; end $$;
grant usage on schema public to anon,authenticated;
grant select on all tables in schema public to anon,authenticated;
grant insert,update,delete on public.profiles,public.library_items,public.notes,public.reviews,public.follows,public.room_layout,public.diary_entries,public.guestbook_entries,public.monthly_picks to authenticated;
grant update,delete on public.reading_logs to authenticated;
revoke insert,update,delete on public.bookmark_ledger,public.room_items,public.shop_items,public.books,public.store_prices,public.room_visits from anon,authenticated;
create policy profiles_read on public.profiles for select using(true);
create policy profiles_edit on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy books_read on public.books for select using(true);
create policy prices_read on public.store_prices for select using(true);
create policy items_read on public.shop_items for select using(true);
create policy follows_read on public.follows for select using(true);
create policy follows_create on public.follows for insert to authenticated with check(follower_id=auth.uid());
create policy follows_delete on public.follows for delete to authenticated using(follower_id=auth.uid());
do $$ declare t text; begin foreach t in array array['library_items','notes'] loop execute format('create policy owner_access on public.%I for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid())',t); end loop; end $$;
create policy logs_read on public.reading_logs for select to authenticated using(user_id=auth.uid());
create policy logs_edit on public.reading_logs for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy logs_delete on public.reading_logs for delete to authenticated using(user_id=auth.uid());
create policy ledger_read on public.bookmark_ledger for select to authenticated using(user_id=auth.uid());
create function public.can_view(p_author uuid,p_visibility text) returns boolean language sql stable set search_path='' as $$ select p_author=auth.uid() or p_visibility='public' or (p_visibility='followers' and exists(select 1 from public.follows where follower_id=auth.uid() and following_id=p_author)) $$;
do $$ declare t text; begin foreach t in array array['reviews','diary_entries'] loop execute format('create policy visible_read on public.%I for select using(public.can_view(user_id,visibility))',t); execute format('create policy owner_insert on public.%I for insert to authenticated with check(user_id=auth.uid())',t); execute format('create policy owner_update on public.%I for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid())',t); execute format('create policy owner_delete on public.%I for delete to authenticated using(user_id=auth.uid())',t); end loop; end $$;
create policy inventory_read on public.room_items for select using(true);
create policy layout_read on public.room_layout for select using(true);
create policy layout_create on public.room_layout for insert to authenticated with check(user_id=auth.uid());
create policy layout_edit on public.room_layout for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy guest_read on public.guestbook_entries for select using(true);
create policy guest_create on public.guestbook_entries for insert to authenticated with check(user_id=auth.uid() and owner_id<>auth.uid());
create policy guest_delete on public.guestbook_entries for delete to authenticated using(user_id=auth.uid() or owner_id=auth.uid());
create policy picks_read on public.monthly_picks for select using(true);
create policy picks_create on public.monthly_picks for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.library_items l where l.user_id=auth.uid() and l.book_id=monthly_picks.book_id));
create policy picks_edit on public.monthly_picks for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid() and exists(select 1 from public.library_items l where l.user_id=auth.uid() and l.book_id=monthly_picks.book_id));
create policy picks_delete on public.monthly_picks for delete to authenticated using(user_id=auth.uid());

-- Lock one profile row for every credit/debit to serialize transactions per user.
create function public.reward_library() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.read_pages>(select pages from public.books where id=new.book_id) then raise exception '읽은 쪽수가 전체 쪽수를 초과합니다.'; end if;
 if new.status='finished' and (tg_op='INSERT' or old.status<>'finished') then
  perform 1 from public.profiles where id=new.user_id for update;
  insert into public.bookmark_ledger(user_id,amount,reason) values(new.user_id,10,'완독');
 end if;
 return new;
end $$;
create trigger library_reward before insert or update on public.library_items for each row execute function public.reward_library();
create function public.reward_log() returns trigger language plpgsql security definer set search_path='' as $$ begin perform 1 from public.profiles where id=new.user_id for update; insert into public.bookmark_ledger(user_id,amount,reason) values(new.user_id,3,'독서 기록');return new;end $$;
create trigger log_reward after insert on public.reading_logs for each row execute function public.reward_log();
create function public.add_reading_log(p_library uuid,p_pages integer,p_content text) returns uuid language plpgsql security definer set search_path='' as $$ declare result uuid; begin
 if auth.uid() is null or not exists(select 1 from public.library_items where id=p_library and user_id=auth.uid()) then raise exception '접근할 수 없는 서재입니다.';end if;
 insert into public.reading_logs(user_id,library_item_id,pages,content) values(auth.uid(),p_library,p_pages,p_content) returning id into result;return result;end $$;
create function public.buy_items(p_item uuid default null,p_theme text default null) returns integer language plpgsql security definer set search_path='' as $$
declare who uuid:=auth.uid(); chosen uuid[];cost integer;balance integer;
begin
 if who is null then raise exception '로그인이 필요합니다.';end if;
 if (p_item is null)=(p_theme is null) then raise exception '아이템 또는 테마 하나를 선택하세요.';end if;
 perform 1 from public.profiles where id=who for update;
 select array_agg(i.id),case when p_theme is not null then ceil(sum(i.price)*0.8)::integer else sum(i.price)::integer end into chosen,cost from public.shop_items i where ((p_item is not null and i.id=p_item) or (p_theme is not null and i.theme=p_theme and i.theme<>'기본')) and not exists(select 1 from public.room_items r where r.user_id=who and r.item_id=i.id);
 if chosen is null then raise exception '이미 보유한 아이템이거나 올바르지 않은 상품입니다.';end if;
 select coalesce(sum(amount),0) into balance from public.bookmark_ledger where user_id=who;
 if cost>balance then raise exception '책갈피가 부족합니다.';end if;
 insert into public.room_items(user_id,item_id) select who,unnest(chosen);
 insert into public.bookmark_ledger(user_id,amount,reason) values(who,-cost,coalesce(p_theme||' 세트 구매',(select name||' 구매' from public.shop_items where id=p_item)));
 return cost;
end $$;
create function public.feature_diary(p_entry uuid) returns void language plpgsql security definer set search_path='' as $$ begin
 if auth.uid() is null or not exists(select 1 from public.diary_entries where id=p_entry and user_id=auth.uid()) then raise exception '접근할 수 없는 문장입니다.';end if;
 perform 1 from public.profiles where id=auth.uid() for update;
 update public.diary_entries set is_featured=false where user_id=auth.uid() and is_featured;
 update public.diary_entries set is_featured=true where id=p_entry and user_id=auth.uid();end $$;
create function public.public_shelf(p_owner uuid) returns setof public.books language sql stable security definer set search_path='' as $$ select b.* from public.books b where exists(select 1 from public.library_items l where l.book_id=b.id and l.user_id=p_owner and l.kind='owned' and l.status='finished' and l.is_public) $$;
create function public.visit_room(p_owner uuid) returns void language plpgsql security definer set search_path='' as $$ begin if auth.uid() is null then raise exception '로그인이 필요합니다.';end if; if p_owner<>auth.uid() then insert into public.room_visits(owner_id,user_id) values(p_owner,auth.uid()) on conflict(owner_id,user_id,visited_at) do nothing;end if;end $$;
create function public.visit_counts(p_owner uuid) returns jsonb language sql stable security definer set search_path='' as $$ select jsonb_build_object('today',count(*) filter(where visited_at=(now() at time zone 'Asia/Seoul')::date),'total',count(*)) from public.room_visits where owner_id=p_owner $$;

-- Only owned items may be placed; fixed shelf/avatar are not layout entities.
create function public.validate_layout() returns trigger language plpgsql security definer set search_path='' as $$
declare p jsonb; b text; skin uuid; expected text; i integer; skins uuid[]:=array[new.wallpaper,new.floor,new.shelf,new.frame,new.outfit]; kinds text[]:=array['wall','floor','shelf','frame','outfit'];
begin
 if jsonb_array_length(new.placements)>100 then raise exception '배치할 수 있는 아이템 수를 초과했습니다.';end if;
 for p in select value from jsonb_array_elements(new.placements) loop
  if not exists(select 1 from public.room_items r join public.shop_items s on s.id=r.item_id where r.user_id=new.user_id and r.item_id=(p->>'item_id')::uuid and s.shape in ('plant','lamp','rug','clock')) then raise exception '보유하지 않은 아이템입니다.';end if;
  if p->>'x' is null or p->>'y' is null or (p->>'x')::numeric not between 7 and 93 or (p->>'y')::numeric not between 12 and 87 then raise exception '방 배치 좌표를 확인하세요.';end if;
 end loop;
 if (select count(*)<>count(distinct v->>'item_id') from jsonb_array_elements(new.placements) v) then raise exception '아이템을 중복 배치할 수 없습니다.';end if;
 for i in 1..5 loop skin:=skins[i];expected:=kinds[i]; if skin is not null and not exists(select 1 from public.room_items r join public.shop_items s on s.id=r.item_id where r.user_id=new.user_id and r.item_id=skin and s.shape=expected) then raise exception '올바르지 않은 스킨입니다.';end if;end loop;
 for b in select jsonb_array_elements_text(new.frames) loop if b is not null and not exists(select 1 from public.library_items where user_id=new.user_id and book_id=b::uuid and kind='owned' and status='finished' and is_public) then raise exception '공개한 완독 책만 액자에 걸 수 있습니다.';end if;end loop;
 return new;end $$;
create trigger check_layout before insert or update on public.room_layout for each row execute function public.validate_layout();
create function public.clear_private_frames() returns trigger language plpgsql security definer set search_path='' as $$ declare who uuid;book uuid;begin
 who:=old.user_id;book:=old.book_id;
 if not exists(select 1 from public.library_items where user_id=who and book_id=book and kind='owned' and status='finished' and is_public) then
 update public.room_layout r set frames=(select jsonb_agg(case when v=to_jsonb(book::text) then 'null'::jsonb else v end order by n) from jsonb_array_elements(r.frames) with ordinality as e(v,n)) where r.user_id=who and r.frames @> jsonb_build_array(book::text);
 end if;return null;end $$;
create trigger clear_frames after update or delete on public.library_items for each row execute function public.clear_private_frames();
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$ begin
 insert into public.profiles(id,nickname) values(new.id,left(coalesce(nullif(new.raw_user_meta_data->>'nickname',''),'새 독자'),30));
 insert into public.room_items(user_id,item_id) select new.id,id from public.shop_items where theme='기본';
 insert into public.room_layout(user_id) values(new.id);
 return new;end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- PostgreSQL grants EXECUTE to PUBLIC by default. Remove it for every definer.
revoke all on function public.reward_library(),public.reward_log(),public.add_reading_log(uuid,integer,text),public.buy_items(uuid,text),public.feature_diary(uuid),public.public_shelf(uuid),public.visit_room(uuid),public.visit_counts(uuid),public.validate_layout(),public.clear_private_frames(),public.handle_new_user() from public,anon,authenticated;
grant execute on function public.add_reading_log(uuid,integer,text),public.buy_items(uuid,text),public.feature_diary(uuid),public.visit_room(uuid) to authenticated;
grant execute on function public.public_shelf(uuid),public.visit_counts(uuid),public.can_view(uuid,text) to anon,authenticated;
commit;


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


insert into public.shop_items (id,theme,category,name,price,shape) values ('20000000-0000-4000-8000-000000001000','추리','벽지','탐정의 벽지',20,'wall') on conflict(id) do nothing;
insert into public.shop_items (id,theme,category,name,price,shape) values ('20000000-0000-4000-8000-000000001001','추리','바닥','탐정의 마루',30,'floor') on conflict(id) do nothing;
insert into public.shop_items (id,theme,category,name,price,shape) values ('20000000-0000-4000-8000-000000001002','추리','책장 스킨','탐정의 책장',40,'shelf') on conflict(id) do nothing;
insert into public.shop_items (id,theme,category,name,price,shape) values ('20000000-0000-4000-8000-000000001003','추리','액자 프레임','탐정의 액자',50,'frame') on conflict(id) do nothing;
insert into public.shop_items (id,theme,category,name,price,shape) values ('20000000-0000-4000-8000-000000001004','추리','조명','탐정의 스탠드',60,'lamp') on conflict(id) do nothing;
insert into public.shop_items (id,theme,category,name,price,shape) values ('20000000-0000-4000-8000-000000001005','추리','소품','탐정의 장식',70,'plant') on conflict(id) do nothing;
insert into public.shop_items (id,theme,category,name,price,shape) values ('20000000-0000-4000-8000-000000001006','추리','아바타 의상','탐정의 옷',80,'outfit') on conflict(id) do nothing;
insert into public.shop_items (id,theme,category,name,price,shape) values ('20000000-0000-4000-8000-000000001010','SF','벽지','별빛 벽지',20,'wall') on conflict(id) do nothing;
insert into public.shop_items (id,theme,category,name,price,shape) values ('20000000-0000-4000-8000-000000001011','SF','바닥','별빛 마루',30,'floor') on conflict(id) do nothing;
insert into public.shop_items (id,theme,category,name,price,shape) values ('20000000-0000-4000-8000-000000001012','SF','책장 스킨','별빛 책장',40,'shelf') on conflict(id) do nothing;
insert into public.shop_items (id,theme,category,name,price,shape) values ('20000000-0000-4000-8000-000000001013','SF','액자 프레임','별빛 액자',50,'frame') on conflict(id) do nothing;
insert into public.shop_items (id,theme,category,name,price,shape) values ('20000000-0000-4000-8000-000000001014','SF','조명','별빛 스탠드',60,'lamp') on conflict(id) do nothing;
insert into public.shop_items (id,theme,category,name,price,shape) values ('20000000-0000-4000-8000-000000001015','SF','소품','별빛 장식',70,'clock') on conflict(id) do nothing;
insert into public.shop_items (id,theme,category,name,price,shape) values ('20000000-0000-4000-8000-000000001016','SF','아바타 의상','별빛 옷',80,'outfit') on conflict(id) do nothing;
insert into public.shop_items (id,theme,category,name,price,shape) values ('20000000-0000-4000-8000-000000001020','로맨스','벽지','장미빛 벽지',20,'wall') on conflict(id) do nothing;
insert into public.shop_items (id,theme,category,name,price,shape) values ('20000000-0000-4000-8000-000000001021','로맨스','바닥','장미빛 마루',30,'floor') on conflict(id) do nothing;
insert into public.shop_items (id,theme,category,name,price,shape) values ('20000000-0000-4000-8000-000000001022','로맨스','책장 스킨','장미빛 책장',40,'shelf') on conflict(id) do nothing;
insert into public.shop_items (id,theme,category,name,price,shape) values ('20000000-0000-4000-8000-000000001023','로맨스','액자 프레임','장미빛 액자',50,'frame') on conflict(id) do nothing;
insert into public.shop_items (id,theme,category,name,price,shape) values ('20000000-0000-4000-8000-000000001024','로맨스','조명','장미빛 스탠드',60,'lamp') on conflict(id) do nothing;
insert into public.shop_items (id,theme,category,name,price,shape) values ('20000000-0000-4000-8000-000000001025','로맨스','소품','장미빛 장식',70,'plant') on conflict(id) do nothing;
insert into public.shop_items (id,theme,category,name,price,shape) values ('20000000-0000-4000-8000-000000001026','로맨스','아바타 의상','장미빛 옷',80,'outfit') on conflict(id) do nothing;
insert into public.shop_items (id,theme,category,name,price,shape) values ('20000000-0000-4000-8000-000000001030','판타지','벽지','숲속 벽지',20,'wall') on conflict(id) do nothing;
insert into public.shop_items (id,theme,category,name,price,shape) values ('20000000-0000-4000-8000-000000001031','판타지','바닥','숲속 마루',30,'floor') on conflict(id) do nothing;
insert into public.shop_items (id,theme,category,name,price,shape) values ('20000000-0000-4000-8000-000000001032','판타지','책장 스킨','숲속 책장',40,'shelf') on conflict(id) do nothing;
insert into public.shop_items (id,theme,category,name,price,shape) values ('20000000-0000-4000-8000-000000001033','판타지','액자 프레임','숲속 액자',50,'frame') on conflict(id) do nothing;
insert into public.shop_items (id,theme,category,name,price,shape) values ('20000000-0000-4000-8000-000000001034','판타지','조명','숲속 스탠드',60,'lamp') on conflict(id) do nothing;
insert into public.shop_items (id,theme,category,name,price,shape) values ('20000000-0000-4000-8000-000000001035','판타지','소품','숲속 장식',70,'clock') on conflict(id) do nothing;
insert into public.shop_items (id,theme,category,name,price,shape) values ('20000000-0000-4000-8000-000000001036','판타지','아바타 의상','숲속 옷',80,'outfit') on conflict(id) do nothing;
insert into public.shop_items (id,theme,category,name,price,shape) values ('20000000-0000-4000-8000-000000000900','기본','소품','화분',0,'plant') on conflict(id) do nothing;
insert into public.shop_items (id,theme,category,name,price,shape) values ('20000000-0000-4000-8000-000000000901','기본','소품','스탠드',0,'lamp') on conflict(id) do nothing;
insert into public.shop_items (id,theme,category,name,price,shape) values ('20000000-0000-4000-8000-000000000902','기본','소품','러그',0,'rug') on conflict(id) do nothing;
insert into public.shop_items (id,theme,category,name,price,shape) values ('20000000-0000-4000-8000-000000000903','기본','소품','시계',0,'clock') on conflict(id) do nothing;


begin;
insert into public.books(id,title,author,publisher,genres,pages,description,is_monthly,shelf_order,source_genre,list_price,source_sale_price,availability,selection_reason,source_url,verification_note,source_checked_at,source_row) values('7bdf71fe-9546-5964-bc32-5fe53235dbb7','파과','구병모','위즈덤하우스',array['추리/스릴러']::text[],344,'60대 여성 킬러 조각이 노화와 관계의 변화를 마주하는 이야기.',false,null,'스릴러',17800,16020,'판매중','사용자 지정','https://www.yes24.com/product/goods/125761518','리커버판 기준','2026-10-30',2) on conflict(id) do nothing;
insert into public.books(id,title,author,publisher,genres,pages,description,is_monthly,shelf_order,source_genre,list_price,source_sale_price,availability,selection_reason,source_url,verification_note,source_checked_at,source_row) values('c1734ac7-07f8-5132-bebc-919fe3b54b99','파쇄','구병모','위즈덤하우스',array['추리/스릴러']::text[],96,'《파과》의 외전으로 킬러 조각의 과거와 성장 배경을 다룬다.',false,null,'스릴러',13000,11700,'판매중','사용자 지정','https://www.yes24.com/product/goods/117828174',null,'2026-10-30',3) on conflict(id) do nothing;
insert into public.books(id,title,author,publisher,genres,pages,description,is_monthly,shelf_order,source_genre,list_price,source_sale_price,availability,selection_reason,source_url,verification_note,source_checked_at,source_row) values('e3fa435c-0bdb-5e14-8c05-0a5abe7d5ef8','아가미','구병모','위즈덤하우스',array['판타지']::text[],220,'아가미를 갖게 된 소년 곤과 주변 인물의 운명과 관계를 그린다.',false,null,'판타지',16800,15120,'판매중','사용자 지정','https://www.yes24.com/product/goods/125761510','페이지·ISBN은 해당 커버판에서 별도 검증 필요','2026-10-30',4) on conflict(id) do nothing;
insert into public.books(id,title,author,publisher,genres,pages,description,is_monthly,shelf_order,source_genre,list_price,source_sale_price,availability,selection_reason,source_url,verification_note,source_checked_at,source_row) values('1490735b-b091-573f-b6a2-925ecf4b3494','패자의 고백','미키 아키코','블루홀6',array['추리/스릴러']::text[],408,'별장 추락사 사건을 관계자 진술과 고백을 통해 재구성하는 반전 미스터리.',false,null,'추리',18000,16200,'판매중','사용자 지정','https://www.yes24.com/product/goods/151675925',null,'2026-10-30',5) on conflict(id) do nothing;
insert into public.books(id,title,author,publisher,genres,pages,description,is_monthly,shelf_order,source_genre,list_price,source_sale_price,availability,selection_reason,source_url,verification_note,source_checked_at,source_row) values('1a921e6a-f916-5aaa-8bb6-cdba65d39309','한국사 이상현상 연구원','최인서','다이브',array['추리/스릴러']::text[],500,'한국 유적지의 이상현상을 조사하는 비밀 기관의 기록을 엮은 미스터리.',false,null,'미스터리',22000,19800,'판매중','사용자 지정','https://www.yes24.com/product/goods/195265894',null,'2026-10-30',6) on conflict(id) do nothing;
insert into public.books(id,title,author,publisher,genres,pages,description,is_monthly,shelf_order,source_genre,list_price,source_sale_price,availability,selection_reason,source_url,verification_note,source_checked_at,source_row) values('f525304a-80cf-550f-96ce-677505fed089','신을 죽인 여자들','클라우디아 피녜이로','푸른숲',array['추리/스릴러']::text[],424,'종교적 광신과 소녀를 둘러싼 비밀을 추적하는 범죄소설.',false,null,'추리',18500,16650,'판매중','사용자 지정','https://www.yes24.com/product/goods/124105512','제목 정정·종이책 기준','2026-10-30',7) on conflict(id) do nothing;
insert into public.books(id,title,author,publisher,genres,pages,description,is_monthly,shelf_order,source_genre,list_price,source_sale_price,availability,selection_reason,source_url,verification_note,source_checked_at,source_row) values('599c55a3-cd2b-5792-a5cc-7e20db473a31','스토리 클래식','오수현','블랙피쉬',array['음악']::text[],336,'클래식 거장 16인의 삶과 개인사를 중심으로 음악을 소개한다.',false,null,'인문 예술',16500,14850,'판매 정보 확인','사용자 지정','https://www.aladin.co.kr/shop/wproduct.aspx?itemid=299447181&ptid=23',null,'2026-10-30',8) on conflict(id) do nothing;
insert into public.books(id,title,author,publisher,genres,pages,description,is_monthly,shelf_order,source_genre,list_price,source_sale_price,availability,selection_reason,source_url,verification_note,source_checked_at,source_row) values('15f67d79-be29-56f7-aefd-c48276e3d09f','위저드 베이커리','구병모','창비',array['판타지']::text[],228,'마법의 베이커리에 들어온 소년이 선택과 대가를 경험하는 이야기.',false,null,'한국 판타지',15000,13500,'판매 정보 확인','사용자 지정','https://www.bandinlunis.com/front/product/detailProduct.do?prodId=4434348','YES24에서는 14,400원 표기도 확인되어 판매가 변동 가능','2026-10-30',9) on conflict(id) do nothing;
insert into public.books(id,title,author,publisher,genres,pages,description,is_monthly,shelf_order,source_genre,list_price,source_sale_price,availability,selection_reason,source_url,verification_note,source_checked_at,source_row) values('8b144694-bfef-529a-b538-9cf956a997e7','산책하는 침략자','마에카와 도모히로','알마',array['SF(공상과학)']::text[],160,'인간의 개념을 수집하는 침략자를 소재로 일상의 익숙함을 낯설게 그린 희곡.',false,null,'SF',17000,16150,'판매 정보 확인','사용자 지정','https://www.yes24.com/product/goods/77669741','정가 및 번역자: 출판유통통합전산망 확인','2026-10-30',10) on conflict(id) do nothing;
insert into public.books(id,title,author,publisher,genres,pages,description,is_monthly,shelf_order,source_genre,list_price,source_sale_price,availability,selection_reason,source_url,verification_note,source_checked_at,source_row) values('bb0ef033-4ded-5fcc-aa02-2f2d305c6354','유령의 마음으로','임선우','민음사',array['판타지']::text[],284,'유령·변종 해파리·나무로 변한 사람 등 환상적 소재를 다룬 여덟 편의 소설.',false,null,'판타지',13000,null,'판매가 미확인','사용자 지정','https://minumsa.minumsa.com/book/21818/','출판사 정가 확인·서점 판매가는 미확인','2026-10-30',11) on conflict(id) do nothing;
insert into public.books(id,title,author,publisher,genres,pages,description,is_monthly,shelf_order,source_genre,list_price,source_sale_price,availability,selection_reason,source_url,verification_note,source_checked_at,source_row) values('46ac52cd-6693-568b-967f-41e0522702e0','재와 물거품','김청귤','안전가옥',array['판타지','로맨스']::text[],176,'물과 죽음, 사랑을 모티프로 한 환상적 이야기.',false,null,'판타지 로맨스',13000,11700,'일시품절','사용자 지정','https://www.yes24.com/product/goods/101965629','표시 판매가는 품절 상품에 기재된 가격으로 실구매 불가','2026-10-30',12) on conflict(id) do nothing;
insert into public.books(id,title,author,publisher,genres,pages,description,is_monthly,shelf_order,source_genre,list_price,source_sale_price,availability,selection_reason,source_url,verification_note,source_checked_at,source_row) values('9e3064a1-e421-51ef-bf4c-31587f970064','트렌드 코리아 2027','김난도 외','미래의창',array['경제']::text[],null,'2026년 소비·사회 트렌드 전망',true,1,'경제',null,null,'별도 확인 필요','10월 3주 종합 1위','https://www.yna.co.kr/amp/view/AKR20261022155600005','최근 순위 보도로 제목·저자·출판사 확인된 항목 중심; 판본·ISBN·가격 미검증','2026-10-30',13) on conflict(id) do nothing;
insert into public.books(id,title,author,publisher,genres,pages,description,is_monthly,shelf_order,source_genre,list_price,source_sale_price,availability,selection_reason,source_url,verification_note,source_checked_at,source_row) values('acd07399-6439-5160-8c4a-283df7164fc2','빨강의 자서전','앤 카슨','한겨레출판',array['운문']::text[],null,'그리스 신화를 현대적으로 변주한 운문소설',true,2,'운문',null,null,'별도 확인 필요','10월 3주 종합 2위','https://www.yna.co.kr/amp/view/AKR20261022155600005','최근 순위 보도로 제목·저자·출판사 확인된 항목 중심; 판본·ISBN·가격 미검증','2026-10-30',14) on conflict(id) do nothing;
insert into public.books(id,title,author,publisher,genres,pages,description,is_monthly,shelf_order,source_genre,list_price,source_sale_price,availability,selection_reason,source_url,verification_note,source_checked_at,source_row) values('097fe1b9-5664-5750-9ea6-ffc084347aa9','세네카, 오늘을 빼앗기고 있는 당신에게','세네카','논픽션',array['철학']::text[],null,'세네카의 사유를 짧은 글로 엮은 철학서',true,3,'철학·인문',null,null,'별도 확인 필요','10월 3주 종합 3위','https://www.yna.co.kr/amp/view/AKR20261022155600005','최근 순위 보도로 제목·저자·출판사 확인된 항목 중심; 판본·ISBN·가격 미검증','2026-10-30',15) on conflict(id) do nothing;
insert into public.books(id,title,author,publisher,genres,pages,description,is_monthly,shelf_order,source_genre,list_price,source_sale_price,availability,selection_reason,source_url,verification_note,source_checked_at,source_row) values('88ef4b1d-13ce-5ee3-a6a9-126fdf21b1e9','가짜 돈 진짜 부','박종훈','글로퍼스',array['재테크']::text[],null,'돈과 자산을 둘러싼 경제적 판단을 다루는 책',true,4,'경제·재테크',null,null,'별도 확인 필요','10월 3주 종합 4위','https://www.yna.co.kr/amp/view/AKR20261022155600005','최근 순위 보도로 제목·저자·출판사 확인된 항목 중심; 판본·ISBN·가격 미검증','2026-10-30',16) on conflict(id) do nothing;
insert into public.books(id,title,author,publisher,genres,pages,description,is_monthly,shelf_order,source_genre,list_price,source_sale_price,availability,selection_reason,source_url,verification_note,source_checked_at,source_row) values('5863862a-3410-5274-a3c1-50253417b19f','싯다르타','헤르만 헤세','민음사',array['고전']::text[],null,'삶과 깨달음을 찾아가는 싯다르타의 여정',true,5,'해외문학·고전소설',null,null,'별도 확인 필요','10월 3주 종합 6위','https://www.yna.co.kr/amp/view/AKR20261022155600005','최근 순위 보도로 제목·저자·출판사 확인된 항목 중심; 판본·ISBN·가격 미검증','2026-10-30',17) on conflict(id) do nothing;
insert into public.books(id,title,author,publisher,genres,pages,description,is_monthly,shelf_order,source_genre,list_price,source_sale_price,availability,selection_reason,source_url,verification_note,source_checked_at,source_row) values('6b6e3cbf-8e3a-5d8b-a026-c7dddfa48c51','쇼펜하우어 인생수업','아르투어 쇼펜하우어','하이스트',array['철학']::text[],null,'쇼펜하우어 철학으로 삶의 태도를 성찰하는 책',true,6,'철학·인생',null,null,'별도 확인 필요','10월 3주 종합 7위','https://www.yna.co.kr/amp/view/AKR20261022155600005','최근 순위 보도로 제목·저자·출판사 확인된 항목 중심; 판본·ISBN·가격 미검증','2026-10-30',18) on conflict(id) do nothing;
insert into public.books(id,title,author,publisher,genres,pages,description,is_monthly,shelf_order,source_genre,list_price,source_sale_price,availability,selection_reason,source_url,verification_note,source_checked_at,source_row) values('59bad974-7d26-5cd1-81d9-c7595fd6891d','흔한남매 23','흔한남매','미래엔아이세움',array['어린이·코믹']::text[],null,'일상 에피소드를 담은 어린이 코믹북',true,7,'어린이·코믹',null,null,'별도 확인 필요','10월 3주 종합 8위','https://www.yna.co.kr/amp/view/AKR20261022155600005','최근 순위 보도로 제목·저자·출판사 확인된 항목 중심; 판본·ISBN·가격 미검증','2026-10-30',19) on conflict(id) do nothing;
insert into public.books(id,title,author,publisher,genres,pages,description,is_monthly,shelf_order,source_genre,list_price,source_sale_price,availability,selection_reason,source_url,verification_note,source_checked_at,source_row) values('e56f4db8-0f88-5940-b0a7-fb1067d69bf9','모순','양귀자','쓰다',array['한국문학·장편소설']::text[],null,'가족과 사랑, 삶의 모순을 마주하는 인물의 이야기',true,8,'한국문학·장편소설',null,null,'별도 확인 필요','10월 3주 종합 9위','https://www.yna.co.kr/amp/view/AKR20261022155600005','최근 순위 보도로 제목·저자·출판사 확인된 항목 중심; 판본·ISBN·가격 미검증','2026-10-30',20) on conflict(id) do nothing;
insert into public.books(id,title,author,publisher,genres,pages,description,is_monthly,shelf_order,source_genre,list_price,source_sale_price,availability,selection_reason,source_url,verification_note,source_checked_at,source_row) values('93f53e77-4b20-5c95-be0c-da6658f734d5','수족관','유래혁','포스터샵',array['한국문학']::text[],null,'수족관을 제목으로 한 화제 도서',true,9,'한국문학',null,null,'별도 확인 필요','10월 3주 종합 10위','https://www.yna.co.kr/amp/view/AKR20261022155600005','최근 순위 보도로 제목·저자·출판사 확인된 항목 중심; 판본·ISBN·가격 미검증','2026-10-30',21) on conflict(id) do nothing;
insert into public.books(id,title,author,publisher,genres,pages,description,is_monthly,shelf_order,source_genre,list_price,source_sale_price,availability,selection_reason,source_url,verification_note,source_checked_at,source_row) values('0038d0e7-d72b-52cf-b8c1-f294b9c47460','머니 트렌드 2027','정태익 외','북모먼트',array['재테크']::text[],null,'경제와 자산 시장의 흐름 전망',true,10,'경제·투자',null,null,'별도 확인 필요','10월 3주 종합 11위','https://www.nocutnews.co.kr/news/6595943','최근 순위 보도로 제목·저자·출판사 확인된 항목 중심; 판본·ISBN·가격 미검증','2026-10-30',22) on conflict(id) do nothing;
insert into public.books(id,title,author,publisher,genres,pages,description,is_monthly,shelf_order,source_genre,list_price,source_sale_price,availability,selection_reason,source_url,verification_note,source_checked_at,source_row) values('95c4b2d5-f1f0-51d1-bd6b-0a8d3500e0ca','아메리칸 학원 1','이민진',null,array['해외문학·장편소설']::text[],null,'이민진의 신작 장편소설',true,11,'해외문학·장편소설',null,null,'별도 확인 필요','10월 3주 종합 15위','https://www.fnnews.com/news/202610230800341506','최근 순위 보도로 제목·저자·출판사 확인된 항목 중심; 판본·ISBN·가격 미검증','2026-10-30',23) on conflict(id) do nothing;
insert into public.books(id,title,author,publisher,genres,pages,description,is_monthly,shelf_order,source_genre,list_price,source_sale_price,availability,selection_reason,source_url,verification_note,source_checked_at,source_row) values('9905b0aa-7088-53e2-bc07-913dcc20b9a8','돈, 뜨겁게 사랑하고 차갑게 다루어라','앙드레 코스톨라니',null,array['재테크']::text[],null,'투자 심리와 시장에 대한 고전적인 통찰',true,12,'경제·투자',null,null,'별도 확인 필요','10월 3주 종합 18위','https://www.nocutnews.co.kr/news/6595943','최근 순위 보도로 제목·저자·출판사 확인된 항목 중심; 판본·ISBN·가격 미검증','2026-10-30',24) on conflict(id) do nothing;
insert into public.books(id,title,author,publisher,genres,pages,description,is_monthly,shelf_order,source_genre,list_price,source_sale_price,availability,selection_reason,source_url,verification_note,source_checked_at,source_row) values('d4fc1d62-a99a-5728-8812-5eaeb2b5e798','서늘한 대화','정재승',null,array['과학·인문']::text[],null,'AI 시대 인간과 미래에 관한 생각',true,13,'과학·인문',null,null,'별도 확인 필요','10월 4주 종합 18위 보도','https://m.newspic.kr/view.html?nid=2026102217430011939&pn=661','최근 순위 보도로 제목·저자·출판사 확인된 항목 중심; 판본·ISBN·가격 미검증','2026-10-30',25) on conflict(id) do nothing;
insert into public.books(id,title,author,publisher,genres,pages,description,is_monthly,shelf_order,source_genre,list_price,source_sale_price,availability,selection_reason,source_url,verification_note,source_checked_at,source_row) values('bc4d8346-b62f-573d-a7c3-7408ae6254b0','남편의 아름다움','앤 카슨',null,array['해외문학·운문소설']::text[],null,'사랑과 결혼을 문학적으로 탐구',true,14,'해외문학·운문소설',null,null,'별도 확인 필요','10월 3주 외국소설 8위','https://www.yna.co.kr/amp/view/AKR20261022155600005','최근 순위 보도로 제목·저자·출판사 확인된 항목 중심; 판본·ISBN·가격 미검증','2026-10-30',26) on conflict(id) do nothing;
insert into public.books(id,title,author,publisher,genres,pages,description,is_monthly,shelf_order,source_genre,list_price,source_sale_price,availability,selection_reason,source_url,verification_note,source_checked_at,source_row) values('73aed48d-93ae-5fa0-9ddc-6e4ecbdde3ea','에로스, 달콤씁쓸한','앤 카슨',null,array['인문·에세이']::text[],null,'욕망과 사랑에 관한 고전적 텍스트의 독해',true,15,'인문·에세이',null,null,'별도 확인 필요','10월 3주 에세이 2위','https://www.yna.co.kr/amp/view/AKR20261022155600005','최근 순위 보도로 제목·저자·출판사 확인된 항목 중심; 판본·ISBN·가격 미검증','2026-10-30',27) on conflict(id) do nothing;
insert into public.books(id,title,author,publisher,genres,pages,description,is_monthly,shelf_order,source_genre,list_price,source_sale_price,availability,selection_reason,source_url,verification_note,source_checked_at,source_row) values('9b4f89bb-b931-5000-9b94-64c0b83af3bd','짧은 이야기들','앤 카슨',null,array['시집']::text[],null,'앤 카슨의 시 작품',true,16,'시·문학',null,null,'별도 확인 필요','10월 3주 시 분야 1위','https://www.newsis.com/view/NISX20261022_0003837411','최근 순위 보도로 제목·저자·출판사 확인된 항목 중심; 판본·ISBN·가격 미검증','2026-10-30',28) on conflict(id) do nothing;
insert into public.books(id,title,author,publisher,genres,pages,description,is_monthly,shelf_order,source_genre,list_price,source_sale_price,availability,selection_reason,source_url,verification_note,source_checked_at,source_row) values('ca043c84-9791-51a6-b0c2-19dbbeced16b','혼모노','성해나','창비',array['한국문학·소설집']::text[],null,'정체성과 관계의 경계를 탐구하는 소설집',true,17,'한국문학·소설집',null,null,'별도 확인 필요','2025년 베스트셀러·2026년에도 화제','https://www.newsis.com/view/NISX20251016_0003365851','최근 순위 보도로 제목·저자·출판사 확인된 항목 중심; 판본·ISBN·가격 미검증','2026-10-30',29) on conflict(id) do nothing;
insert into public.books(id,title,author,publisher,genres,pages,description,is_monthly,shelf_order,source_genre,list_price,source_sale_price,availability,selection_reason,source_url,verification_note,source_checked_at,source_row) values('cce24498-68a2-5b5c-acb2-761d7ddcba95','프로젝트 헤일메리','앤디 위어',null,array['SF(공상과학)']::text[],null,'우주 임무와 과학적 문제 해결에 관한 SF',true,18,'해외문학·SF',null,null,'별도 확인 필요','2026년 5월 2주 종합 1위','https://www.newsis.com/view/NISX20260514_0003630201','최근 순위 보도로 제목·저자·출판사 확인된 항목 중심; 판본·ISBN·가격 미검증','2026-10-30',30) on conflict(id) do nothing;
insert into public.books(id,title,author,publisher,genres,pages,description,is_monthly,shelf_order,source_genre,list_price,source_sale_price,availability,selection_reason,source_url,verification_note,source_checked_at,source_row) values('3ae42196-ccda-5eec-b8eb-24d6c786eb65','안녕이라 그랬어',null,null,array['한국문학·소설']::text[],null,'2026년 봄 화제의 소설',true,19,'한국문학·소설',null,null,'별도 확인 필요','2026년 5월 2주 종합 3위','https://www.newsis.com/view/NISX20260514_0003630201','최근 순위 보도로 제목·저자·출판사 확인된 항목 중심; 판본·ISBN·가격 미검증','2026-10-30',31) on conflict(id) do nothing;
commit;
