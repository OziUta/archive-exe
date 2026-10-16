import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {EpisodeStore,EpisodeStory,SPECS,freshEpisode} from '../chapters/shared/state.js';
import {ArchiveStore,parseImport,freshSave,validateSave,GAME_KEYS} from '../js/save-manager.js';
import {supportURL,shareDetails,initSupport} from '../js/support.js';
import {archiveNarrative} from '../js/archive-narrative.js';
import {stats} from '../js/chapter-manager.js';
const json=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const d=json('chapters/2026/data/episode.json');
function memory(){const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};}
test('v2 import retains final chapter bytes while importing the three supported states',()=>{
 const m=memory(),a=new ArchiveStore(m),s=new EpisodeStore('2026',m);s.state.started=true;s.state.notes='Последний рабочий стол';s.save();a.sync();
 const before=m.getItem(SPECS['2026'].key),v2={format:'archive-exe',version:2,archive:freshSave(),chapterSaves:{'1999':null,'2003':freshEpisode('2003'),'2007':null}};
 a.import(parseImport(JSON.stringify(v2),a.state));assert.equal(m.getItem(SPECS['2026'].key),before);assert.equal(a.state.chapters['2026'].status,'in-progress');
 assert.equal(JSON.parse(a.export()).version,3);assert.equal(Object.keys(JSON.parse(a.export()).chapterSaves).length,4);
 delete v2.chapterSaves['2007'];assert.throws(()=>parseImport(JSON.stringify(v2)));
 const v3=JSON.parse(a.export());delete v3.chapterSaves['2026'];assert.throws(()=>parseImport(JSON.stringify(v3)));
});
test('Existing journal entries for unknown image attach to final chapter',()=>{const s=freshSave();s.notes=[{id:'note',chapter:'unknown',title:'R-04',text:'Дата?',updated:1}];assert.equal(validateSave(s).notes[0].chapter,'2026');assert.equal(s.notes[0].chapter,'unknown');});
test('Final content has evidence for each solution and preserves first chapter discovery date',()=>{
 assert.equal(d.tasks.length,4);assert.equal(d.ending.length,4);assert.equal(d.choices.length,2);
 const f=id=>d.files.find(f=>f.id===id).text;
 for(const clue of ['R-04','27'])assert.ok(f('service_label').includes(clue));
 for(const clue of ['A-99 → 6F','N-03 → B2','V-07 → 8C'])assert.ok(f('transfer_rules').includes(clue));
 for(const clue of ['21.03.2007','10.10.2026','11.10.2026','12.10.2026'])assert.ok(f('import_log').includes(clue));
 assert.ok(f('curator_letter').includes('Меня зовут Нина'));assert.ok(f('receipt_1999').includes('Раньше его никто'));assert.ok(f('r04_passport').includes('Ни личных писем, ни фотографий'));
 for(const task of d.tasks)for(const flag of task.requires)assert.ok(SPECS['2026'].flags.includes(flag));
 for(const id of d.decisionRequires)assert.ok(d.files.some(f=>f.id===id));
});
test('Solving final chapter does not silently complete other chapters',()=>{
 const m=memory(),s=new EpisodeStory(new EpisodeStore('2026',m),d),a=new ArchiveStore(m);
 for(const task of d.tasks){for(const flag of task.requires)if(!s.has(flag)){const doc=[...d.files,...d.emails].find(f=>f.flag===flag);if(doc)s.read(doc);}assert.equal(s.solve(task.id,task.answer).ok,true);}
 for(const id of d.decisionRequires)s.read(d.files.find(f=>f.id===id));s.choose('close_archive');for(let i=0;i<4;i++)s.nextFinale();a.sync();
 const counts=stats(json('data/chapters.json'),json('data/artifacts.json'),a.state);assert.equal(counts.completed,1);assert.equal(counts.available,1);for(const id of ['1999','2003','2007'])assert.equal(a.readGame(id),null);
 assert.match(archiveNarrative(a.state),/непройденные/);
 for(const id of ['1999','2003','2007'])a.state.chapters[id]={status:'completed',flags:['ending'],secrets:[]};assert.match(archiveNarrative(a.state),/Все четыре/);
 assert.doesNotMatch(archiveNarrative(freshSave()),/Нина|Роман/);
});
test('Donation URL config only permits explicit HTTPS destinations',()=>{
 for(const bad of ['',null,undefined,'javascript:alert(1)','data:text/html,abc','//example.org','http://example.org','https://user:pass@example.org','not a link'])assert.equal(supportURL(bad),'');
 assert.equal(supportURL(' https://example.org/support?project=archive '),'https://example.org/support?project=archive');
 assert.equal(json('data/support.json').supportUrl,'');
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.match(html,/<header class="topbar">[\s\S]*?id="support-project"[\s\S]*?Поддержать проект[\s\S]*?<\/header>/);
});
test('Share invitation respects published subpath and removes session query and hash',()=>{
 const got=shareDetails({},'https://example.org/archive-exe/index.html?secret=discard#settings');assert.equal(got.url,'https://example.org/archive-exe/');
 assert.equal(shareDetails({projectUrl:'https://example.org/game/'},'http://localhost:8080').url,'https://example.org/game/');
 for(const loc of ['file:///tmp/index.html','http://localhost:8080','http://127.0.0.1:8080','http://[::1]:8080'])assert.equal(shareDetails({},loc).url,undefined);
});
test('Support button opens a useful dialog even when config cannot load; clipboard failure selects text',async()=>{
 // Minimal DOM fixture exercises real support handlers; no browser rendering is claimed.
 const names=['document','fetch','location','navigator','setTimeout','clearTimeout'];const previous=Object.fromEntries(names.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 let shown=0,selected=0,copied='';const elements=new Map();
 for(const id of ['support-project','modal-title','modal-body','copy-project','share-project','support-copy-text','toast'])elements.set('#'+id,{textContent:'',innerHTML:'',focus(){},select(){selected++;}});
 elements.set('#modal',{open:false,showModal(){this.open=true;shown++;},append(){}});
 const install=(k,v)=>Object.defineProperty(globalThis,k,{value:v,writable:true,configurable:true});
 try{
  install('document',{querySelector:s=>elements.get(s)||null,body:{append(){}}});install('fetch',async()=>{throw Error('offline');});install('location',{href:'https://example.org/game/'});install('navigator',{clipboard:{writeText:async v=>{copied=v;}}});install('setTimeout',()=>0);install('clearTimeout',()=>{});
  initSupport();await Promise.resolve();await Promise.resolve();elements.get('#support-project').onclick();assert.equal(shown,1);assert.match(elements.get('#modal-body').innerHTML,/Пока поддержать проект/);
  await elements.get('#copy-project').onclick();assert.ok(copied.includes('https://example.org/game/'));
  navigator.clipboard.writeText=async()=>{throw Error('denied');};await elements.get('#copy-project').onclick();assert.equal(selected,1);
 }finally{for(const k of names){if(previous[k])Object.defineProperty(globalThis,k,previous[k]);else delete globalThis[k];}}
});
