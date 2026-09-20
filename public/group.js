(()=>{
  const root=document.querySelector('#group-app');
  if(!root)return;
  const slug=document.body.dataset.groupSlug;
  const esc=BioUI.escape;
  const labels={
    not_started:['⚪','Não iniciado'],in_progress:['🔵','Em andamento'],
    review:['🟡','Em revisão'],completed:['🟢','Finalizado']
  };
  const historyLabels={
    status_changed:'Status alterado',recipe_created:'Receita criada',recipe_updated:'Receita atualizada',
    recipe_deleted:'Receita excluída',recipe_locked:'Receita bloqueada',recipe_unlocked:'Receita reaberta',
    photo_changed:'Foto alterada',announcement_changed:'Aviso alterado'
  };
  let group=null,recipes=[],profile=null,members=[];

  async function load(){
    root.innerHTML='<section class="panel loading-state">Carregando grupo…</section>';
    try{
      const me=await BioAuth.profile();
      profile=me.profile;
      const groupResult=await BioUI.withTimeout(
        sb.from('groups').select('id,name,slug,description,activity_status,photo_url').eq('slug',slug).maybeSingle()
      );
      if(groupResult.error)throw groupResult.error;
      if(!groupResult.data)throw new Error('Grupo não encontrado.');
      group=groupResult.data;

      const recipesRequest=BioUI.withTimeout(
        sb.from('recipes').select('id,group_id,title,ingredients,instructions,notes,updated_by,created_at,updated_at,is_locked').eq('group_id',group.id).order('updated_at',{ascending:false})
      );
      const maySeeMembers=profile&&!profile.is_anonymous&&(profile.role==='teacher'||profile.group_id===group.id);
      const membersRequest=maySeeMembers
        ?BioUI.withTimeout(sb.rpc('get_group_members',{target_group_id:group.id}))
        :Promise.resolve({data:[],error:null});
      const[recipeResult,memberResult]=await Promise.all([recipesRequest,membersRequest]);
      if(recipeResult.error)throw recipeResult.error;
      if(memberResult.error)throw memberResult.error;
      recipes=recipeResult.data||[];members=memberResult.data||[];
      render(maySeeMembers);
    }catch(error){
      root.innerHTML='<section class="panel error-state"><strong>Não foi possível carregar este grupo.</strong><p>'+esc(BioUI.friendlyError(error))+'</p><button class="btn" id="retry">Tentar novamente</button></section>';
      document.querySelector('#retry')?.addEventListener('click',load);
    }
  }

  function render(maySeeMembers){
    const isTeacher=profile?.role==='teacher'&&!profile.is_anonymous;
    const belongsToGroup=profile?.group_id===group.id&&!profile?.is_anonymous;
    const canEditContent=(isTeacher||belongsToGroup)&&group.activity_status!=='completed';
    const status=labels[group.activity_status]||labels.not_started;
    const photo=BioUI.photoUrl(group.photo_url);
    root.innerHTML=`
      <section class="group-hero panel reveal is-visible">
        ${photo?`<img class="group-hero-photo" src="${esc(photo)}" alt="Foto do trabalho de ${esc(group.name)}">`:''}
        <div class="group-hero-copy">
          <p class="eyebrow">ATIVIDADE PRÁTICA</p>
          <div class="section-head"><h1>${esc(group.name)}</h1><span class="status-pill status-${group.activity_status}">${status[0]} ${status[1]}</span></div>
          <p class="muted">${esc(group.description||'Tema da atividade')}</p>
          <div class="mini-stats"><span>Integrantes: ${members.length}</span><span>Receitas: ${recipes.length}</span></div>
        </div>
      </section>
      ${group.activity_status==='completed'?'<div class="status success-banner"><strong>Atividade finalizada.</strong> As receitas estão bloqueadas até o professor reabrir o grupo.</div>':''}
      ${profile?.is_anonymous?'<div class="note">O acesso anônimo é somente para consulta. Entre com uma conta cadastrada para editar.</div>':''}
      <section class="panel reveal">
        <p class="eyebrow">INTEGRANTES</p><h2>Quem está no grupo</h2>
        <div class="member-list">${members.length
          ?members.map(person=>`<span class="member-chip">${person.call_number!=null?person.call_number+' — ':''}${esc(person.full_name||'Sem nome')}</span>`).join('')
          :`<span class="muted">${maySeeMembers?'Nenhum aluno cadastrado neste grupo.':'Entre com uma conta deste grupo para ver os integrantes.'}</span>`}</div>
      </section>
      <section class="panel reveal">
        <div class="section-head"><div><p class="eyebrow">RECEITAS</p><h2>O que o grupo vai preparar</h2></div>${canEditContent?'<button class="btn" id="new" type="button">Nova receita</button>':''}</div>
        <div id="recipes"></div><div id="editor" hidden></div>
      </section>
      ${isTeacher?teacherControls():''}`;
    renderRecipes({isTeacher,canEditContent});
    bindControls({isTeacher,canEditContent});
    Classroom?.startClock();BioEffects?.observe();
  }

  function teacherControls(){
    return `<section class="panel reveal"><p class="eyebrow">CONTROLE DO PROFESSOR</p><h2>Status e registro</h2>
      <div class="actions"><label class="sr-only" for="groupStatus">Status do grupo</label><select id="groupStatus">${Object.entries(labels).map(([key,value])=>`<option value="${key}" ${key===group.activity_status?'selected':''}>${value[0]} ${value[1]}</option>`).join('')}</select><button id="saveStatus" class="btn" type="button">Atualizar status</button><button id="historyBtn" class="btn secondary" type="button">Ver histórico</button></div>
      <div class="field"><label for="groupPhoto">Foto do trabalho</label><input id="groupPhoto" type="file" accept="image/jpeg,image/png,image/webp"><button id="uploadGroupPhoto" class="btn secondary" type="button">Enviar foto</button><small class="muted">JPG, PNG ou WebP, no máximo 5 MB.</small></div>
      <div id="historyBox" class="history-box" hidden></div></section>`;
  }

  function renderRecipes({isTeacher,canEditContent}){
    const list=document.querySelector('#recipes');
    if(!recipes.length){list.innerHTML='<div class="empty-state">Nenhuma receita cadastrada ainda.</div>';return}
    list.innerHTML=recipes.map(recipe=>{
      const showActions=canEditContent||isTeacher;
      return `<article class="recipe reveal"><div class="section-head"><h3>${esc(recipe.title)}</h3>${recipe.is_locked?'<span class="status-pill status-completed">🔒 Bloqueada</span>':''}</div>
        <h4>Ingredientes</h4><p>${esc(recipe.ingredients).replace(/\n/g,'<br>')}</p>
        <h4>Modo de preparo</h4><p>${esc(recipe.instructions).replace(/\n/g,'<br>')}</p>
        ${recipe.notes?`<h4>Observações</h4><p>${esc(recipe.notes).replace(/\n/g,'<br>')}</p>`:''}
        ${showActions?`<div class="actions">${canEditContent&&!recipe.is_locked?`<button class="btn secondary edit" data-id="${recipe.id}" type="button">Editar</button>`:''}${isTeacher?`<button class="btn secondary lock" data-id="${recipe.id}" data-locked="${!recipe.is_locked}" type="button">${recipe.is_locked?'Reabrir receita':'Bloquear receita'}</button><button class="btn danger delete" data-id="${recipe.id}" type="button">Excluir</button>`:''}</div>`:''}</article>`;
    }).join('');
  }

  function bindControls({isTeacher,canEditContent}){
    if(canEditContent)document.querySelector('#new')?.addEventListener('click',()=>editor());
    document.querySelectorAll('.edit').forEach(button=>button.addEventListener('click',()=>editor(button.dataset.id)));
    document.querySelectorAll('.delete').forEach(button=>button.addEventListener('click',()=>removeRecipe(button)));
    document.querySelectorAll('.lock').forEach(button=>button.addEventListener('click',()=>toggleLock(button)));
    if(!isTeacher)return;
    document.querySelector('#saveStatus').addEventListener('click',saveStatus);
    document.querySelector('#historyBtn').addEventListener('click',toggleHistory);
    document.querySelector('#uploadGroupPhoto').addEventListener('click',uploadPhoto);
  }

  function editor(id){
    const selected=id?recipes.find(recipe=>recipe.id===id):null;
    const target=document.querySelector('#editor');
    target.hidden=false;
    target.innerHTML=`<div class="editor-card"><div class="field"><label for="rt">Nome da receita</label><input id="rt" maxlength="160" value="${esc(selected?.title||'')}"></div><div class="field"><label for="ri">Ingredientes</label><textarea id="ri" maxlength="20000">${esc(selected?.ingredients||'')}</textarea></div><div class="field"><label for="rx">Modo de preparo</label><textarea id="rx" maxlength="20000">${esc(selected?.instructions||'')}</textarea></div><div class="field"><label for="rn">Observações</label><textarea id="rn" maxlength="5000">${esc(selected?.notes||'')}</textarea></div><div class="actions"><button class="btn" id="saveRecipe" type="button">Salvar receita</button><button class="btn secondary" id="cancelRecipe" type="button">Cancelar</button></div><p id="recipeMsg" class="form-message" role="status"></p></div>`;
    document.querySelector('#saveRecipe').addEventListener('click',event=>saveRecipe(selected?.id,event.currentTarget));
    document.querySelector('#cancelRecipe').addEventListener('click',()=>{target.hidden=true});
    document.querySelector('#rt').focus();
  }

  async function saveRecipe(id,button){
    const message=document.querySelector('#recipeMsg');
    const payload={title:document.querySelector('#rt').value.trim(),ingredients:document.querySelector('#ri').value.trim(),instructions:document.querySelector('#rx').value.trim(),notes:document.querySelector('#rn').value.trim()};
    if(!payload.title||!payload.ingredients||!payload.instructions){message.textContent='Preencha nome, ingredientes e modo de preparo.';message.className='form-message error-text';return}
    button.disabled=true;message.textContent='Salvando…';message.className='form-message';
    try{
      const result=id
        ?await BioUI.withTimeout(sb.rpc('save_recipe_classroom',{target_recipe_id:id,new_title:payload.title,new_ingredients:payload.ingredients,new_instructions:payload.instructions,new_notes:payload.notes}))
        :await BioUI.withTimeout(sb.from('recipes').insert({...payload,group_id:group.id}).select().single());
      if(result.error)throw result.error;await load();
    }catch(error){message.textContent=BioUI.friendlyError(error);message.className='form-message error-text';button.disabled=false}
  }

  async function saveStatus(event){
    const button=event.currentTarget;button.disabled=true;
    try{
      const result=await BioUI.withTimeout(sb.rpc('set_group_status',{target_group_id:group.id,new_status:document.querySelector('#groupStatus').value}));
      if(result.error)throw result.error;await load();
    }catch(error){alert(BioUI.friendlyError(error));button.disabled=false}
  }
  async function toggleHistory(){
    const box=document.querySelector('#historyBox');box.hidden=!box.hidden;if(box.hidden)return;
    box.innerHTML='<p>Carregando histórico…</p>';
    try{
      const result=await BioUI.withTimeout(sb.rpc('get_group_history',{target_group_id:group.id}));if(result.error)throw result.error;
      box.innerHTML=result.data?.length?result.data.map(item=>`<div class="history-item"><strong>${esc(historyLabels[item.action]||item.action)}</strong><small>${new Date(item.created_at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}</small></div>`).join(''):'<p class="muted">Nenhuma alteração registrada.</p>';
    }catch(error){box.innerHTML='<p class="error-text">'+esc(BioUI.friendlyError(error))+'</p>'}
  }
  async function toggleLock(button){
    const locked=button.dataset.locked==='true';
    if(locked&&!confirm('Bloquear esta receita para edição?'))return;
    button.disabled=true;
    try{const result=await BioUI.withTimeout(sb.rpc('set_recipe_lock',{target_recipe_id:button.dataset.id,new_locked:locked}));if(result.error)throw result.error;await load()}
    catch(error){alert(BioUI.friendlyError(error));button.disabled=false}
  }
  async function removeRecipe(button){
    if(!confirm('Excluir esta receita permanentemente?'))return;
    button.disabled=true;
    try{const result=await BioUI.withTimeout(sb.from('recipes').delete().eq('id',button.dataset.id));if(result.error)throw result.error;await load()}
    catch(error){alert(BioUI.friendlyError(error));button.disabled=false}
  }
  async function uploadPhoto(event){
    const button=event.currentTarget;const file=document.querySelector('#groupPhoto').files[0];
    const allowed=['image/jpeg','image/png','image/webp'];
    if(!file){alert('Escolha uma imagem primeiro.');return}
    if(!allowed.includes(file.type)){alert('Use uma imagem JPG, PNG ou WebP.');return}
    if(file.size>5*1024*1024){alert('A imagem deve ter no máximo 5 MB.');return}
    const ext={"image/jpeg":'jpg',"image/png":'png',"image/webp":'webp'}[file.type];
    const path=`${group.id}/${Date.now()}.${ext}`;button.disabled=true;button.textContent='Enviando…';
    try{
      const upload=await BioUI.withTimeout(sb.storage.from('activity-photos').upload(path,file,{upsert:false,contentType:file.type}));
      if(upload.error)throw upload.error;
      const url=sb.storage.from('activity-photos').getPublicUrl(path).data.publicUrl;
      const result=await BioUI.withTimeout(sb.rpc('set_group_photo',{target_group_id:group.id,new_photo_url:url}));
      if(result.error){await sb.storage.from('activity-photos').remove([path]);throw result.error}
      await load();
    }catch(error){alert(BioUI.friendlyError(error));button.disabled=false;button.textContent='Enviar foto'}
  }
  load();
})();
