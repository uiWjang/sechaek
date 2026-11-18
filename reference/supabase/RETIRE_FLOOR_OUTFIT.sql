do $migration$
declare definition text; updated text;
begin
 select pg_get_functiondef('public.buy_items(uuid,text)'::regprocedure) into definition;
 if position('i.shape not in (''floor'',''outfit'')' in definition)=0 then
  updated:=replace(definition,'from public.shop_items i where (','from public.shop_items i where i.shape not in (''floor'',''outfit'') and (');
  if updated=definition then raise exception 'Unexpected buy_items definition'; end if;
  execute updated;
 end if;
end $migration$;
select position('i.shape not in (''floor'',''outfit'')' in pg_get_functiondef('public.buy_items(uuid,text)'::regprocedure))>0 as retired_items_excluded;
