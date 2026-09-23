(()=>{
  const root=document.querySelector('#teacher-app');
  if(!root)return;
  const esc=BioUI.escape;
  const statusText={not_started:'Não iniciado',in_progress:'Em andamento',review:'Em revisão',completed:'Finalizado'};
  const reviewText={draft:'Rascunho',submitted:'Enviado para revisão',changes_requested:'Correções solicitadas',approved:'Aprovado'};
  const actionText={profile_updated:'Perfil alterado',student_promoted_to_teacher:'Aluno promovido a professor',students_bulk_moved:'Alunos movidos',group_updated:'Grupo alterado',checklist_updated:'Checklist atualizado',recipe_submitted:'Receita enviada',recipe_approved:'Receita aprovada',recipe_changes_requested:'Correções solicitadas',teacher_comment_added:'Comentário do professor',classroom_lock:'Edições bloqueadas',classroom_unlock:'Edições liberadas',classroom_finalize:'Atividade finalizada',announcement_saved:'Aviso salvo',announcement_deleted:'Aviso removido',recipe_trashed:'Receita enviada à lixeira',recipe_restored:'Receita restaurada',recipe_purged:'Receita excluída definitivamente',status_changed:'Status alterado',recipe_created:'Receita criada',recipe_updated:'Receita atualizada'};
  let data=null,viewer=null,active='dashboard',historyOffset=0;
  let loading=false,realtimeReady=false,refreshTimer=null,lastLoadedAt=0;

  const groupName=id=>data?.groups.find(group=>group.id===id)?.name||'Sem grupo';
  const date=value=>value?new Date(value).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'—';
  const toast=(message,type='success')=>{
    let node=document.querySelector('#teacher-toast');
    if(!node){node=document.createElement('div');node.id='teacher-toast';node.className='teacher-toast';node.setAttribute('role','status');node.setAttribute('aria-live','polite');document.body.append(node)}
    node.textContent=message;node.dataset.type=type;node.hidden=false;clearTimeout(node.timer);node.timer=setTimeout(()=>{node.hidden=true},4200);
  };
  const rpc=async(name,args={})=>{const result=await BioUI.withTimeout(sb.rpc(name,args));if(result.error)throw result.error;return result.data};
  const setBusy=(button,busy,label='Processando…')=>{if(!button)return;button.disabled=busy;if(busy){button.dataset.label=button.textContent;button.textContent=label}else if(button.dataset.label){button.textContent=button.dataset.label;delete button.dataset.label}};

  async function load(keepTab=true){
    if(loading)return;
    loading=true;
    root.setAttribute('aria-busy','true');
    if(!data)root.innerHTML='<section class="panel loading-state">Carregando central de gerenciamento…</section>';
    else root.querySelector('#teacher-sync')?.replaceChildren('Atualizando…');
    try{
      const me=viewer||await BioAuth.profile();
      if(!me.user){location.href='../login/';return}
      if(me.error||me.profile?.role!=='teacher'||me.profile?.is_anonymous){root.innerHTML='<section class="panel error-state"><h2>Acesso negado</h2><p>Esta área é exclusiva para professores autorizados.</p><a class="btn secondary" href="../">Voltar</a></section>';return}
      viewer=me;
      data=await rpc('teacher_dashboard_snapshot');
      render(keepTab?active:'dashboard');
      lastLoadedAt=Date.now();setupRealtime();
    }catch(error){
      if(data)toast(BioUI.friendlyError(error),'error');
      else{root.innerHTML=`<section class="panel error-state"><h2>Não foi possível carregar o painel</h2><p>${esc(BioUI.friendlyError(error))}</p><button id="retry" class="btn">Tentar novamente</button></section>`;document.querySelector('#retry')?.addEventListener('click',()=>load())}
    }finally{loading=false;root.removeAttribute('aria-busy')}
  }

  function setupRealtime(){
    if(realtimeReady)return;
    realtimeReady=true;
    Classroom.subscribe('teacher',[
      {table:'profiles'},
      {table:'groups'},
      {table:'recipes'},
      {table:'classroom_settings',filter:'id=eq.1'},
      {table:'announcements'}
    ],({table,payload})=>{
      if(table==='profiles'&&[payload.new?.id,payload.old?.id].includes(viewer?.user?.id))viewer=null;
      clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{
        if(Date.now()-lastLoadedAt>=900)load();
      },600);
    });
  }

  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden&&Date.now()-lastLoadedAt>30000)load();
  });

  function render(tab){
    active=tab;
    const tabs=[['dashboard','Visão geral'],['students','Alunos'],['groups','Grupos'],['reviews','Revisões'],['announcements','Avisos'],['activity','Atividade'],['trash','Lixeira']];
    root.innerHTML=`<div id="panel-status" class="sr-only" aria-live="polite"></div>
      <nav class="teacher-tabs panel" aria-label="Seções da central">${tabs.map(([id,label])=>`<button class="teacher-tab ${id===active?'active':''}" data-tab="${id}" aria-current="${id===active?'page':'false'}">${label}</button>`).join('')}</nav>
      <div class="teacher-toolbar panel"><div><strong>${esc(data.settings.activity_name)}</strong><small>${data.settings.activity_finalized?'Atividade finalizada':data.settings.edits_locked?'Edições bloqueadas':'Edições liberadas'} · <span id="teacher-sync">Atualizado agora</span></small></div><div class="actions"><a class="btn secondary" href="../apresentacao/" target="_blank" rel="noopener">Modo apresentação</a><button class="btn secondary" data-action="export">Exportar CSV</button><button class="btn secondary" data-action="refresh">Atualizar</button></div></div>
      <section id="teacher-content">${section(active)}</section>`;
    bind();Classroom?.startClock();BioEffects?.observe();
  }
  function section(tab){return({dashboard,students,groups,reviews,announcements,activity,trash}[tab]||dashboard)()}

  function metrics(){
    const m=data.metrics;const status=Object.fromEntries(Object.keys(statusText).map(k=>[k,data.groups.filter(g=>g.activity_status===k).length]));
    const values=[['Alunos',m.students,'students'],['Professores',m.teachers,'students'],['Grupos',m.groups,'groups'],['Receitas',m.recipes,'reviews'],['Sem grupo',m.students_without_group,'students'],['Sem número',m.students_without_number,'students'],['Grupos sem receita',m.groups_without_recipe,'groups'],['Aguardando revisão',m.review_waiting,'reviews'],...Object.entries(status).map(([k,v])=>[statusText[k],v,'groups'])];
    return `<div class="management-metrics">${values.map(([label,value,target])=>`<button class="metric-card" data-tab="${target}"><strong>${value}</strong><span>${label}</span></button>`).join('')}</div>`;
  }
  function getPending(){
    const list=[];
    data.profiles.filter(p=>p.role==='student').forEach(p=>{if(!p.group_id)list.push({kind:'Aluno sem grupo',text:p.full_name,target:'students'});if(!p.call_number)list.push({kind:'Aluno sem número',text:p.full_name,target:'students'})});
    data.groups.forEach(g=>{const members=data.profiles.filter(p=>p.role==='student'&&p.group_id===g.id);const recipes=data.recipes.filter(r=>r.group_id===g.id);if(!members.length)list.push({kind:'Grupo sem integrantes',text:g.name,target:'groups'});if(!recipes.length)list.push({kind:'Grupo sem receita',text:g.name,target:'groups'});if(g.activity_status==='not_started')list.push({kind:'Grupo não iniciado',text:g.name,target:'groups'});recipes.filter(r=>r.review_status==='submitted').forEach(r=>list.push({kind:'Aguardando professor',text:`${g.name}: ${r.title}`,target:'reviews'}));recipes.filter(r=>r.review_status==='changes_requested').forEach(r=>list.push({kind:'Correções solicitadas',text:`${g.name}: ${r.title}`,target:'reviews'}))});
    return list;
  }
  function dashboard(){
    const pending=getPending();
    return `<section class="dashboard-hero panel"><div><p class="eyebrow">CENTRAL DA TURMA</p><h2>Visão geral</h2><p class="muted">Informações que exigem atenção durante a atividade.</p></div><div class="class-clock"><small>Horário de Brasília</small><strong data-brasilia-clock>--:--:--</strong></div></section>
      ${metrics()}
      <div class="management-columns"><section class="panel"><div class="section-head"><div><p class="eyebrow">PENDÊNCIAS</p><h2>${pending.length} item(ns)</h2></div></div><div class="pending-list">${pending.length?pending.slice(0,20).map(p=>`<button class="pending-item" data-tab="${p.target}"><span><strong>${esc(p.kind)}</strong><small>${esc(p.text)}</small></span><span aria-hidden="true">→</span></button>`).join(''):'<div class="empty-state">Nenhuma pendência detectada.</div>'}</div></section>
      <section class="panel"><p class="eyebrow">ATIVIDADE RECENTE</p><h2>Últimas alterações</h2>${historyList(data.recent.slice(0,12))}</section></div>
      <section class="panel"><p class="eyebrow">CONTROLE GERAL</p><h2>Bloqueio e finalização</h2><p class="muted">Estas regras são aplicadas no banco, inclusive em chamadas diretas à API.</p><div class="actions"><button class="btn secondary" data-control="unlock">Liberar edições</button><button class="btn" data-control="lock">Bloquear edições</button><button class="btn danger" data-control="finalize">Finalizar atividade</button></div></section>`;
  }

  function students(){
    return `<section class="panel"><div class="section-head"><div><p class="eyebrow">ALUNOS</p><h2>Gerenciamento da turma</h2></div><span class="muted">${data.profiles.filter(p=>p.role==='student').length} alunos</span></div>
      <div class="filter-grid"><div class="field"><label for="student-search">Pesquisar</label><input id="student-search" type="search" placeholder="Nome, número ou e-mail"></div><div class="field"><label for="student-group">Grupo</label><select id="student-group"><option value="">Todos</option><option value="none">Sem grupo</option>${data.groups.map(g=>`<option value="${g.id}">${esc(g.name)}</option>`).join('')}</select></div><div class="field"><label for="student-state">Situação</label><select id="student-state"><option value="">Todas</option><option value="missing-number">Sem número</option><option value="missing-group">Sem grupo</option></select></div></div>
      <div class="bulk-bar"><strong><span id="selected-count">0</span> selecionado(s)</strong><select id="bulk-group"><option value="">Remover dos grupos</option>${data.groups.map(g=>`<option value="${g.id}">Mover para ${esc(g.name)}</option>`).join('')}</select><button class="btn" data-action="bulk-students" disabled>Aplicar</button></div>
      <div id="student-list" class="responsive-list">${studentRows(data.profiles.filter(p=>p.role==='student'))}</div></section>
      <section class="panel"><p class="eyebrow">PROFESSORES</p><h2>Contas administrativas</h2>${studentRows(data.profiles.filter(p=>p.role==='teacher'),false)}</section>`;
  }
  function studentRows(rows,selectable=true){
    if(!rows.length)return '<div class="empty-state">Nenhuma conta encontrada.</div>';
    return rows.map(p=>`<article class="person-card" data-search="${esc(`${p.full_name} ${p.call_number||''} ${p.email||''}`.toLowerCase())}" data-group="${p.group_id||'none'}" data-number="${p.call_number?'set':'missing'}"><div class="person-select">${selectable?`<input class="student-check" type="checkbox" value="${p.id}" aria-label="Selecionar ${esc(p.full_name)}">`:''}</div><div><strong>${esc(p.full_name||'Sem nome')}</strong><small>Nº ${p.call_number??'não informado'} · ${esc(groupName(p.group_id))}</small><small>${esc(p.email||'E-mail indisponível')}</small></div><div class="actions"><button class="btn secondary" data-edit-student="${p.id}">Editar</button>${p.role==='student'?`<button class="btn secondary" data-promote-teacher="${p.id}" data-name="${esc(p.full_name)}">Tornar professor</button><button class="btn danger" data-delete-account="${p.id}" data-name="${esc(p.full_name)}">Excluir conta</button>`:''}</div></article>`).join('');
  }

  function checklistState(group,item){
    if(item.is_manual)return item.is_completed;
    const recipes=data.recipes.filter(r=>r.group_id===group.id),members=data.profiles.filter(p=>p.role==='student'&&p.group_id===group.id);
    return {members_defined:members.length>0,call_numbers:members.length>0&&members.every(p=>p.call_number),recipe_registered:recipes.length>0,ingredients_filled:recipes.some(r=>r.ingredients?.trim()),instructions_filled:recipes.some(r=>r.instructions?.trim()),recipe_reviewed:recipes.some(r=>['changes_requested','approved'].includes(r.review_status)),teacher_approved:recipes.some(r=>r.review_status==='approved')}[item.item_key]||false;
  }
  function groups(){
    return `<section class="panel"><div class="section-head"><div><p class="eyebrow">GRUPOS</p><h2>Central de grupos</h2></div></div><div class="bulk-bar"><strong><span id="group-selected-count">0</span> selecionado(s)</strong><select id="bulk-group-action"><option value="status:not_started">Marcar não iniciados</option><option value="status:in_progress">Marcar em andamento</option><option value="status:review">Enviar para revisão</option><option value="status:completed">Finalizar grupos</option><option value="lock">Bloquear receitas</option><option value="unlock">Liberar receitas</option></select><button class="btn" data-action="bulk-groups" disabled>Aplicar</button></div><div class="admin-group-grid">${data.groups.map(groupCard).join('')}</div></section>`;
  }
  function groupCard(g){
    const members=data.profiles.filter(p=>p.role==='student'&&p.group_id===g.id),recipes=data.recipes.filter(r=>r.group_id===g.id),items=data.checklist.filter(i=>i.group_id===g.id),done=items.filter(i=>checklistState(g,i)).length;
    return `<article class="admin-group-card"><div class="section-head"><div><label class="check-title"><input class="group-check" type="checkbox" value="${g.id}"><strong>${esc(g.name)}</strong></label><p class="muted">${esc(g.description||'Sem descrição')}</p></div><span class="status-pill status-${g.activity_status}">${statusText[g.activity_status]}</span></div><div class="mini-stats"><span>${members.length} integrante(s)</span><span>${recipes.length} receita(s)</span><span>${done}/${items.length} checks</span></div><progress max="${items.length||1}" value="${done}">${done}/${items.length}</progress><details><summary>Checklist e ações</summary><div class="checklist-list">${items.map(item=>`<label class="checklist-item ${item.is_manual?'manual':'automatic'}"><input type="checkbox" ${checklistState(g,item)?'checked':''} ${item.is_manual?`data-check-item="${item.item_key}" data-group-id="${g.id}"`:'disabled'}><span>${esc(item.label)}<small>${item.is_manual?'Manual':'Automático'}</small></span></label>`).join('')}</div><div class="actions"><button class="btn secondary" data-edit-group="${g.id}">Editar grupo</button><a class="btn secondary" href="../${encodeURIComponent(g.slug)}/">Abrir receitas</a></div></details></article>`;
  }

  function reviews(){
    const ordered=[...data.recipes].sort((a,b)=>(a.review_status==='submitted'?-1:1)-(b.review_status==='submitted'?-1:1));
    return `<section class="panel"><p class="eyebrow">REVISÃO PEDAGÓGICA</p><h2>Receitas</h2><div class="filter-grid"><div class="field"><label for="review-filter">Estado</label><select id="review-filter"><option value="">Todos</option>${Object.entries(reviewText).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></div><div class="field"><label for="recipe-search">Pesquisar receita</label><input id="recipe-search" type="search" placeholder="Receita ou grupo"></div></div><div id="review-list" class="review-list">${ordered.length?ordered.map(reviewCard).join(''):'<div class="empty-state">Nenhuma receita cadastrada.</div>'}</div></section>`;
  }
  function reviewCard(r){
    return `<article class="review-card" data-review="${r.review_status}" data-search="${esc(`${r.title} ${groupName(r.group_id)}`.toLowerCase())}"><div class="section-head"><div><h3>${esc(r.title)}</h3><p class="muted">${esc(groupName(r.group_id))} · Atualizada ${date(r.updated_at)}</p></div><span class="review-badge review-${r.review_status}">${reviewText[r.review_status]}</span></div><details><summary>Visualizar conteúdo</summary><h4>Ingredientes</h4><p>${esc(r.ingredients).replace(/\n/g,'<br>')}</p><h4>Modo de preparo</h4><p>${esc(r.instructions).replace(/\n/g,'<br>')}</p></details><div class="actions"><button class="btn secondary" data-reviews="${r.id}">Histórico/feedback</button>${r.review_status==='submitted'?`<button class="btn" data-review-action="approved" data-id="${r.id}">Aprovar</button><button class="btn secondary" data-review-action="changes_requested" data-id="${r.id}">Solicitar correções</button>`:''}<button class="btn secondary" data-comment="${r.id}">Comentar</button><button class="btn danger" data-trash="${r.id}">Mover para lixeira</button></div><div id="feedback-${r.id}" class="history-box" hidden></div></article>`;
  }

  function announcements(){
    return `<section class="panel"><p class="eyebrow">AVISOS</p><h2>Criar aviso</h2><form id="announcement-form"><input id="announcement-id" type="hidden"><div class="field"><label for="announcement-title">Título</label><input id="announcement-title" maxlength="120" value="Aviso do professor" required></div><div class="field"><label for="announcement-message">Mensagem</label><textarea id="announcement-message" maxlength="2000" required></textarea></div><div class="form-grid"><label class="checklist-item manual"><input id="announcement-published" type="checkbox" checked><span>Publicar agora</span></label><label class="checklist-item manual"><input id="announcement-featured" type="checkbox"><span>Destacar</span></label><div class="field"><label for="announcement-expires">Validade opcional</label><input id="announcement-expires" type="datetime-local"></div></div><div class="actions"><button class="btn" type="submit">Salvar aviso</button><button id="announcement-cancel" class="btn secondary" type="button">Limpar formulário</button></div></form></section><section class="panel"><h2>Avisos cadastrados</h2><div class="responsive-list">${data.announcements.length?data.announcements.map(a=>`<article class="announcement-admin"><div><strong>${esc(a.title)}</strong><p>${esc(a.message)}</p><small>${a.is_published?'Publicado':'Oculto'}${a.is_featured?' · Em destaque':''}${a.expires_at?' · Válido até '+date(a.expires_at):''}</small></div><div class="actions"><button class="btn secondary" data-edit-announcement="${a.id}">Editar</button><button class="btn danger" data-delete-announcement="${a.id}">Excluir</button></div></article>`).join(''):'<div class="empty-state">Nenhum aviso cadastrado.</div>'}</div></section>`;
  }
  function historyList(rows){return rows?.length?`<div class="timeline">${rows.map(h=>{const actor=h.actor_name||data.profiles.find(p=>p.id===h.actor_id)?.full_name||h.details?.title||'Sistema';return `<article><time>${date(h.created_at)}</time><div><strong>${esc(actionText[h.action]||h.action)}</strong><small>${esc(actor)}${h.group_id?' · '+esc(groupName(h.group_id)):''}</small></div></article>`}).join('')}</div>`:'<div class="empty-state">Nenhuma atividade registrada.</div>'}
  function activity(){return `<section class="panel"><p class="eyebrow">AUDITORIA</p><h2>Atividade recente</h2><div class="filter-grid"><div class="field"><label for="history-group">Grupo</label><select id="history-group"><option value="">Todos</option>${data.groups.map(g=>`<option value="${g.id}">${esc(g.name)}</option>`).join('')}</select></div><div class="field"><label for="history-action">Tipo</label><select id="history-action"><option value="">Todos</option>${[...new Set(data.recent.map(h=>h.action))].map(a=>`<option value="${esc(a)}">${esc(actionText[a]||a)}</option>`).join('')}</select></div></div><div id="history-list">${historyList(data.recent)}</div><div class="actions"><button class="btn secondary" data-action="history-prev" ${historyOffset===0?'disabled':''}>Anterior</button><button class="btn secondary" data-action="history-next">Próxima página</button></div></section>`}
  function trash(){return `<section class="panel"><p class="eyebrow">LIXEIRA</p><h2>Receitas excluídas</h2><p class="muted">Restaure quando necessário. A exclusão definitiva exige confirmação reforçada.</p><div class="responsive-list">${data.trash.length?data.trash.map(r=>`<article class="trash-card"><div><strong>${esc(r.title)}</strong><small>${esc(groupName(r.group_id))} · Excluída ${date(r.deleted_at)}</small></div><div class="actions"><button class="btn secondary" data-restore="${r.id}">Restaurar</button><button class="btn danger" data-purge="${r.id}" data-name="${esc(r.title)}">Excluir definitivamente</button></div></article>`).join(''):'<div class="empty-state">A lixeira está vazia.</div>'}</div></section>`}

  function bind(){
    root.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>render(b.dataset.tab)));
    root.onclick=handleClick;root.onchange=handleChange;
    root.querySelector('#student-search')?.addEventListener('input',filterStudents);root.querySelector('#student-group')?.addEventListener('change',filterStudents);root.querySelector('#student-state')?.addEventListener('change',filterStudents);
    root.querySelector('#review-filter')?.addEventListener('change',filterReviews);root.querySelector('#recipe-search')?.addEventListener('input',filterReviews);
    root.querySelector('#announcement-form')?.addEventListener('submit',saveAnnouncement);root.querySelector('#announcement-cancel')?.addEventListener('click',resetAnnouncement);
    root.querySelector('#history-group')?.addEventListener('change',()=>loadHistory(0));root.querySelector('#history-action')?.addEventListener('change',()=>loadHistory(0));
  }
  function filterStudents(){const search=root.querySelector('#student-search').value.toLowerCase(),group=root.querySelector('#student-group').value,state=root.querySelector('#student-state').value;root.querySelectorAll('#student-list .person-card').forEach(card=>{const match=card.dataset.search.includes(search)&&(!group||card.dataset.group===group)&&(!state||(state==='missing-number'&&card.dataset.number==='missing')||(state==='missing-group'&&card.dataset.group==='none'));card.hidden=!match})}
  function filterReviews(){const status=root.querySelector('#review-filter').value,search=root.querySelector('#recipe-search').value.toLowerCase();root.querySelectorAll('#review-list .review-card').forEach(card=>card.hidden=!!((status&&card.dataset.review!==status)||!card.dataset.search.includes(search)))}
  function selected(selector){return [...root.querySelectorAll(selector+':checked')].map(input=>input.value)}
  function handleChange(event){
    if(event.target.matches('.student-check')){const count=selected('.student-check').length;root.querySelector('#selected-count').textContent=count;root.querySelector('[data-action="bulk-students"]').disabled=!count}
    if(event.target.matches('.group-check')){const count=selected('.group-check').length;root.querySelector('#group-selected-count').textContent=count;root.querySelector('[data-action="bulk-groups"]').disabled=!count}
    if(event.target.matches('[data-check-item]'))updateChecklist(event.target);
  }
  async function handleClick(event){
    const button=event.target.closest('button,[data-edit-student],[data-edit-group]');if(!button)return;
    if(button.dataset.action==='refresh')return load();if(button.dataset.action==='export')return exportCsv();if(button.dataset.action==='bulk-students')return bulkStudents(button);if(button.dataset.action==='bulk-groups')return bulkGroups(button);
    if(button.dataset.action==='history-prev')return loadHistory(Math.max(0,historyOffset-25));if(button.dataset.action==='history-next')return loadHistory(historyOffset+25);
    if(button.dataset.control)return classroomControl(button);if(button.dataset.editStudent)return editStudent(button.dataset.editStudent);if(button.dataset.promoteTeacher)return promoteToTeacher(button);if(button.dataset.deleteAccount)return deleteAccount(button);
    if(button.dataset.editGroup)return editGroup(button.dataset.editGroup);if(button.dataset.reviewAction)return reviewAction(button);if(button.dataset.reviews)return showReviews(button.dataset.reviews);if(button.dataset.comment)return commentRecipe(button.dataset.comment);
    if(button.dataset.trash)return simpleAction(button,'soft_delete_recipe',{p_recipe_id:button.dataset.trash},'Receita movida para a lixeira.');if(button.dataset.restore)return simpleAction(button,'restore_recipe',{p_recipe_id:button.dataset.restore},'Receita restaurada.');if(button.dataset.purge)return purgeRecipe(button);
    if(button.dataset.editAnnouncement)return editAnnouncement(button.dataset.editAnnouncement);if(button.dataset.deleteAnnouncement)return deleteAnnouncement(button);
  }
  async function simpleAction(button,name,args,message){setBusy(button,true);try{await rpc(name,args);toast(message);await load()}catch(error){toast(BioUI.friendlyError(error),'error');setBusy(button,false)}}
  async function classroomControl(button){const label={lock:'bloquear todas as edições',unlock:'liberar as edições',finalize:'FINALIZAR toda a atividade'}[button.dataset.control];if(!confirm(`Confirma ${label}?`))return;await simpleAction(button,'set_classroom_control',{p_action:button.dataset.control},'Controle da atividade atualizado.')}
  async function bulkStudents(button){const ids=selected('.student-check'),group=root.querySelector('#bulk-group').value||null;if(!confirm(`${group?'Mover':'Remover'} ${ids.length} aluno(s) ${group?'para '+groupName(group):'dos grupos'}?`))return;await simpleAction(button,'bulk_assign_students',{p_user_ids:ids,p_group_id:group},`${ids.length} aluno(s) atualizados.`)}
  async function bulkGroups(button){const ids=selected('.group-check'),action=root.querySelector('#bulk-group-action').value;if(!confirm(`Aplicar esta ação a ${ids.length} grupo(s)?`))return;await simpleAction(button,'bulk_group_action',{p_group_ids:ids,p_action:action},'Grupos atualizados.')}
  async function updateChecklist(input){input.disabled=true;try{await rpc('set_checklist_item',{p_group_id:input.dataset.groupId,p_item_key:input.dataset.checkItem,p_completed:input.checked});toast('Checklist atualizado.');await load()}catch(error){input.checked=!input.checked;input.disabled=false;toast(BioUI.friendlyError(error),'error')}}
  async function editStudent(id){const p=data.profiles.find(x=>x.id===id);if(!p)return;const name=prompt('Nome completo:',p.full_name||'');if(name===null)return;const number=prompt('Número da chamada (vazio para remover):',p.call_number??'');if(number===null)return;const group=prompt(`ID do grupo (vazio para sem grupo):\n${data.groups.map(g=>`${g.name}: ${g.id}`).join('\n')}`,p.group_id||'');if(group===null)return;try{await rpc('manage_profile_extended',{p_user_id:id,p_name:name,p_group_id:group||null,p_call_number:number===''?null:Number(number)});toast('Aluno atualizado.');await load()}catch(error){toast(BioUI.friendlyError(error),'error')}}
  async function editGroup(id){const g=data.groups.find(x=>x.id===id);const name=prompt('Nome/tema do grupo:',g.name);if(name===null)return;const description=prompt('Descrição:',g.description||'');if(description===null)return;try{await rpc('set_group_details',{p_group_id:id,p_name:name,p_description:description});toast('Grupo atualizado.');await load()}catch(error){toast(BioUI.friendlyError(error),'error')}}
  async function reviewAction(button){let message=null;if(button.dataset.reviewAction==='changes_requested'){message=prompt('Explique claramente o que precisa ser corrigido:');if(!message)return}await simpleAction(button,'transition_recipe_review',{p_recipe_id:button.dataset.id,p_action:button.dataset.reviewAction,p_message:message},button.dataset.reviewAction==='approved'?'Receita aprovada.':'Correções solicitadas.')}
  async function commentRecipe(id){const message=prompt('Comentário pedagógico:');if(!message)return;try{await rpc('add_teacher_comment',{p_recipe_id:id,p_message:message});toast('Comentário registrado.');await showReviews(id,true)}catch(error){toast(BioUI.friendlyError(error),'error')}}
  async function showReviews(id,force=false){const box=root.querySelector('#feedback-'+CSS.escape(id));if(!box)return;if(!force){box.hidden=!box.hidden;if(box.hidden)return}box.hidden=false;box.innerHTML='<p>Carregando…</p>';try{const rows=await rpc('get_recipe_reviews',{p_recipe_id:id});box.innerHTML=rows.length?rows.map(r=>`<div class="history-item"><span><strong>${esc(reviewText[r.event_type]||r.event_type)}</strong>${r.message?`<p>${esc(r.message)}</p>`:''}</span><small>${esc(r.author_name)} · ${date(r.created_at)}</small></div>`).join(''):'<p class="muted">Sem feedback registrado.</p>'}catch(error){box.innerHTML=`<p class="error-text">${esc(BioUI.friendlyError(error))}</p>`}}
  async function promoteToTeacher(button){const expected=button.dataset.name;const typed=prompt(`Esta ação dará acesso completo ao painel do professor para ${expected}. Digite o nome exatamente para confirmar:`);if(typed!==expected){if(typed!==null)toast('Confirmação não corresponde ao nome.','error');return}await simpleAction(button,'promote_student_to_teacher',{p_user_id:button.dataset.promoteTeacher},`${expected} agora é professor.`)}
  async function deleteAccount(button){const expected=button.dataset.name;const typed=prompt(`Esta ação exclui a conta de ${expected}. Digite o nome exatamente para confirmar:`);if(typed!==expected){if(typed!==null)toast('Confirmação não corresponde ao nome.','error');return}await simpleAction(button,'delete_student_account',{target_user_id:button.dataset.deleteAccount},'Conta excluída.')}
  async function purgeRecipe(button){const typed=prompt(`Digite EXCLUIR para apagar definitivamente “${button.dataset.name}”:`);if(typed!=='EXCLUIR')return;await simpleAction(button,'purge_recipe',{p_recipe_id:button.dataset.purge},'Receita excluída definitivamente.')}
  function resetAnnouncement(){root.querySelector('#announcement-form').reset();root.querySelector('#announcement-id').value='';root.querySelector('#announcement-title').value='Aviso do professor';root.querySelector('#announcement-published').checked=true}
  function editAnnouncement(id){const a=data.announcements.find(x=>x.id===id);root.querySelector('#announcement-id').value=id;root.querySelector('#announcement-title').value=a.title;root.querySelector('#announcement-message').value=a.message;root.querySelector('#announcement-published').checked=a.is_published;root.querySelector('#announcement-featured').checked=a.is_featured;root.querySelector('#announcement-expires').value=a.expires_at?new Date(a.expires_at).toISOString().slice(0,16):'';root.querySelector('#announcement-title').focus()}
  async function saveAnnouncement(event){event.preventDefault();const button=event.submitter;setBusy(button,true);try{await rpc('save_announcement',{p_id:root.querySelector('#announcement-id').value||null,p_title:root.querySelector('#announcement-title').value,p_message:root.querySelector('#announcement-message').value,p_published:root.querySelector('#announcement-published').checked,p_featured:root.querySelector('#announcement-featured').checked,p_expires_at:root.querySelector('#announcement-expires').value?new Date(root.querySelector('#announcement-expires').value).toISOString():null});toast('Aviso salvo.');await load()}catch(error){toast(BioUI.friendlyError(error),'error');setBusy(button,false)}}
  async function deleteAnnouncement(button){if(!confirm('Mover este aviso para a lixeira interna?'))return;await simpleAction(button,'delete_announcement',{p_id:button.dataset.deleteAnnouncement},'Aviso removido.')}
  async function loadHistory(offset){historyOffset=offset;const box=root.querySelector('#history-list');box.innerHTML='<div class="loading-state">Carregando histórico…</div>';try{const rows=await rpc('get_activity_history',{p_group_id:root.querySelector('#history-group').value||null,p_action:root.querySelector('#history-action').value||null,p_offset:offset,p_limit:25});box.innerHTML=historyList(rows);root.querySelector('[data-action="history-prev"]').disabled=offset===0;root.querySelector('[data-action="history-next"]').disabled=rows.length<25}catch(error){box.innerHTML=`<p class="error-text">${esc(BioUI.friendlyError(error))}</p>`}}
  function exportCsv(){
    const rows=[['Nome','Número','Grupo','Tema','Status do grupo','Receitas','Estado de revisão','Checklist']];
    data.profiles.filter(p=>p.role==='student').forEach(p=>{const g=data.groups.find(x=>x.id===p.group_id),recipes=data.recipes.filter(r=>r.group_id===p.group_id),items=g?data.checklist.filter(i=>i.group_id===g.id):[];rows.push([p.full_name,p.call_number??'',g?.name||'',g?.description||'',g?statusText[g.activity_status]:'',recipes.map(r=>r.title).join(' | '),recipes.map(r=>reviewText[r.review_status]).join(' | '),g?`${items.filter(i=>checklistState(g,i)).length}/${items.length}`:''])});
    const csv='\ufeff'+rows.map(row=>row.map(value=>`"${String(value??'').replace(/"/g,'""')}"`).join(';')).join('\r\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`atividade-biologia-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);toast('CSV exportado.')
  }
  load(false);
})();
