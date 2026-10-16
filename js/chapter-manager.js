export const CHAPTER_ORDER=['1999','2003','2007','2026'];
export const statusLabel={'not-started':'Не начато','in-progress':'В процессе',completed:'Завершено',locked:'Закрыто',soon:'Скоро',unknown:'Данные повреждены'};
export function chapterAccess(id,state){
 const index=CHAPTER_ORDER.indexOf(id);if(index<0)return {allowed:true,required:null};
 const required=CHAPTER_ORDER.slice(0,index).find(key=>state.chapters[key]?.status!=='completed');
 return {allowed:!required,required:required||null,chapter:id};
}
export function chapterState(chapter,state){if(chapter.status!=='available')return chapter.status;return chapterAccess(chapter.id,state).allowed?(state.chapters[chapter.id]?.status||'not-started'):'locked';}
export function isUnlocked(item,state){return chapterAccess(item.chapter,state).allowed&&(!item.flag||!!state.chapters[item.chapter]?.flags.includes(item.flag));}
export function stats(chapters,artifacts,state){const available=chapters.filter(c=>c.status==='available'&&chapterAccess(c.id,state).allowed);return {completed:chapters.filter(c=>state.chapters[c.id]?.status==='completed').length,total:chapters.length,available:available.length,artifacts:artifacts.filter(a=>isUnlocked(a,state)).length,secrets:chapters.reduce((sum,c)=>sum+(state.chapters[c.id]?.secrets.length||0),0)};}
export function safePath(path){return typeof path==='string'&&!path.startsWith('/')&&!path.includes('..')&&!/[:\\]/.test(path)&&!path.startsWith('#');}
