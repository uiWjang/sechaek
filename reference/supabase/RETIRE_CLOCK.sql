do $migration$
declare definition text; updated text;
begin
 select pg_get_functiondef('public.buy_items(uuid,text)'::regprocedure) into definition;
 updated:=replace(definition,'i.shape not in (''floor'',''outfit'',''frame'')','i.shape not in (''floor'',''outfit'',''frame'',''clock'')');
 updated:=replace(updated,'i.theme=''기본'' and i.shape=''lamp''','i.theme=''기본'' and i.shape in (''lamp'',''plant'')');
 if updated=definition and position('''frame'',''clock''' in definition)=0 then raise exception 'Unexpected buy_items definition';end if;
 if updated<>definition then execute updated;end if;
end $migration$;
select position('''frame'',''clock''' in pg_get_functiondef('public.buy_items(uuid,text)'::regprocedure))>0 as clock_retired;
