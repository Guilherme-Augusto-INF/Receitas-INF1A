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
  check(!/\?v=(?!4\.[012]\.0)/.test(html),`${file}: cache busting inconsistente`);
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
const teacher=read('public/teacher.js');
for(const feature of ['teacher_dashboard_snapshot','bulk_assign_students','bulk_group_action','transition_recipe_review','set_checklist_item','save_announcement','soft_delete_recipe','restore_recipe','get_activity_history']){
  check(teacher.includes(feature),`Painel do professor não referencia ${feature}`);
}
const group=read('public/group.js');
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

if(failures.length){console.error(failures.join('\n'));process.exit(1)}
console.log(`PASS: ${htmlFiles.length} páginas e metadados estáticos validados.`);
