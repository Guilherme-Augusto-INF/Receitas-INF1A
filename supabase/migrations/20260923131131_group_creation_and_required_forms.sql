-- Novos grupos dinâmicos + formulário obrigatório por tema para toda a turma.

alter table public.groups
  add column if not exists form_text text,
  add column if not exists form_url text;

do $$ begin
  alter table public.groups add constraint groups_form_text_length_chk
    check (form_text is null or length(btrim(form_text)) between 1 and 3000);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.groups add constraint groups_form_url_length_chk
    check (form_url is null or length(form_url) <= 2048);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.groups add constraint groups_form_url_protocol_chk
    check (form_url is null or form_url ~* '^https?://');
exception when duplicate_object then null; end $$;

create or replace function public.create_classroom_group(p_theme text, p_description text default null)
returns public.groups
language plpgsql
security definer
set search_path=''
as $$
declare
  result public.groups;
  next_number integer;
  clean_theme text := btrim(coalesce(p_theme,''));
  clean_description text := nullif(btrim(coalesce(p_description,'')),'');
begin
  perform private.require_teacher();

  if length(clean_theme) < 1 or length(clean_theme) > 100 then
    raise exception 'Informe um tema entre 1 e 100 caracteres.';
  end if;
  if clean_description is not null and length(clean_description) > 500 then
    raise exception 'A descrição deve ter no máximo 500 caracteres.';
  end if;

  perform pg_advisory_xact_lock(hashtext('receitas_inf1a_create_group'));

  select coalesce(max(substring(g.slug from '^grupo-([0-9]+)$')::integer),0)+1
    into next_number
  from public.groups g
  where g.slug ~ '^grupo-[0-9]+$';

  insert into public.groups(name,slug,description,activity_status)
  values(
    'Grupo ' || next_number || ' — ' || clean_theme,
    'grupo-' || next_number,
    clean_description,
    'not_started'
  )
  returning * into result;

  insert into public.group_checklist(group_id,item_key,label,is_manual)
  select result.id,v.item_key,v.label,v.is_manual
  from (values
    ('members_defined','Integrantes definidos',false),
    ('call_numbers','Números de chamada corretos',false),
    ('recipe_registered','Receita cadastrada',false),
    ('ingredients_filled','Ingredientes preenchidos',false),
    ('quantities_filled','Quantidades preenchidas',true),
    ('instructions_filled','Modo de preparo preenchido',false),
    ('recipe_reviewed','Receita revisada',false),
    ('teacher_approved','Aprovado pelo professor',false),
    ('ready_for_activity','Grupo pronto para atividade',true)
  ) v(item_key,label,is_manual)
  on conflict (group_id,item_key) do nothing;

  perform private.log_activity(
    'group_created',
    result.id,
    'group',
    result.id::text,
    jsonb_build_object('name',result.name,'slug',result.slug)
  );

  return result;
end
$$;

revoke all on function public.create_classroom_group(text,text) from public,anon;
grant execute on function public.create_classroom_group(text,text) to authenticated;

create or replace function public.set_group_form(p_group_id uuid,p_form_text text,p_form_url text)
returns public.groups
language plpgsql
security definer
set search_path=''
as $$
declare
  result public.groups;
  clean_text text := nullif(btrim(coalesce(p_form_text,'')),'');
  clean_url text := nullif(btrim(coalesce(p_form_url,'')),'');
begin
  perform private.require_teacher();

  if (clean_text is null) <> (clean_url is null) then
    raise exception 'Informe o texto e o link do formulário, ou deixe os dois vazios para remover.';
  end if;
  if clean_text is not null and length(clean_text) > 3000 then
    raise exception 'O texto do formulário deve ter no máximo 3000 caracteres.';
  end if;
  if clean_url is not null and (length(clean_url) > 2048 or clean_url !~* '^https?://') then
    raise exception 'Informe um link válido começando com http:// ou https://.';
  end if;

  update public.groups
  set form_text=clean_text,
      form_url=clean_url,
      updated_at=now()
  where id=p_group_id
  returning * into result;

  if result.id is null then
    raise exception 'Grupo não encontrado.';
  end if;

  perform private.log_activity(
    'group_form_updated',
    result.id,
    'group',
    result.id::text,
    jsonb_build_object('configured',clean_url is not null)
  );

  return result;
end
$$;

revoke all on function public.set_group_form(uuid,text,text) from public,anon;
grant execute on function public.set_group_form(uuid,text,text) to authenticated;

create or replace function public.get_group_page(p_slug text)
returns jsonb
language sql
stable security definer
set search_path=''
as $$
  with target_group as materialized (
    select g.id,g.name,g.slug,g.description,g.activity_status,g.photo_url,g.form_text,g.form_url
    from public.groups g
    where g.slug=p_slug
  ),
  viewer as materialized (
    select p.id,p.role,p.group_id,p.is_anonymous
    from public.profiles p
    where p.id=auth.uid()
  )
  select case when not exists(select 1 from target_group) then null else jsonb_build_object(
    'group',(
      select jsonb_build_object(
        'id',g.id,'name',g.name,'slug',g.slug,'description',g.description,
        'activity_status',g.activity_status,'photo_url',g.photo_url,
        'form_text',g.form_text,'form_url',g.form_url
      ) from target_group g
    ),
    'viewer',(
      select jsonb_build_object(
        'id',v.id,'role',v.role,'group_id',v.group_id,'is_anonymous',v.is_anonymous
      ) from viewer v
    ),
    'announcement',(
      select jsonb_build_object('title',a.title,'message',a.message,'updated_at',a.updated_at)
      from public.announcements a
      where a.is_published and a.deleted_at is null
        and (a.expires_at is null or a.expires_at>now())
      order by a.is_featured desc,a.updated_at desc
      limit 1
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
$$;

revoke all on function public.get_group_page(text) from public;
grant execute on function public.get_group_page(text) to anon,authenticated;
