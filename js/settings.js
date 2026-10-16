export function applySettings(s){
  document.body.classList.toggle('crt',s.crt);
  document.body.classList.toggle('reduced-motion',s.reducedMotion);
  document.documentElement.style.fontSize=s.scale+'%';
}
let audio;
export function clickSound(s){
  if(!s.sound||!s.volume)return;
  try{audio ||= new (window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(620,audio.currentTime);o.frequency.exponentialRampToValueAtTime(280,audio.currentTime+.06);g.gain.setValueAtTime(s.volume*.07,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.07);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+.08);}catch{/* Sound is optional. */}
}
