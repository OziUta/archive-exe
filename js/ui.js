export const $=(s,root=document)=>root.querySelector(s);
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function download(name,text){const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
let timer;
export function toast(message){const el=$('#toast');const active=$('#modal');(active?.open?active:document.body).append(el);el.textContent=message;el.hidden=false;clearTimeout(timer);timer=setTimeout(()=>el.hidden=true,4500);}
export function modal(title,html){$('#modal-title').textContent=title;$('#modal-body').innerHTML=html;const d=$('#modal');if(!d.open)d.showModal();}
export function confirmAction(title,message,action){modal(title,`<p>${esc(message)}</p><div class="actions"><button id="cancel-confirm">Отмена</button><button class="primary" id="accept-confirm">Подтвердить</button></div>`);$('#cancel-confirm').onclick=()=>$('#modal').close();$('#accept-confirm').onclick=()=>{try{action();$('#modal').close();}catch(e){toast(e.message);}};}
