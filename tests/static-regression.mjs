import{readFileSync,readdirSync}from'node:fs';
import{join}from'node:path';

const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const htmlFiles=['index.html','404.html','login/index.html','perfil/index.html','professor/index.html',...readdirSync(new URL('.',root)).filter(name=>/^grupo-[1-6]$/.test(name)).map(name=>join(name,'index.html'))];
const failures=[];
const check=(condition,message)=>{if(!condition)failures.push(message)};

for(const file of htmlFiles){
  const html=read(file);
  check(!html.includes('Receitas-INF1A-02'),`${file}: referência ao repositório antigo`);
  check(html.includes('Content-Security-Policy'),`${file}: CSP ausente`);
  check(!/<script(?![^>]+src=)/i.test(html),`${file}: script inline encontrado`);
  check(!/\?v=(?!3\.0\.0)/.test(html),`${file}: cache busting inconsistente`);
}
for(const file of ['login/index.html','perfil/index.html','professor/index.html']){
  check(/name="robots" content="noindex,nofollow"/.test(read(file)),`${file}: noindex ausente`);
}
const repoText=[...htmlFiles.map(read),...readdirSync(new URL('public/',root)).filter(name=>/\.(js|css|txt|xml|svg)$/.test(name)).map(name=>read('public/'+name))].join('\n');
check(!/service_role|sb_secret_|JWT_SECRET|SUPABASE_DB_PASSWORD/.test(repoText),'Possível segredo encontrado no frontend');
check(!repoText.includes('Receitas-INF1A-02'),'Referência antiga encontrada');
check(read('public/sitemap.xml').includes('/Receitas-INF1A/grupo-6/'),'Sitemap incompleto');
check(!/login|perfil|professor/.test(read('public/sitemap.xml')),'Sitemap contém rota privada');

if(failures.length){console.error(failures.join('\n'));process.exit(1)}
console.log(`PASS: ${htmlFiles.length} páginas e metadados estáticos validados.`);
