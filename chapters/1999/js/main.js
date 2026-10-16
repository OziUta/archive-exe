import { $, $$, esc, icon, toast } from './ui.js';
import { SaveManager } from './save-manager.js';
import { Story } from './story.js';
import { AudioEngine } from './audio.js';
import { WindowManager } from './window-manager.js';
import { setupBoot } from './boot.js';
import { explorer, archive, recycle } from './apps/explorer.js';
import { mail, messenger } from './apps/communication.js';
import { notepad, documentViewer } from './apps/notepad.js';
import { browser } from './apps/browser.js';
import { player } from './apps/player.js';
import { welcome, journal, settings, terminal, midnight } from './apps/system.js';
import { snake } from './games/snake.js';
import { minefield } from './games/minefield.js';
const definitions = {
  explorer: {
    name: 'Мой компьютер',
    icon: 'computer',
    render: explorer
  },
  mail: {
    name: 'PostBox 99',
    icon: 'mail',
    render: mail,
    width: 790,
    height: 550
  },
  chat: {
    name: 'NetChat',
    icon: 'chat',
    render: messenger,
    width: 710,
    height: 520
  },
  notepad: {
    name: 'Блокнот',
    icon: 'notepad',
    render: notepad
  },
  browser: {
    name: 'RetroWeb',
    icon: 'browser',
    render: browser,
    width: 740,
    height: 540
  },
  player: {
    name: 'MediaPlayer 99',
    icon: 'player',
    render: player,
    width: 425,
    height: 450
  },
  games: {
    name: 'Игры',
    icon: 'games'
  },
  recycle: {
    name: 'Корзина',
    icon: 'recycle',
    render: recycle,
    width: 570,
    height: 370
  },
  settings: {
    name: 'Настройки',
    icon: 'settings',
    render: settings,
    width: 550,
    height: 565
  },
  journal: {
    name: 'Дневник',
    icon: 'journal',
    render: journal,
    width: 530,
    height: 560
  },
  snake: {
    name: 'Snake 99',
    icon: 'games',
    render: snake,
    width: 480,
    height: 620
  },
  minefield: {
    name: 'Minefield',
    icon: 'games',
    render: minefield,
    width: 485,
    height: 590
  },
  terminal: {
    name: 'Командная строка',
    icon: 'terminal',
    render: terminal,
    width: 620,
    height: 430
  },
  welcome: {
    name: 'С возвращением — HOME OS 99',
    icon: 'computer',
    render: welcome,
    width: 655,
    height: 420
  },
  archive: {
    name: 'window.zip — HOME Archiver',
    icon: 'archive',
    render: archive,
    width: 610,
    height: 510
  },
  midnight: {
    name: 'Окно / midnight.exe',
    icon: 'archive',
    render: midnight,
    width: 690,
    height: 590
  }
};
async function init() {
  const data = {};
  await Promise.all(['filesystem', 'emails', 'chats', 'websites', 'story'].map(async key => {
    const response = await fetch(new URL('../data/' + key + '.json', import.meta.url));
    if (!response.ok) throw Error('Не удалось прочитать ' + key + '.json');
    data[key] = await response.json();
  }));
  let save;
  try {
    save = new SaveManager();
  } catch {
    const fallback = {
      getItem: () => null,
      setItem: () => {
        throw Error('Storage disabled');
      }
    };
    save = new SaveManager(fallback);
    save.warning = 'Автосохранение недоступно. Используй экспорт JSON в Настройках.';
  }
  const wm = new WindowManager(),
    audio = new AudioEngine(save.state.settings),
    story = new Story(save, data.story, toast);
  const ctx = {
    data,
    save,
    wm,
    audio,
    story
  };
  ctx.applySettings = () => {
    const s = save.state.settings;
    document.body.classList.toggle('crt', s.crt);
    document.body.classList.toggle('no-motion', s.animations === 0);
    document.body.classList.toggle('summer', s.theme === 'summer');
    document.documentElement.style.setProperty('--ui', s.scale + 'px');
    document.documentElement.style.setProperty('--speed', s.animations === 2 ? '.5' : '1');
    audio.settings = s;
    if (!s.sound) audio.stop();
    $('#sound-toggle').textContent = s.sound ? '♪' : '×';
    $('#sound-toggle').setAttribute('aria-label', s.sound ? 'Выключить звук' : 'Включить звук');
    $('#clock').innerHTML = story.has('ending') ? '00:00<small>01.01.2000</small>' : '23:47<small>31.12.1999</small>';
  };
  ctx.document = (name, text, event) => documentViewer(ctx, name, text, event);
  ctx.open = (id, options = {}) => {
    if (id === 'games') return ctx.open('explorer', {
      path: 'C:/GAMES'
    });
    const def = definitions[id];
    if (!def) return;
    const existing = wm.windows.get(id);
    if (existing) {
      wm.focus(id);
      const target = options.path ?? options.address ?? options.contact ?? options.track;
      if (target !== undefined) existing.navigate?.(target);
      return existing;
    }
    audio.click();
    return wm.open(id, def.name, def.icon, (body, win) => def.render(ctx, body, win, options), {
      width: def.width || 680,
      height: def.height || 470
    });
  };
  ctx.restart = () => {
    for (const id of [...wm.windows.keys()]) wm.close(id);
    ctx.applySettings();
    save.state.started = true;
    story.achieve('boot');
    save.save();
    ctx.open(story.has('ending') ? 'journal' : 'welcome');
    if (save.warning) toast(save.warning);
  };
  ctx.openFile = file => {
    if (file.secret) story.secret(file.secret);
    if (file.type === 'text') ctx.document(file.path.split('/').at(-1), file.text, file.event);
    if (file.type === 'archive') ctx.open('archive');
    if (file.type === 'app') ctx.open(file.app);
    if (file.type === 'music') ctx.open('player', {
      track: file.track
    });
    if (file.type === 'image') wm.open('image:' + file.path, file.path.split('/').at(-1), 'image', body => {
      body.innerHTML = `<div class="photo-view"><img src="assets/images/${file.image}" alt="${esc(file.caption)}"><p>${esc(file.caption)}</p></div>`;
    }, {
      width: 630,
      height: 470
    });
  };
  ctx.applySettings();
  const shortcuts = ['explorer', 'mail', 'chat', 'browser', 'notepad', 'recycle', 'games', 'player', 'journal', 'settings'];
  $('#shortcuts').innerHTML = shortcuts.map(id => `<button class="shortcut" data-launch="${id}">${icon(definitions[id].icon)}<span>${definitions[id].name}</span></button>`).join('');
  for (const b of $$('.shortcut')) {
    b.onclick = e => {
      if (innerWidth <= 700 || e.detail === 0) ctx.open(b.dataset.launch);
    };
    b.ondblclick = () => {
      if (innerWidth > 700) ctx.open(b.dataset.launch);
    };
  }
  $('#start-menu').innerHTML = '<div class="start-heading">home <i>os 99</i></div>' + [...shortcuts, 'terminal'].map(id => `<button data-launch="${id}">${icon(definitions[id].icon)}${definitions[id].name}</button>`).join('');
  for (const b of $$('[data-launch]', $('#start-menu'))) b.onclick = () => {
    ctx.open(b.dataset.launch);
    $('#start-menu').hidden = true;
    $('#start').setAttribute('aria-expanded', 'false');
  };
  const toggle = () => {
    const menu = $('#start-menu');
    menu.hidden = !menu.hidden;
    $('#start').setAttribute('aria-expanded', String(!menu.hidden));
    if (!menu.hidden) $('button', menu).focus();
  };
  $('#start').onclick = toggle;
  document.addEventListener('pointerdown', e => {
    if (!e.target.closest('#start-menu') && !e.target.closest('#start')) {
      $('#start-menu').hidden = true;
      $('#start').setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      $('#start-menu').hidden = true;
      $('#start').setAttribute('aria-expanded', 'false');
    }
    if (e.ctrlKey && e.key === 'Escape') {
      e.preventDefault();
      toggle();
    }
  });
  $('#sound-toggle').onclick = () => {
    save.state.settings.sound = !save.state.settings.sound;
    audio.init();
    ctx.applySettings();
    save.save();
  };
  $('#journal-shortcut').onclick = () => ctx.open('journal');
  setupBoot(ctx, () => {
    ctx.open(story.has('ending') ? 'journal' : 'welcome');
  });
  window.addEventListener('pagehide', () => save.save());
}
init().catch(error => {
  console.error(error);
  $('#load-error').textContent = 'Не удалось загрузить диск. Запусти проект через HTTP-сервер (инструкция в README), затем обнови страницу. ' + error.message;
  $('#power').textContent = 'Диск недоступен';
});
