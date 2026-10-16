import { $, toast } from './ui.js';
export function setupBoot(ctx, onReady) {
  const power = $('#power'),
    skip = $('#skip'),
    bios = $('#bios');
  let booting = false,
    completed = false,
    timers = [];
  power.disabled = false;
  power.textContent = ctx.save.state.started ? 'Продолжить →' : '⏻ Включить компьютер';
  $('#boot-sound').checked = ctx.save.state.settings.sound;
  $('#boot-sound').onchange = e => {
    ctx.save.state.settings.sound = e.target.checked;
    ctx.applySettings();
    ctx.save.save();
  };
  function done() {
    if (completed) return;
    completed = true;
    timers.forEach(clearTimeout);
    $('#boot').hidden = true;
    $('#shell').hidden = false;
    ctx.save.state.started = true;
    ctx.story.achieve('boot');
    ctx.save.save();
    onReady();
    if (ctx.save.error || ctx.save.warning) toast(ctx.save.error || ctx.save.warning);
  }
  power.onclick = () => {
    if (booting) return;
    booting = true;
    ctx.audio.init();
    ctx.audio.startup();
    if (ctx.save.state.settings.fastBoot || ctx.save.state.settings.animations === 0) {
      done();
      return;
    }
    power.hidden = true;
    skip.hidden = false;
    bios.hidden = false;
    $('.boot-intro').hidden = true;
    $('.boot-logo').style.margin = '15px 0';
    $('.boot-logo').style.fontSize = '54px';
    const lines = ['HOME COMPUTER BIOS v2.41', 'Copyright (C) 1999 HOME Systems', '', 'CPU ................. 450 MHz', 'MEMORY .............. 128 MB', 'HARD DRIVE .......... 8.4 GB', 'SOUND DEVICE ........ READY', '', 'Checking memory...... OK', 'Loading operating system...', 'HOME OS 99'];
    const interval = ctx.save.state.settings.animations === 2 ? 90 : 155;
    lines.forEach((line, i) => timers.push(setTimeout(() => {
      bios.textContent += line + '\n';
    }, i * interval)));
    timers.push(setTimeout(done, lines.length * interval + 300));
  };
  skip.onclick = done;
}
