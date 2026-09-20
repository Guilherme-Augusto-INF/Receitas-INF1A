(()=>{
  const root=document.querySelector('#teacher-app');
  if(!root)return;
  const esc=BioUI.escape;
  const statusLabel={not_started:'⚪ Não iniciado',in_progress:'🔵 Em andamento',review:'🟡 Em revisão',completed:'🟢 Finalizado'};
  const historyLabel={status_changed:'Status alterado',recipe_created:'Receita criada',recipe_updated:'Receita atualizada',recipe_deleted:'Receita excluída',recipe_locked:'Receita bloqueada',recipe_unlocked:'Receita reaberta',photo_changed:'Foto alterada'};
  let groups=[],profiles=[],overview=[],currentUser=null;

  async function load(){
    root.innerHTML='<section class="panel loading-state">Carregando painel…</section>';
    try{
      const me=await BioAuth.profile();
      if(!me.user){location.href='../login/';return}
      currentUser=me.user.id;
      if(me.error||me.profile?.role!=='teacher'||me.profile?.is_anonymous){
        root.innerHTML='<section class="panel error-state"><h2>Acesso negado</h2><p>Esta área é exclusiva para professores autorizados.</p><a class="btn secondary" href="../">Voltar ao início</a></section>';return;
      }
      const[groupResult,profileResult,overviewResult,settingsResult]=await Promise.all([
        BioUI.withTimeout(sb.from('groups').select('id,name,slug,description,activity_status,photo_url').order('slug')),
        BioUI.withTimeout(sb.from('profiles').select('id,full_name,role,group_id,is_anonymous,call_number').eq('is_anonymous',false).order('full_name')),
        BioUI.withTimeout(sb.rpc('get_group_overview')),
        BioUI.withTimeout(sb.from('classroom_settings').select('announcement').eq('id',1).maybeSingle())
      ]);
      const error=groupResult.error||profileResult.error||overviewResult.error||settingsResult.error;
      if(error)throw error;
      groups=groupResult.data||[];profiles=profileResult.data||[];overview=overviewResult.data||[];
      render(settingsResult.data?.announcement||'');
    }catch(error){
      root.innerHTML='<section class="panel error-state"><strong>Não foi possível carregar o painel.</strong><p>'+esc(BioUI.friendlyError(error))+'</p><button id="retry" class="btn">Tentar novamente</button></section>';
      document.querySelector('#retry')?.addEventListener('click',load);
    }
  }

  function render(announcement){
    const counts={not_started:0,in_progress:0,review:0,completed:0};
    overview.forEach(group=>{if(group.activity_status in counts)counts[group.activity_status]+=1});
    root.innerHTML=`
      <nav class="panel teacher-nav" aria-label="Seções do painel"><a href="#turma">Turma</a><a href="#grupos">Grupos</a><a href="#usuarios">Usuários</a><a href="#avisos">Avisos</a></nav>
      <section id="turma" class="dashboard-hero panel reveal is-visible"><div><p class="eyebrow">TURMA</p><h2>Visão geral</h2><p class="muted">Acompanhe a atividade sem abrir cada grupo.</p></div><div class="class-clock"><small>Horário de Brasília</small><strong data-brasilia-clock>--:--:--</strong></div></section>
      <section class="stats-grid" aria-label="Resumo dos status">${Object.entries(counts).map(([key,value])=>`<div class="stat-card"><strong>${value}</strong><small>${statusLabel[key]}</small></div>`).join('')}</section>
      <section id="avisos" class="panel reveal"><p class="eyebrow">AVISOS</p><h2>Comunicação da aula</h2><label class="sr-only" for="announcement">Aviso para a turma</label><textarea id="announcement" class="classroom-textarea" maxlength="1000" placeholder="Ex.: Todos os grupos devem finalizar até 16h30.">${esc(announcement)}</textarea><div class="actions"><button id="publishAnnouncement" class="btn" type="button">Publicar aviso</button><button id="clearAnnouncement" class="btn secondary" type="button">Limpar</button></div><p id="announcementMsg" class="form-message" role="status"></p></section>
      <section id="grupos" class="panel reveal"><p class="eyebrow">GRUPOS</p><h2>Status e trabalhos</h2><div class="group-overview-grid">${overview.map(groupCard).join('')}</div></section>
      <section id="usuarios" class="panel reveal"><p class="eyebrow">USUÁRIOS</p><h2>Organizar aluno ou professor</h2><div class="form-grid"><div class="field"><label for="uid">Usuário</label><select id="uid">${profiles.map(profile=>`<option value="${profile.id}">${esc(profile.full_name||'Usuário sem nome')} — ${profile.role==='teacher'?'Professor':'Aluno'}</option>`).join('')}</select></div><div class="field"><label for="gid">Grupo</label><select id="gid"><option value="">Sem grupo</option>${groups.map(group=>`<option value="${group.id}">${esc(group.name)}</option>`).join('')}</select></div><div class="field"><label for="call">Número da chamada</label><input id="call" type="number" min="1" max="999" inputmode="numeric"></div></div><button id="saveUser" class="btn" type="button">Salvar organização</button><p id="umsg" class="form-message" role="status"></p></section>
      <section class="panel reveal"><p class="eyebrow">CONTROLE DA ATIVIDADE</p><h2>Criar grupo</h2><p class="muted">Use somente se a atividade realmente ganhar um novo grupo.</p><form id="newGroup"><div class="form-grid"><div class="field"><label for="gn">Nome</label><input id="gn" required maxlength="120" placeholder="Grupo 7 — Tema"></div><div class="field"><label for="gs">Endereço curto</label><input id="gs" required pattern="[a-z0-9-]+" maxlength="40" placeholder="grupo-7"></div><div class="field"><label for="gd">Descrição</label><input id="gd" maxlength="500"></div></div><button class="btn" type="submit">Criar grupo</button></form><p id="gmsg" class="form-message" role="status"></p></section>
      <section class="panel reveal"><p class="eyebrow">CONTAS CADASTRADAS</p><h2>Alunos e professores</h2><div id="people"></div></section>`;
    bind();renderPeople();Classroom?.startClock();BioEffects?.observe();
  }

  function groupCard(group){
    const photo=BioUI.photoUrl(group.photo_url);
    return `<article class="overview-card"><div class="overview-main"><div class="section-head"><h3>${esc(group.name)}</h3><span class="status-pill status-${group.activity_status}">${statusLabel[group.activity_status]}</span></div><p class="muted">${esc(group.description||'Sem descrição')}</p><div class="mini-stats"><span>Integrantes: ${group.member_count}</span><span>Receitas: ${group.recipe_count}</span></div><div class="actions"><label class="sr-only" for="status-${group.group_id}">Status de ${esc(group.name)}</label><select id="status-${group.group_id}" class="status-select" data-id="${group.group_id}">${Object.entries(statusLabel).map(([key,label])=>`<option value="${key}" ${key===group.activity_status?'selected':''}>${label}</option>`).join('')}</select><a class="btn secondary" href="../${encodeURIComponent(group.slug)}/">Abrir</a><button class="btn secondary history" data-id="${group.group_id}" type="button">Histórico</button></div><div class="photo-actions"><label class="sr-only" for="photo-${group.group_id}">Foto de ${esc(group.name)}</label><input id="photo-${group.group_id}" type="file" accept="image/jpeg,image/png,image/webp" class="photo-file" data-id="${group.group_id}"><button class="btn secondary photo-upload" data-id="${group.group_id}" type="button">${photo?'Trocar foto':'Enviar foto'}</button></div><div class="history-box" id="history-${group.group_id}" hidden></div></div></article>`;
  }

  function renderPeople(){
    const people=document.querySelector('#people');
    if(!profiles.length){people.innerHTML='<div class="empty-state">Nenhum usuário cadastrado.</div>';return}
    people.innerHTML='<div class="table-wrap"><table class="table"><thead><tr><th>Nome</th><th>Nº</th><th>Função</th><th>Grupo</th><th>Ações</th></tr></thead><tbody>'+profiles.map(profile=>{
      const group=groups.find(item=>item.id===profile.group_id);const self=profile.id===currentUser;const teacher=profile.role==='teacher';
      return `<tr><td>${esc(profile.full_name||'Sem nome')}</td><td>${profile.call_number??'—'}</td><td>${teacher?'Professor':'Aluno'}</td><td>${esc(group?.name||'Sem grupo')}</td><td>${self?'<span class="muted">Sua conta</span>':`<button class="btn secondary role" data-id="${profile.id}" data-role="${teacher?'student':'teacher'}" type="button">${teacher?'Tornar aluno':'Tornar professor'}</button>${teacher?'':` <button class="btn danger delete-account" data-id="${profile.id}" data-name="${esc(profile.full_name||'este aluno')}" type="button">Excluir conta</button>`}`}</td></tr>`;
    }).join('')+'</tbody></table></div>';
    document.querySelectorAll('.delete-account').forEach(button=>button.addEventListener('click',()=>deleteAccount(button)));
    document.querySelectorAll('.role').forEach(button=>button.addEventListener('click',()=>changeRole(button)));
  }

  function bind(){
    const user=document.querySelector('#uid'),group=document.querySelector('#gid'),call=document.querySelector('#call');
    const sync=()=>{const profile=profiles.find(item=>item.id===user.value);group.value=profile?.group_id||'';call.value=profile?.call_number??''};
    user.addEventListener('change',sync);sync();
    document.querySelector('#saveUser').addEventListener('click',event=>saveUser(event.currentTarget,user,group,call));
    document.querySelector('#newGroup').addEventListener('submit',createGroup);
    document.querySelector('#publishAnnouncement').addEventListener('click',event=>publishAnnouncement(event.currentTarget,false));
    document.querySelector('#clearAnnouncement').addEventListener('click',event=>publishAnnouncement(event.currentTarget,true));
    document.querySelectorAll('.status-select').forEach(select=>select.addEventListener('change',()=>changeStatus(select)));
    document.querySelectorAll('.history').forEach(button=>button.addEventListener('click',()=>toggleHistory(button)));
    document.querySelectorAll('.photo-upload').forEach(button=>button.addEventListener('click',()=>uploadPhoto(button)));
  }

  async function saveUser(button,user,group,call){
    const message=document.querySelector('#umsg');const raw=call.value.trim();const number=raw?Number(raw):null;
    if(number!==null&&(!Number.isInteger(number)||number<1||number>999)){message.textContent='Digite um número entre 1 e 999.';message.className='form-message error-text';return}
    button.disabled=true;message.textContent='Salvando…';message.className='form-message';
    try{const result=await BioUI.withTimeout(sb.rpc('manage_profile_classroom',{target_user_id:user.value,new_group_id:group.value||null,new_call_number:number}));if(result.error)throw result.error;message.textContent='Dados salvos.';message.className='form-message success-text';await load()}
    catch(error){message.textContent=BioUI.friendlyError(error);message.className='form-message error-text';button.disabled=false}
  }
  async function createGroup(event){
    event.preventDefault();const button=event.submitter;const message=document.querySelector('#gmsg');button.disabled=true;
    try{const result=await BioUI.withTimeout(sb.from('groups').insert({name:document.querySelector('#gn').value.trim(),slug:document.querySelector('#gs').value.trim(),description:document.querySelector('#gd').value.trim()}));if(result.error)throw result.error;await load()}
    catch(error){message.textContent=BioUI.friendlyError(error);message.className='form-message error-text';button.disabled=false}
  }
  async function publishAnnouncement(button,clear){
    const field=document.querySelector('#announcement');const message=document.querySelector('#announcementMsg');if(clear)field.value='';button.disabled=true;
    try{const result=await BioUI.withTimeout(sb.rpc('set_announcement',{new_announcement:field.value}));if(result.error)throw result.error;message.textContent=clear?'Aviso removido.':'Aviso publicado para a turma.';message.className='form-message success-text'}
    catch(error){message.textContent=BioUI.friendlyError(error);message.className='form-message error-text'}finally{button.disabled=false}
  }
  async function changeStatus(select){
    select.disabled=true;
    try{const result=await BioUI.withTimeout(sb.rpc('set_group_status',{target_group_id:select.dataset.id,new_status:select.value}));if(result.error)throw result.error;await load()}
    catch(error){alert(BioUI.friendlyError(error));select.disabled=false}
  }
  async function toggleHistory(button){
    const box=document.querySelector('#history-'+button.dataset.id);box.hidden=!box.hidden;if(box.hidden)return;box.innerHTML='<p>Carregando histórico…</p>';
    try{const result=await BioUI.withTimeout(sb.rpc('get_group_history',{target_group_id:button.dataset.id}));if(result.error)throw result.error;box.innerHTML=result.data?.length?result.data.map(item=>`<div class="history-item"><strong>${esc(historyLabel[item.action]||item.action)}</strong><small>${new Date(item.created_at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}</small></div>`).join(''):'<p class="muted">Nenhuma alteração registrada.</p>'}
    catch(error){box.innerHTML='<p class="error-text">'+esc(BioUI.friendlyError(error))+'</p>'}
  }
  async function uploadPhoto(button){
    const input=document.querySelector(`.photo-file[data-id="${button.dataset.id}"]`);const file=input.files[0];const allowed=['image/jpeg','image/png','image/webp'];
    if(!file){alert('Escolha uma imagem primeiro.');return}if(!allowed.includes(file.type)){alert('Use uma imagem JPG, PNG ou WebP.');return}if(file.size>5*1024*1024){alert('A imagem deve ter no máximo 5 MB.');return}
    const ext={"image/jpeg":'jpg',"image/png":'png',"image/webp":'webp'}[file.type];const path=`${button.dataset.id}/${Date.now()}.${ext}`;button.disabled=true;button.textContent='Enviando…';
    try{const upload=await BioUI.withTimeout(sb.storage.from('activity-photos').upload(path,file,{upsert:false,contentType:file.type}));if(upload.error)throw upload.error;const url=sb.storage.from('activity-photos').getPublicUrl(path).data.publicUrl;const result=await BioUI.withTimeout(sb.rpc('set_group_photo',{target_group_id:button.dataset.id,new_photo_url:url}));if(result.error){await sb.storage.from('activity-photos').remove([path]);throw result.error}await load()}
    catch(error){alert(BioUI.friendlyError(error));button.disabled=false;button.textContent='Enviar foto'}
  }
  async function changeRole(button){
    const label=button.dataset.role==='teacher'?'tornar este usuário professor':'tornar este professor aluno';if(!confirm(`Confirma ${label}?`))return;button.disabled=true;
    try{const result=await BioUI.withTimeout(sb.rpc('set_user_role_classroom',{target_user_id:button.dataset.id,new_role:button.dataset.role}));if(result.error)throw result.error;await load()}
    catch(error){alert(BioUI.friendlyError(error));button.disabled=false}
  }
  async function deleteAccount(button){
    if(!confirm(`Excluir permanentemente a conta de ${button.dataset.name}? Esta ação não pode ser desfeita.`))return;button.disabled=true;
    try{const result=await BioUI.withTimeout(sb.rpc('delete_student_account',{target_user_id:button.dataset.id}));if(result.error)throw result.error;await load()}
    catch(error){alert(BioUI.friendlyError(error));button.disabled=false}
  }
  load();
})();
