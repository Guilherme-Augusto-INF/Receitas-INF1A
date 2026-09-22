(()=>{
  let clockTimer=null;
  const channels=new Map();
  const subscriptions=new Map();

  function startClock(){
    if(clockTimer)return;
    const formatter=new Intl.DateTimeFormat('pt-BR',{
      timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false
    });
    const update=()=>document.querySelectorAll('[data-brasilia-clock]').forEach(element=>{
      element.textContent=formatter.format(new Date());
    });
    update();clockTimer=setInterval(update,1000);
  }

  function renderAnnouncement(data,target='#class-announcement'){
    const root=document.querySelector(target);
    if(!root)return;
    if(!data?.message){root.replaceChildren();return}
    const box=document.createElement('div');box.className='announcement reveal is-visible';
    const icon=document.createElement('span');icon.className='announcement-icon';icon.setAttribute('aria-hidden','true');icon.textContent='📢';
    const content=document.createElement('div');
    const title=document.createElement('strong');title.textContent=data.title||'Aviso do professor';
    const text=document.createElement('p');text.textContent=data.message;
    const date=document.createElement('small');date.textContent='Atualizado em '+new Date(data.updated_at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'});
    content.append(title,text,date);box.append(icon,content);root.replaceChildren(box);
  }

  async function announcement(target='#class-announcement'){
    const root=document.querySelector(target);
    if(!root)return;
    try{
      const result=await BioUI.withTimeout(
        sb.from('announcements').select('title,message,updated_at').eq('is_published',true).is('deleted_at',null).order('is_featured',{ascending:false}).order('updated_at',{ascending:false}).limit(1).maybeSingle()
      );
      if(result.error)throw result.error;
      renderAnnouncement(result.data,target);
    }catch(error){
      root.innerHTML='<div class="note error">'+BioUI.escape(BioUI.friendlyError(error,'Não foi possível carregar o aviso.'))+'</div>';
    }
  }

  function connect(name,specs,onChange){
    if(channels.has(name))return channels.get(name);
    let channel=sb.channel('classroom-'+name);
    specs.forEach(spec=>{
      const config={event:spec.event||'*',schema:'public',table:spec.table};
      if(spec.filter)config.filter=spec.filter;
      channel=channel.on('postgres_changes',config,payload=>{
        if(spec.table==='announcements')announcement();
        onChange?.({table:spec.table,payload});
      });
    });
    channel.subscribe(status=>{
      if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')document.dispatchEvent(new CustomEvent('classroom:offline'));
    });
    channels.set(name,channel);
    return channel;
  }

  function subscribe(name,specs,onChange){
    subscriptions.set(name,{specs,onChange});
    return connect(name,specs,onChange);
  }

  function unsubscribe(name){
    const channel=channels.get(name);
    subscriptions.delete(name);
    if(channel){channels.delete(name);sb.removeChannel(channel)}
  }

  function cleanup(){
    channels.forEach(channel=>sb.removeChannel(channel));channels.clear();
    if(clockTimer){clearInterval(clockTimer);clockTimer=null}
  }

  function restore(){
    startClock();subscriptions.forEach(({specs,onChange},name)=>connect(name,specs,onChange));
  }

  function init(){startClock();if(!document.body.dataset.groupSlug)announcement();window.BioEffects?.observe()}
  window.Classroom={startClock,announcement,renderAnnouncement,subscribe,unsubscribe};
  window.addEventListener('pagehide',cleanup);
  window.addEventListener('pageshow',event=>{if(event.persisted)restore()});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden&&clockTimer){clearInterval(clockTimer);clockTimer=null}
    else if(!document.hidden)startClock();
  });
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init,{once:true}):init();
})();
