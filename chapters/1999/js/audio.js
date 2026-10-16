export class AudioEngine {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
    this.nodes = new Set();
  }
  init() {
    if (!this.ctx) {
      const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (Audio) this.ctx = new Audio();
    }
    if (this.ctx?.state === 'suspended') this.ctx.resume().catch(() => {});
  }
  tone(frequency = 440, duration = .12, delay = 0, type = 'triangle', gain = .09) {
    if (!this.settings.sound) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator(),
      vol = this.ctx.createGain(),
      now = this.ctx.currentTime + delay;
    osc.type = type;
    osc.frequency.value = frequency;
    vol.gain.setValueAtTime(0, now);
    vol.gain.linearRampToValueAtTime(gain * this.settings.volume, now + .015);
    vol.gain.exponentialRampToValueAtTime(.0001, now + duration);
    osc.connect(vol);
    vol.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + .02);
    this.nodes.add(osc);
    osc.onended = () => {
      this.nodes.delete(osc);
      osc.disconnect();
      vol.disconnect();
    };
  }
  click() {
    this.tone(540, .035, 0, 'triangle', .04);
  }
  startup() {
    [220, 330, 440, 660].forEach((n, i) => this.tone(n, .55, i * .14, 'sine', .1));
  }
  notify() {
    this.tone(660, .18);
    this.tone(880, .25, .15);
  }
  stop() {
    for (const node of this.nodes) {
      try {
        node.stop();
      } catch {}
    }
    this.nodes.clear();
  }
  modem() {
    [700, 1200, 900, 1600, 600, 1800].forEach((n, i) => this.tone(n, .06, i * .08, 'square', .025));
  }
}
