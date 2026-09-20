(()=>{
  const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let observer=null;
  function observe(){
    const items=document.querySelectorAll('.reveal:not(.is-visible)');
    if(reduce||!('IntersectionObserver'in window)){
      items.forEach(element=>element.classList.add('is-visible'));
      return;
    }
    observer??=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}
    }),{threshold:.08,rootMargin:'0px 0px -24px'});
    items.forEach(element=>observer.observe(element));
  }
  function init(){
    document.documentElement.classList.add('effects-ready');
    const progress=document.createElement('div');
    progress.className='scroll-progress';
    progress.setAttribute('aria-hidden','true');
    document.body.prepend(progress);
    const update=()=>{
      const max=document.documentElement.scrollHeight-window.innerHeight;
      progress.style.transform=`scaleX(${max>0?window.scrollY/max:0})`;
    };
    window.addEventListener('scroll',update,{passive:true});
    window.addEventListener('resize',update,{passive:true});
    update();observe();window.BioEffects={observe};
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init,{once:true}):init();
})();
