import { $, $$, esc, icon, toast } from '../ui.js';
import { entries, children, parentPath, basename } from '../filesystem.js';
export function explorer(ctx, body, win, options = {}) {
  let path = options.path || 'C:',
    showHidden = false,
    selected = null,
    context;
  const all = () => entries(ctx.data.filesystem, ctx.save.state, ctx.data.story);
  const kind = f => ({
    folder: 'folder',
    text: 'notepad',
    image: 'image',
    archive: 'archive',
    app: f.app === 'snake' || f.app === 'minefield' ? 'games' : f.app === 'midnight' ? 'archive' : f.app,
    music: 'player'
  })[f.type] || 'notepad';
  function properties(file) {
    if (!file) {
      toast('Сначала выбери файл одним нажатием.');
      return;
    }
    ctx.wm.open('properties:' + file.path, 'Свойства · ' + basename(file.path), kind(file), b => {
      b.innerHTML = `<div class="paper"><p class="eyebrow">ВИРТУАЛЬНЫЙ ДИСК C:</p><h2>${esc(basename(file.path))}</h2><p>Тип: ${esc(file.type)}<br>Путь: ${esc(file.path)}<br>Дата: 31.12.1999<br>Размер содержимого: ${new TextEncoder().encode(file.text || '').length} байт<br>Скрытый: ${file.hidden ? 'да' : 'нет'}</p><small>Это игровой файл. Реальные файлы устройства не изменяются.</small></div>`;
    }, {
      width: 450,
      height: 330
    });
  }
  function open(file) {
    selected = file;
    if (file.type === 'folder') {
      path = file.path;
      render();
    } else ctx.openFile(file);
  }
  function render() {
    body.innerHTML = `<div class="toolbar"><button data-up aria-label="Вверх">↑ Вверх</button><button data-home>C:</button><button data-props>Свойства</button><label><input type="checkbox" data-hidden ${showHidden ? 'checked' : ''}> Скрытые</label></div><form class="toolbar"><label for="path">Адрес</label><input id="path" aria-label="Адрес папки" value="${esc(path)}/"><button>Перейти</button></form><div class="file-grid"></div><div class="statusbar"></div>`;
    const files = children(all(), path, showHidden);
    $('.statusbar', body).textContent = `${files.length} объектов · Двойное нажатие / Enter — открыть`;
    $('.file-grid', body).innerHTML = files.map((f, i) => `<button class="file ${f.hidden ? 'hidden-file' : ''}" data-index="${i}" title="${esc(basename(f.path))}">${icon(kind(f))}<span>${esc(basename(f.path))}</span></button>`).join('');
    for (const el of $$('.file', body)) {
      const f = files[+el.dataset.index];
      el.onclick = e => {
        selected = f;
        if (innerWidth <= 700 || e.detail === 0) open(f);
      };
      el.ondblclick = () => {
        if (innerWidth > 700) open(f);
      };
      el.oncontextmenu = e => {
        e.preventDefault();
        context?.remove();
        context = document.createElement('div');
        context.className = 'context-menu bevel';
        context.innerHTML = '<button data-open>Открыть</button><button data-properties>Свойства</button>';
        context.style.left = Math.min(e.clientX, innerWidth - 160) + 'px';
        context.style.top = Math.min(e.clientY, innerHeight - 100) + 'px';
        document.body.append(context);
        $('[data-open]', context).onclick = () => {
          context.remove();
          open(f);
        };
        $('[data-properties]', context).onclick = () => {
          context.remove();
          properties(f);
        };
      };
    }
    $('[data-up]', body).onclick = () => {
      path = parentPath(path);
      render();
    };
    $('[data-home]', body).onclick = () => {
      path = 'C:';
      render();
    };
    $('[data-props]', body).onclick = () => properties(selected);
    $('[data-hidden]', body).onchange = e => {
      showHidden = e.target.checked;
      render();
    };
    $('form', body).onsubmit = e => {
      e.preventDefault();
      const typed = $('#path', body).value.trim().replaceAll('\\', '/').replace(/\/+$/, '');
      const found = all().find(f => f.type === 'folder' && f.path.toLowerCase() === typed.toLowerCase());
      if (found) {
        path = found.path;
        render();
      } else toast('Папка не найдена на виртуальном диске.');
    };
  }
  const dismiss = e => {
    if (context && !context.contains(e.target)) context.remove();
  };
  document.addEventListener('pointerdown', dismiss);
  win.cleanup.push(() => {
    context?.remove();
    document.removeEventListener('pointerdown', dismiss);
  });
  win.navigate = newPath => {
    path = newPath;
    render();
  };
  win.onVisibility = visible => {
    if (visible) render();
  };
  render();
}
export function archive(ctx, body) {
  const render = () => {
    if (ctx.story.has('archive')) {
      body.innerHTML = `<div class="paper"><div class="eyebrow">WINDOW.ZIP / АРХИВ РАСПАКОВАН</div><h2>Подарок, который остался.</h2><p class="doc-content">${esc(ctx.data.story.archiveText)}</p><div class="archive-items"><button data-letter>▤ letter_for_anya.txt</button><button data-site>◉ okno.home — сохранённая страница</button><button data-program>▣ midnight.exe</button><button data-chat>▤ recovered.log — восстановить NetChat</button></div></div>`;
      $('[data-letter]', body).onclick = () => ctx.document('letter_for_anya.txt', ctx.data.story.letterForAnya);
      $('[data-site]', body).onclick = () => ctx.open('browser', {
        address: 'okno.home'
      });
      $('[data-program]', body).onclick = () => ctx.open('midnight');
      $('[data-chat]', body).onclick = () => {
        ctx.open('chat', {
          contact: 'misha'
        });
        toast('Хвост переписки восстановлен из архива.');
      };
      return;
    }
    body.innerHTML = `<form class="archive-form"><div class="eyebrow">HOME ARCHIVER 1.2</div><h2>У каждого места есть имя.</h2><p>Архив <b>window.zip</b> защищён паролем.<br>Подсказка владельца: «Наше место + время репетиции».</p><div class="form-row"><input aria-label="Пароль архива" placeholder="Пароль" autocomplete="off"><button>Открыть архив</button></div><p class="error" role="status"></p><small>Содержимое не удаляется при неправильном пароле.</small></form>`;
    $('form', body).onsubmit = e => {
      e.preventDefault();
      if (ctx.story.unlockArchive($('input', body).value)) {
        ctx.audio.notify();
        render();
      } else $('.error', body).textContent = 'Не подошло. Место латиницей, затем четыре цифры — без пробелов.';
    };
  };
  render();
}
export function recycle(ctx, body) {
  function render() {
    body.innerHTML = `<div class="paper"><div class="eyebrow">КОРЗИНА / УДАЛЁННЫЕ ФАЙЛЫ</div><h2>Не всё исчезает навсегда.</h2>${ctx.save.state.restored.includes('rehearsal') ? '<p>Корзина пуста. rehearsal.txt восстановлен в DOCUMENTS / PERSONAL.</p><button data-open>Открыть восстановленную записку</button>' : '<p>rehearsal.txt<br><small>Удалён: 31.12.1999 23:35 · Исходная папка: DOCUMENTS / PERSONAL</small></p><button data-preview>Посмотреть</button> <button data-restore>Восстановить файл</button>'}</div>`;
    const preview = () => ctx.document('rehearsal.txt', ctx.data.story.rehearsal, 'rehearsal');
    if ($('[data-preview]', body)) $('[data-preview]', body).onclick = preview;
    if ($('[data-open]', body)) $('[data-open]', body).onclick = preview;
    if ($('[data-restore]', body)) $('[data-restore]', body).onclick = () => {
      ctx.save.state.restored.push('rehearsal');
      ctx.save.save();
      ctx.story.event('rehearsal');
      toast('rehearsal.txt восстановлен в DOCUMENTS / PERSONAL');
      render();
      preview();
    };
  }
  render();
}
