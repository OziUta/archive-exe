import { validateSave as validate1999, SAVE_KEY as LEGACY_KEY } from '../chapters/1999/js/save-manager.js';
import { SPECS, validateEpisode } from '../chapters/shared/state.js';
export { LEGACY_KEY };
export const GAME_KEYS={'1999':LEGACY_KEY,'2003':SPECS['2003'].key,'2007':SPECS['2007'].key,'2026':SPECS['2026'].key};
export const validateGame=(raw,id)=>id==='1999'?validate1999(raw):validateEpisode(raw,id);
export function gameProgress(raw,id){const g=validateGame(raw,id);return {status:g.flags.includes('ending')?'completed':g.started||g.flags.length?'in-progress':'not-started',flags:[...g.flags],secrets:[...g.secrets]};}
export const KEY = 'archive-exe.save.v1';
const validId = x => typeof x === 'string' && /^[a-z0-9][a-z0-9_-]{0,63}$/.test(x) && !['__proto__','constructor','prototype'].includes(x);
const strings = x => Array.isArray(x) && x.length <= 200 && x.every(validId);
export function freshSave(){return {version:1,initialized:false,chapters:{},notes:[],settings:{sound:false,volume:.3,crt:true,reducedMotion:false,scale:100,boot:true}};}
export function validateSave(raw){
  if(!raw || raw.version!==1 || typeof raw.initialized!=='boolean') throw Error('Неизвестная версия сохранения архива.');
  const out=freshSave();out.initialized=raw.initialized;
  if(!raw.chapters || Array.isArray(raw.chapters) || typeof raw.chapters!=='object' || Object.keys(raw.chapters).length>100) throw Error('Некорректные главы.');
  for(const [id,p] of Object.entries(raw.chapters)){
    if(!validId(id)||!p||!['not-started','in-progress','completed'].includes(p.status)||!strings(p.flags)||!strings(p.secrets))throw Error('Некорректный прогресс главы.');
    out.chapters[id]={status:p.status,flags:[...new Set(p.flags)],secrets:[...new Set(p.secrets)]};
  }
  if(!Array.isArray(raw.notes)||raw.notes.length>300)throw Error('Некорректный журнал.');
  const ids=new Set();
  out.notes=raw.notes.map(n=>{
    if(!n||!validId(n.id)||ids.has(n.id)||!(n.chapter===''||validId(n.chapter))||typeof n.title!=='string'||!n.title.trim()||n.title.length>120||typeof n.text!=='string'||n.text.length>20000||!Number.isFinite(n.updated)||n.updated<0||n.updated>8640000000000000)throw Error('Некорректная запись журнала.');
    ids.add(n.id);return {id:n.id,chapter:n.chapter==='unknown'?'2026':n.chapter,title:n.title,text:n.text,updated:n.updated};
  });
  const s=raw.settings;if(!s)throw Error('Отсутствуют настройки.');
  for(const k of ['sound','crt','reducedMotion','boot']){if(typeof s[k]!=='boolean')throw Error('Некорректные настройки.');out.settings[k]=s[k];}
  for(const [k,min,max] of [['volume',0,1],['scale',85,120]]){if(!Number.isFinite(s[k])||s[k]<min||s[k]>max)throw Error('Некорректные настройки.');out.settings[k]=s[k];}
  return out;
}
export function progress1999(raw){
  const game=validate1999(raw);
  return {status:game.flags.includes('ending')?'completed':game.started||game.flags.length>0?'in-progress':'not-started',flags:[...game.flags],secrets:[...game.secrets]};
}
export function parseImport(text,current=freshSave()){
  if(text.length>2000000)throw Error('Файл больше 2 МБ.');
  const raw=JSON.parse(text);
  if(raw && raw.version===1 && Array.isArray(raw.flags)){
    const id=raw.chapter||'1999';if(!Object.hasOwn(GAME_KEYS,id))throw Error('Неизвестная глава.');
    const game=validateGame(raw,id),archive=validateSave(current);archive.chapters[id]=gameProgress(game,id);
    return {archive,game,legacy:true,chapterId:id,chapterSaves:{[id]:game}};
  }
  if(raw?.format!=='archive-exe'||![1,2,3].includes(raw.version)||!raw.chapterSaves||typeof raw.chapterSaves!=='object'||Array.isArray(raw.chapterSaves))throw Error('Это не сохранение ARCHIVE.exe или одной из глав.');
  if(Object.keys(raw.chapterSaves).some(k=>!Object.hasOwn(GAME_KEYS,k)))throw Error('В этой версии нет адаптера для одной из глав.');
  const archive=validateSave(raw.archive),chapterSaves={};
  for(const id of Object.keys(GAME_KEYS)){
    if(!Object.hasOwn(raw.chapterSaves,id)){
      if(raw.version===3||(raw.version===2&&id!=='2026')||id==='1999')throw Error('В файле отсутствует состояние главы '+id+'.');
      // An old v1/v2 bundle must not erase progress made in newly added chapters.
      if(current.chapters[id])archive.chapters[id]=structuredClone(current.chapters[id]);
      continue;
    }
    const game=raw.chapterSaves[id]===null?null:validateGame(raw.chapterSaves[id],id);
    chapterSaves[id]=game;
    if(game)archive.chapters[id]=gameProgress(game,id);
    else if(archive.chapters[id]?.status&&archive.chapters[id].status!=='not-started')throw Error('В файле нет игрового сохранения главы '+id+'.');
  }
  return {archive,game:chapterSaves['1999'],legacy:false,chapterSaves};
}
export class ArchiveStore {
  constructor(storage){
    this.storage=storage;this.state=freshSave();this.warning='';this.blocked=false;
    try{const raw=storage.getItem(KEY);if(raw)this.state=validateSave(JSON.parse(raw));}
    catch{this.blocked=true;this.warning='Сохранение архива недоступно или повреждено. Оно не перезаписано. Восстановите JSON в настройках.';}
  }
  save(){
    if(this.blocked)return false;
    try{this.storage.setItem(KEY,JSON.stringify(this.state));this.warning='';return true;}
    catch{this.warning='Автосохранение недоступно. Экспортируйте JSON перед закрытием страницы.';return false;}
  }
  readGame(id='1999'){const raw=this.storage.getItem(GAME_KEYS[id]);return raw?validateGame(JSON.parse(raw),id):null;}
  sync(){
    let changed=false;const errors=[];
    for(const id of Object.keys(GAME_KEYS)){
      try{const game=this.readGame(id);if(game||this.state.chapters[id]){const p=game?gameProgress(game,id):{status:'not-started',flags:[],secrets:[]};if(JSON.stringify(p)!==JSON.stringify(this.state.chapters[id])){this.state.chapters[id]=p;changed=true;}}}
      catch{errors.push(id+'.exe');if(this.state.chapters[id]){this.state.chapters[id]={status:'not-started',flags:[],secrets:[]};changed=true;}}
    }
    if(changed)this.save();
    if(errors.length)this.warning='Сохранение '+errors.join(', ')+' не прочитано. Исходные данные сохранены без изменений.';
    return this.state;
  }
  export(){const chapterSaves={};for(const id of Object.keys(GAME_KEYS))chapterSaves[id]=this.readGame(id);this.sync();return JSON.stringify({format:'archive-exe',version:3,exportedAt:new Date().toISOString(),archive:this.state,chapterSaves},null,2);}
  transaction(archive,games){
    const changes=Object.entries(games).map(([id,game])=>[GAME_KEYS[id],game===null?null:JSON.stringify(game)]);
    changes.push([KEY,JSON.stringify(archive)]);
    const before=changes.map(([key])=>[key,this.storage.getItem(key)]);
    try{for(const [key,value]of changes){if(value===null)this.storage.removeItem(key);else this.storage.setItem(key,value);}}
    catch{
      try{for(const [key,value]of before.reverse()){if(value===null)this.storage.removeItem(key);else this.storage.setItem(key,value);}}
      catch{throw Error('Браузер отказал в записи и восстановлении. Импортируйте резервную копию после освобождения места.');}
      throw Error('Браузер отказал в записи. Предыдущее сохранение восстановлено.');
    }
    this.state=archive;this.blocked=false;this.warning='';this.sync();
  }
  import(parsed){const games={};for(const [id,game]of Object.entries(parsed.chapterSaves)){if(!Object.hasOwn(GAME_KEYS,id))throw Error('Неизвестная глава.');games[id]=game===null?null:validateGame(game,id);}this.transaction(validateSave(parsed.archive),games);}
  reset(){this.transaction(freshSave(),Object.fromEntries(Object.keys(GAME_KEYS).map(id=>[id,null])));}
}
