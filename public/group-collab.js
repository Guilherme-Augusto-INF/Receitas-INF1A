(()=>{
  'use strict';
  let context=null,phrases=[];
  const esc=value=>BioUI.escape(String(value??''));
  const root=()=>document.querySelector('#group-app');
  const safeUrl=value=>{
    try{
      const url=new URL(value);
      return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password?url.href:null;
    }catch{return null}
  };
  const editable=()=>{
    const {group,profile,settings}=context||{};
    return profile&&!profile.is_anonymous&&(profile.role==='teacher'||
      (profile.group_id===group?.id&&group.activity_status!=='completed'&&!settings.edits_locked&&!settings.activity_finalized));
  };
  const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();

  function formSection(){
    const {group}=context;
    const url=safeUrl(group.form_url),published=Boolean(url&&group.form_text);
    return `<section class="panel reveal" id="form-editor">
      <p class="eyebrow">FORMULÁRIO DO TEMA</p>
      <div class="section-head"><div><h2>Texto e link do questionário</h2>
        <p class="muted">Após o cadastro, o formulário deste grupo fica disponível para toda a turma.</p></div>
        <span class="status-pill ${published?'status-review':'status-not_started'}">${published?'Disponível':'Aguardando'}</span></div>
      ${published?`<div class="form-publication"><p>${esc(group.form_text).replace(/\n/g,'<br>')}</p>
        <a class="btn" href="${esc(url)}" rel="noopener noreferrer" target="_blank">Abrir formulário</a></div>`:
        '<p class="muted">O grupo ainda não cadastrou o texto e o link deste formulário.</p>'}
      ${editable()?`<details class="group-form-details" ${published?'':'open'}>
        <summary>${published?'Editar texto ou link':'Cadastrar texto e link'}</summary>
        <form class="form-stack" id="group-form-editor">
          <div class="field"><label for="form-text">Texto/orientações do questionário</label>
            <textarea id="form-text" required maxlength="3000" rows="4" placeholder="Escreva as orientações e o texto do questionário.">${esc(group.form_text||'')}</textarea></div>
          <div class="field"><label for="form-url">Link do formulário (Forms)</label>
            <input id="form-url" required type="url" maxlength="2048" placeholder="https://forms.gle/..." value="${esc(group.form_url||'')}"></div>
          <div class="actions"><button type="submit" id="save-group-form" class="btn">Salvar e publicar</button>
            ${published?'<button id="remove-group-form" type="button" class="btn secondary">Remover formulário</button>':''}</div>
          <p class="form-message" id="form-message" role="status" aria-live="polite"></p>
        </form>
      </details>`:''}
    </section>`;
  }

  function phraseSection(){
    return `<section class="panel reveal" id="class-phrases">
      <p class="eyebrow">ORGANIZAÇÃO DA TURMA</p><h2>Frases dos grupos</h2>
      <p class="muted">Antes de escolher uma frase, confira o que os outros grupos já cadastraram. Frases repetidas não são aceitas.</p>
      ${editable()?`<form id="phrase-form" class="phrase-form">
        <label for="new-phrase">Cadastrar frase para o nosso grupo</label>
        <div class="phrase-input-row"><input id="new-phrase" type="text" minlength="3" maxlength="240" required
          autocomplete="off" placeholder="Escreva uma frase diferente das demais">
          <button id="save-phrase" type="submit" class="btn">Adicionar frase</button></div>
        <small class="muted">Limite de 30 frases por grupo. Integrantes podem remover frases do próprio grupo enquanto a atividade estiver aberta.</small>
      </form>`:''}
      <p class="form-message" id="phrase-message" role="status" aria-live="polite"></p>
      <div class="field"><label for="phrase-search">Pesquisar frases de todos os grupos</label>
        <input id="phrase-search" type="search" placeholder="Pesquisar por frase ou grupo"></div>
      <p class="muted" id="phrase-summary">Carregando frases da turma…</p>
      <ul id="phrase-list" class="phrase-list" aria-live="polite"></ul>
    </section>`;
  }

  function panels({group,profile,settings}){
    context={group,profile,settings};
    return formSection()+phraseSection();
  }

  function renderPhrases(){
    const list=root()?.querySelector('#phrase-list'),summary=root()?.querySelector('#phrase-summary');
    if(!list||!summary)return;
    const term=normalize(root().querySelector('#phrase-search')?.value);
    const shown=phrases.filter(item=>normalize(item.phrase+' '+(item.group?.name||'')).includes(term));
    summary.textContent=`${phrases.length} frase(s) cadastrada(s) · ${shown.length} exibida(s)`;
    list.innerHTML=shown.length?shown.map(item=>{
      const canRemove=editable()&&(context.profile.role==='teacher'||item.group_id===context.group.id);
      return `<li class="phrase-item"><div><strong>${esc(item.phrase)}</strong>
        <small>${esc(item.group?.name||'Grupo')}${item.group_id===context.group.id?' · grupo desta página':''}</small></div>
        ${canRemove?`<button class="btn secondary" type="button" data-remove-phrase="${esc(item.id)}" aria-label="Remover frase: ${esc(item.phrase)}">Remover</button>`:''}</li>`;
    }).join(''):'<li class="muted">Nenhuma frase encontrada.</li>';
  }

  async function refreshPhrases(){
    const summary=root()?.querySelector('#phrase-summary');
    if(!summary)return;
    try{
      const result=await BioUI.withTimeout(sb.from('group_phrases')
        .select('id,group_id,phrase,created_at,group:groups(name)')
        .order('created_at',{ascending:false}));
      if(result.error)throw result.error;
      phrases=result.data||[];
      renderPhrases();
    }catch(error){
      const notice=root()?.querySelector('#phrase-message');
      if(notice){notice.textContent=BioUI.friendlyError(error,'Falha ao carregar as frases.');notice.className='form-message error-text'}
      if(summary)summary.textContent='Não foi possível atualizar as frases. Recarregue a página e tente novamente.';
    }
  }

  async function saveForm(event,remove=false){
    event?.preventDefault();
    if(!editable())return;
    const notice=root().querySelector('#form-message');
    const text=remove?'':root().querySelector('#form-text').value.trim();
    const link=remove?'':root().querySelector('#form-url').value.trim();
    if(!remove&&(!text||!link||!safeUrl(link))){
      notice.textContent='Preencha o texto e um link HTTP(S) válido.';
      notice.className='form-message error-text';return;
    }
    if(remove&&!confirm('Remover o texto e o link do formulário deste grupo?'))return;
    const button=root().querySelector(remove?'#remove-group-form':'#save-group-form');
    button.disabled=true;notice.textContent='Salvando…';notice.className='form-message';
    try{
      const result=await BioUI.withTimeout(sb.rpc('set_group_form',{
        p_group_id:context.group.id,p_form_text:text,p_form_url:link
      }));
      if(result.error)throw result.error;
      context.group=result.data;
      const section=root().querySelector('#form-editor');
      section.outerHTML=formSection();
      bindForm();
      const updated=root().querySelector('#form-editor');
      updated.querySelector('.section-head').insertAdjacentHTML('afterend',
        '<p class="success-text" role="status">Formulário atualizado com sucesso.</p>');
    }catch(error){
      notice.textContent=BioUI.friendlyError(error);notice.className='form-message error-text';
      button.disabled=false;
    }
  }

  function bindForm(){
    root()?.querySelector('#group-form-editor')?.addEventListener('submit',event=>saveForm(event));
    root()?.querySelector('#remove-group-form')?.addEventListener('click',event=>saveForm(event,true));
  }

  async function savePhrase(event){
    event.preventDefault();
    if(!editable())return;
    const input=root().querySelector('#new-phrase'),button=root().querySelector('#save-phrase');
    const notice=root().querySelector('#phrase-message'),phrase=input.value.trim();
    if(phrase.length<3)return;
    button.disabled=true;notice.textContent='Cadastrando…';notice.className='form-message';
    try{
      const result=await BioUI.withTimeout(sb.rpc('add_group_phrase',{
        p_group_id:context.group.id,p_phrase:phrase
      }));
      if(result.error)throw result.error;
      input.value='';notice.textContent='Frase cadastrada e compartilhada com a turma.';
      notice.className='form-message success-text';
      await refreshPhrases();
    }catch(error){
      notice.textContent=BioUI.friendlyError(error);notice.className='form-message error-text';
    }finally{button.disabled=false}
  }

  async function removePhrase(button){
    const id=button.dataset.removePhrase;
    if(!editable()||!phrases.some(p=>p.id===id&&(context.profile.role==='teacher'||p.group_id===context.group.id)))return;
    if(!confirm('Remover esta frase da lista compartilhada?'))return;
    const notice=root().querySelector('#phrase-message');
    button.disabled=true;
    try{
      const result=await BioUI.withTimeout(sb.rpc('remove_group_phrase',{p_phrase_id:id}));
      if(result.error)throw result.error;
      notice.textContent='Frase removida.';notice.className='form-message success-text';
      await refreshPhrases();
    }catch(error){
      notice.textContent=BioUI.friendlyError(error);notice.className='form-message error-text';
      button.disabled=false;
    }
  }

  function mount({group,profile,settings}){
    context={group,profile,settings};
    bindForm();
    root()?.querySelector('#phrase-form')?.addEventListener('submit',savePhrase);
    root()?.querySelector('#phrase-search')?.addEventListener('input',renderPhrases);
    root()?.querySelector('#phrase-list')?.addEventListener('click',event=>{
      const button=event.target.closest('[data-remove-phrase]');
      if(button)removePhrase(button);
    });
    if(phrases.length)renderPhrases();
    refreshPhrases();
  }

  window.GroupCollab={panels,mount,refreshPhrases};
})();
