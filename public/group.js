(()=>{
  const root=document.querySelector('#group-app');
  if(!root)return;
  const slug=new URLSearchParams(location.search).get('slug')||document.body.dataset.groupSlug;
  const esc=BioUI.escape;
  const labels={
    not_started:['⚪','Não iniciado'],in_progress:['🔵','Em andamento'],
    review:['🟡','Em revisão'],completed:['🟢','Finalizado']
  };
  const historyLabels={
    status_changed:'Status alterado',recipe_created:'Receita criada',recipe_updated:'Receita atualizada',
    recipe_deleted:'Receita excluída',recipe_locked:'Receita bloqueada',recipe_unlocked:'Receita reaberta',
    photo_changed:'Foto alterada',announcement_changed:'Aviso alterado',group_form_updated:'Formulário do grupo atualizado',group_phrase_created:'Frase cadastrada',group_phrase_removed:'Frase removida'
  };
  const reviewLabels={draft:'Rascunho',submitted:'Enviado para revisão',changes_requested:'Correções solicitadas',approved:'Aprovado'};
  let group=null,recipes=[],profile=null,members=[],settings={edits_locked:false,activity_finalized:false};
  let realtimeReady=false,refreshTimer=null,loading=false,lastLoadedAt=0;

  function showRefreshError(error){
    document.querySelector('#group-refresh-error')?.remove();
    const notice=document.createElement('div');notice.id='group-refresh-error';notice.className='note error';notice.setAttribute('role','status');
    notice.textContent=BioUI.friendlyError(error,'Não foi possível atualizar. Os dados anteriores foram mantidos.');
    root.prepend(notice);setTimeout(()=>notice.remove(),5000);
  }

  async function load(preserve=false){
    if(loading)return;
    loading=true;
    if(!preserve)root.innerHTML='<section class="panel loading-state">Carregando grupo…</section>';
    try{
      const pageRequest=BioUI.withTimeout(sb.rpc('get_group_page',{p_slug:slug}));
      const pageResult=await pageRequest;
      if(pageResult.error)throw pageResult.error;
      if(!pageResult.data?.group)throw new Error('Grupo não encontrado.');
      profile=pageResult.data.viewer||null;
      group=pageResult.data.group;recipes=pageResult.data.recipes||[];members=pageResult.data.members||[];settings=pageResult.data.settings||settings;
      Classroom.renderAnnouncement(pageResult.data.announcement);
      const maySeeMembers=profile&&!profile.is_anonymous&&(profile.role==='teacher'||profile.group_id===group.id);
      render(maySeeMembers);
      lastLoadedAt=Date.now();
      setupRealtime();
    }catch(error){
      if(preserve){showRefreshError(error);return}
      root.innerHTML='<section class="panel error-state"><strong>Não foi possível carregar este grupo.</strong><p>'+esc(BioUI.friendlyError(error))+'</p><button class="btn" id="retry">Tentar novamente</button></section>';
      document.querySelector('#retry')?.addEventListener('click',()=>load(false));
    }finally{loading=false}
  }

  function setupRealtime(){
    if(realtimeReady)return;
    realtimeReady=true;
    Classroom.subscribe('group',[
      {table:'groups',filter:`id=eq.${group.id}`},
      {table:'recipes',filter:`group_id=eq.${group.id}`},
      {table:'profiles'},
      {table:'classroom_settings',filter:'id=eq.1'},
      {table:'announcements'},
      {table:'group_phrases'}
    ],({table,payload})=>{
      if(table==='group_phrases'){GroupCollab.refreshPhrases();return}
      if(table==='announcements')return;
      clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{
        if(Date.now()-lastLoadedAt>=800)load(true);
      },450);
    });
  }

  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden&&Date.now()-lastLoadedAt>30000)load(true);
  });

  function groupFormPanel(){
    if(!group?.form_text||!group?.form_url)return '';
    return `<section class="panel reveal"><p class="eyebrow">FORMULÁRIO DO TEMA</p><div class="section-head"><div><h2>Atividade obrigatória para toda a turma</h2><p class="muted">Todos os alunos da turma devem responder este formulário para composição da nota.</p></div><span class="status-pill status-review">Obrigatório</span></div><p>${esc(group.form_text).replace(/\n/g,'<br>')}</p><div class="actions"><a class="btn" href="${esc(group.form_url)}" target="_blank" rel="noopener noreferrer">Abrir formulário</a></div></section>`;
  }

  function render(maySeeMembers){
    const isTeacher=profile?.role==='teacher'&&!profile.is_anonymous;
    const belongsToGroup=profile?.group_id===group.id&&!profile?.is_anonymous;
    const canEditContent=isTeacher||(belongsToGroup&&group.activity_status!=='completed'&&!settings.edits_locked&&!settings.activity_finalized);
    const status=labels[group.activity_status]||labels.not_started;
    const photo=BioUI.photoUrl(group.photo_url);
    root.innerHTML=`
      <section class="group-hero panel reveal is-visible">
        ${photo?`<img class="group-hero-photo" src="${esc(photo)}" alt="Foto do trabalho de ${esc(group.name)}" decoding="async">`:''}
        <div class="group-hero-copy">
          <p class="eyebrow">ATIVIDADE PRÁTICA</p>
          <div class="section-head"><h1>${esc(group.name)}</h1><span class="status-pill status-${group.activity_status}">${status[0]} ${status[1]}</span></div>
          <p class="muted">${esc(group.description||'Tema da atividade')}</p>
          <div class="mini-stats"><span>Integrantes: ${members.length}</span><span>Receitas: ${recipes.length}</span></div>
        </div>
      </section>
      ${GroupCollab.panels({group,profile,settings})}
      ${group.activity_status==='completed'?'<div class="status success-banner"><strong>Atividade finalizada.</strong> As receitas estão bloqueadas até o professor reabrir o grupo.</div>':''}
      ${(settings.edits_locked||settings.activity_finalized)&&!isTeacher?'<div class="note"><strong>Edições bloqueadas pelo professor.</strong> Você ainda pode consultar as receitas e os feedbacks.</div>':''}
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
    GroupCollab.mount({group,profile,settings});
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
      const studentCanEdit=canEditContent&&!recipe.is_locked&&['draft','changes_requested'].includes(recipe.review_status);
      const canReview=profile&&!profile.is_anonymous&&(isTeacher||profile.group_id===group.id);
      return `<article class="recipe reveal"><div class="section-head"><h3>${esc(recipe.title)}</h3><span class="review-badge review-${recipe.review_status}">${reviewLabels[recipe.review_status]||recipe.review_status}</span></div>
        <h4>Ingredientes</h4><p>${esc(recipe.ingredients).replace(/\n/g,'<br>')}</p>
        <h4>Modo de preparo</h4><p>${esc(recipe.instructions).replace(/\n/g,'<br>')}</p>
        ${recipe.notes?`<h4>Observações</h4><p>${esc(recipe.notes).replace(/\n/g,'<br>')}</p>`:''}
        ${showActions||canReview?`<div class="actions">${studentCanEdit?`<button class="btn secondary edit" data-id="${recipe.id}" type="button">Editar</button>`:''}${!isTeacher&&studentCanEdit?`<button class="btn submit-review" data-id="${recipe.id}" type="button">${recipe.review_status==='changes_requested'?'Reenviar para revisão':'Enviar para revisão'}</button>`:''}${canReview?`<button class="btn secondary feedback" data-id="${recipe.id}" type="button">Ver feedback</button>`:''}${isTeacher?`<button class="btn secondary lock" data-id="${recipe.id}" data-locked="${!recipe.is_locked}" type="button">${recipe.is_locked?'Reabrir receita':'Bloquear receita'}</button><button class="btn danger delete" data-id="${recipe.id}" type="button">Mover para lixeira</button>`:''}</div><div class="history-box" id="recipe-feedback-${recipe.id}" hidden></div>`:''}</article>`;
    }).join('');
  }

  function bindControls({isTeacher,canEditContent}){
    if(canEditContent)document.querySelector('#new')?.addEventListener('click',()=>editor());
    document.querySelectorAll('.edit').forEach(button=>button.addEventListener('click',()=>editor(button.dataset.id)));
    document.querySelectorAll('.delete').forEach(button=>button.addEventListener('click',()=>removeRecipe(button)));
    document.querySelectorAll('.lock').forEach(button=>button.addEventListener('click',()=>toggleLock(button)));
    document.querySelectorAll('.submit-review').forEach(button=>button.addEventListener('click',()=>submitReview(button)));
    document.querySelectorAll('.feedback').forEach(button=>button.addEventListener('click',()=>showFeedback(button)));
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
    document.querySelector('#saveRecipe').addEventListener('click',event=>saveRecipe(selected?.id,event.currentTarget,selected?.row_version));
    document.querySelector('#cancelRecipe').addEventListener('click',()=>{target.hidden=true});
    document.querySelector('#rt').focus();
  }

  async function saveRecipe(id,button,rowVersion){
    const message=document.querySelector('#recipeMsg');
    const payload={title:document.querySelector('#rt').value.trim(),ingredients:document.querySelector('#ri').value.trim(),instructions:document.querySelector('#rx').value.trim(),notes:document.querySelector('#rn').value.trim()};
    if(!payload.title||!payload.ingredients||!payload.instructions){message.textContent='Preencha nome, ingredientes e modo de preparo.';message.className='form-message error-text';return}
    button.disabled=true;message.textContent='Salvando…';message.className='form-message';
    try{
      const result=id
        ?await BioUI.withTimeout(sb.rpc('save_recipe_versioned',{p_recipe_id:id,p_expected_version:rowVersion,p_title:payload.title,p_ingredients:payload.ingredients,p_instructions:payload.instructions,p_notes:payload.notes}))
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
    if(!confirm('Mover esta receita para a lixeira? Ela poderá ser restaurada no painel.'))return;
    button.disabled=true;
    try{const result=await BioUI.withTimeout(sb.rpc('soft_delete_recipe',{p_recipe_id:button.dataset.id}));if(result.error)throw result.error;await load()}
    catch(error){alert(BioUI.friendlyError(error));button.disabled=false}
  }
  async function submitReview(button){
    if(!confirm('Enviar esta receita para revisão do professor? Durante a revisão ela ficará bloqueada para edição.'))return;
    button.disabled=true;
    try{const result=await BioUI.withTimeout(sb.rpc('transition_recipe_review',{p_recipe_id:button.dataset.id,p_action:'submitted',p_message:null}));if(result.error)throw result.error;await load()}
    catch(error){alert(BioUI.friendlyError(error));button.disabled=false}
  }
  async function showFeedback(button){
    const box=document.querySelector('#recipe-feedback-'+CSS.escape(button.dataset.id));box.hidden=!box.hidden;if(box.hidden)return;box.innerHTML='<p>Carregando feedback…</p>';
    try{const result=await BioUI.withTimeout(sb.rpc('get_recipe_reviews',{p_recipe_id:button.dataset.id}));if(result.error)throw result.error;box.innerHTML=result.data?.length?result.data.map(item=>`<div class="history-item"><span><strong>${esc(reviewLabels[item.event_type]||item.event_type)}</strong>${item.message?`<p>${esc(item.message)}</p>`:''}</span><small>${esc(item.author_name)} · ${new Date(item.created_at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}</small></div>`).join(''):'<p class="muted">Nenhum feedback registrado.</p>'}
    catch(error){box.innerHTML='<p class="error-text">'+esc(BioUI.friendlyError(error))+'</p>'}
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
