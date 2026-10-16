import { $, icon, esc } from './ui.js';
export class WindowManager {
  constructor() {
    this.windows = new Map();
    this.layer = 10;
    this.active = null;
    this.root = $('#windows');
    this.tasks = $('#tasks');
    window.addEventListener('resize', () => this.clampAll());
    document.addEventListener('keydown', e => {
      if (e.altKey && e.key === 'F4' && this.active) {
        e.preventDefault();
        this.close(this.active);
      }
      if (e.altKey && e.key === 'Tab') {
        e.preventDefault();
        const ids = [...this.windows.keys()];
        this.focus(ids[(ids.indexOf(this.active) + 1) % ids.length]);
      }
    });
  }
  open(id, title, iconName, render, {
    width = 680,
    height = 470
  } = {}) {
    if (this.windows.has(id)) {
      this.focus(id);
      return this.windows.get(id);
    }
    const el = document.createElement('section');
    el.className = 'window';
    el.dataset.app = id;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', title);
    const n = this.windows.size;
    el.style.cssText = `width:${width}px;height:${height}px;left:${Math.min(220 + n * 24, innerWidth - width - 20)}px;top:${Math.min(45 + n * 22, innerHeight - height - 100)}px`;
    el.innerHTML = `<header class="titlebar"><span class="window-title">${icon(iconName)}${esc(title)}</span><div class="window-controls"><button data-min title="Свернуть" aria-label="Свернуть">_</button><button data-max title="Развернуть" aria-label="Развернуть">□</button><button data-close title="Закрыть" aria-label="Закрыть">×</button></div></header><div class="window-body"></div>`;
    const task = document.createElement('button');
    task.className = 'task-button';
    task.innerHTML = `${icon(iconName)}<span class="task-label">${esc(title)}</span>`;
    task.title = title;
    task.setAttribute('aria-label', title);
    this.root.append(el);
    this.tasks.append(task);
    const win = {
      id,
      el,
      body: $('.window-body', el),
      task,
      cleanup: [],
      onVisibility: null
    };
    this.windows.set(id, win);
    // Native corner resizing must keep the titlebar controls in reach.
    if (globalThis.ResizeObserver) {
      const observer = new ResizeObserver(() => this.clamp(win));
      observer.observe(el);
      win.cleanup.push(() => observer.disconnect());
    }
    el.addEventListener('pointerdown', () => {
      if (this.active !== id) this.focus(id, false);
    });
    $('[data-close]', el).onclick = () => this.close(id);
    $('[data-min]', el).onclick = () => this.minimize(id);
    $('[data-max]', el).onclick = () => this.maximize(id);
    task.onclick = () => this.active === id && !el.hidden ? this.minimize(id) : this.focus(id);
    const bar = $('.titlebar', el);
    bar.ondblclick = e => {
      if (!e.target.closest('button')) this.maximize(id);
    };
    let drag = null;
    bar.addEventListener('pointerdown', e => {
      if (e.target.closest('button') || el.classList.contains('maximized') || innerWidth <= 700) return;
      drag = {
        x: e.clientX,
        y: e.clientY,
        left: el.offsetLeft,
        top: el.offsetTop
      };
      bar.setPointerCapture(e.pointerId);
    });
    bar.addEventListener('pointermove', e => {
      if (!drag) return;
      el.style.left = drag.left + e.clientX - drag.x + 'px';
      el.style.top = drag.top + e.clientY - drag.y + 'px';
      this.clamp(win);
    });
    bar.addEventListener('pointerup', () => drag = null);
    bar.addEventListener('pointercancel', () => drag = null);
    this.focus(id, false);
    render(win.body, win);
    this.clamp(win);
    return win;
  }
  focus(id, keyboard = true) {
    const win = this.windows.get(id);
    if (!win) return;
    this.active = id;
    win.el.hidden = false;
    this.clamp(win);
    win.el.style.zIndex = ++this.layer;
    for (const [key, w] of this.windows) {
      w.el.classList.toggle('active', id === key);
      w.task.classList.toggle('selected', id === key);
      w.onVisibility?.(key === id && !w.el.hidden);
    }
    if (keyboard) ($('input:not([type=file]),textarea,button,canvas', win.body) || $('[data-close]', win.el))?.focus({
      preventScroll: true
    });
  }
  minimize(id) {
    const w = this.windows.get(id);
    if (!w) return;
    w.el.hidden = true;
    w.task.classList.remove('selected');
    w.onVisibility?.(false);
    if (this.active === id) {
      this.active = null;
      const next = [...this.windows.values()].filter(x => !x.el.hidden).sort((a, b) => Number(b.el.style.zIndex) - Number(a.el.style.zIndex))[0];
      if (next) this.focus(next.id, false);
    }
  }
  maximize(id) {
    const w = this.windows.get(id);
    w.el.classList.toggle('maximized');
    this.clamp(w);
  }
  close(id) {
    const w = this.windows.get(id);
    if (!w) return;
    this.minimize(id);
    for (const fn of w.cleanup) fn();
    w.el.remove();
    w.task.remove();
    this.windows.delete(id);
  }
  clamp(w) {
    // Hidden elements report zero dimensions; preserve their saved geometry.
    if (w.el.hidden || innerWidth <= 700 || w.el.classList.contains('maximized')) return;
    const d = $('#desktop');
    w.el.style.width = Math.min(w.el.offsetWidth, d.clientWidth - 8) + 'px';
    w.el.style.height = Math.min(w.el.offsetHeight, d.clientHeight - 8) + 'px';
    w.el.style.left = Math.max(0, Math.min(w.el.offsetLeft, d.clientWidth - w.el.offsetWidth)) + 'px';
    w.el.style.top = Math.max(0, Math.min(w.el.offsetTop, d.clientHeight - w.el.offsetHeight)) + 'px';
  }
  clampAll() {
    for (const w of this.windows.values()) this.clamp(w);
  }
}
