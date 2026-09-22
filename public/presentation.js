(()=>{
  const root=document.querySelector('#presentation-app');
  const labels={not_started:'Não iniciado',in_progress:'Em andamento',review:'Em revisão',completed:'Finalizado'};
  const esc=BioUI.escape;
  let loading=false;
  async function load(){
    if(loading)return;loading=true;
    try{
      const result=await BioUI.withTimeout(sb.rpc('get_public_classroom_state'));
      if(result.error)throw result.error;
      const state=result.data||{};document.querySelector('#presentation-title').textContent=state.settings?.activity_name||'Atividade Prática de Biologia';
      root.className='';root.innerHTML=`${state.announcement?`<section class="presentation-announcement"><strong>${esc(state.announcement.title)}</strong> — ${esc(state.announcement.message)}</section>`:''}<section class="presentation-groups">${(state.groups||[]).map(group=>`<article class="presentation-card"><span class="status-pill status-${group.status}">${labels[group.status]||group.status}</span><h2>${esc(group.name)}</h2><p>${esc(group.description||'')}</p><div class="mini-stats"><span>${group.members} integrante(s)</span><span>${group.recipes} receita(s)</span></div><progress max="${group.check_total||1}" value="${group.check_done||0}">${group.check_done}/${group.check_total}</progress><p><strong>${group.check_done}/${group.check_total}</strong> itens concluídos</p></article>`).join('')}</section>`;
    }catch(error){root.className='error-state';root.innerHTML=`<strong>Não foi possível atualizar.</strong><p>${esc(BioUI.friendlyError(error))}</p>`}finally{loading=false}
  }
  let refreshTimer=null;
  Classroom.subscribe('presentation',[
    {table:'groups'},
    {table:'recipes'},
    {table:'profiles'},
    {table:'classroom_settings',filter:'id=eq.1'},
    {table:'announcements'}
  ],()=>{clearTimeout(refreshTimer);refreshTimer=setTimeout(load,500)});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)load()});
  setInterval(()=>{if(!document.hidden)load()},30000);load();
})();
