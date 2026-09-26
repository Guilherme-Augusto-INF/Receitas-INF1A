-- Frases compartilhadas entre grupos e edicao colaborativa dos formularios.
-- Migration aditiva: nao reescreve migrations ja aplicadas.

create table if not exists public.group_phrases (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  phrase text not null,
  phrase_key text generated always as (
    translate(
      lower(regexp_replace(regexp_replace(btrim(phrase), '[[:space:]]+', ' ', 'g'), '[[:punct:][:space:]]+$', '', 'g')),
      'áàâãäéèêëíìîïóòôõöúùûüç',
      'aaaaaeeeeiiiiooooouuuuc'
    )
  ) stored,
  created_at timestamptz not null default now(),
  constraint group_phrases_length_chk check (char_length(btrim(phrase)) between 3 and 240)
);
create unique index if not exists group_phrases_unique_phrase on public.group_phrases(phrase_key);
create index if not exists group_phrases_group_idx on public.group_phrases(group_id,created_at desc);
alter table public.group_phrases enable row level security;
revoke all on public.group_phrases from public,anon,authenticated;
grant select (id,group_id,phrase,created_at) on public.group_phrases to anon,authenticated;
create policy "Frases visiveis a toda a turma" on public.group_phrases
  for select to anon,authenticated using (true);

-- A verificacao decisiva de grupo/permissao ocorre no banco. Sem escrita direta.
create or replace function public.add_group_phrase(p_group_id uuid,p_phrase text)
returns public.group_phrases
language plpgsql security definer set search_path=''
as $$
declare
  actor public.profiles;
  target public.groups;
  control public.classroom_settings;
  result public.group_phrases;
  clean_phrase text := regexp_replace(btrim(coalesce(p_phrase,'')),'[[:space:]]+',' ','g');
begin
  select * into actor from public.profiles where id=auth.uid();
  if actor.id is null or actor.is_anonymous or coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
     or actor.role not in ('teacher','student') then
    raise exception 'Entre com uma conta autorizada para cadastrar frases.';
  end if;
  select * into target from public.groups where id=p_group_id for update;
  if target.id is null then raise exception 'Grupo nao encontrado.'; end if;
  if actor.role<>'teacher' then
    select * into control from public.classroom_settings where id=1;
    if actor.group_id is distinct from target.id or target.activity_status='completed'
       or coalesce(control.edits_locked,true) or coalesce(control.activity_finalized,true) then
      raise exception 'Voce nao pode alterar as frases deste grupo agora.';
    end if;
  end if;
  if char_length(clean_phrase) not between 3 and 240
     or char_length(regexp_replace(clean_phrase,'[[:punct:][:space:]]+','','g'))<3 then
    raise exception 'Informe uma frase com 3 a 240 caracteres validos.';
  end if;
  if (select count(*) from public.group_phrases where group_id=target.id)>=30 then
    raise exception 'Limite de 30 frases por grupo atingido.';
  end if;
  begin
    insert into public.group_phrases(group_id,phrase)
    values(target.id,clean_phrase)
    returning * into result;
  exception when unique_violation then
    raise exception 'Esta frase ja foi cadastrada. Consulte a lista da turma antes de enviar.';
  end;
  perform private.log_activity('group_phrase_created',target.id,'group_phrase',result.id::text,
    jsonb_build_object('phrase',result.phrase));
  return result;
end
$$;
revoke all on function public.add_group_phrase(uuid,text) from public,anon;
grant execute on function public.add_group_phrase(uuid,text) to authenticated;

create or replace function public.remove_group_phrase(p_phrase_id uuid)
returns void
language plpgsql security definer set search_path=''
as $$
declare
  actor public.profiles;
  target public.groups;
  control public.classroom_settings;
  item public.group_phrases;
begin
  select * into actor from public.profiles where id=auth.uid();
  if actor.id is null or actor.is_anonymous or coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
     or actor.role not in ('teacher','student') then
    raise exception 'Entre com uma conta autorizada para remover frases.';
  end if;
  select * into item from public.group_phrases where id=p_phrase_id for update;
  if item.id is null then raise exception 'Frase nao encontrada.'; end if;
  select * into target from public.groups where id=item.group_id for update;
  if actor.role<>'teacher' then
    select * into control from public.classroom_settings where id=1;
    if actor.group_id is distinct from target.id or target.activity_status='completed'
       or coalesce(control.edits_locked,true) or coalesce(control.activity_finalized,true) then
      raise exception 'Voce nao pode remover esta frase.';
    end if;
  end if;
  delete from public.group_phrases where id=item.id;
  perform private.log_activity('group_phrase_removed',target.id,'group_phrase',item.id::text,
    jsonb_build_object('phrase',item.phrase));
end
$$;
revoke all on function public.remove_group_phrase(uuid) from public,anon;
grant execute on function public.remove_group_phrase(uuid) to authenticated;

-- Professores editam qualquer formulario; alunos autenticados editam somente seu
-- grupo se a atividade estiver aberta. Acesso anonimo permanece somente leitura.
create or replace function public.set_group_form(p_group_id uuid,p_form_text text,p_form_url text)
returns public.groups
language plpgsql security definer set search_path=''
as $$
declare
  actor public.profiles;
  target public.groups;
  control public.classroom_settings;
  result public.groups;
  clean_text text := nullif(btrim(coalesce(p_form_text,'')),'');
  clean_url text := nullif(btrim(coalesce(p_form_url,'')),'');
begin
  select * into actor from public.profiles where id=auth.uid();
  if actor.id is null or actor.is_anonymous or coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
     or actor.role not in ('teacher','student') then
    raise exception 'Entre com uma conta autorizada para editar o formulario.';
  end if;
  select * into target from public.groups where id=p_group_id for update;
  if target.id is null then raise exception 'Grupo nao encontrado.'; end if;
  if actor.role<>'teacher' then
    select * into control from public.classroom_settings where id=1;
    if actor.group_id is distinct from target.id or target.activity_status='completed'
       or coalesce(control.edits_locked,true) or coalesce(control.activity_finalized,true) then
      raise exception 'Voce nao pode editar o formulario deste grupo agora.';
    end if;
  end if;
  if (clean_text is null) <> (clean_url is null) then
    raise exception 'Informe o texto e o link do formulario, ou deixe os dois vazios para remover.';
  end if;
  if clean_text is not null and char_length(clean_text)>3000 then
    raise exception 'O texto do formulario deve ter no maximo 3000 caracteres.';
  end if;
  if clean_url is not null and (char_length(clean_url)>2048
     or clean_url !~* '^https?://[^[:space:]]+$') then
    raise exception 'Informe um link HTTP(S) valido, sem espacos.';
  end if;
  update public.groups set form_text=clean_text,form_url=clean_url,updated_at=now()
    where id=target.id returning * into result;
  perform private.log_activity('group_form_updated',result.id,'group',result.id::text,
    jsonb_build_object('configured',clean_url is not null));
  return result;
end
$$;
revoke all on function public.set_group_form(uuid,text,text) from public,anon;
grant execute on function public.set_group_form(uuid,text,text) to authenticated;

alter publication supabase_realtime add table public.group_phrases;
