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
