begin;
alter table public.shop_items drop constraint if exists shop_items_shape_check;
alter table public.shop_items add constraint shop_items_shape_check check(shape in ('wall','floor','shelf','frame','lamp','plant','rug','clock','outfit','sofa','chair'));
-- Preserve the current validator, including any later ownership/privacy fixes.
do $migration$
declare definition text;
begin
  select pg_get_functiondef('public.validate_layout()'::regprocedure) into definition;
  if position('''sofa''' in definition)=0 then
    if position($old$('plant','lamp','rug','clock')$old$ in definition)=0 then
      raise exception 'Unexpected layout validator; review before migrating';
    end if;
    execute replace(definition, $old$('plant','lamp','rug','clock')$old$, $new$('plant','lamp','rug','clock','sofa','chair')$new$);
  end if;
end $migration$;
update public.shop_items set name='책 읽는 기차',category='방 테마' where theme='추리' and shape='wall';
insert into public.shop_items(id,name,theme,category,price,shape) values('20000000-0000-4000-8000-000000002000','책 읽는 기차 소파','추리','가구',70,'sofa') on conflict(id) do update set name=excluded.name,category=excluded.category,price=excluded.price,shape=excluded.shape;
insert into public.shop_items(id,name,theme,category,price,shape) values('20000000-0000-4000-8000-000000002001','책 읽는 기차 독서 의자','추리','가구',40,'chair') on conflict(id) do update set name=excluded.name,category=excluded.category,price=excluded.price,shape=excluded.shape;
update public.shop_items set name='물가의 캠핑',category='방 테마' where theme='SF' and shape='wall';
insert into public.shop_items(id,name,theme,category,price,shape) values('20000000-0000-4000-8000-000000002010','물가의 캠핑 소파','SF','가구',70,'sofa') on conflict(id) do update set name=excluded.name,category=excluded.category,price=excluded.price,shape=excluded.shape;
insert into public.shop_items(id,name,theme,category,price,shape) values('20000000-0000-4000-8000-000000002011','물가의 캠핑 독서 의자','SF','가구',40,'chair') on conflict(id) do update set name=excluded.name,category=excluded.category,price=excluded.price,shape=excluded.shape;
update public.shop_items set name='햇살 서재',category='방 테마' where theme='로맨스' and shape='wall';
insert into public.shop_items(id,name,theme,category,price,shape) values('20000000-0000-4000-8000-000000002020','햇살 서재 소파','로맨스','가구',70,'sofa') on conflict(id) do update set name=excluded.name,category=excluded.category,price=excluded.price,shape=excluded.shape;
insert into public.shop_items(id,name,theme,category,price,shape) values('20000000-0000-4000-8000-000000002021','햇살 서재 독서 의자','로맨스','가구',40,'chair') on conflict(id) do update set name=excluded.name,category=excluded.category,price=excluded.price,shape=excluded.shape;
update public.shop_items set name='숲속 다락방',category='방 테마' where theme='판타지' and shape='wall';
insert into public.shop_items(id,name,theme,category,price,shape) values('20000000-0000-4000-8000-000000002030','숲속 다락방 소파','판타지','가구',70,'sofa') on conflict(id) do update set name=excluded.name,category=excluded.category,price=excluded.price,shape=excluded.shape;
insert into public.shop_items(id,name,theme,category,price,shape) values('20000000-0000-4000-8000-000000002031','숲속 다락방 독서 의자','판타지','가구',40,'chair') on conflict(id) do update set name=excluded.name,category=excluded.category,price=excluded.price,shape=excluded.shape;
commit;
select name,theme,price,shape from public.shop_items where shape in ('wall','sofa','chair') order by theme,shape;
