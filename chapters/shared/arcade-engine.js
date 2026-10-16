// Deterministic rules; renderers supply randomness and elapsed time.
export const GAME_PAIRS={'2003':['lights','breakout'],'2007':['slide','memory'],'2026':['maze','merge']};
export const GAME_NAMES={lights:'Огоньки',breakout:'Арканоид',slide:'Сдвиг',memory:'Найди пару',maze:'Лабиринт',merge:'2048'};
export function move2048(board,dir){
 if(!['left','right','up','down'].includes(dir))return {board:[...board],score:0,changed:false};
 const next=[...board];let score=0;
 for(let line=0;line<4;line++){
  const indices=Array.from({length:4},(_,i)=>dir==='left'?line*4+i:dir==='right'?line*4+3-i:dir==='up'?i*4+line:(3-i)*4+line);
  const values=indices.map(i=>board[i]).filter(Boolean),out=[];
  for(let i=0;i<values.length;i++){if(values[i]===values[i+1]){out.push(values[i]*2);score+=values[i]*2;i++;}else out.push(values[i]);}
  while(out.length<4)out.push(0);indices.forEach((idx,i)=>next[idx]=out[i]);
 }
 return {board:next,score,changed:next.some((v,i)=>v!==board[i])};
}
export function spawn2048(board,rng=Math.random){const empty=board.flatMap((v,i)=>v===0?[i]:[]);const next=[...board];if(empty.length)next[empty[Math.min(empty.length-1,Math.floor(rng()*empty.length))]]=rng()<.9?2:4;return next;}
export function canMove2048(board){return ['left','right','up','down'].some(d=>move2048(board,d).changed);}
export function memoryDeck(rng=Math.random){const deck=Array.from({length:16},(_,i)=>i%8);for(let i=15;i>0;i--){const j=Math.min(i,Math.floor(rng()*(i+1)));[deck[i],deck[j]]=[deck[j],deck[i]];}return deck;}
export function flipMemory(s,index){
 if(!Number.isInteger(index)||index<0||index>15||s.matched.includes(index)||s.open.includes(index)||s.matched.length===16)return s;
 const open=s.open.length===2?[]:[...s.open];open.push(index);let matched=[...s.matched],moves=s.moves;
 if(open.length===2){moves++;if(s.deck[open[0]]===s.deck[open[1]])matched.push(...open);}
 return {...s,open,matched,moves};
}
export const MAZE=[
 '###############',
 '#o....#......o#',
 '#.##.#.#.###..#',
 '#....#.#...#..#',
 '###..#...#.#..#',
 '#....###.#....#',
 '#.##.....##.#.#',
 '#....#.#....#.#',
 '#.##.#.####...#',
 '#....#......#.#',
 '#.##...####...#',
 '#o...........o#',
 '###############'
];
export const DIRS={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
const walk=(x,y)=>MAZE[y]?.[x]!==undefined&&MAZE[y][x]!=='#';
const same=(a,b)=>a.x===b.x&&a.y===b.y;
const GHOST_START=[{x:13,y:1},{x:13,y:11}];
export function freshMaze(){const dots=[];MAZE.forEach((row,y)=>[...row].forEach((c,x)=>{if(c!== '#'&&!(x===1&&y===1))dots.push(y*15+x);}));return {player:{x:1,y:1},ghosts:GHOST_START.map(p=>({...p})),dots,power:0,score:0,lives:3,tick:0,won:false,lost:false};}
function mazeCollision(s){
 for(let i=0;i<s.ghosts.length;i++)if(same(s.player,s.ghosts[i])){
  if(s.power){s.score+=100;s.ghosts[i]={...GHOST_START[i]};}
  else{s.lives--;s.lost=s.lives===0;s.player={x:1,y:1};s.ghosts=GHOST_START.map(p=>({...p}));return true;}
 }
 return false;
}
function distance(from,target){const queue=[{...from,n:0}],seen=new Set([from.x+','+from.y]);for(let i=0;i<queue.length;i++){const p=queue[i];if(same(p,target))return p.n;for(const [dx,dy]of Object.values(DIRS)){const x=p.x+dx,y=p.y+dy,k=x+','+y;if(walk(x,y)&&!seen.has(k)){seen.add(k);queue.push({x,y,n:p.n+1});}}}return 999;}
export function stepMaze(raw,dir){
 if(raw.won||raw.lost)return raw;
 const s={...raw,player:{...raw.player},ghosts:raw.ghosts.map(p=>({...p})),dots:[...raw.dots]};s.tick++;s.power=Math.max(0,s.power-1);
 const delta=DIRS[dir];if(delta&&walk(s.player.x+delta[0],s.player.y+delta[1])){s.player.x+=delta[0];s.player.y+=delta[1];}
 const key=s.player.y*15+s.player.x;if(s.dots.includes(key)){s.dots=s.dots.filter(i=>i!==key);s.score+=10;if(MAZE[s.player.y][s.player.x]==='o'){s.power=45;s.score+=40;}}
 if(mazeCollision(s))return s;
 if(s.dots.length===0){s.won=true;return s;}
 // Opponents move every second player tick; power mode sends them away.
 if(s.tick%2===0){s.ghosts=s.ghosts.map((g,i)=>{const options=Object.values(DIRS).map(([dx,dy])=>({x:g.x+dx,y:g.y+dy})).filter(p=>walk(p.x,p.y));options.sort((a,b)=>(distance(a,s.player)-distance(b,s.player))*(s.power?-1:1));return options[0]||g;});mazeCollision(s);}
 return s;
}
export function freshBreakout(){return {ball:{x:240,y:355,vx:145,vy:-210},paddle:240,bricks:Array(40).fill(true),score:0,lives:3,serve:true,won:false,lost:false};}
export function launchBreakout(s){return {...s,serve:false};}
export function stepBreakout(raw,dt,paddle){
 const s={...raw,ball:{...raw.ball},bricks:[...raw.bricks],paddle:Math.max(46,Math.min(434,paddle))};
 if(s.won||s.lost)return s;
 if(s.serve){s.ball.x=s.paddle;s.ball.y=355;return s;}
 // Bound each substep to avoid tunnelling through thin bricks on slow frames.
 let remaining=Math.min(.1,Math.max(0,dt));
 while(remaining>0){const t=Math.min(remaining,1/240);remaining-=t;const old={...s.ball},b=s.ball;b.x+=b.vx*t;b.y+=b.vy*t;
  if(b.x<7){b.x=7;b.vx=Math.abs(b.vx);}if(b.x>473){b.x=473;b.vx=-Math.abs(b.vx);}if(b.y<7){b.y=7;b.vy=Math.abs(b.vy);}
  if(b.vy>0&&old.y<=365&&b.y>=365&&Math.abs(b.x-s.paddle)<=53){b.y=365;b.vy=-Math.sqrt(Math.max(120**2,260**2-(b.x-s.paddle)**2*16));b.vx=(b.x-s.paddle)*4;}
  for(let i=0;i<40;i++)if(s.bricks[i]){const x=16+(i%8)*56,y=36+Math.floor(i/8)*25;if(b.x+7>=x&&b.x-7<=x+50&&b.y+7>=y&&b.y-7<=y+18){s.bricks[i]=false;s.score+=10;if(old.x+7<x||old.x-7>x+50)b.vx=-b.vx;else b.vy=-b.vy;break;}}
  if(!s.bricks.some(Boolean)){s.won=true;break;}
  if(b.y>410){s.lives--;s.lost=s.lives===0;s.serve=!s.lost;s.ball={x:s.paddle,y:355,vx:145,vy:-210};break;}
 }
 return s;
}
