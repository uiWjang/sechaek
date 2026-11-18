do $migration$
declare definition text; updated text;
begin
 select pg_get_functiondef('public.buy_items(uuid,text)'::regprocedure) into definition;
 updated:=replace(definition,'i.shape not in (''floor'',''outfit'')','i.shape not in (''floor'',''outfit'',''frame'') and not (i.theme=''기본'' and i.shape=''lamp'')');
 if updated=definition and position('''outfit'',''frame''' in definition)=0 then raise exception 'Unexpected buy_items definition'; end if;
 if updated<>definition then execute updated; end if;
end $migration$;
select position('''outfit'',''frame''' in pg_get_functiondef('public.buy_items(uuid,text)'::regprocedure))>0 as frame_retired;
