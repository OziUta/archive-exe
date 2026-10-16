import {ArchiveStore} from './save-manager.js';
import {CHAPTER_ORDER,chapterAccess} from './chapter-manager.js';
export function readChapterAccess(storage,id){
 const state={chapters:{}},index=CHAPTER_ORDER.indexOf(id),reader=new ArchiveStore(storage);
 for(const key of CHAPTER_ORDER.slice(0,Math.max(0,index))){try{const g=reader.readGame(key);state.chapters[key]={status:g?.flags.includes('ending')?'completed':'not-started'};}catch{return {allowed:false,chapter:id,required:key,unreadable:true};}}
 return chapterAccess(id,state);
}
export function showChapterLock(access){
 const boot=document.querySelector('#boot'),shell=document.querySelector('#shell'),dialog=document.querySelector('#dialog');
 if(dialog?.open)dialog.close();if(shell)shell.hidden=true;if(boot)boot.hidden=false;
 // `required` is exclusively drawn from CHAPTER_ORDER, never from URL input.
 const required=CHAPTER_ORDER.includes(access.required)?access.required:'1999';
 if(boot)boot.innerHTML=`<section class="chapter-lock"><div class="lock-icon" aria-hidden="true">⌑</div><p>ARCHIVE.exe / ПОСЛЕДОВАТЕЛЬНОЕ ЧТЕНИЕ</p><h1>Этот образ пока закрыт</h1><p>${access.unreadable?'Не удалось прочитать сохранение '+required+'.exe. Восстановите его из JSON в настройках архива.':'Сначала завершите историю '+required+'.exe. После её финальной сцены откроется следующий компьютер.'}</p><a href="../${required}/index.html">Открыть ${required}.exe →</a><a href="../../index.html#${access.unreadable?'settings':'catalog'}">Вернуться в архив</a><small>Прогресс этой главы сохранён. Мини-игры проходить не требуется.</small></section>`;
}
