import { $, $$, esc } from '../ui.js';
const tracks = [{
  name: 'Летний двор',
  notes: [262, 330, 392, 330, 294, 349, 440, 349],
  tempo: 340
}, {
  name: 'Последний автобус',
  notes: [220, 262, 330, 392, 349, 330, 262, 247],
  tempo: 480
}, {
  name: 'Пока горит окно',
  notes: [330, 392, 494, 440, 392, 330, 294, 330, 262, 330, 392, 523],
  tempo: 530
}];
export function player(ctx, body, win, options = {}) {
  let track = options.track || 0,
    playing = false,
    step = 0,
    timer = null;
  body.innerHTML = `<div class="player"><div class="eyebrow">HOME AUDIO / STEREO SEQUENCER</div><div class="player-screen"><small>ОРИГИНАЛЬНЫЕ МЕЛОДИИ · HSEQ</small><div class="track-name"></div><span data-position>00:00</span><div class="spectrum">${Array.from({
    length: 26
  }, () => '<i></i>').join('')}</div></div><div class="player-buttons"><button data-prev aria-label="Предыдущий трек">|◀</button><button data-play>▶ Играть</button><button data-next aria-label="Следующий трек">▶|</button></div><select aria-label="Трек">${tracks.map((t, i) => `<option value="${i}">${i + 1}. ${esc(t.name)}</option>`).join('')}</select><p><label>Громкость <input aria-label="Громкость музыки" type="range" min="0" max="1" step=".05" value="${ctx.save.state.settings.volume}"></label></p><small>Музыка рождается здесь, на этом компьютере.</small></div>`;
  function label() {
    const t = tracks[track];
    $('.track-name', body).textContent = `0${track + 1} / ${t.name}`;
    $('select', body).value = track;
    $('[data-play]', body).textContent = playing ? 'Ⅱ Пауза' : '▶ Играть';
  }
  function tick() {
    const t = tracks[track];
    ctx.audio.tone(t.notes[step % t.notes.length], t.tempo / 1000 * .9, 0, 'triangle', .14);
    if (step % 4 === 0) ctx.audio.tone(t.notes[step % t.notes.length] / 2, t.tempo / 1000 * 1.6, 0, 'sine', .11);
    step++;
    $('[data-position]', body).textContent = '00:' + String(Math.floor(step * t.tempo / 1000) % 60).padStart(2, '0');
    $$('.spectrum i', body).forEach((bar, i) => bar.style.height = (playing && ctx.save.state.settings.sound && ctx.save.state.settings.animations ? 10 + Math.abs(Math.sin(step * .7 + i * 1.3)) * 85 : 8) + '%');
    timer = setTimeout(tick, t.tempo);
  }
  function toggle() {
    playing = !playing;
    clearTimeout(timer);
    if (playing) {
      ctx.audio.init();
      tick();
    } else {
      $$('.spectrum i', body).forEach(b => b.style.height = '8%');
    }
    label();
  }
  function select(i) {
    track = (i + tracks.length) % tracks.length;
    step = 0;
    clearTimeout(timer);
    label();
    if (playing) tick();
  }
  $('[data-play]', body).onclick = toggle;
  $('[data-prev]', body).onclick = () => select(track - 1);
  $('[data-next]', body).onclick = () => select(track + 1);
  $('select', body).onchange = e => select(+e.target.value);
  $('input', body).oninput = e => {
    ctx.save.state.settings.volume = +e.target.value;
    ctx.save.save();
  };
  win.cleanup.push(() => clearTimeout(timer));
  win.navigate = i => select(i);
  label();
}
