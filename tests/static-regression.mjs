import{readFileSync,readdirSync}from'node:fs';
import{join}from'node:path';

const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const htmlFiles=['index.html','404.html','login/index.html','cadastro/index.html','perfil/index.html','professor/index.html','apresentacao/index.html',...readdirSync(new URL('.',root)).filter(name=>/^grupo-[1-6]$/.test(name)).map(name=>join(name,'index.html'))];
const failures=[];
const check=(condition,message)=>{if(!condition)failures.push(message)};

for(const file of htmlFiles){
  const html=read(file);
  check(!html.includes('Receitas-INF1A-02'),`${file}: referência ao repositório antigo`);
  check(html.includes('Content-Security-Policy'),`${file}: CSP ausente`);
  check(!/<script(?![^>]+src=)/i.test(html),`${file}: script inline encontrado`);
  check(!/\?v=(?!4\.[0-9]+\.0)/.test(html),`${file}: cache busting inconsistente`);
}
for(const file of ['login/index.html','cadastro/index.html','perfil/index.html','professor/index.html','apresentacao/index.html']){
  check(/name="robots" content="noindex,nofollow"/.test(read(file)),`${file}: noindex ausente`);
}
const repoText=[...htmlFiles.map(read),...readdirSync(new URL('public/',root)).filter(name=>/\.(js|css|txt|xml|svg)$/.test(name)).map(name=>read('public/'+name))].join('\n');
check(!/service_role|sb_secret_|JWT_SECRET|SUPABASE_DB_PASSWORD/.test(repoText),'Possível segredo encontrado no frontend');
check(!repoText.includes('Receitas-INF1A-02'),'Referência antiga encontrada');
check(read('sitemap.xml').includes('/Receitas-INF1A/grupo-6/'),'Sitemap da raiz incompleto');
check(!/login|perfil|professor/.test(read('sitemap.xml')),'Sitemap da raiz contém rota privada');
check(read('robots.txt').includes('/Receitas-INF1A/sitemap.xml'),'Robots da raiz não aponta para o sitemap canônico');
check(read('robots.txt').includes('/Receitas-INF1A/professor/'),'Robots da raiz não restringe rotas administrativas');
const home=read('public/home.js');
const profile=read('public/profile.js');
const css=read('public/styles.css');
check(!home.includes("element('button','btn danger','Sair')"),'A tela inicial ainda mostra botao Sair');
check(!home.includes("BioAuth.signOut()"),'A tela inicial ainda oferece logout fora do perfil');
check(profile.includes('id="logout"') && profile.includes('BioAuth.signOut()'),'Logout ausente do perfil');
check(/\.logout-wrap\{[^}]*justify-content:flex-end/.test(css),'Logout do perfil nao esta alinhado a direita');
check(read('index.html').includes('home.js?v=4.10.0'),'Home com script em cache antigo');
check(read('index.html').includes('styles.css?v=4.7.0'),'Home com CSS em cache antigo');
check(css.includes('#nav > .btn.danger{display:none!important}'),'Logout antigo da home nao possui bloqueio visual de seguranca');
check(read('perfil/index.html').includes('styles.css?v=4.6.0'),'Perfil com estilos em cache antigo');
const teacher=read('public/teacher.js');
for(const feature of ['teacher_dashboard_snapshot','bulk_assign_students','bulk_group_action','transition_recipe_review','set_checklist_item','save_announcement','soft_delete_recipe','restore_recipe','get_activity_history']){
  check(teacher.includes(feature),`Painel do professor não referencia ${feature}`);
}
const carousel=read('public/home-carousel.js');
check(carousel.includes('AUTO_ADVANCE_MS=4000'),'Carrossel deve passar a cada 4 segundos');
check(carousel.includes('setTimeout(()=>show(index+1,false),Math.max(1,AUTO_ADVANCE_MS-elapsed))'),'Rotacao nao respeita os 4 s restantes');
check(carousel.includes('const FADE_MS=680'),'Crossfade suave ausente');
check(carousel.includes('bio-carousel-timebar-fill'),'Barra de progresso visual ausente');
check(carousel.includes('drawTime(elapsed+performance.now()-startedAt)'),'Progresso visual nao sincronizado');
check(carousel.includes('requestAnimationFrame(tick)'),'Barra de tempo nao atualiza suavemente');
check(carousel.includes("prev.addEventListener('click',()=>move(-1,true))"),'Seta anterior indisponivel');
check(carousel.includes("next.addEventListener('click',()=>move(1,true))"),'Proxima seta indisponivel');
check(carousel.includes('pauseButton.addEventListener'),'Controle de pausa nao encontrado');
check(read('public/home.js').includes('home-carousel.js?v=4.10.0'),'Modulo de carrossel pode estar em cache');
check(read('index.html').includes('home.js?v=4.10.0'),'JS da homepage pode estar em cache');
const collab=read('public/group-collab.js');
for(const name of [...htmlFiles.filter(name=>name.startsWith('grupo-')),'grupo/index.html']){
  check(read(name).includes('group-collab.js?v=4.5.0'),name+': modulo colaborativo ausente');
}
for(const feature of ['set_group_form','add_group_phrase','remove_group_phrase','group:groups(name)']){
  check(collab.includes(feature),'Modulo colaborativo nao referencia '+feature);
}
const group=read('public/group.js');
check(group.includes('GroupCollab.mount'),'Integracao colaborativa ausente');
check(group.includes('save_recipe_versioned'),'Edição de receita sem controle otimista');
check(group.includes('transition_recipe_review'),'Workflow de revisão ausente na página do grupo');
check(group.includes('get_group_page'),'Página de grupo sem bootstrap agregado');
check(group.includes('pageResult.data.viewer'),'Página de grupo ainda depende de uma consulta separada de perfil');
check(group.includes('pageResult.data.announcement'),'Página de grupo ainda depende de uma consulta inicial separada de aviso');
check(!group.includes('BioAuth.profile()'),'Página de grupo ainda carrega perfil fora do bootstrap');
check(!group.includes('location.reload()'),'Página de grupo ainda usa reload completo');
const classroom=read('public/classroom.js');
check(!classroom.includes("table:'recipe_reviews'"),'Listener global desnecessário de revisões');
check(classroom.includes('document.body.dataset.groupSlug'),'Aviso inicial do grupo ainda pode gerar request duplicado');
check(classroom.includes('document.hidden&&clockTimer'),'Relógio continua ativo em aba oculta');
check(read('public/auth.js').includes('group:groups(name,slug)'),'Perfil ainda requer consulta sequencial do grupo');
check(read('public/presentation.js').includes('get_public_classroom_state'),'Modo apresentação sem estado público seguro');
const migrations=readdirSync(new URL('supabase/migrations/',root)).map(name=>read('supabase/migrations/'+name)).join('\n');
for(const required of ['enable row level security','teacher_dashboard_snapshot','private.require_teacher','recipe_reviews','group_checklist','announcements','get_group_page']){
  check(migrations.includes(required),`Migration administrativa não contém ${required}`);
}

for(const required of ['group_phrases','enable row level security','add_group_phrase','remove_group_phrase']){
  check(migrations.includes(required),'Migration compartilhada ausente: '+required);
}
if(failures.length){console.error(failures.join('\n'));process.exit(1)}
console.log(`PASS: ${htmlFiles.length} páginas e metadados estáticos validados.`);
