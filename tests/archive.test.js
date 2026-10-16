import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {ArchiveStore,KEY,LEGACY_KEY,freshSave,validateSave,parseImport,progress1999} from '../js/save-manager.js';
import {SaveManager,freshSave as freshGame} from '../chapters/1999/js/save-manager.js';
import {Story} from '../chapters/1999/js/story.js';
import {midnight} from '../chapters/1999/js/apps/system.js';
import {saveNote,removeNote} from '../js/journal.js';
import {stats,isUnlocked,chapterState,safePath} from '../js/chapter-manager.js';
import {esc} from '../js/ui.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const chapters=read('data/chapters.json'),artifacts=read('data/artifacts.json'),timeline=read('data/timeline.json'),storyData=read('chapters/1999/data/story.json');
function memory(){const map=new Map();return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};}
test('Opening archive or unstarted chapter does not mark completion or start',()=>{
 const storage=memory(),a=new ArchiveStore(storage);a.sync();assert.equal(a.state.chapters['1999'],undefined);
 const game=new SaveManager(storage);game.save();a.sync();assert.equal(a.state.chapters['1999'].status,'not-started');assert.equal(stats(chapters,artifacts,a.state).completed,0);
 assert.ok(artifacts.every(x=>!isUnlocked(x,a.state)));assert.ok(timeline.filter(x=>x.flag).every(x=>!isUnlocked(x,a.state)));
});
test('Full story events plus actual final-screen button handlers update global archive only at the ending',()=>{
 const storage=memory(),game=new SaveManager(storage),a=new ArchiveStore(storage),s=new Story(game,storyData);
 game.state.started=true;game.save();a.sync();assert.equal(a.state.chapters['1999'].status,'in-progress');
 for(const event of ['letter','diary','chat','rehearsal'])s.event(event);
 assert.equal(s.unlockArchive('MAYAK2347'),true);s.event('site');assert.equal(s.unlockProgram('1986'),true);
 a.sync();assert.equal(a.state.chapters['1999'].status,'in-progress');assert.equal(stats(chapters,artifacts,a.state).artifacts,3);
 // Minimal DOM fixture invokes real midnight view handlers. This is not browser rendering.
 const elements=new Map();const body={html:'',set innerHTML(v){this.html=v;elements.clear();for(const m of v.matchAll(/data-([a-z-]+)/g))elements.set('[data-'+m[1]+']',{});},querySelector:selector=>elements.get(selector)||null};
 let applied=0,closed=false,journal=false;
 const ctx={story:s,data:{story:storyData},applySettings:()=>applied++,wm:{close:()=>closed=true},open:id=>journal=id==='journal'};
 midnight(ctx,body);
 for(let page=0;page<4;page++){assert.ok(body.html.includes(storyData.ending[page].title));assert.equal(s.has('ending'),false);body.querySelector('[data-next]').onclick();}
 assert.equal(s.has('ending'),true);assert.equal(applied,1);a.sync();assert.equal(a.state.chapters['1999'].status,'completed');assert.equal(stats(chapters,artifacts,a.state).completed,1);
 assert.ok(timeline.filter(x=>x.flag==='ending'&&x.chapter==='1999').every(x=>isUnlocked(x,a.state)));
 body.querySelector('[data-desktop]').onclick();assert.ok(closed&&journal);
 assert.equal(new ArchiveStore(storage).state.chapters['1999'].status,'completed');
 assert.equal(new SaveManager(storage).state.flags.includes('ending'),true);
});
test('Legacy save is read without changing bytes, keys, records, settings, or notes',()=>{
 const storage=memory(),game=freshGame();game.started=true;game.flags=['letter'];game.notes='Прежний блокнот';game.records.snake=17;game.settings.theme='summer';
 const bytes=JSON.stringify(game);storage.setItem(LEGACY_KEY,bytes);const a=new ArchiveStore(storage);a.sync();assert.equal(storage.getItem(LEGACY_KEY),bytes);assert.equal(a.state.chapters['1999'].status,'in-progress');
});
test('Bundle round trip transfers both archive and the complete legacy game to another origin',()=>{
 const first=memory(),a=new ArchiveStore(first),game=freshGame();game.started=true;game.flags=['letter','diary'];game.notes='Пароль записан';game.records.snake=40;game.secrets=['cat'];first.setItem(LEGACY_KEY,JSON.stringify(game));
 saveNote(a.state,{chapter:'1999',title:'Версия',text:'Сравнить даты'});a.sync();a.save();
 const file=a.export(),second=memory(),b=new ArchiveStore(second);b.import(parseImport(file));
 assert.deepEqual(b.state,a.state);assert.deepEqual(new SaveManager(second).state,game);assert.equal(stats(chapters,artifacts,b.state).secrets,1);
});
test('Standalone 1999 JSON import preserves global journal and settings',()=>{
 const a=new ArchiveStore(memory());saveNote(a.state,{chapter:'',title:'Оставить',text:'Текст'});a.state.settings.scale=110;
 const game=freshGame();game.flags=['letter'];const parsed=parseImport(JSON.stringify(game),a.state);assert.equal(parsed.legacy,true);a.import(parsed);
 assert.equal(a.state.notes.length,1);assert.equal(a.state.settings.scale,110);assert.equal(a.readGame().flags[0],'letter');
});
test('Empty archive bundle round trip does not fabricate a chapter save',()=>{
 const a=new ArchiveStore(memory()),b=new ArchiveStore(memory());b.import(parseImport(a.export()));assert.equal(b.readGame(),null);assert.deepEqual(b.state,a.state);
});
test('Malformed, oversized, unsupported and inconsistent imports cannot mutate saved data',()=>{
 const storage=memory(),a=new ArchiveStore(storage);a.save();const before=storage.getItem(KEY);
 const bundle=JSON.parse(a.export());bundle.archive.chapters['1999']={status:'completed',flags:['ending'],secrets:[]};
 for(const text of ['{','null','{}','x'.repeat(2000001),JSON.stringify({...JSON.parse(a.export()),version:4}),JSON.stringify(bundle),JSON.stringify({...JSON.parse(a.export()),chapterSaves:{evil:{}}})])assert.throws(()=>parseImport(text));
 assert.equal(storage.getItem(KEY),before);
 const wrong=freshSave();wrong.notes=[{id:'a',chapter:'',title:'a',text:'a',updated:NaN}];assert.throws(()=>validateSave(wrong));
});
test('Corrupted archive and corrupted legacy state are preserved until deliberate restore',()=>{
 const storage=memory();storage.setItem(KEY,'{bad');storage.setItem(LEGACY_KEY,'{badgame');const a=new ArchiveStore(storage);a.sync();assert.ok(a.warning);assert.equal(a.save(),false);assert.equal(storage.getItem(KEY),'{bad');assert.equal(storage.getItem(LEGACY_KEY),'{badgame');
});
test('Import rollback preserves both previous saves on a partial write failure',()=>{
 const storage=memory(),a=new ArchiveStore(storage);a.save();const game=freshGame();game.notes='Не терять';storage.setItem(LEGACY_KEY,JSON.stringify(game));const oldGlobal=storage.getItem(KEY),oldGame=storage.getItem(LEGACY_KEY);const set=storage.setItem;let fail=true;
 storage.setItem=(k,v)=>{if(k===KEY&&fail){fail=false;throw Error('quota');}set(k,v);};const next=freshGame();next.notes='Новое';assert.throws(()=>a.import(parseImport(JSON.stringify(next),a.state)),/восстановлено/);assert.equal(storage.getItem(KEY),oldGlobal);assert.equal(storage.getItem(LEGACY_KEY),oldGame);
});
test('Journal creation, editing, filtering identity, deletion, bounds and reload',()=>{
 const storage=memory(),a=new ArchiveStore(storage);const n=saveNote(a.state,{title:' Первая ',text:'Дата\nИмя',chapter:'1999'},1000);assert.equal(n.title,'Первая');
 saveNote(a.state,{id:n.id,title:'Вторая',text:'Новая версия',chapter:'2003'},2000);assert.equal(a.state.notes.length,1);a.save();const b=new ArchiveStore(storage);assert.equal(b.state.notes[0].chapter,'2003');assert.equal(b.state.notes[0].updated,2000);
 assert.throws(()=>saveNote(b.state,{title:' ',text:'',chapter:''}));assert.throws(()=>saveNote(b.state,{title:'a',text:'x'.repeat(20001),chapter:''}));removeNote(b.state,n.id);assert.equal(b.state.notes.length,0);
});
test('Reset only touches this archive and original game keys',()=>{
 const storage=memory();storage.setItem('other-project','keep');const a=new ArchiveStore(storage);a.import(parseImport(JSON.stringify(freshGame()),a.state));a.reset();assert.equal(storage.getItem('other-project'),'keep');assert.equal(storage.getItem(LEGACY_KEY),null);assert.deepEqual(a.state,freshSave());
});
test('Configuration controls launch eligibility and supports new chapter paths',()=>{
 const state=freshSave();assert.equal(chapterState({id:'future',status:'soon'},state),'soon');assert.equal(chapters[1].status,'available');assert.equal(chapters[2].status,'available');assert.ok(chapters[1].path);assert.ok(chapters[2].path);assert.equal(chapters[3].status,'available');assert.ok(chapters[3].path);
 assert.equal(chapterState({id:'2011',status:'available'},state),'not-started');assert.ok(safePath('chapters/2011/index.html'));for(const p of ['https://example.com','//evil','../index.html','/absolute','javascript:alert(1)'])assert.equal(safePath(p),false);
});
test('Artifact text is taken verbatim from real first chapter documents',()=>{
 const mail=read('chapters/1999/data/emails.json'),files=read('chapters/1999/data/filesystem.json');assert.equal(artifacts[0].text,mail.find(m=>m.event==='letter').body);assert.equal(artifacts[1].text,storyData.rehearsal);assert.equal(artifacts[2].text,files.find(f=>f.event==='diary').text);
});
test('Untrusted journal text is escaped before HTML interpolation',()=>{assert.equal(esc('<script>"\'&'), '&lt;script&gt;&quot;&#39;&amp;');});
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
test('All new JS parses and relative module / HTML resources resolve in a repository subfolder',()=>{
 const files=walk(root).filter(f=>!f.includes('/chapters/'));for(const f of files.filter(f=>f.endsWith('.js'))){assert.equal(spawnSync(process.execPath,['--check',f]).status,0,f);for(const m of fs.readFileSync(f,'utf8').matchAll(/(?:from\s*|import\s*\()\s*['"](\.[^'"]+)['"]/g)){assert.ok(fs.existsSync(path.resolve(path.dirname(f),m[1])),m[1]);assert.ok(new URL(m[1],new URL(path.relative(root,f),'https://example.test/archive-repo/')).pathname.startsWith('/archive-repo/'));}}
 for(const f of ['index.html','chapters/1999/index.html','chapters/1999/home.html']){for(const m of fs.readFileSync(path.join(root,f),'utf8').matchAll(/(?:src|href)="([^"]+)"/g)){if(m[1].startsWith('#'))continue;assert.ok(!m[1].startsWith('/'));assert.ok(fs.existsSync(path.resolve(root,path.dirname(f),m[1])),f+':'+m[1]);assert.ok(new URL(m[1],new URL(f,'https://example.test/archive-repo/')).pathname.startsWith('/archive-repo/'));}}
 for(const c of chapters){assert.ok(fs.existsSync(path.join(root,c.image)));if(c.status==='available')assert.ok(fs.existsSync(path.join(root,c.path)));}for(const a of artifacts)assert.ok(fs.existsSync(path.join(root,a.image)));
});
