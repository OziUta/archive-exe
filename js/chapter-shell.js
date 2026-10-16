import {ArchiveStore} from './save-manager.js';
let store;
try{store=new ArchiveStore(localStorage);store.sync();}catch{}
const sync=()=>{if(!store)return;store.sync();document.querySelector('#sync').textContent=store.warning||'Прогресс сохранён на этом устройстве';};
window.addEventListener('storage',sync);
window.addEventListener('pageshow',sync);
document.querySelector('#return').addEventListener('click',sync);
