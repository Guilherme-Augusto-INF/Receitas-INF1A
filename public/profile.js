(()=>{
  const root=document.querySelector('#profile-app');
  if(!root)return;
  const esc=BioUI.escape;
  async function load(){
    root.innerHTML='<section class="panel loading-state">Carregando perfil…</section>';
    const me=await BioAuth.profile();
    if(!me.user){location.href='../login/';return}
    if(me.error||!me.profile){
      root.innerHTML='<section class="panel error-state"><strong>Não foi possível carregar seu perfil.</strong><p>'+esc(BioUI.friendlyError(me.error,'Seu perfil ainda não está disponível.'))+'</p><button class="btn" id="retry">Tentar novamente</button></section>';
      document.querySelector('#retry')?.addEventListener('click',load);return;
    }
    let group=null;
    if(me.profile.group_id){
      try{
        const result=await BioUI.withTimeout(sb.from('groups').select('name,slug').eq('id',me.profile.group_id).maybeSingle());
        if(!result.error)group=result.data;
      }catch{}
    }
    const profile=me.profile;
    const editable=!profile.is_anonymous;
    root.innerHTML=`<section class="panel reveal is-visible"><p class="eyebrow">MINHA CONTA</p><h2>Dados do perfil</h2>
      ${profile.is_anonymous?'<div class="note"><strong>Acesso anônimo</strong><p>Esta conta serve apenas para consulta e não aparece na organização da turma.</p></div>':''}
      <div class="field"><label for="name">Nome completo</label><input id="name" autocomplete="name" maxlength="120" value="${esc(profile.full_name||'')}" placeholder="Seu nome completo" ${editable?'':'readonly'}></div>
      <div class="field"><label for="call">Número da chamada</label><input id="call" type="number" min="1" max="999" inputmode="numeric" value="${profile.call_number??''}" placeholder="Ex.: 12" ${editable?'':'readonly'}><small class="muted">O número precisa ser único dentro do seu grupo.</small></div>
      <div class="field"><label for="account-email">E-mail</label><input id="account-email" readonly value="${esc(me.user.email||'Conta anônima')}"></div>
      <dl class="profile-summary"><div><dt>Função</dt><dd>${profile.role==='teacher'?'Professor':'Aluno'}</dd></div><div><dt>Grupo</dt><dd>${esc(group?.name||'Ainda não organizado')}</dd></div></dl>
      ${group?.slug?`<p><a class="btn secondary" href="../${encodeURIComponent(group.slug)}/">Abrir meu grupo</a></p>`:''}
      ${editable?'<button id="save" class="btn" type="button">Salvar alterações</button>':''}
      <p id="msg" class="form-message" role="status" aria-live="polite"></p>
      <div class="logout-wrap"><button id="logout" class="btn danger" type="button">Sair da conta</button></div></section>`;
    document.querySelector('#save')?.addEventListener('click',()=>save(me.user.id));
    document.querySelector('#logout').addEventListener('click',()=>BioAuth.signOut());
  }
  async function save(){
    const button=document.querySelector('#save');const message=document.querySelector('#msg');
    const name=document.querySelector('#name').value.trim();const raw=document.querySelector('#call').value.trim();const call=raw?Number(raw):null;
    if(!name){message.textContent='Digite seu nome.';message.className='form-message error-text';return}
    if(name.length>120){message.textContent='O nome deve ter no máximo 120 caracteres.';message.className='form-message error-text';return}
    if(call!==null&&(!Number.isInteger(call)||call<1||call>999)){message.textContent='Digite um número entre 1 e 999.';message.className='form-message error-text';return}
    button.disabled=true;button.textContent='Salvando…';message.textContent='Salvando…';message.className='form-message';
    try{
      const result=await BioUI.withTimeout(sb.rpc('update_my_profile',{new_name:name,new_call_number:call}));
      if(result.error)throw result.error;
      message.textContent='Alterações salvas com sucesso.';message.className='form-message success-text';button.textContent='Salvo';
      setTimeout(()=>{button.disabled=false;button.textContent='Salvar alterações'},1000);
    }catch(error){message.textContent=BioUI.friendlyError(error);message.className='form-message error-text';button.disabled=false;button.textContent='Salvar alterações'}
  }
  load();
})();
