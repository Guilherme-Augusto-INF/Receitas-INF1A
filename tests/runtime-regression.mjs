import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const settle=async()=>{for(let i=0;i<12;i++)await Promise.resolve()};
function node(){return {innerHTML:'',textContent:'',dataset:{},append(){},replaceChildren(){},setAttribute(){},addEventListener(){},classList:{add(){},contains(){return false},toggle(){return true}}}}
function environment(){
  const nodes=new Map(),timers=new Map();let id=0;
  const document={hidden:false,readyState:'complete',currentScript:{src:'https://example.org/public/home.js'},
    querySelector:selector=>{if(!nodes.has(selector))nodes.set(selector,node());return nodes.get(selector)},
    createElement:()=>node(),createDocumentFragment:()=>node(),addEventListener(){},head:node(),body:node(),documentElement:node(),getElementById(){return null}};
  const context={document,location:{href:'https://example.org/'},URL,Intl,Date,console,
    setTimeout:callback=>{timers.set(++id,callback);return id},clearTimeout:key=>timers.delete(key),
    BioUI:{escape:String,friendlyError:()=> 'Falha de conexão',withTimeout:value=>Promise.resolve(value)},
    BioAuth:{profile:async()=>({user:null,profile:null})},Classroom:{subscribe(){}},window:{}};
  return {context,nodes,timers,runTimer(){const entry=timers.entries().next().value;assert.ok(entry,'Timer pendente esperado');timers.delete(entry[0]);entry[1]()}};
}

// An event arriving while the first request is pending must cause a later read.
{
  const env=environment();const pending=[];let onChange,calls=0;
  env.context.sb={rpc:()=>{calls++;return new Promise(resolve=>pending.push(resolve))}};
  env.context.Classroom.subscribe=(_name,_specs,callback)=>{onChange=callback};
  vm.runInNewContext(read('public/home.js'),env.context);
  await settle();assert.equal(calls,1);
  onChange({table:'groups'});env.runTimer();await settle();assert.equal(calls,1);
  pending.shift()({error:new Error('offline')});await settle();
  env.runTimer();await settle();assert.equal(calls,2,'Evento durante loading não pode ser perdido');
  pending.shift()({error:new Error('offline')});await settle();
  assert.equal(env.timers.size,0,'Não deve repetir a leitura sem novos eventos');
}

// A failed session lookup is a retryable error, not proof that the user logged out.
{
  const env=environment();env.context.BioAuth.profile=async()=>({user:null,profile:null,error:new Error('offline')});
  vm.runInNewContext(read('public/profile.js'),env.context);await settle();
  assert.equal(env.context.location.href,'https://example.org/');
  assert.match(env.nodes.get('#profile-app').innerHTML,/Tentar novamente/);
}

// Storage restrictions must not prevent the theme button from being installed.
{
  const env=environment();let button;
  env.context.localStorage={getItem(){throw new Error('blocked')},setItem(){throw new Error('blocked')}};
  env.context.document.body.appendChild=value=>{button=value};
  vm.runInNewContext(read('public/theme.js'),env.context);
  assert.ok(button,'Botão de tema deve existir mesmo sem localStorage');
  assert.doesNotThrow(()=>button.onclick());
}
console.log('PASS: atualização pendente, falha de sessão e tema sem armazenamento.');
