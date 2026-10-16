import { $, esc, toast, download } from '../ui.js';
export function notepad(ctx, body, win) {
  body.innerHTML = `<div class="toolbar"><button data-save>Сохранить</button><button data-export>Скачать .txt</button><span class="muted">Мои заметки.txt</span></div><textarea class="notepad-area" aria-label="Мои заметки" maxlength="100000" spellcheck="false" placeholder="Место для твоих наблюдений. Пароли, имена, странные совпадения…">${esc(ctx.save.state.notes)}</textarea><div class="statusbar">Заметки сохраняются автоматически на этом устройстве.</div>`;
  const area = $('textarea', body);
  const save = () => {
    ctx.save.state.notes = area.value;
    ctx.save.save();
    $('.statusbar', body).textContent = ctx.save.warning || 'Сохранено · ' + area.value.length + ' символов';
  };
  area.oninput = save;
  $('[data-save]', body).onclick = () => {
    save();
    toast(ctx.save.warning || 'Заметки сохранены.');
  };
  $('[data-export]', body).onclick = () => download('1999-notes.txt', area.value, 'text/plain');
  body.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      save();
    }
  });
}
export function documentViewer(ctx, name, text, event) {
  if (event) ctx.story.event(event);
  ctx.wm.open('doc:' + name, name + ' — Блокнот', 'notepad', body => {
    body.innerHTML = `<div class="toolbar"><span>Файл · Сохранённый документ</span><button data-notes>Мои заметки</button></div><div class="paper"><pre class="doc-content">${esc(text)}</pre></div><div class="statusbar">Только чтение · ${esc(name)}</div>`;
    $('[data-notes]', body).onclick = () => ctx.open('notepad');
  }, {
    width: 590,
    height: 500
  });
}
