import {$,esc,modal,toast} from './ui.js';
export function supportURL(value){
 if(typeof value!=='string'||!value.trim())return '';
 try{const u=new URL(value.trim());if(u.protocol!=='https:'||u.username||u.password)return '';return u.href;}catch{return '';}
}
export function shareDetails(config={},current=''){
 const explicit=supportURL(config.projectUrl);let url=explicit;
 if(!url){try{const u=new URL(current);if(['http:','https:'].includes(u.protocol)&&!['localhost','127.0.0.1','[::1]','0.0.0.0'].includes(u.hostname)&&!u.hostname.endsWith('.localhost')){u.search='';u.hash='';if(u.pathname.endsWith('/index.html'))u.pathname=u.pathname.slice(0,-10);url=u.href;}}catch{}}
 return {title:'ARCHIVE.exe — Цифровые воспоминания',text:'Четыре истории на старых компьютерах. Письма, забытые файлы и люди за ними. Попробуй ARCHIVE.exe.',...(url?{url}:{})};
}
export function initSupport(){
 let config={};
 fetch(new URL('../data/support.json',import.meta.url)).then(r=>r.ok?r.json():{}).then(value=>{if(value&&typeof value==='object')config=value;}).catch(()=>{});
 $('#support-project').onclick=()=>{
  const donation=supportURL(config.supportUrl),details=shareDetails(config,location.href),copy=details.text+(details.url?'\n'+details.url:'');
  modal('Поддержать проект',`<div class="support-intro"><span aria-hidden="true">♡</span><p>Помогите этим историям найти своих читателей.</p></div><p class="muted">Если ARCHIVE.exe вам понравился, расскажите о нём друзьям. Спасибо, что возвращаете жизнь забытым файлам.</p>${donation?`<a class="primary support-donate" href="${esc(donation)}" target="_blank" rel="noopener noreferrer">Поддержать автора ↗</a>`:'<p class="support-note">Пока поддержать проект можно, поделившись им.</p>'}<label class="field">Приглашение для друзей<textarea id="support-copy-text" rows="5" readonly>${esc(copy)}</textarea></label><div class="actions"><button id="copy-project" class="primary">Скопировать приглашение</button>${typeof navigator.share==='function'?'<button id="share-project">Поделиться…</button>':''}</div><p class="help">Спасибо, что были здесь. У каждой истории должен быть читатель.</p>`);
  $('#copy-project').onclick=async()=>{try{if(!navigator.clipboard?.writeText)throw Error();await navigator.clipboard.writeText(copy);toast('Приглашение скопировано');}catch{$('#support-copy-text').focus();$('#support-copy-text').select();toast('Выделили приглашение — скопируйте его через меню устройства или Ctrl/Cmd+C.');}};
  const share=$('#share-project');if(share)share.onclick=async()=>{try{await navigator.share(details);}catch(e){if(e.name!=='AbortError')toast('Можно скопировать приглашение кнопкой рядом.');}};
 };
}
