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
    if(generated.has(key))return generated.get(key);
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
    generated.set(key,url);return url;
  }


  const FADE_MS=680;

  function injectStyle(){
    if(document.getElementById('bio-hero-carousel-css'))return;
    const sheet=document.createElement('style');
    sheet.id='bio-hero-carousel-css';
    sheet.textContent=[
      '.hero.bio-hero-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(210px,.86fr);gap:clamp(14px,3vw,33px);align-items:center;padding:clamp(18px,3vw,28px)}',
      '.bio-hero-text{min-width:0}.hero .bio-hero-text h1{font-size:clamp(1.9rem,3.9vw,3.8rem);max-width:100%;margin:0 0 12px;line-height:1.09}',
      '.hero .bio-hero-text .eyebrow{margin:0 0 14px}.hero .bio-hero-text .hero-copy{margin:0;font-size:clamp(.89rem,1.3vw,1.02rem)}',
      '.bio-home-carousel{min-width:0;max-width:100%;width:100%;position:relative}.bio-carousel-stage{position:relative;overflow:hidden;isolation:isolate;border-radius:15px;background:linear-gradient(130deg,#175a59,#39878b);box-shadow:0 12px 26px rgba(0,0,0,.17);height:clamp(185px,27vw,280px)}',
      '.bio-carousel-visual{position:relative;display:block;width:100%;height:100%;text-decoration:none;color:white;overflow:hidden}.bio-carousel-visual:focus-visible{outline:4px solid #e3ffce;outline-offset:-4px}',
      '.bio-carousel-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transform:scale(1.045);transition:opacity .68s cubic-bezier(.22,.61,.36,1),transform 1.35s ease-out;pointer-events:none;will-change:opacity,transform}',
      '.bio-carousel-img.is-active{opacity:1;transform:scale(1)}',
      '.bio-carousel-caption{z-index:2;position:absolute;inset:auto 0 0;display:flex;flex-direction:column;gap:3px;padding:43px 22px 19px;background:linear-gradient(transparent,rgba(5,29,28,.78));color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.3);transition:opacity .4s ease}',
      '.bio-carousel-stage.changing .bio-carousel-caption{opacity:.65}',
      '.bio-carousel-caption small{font-size:.76rem;letter-spacing:.1em;font-weight:800;text-transform:uppercase;color:#d8fff1}.bio-carousel-caption strong{font-size:clamp(1.1rem,2vw,1.6rem);line-height:1.12}',
      '.bio-carousel-prev,.bio-carousel-next{position:absolute;top:47%;z-index:4;width:38px;height:38px;border:1px solid rgba(255,255,255,.65);border-radius:50%;background:rgba(10,35,36,.48);color:#fff;font-size:24px;cursor:pointer;display:grid;place-items:center;transition:background .2s;line-height:1}',
      '.bio-carousel-prev:hover,.bio-carousel-next:hover{background:rgba(10,35,36,.86)}.bio-carousel-prev{left:9px}.bio-carousel-next{right:9px}',
      '.bio-carousel-timebar{position:absolute;inset:auto 0 0;height:4px;z-index:5;background:rgba(255,255,255,.27);pointer-events:none;overflow:hidden}',
      '.bio-carousel-timebar-fill{height:100%;width:100%;background:#b3f7d8;box-shadow:0 0 6px rgba(179,247,216,.65);transform:scaleX(0);transform-origin:left;will-change:transform}',
      '.bio-carousel-footer{display:flex;align-items:center;justify-content:center;gap:7px;padding:9px 5px 0}.bio-carousel-dot{width:9px;height:9px;padding:0;border:0;border-radius:100px;background:var(--border,#a6a6a6);cursor:pointer;transition:width .25s,background .25s}',
      '.bio-carousel-dot[aria-current=true]{width:25px;background:var(--primary,#4fab87)}.bio-carousel-dot:focus-visible,.bio-carousel-prev:focus-visible,.bio-carousel-next:focus-visible{outline:3px solid var(--focus,#f4efce);outline-offset:3px}',
      '.bio-carousel-controls{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;column-gap:13px;row-gap:2px}',
      '.bio-carousel-toggle{font:inherit;font-size:.81rem;font-weight:750;padding:5px 9px;min-height:36px;border:1px solid var(--border,#a6a6a6);border-radius:9px;background:var(--surface,#fff);color:var(--text,#16382d);cursor:pointer}',
      '.bio-carousel-toggle:hover{background:var(--surface-soft,#eef6f2)}.bio-carousel-toggle:focus-visible{outline:3px solid var(--focus,#f4efce);outline-offset:2px}',
      '.bio-carousel-toggle[hidden]{display:none}',
      '.bio-carousel-status{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}',
      '@media(max-width:640px){.hero.bio-hero-layout{grid-template-columns:1fr}.bio-carousel-stage{height:clamp(210px,51vw,290px)}.hero .bio-hero-text h1{font-size:clamp(2rem,8vw,3rem)}}',
      '@media(max-width:360px){.bio-carousel-stage{height:210px}.bio-carousel-caption{padding:38px 17px 18px}.bio-carousel-caption strong{font-size:1.05rem}}',
      '@media(prefers-reduced-motion:reduce){.bio-carousel-img,.bio-carousel-caption,.bio-carousel-dot,.bio-carousel-prev,.bio-carousel-next{transition:none!important}.bio-carousel-timebar{display:none}}'
    ].join('\n');
    document.head.append(sheet);
  }
  function el(tag,cls,txt){
    const n=document.createElement(tag);
    if(cls)n.className=cls;
    if(txt!==undefined)n.textContent=txt;
    return n;
  }
  function mount(hero){
    if(controller)return controller;
    if(!hero)return null;
    injectStyle();
    const text=el('div','bio-hero-text');
    while(hero.firstChild)text.appendChild(hero.firstChild);
    const section=el('section','bio-home-carousel');
    section.setAttribute('role','region');
    section.setAttribute('aria-roledescription','carrossel');
    section.setAttribute('aria-label','Imagens em PNG dos grupos da atividade de Biologia');
    const stage=el('div','bio-carousel-stage');
    const picture=el('a','bio-carousel-visual');
    const firstImage=el('img','bio-carousel-img is-active');
    const secondImage=el('img','bio-carousel-img');
    for(const img of [firstImage,secondImage]){
      img.width=640;img.height=400;img.decoding='async';
    }
    let activeImage=firstImage,standbyImage=secondImage;
    const caption=el('span','bio-carousel-caption');
    const label=el('small');
    const title=el('strong');
    caption.append(label,title);
    picture.append(firstImage,secondImage,caption);
    const prev=el('button','bio-carousel-prev','‹');
    const next=el('button','bio-carousel-next','›');
    prev.type=next.type='button';
    prev.setAttribute('aria-label','Grupo anterior');
    next.setAttribute('aria-label','Próximo grupo');
    const timebar=el('div','bio-carousel-timebar');
    const fill=el('div','bio-carousel-timebar-fill');
    timebar.setAttribute('aria-hidden','true');
    timebar.append(fill);
    const dots=el('div','bio-carousel-footer');
    dots.setAttribute('role','group');
    dots.setAttribute('aria-label','Selecionar grupo');
    const pauseButton=el('button','bio-carousel-toggle','Pausar');
    pauseButton.type='button';
    pauseButton.setAttribute('aria-label','Pausar passagem automática dos grupos');
    const controls=el('div','bio-carousel-controls');
    controls.append(dots,pauseButton);
    const status=el('span','bio-carousel-status');
    status.setAttribute('role','status');
    status.setAttribute('aria-live','polite');
    stage.append(picture,prev,next,timebar);
    section.append(stage,controls,status);
    hero.classList.add('bio-hero-layout');
    hero.append(text,section);

    let slides=DEFAULT_GROUPS,index=0,timer=null,frame=null;
    let transitionTimer=null,transitionToken=0;
    let startedAt=null,elapsed=0,paused=false,signature='';

    function canRotate(){
      return !paused&&!document.hidden&&!reduced.matches&&slides.length>1;
    }
    function drawTime(value){
      fill.style.transform='scaleX('+Math.max(0,Math.min(1,value/AUTO_ADVANCE_MS))+')';
    }
    function stopClock(preserve=true){
      if(startedAt!==null&&preserve){
        elapsed=Math.min(AUTO_ADVANCE_MS,elapsed+performance.now()-startedAt);
      }
      startedAt=null;
      clearTimeout(timer);timer=null;
      if(frame!==null){cancelAnimationFrame(frame);frame=null;}
      if(!preserve)elapsed=0;
      drawTime(elapsed);
    }
    function tick(){
      frame=null;
      if(startedAt===null||!canRotate())return;
      drawTime(elapsed+performance.now()-startedAt);
      frame=requestAnimationFrame(tick);
    }
    function resumeClock(reset=false){
      stopClock(!reset);
      if(!canRotate())return;
      startedAt=performance.now();
      timer=setTimeout(()=>show(index+1,false),Math.max(1,AUTO_ADVANCE_MS-elapsed));
      frame=requestAnimationFrame(tick);
    }
    function updatePauseButton(){
      pauseButton.hidden=reduced.matches;
      pauseButton.textContent=paused?'Retomar':'Pausar';
      pauseButton.setAttribute('aria-label',paused?'Retomar passagem automática dos grupos':'Pausar passagem automática dos grupos');
      pauseButton.setAttribute('aria-pressed',String(paused));
    }
    function drawDots(){
      dots.replaceChildren();
      slides.forEach((item,i)=>{
        const dot=el('button','bio-carousel-dot');
        dot.type='button';
        dot.setAttribute('aria-label','Mostrar '+item.name);
        dot.addEventListener('click',()=>show(i,true));
        dots.appendChild(dot);
      });
    }
    function imageFor(item,i){
      const number=Number((item.slug.match(/\d+$/)||[])[0])||i+1;
      const photo=typeof item.photo_url==='string'&&/\.png(?:[?#]|$)/i.test(item.photo_url)&&
        window.BioUI?.photoUrl?.(item.photo_url);
      return photo||pngFor(item.slug,number-1);
    }
    function setCaption(item,i,announce){
      const number=Number((item.slug.match(/\d+$/)||[])[0])||i+1;
      const parts=item.name.split(/\s+[—–-]\s+/);
      label.textContent='GRUPO '+number;
      title.textContent=parts.length>1?parts.slice(1).join(' — '):item.name;
      picture.href='grupo/?slug='+encodeURIComponent(item.slug);
      picture.setAttribute('aria-label','Visitar '+item.name);
      [...dots.children].forEach((dot,pos)=>dot.setAttribute('aria-current',String(i===pos)));
      if(announce)status.textContent=item.name+' — '+(i+1)+' de '+slides.length;
    }
    function cancelTransition(){
      transitionToken++;
      clearTimeout(transitionTimer);transitionTimer=null;
      // Rapid clicks always start from a consistent visible frame.
      standbyImage.classList.remove('is-active');
      activeImage.classList.add('is-active');
      stage.classList.remove('changing');
    }
    function show(target,manual){
      if(!slides.length)return;
      stopClock(!manual);
      cancelTransition();
      const dest=(target%slides.length+slides.length)%slides.length;
      if(dest===index&&activeImage.src){
        setCaption(slides[dest],dest,manual);
        resumeClock(true);return;
      }
      index=dest;
      const item=slides[index],src=imageFor(item,index),token=++transitionToken;
      standbyImage.alt='';
      standbyImage.src=src;
      const begin=()=>{
        if(token!==transitionToken)return;
        setCaption(item,index,manual);
        if(reduced.matches){
          activeImage.src=src;
          activeImage.alt='Imagem PNG ilustrativa de '+item.name;
          resumeClock(true);return;
        }
        stage.classList.add('changing');
        // One frame to register the fully transparent incoming image before the fade.
        requestAnimationFrame(()=>{
          if(token!==transitionToken)return;
          standbyImage.classList.add('is-active');
          activeImage.classList.remove('is-active');
          transitionTimer=setTimeout(()=>{
            if(token!==transitionToken)return;
            [activeImage,standbyImage]=[standbyImage,activeImage];
            standbyImage.alt='';
            activeImage.alt='Imagem PNG ilustrativa de '+item.name;
            stage.classList.remove('changing');
            transitionTimer=null;
            resumeClock(true); // 4 full seconds from the completed fade.
          },FADE_MS);
        });
      };
      // Existing group photos may load over the network; wait for them before fading.
      if(typeof standbyImage.decode==='function'){
        standbyImage.decode().then(begin).catch(()=>{
          if(token!==transitionToken)return;
          standbyImage.src=pngFor(item.slug,Number(item.slug.split('-')[1])-1);
          begin();
        });
      }else begin();
    }
    function initialSlide(){
      const item=slides[index];
      activeImage.src=imageFor(item,index);
      activeImage.alt='Imagem PNG ilustrativa de '+item.name;
      setCaption(item,index,false);
      resumeClock(true);
    }
    function move(delta,manual){show(index+delta,manual);}
    prev.addEventListener('click',()=>move(-1,true));
    next.addEventListener('click',()=>move(1,true));
    pauseButton.addEventListener('click',()=>{
      paused=!paused;
      updatePauseButton();
      if(paused)stopClock(true);else resumeClock(false);
    });
    section.addEventListener('keydown',event=>{
      if(event.key==='ArrowLeft'){event.preventDefault();move(-1,true);}
      if(event.key==='ArrowRight'){event.preventDefault();move(1,true);}
    });
    let touchStart=null,suppressClick=false;
    stage.addEventListener('pointerdown',event=>{if(event.pointerType==='touch')touchStart=event.clientX;});
    stage.addEventListener('pointerup',event=>{
      if(touchStart===null)return;
      const delta=event.clientX-touchStart;touchStart=null;
      if(Math.abs(delta)>48){
        suppressClick=true;
        move(delta>0?-1:1,true);
        setTimeout(()=>{suppressClick=false;},250);
      }
    });
    picture.addEventListener('click',event=>{if(suppressClick)event.preventDefault();});
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden)stopClock(true);else resumeClock(false);
    });
    if(reduced.addEventListener)reduced.addEventListener('change',()=>{
      updatePauseButton();
      if(reduced.matches)stopClock(true);else resumeClock(false);
    });
    function updateGroups(items){
      if(!Array.isArray(items)||!items.length)return;
      const nextItems=items.filter(item=>item&&typeof item.slug==='string'&&
        /^grupo-\d+$/.test(item.slug)&&typeof item.name==='string')
        .sort((a,b)=>Number(a.slug.split('-')[1])-Number(b.slug.split('-')[1]));
      if(!nextItems.length)return;
      const nextSig=nextItems.map(item=>item.slug+'|'+item.name+'|'+(item.photo_url||'')).join(';');
      if(nextSig===signature)return;
      const oldSlug=slides[index]?.slug;
      signature=nextSig;slides=nextItems;
      index=Math.max(0,slides.findIndex(item=>item.slug===oldSlug));
      stopClock(false);
      cancelTransition();
      drawDots();
      standbyImage.classList.remove('is-active');
      activeImage.classList.add('is-active');
      initialSlide();
    }
    controller={
      updateGroups,
      pause(){paused=true;updatePauseButton();stopClock(true);},
      resume(){paused=false;updatePauseButton();resumeClock(false);}
    };
    drawDots();updatePauseButton();initialSlide();
    return controller;
  }
  window.BioHomeCarousel={mount};
})();