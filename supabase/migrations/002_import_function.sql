create or replace function import_template(p_name text,p_source text,p_issues jsonb,p_tree jsonb,p_copied_from uuid default null)
returns uuid language plpgsql as $$
declare tid uuid;sid uuid;iid uuid;s jsonb;i jsonb;c jsonb;si int:=0;ii int;ci int;
begin
 insert into templates(name,source,issues,copied_from) values(p_name,p_source,coalesce(p_issues,'[]'),p_copied_from) returning id into tid;
 for s in select value from jsonb_array_elements(p_tree) loop
  insert into sections(template_id,pos,name) values(tid,si,s->>'name') returning id into sid;
  si:=si+1;ii:=0;
  for i in select value from jsonb_array_elements(s->'items') loop
   insert into items(section_id,pos,name) values(sid,ii,i->>'name') returning id into iid;
   ii:=ii+1;ci:=0;
   for c in select value from jsonb_array_elements(i->'comments') loop
    insert into comments(item_id,pos,name,body,extra) values(iid,ci,coalesce(c->>'name',''),coalesce(c->>'body',''),coalesce(c->'extra','{}'));
    ci:=ci+1;
   end loop;
  end loop;
 end loop;
 return tid;
end $$;
revoke all on function import_template(text,text,jsonb,jsonb,uuid) from public,anon,authenticated;
grant execute on function import_template(text,text,jsonb,jsonb,uuid) to service_role;
