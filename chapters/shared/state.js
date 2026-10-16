import {GAME_PAIRS} from './arcade-engine.js';
export const SPECS={
 '2026':{key:'archive-exe.chapter.2026.v1',flags:['briefing','header_fixed','sources_checked','chronology','letter','curator','decision','ending'],secrets:['bird_return','extra_chair'],chain:['header_fixed','sources_checked','chronology','curator','decision','ending']},
 '2003':{key:'archive-exe.chapter.2003.v1',flags:['last_message','address_head','address_tail','contact_found','queue_checked','transcript','decision','ending'],secrets:['paperbird','midnight_radio'],chain:['contact_found','queue_checked','transcript','decision','ending']},
 '2007':{key:'archive-exe.chapter.2007.v1',flags:['report','manifest','recovered','request','audit','vault','decision','ending'],secrets:['negative','credits'],chain:['recovered','audit','vault','decision','ending']}
};
export const APP_IDS=['messenger','mail','files','web','investigation','notes','journal','player','game','game2','settings'];
export function freshEpisode(id){if(!SPECS[id])throw Error('Неизвестная глава');return {version:1,chapter:id,started:false,flags:[],secrets:[],read:[],notes:'',replies:{},drafts:{},hints:{},choice:'',finalePage:0,app:id==='2003'?'messenger':'files',settings:{sound:false,volume:.3,reducedMotion:false},record:null,records:{}};}
const strlist=(v,max=200)=>Array.isArray(v)&&v.length<=max&&v.every(x=>typeof x==='string'&&/^[a-z0-9_-]{1,64}$/.test(x));
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v);
export function validateEpisode(raw,id){
 const spec=SPECS[id];if(!spec||!plain(raw)||raw.version!==1||raw.chapter!==id||typeof raw.started!=='boolean')throw Error('Неверный формат или глава сохранения.');
 const s=freshEpisode(id);s.started=raw.started;
 for(const field of ['flags','secrets','read']){if(!strlist(raw[field])||((field==='flags'||field==='secrets')&&raw[field].some(x=>!spec[field].includes(x))))throw Error('Повреждены сюжетные отметки.');s[field]=[...new Set(raw[field])];}
 if(typeof raw.notes!=='string'||raw.notes.length>40000)throw Error('Повреждён блокнот.');s.notes=raw.notes;
 for(const field of ['replies','drafts','hints']){
  if(!plain(raw[field])||Object.keys(raw[field]).length>100)throw Error('Повреждены данные задач.');
  for(const [k,v] of Object.entries(raw[field])){
   if(!/^[a-z0-9_-]{1,64}$/.test(k)||['__proto__','constructor','prototype'].includes(k))throw Error('Неверное поле.');
   if(field==='hints'){if(!Number.isInteger(v)||v<0||v>3)throw Error('Неверная подсказка.');}
   else if(field==='replies'){if(typeof v!=='string'||v.length>64)throw Error('Неверный ответ.');}
   else if(!(typeof v==='string'&&v.length<=100)&&!strlist(v,30))throw Error('Неверное решение.');
   s[field][k]=v;
  }
 }
 const choices={'2003':['','message','wait'],'2007':['','public','private'],'2026':['','leave_note','close_archive']};if(!choices[id].includes(raw.choice))throw Error('Неверный выбор.');s.choice=raw.choice;
 if(!Number.isInteger(raw.finalePage)||raw.finalePage<0||raw.finalePage>3)throw Error('Неверная сцена.');s.finalePage=raw.finalePage;
 if(!APP_IDS.includes(raw.app))throw Error('Неизвестное приложение.');s.app=raw.app;
 if(!plain(raw.settings)||typeof raw.settings.sound!=='boolean'||typeof raw.settings.reducedMotion!=='boolean'||!Number.isFinite(raw.settings.volume)||raw.settings.volume<0||raw.settings.volume>1)throw Error('Повреждены настройки.');
 s.settings={sound:raw.settings.sound,volume:raw.settings.volume,reducedMotion:raw.settings.reducedMotion};
 if(raw.record!==null&&(!Number.isInteger(raw.record)||raw.record<0||raw.record>100000))throw Error('Повреждён рекорд.');s.record=raw.record;
 if(raw.records!==undefined){if(!plain(raw.records)||Object.keys(raw.records).some(k=>!GAME_PAIRS[id].includes(k)))throw Error('Неизвестный игровой рекорд.');for(const [k,v]of Object.entries(raw.records)){if(!Number.isSafeInteger(v)||v<0||v>1000000000)throw Error('Повреждён игровой рекорд.');s.records[k]=v;}}
 // Old single-game records belong to their original games only. Keep 2026's
 // retired Lights Out record in `record`, never turn it into a maze score.
 const oldGame=id==='2003'?'lights':id==='2007'?'slide':null;
 if(oldGame&&s.records[oldGame]===undefined&&s.record!==null)s.records[oldGame]=s.record;

 for(let i=1;i<spec.chain.length;i++)if(s.flags.includes(spec.chain[i])&&!s.flags.includes(spec.chain[i-1]))throw Error('Нарушен порядок сюжетных событий.');
 if(s.flags.includes('decision')&&!s.choice)throw Error('Не сохранён финальный выбор.');
 if(s.flags.includes('ending')&&s.finalePage!==3)throw Error('Финальные сцены не завершены.');
 if(s.finalePage>0&&!s.flags.includes('decision'))throw Error('Финал недоступен.');
 return s;
}
export class EpisodeStore{
 constructor(id,storage){this.id=id;this.storage=storage;this.state=freshEpisode(id);this.blocked=false;this.warning='';try{const raw=storage.getItem(SPECS[id].key);if(raw)this.state=validateEpisode(JSON.parse(raw),id);}catch{this.blocked=true;this.warning='Сохранение не прочитано. Старые данные защищены. Импортируйте резервную копию в настройках.';}}
 save(){if(this.blocked)return false;try{this.storage.setItem(SPECS[this.id].key,JSON.stringify(this.state));this.warning='';return true;}catch{this.warning='Не удалось сохранить. Экспортируйте JSON в настройках перед выходом.';return false;}}
 export(){return JSON.stringify(this.state,null,2);}
 import(text){if(text.length>500000)throw Error('Файл слишком большой.');const next=validateEpisode(JSON.parse(text),this.id);this.storage.setItem(SPECS[this.id].key,JSON.stringify(next));this.state=next;this.blocked=false;this.warning='';}
 reset(){const next=freshEpisode(this.id);this.storage.setItem(SPECS[this.id].key,JSON.stringify(next));this.state=next;this.blocked=false;this.warning='';}
}
export function unlocked(item,state){return (item.requires||[]).every(f=>state.flags.includes(f));}
export class EpisodeStory{
 constructor(store,data){this.store=store;this.data=data;}
 get state(){return this.store.state;}
 has(flag){return this.state.flags.includes(flag);}
 grant(flag){if(!SPECS[this.data.id].flags.includes(flag))throw Error('Неизвестное событие');if(!this.has(flag))this.state.flags.push(flag);this.store.save();}
 read(item){if(!unlocked(item,this.state))return false;if(!this.state.read.includes(item.id))this.state.read.push(item.id);if(item.flag)this.grant(item.flag);if(item.secret&&!this.state.secrets.includes(item.secret))this.state.secrets.push(item.secret);this.store.save();return true;}
 solve(id,answer){const task=this.data.tasks.find(t=>t.id===id);if(!task||!unlocked(task,this.state))return {ok:false,message:'Сначала соберите предыдущие улики.'};if(this.has(task.flag))return {ok:true,message:'Задача уже решена.'};let correct=false;
 if(task.type==='input')correct=String(answer).trim().toLowerCase()===task.answer;
 if(task.type==='select')correct=Array.isArray(answer)&&answer.length===task.answer.length&&new Set(answer).size===answer.length&&task.answer.every(x=>answer.includes(x));
 if(task.type==='order')correct=Array.isArray(answer)&&JSON.stringify(answer)===JSON.stringify(task.answer);
 if(task.type==='radio')correct=answer===task.answer;
 if(!correct)return {ok:false,message:task.error||'Пока не сходится. Сверьте документы или откройте подсказку.'};this.grant(task.flag);return {ok:true,message:task.success};
 }
 hint(id){const task=this.data.tasks.find(t=>t.id===id);if(!task||!unlocked(task,this.state))return '';const count=this.state.hints[id]||0;this.state.hints[id]=Math.min(count+1,3);this.store.save();return task.hints[Math.min(count,2)];}
 choose(id){const last=this.data.tasks.at(-1);if(!this.has(last.flag)||!(this.data.decisionRequires||[]).every(id=>this.state.read.includes(id))||!this.data.choices.some(c=>c.id===id))return false;if(this.has('decision'))return this.state.choice===id;this.state.choice=id;this.grant('decision');return true;}
 nextFinale(){if(!this.has('decision'))return false;if(this.state.finalePage<3){this.state.finalePage++;this.store.save();}else this.grant('ending');return true;}
}
// Optional games use reachable boards, no timing or story gates.
export function toggleLights(board,index){if(!Number.isInteger(index)||index<0||index>8)return [...board];const next=[...board],r=Math.floor(index/3),c=index%3;for(const [dr,dc]of [[0,0],[-1,0],[1,0],[0,-1],[0,1]]){const y=r+dr,x=c+dc;if(y>=0&&y<3&&x>=0&&x<3)next[y*3+x]=!next[y*3+x];}return next;}
export function lightBoard(){let b=Array(9).fill(false);for(const i of [0,4,7])b=toggleLights(b,i);return b;}
export function slide(board,index){const zero=board.indexOf(0);if(!Number.isInteger(index)||index<0||index>8||Math.abs(Math.floor(zero/3)-Math.floor(index/3))+Math.abs(zero%3-index%3)!==1)return [...board];const b=[...board];[b[zero],b[index]]=[b[index],b[zero]];return b;}
export function slideBoard(){let b=[1,2,3,4,5,6,7,8,0];for(const i of [7,4,3,0,1,4,5,8,7,6,3,4])b=slide(b,i);return b;}
