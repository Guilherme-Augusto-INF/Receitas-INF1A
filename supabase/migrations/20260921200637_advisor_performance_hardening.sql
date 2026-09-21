-- Ajustes objetivos apontados pelo Performance Advisor.
create index if not exists announcements_created_by_idx on public.announcements(created_by);
create index if not exists announcements_updated_by_idx on public.announcements(updated_by);
create index if not exists group_checklist_updated_by_idx on public.group_checklist(updated_by);
create index if not exists recipe_reviews_author_id_idx on public.recipe_reviews(author_id);
create index if not exists recipe_reviews_deleted_by_idx on public.recipe_reviews(deleted_by);
create index if not exists recipes_deleted_by_idx on public.recipes(deleted_by);

-- auth.jwt() em InitPlan: calculado uma vez por statement, não uma vez por linha.
alter policy "Teachers can delete groups" on public.groups using ((select private.is_teacher()) and coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false);
alter policy "Teachers can insert groups" on public.groups with check ((select private.is_teacher()) and coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false);
alter policy "Teachers can update groups" on public.groups using ((select private.is_teacher()) and coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false) with check ((select private.is_teacher()) and coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false);
alter policy "Teachers can delete profiles" on public.profiles using ((select private.is_teacher()) and coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false);
alter policy "Teachers can insert profiles" on public.profiles with check ((select private.is_teacher()) and coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false);
alter policy "Teachers can update profiles" on public.profiles using ((select private.is_teacher()) and coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false) with check ((select private.is_teacher()) and coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false);
alter policy "Students can create recipes for their group" on public.recipes with check (coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false and ((select private.is_teacher()) or group_id=(select p.group_id from public.profiles p where p.id=(select auth.uid()))));
alter policy "Students can update recipes for their group" on public.recipes using (coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false and ((select private.is_teacher()) or group_id=(select p.group_id from public.profiles p where p.id=(select auth.uid())))) with check (coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false and ((select private.is_teacher()) or group_id=(select p.group_id from public.profiles p where p.id=(select auth.uid()))));
drop policy if exists "Students can delete recipes for their group" on public.recipes;
alter policy classroom_settings_teacher_update on public.classroom_settings using ((select private.is_teacher()) and coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false) with check ((select private.is_teacher()) and coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false);
alter policy activity_history_teacher_read on public.activity_history using ((select private.is_teacher()) and coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false);
