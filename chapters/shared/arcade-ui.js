import {GAME_NAMES,move2048,spawn2048,canMove2048,memoryDeck,flipMemory,MAZE,freshMaze,stepMaze,freshBreakout,launchBreakout,stepBreakout} from './arcade-engine.js';
import {lightBoard,toggleLights,slideBoard,slide} from './state.js';
const $=(s,r)=>r.querySelector(s),all=(s,r)=>[...r.querySelectorAll(s)];
const rules={lights:'Погасите девять огней. Нажатие переключает клетку и её соседей.',slide:'Соберите блоки 1–8 по порядку. Пустая клетка — внизу справа.',memory:'Откройте восемь пар за меньшее число попыток. Несовпавшие карты закроются при следующем выборе.',merge:'Соединяйте одинаковые числа стрелками или кнопками. Соберите 2048. После этого можно продолжить.',maze:'Соберите все точки и избегайте двух стражей. Большие кристаллы временно позволяют прогонять их. Три жизни.',breakout:'Отбивайте мяч платформой и разбейте все кирпичи. Три жизни. Мышь, касание или стрелки ← →.'};
const ARROWS={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'};
export function renderArcade(w,id,ctx){
 w.cleanup?.();w.cleanup=null;w.pause=null;const root=w.body;
 const low=['lights','slide','memory'].includes(id);
 const record=()=>ctx.record(id);
 const save=n=>ctx.saveRecord(id,n,low);
 root.innerHTML=`<div class="app-heading"><small>ИГРОВАЯ ПОЛКА / ${ctx.chapter}.EXE</small><h2>${GAME_NAMES[id]}</h2><p>${rules[id]}</p></div><section class="arcade"><div class="arcade-meta"><span data-stats role="status" aria-live="polite"></span><span>Рекорд: <b data-record>${record()??'—'}</b>${low?' ход.':' очк.'}</span></div><div data-surface></div><div class="arcade-actions"><button data-restart>Новая партия</button><button data-pause hidden>Начать</button></div><p class="small-muted">Мини-игра необязательна. Рекорд сохраняется, партия — до закрытия окна. Для открытия следующей главы завершите сюжет.</p></section>`;
 const surface=$('[data-surface]',root),stats=$('[data-stats]',root),restart=$('[data-restart]',root);
 const updateRecord=n=>{save(n);$('[data-record]',root).textContent=record()??'—';};
 const restartGame=()=>{w.view={};renderArcade(w,id,ctx);};restart.onclick=restartGame;
 if(id==='lights'||id==='slide'){
  w.view.board ||= id==='lights'?lightBoard():slideBoard();w.view.moves ||= 0;
  const paint=()=>{const b=w.view.board,lights=id==='lights',won=lights?b.every(x=>!x):b.every((x,i)=>x===(i+1)%9);if(won)updateRecord(w.view.moves);
   stats.textContent=(won?'Победа! ':'')+'Ходов: '+w.view.moves;
   surface.innerHTML=`<div class="mini-board ${lights?'lights-board':'slide-board'}">${b.map((v,i)=>`<button data-cell="${i}" class="${lights?(v?'lit':''):(v?'':'blank')}" aria-label="${lights?'Клетка '+(i+1)+(v?': светится':': погашена'):v?'Блок '+v:'Пустая клетка'}" ${won||(!lights&&!v)?'disabled':''}>${lights?(v?'●':'○'):(v||'')}</button>`).join('')}</div>`;
   all('[data-cell]',surface).forEach(el=>el.onclick=()=>{const next=lights?toggleLights(b,+el.dataset.cell):slide(b,+el.dataset.cell);if(JSON.stringify(next)!==JSON.stringify(b)){w.view.board=next;w.view.moves++;ctx.tone();paint();}});
  };paint();return;
 }
 if(id==='memory'){
  w.view.memory ||= {deck:memoryDeck(),open:[],matched:[],moves:0};
  const paint=()=>{const s=w.view.memory,won=s.matched.length===16,symbols=['★','◆','●','▲','☂','☀','♫','☕'];if(won)updateRecord(s.moves);stats.textContent=(won?'Все пары найдены! ':'')+`Попыток: ${s.moves} · Пар: ${s.matched.length/2}/8`;
   surface.innerHTML=`<div class="memory-board">${s.deck.map((v,i)=>{const matched=s.matched.includes(i),open=matched||s.open.includes(i);return `<button data-card="${i}" class="${matched?'matched':open?'turned':''}" ${matched?'disabled':''} aria-label="Карта ${i+1}: ${open?symbols[v]:'закрыта'}">${open?symbols[v]:'?'}</button>`;}).join('')}</div>`;
   all('[data-card]',surface).forEach(b=>b.onclick=()=>{w.view.memory=flipMemory(s,+b.dataset.card);ctx.tone();paint();});
  };paint();return;
 }
 const pad=`<div class="direction-pad" aria-label="Управление"><button data-dir="up" aria-label="Вверх">↑</button><button data-dir="left" aria-label="Влево">←</button><button data-dir="down" aria-label="Вниз">↓</button><button data-dir="right" aria-label="Вправо">→</button></div>`;
 if(id==='merge'){
  w.view.merge ||= {board:spawn2048(spawn2048(Array(16).fill(0))),score:0};
  surface.innerHTML='<div class="merge-board" tabindex="0" role="group" aria-label="2048. Управление стрелками"></div>'+pad;
  const board=$('.merge-board',surface);
  const paint=()=>{const s=w.view.merge;board.innerHTML=s.board.map(v=>`<span class="merge-tile" data-level="${Math.min(11,Math.log2(v)||0)}">${v||''}</span>`).join('');stats.textContent=`Очки: ${s.score}`+(s.board.some(v=>v>=2048)?' · 2048 собрано!':'')+(!canMove2048(s.board)?' · Ходов нет. Новая партия?':'');};
  const move=dir=>{const s=w.view.merge,next=move2048(s.board,dir);if(!next.changed)return;w.view.merge={board:spawn2048(next.board),score:s.score+next.score};updateRecord(w.view.merge.score);ctx.tone();paint();};
  board.onkeydown=e=>{if(ARROWS[e.key]){e.preventDefault();move(ARROWS[e.key]);}};all('[data-dir]',surface).forEach(b=>b.onclick=()=>move(b.dataset.dir));paint();return;
 }
 // Real-time games share pause, focus, touch controls and lifecycle cleanup.
 const maze=id==='maze';w.view.sim ||= maze?freshMaze():freshBreakout();
 surface.innerHTML='<canvas class="arcade-canvas" width="480" height="416" tabindex="0" aria-label="'+GAME_NAMES[id]+'. Управление стрелками; пробел — пауза."></canvas>'+(maze?pad:'<div class="paddle-controls"><button data-left aria-label="Двигать платформу влево">←</button><button data-launch>Подать мяч</button><button data-right aria-label="Двигать платформу вправо">→</button></div>');
 const canvas=$('canvas',surface),g=canvas.getContext('2d'),pause=$('[data-pause]',root);pause.hidden=false;
 let playing=false,raf=0,last=0,accum=0,dir='',held=0,stopped=false,lastStats='';
 const pauseGame=()=>{playing=false;held=0;pause.textContent='Продолжить';};
 w.pause=pauseGame;
 const toggle=()=>{if(w.view.sim.won||w.view.sim.lost)return;if(playing)pauseGame();else{playing=true;pause.textContent='Пауза';canvas.focus();if(!maze&&w.view.sim.serve)w.view.sim=launchBreakout(w.view.sim);}};pause.onclick=toggle;
 canvas.onkeydown=e=>{if(ARROWS[e.key]){e.preventDefault();if(maze)dir=ARROWS[e.key];else held=e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:0;}else if(e.code==='Space'){e.preventDefault();toggle();}};
 canvas.onkeyup=e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight')held=0;};
 if(maze)all('[data-dir]',surface).forEach(b=>b.onclick=()=>{dir=b.dataset.dir;});
 else{
  const left=$('[data-left]',surface),right=$('[data-right]',surface);
  for(const [el,value] of [[left,-1],[right,1]]){el.onpointerdown=e=>{e.preventDefault();el.setPointerCapture(e.pointerId);held=value;};el.onpointerup=el.onpointercancel=()=>held=0;el.onkeydown=e=>{if(e.key==='Enter'||e.code==='Space'){e.preventDefault();held=value;}};el.onkeyup=()=>held=0;el.onblur=()=>held=0;}
  const point=e=>{const r=canvas.getBoundingClientRect();w.view.sim={...w.view.sim,paddle:Math.max(46,Math.min(434,(e.clientX-r.left)*480/r.width))};};
  canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);point(e);canvas.focus();};canvas.onpointermove=e=>{if(e.pointerType==='mouse'||e.buttons)point(e);};
  $('[data-launch]',surface).onclick=()=>{if(w.view.sim.serve&&!w.view.sim.lost){w.view.sim=launchBreakout(w.view.sim);if(!playing)toggle();}};
 }
 const draw=()=>{const s=w.view.sim;g.fillStyle='#131c2b';g.fillRect(0,0,480,416);
  if(maze){MAZE.forEach((row,y)=>[...row].forEach((c,x)=>{if(c==='#'){g.fillStyle='#4b4e87';g.fillRect(x*32+2,y*32+2,28,28);g.fillStyle='#6664a1';g.fillRect(x*32+4,y*32+4,24,3);}}));
   for(const i of s.dots){const x=i%15,y=Math.floor(i/15);g.fillStyle=MAZE[y][x]==='o'?'#b9e3d2':'#e8d6ac';g.beginPath();g.arc(x*32+16,y*32+16,MAZE[y][x]==='o'?7:2.6,0,Math.PI*2);g.fill();}
   const p=s.player;g.fillStyle='#f1cc78';g.beginPath();g.arc(p.x*32+16,p.y*32+16,11,0,Math.PI*2);g.fill();g.fillStyle='#283147';g.fillRect(p.x*32+17,p.y*32+10,3,4);
   s.ghosts.forEach((p,i)=>{g.fillStyle=s.power?'#9ecdc8':i?'#ca87b3':'#e09482';g.beginPath();g.moveTo(p.x*32+16,p.y*32+4);g.lineTo(p.x*32+28,p.y*32+16);g.lineTo(p.x*32+16,p.y*32+28);g.lineTo(p.x*32+4,p.y*32+16);g.closePath();g.fill();g.fillStyle='#253249';g.fillRect(p.x*32+11,p.y*32+12,3,4);g.fillRect(p.x*32+19,p.y*32+12,3,4);});
  }else{
   s.bricks.forEach((alive,i)=>{if(!alive)return;g.fillStyle=['#d99391','#e0b174','#bac782','#83c3b8','#a9a0cc'][Math.floor(i/8)];g.fillRect(16+i%8*56,36+Math.floor(i/8)*25,50,18);});g.fillStyle='#d5e4d3';g.fillRect(s.paddle-46,372,92,10);g.fillStyle='#f4d9a2';g.beginPath();g.arc(s.ball.x,s.ball.y,7,0,Math.PI*2);g.fill();
  }
  if(!playing||s.won||s.lost){g.fillStyle='#111826cc';g.fillRect(45,171,390,76);g.fillStyle='#f2e4d1';g.font='bold 21px sans-serif';g.textAlign='center';g.fillText(s.won?'Победа!':s.lost?'Партия завершена':pause.textContent==='Начать'?'Готовы играть?':'Пауза',240,214);}
  const text=`Очки: ${s.score} · Жизни: ${s.lives}`+(maze?` · Точек: ${s.dots.length}${s.power?' · Усиление':''}`:s.serve&&!s.lost?' · Подайте мяч':'')+(s.won?' · Победа!':s.lost?' · Конец игры':'');if(text!==lastStats){stats.textContent=text;lastStats=text;}
 };
 const blur=()=>pauseGame();window.addEventListener('blur',blur);
 const loop=now=>{if(stopped)return;const dt=last?Math.min((now-last)/1000,.05):0;last=now;
  if(playing&&!ctx.active())pauseGame();
  if(playing){if(maze){accum+=dt;if(accum>=.15){accum=0;w.view.sim=stepMaze(w.view.sim,dir);}}else w.view.sim=stepBreakout(w.view.sim,dt,w.view.sim.paddle+held*330*dt);
   if(w.view.sim.score>(record()??0))updateRecord(w.view.sim.score);
   if(w.view.sim.won||w.view.sim.lost){pauseGame();pause.disabled=true;}
  }draw();raf=requestAnimationFrame(loop);
 };
 w.cleanup=()=>{stopped=true;cancelAnimationFrame(raf);window.removeEventListener('blur',blur);};draw();raf=requestAnimationFrame(loop);
}
