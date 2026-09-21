-- Evita lost updates quando duas pessoas editam a mesma receita.
create or replace function public.save_recipe_versioned(
  p_recipe_id uuid,p_expected_version bigint,p_title text,p_ingredients text,p_instructions text,p_notes text
) returns public.recipes language plpgsql security definer set search_path=''
as $$ declare current_version bigint; result public.recipes; begin
  select row_version into current_version from public.recipes where id=p_recipe_id and deleted_at is null for update;
  if current_version is null then raise exception 'Receita não encontrada.'; end if;
  if current_version is distinct from p_expected_version then raise exception 'Esta receita foi alterada por outra pessoa. Recarregue a página antes de salvar.'; end if;
  select * into result from public.save_recipe_classroom(p_recipe_id,p_title,p_ingredients,p_instructions,p_notes);
  return result;
end $$;
revoke all on function public.save_recipe_versioned(uuid,bigint,text,text,text,text) from public,anon;
grant execute on function public.save_recipe_versioned(uuid,bigint,text,text,text,text) to authenticated;
