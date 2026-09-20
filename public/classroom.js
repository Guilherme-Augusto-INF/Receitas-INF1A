(()=>{
  let clockTimer=null;
  let realtimeChannel=null;
  function startClock(){
    if(clockTimer)return;
    const update=()=>document.querySelectorAll('[data-brasilia-clock]').forEach(element=>{
      element.textContent=new Intl.DateTimeFormat('pt-BR',{
        timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false
      }).format(new Date());
    });
    update();
    clockTimer=setInterval(update,1000);
  }
  async function announcement(target='#class-announcement'){
    const root=document.querySelector(target);
    if(!root)return;
    try{
      const result=await BioUI.withTimeout(
        sb.from('classroom_settings').select('announcement,announcement_updated_at').eq('id',1).maybeSingle()
      );
      if(result.error)throw result.error;
      if(!result.data?.announcement){root.replaceChildren();return}
      const box=document.createElement('div');
      box.className='announcement reveal is-visible';
      const icon=document.createElement('span');
      icon.className='announcement-icon';
      icon.setAttribute('aria-hidden','true');
      icon.textContent='📢';
      const content=document.createElement('div');
      const title=document.createElement('strong');
      title.textContent='Aviso do professor';
      const text=document.createElement('p');
      text.textContent=result.data.announcement;
      const date=document.createElement('small');
      date.textContent='Atualizado em '+new Date(result.data.announcement_updated_at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'});
      content.append(title,text,date);
      box.append(icon,content);
      root.replaceChildren(box);
    }catch(error){
      root.innerHTML='<div class="note error">'+BioUI.escape(BioUI.friendlyError(error,'Não foi possível carregar o aviso.'))+'</div>';
    }
  }
  function notify(table){
    document.dispatchEvent(new CustomEvent('classroom:changed',{detail:{table}}));
    if(document.body.dataset.groupSlug&&['groups','recipes','profiles'].includes(table)){
      clearTimeout(window.__groupRealtimeReload);
      window.__groupRealtimeReload=setTimeout(()=>location.reload(),500);
    }
  }
  function realtime(){
    if(realtimeChannel)return;
    realtimeChannel=sb.channel('classroom-live')
      .on('postgres_changes',{event:'*',schema:'public',table:'classroom_settings'},()=>{announcement();notify('classroom_settings')})
      .on('postgres_changes',{event:'*',schema:'public',table:'groups'},()=>notify('groups'))
      .on('postgres_changes',{event:'*',schema:'public',table:'recipes'},()=>notify('recipes'))
      .on('postgres_changes',{event:'*',schema:'public',table:'profiles'},()=>notify('profiles'))
      .subscribe(status=>{
        if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')document.dispatchEvent(new CustomEvent('classroom:offline'));
      });
  }
  function init(){startClock();announcement();realtime();window.BioEffects?.observe()}
  window.Classroom={startClock,announcement,realtime};
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init,{once:true}):init();
})();
