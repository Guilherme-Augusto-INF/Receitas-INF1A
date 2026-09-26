(()=>{
  const groupsRoot=document.querySelector('#groups');
  const progressRoot=document.querySelector('#class-progress');
  const nav=document.querySelector('#nav');
  const account=document.querySelector('#account');
  const lastUpdate=document.querySelector('#last-update');
  const labels={
    not_started:['⚪','Não iniciado'],
    in_progress:['🔵','Em andamento'],
    review:['🟡','Em revisão'],
    completed:['🟢','Finalizado']
  };
  let loading=false,refreshTimer=null,lastLoadedAt=0;
  // Carrega uma unica vez o carrossel visual sem introduzir HTML ou CSS estatico.
  const carouselUrl=new URL('home-carousel.js?v=4.11.0',document.currentScript?.src||new URL('public/home.js',location.href)).href;
  let carousel=null,carouselData=null;
  function mountCarousel(){
    const loader=document.createElement('script');
    loader.src=carouselUrl;
    loader.async=true;
    loader.addEventListener('load',()=>{
      carousel=window.BioHomeCarousel?.mount(document.querySelector('main .hero'))||null;
      if(carouselData?.length)carousel?.updateGroups(carouselData);
    });
    loader.addEventListener('error',()=>console.warn('Nao foi possivel carregar o carrossel de Biologia.'));
    document.head.append(loader);
  }

  function element(tag,className,text){
    const node=document.createElement(tag);
    if(className)node.className=className;
    if(text!==undefined)node.textContent=text;
    return node;
  }
  function renderProgress(data){
    const counts={not_started:0,in_progress:0,review:0,completed:0};
    data.forEach(group=>{if(group.activity_status in counts)counts[group.activity_status]+=1});
    const fragment=document.createDocumentFragment();
    Object.entries(labels).forEach(([key,[icon,label]])=>{
      const item=element('div','progress-item');
      const iconNode=element('span','',icon);iconNode.setAttribute('aria-hidden','true');
      item.append(iconNode,element('strong','',String(counts[key])),element('small','',label));
      fragment.append(item);
    });
    progressRoot.replaceChildren(fragment);
  }
  function renderGroups(data){
    if(!data.length){
      groupsRoot.innerHTML='<div class="panel empty-state"><strong>Nenhum grupo cadastrado.</strong></div>';
      return;
    }
    const fragment=document.createDocumentFragment();
    data.forEach(group=>{
      const article=element('article','card group-card reveal');
      const top=element('div','group-card-top');
      top.append(element('p','muted',String(group.slug).replace('-',' ').toUpperCase()));
      const status=element('span','status-pill status-'+group.activity_status,`${labels[group.activity_status]?.[0]||'⚪'} ${labels[group.activity_status]?.[1]||'Não iniciado'}`);
      top.append(status);
      const title=element('h2','',String(group.name).replace(/^Grupo \d+ — /,''));
      const description=element('p','muted',group.description||'Tema da atividade');
      const stats=element('div','mini-stats');
      stats.append(element('span','',`Integrantes: ${group.member_count}`),element('span','',`Receitas: ${group.recipe_count}`));
      const link=element('a','btn secondary','Ver grupo');
      link.href='grupo/?slug='+encodeURIComponent(group.slug);
      link.setAttribute('aria-label',`Abrir ${group.name}`);
      article.append(top,title,description,stats,link);
      fragment.append(article);
    });
    groupsRoot.replaceChildren(fragment);
    window.BioEffects?.observe();
  }
  function renderError(error){
    groupsRoot.innerHTML='<div class="panel error-state"><strong>Não foi possível carregar os grupos.</strong><p>'+BioUI.escape(BioUI.friendlyError(error))+'</p><button class="btn" id="retry-groups">Tentar novamente</button></div>';
    progressRoot.innerHTML='<p class="muted">O acompanhamento está temporariamente indisponível.</p>';
    document.querySelector('#retry-groups')?.addEventListener('click',render);
    lastUpdate.textContent='Falha na atualização';
  }
  async function render(){
    if(loading)return;
    loading=true;
    try{
      const result=await BioUI.withTimeout(sb.rpc('get_group_overview'));
      if(result.error)throw result.error;
      const data=result.data||[];
      renderProgress(data);renderGroups(data);
      carouselData=data;carousel?.updateGroups(data);
      lastLoadedAt=Date.now();
      lastUpdate.textContent='Atualizado às '+new Intl.DateTimeFormat('pt-BR',{
        timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false
      }).format(new Date());
    }catch(error){renderError(error)}finally{loading=false}
  }
  async function renderAccount(){
    const current=await BioAuth.profile();
    nav.replaceChildren();
    if(!current.user){
      const login=element('a','btn','Entrar');login.href='login/';nav.append(login);return;
    }
    const profile=element('a','btn secondary','Perfil');profile.href='perfil/';nav.append(profile);
    if(current.profile?.role==='teacher'){
      const teacher=element('a','btn secondary','Painel');teacher.href='professor/';nav.append(teacher);
    }
    if(current.profile?.is_anonymous){
      account.innerHTML='<div class="note"><strong>Acesso anônimo</strong><p>Você pode consultar grupos e receitas. Para editar, entre com uma conta cadastrada e organizada pelo professor.</p></div>';
    }
  }
  function scheduleRefresh(){
    clearTimeout(refreshTimer);
    refreshTimer=setTimeout(render,400);
  }
  document.addEventListener('classroom:offline',()=>{lastUpdate.textContent='Reconectando…'});
  Classroom.subscribe('home',[
    {table:'groups'},
    {table:'recipes'},
    {table:'profiles'},
    {table:'announcements'}
  ],({table})=>{if(table!=='announcements')scheduleRefresh()});
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden&&Date.now()-lastLoadedAt>30000)scheduleRefresh();
  });
  mountCarousel();renderAccount();render();
})();
