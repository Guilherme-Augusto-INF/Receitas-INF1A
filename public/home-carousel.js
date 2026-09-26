/* Carrossel de grupos feito inteiramente em JavaScript.
 * As imagens sao geradas localmente com Canvas e exportadas como PNG (data URLs).
 * Nao exige arquivos de imagem, modificacoes no HTML ou folhas CSS adicionais.
 */
(()=>{
  'use strict';
  if(window.BioHomeCarousel)return;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const AUTO_ADVANCE_MS=4000;
  const DEFAULT_GROUPS=[
    ['grupo-1','Grupo 1 — Água'],
    ['grupo-2','Grupo 2 — Vitaminas'],
    ['grupo-3','Grupo 3 — Sais Minerais'],
    ['grupo-4','Grupo 4 — Carboidratos'],
    ['grupo-5','Grupo 5 — Lipídeos'],
    ['grupo-6','Grupo 6 — Proteínas'],
    ['grupo-7','Grupo 7 — Ácido Nucleico']
  ].map(([slug,name])=>({slug,name}));
  const PALETTE={
    'grupo-1':['#0c5773','#24a5cb','#b7f0fd'],
    'grupo-2':['#854b13','#e5a028','#fff1c2'],
    'grupo-3':['#4a467d','#9c92d6','#ece9ff'],
    'grupo-4':['#86502c','#d5a060','#fff1d2'],
    'grupo-5':['#336d49','#7eb879','#e5f8d6'],
    'grupo-6':['#895056','#d6a4a5','#ffece8'],
    'grupo-7':['#315783','#7fb1ce','#e8f2ff']
  };
  const generated=new Map();
  let controller=null;

  function ellipse(c,x,y,rx,ry,color,rotation=0){
    c.beginPath();c.ellipse(x,y,rx,ry,rotation,0,Math.PI*2);
    c.fillStyle=color;c.fill();
  }
  function line(c,coords,color,width=5){
    c.beginPath();c.moveTo(coords[0],coords[1]);
    for(let i=2;i<coords.length;i+=2)c.lineTo(coords[i],coords[i+1]);
    c.lineWidth=width;c.lineCap='round';c.lineJoin='round';
    c.strokeStyle=color;c.stroke();
  }
  function water(c){
    c.save();c.shadowColor='#061d33';c.shadowBlur=32;c.shadowOffsetY=15;
    c.beginPath();c.moveTo(320,56);c.bezierCurveTo(300,117,207,211,207,266);
    c.bezierCurveTo(207,336,256,365,320,365);
    c.bezierCurveTo(391,365,433,333,433,266);
    c.bezierCurveTo(433,208,354,119,320,56);c.closePath();
    const g=c.createLinearGradient(210,95,425,350);g.addColorStop(0,'#f5feff');g.addColorStop(.36,'#87e4f9');g.addColorStop(1,'#2099d3');
    c.fillStyle=g;c.fill();c.restore();
    ellipse(c,281,207,15,57,'rgba(255,255,255,.67)',-.47);
    for(const [x,y,r] of [[153,130,18],[467,167,13],[485,282,24],[124,293,10]]){
      c.strokeStyle='rgba(229,251,255,.66)';c.lineWidth=4;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke();
    }
    c.strokeStyle='rgba(203,248,254,.64)';c.lineWidth=5;
    for(let i=0;i<3;i++){c.beginPath();c.ellipse(322,348+i*12,178+i*25,20+i*7,0,0,Math.PI);c.stroke();}
  }
  function vitamin(c){
    ellipse(c,319,303,214,69,'rgba(255,255,246,.78)');
    const fruit=(x,y,r,color,n)=>{
      ellipse(c,x,y,r,r,color);c.lineWidth=8;c.strokeStyle='rgba(255,255,255,.78)';
      c.beginPath();c.arc(x,y,r-7,0,Math.PI*2);c.stroke();
      for(let i=0;i<n;i++){
        const a=i*Math.PI*2/n;line(c,[x,y,x+Math.cos(a)*(r-12),y+Math.sin(a)*(r-12)],'rgba(255,253,240,.86)',4);
      }
      ellipse(c,x-17,y-20,12,16,'rgba(255,255,255,.3)',-.65);
    };
    fruit(254,221,88,'#fcb743',8);
    fruit(383,244,75,'#bad96a',7);
    fruit(328,167,47,'#fc7350',6);
    c.save();c.translate(321,117);c.rotate(-.4);ellipse(c,0,0,22,46,'#518349');c.restore();
    c.save();c.translate(358,123);c.rotate(.55);ellipse(c,0,0,22,39,'#70a85d');c.restore();
  }
  function minerals(c){
    const crystal=(x,y,w,h,front,side)=>{
      c.beginPath();c.moveTo(x-w/2,y);c.lineTo(x-w/2,y-h*.63);c.lineTo(x,y-h);
      c.lineTo(x+w/2,y-h*.63);c.lineTo(x+w/2,y);c.lineTo(x,y+h*.17);c.closePath();
      c.fillStyle=front;c.fill();
      c.beginPath();c.moveTo(x,y-h);c.lineTo(x+w/2,y-h*.63);c.lineTo(x+w/2,y);
      c.lineTo(x,y+h*.17);c.closePath();c.fillStyle=side;c.fill();
      line(c,[x,y-h,x,y+h*.17],'rgba(255,255,255,.5)',3);
      line(c,[x-w/2,y-h*.63,x,y-h,x+w/2,y-h*.63],'rgba(255,255,255,.76)',4);
    };
    ellipse(c,321,333,206,34,'rgba(9,15,43,.22)');
    crystal(245,273,142,224,'#c5bcff','#7673b9');
    crystal(342,249,156,279,'#e3d8ff','#9d8ccf');
    crystal(440,297,116,183,'#9ce4ee','#509bac');
    crystal(176,321,91,119,'#cff0ff','#95bee0');
    for(const [x,y,r] of [[139,108,8],[483,120,12],[513,235,6],[108,253,5]]){
      ellipse(c,x,y,r,r,'rgba(255,255,255,.7)');
    }
  }
  function carbs(c){
    c.save();c.translate(304,226);c.rotate(-.15);
    c.lineWidth=16;c.strokeStyle='#8b522a';c.fillStyle='#f6c987';
    c.beginPath();c.moveTo(-147,106);c.lineTo(-147,-19);c.bezierCurveTo(-147,-118,0,-139,115,-92);
    c.bezierCurveTo(156,-75,156,-11,140,106);c.closePath();c.fill();c.stroke();
    c.lineWidth=8;c.strokeStyle='#e7aa5f';c.strokeRect(-117,-9,225,87);c.restore();
    c.save();c.translate(400,240);c.rotate(.14);
    c.fillStyle='#ffe5a8';c.strokeStyle='#bc7e3c';c.lineWidth=15;
    c.beginPath();c.moveTo(-70,83);c.lineTo(-80,-8);c.bezierCurveTo(-115,-96,14,-129,74,-53);
    c.bezierCurveTo(103,-15,94,39,83,83);c.closePath();c.fill();c.stroke();c.restore();
    const wheat=(x,sign)=>{
      c.strokeStyle='#ffe09b';c.lineWidth=6;c.beginPath();c.moveTo(x,350);c.quadraticCurveTo(x+sign*20,234,x,115);c.stroke();
      for(let i=0;i<5;i++){const y=145+i*31;
        ellipse(c,x+sign*(20+i*2),y,13,25,'#ffe1a1',sign*.65);
        ellipse(c,x-sign*(17+i*2),y+12,11,22,'#f4c776',-sign*.65);
      }
    };
    wheat(112,1);wheat(538,-1);
  }
  function lipids(c){
    c.save();c.translate(313,217);c.rotate(-.24);
    ellipse(c,0,4,116,157,'#305c3a');
    ellipse(c,0,3,100,139,'#8cc66c');
    ellipse(c,0,7,74,105,'#eaf6ad');
    ellipse(c,0,50,49,51,'#946242');
    ellipse(c,-9,37,29,33,'#c18b60');
    c.restore();
    c.save();c.translate(462,229);c.rotate(.32);
    ellipse(c,0,0,73,111,'#295436');
    ellipse(c,0,0,61,96,'#97ca72');
    ellipse(c,0,0,41,70,'#eff5bf');
    c.restore();
    ellipse(c,175,174,25,12,'#e4bf61',-.6);
    ellipse(c,159,209,23,11,'#e8ca6b',.35);
    c.beginPath();c.moveTo(486,79);c.bezierCurveTo(475,102,458,117,458,134);
    c.bezierCurveTo(458,168,508,172,508,134);c.bezierCurveTo(508,114,496,95,486,79);
    c.fillStyle='#f5d771';c.fill();
  }
  function proteins(c){
    ellipse(c,320,320,201,39,'rgba(59,16,31,.16)');
    c.save();c.translate(307,215);c.rotate(-.29);
    ellipse(c,0,0,161,113,'#fff8ec');
    ellipse(c,-8,-4,151,104,'#f4e4dd');
    ellipse(c,20,-10,62,61,'#ffd659');
    ellipse(c,4,-26,25,16,'rgba(255,255,255,.55)',-.4);c.restore();
    for(const [x,y,rot] of [[155,126,.5],[475,138,-.6],[479,305,.25],[121,287,-.4]]){
      c.save();c.translate(x,y);c.rotate(rot);
      ellipse(c,0,0,17,28,'#b77c5b');ellipse(c,-4,-6,6,13,'#ead0af');c.restore();
    }
  }
  function dna(c){
    const left=[],right=[];
    const top=48,bottom=357,step=12;
    for(let y=top;y<=bottom;y+=step){
      const t=(y-top)/27;
      left.push([320+Math.sin(t)*115,y]);
      right.push([320-Math.sin(t)*115,y]);
    }
    for(let i=0;i<left.length;i+=2){
      line(c,[left[i][0],left[i][1],right[i][0],right[i][1]],i%4===0?'#fbe3ab':'#cbf3e1',7);
      ellipse(c,320,left[i][1],3,3,'#fff');
    }
    c.lineWidth=15;c.lineCap='round';
    c.beginPath();left.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle='#a6dafe';c.stroke();
    c.beginPath();right.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle='#ffd9b0';c.stroke();
    for(let i=0;i<left.length;i+=3){
      ellipse(c,left[i][0],left[i][1],10,10,'#e5f5ff');
      ellipse(c,right[i][0],right[i][1],10,10,'#ffe9ce');
    }
  }
  function pngFor(slug,index){
    const key=PALETTE[slug]?slug:'grupo-7';
    if(generated.has(slug))return generated.get(slug);
    const canvas=document.createElement('canvas');canvas.width=640;canvas.height=400;
    const c=canvas.getContext('2d');
    if(!c)return '';
    const [dark,mid,light]=PALETTE[key],bg=c.createLinearGradient(0,0,640,400);
    bg.addColorStop(0,dark);bg.addColorStop(.65,mid);bg.addColorStop(1,light);
    c.fillStyle=bg;c.fillRect(0,0,640,400);
    for(const [x,y,r,a] of [[98,50,108,.14],[544,46,150,.13],[55,322,122,.13],[504,360,128,.12]]){
      c.globalAlpha=a;ellipse(c,x,y,r,r,'#fff');
    }
    c.globalAlpha=1;
    c.strokeStyle='rgba(255,255,255,.13)';c.lineWidth=2;
    for(let i=0;i<9;i++){
      c.beginPath();c.arc(325,210,120+i*19,-.72,1.25);c.stroke();
    }
    const artwork={ 'grupo-1':water,'grupo-2':vitamin,'grupo-3':minerals,
      'grupo-4':carbs,'grupo-5':lipids,'grupo-6':proteins,'grupo-7':dna
    };
    artwork[key](c);
    c.fillStyle='rgba(13,40,40,.28)';
    c.beginPath();c.roundRect(28,24,72,43,16);c.fill();
    c.fillStyle='#fff';c.font='700 23px system-ui, sans-serif';
    c.textBaseline='middle';c.fillText(String(index+1).padStart(2,'0'),46,46);
    const url=canvas.toDataURL('image/png');
    generated.set(slug,url);return url;
  }



  // Motion blueprint (JS-only): continuous 4-second timebase, 780ms direction-aware
  // crossfade, gentle 5-second Ken Burns, staggered text reveal, pointer aura,
  // per-group story segments and a YouTube-style timeline.
  // Native Web Animations API is optional; CSS is injected by this script.
  const TRANSITION_MS=780;
  const EASE='cubic-bezier(.16,1,.3,1)';
  const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));

  function injectStyle(){
    if(document.getElementById('bio-hero-carousel-css'))return;
    const sheet=document.createElement('style');sheet.id='bio-hero-carousel-css';
    sheet.textContent=[
      '.hero.bio-hero-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(250px,.98fr);gap:clamp(18px,3vw,38px);align-items:center;padding:clamp(18px,3vw,30px)}',
      '.bio-hero-text{min-width:0}.hero .bio-hero-text h1{font-size:clamp(2rem,4vw,3.8rem);line-height:1.06;max-width:100%;margin:0 0 14px;letter-spacing:-.025em}',
      '.hero .bio-hero-text .eyebrow{margin:0 0 12px}.hero .bio-hero-text .hero-copy{margin:0;font-size:clamp(.94rem,1.28vw,1.06rem)}',
      '.bio-home-carousel{position:relative;min-width:0;width:100%;--slide-dark:#0c5773;--slide-light:#24a5cb}',
      '.bio-carousel-stage{isolation:isolate;position:relative;overflow:hidden;min-height:230px;height:clamp(230px,30vw,325px);border-radius:18px;background:linear-gradient(145deg,var(--slide-dark),var(--slide-light));box-shadow:0 17px 38px rgba(5,30,23,.21),0 2px 6px rgba(5,30,23,.12);border:1px solid rgba(255,255,255,.16);touch-action:pan-y}',
      '.bio-carousel-stage::before{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;background:radial-gradient(circle at var(--pointer-x,50%) var(--pointer-y,40%),rgba(255,255,255,.21),transparent 46%);opacity:.6;transition:opacity .45s}',
      '.bio-carousel-stage::after{content:"";position:absolute;inset:1px;z-index:1;pointer-events:none;border-radius:inherit;box-shadow:inset 0 0 0 1px rgba(255,255,255,.13)}',
      '.bio-carousel-visual{display:block;position:absolute;inset:0;color:#fff;text-decoration:none;overflow:hidden}.bio-carousel-visual:focus-visible{outline:3px solid #cbffe3;outline-offset:-5px}',
      '.bio-carousel-image{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transform:translate3d(var(--entry-x,16px),0,0) scale(1.09);transition:opacity .78s cubic-bezier(.25,.46,.45,.94),transform 5s ease-out;pointer-events:none;backface-visibility:hidden}',
      '.bio-carousel-image.is-current{opacity:1;transform:translate3d(0,0,0) scale(1);z-index:1}',
      '.bio-carousel-scrim{position:absolute;inset:0;z-index:2;background:linear-gradient(180deg,rgba(2,25,27,.23) 0%,transparent 36%,transparent 50%,rgba(1,24,29,.89) 100%);pointer-events:none}',
      '.bio-carousel-kicker{position:absolute;left:17px;top:15px;z-index:3;font-size:.69rem;letter-spacing:.14em;font-weight:850;color:#f8fffd;background:rgba(3,31,32,.42);border:1px solid rgba(240,255,248,.32);border-radius:100px;padding:6px 11px;backdrop-filter:blur(9px)}',
      '.bio-carousel-counter{position:absolute;right:16px;top:16px;z-index:3;font-size:.78rem;letter-spacing:.06em;font-weight:800;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.4)}',
      '.bio-carousel-caption{position:absolute;z-index:3;inset:auto 14px 20px;max-width:calc(100% - 28px);pointer-events:none;display:flex;flex-direction:column;align-items:flex-start;gap:3px;text-shadow:0 2px 12px rgba(0,0,0,.43)}',
      '.bio-carousel-caption small{font-size:.68rem;letter-spacing:.16em;font-weight:850;text-transform:uppercase;color:#cbfff0}',
      '.bio-carousel-caption strong{font-size:clamp(1.4rem,2.8vw,2.2rem);line-height:1.12;letter-spacing:-.025em;color:#fff}',
      '.bio-carousel-caption em{font-size:.76rem;font-weight:700;font-style:normal;color:#e4fff4;margin-top:5px;opacity:.9}',
      '.bio-carousel-prev,.bio-carousel-next{position:absolute;top:48%;transform:translateY(-50%);z-index:5;display:grid;place-items:center;width:40px;height:40px;border:1px solid rgba(255,255,255,.54);border-radius:50%;color:#fff;background:rgba(7,33,36,.42);backdrop-filter:blur(9px);box-shadow:0 3px 13px rgba(0,0,0,.15);font-size:1.7rem;line-height:1;cursor:pointer;transition:transform .24s,background .24s,box-shadow .24s}',
      '.bio-carousel-prev{left:9px}.bio-carousel-next{right:9px}.bio-carousel-prev:hover,.bio-carousel-next:hover{transform:translateY(-50%) scale(1.09);background:rgba(7,33,36,.86);box-shadow:0 5px 14px rgba(0,0,0,.24)}',
      '.bio-carousel-prev:active,.bio-carousel-next:active{transform:translateY(-50%) scale(.95)}',
      '.bio-carousel-timeline{position:absolute;left:0;right:0;bottom:0;height:4px;z-index:6;background:rgba(255,255,255,.27);overflow:hidden;pointer-events:none}',
      '.bio-carousel-timeline-fill{height:100%;width:100%;transform:scaleX(0);transform-origin:left;background:#adffe4;box-shadow:0 0 10px rgba(185,255,233,.7);will-change:transform}',
      '.bio-carousel-footer{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;padding:10px 2px 2px}',
      '.bio-carousel-dots{display:flex;gap:6px;align-items:center;flex-wrap:wrap}',
      '.bio-carousel-dot{position:relative;display:grid;place-items:center;width:23px;height:26px;background:transparent;border:0;padding:7px 2px;cursor:pointer}',
      '.bio-carousel-dot::after{content:"";display:block;width:9px;height:9px;border-radius:20px;background:var(--border,#9aafaa);transition:width .32s cubic-bezier(.16,1,.3,1),background .32s}',
      '.bio-carousel-dot[aria-current=true]::after{width:24px;background:var(--primary,#45bd89)}',
      '.bio-carousel-actions{display:flex;align-items:center;gap:9px;margin-left:auto}',
      '.bio-carousel-duration{font-size:.71rem;font-weight:700;letter-spacing:.01em;color:var(--muted,#a4bfb3);white-space:nowrap}',
      '.bio-carousel-toggle{min-height:36px;font:inherit;font-size:.78rem;font-weight:800;border:1px solid var(--border,#90aaa1);border-radius:9px;padding:6px 10px;background:var(--surface,#fff);color:var(--text,#17382b);cursor:pointer;transition:background .2s,transform .2s}',
      '.bio-carousel-toggle:hover{background:var(--surface-soft,#e9f4ef);transform:translateY(-1px)}',
      '.bio-carousel-toggle[hidden]{display:none}',
      '.bio-carousel-status{position:absolute;clip-path:inset(50%);white-space:nowrap;width:1px;height:1px;overflow:hidden}',
      '.bio-carousel-dot:focus-visible,.bio-carousel-prev:focus-visible,.bio-carousel-next:focus-visible,.bio-carousel-toggle:focus-visible{outline:3px solid var(--primary,#50ae83);outline-offset:3px}',
      '@media(max-width:750px){.hero.bio-hero-layout{grid-template-columns:1fr;gap:20px}.bio-carousel-stage{height:clamp(240px,52vw,340px)}}',
      '@media(max-width:400px){.bio-carousel-stage{height:230px;border-radius:14px}.bio-carousel-caption strong{font-size:1.35rem}.bio-carousel-kicker{font-size:.6rem}.bio-carousel-counter{font-size:.7rem}.bio-carousel-duration{display:none}}',
      '@media(prefers-reduced-motion:reduce){.bio-carousel-image,.bio-carousel-prev,.bio-carousel-next,.bio-carousel-dot::after,.bio-carousel-toggle{transition:none!important;transform:none!important}.bio-carousel-prev,.bio-carousel-next{transform:translateY(-50%)!important}.bio-carousel-timeline{display:none}}'
    ].join('\n');
    document.head.appendChild(sheet);
  }
  function el(tag,cls,content){
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(content!==undefined)node.textContent=content;
    return node;
  }
  function mount(hero){
    if(controller)return controller;
    if(!hero)return null;
    injectStyle();

    const text=el('div','bio-hero-text');
    while(hero.firstChild)text.appendChild(hero.firstChild);
    const region=el('section','bio-home-carousel');
    region.setAttribute('role','region');
    region.setAttribute('aria-roledescription','carrossel');
    region.setAttribute('aria-label','Explore as imagens dos grupos de Biologia');
    const stage=el('div','bio-carousel-stage');
    const link=el('a','bio-carousel-visual');
    const images=[el('img','bio-carousel-image is-current'),el('img','bio-carousel-image')];
    for(const img of images){
      img.width=640;img.height=400;img.decoding='async';img.draggable=false;
    }
    let active=images[0],incoming=images[1];
    const scrim=el('span','bio-carousel-scrim');
    const kicker=el('span','bio-carousel-kicker','CONHEÇA NOSSA TURMA');
    const counter=el('span','bio-carousel-counter');
    const caption=el('span','bio-carousel-caption');
    const number=el('small'),title=el('strong'),cta=el('em','', 'Explorar grupo ↗');
    caption.append(number,title,cta);
    link.append(...images,scrim,caption);
    const prev=el('button','bio-carousel-prev','‹');
    const next=el('button','bio-carousel-next','›');
    prev.type=next.type='button';
    prev.setAttribute('aria-label','Grupo anterior');
    next.setAttribute('aria-label','Próximo grupo');
    const timeline=el('div','bio-carousel-timeline');
    timeline.setAttribute('aria-hidden','true');
    const timelineFill=el('div','bio-carousel-timeline-fill');timeline.append(timelineFill);
    stage.append(link,kicker,counter,prev,next,timeline);
    const footer=el('div','bio-carousel-footer');
    const dots=el('div','bio-carousel-dots');dots.setAttribute('role','group');dots.setAttribute('aria-label','Selecionar grupo');
    const actions=el('div','bio-carousel-actions');
    const duration=el('span','bio-carousel-duration','4 s por grupo');
    const pauseButton=el('button','bio-carousel-toggle','❚❚ Pausar');
    pauseButton.type='button';
    actions.append(duration,pauseButton);footer.append(dots,actions);
    const announce=el('span','bio-carousel-status');
    announce.setAttribute('role','status');announce.setAttribute('aria-live','polite');announce.setAttribute('aria-atomic','true');
    region.append(stage,footer,announce);
    hero.classList.add('bio-hero-layout');hero.append(text,region);

    let slides=DEFAULT_GROUPS;
    let index=0,clock=null,frame=null,startedAt=null,elapsed=0;
    let transitionTimer=null,transitionToken=0,transitioning=false;
    let signature='',paused=false,captionMotions=[],pointerFrame=null;
    let pointerX=.5,pointerY=.4;

    function canPlay(){
      return !paused&&!document.hidden&&!reduced.matches&&slides.length>1;
    }
    function progress(value){
      timelineFill.style.transform='scaleX('+clamp(value/AUTO_ADVANCE_MS,0,1)+')';
    }
    function stopClock(keep=true){
      if(keep&&startedAt!==null){
        elapsed=clamp(elapsed+performance.now()-startedAt,0,AUTO_ADVANCE_MS);
      }
      startedAt=null;
      if(clock!==null){clearTimeout(clock);clock=null;}
      if(frame!==null){cancelAnimationFrame(frame);frame=null;}
      if(!keep)elapsed=0;
      progress(elapsed);
    }
    function tick(){
      frame=null;
      if(startedAt===null||!canPlay())return;
      progress(elapsed+performance.now()-startedAt);
      frame=requestAnimationFrame(tick);
    }
    function resumeClock(reset=false){
      stopClock(!reset);
      if(!canPlay()||transitioning)return;
      startedAt=performance.now();
      clock=setTimeout(()=>show(index+1,false,1),Math.max(1,AUTO_ADVANCE_MS-elapsed));
      frame=requestAnimationFrame(tick);
    }
    function updatePause(){
      pauseButton.hidden=reduced.matches;
      pauseButton.textContent=paused?'▶ Retomar':'❚❚ Pausar';
      pauseButton.setAttribute('aria-label',paused?'Retomar passagem automática':'Pausar passagem automática');
      pauseButton.setAttribute('aria-pressed',String(paused));
      duration.textContent=reduced.matches?'Navegação manual':paused?'Pausado':'4 s por grupo';
    }
    function renderDots(){
      dots.replaceChildren();
      slides.forEach((item,i)=>{
        const dot=el('button','bio-carousel-dot');
        dot.type='button';
        dot.setAttribute('aria-label','Mostrar '+item.name);
        dot.setAttribute('aria-current',String(i===index));
        dot.addEventListener('click',()=>{
          const direction=i===index?1:(i>index?1:-1);
          show(i,true,direction);
        });
        dots.append(dot);
      });
    }
    function slideSource(item,i){
      const n=Number((item.slug.match(/\d+$/)||[])[0])||i+1;
      const safe=typeof item.photo_url==='string'&&/\.png(?:[?#]|$)/i.test(item.photo_url)&&
        window.BioUI?.photoUrl?.(item.photo_url);
      return safe||pngFor(item.slug,n-1);
    }
    function updateDetails(item,i,manual){
      const n=Number((item.slug.match(/\d+$/)||[])[0])||i+1;
      const parts=item.name.split(/\s+[—–-]\s+/);
      counter.textContent=String(i+1).padStart(2,'0')+' / '+String(slides.length).padStart(2,'0');
      number.textContent='GRUPO '+String(n).padStart(2,'0');
      title.textContent=parts.length>1?parts.slice(1).join(' — '):item.name;
      link.href='grupo/?slug='+encodeURIComponent(item.slug);
      link.setAttribute('aria-label','Visitar '+item.name);
      region.style.setProperty('--slide-dark',(PALETTE[item.slug]||PALETTE['grupo-7'])[0]);
      region.style.setProperty('--slide-light',(PALETTE[item.slug]||PALETTE['grupo-7'])[1]);
      [...dots.children].forEach((dot,pos)=>dot.setAttribute('aria-current',String(pos===i)));
      if(manual)announce.textContent=item.name+', '+(i+1)+' de '+slides.length;
    }
    function animateCaption(){
      for(const motion of captionMotions)motion.cancel();
      captionMotions=[];
      if(reduced.matches)return;
      for(const [element,delay] of [[number,80],[title,175],[cta,290]]){
        if(typeof element.animate!=='function')continue;
        captionMotions.push(element.animate(
          [{opacity:0,transform:'translate3d(0,13px,0)',filter:'blur(4px)'},
           {opacity:1,transform:'translate3d(0,0,0)',filter:'blur(0)'}],
          {duration:560,delay,easing:EASE,fill:'both'}
        ));
      }
    }
    function abortTransition(){
      transitionToken++;transitioning=false;
      if(transitionTimer!==null){clearTimeout(transitionTimer);transitionTimer=null;}
      incoming.classList.remove('is-current');
      incoming.alt='';
      active.classList.add('is-current');
    }
    function show(target,manual=false,direction=1){
      if(!slides.length)return;
      const wasTransitioning=transitioning;
      stopClock(false);
      abortTransition();
      const dest=((target%slides.length)+slides.length)%slides.length;
      if(dest===index&&!wasTransitioning&&active.src){
        if(manual)announce.textContent=slides[dest].name;
        resumeClock(true);
        return;
      }
      index=dest;
      const item=slides[index],token=++transitionToken;
      const targetSource=slideSource(item,index);
      incoming.style.setProperty('--entry-x',(direction<0?'-16px':'16px'));
      incoming.alt='';incoming.src=targetSource;
      // decode() avoids blank frames when real PNG photos load over the network.
      const start=()=>{
        if(token!==transitionToken)return;
        updateDetails(item,index,manual);
        if(reduced.matches){
          active.src=targetSource;
          active.alt='Imagem do tema '+item.name;
          incoming.classList.remove('is-current');
          transitioning=false;resumeClock(true);return;
        }
        transitioning=true;
        animateCaption();
        requestAnimationFrame(()=>{
          if(token!==transitionToken)return;
          incoming.alt='Imagem do tema '+item.name;
          active.alt='';
          incoming.classList.add('is-current');
          active.classList.remove('is-current');
          transitionTimer=setTimeout(()=>{
            if(token!==transitionToken)return;
            [active,incoming]=[incoming,active];
            active.alt='Imagem do tema '+item.name;
            incoming.alt='';
            incoming.classList.remove('is-current');
            transitioning=false;transitionTimer=null;
            resumeClock(true);
          },TRANSITION_MS);
        });
      };
      if(typeof incoming.decode==='function'){
        incoming.decode().then(start).catch(()=>{
          if(token!==transitionToken)return;
          incoming.src=pngFor(item.slug,Number(item.slug.split('-')[1])-1);
          start();
        });
      }else start();
    }
    function start(){
      const item=slides[index];
      active.src=slideSource(item,index);
      active.alt='Imagem do tema '+item.name;
      updateDetails(item,index,false);
      progress(0);resumeClock(true);
    }
    prev.addEventListener('click',()=>show(index-1,true,-1));
    next.addEventListener('click',()=>show(index+1,true,1));
    pauseButton.addEventListener('click',()=>{
      paused=!paused;updatePause();
      if(paused)stopClock(true);else resumeClock(false);
    });
    region.addEventListener('keydown',event=>{
      if(event.key==='ArrowLeft'){event.preventDefault();show(index-1,true,-1);}
      if(event.key==='ArrowRight'){event.preventDefault();show(index+1,true,1);}
    });
    // Lightweight pointer aura (no position/rotation of interactive controls).
    stage.addEventListener('pointermove',event=>{
      if(event.pointerType==='touch'||reduced.matches)return;
      const bounds=stage.getBoundingClientRect();
      if(!bounds.width||!bounds.height)return;
      pointerX=clamp((event.clientX-bounds.left)/bounds.width,0,1);
      pointerY=clamp((event.clientY-bounds.top)/bounds.height,0,1);
      if(pointerFrame!==null)return;
      pointerFrame=requestAnimationFrame(()=>{
        pointerFrame=null;
        stage.style.setProperty('--pointer-x',(pointerX*100).toFixed(1)+'%');
        stage.style.setProperty('--pointer-y',(pointerY*100).toFixed(1)+'%');
      });
    });
    stage.addEventListener('pointerleave',()=>{
      if(pointerFrame!==null){cancelAnimationFrame(pointerFrame);pointerFrame=null;}
      stage.style.setProperty('--pointer-x','50%');
      stage.style.setProperty('--pointer-y','40%');
    });
    let touchX=null,swiped=false;
    stage.addEventListener('pointerdown',event=>{
      if(event.pointerType==='touch')touchX=event.clientX;
    });
    stage.addEventListener('pointerup',event=>{
      if(touchX===null)return;
      const distance=event.clientX-touchX;touchX=null;
      if(Math.abs(distance)>45){
        swiped=true;show(index+(distance>0?-1:1),true,distance>0?-1:1);
        setTimeout(()=>{swiped=false;},330);
      }
    });
    stage.addEventListener('pointercancel',()=>{touchX=null;});
    link.addEventListener('click',event=>{if(swiped)event.preventDefault();});
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden)stopClock(true);else resumeClock(false);
    });
    if(reduced.addEventListener){
      reduced.addEventListener('change',()=>{
        updatePause();
        if(reduced.matches)stopClock(true);else resumeClock(false);
      });
    }
    function updateGroups(items){
      if(!Array.isArray(items)||!items.length)return;
      const next=items.filter(item=>item&&typeof item.slug==='string'&&
        /^grupo-\d+$/.test(item.slug)&&typeof item.name==='string')
        .sort((a,b)=>Number(a.slug.split('-')[1])-Number(b.slug.split('-')[1]));
      if(!next.length)return;
      const nextSig=next.map(item=>item.slug+'|'+item.name+'|'+(item.photo_url||'')).join(';');
      if(nextSig===signature)return;
      const previous=slides[index]?.slug;
      signature=nextSig;slides=next;
      index=Math.max(0,slides.findIndex(item=>item.slug===previous));
      stopClock(false);abortTransition();renderDots();start();
    }
    controller={
      updateGroups,
      pause(){paused=true;updatePause();stopClock(true);},
      resume(){paused=false;updatePause();resumeClock(false);}
    };
    renderDots();updatePause();start();
    return controller;
  }
  window.BioHomeCarousel={mount};
})();