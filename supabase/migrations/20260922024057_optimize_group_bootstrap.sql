-- Reduz os round trips da página de grupo sem ampliar a exposição de dados.
create or replace function public.get_group_page(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
  with target_group as materialized (
    select g.id,g.name,g.slug,g.description,g.activity_status,g.photo_url
    from public.groups g
    where g.slug=p_slug
  ),
  viewer as materialized (
    select p.role,p.group_id,p.is_anonymous
    from public.profiles p
    where p.id=auth.uid()
  )
  select case when not exists(select 1 from target_group) then null else jsonb_build_object(
    'group',(
      select jsonb_build_object(
        'id',g.id,'name',g.name,'slug',g.slug,'description',g.description,
        'activity_status',g.activity_status,'photo_url',g.photo_url
      ) from target_group g
    ),
    'settings',(
      select jsonb_build_object('edits_locked',cs.edits_locked,'activity_finalized',cs.activity_finalized)
      from public.classroom_settings cs where cs.id=1
    ),
    'recipes',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'id',r.id,'group_id',r.group_id,'title',r.title,'ingredients',r.ingredients,
        'instructions',r.instructions,'notes',r.notes,'updated_by',r.updated_by,
        'created_at',r.created_at,'updated_at',r.updated_at,'is_locked',r.is_locked,
        'review_status',r.review_status,'row_version',r.row_version
      ) order by r.updated_at desc),'[]'::jsonb)
      from public.recipes r
      where r.group_id=(select id from target_group) and r.deleted_at is null
    ),
    'members',case when exists(
      select 1 from viewer v
      where not v.is_anonymous
        and (v.role='teacher' or v.group_id=(select id from target_group))
    ) then (
      select coalesce(jsonb_agg(jsonb_build_object(
        'full_name',p.full_name,'call_number',p.call_number,'role',p.role
      ) order by p.call_number nulls last,p.full_name),'[]'::jsonb)
      from public.profiles p
      where p.group_id=(select id from target_group)
        and p.role='student' and not p.is_anonymous
    ) else '[]'::jsonb end
  ) end;
$function$;

revoke all on function public.get_group_page(text) from public;
grant execute on function public.get_group_page(text) to anon,authenticated;
