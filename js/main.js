import {archiveNarrative} from './archive-narrative.js';
import {initSupport} from './support.js';
import {ArchiveStore,parseImport,KEY,GAME_KEYS} from './save-manager.js';
import {chapterState,chapterAccess,statusLabel,isUnlocked,stats,safePath} from './chapter-manager.js';
import {saveNote,removeNote} from './journal.js';
import {applySettings,clickSound} from './settings.js';
import {openArtifacts} from './artifact-manager.js';
import {$,esc,modal,confirmAction,download,toast} from './ui.js';
let store,chapters,artifacts,timeline,filter='all',noteFilter='all',timeFilter='all';
const compared=new Set();
const sectionNames={catalog:'КАТАЛОГ ОБРАЗОВ',collection:'МОЙ АРХИВ',journal:'ЖУРНАЛ',timeline:'ХРОНОЛОГИЯ',settings:'НАСТРОЙКИ'};
const heading=(tag,title,text)=>`<div class="page-heading"><p class="eyebrow">${tag}</p><h1>${title}</h1><p>${text}</p></div>`;
const options=(selected,all=false)=>`${all?'<option value="all">Все главы</option>':'<option value="">Общее расследование</option>'}${chapters.map(c=>`<option value="${c.id}" ${selected===c.id?'selected':''}>${esc(c.title)} — ${esc(c.subtitle)}</option>`).join('')}`;
function warning(){const e=$('#storage-warning');e.textContent=store.warning;e.hidden=!store.warning;}
function persist(message){const ok=store.save();warning();if(message)toast(ok?message:store.warning||'Изменение доступно только в этой сессии.');return ok;}
function chapterCard(c){
 const status=chapterState(c,store.state),first=c.status==='available'&&chapterAccess(c.id,store.state).allowed,p=store.state.chapters[c.id];
 const milestones=c.milestones||['ending'];
 const progress=status==='completed'?100:Math.round(milestones.filter(f=>p?.flags.includes(f)).length/milestones.length*100);
 return `<article class="chapter-card ${c.id==='1999'?'featured':first?'playable':'locked'} ${c.status==='unknown'?'damaged':''}"><div class="card-top"><span>ОБРАЗ / ${c.number}</span><span class="status ${first?'available':''}">${first?'<i class="signal"></i> ':''}${first?'ДОСТУПЕН':status==='locked'?'ЗАКРЫТ':c.status==='soon'?'СКОРО':'НЕТ ДАННЫХ'}</span></div><div class="computer-art"><div class="orbit"></div><span class="art-year" aria-hidden="true">${c.year}</span><img src="${esc(c.image)}" alt="${c.year==='1999'?'Старый бежевый компьютер с зелёным экраном':c.year==='2003'?'Серебристый компьютер начала 2000-х':c.year==='2007'?'Ноутбук 2007 года':'Рабочая станция составителя архива'}"></div><div class="card-info"><p class="eyebrow">${c.number} / ${first?'ВОССТАНОВЛЕННЫЙ ОБРАЗ':'ЗАКРЫТЫЙ ОБРАЗ'}</p><h2>${esc(c.title)}</h2><h3>${esc(c.subtitle)}</h3><p class="description">${esc(c.description)}</p><p class="card-meta">${esc(c.meta)}</p>${first?`<div class="chapter-progress"><span>${statusLabel[status]}</span><span>${progress}% сюжета</span></div><div class="meter" role="progressbar" aria-label="Прогресс сюжета ${esc(c.title)}" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"><i style="width:${progress}%"></i></div><a class="primary launch" href="${esc(c.path)}">${status==='not-started'?'Начать исследование':status==='completed'?'Вернуться в главу':'Продолжить исследование'} <span>↗</span></a>`:`<div class="locked-label"><span>⌑</span> ${status==='locked'?'Сначала завершите '+esc(chapterAccess(c.id,store.state).required)+'.exe':c.status==='soon'?'Ожидается поступление архива':'Восстановление невозможно'}</div>`}</div></article>`;
}
function catalog(){
 const s=stats(chapters,artifacts,store.state),ended=chapters.some(c=>store.state.chapters[c.id]?.status==='completed');
 $('#view').innerHTML=heading('ОБНАРУЖЕНО '+String(chapters.length).padStart(2,'0')+' ЗАПИСИ / ДОСТУПНО '+String(s.available).padStart(2,'0'),'Прошлое осталось на диске.','Время стирает воспоминания. Но не все файлы исчезают навсегда.')+`<div class="intro-line"><span class="signal"></span><span>Проходите истории по порядку. Каждый завершённый сюжет открывает следующий образ.</span></div><div class="catalog-tools"><div class="tabs" aria-label="Фильтр глав"><button data-filter="all" aria-pressed="${filter==='all'}">Все образы <small>${chapters.length.toString().padStart(2,'0')}</small></button><button data-filter="available" aria-pressed="${filter==='available'}">Доступные <small>${s.available.toString().padStart(2,'0')}</small></button></div><span class="view-label">▦ &nbsp; РЕЕСТР ОБРАЗОВ</span></div><div class="chapter-grid">${chapters.filter(c=>filter==='all'||(c.status==='available'&&chapterAccess(c.id,store.state).allowed)).map(chapterCard).join('')}</div><div class="overview"><div><span class="eyebrow">ВОССТАНОВЛЕНО ИСТОРИЙ</span><strong>${String(s.completed).padStart(2,'0')} <small>/ ${String(s.total).padStart(2,'0')}</small></strong></div><div><span class="eyebrow">НАЙДЕНО АРТЕФАКТОВ</span><strong>${String(s.artifacts).padStart(2,'0')} <small>/ ${String(artifacts.length).padStart(2,'0')}</small></strong></div><div><span class="eyebrow">ОТКРЫТО СЕКРЕТОВ</span><strong>${String(s.secrets).padStart(2,'0')}</strong></div><a href="#journal">Записать наблюдение <span>↗</span></a></div><div class="archive-note"><span class="note-icon">${ended?'⌁':'i'}</span><div><p class="eyebrow">${ended?'НОВАЯ ЗАПИСЬ / ПРОТОКОЛ АРХИВИСТА':'ПРОТОКОЛ ИССЛЕДОВАТЕЛЯ'}</p><p>${esc(archiveNarrative(store.state))}</p>${ended?'<small>Запись платформы ARCHIVE.exe. Не является документом внутри глав.</small>':''}</div></div>`;
 document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;catalog();});
}
function collection(){
 const found=artifacts.filter(a=>isUnlocked(a,store.state));
 $('#view').innerHTML=heading('ЛИЧНОЕ ХРАНИЛИЩЕ / '+String(found.length).padStart(2,'0')+' НАХОДКИ','Мой архив','Документы, которые вы успели вернуть из прошлого.')+`<div class="section-toolbar"><span class="muted">${found.length? 'Выберите две находки, чтобы прочитать их рядом.':'Открывайте документы в доступных главах. Найденное появится здесь.'}</span><button id="compare" ${compared.size!==2?'disabled':''}>Сопоставить <span id="compare-count">${compared.size}/2</span></button></div><div class="artifact-grid">${artifacts.map((a,i)=>isUnlocked(a,store.state)?`<article class="artifact-card"><div class="artifact-visual"><img src="${esc(a.image)}" alt="Иллюстрация документа: ${esc(a.kind)}"><span>ОБЪЕКТ ${String(i+1).padStart(2,'0')}</span></div><p class="eyebrow">${esc(a.kind)} / ${esc(a.chapter)}.EXE</p><h2>${esc(a.title)}</h2><p class="muted">${esc(a.description)}</p><div class="artifact-actions"><button data-artifact="${a.id}">Открыть ↗</button><label><input type="checkbox" data-compare="${a.id}" ${compared.has(a.id)?'checked':''}> Сравнить</label></div></article>`:`<article class="artifact-card unknown-artifact"><div class="artifact-visual"><span class="unknown-symbol">?</span></div><p class="eyebrow">ОБЪЕКТ ${String(i+1).padStart(2,'0')} / НЕ ОБНАРУЖЕН</p><h2>Неизвестный документ</h2><p class="muted">Содержимое откроется во время исследования ${esc(a.chapter)}.exe.</p><span class="locked-label">⌑ Данные скрыты</span></article>`).join('')}</div>`;
 document.querySelectorAll('[data-artifact]').forEach(b=>b.onclick=()=>openArtifacts([b.dataset.artifact],artifacts,store.state));
 document.querySelectorAll('[data-compare]').forEach(b=>b.onchange=()=>{if(b.checked&&compared.size>=2){b.checked=false;toast('Для сравнения выберите не больше двух находок.');return;}b.checked?compared.add(b.dataset.compare):compared.delete(b.dataset.compare);$('#compare').disabled=compared.size!==2;$('#compare-count').textContent=compared.size+'/2';});
 $('#compare').onclick=()=>openArtifacts([...compared],artifacts,store.state);
}
function editNote(id){
 const n=store.state.notes.find(n=>n.id===id)||{title:'',text:'',chapter:''};
 modal(id?'Редактировать запись':'Новое наблюдение',`<form id="note-form"><label class="field">Заголовок<input name="title" value="${esc(n.title)}" maxlength="120" placeholder="Что привлекло ваше внимание?" required></label><label class="field">Привязка к главе<select name="chapter">${options(n.chapter)}</select></label><label class="field">Наблюдение<textarea name="text" rows="9" maxlength="20000" placeholder="Имена, даты, совпадения…">${esc(n.text)}</textarea></label><div class="actions"><button type="button" id="cancel-note">Отмена</button><button class="primary">Сохранить запись</button></div></form>`);
 const form=$('#note-form');form.onsubmit=e=>{e.preventDefault();try{saveNote(store.state,{id,chapter:form.elements.chapter.value,title:form.elements.title.value,text:form.elements.text.value});persist('Запись сохранена');$('#modal').close();journal();}catch(err){toast(err.message);}};
 $('#cancel-note').onclick=()=>$('#modal').close();setTimeout(()=>form.elements.title.focus(),0);
}
function journal(){
 const notes=store.state.notes.filter(n=>noteFilter==='all'||n.chapter===noteFilter).sort((a,b)=>b.updated-a.updated);
 $('#view').innerHTML=heading('ЛИЧНЫЕ НАБЛЮДЕНИЯ','Журнал исследователя','Ваши версии, совпадения и вопросы. Только на этом устройстве — пока вы не экспортируете сохранение.')+`<div class="section-toolbar"><label class="filter-label">Показать<select id="note-filter">${options(noteFilter,true)}<option value="" ${noteFilter===''?'selected':''}>Общее расследование</option></select></label><button class="primary" id="new-note">+ Новая запись</button></div>${notes.length?`<div class="notes">${notes.map(n=>`<article class="note-card"><p class="eyebrow">${esc(chapters.find(c=>c.id===n.chapter)?.title||'Общее расследование')} <span>· ${new Date(n.updated).toLocaleDateString('ru-RU')}</span></p><h2>${esc(n.title)}</h2><p class="note-text">${esc(n.text)}</p><div class="actions"><button data-edit="${n.id}">Редактировать</button><button class="quiet" data-delete="${n.id}">Удалить</button></div></article>`).join('')}</div>`:`<div class="empty"><span>▤</span><h2>Пока ни одной записи</h2><p>Иногда одна записанная дата связывает целую историю.</p><button id="empty-note">Записать первое наблюдение →</button></div>`}`;
 $('#note-filter').value=noteFilter;$('#note-filter').onchange=e=>{noteFilter=e.target.value;journal();};$('#new-note').onclick=()=>editNote();if($('#empty-note'))$('#empty-note').onclick=()=>editNote();
 document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editNote(b.dataset.edit));
 document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>confirmAction('Удалить запись?','Эта запись будет удалена из журнала. Остальной прогресс сохранится.',()=>{removeNote(store.state,b.dataset.delete);persist('Запись удалена');journal();}));
}
function chronology(){
 const items=timeline.filter(t=>isUnlocked(t,store.state)&&(timeFilter==='all'||t.chapter===timeFilter)).sort((a,b)=>{
 const key=x=>/^\d{2}\.\d{2}\.\d{4}$/.test(x.date)?x.date.split('.').reverse().join('')+x.time:x.date==='????'?'99999999':x.date+'0000';return key(a).localeCompare(key(b));});
 $('#view').innerHTML=heading('ВОССТАНОВЛЕННЫЕ СОБЫТИЯ','Следы во времени','Хронология пополняется по мере исследования. Неоткрытые события остаются скрытыми.')+`<div class="section-toolbar"><label class="filter-label">Источник<select id="time-filter">${options(timeFilter,true)}</select></label><span class="muted">${items.length} видимых записей</span></div><div class="timeline">${items.map(t=>`<article class="timeline-item ${t.chapter==='unknown'?'damaged':''}"><div class="time-date">${esc(t.date)}<small>${esc(t.time)}</small></div><details><summary>${esc(t.title)}<span>+</span></summary><p>${esc(t.text)}</p><small>ОБРАЗ ${esc(chapters.find(c=>c.id===t.chapter)?.number)} / ${esc(chapters.find(c=>c.id===t.chapter)?.title)}</small></details></article>`).join('')}</div>`;
 $('#time-filter').value=timeFilter;$('#time-filter').onchange=e=>{timeFilter=e.target.value;chronology();};
}
function settings(){
 const s=store.state.settings;
 const check=(key,label,description)=>`<label class="setting-row"><span><strong>${label}</strong><small>${description}</small></span><input type="checkbox" data-setting="${key}" ${s[key]?'checked':''}></label>`;
 $('#view').innerHTML=heading('КОНФИГУРАЦИЯ СИСТЕМЫ','Настройки','Настройте архив под себя и сохраните копию своего исследования.')+`<div class="settings-grid"><section class="panel"><h2>Интерфейс и звук</h2><p class="muted">Эти настройки относятся к ARCHIVE.exe. У каждого компьютера есть свои настройки внутри главы.</p>${check('sound','Звуки интерфейса','Тихий сигнал при нажатии') }<label class="setting-row"><span><strong>Громкость</strong><small id="volume-value">${Math.round(s.volume*100)}%</small></span><input type="range" data-setting="volume" min="0" max="1" step="0.05" value="${s.volume}"></label>${check('crt','Эффект CRT','Едва заметные строки старого экрана')}${check('reducedMotion','Уменьшить анимации','Отключить движение и плавные переходы')}${check('boot','Инициализация при первом входе','Короткий запуск системы; его можно пропустить')}<label class="setting-row"><span><strong>Масштаб текста</strong><small id="scale-value">${s.scale}%</small></span><input type="range" data-setting="scale" min="85" max="120" step="5" value="${s.scale}"></label><button id="replay-boot">Повторить инициализацию</button></section><section class="panel"><h2>Сохранения</h2><p class="muted">Экспорт включает все четыре главы, их рекорды и настройки, ваши заметки и прогресс архива.</p><div class="save-actions"><button class="primary" id="export">↓ Экспортировать JSON</button><button id="import">↑ Импортировать JSON</button></div><p class="help">Можно импортировать старый полный архив или отдельное сохранение любой главы. Отдельный файл заменит только выбранную главу. Архивы v1 и v2 сохранят прогресс глав, которых ещё не было в той версии.</p><div class="storage-info"><span class="signal"></span> СОХРАНЕНИЕ В ЭТОМ БРАУЗЕРЕ</div><p class="help">Другой адрес, браузер или устройство — отдельное хранилище. Перед переездом на GitHub Pages экспортируйте JSON.</p><div class="danger-zone"><h3>Начать заново</h3><p class="help">Удалит прогресс архива и всех четырёх глав, заметки, рекорды и настройки. Сначала экспортируйте копию. Перед импортом или сбросом закройте остальные вкладки с игрой.</p><button id="reset" class="danger">Сбросить все данные</button></div></section></div>`;
 document.querySelectorAll('[data-setting]').forEach(el=>el.oninput=()=>{const key=el.dataset.setting;store.state.settings[key]=el.type==='checkbox'?el.checked:Number(el.value);applySettings(store.state.settings);if(key==='volume')$('#volume-value').textContent=Math.round(el.value*100)+'%';if(key==='scale')$('#scale-value').textContent=el.value+'%';persist();});
 $('#export').onclick=()=>{try{download('ARCHIVE-exe-save.json',store.export());toast('Сохранение подготовлено для скачивания');}catch(e){toast('Не удалось прочитать сохранение главы: '+e.message);}};
 $('#import').onclick=()=>$('#import-file').click();
 $('#reset').onclick=()=>confirmAction('Сбросить архив и все главы?','Все находки, заметки, рекорды и настройки будут удалены. Это действие нельзя отменить без резервной копии.',()=>{store.reset();compared.clear();applySettings(store.state.settings);render();toast('Данные сброшены');});
 $('#replay-boot').onclick=()=>boot(true);
}
function render(){
 const route=location.hash.slice(1)||'catalog';const active=sectionNames[route]?route:'catalog';
 document.querySelectorAll('[data-nav]').forEach(a=>{if(a.dataset.nav===active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 $('#breadcrumb').textContent=sectionNames[active];$('#collection-count').textContent=String(artifacts.filter(a=>isUnlocked(a,store.state)).length).padStart(2,'0');
 ({catalog,collection,journal,timeline:chronology,settings}[active])();warning();
}
let bootTimers=[];
function boot(force=false){
 const s=store.state.settings,reduce=s.reducedMotion||matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(!force&&(store.state.initialized||!s.boot||reduce)){if(!store.state.initialized){store.state.initialized=true;persist();}return;}
 const d=$('#boot'),lines=$('#boot-lines');lines.textContent='';
 bootTimers.forEach(clearTimeout);bootTimers=[];d.showModal();
 const messages=['INITIALIZING STORAGE...','CHECKING DATA INTEGRITY...','',chapters.length+' ARCHIVE RECORDS FOUND','',stats(chapters,artifacts,store.state).available+' ARCHIVE AVAILABLE',(chapters.length-stats(chapters,artifacts,store.state).available)+' ARCHIVES LOCKED','','WELCOME, INVESTIGATOR.'];
 const finish=()=>{bootTimers.forEach(clearTimeout);d.close();store.state.initialized=true;persist();};
 d.oncancel=e=>{e.preventDefault();finish();};$('#skip-boot').onclick=finish;
 if(reduce){lines.textContent=messages.join('\n');return;}
 messages.forEach((line,i)=>bootTimers.push(setTimeout(()=>lines.textContent+=line+'\n',i*190)));
 bootTimers.push(setTimeout(finish,2400));
}
async function init(){
 [chapters,artifacts,timeline]=await Promise.all(['chapters','artifacts','timeline'].map(async name=>{const r=await fetch(new URL('../data/'+name+'.json',import.meta.url));if(!r.ok)throw Error('Не загружен '+name+'.json');return r.json();}));
 if(chapters.some(c=>!safePath(c.image)||(c.status==='available'&&!safePath(c.path))))throw Error('Некорректные пути в каталоге.');
 let storage;try{storage=localStorage;}catch{storage={getItem(){throw Error('Недоступно');},setItem(){throw Error('Недоступно');},removeItem(){throw Error('Недоступно');}};}
 store=new ArchiveStore(storage);store.sync();applySettings(store.state.settings);render();initSupport();boot();
 $('#close-modal').onclick=()=>$('#modal').close();
 document.addEventListener('click',e=>{if(e.target.closest('button,a,input'))clickSound(store.state.settings);});
 window.addEventListener('hashchange',()=>{render();$('#view').focus();window.scrollTo(0,0);});
 window.addEventListener('pageshow',()=>{store.sync();render();});
 window.addEventListener('storage',e=>{if(Object.values(GAME_KEYS).includes(e.key)){store.sync();if(!$('#modal').open)render();}else if(e.key===KEY){if($('#modal').open){toast('Архив изменён в другой вкладке. Закройте форму и обновите страницу перед редактированием.');return;}store=new ArchiveStore(storage);store.sync();applySettings(store.state.settings);render();}});
 $('#import-file').onchange=async e=>{
 const file=e.target.files[0];e.target.value='';if(!file)return;
 try{if(file.size>2000000)throw Error('Файл больше 2 МБ.');const parsed=parseImport(await file.text(),store.state);confirmAction(parsed.legacy?'Импортировать сохранение '+parsed.chapterId+'.exe?':'Заменить текущее сохранение?',parsed.legacy?'Прогресс выбранной главы будет заменён. Ваш журнал и настройки ARCHIVE.exe сохранятся. Закройте другие вкладки с игрой.':'Прогресс архива, журнал, настройки и данные глав из файла будут заменены. При импорте архива v1 или v2 прогресс более новых глав сохраняется. Закройте другие вкладки с игрой.',()=>{store.import(parsed);compared.clear();applySettings(store.state.settings);render();toast('Сохранение импортировано');});}catch(err){toast('Импорт отменён: '+err.message);}
 };
}
init().catch(error=>{$('#view').innerHTML=`<div class="empty"><h1>Архив не удалось открыть</h1><p>${esc(error.message)}</p><p>Откройте сайт по HTTP(S): через GitHub Pages или локальный сервер. Двойное нажатие на index.html не поддерживает загрузку JSON.</p><button id="retry">Повторить</button></div>`;$('#retry').onclick=()=>location.reload();console.error(error);});
