import { $, $$, esc, icon, toast, confirmAction, download } from '../ui.js';
export function welcome(ctx, body) {
  body.innerHTML = `<div class="welcome"><div class="welcome-art"><img src="assets/images/roof.svg" alt="Трое друзей встречают закат на крыше"></div><div class="welcome-copy"><div class="eyebrow">С ВОЗВРАЩЕНИЕМ, LEX</div><h1>Ты давно<br>не заходил.</h1><p>Диск цел. Папки на месте.<br>Одно письмо всё ещё ждёт ответа.</p><button data-mail>Открыть PostBox 99 →</button><small>HOME OS 99 · PERSONAL EDITION<br>Последний сеанс: 31.12.1999, 23:47</small><p><small>Двойное нажатие открывает ярлык.<br>На телефоне достаточно одного.<br>Застрял? Загляни в «Дневник».</small></p></div></div>`;
  $('[data-mail]', body).onclick = () => {
    ctx.wm.close('welcome');
    ctx.open('mail');
  };
}
export function journal(ctx, body, win) {
  function render() {
    const n = ctx.story.chapter;
    const evidence = [['letter', 'Непрочитанное письмо Ани'], ['chat', 'Разговор с Мишей о названии'], ['rehearsal', 'Записка о репетиции'], ['archive', 'Архив проекта'], ['site', 'Страница с четырьмя огнями'], ['ending', 'История восстановлена']];
    const names = {
      boot: 'Первый запуск',
      mail: 'Письмо из прошлого',
      hidden: 'Между строк',
      game: 'Ещё одну партию',
      ending: 'Окно открыто'
    };
    body.innerHTML = `<div class="paper"><div class="eyebrow">ДНЕВНИК / СЛЕДЫ НА ДИСКЕ</div><h2>${n === 5 ? 'История восстановлена' : `Глава ${n + 1}. ${esc(ctx.data.story.chapters[n])}`}</h2><div class="progress-dots">${Array.from({
      length: 5
    }, (_, i) => `<i class="${i < n ? 'done' : ''}"></i>`).join('')}</div><p class="muted">${n === 5 ? 'Можно остаться здесь: сыграть партию, дочитать письма или поискать секреты.' : 'Не спеши. У каждой папки есть своя история.'}</p><div class="journal-card">${evidence.map(([id, label]) => `<p style="margin:5px 0;font-size:12px">${ctx.story.has(id) ? '✓ ' + esc(label) : '○ Неизвестная зацепка'}</p>`).join('')}</div>${n < 5 ? '<button data-hint>Мягкая подсказка</button><p class="hint" data-hint-text>Первое нажатие — направление. Следующие — более точная помощь.</p>' : '<button data-ending>Посмотреть финал ещё раз</button>'}<div class="journal-card"><h3>Достижения</h3><div class="achievements">${Object.entries(names).map(([id, label]) => `<div class="achievement ${ctx.save.state.achievements.includes(id) ? '' : 'locked'}">${ctx.save.state.achievements.includes(id) ? '◆ ' + label : '◇ Не открыто'}</div>`).join('')}</div><p><small>Необязательные секреты: ${ctx.save.state.secrets.length} / 6</small></p><button data-notes>Мои заметки</button></div></div>`;
    if ($('[data-hint]', body)) $('[data-hint]', body).onclick = () => {
      $('[data-hint-text]', body).textContent = ctx.story.hint();
    };
    if ($('[data-ending]', body)) $('[data-ending]', body).onclick = () => ctx.open('midnight');
    $('[data-notes]', body).onclick = () => ctx.open('notepad');
  }
  win.onVisibility = v => {
    if (v) render();
  };
  render();
}
export function settings(ctx, body) {
  const s = ctx.save.state.settings;
  body.innerHTML = `<div class="paper"><div class="eyebrow">ПАНЕЛЬ УПРАВЛЕНИЯ</div><h2>Устроиться поудобнее.</h2><label class="setting-row">Звуки и музыка <input type="checkbox" data-setting="sound" ${s.sound ? 'checked' : ''}></label><label class="setting-row">Громкость <input type="range" min="0" max="1" step=".05" data-setting="volume" value="${s.volume}"></label><label class="setting-row">Анимации <select data-setting="animations"><option value="0">Выключены</option><option value="1">Обычные</option><option value="2">Быстрые</option></select></label><label class="setting-row">Размер текста <select data-setting="scale"><option value="12">Мелкий</option><option value="14">Обычный</option><option value="16">Крупный</option><option value="18">Очень крупный</option></select></label><label class="setting-row">CRT-эффект <input type="checkbox" data-setting="crt" ${s.crt ? 'checked' : ''}></label><label class="setting-row">Быстрая загрузка <input type="checkbox" data-setting="fastBoot" ${s.fastBoot ? 'checked' : ''}></label><label class="setting-row">Обои <select data-setting="theme"><option value="teal">Тихий вечер</option>${ctx.save.state.secrets.includes('theme') ? '<option value="summer">Лето 99</option>' : ''}</select></label><div class="settings-actions"><button data-fullscreen>Полный экран</button><button data-export>Экспорт сохранения</button><button data-import>Импорт JSON</button><input type="file" accept="application/json,.json" data-file hidden><button data-reset class="danger">Сбросить прогресс</button></div><p class="error" data-message role="status"></p><p><small>Сохранение находится в этом браузере. Экспортируй JSON перед очисткой данных или переходом на другое устройство.</small></p></div>`;
  for (const key of ['animations', 'scale', 'theme']) $(`[data-setting="${key}"]`, body).value = s[key];
  for (const el of $$('[data-setting]', body)) el.onchange = () => {
    s[el.dataset.setting] = el.type === 'checkbox' ? el.checked : ['volume', 'animations', 'scale'].includes(el.dataset.setting) ? +el.value : el.value;
    ctx.applySettings();
    ctx.save.save();
  };
  $('[data-fullscreen]', body).onclick = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();else throw Error('Этот браузер не поддерживает полный экран.');
    } catch (error) {
      $('[data-message]', body).textContent = error.message || 'Полный экран недоступен.';
    }
  };
  $('[data-export]', body).onclick = () => download('1999-exe-save.json', ctx.save.export());
  $('[data-import]', body).onclick = () => $('[data-file]', body).click();
  $('[data-file]', body).onchange = async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      if (f.size > 200000) throw Error('Файл слишком большой. Нужен JSON сохранения 1999.exe.');
      const text = await f.text();
      const {
        validateSave
      } = await import('../save-manager.js');
      validateSave(JSON.parse(text));
      if (await confirmAction('Заменить текущий прогресс импортированным сохранением? Текущий прогресс можно заранее экспортировать.')) {
        ctx.save.import(text);
        ctx.restart();
      }
    } catch (error) {
      $('[data-message]', body).textContent = 'Импорт не выполнен: ' + error.message;
    }
    e.target.value = '';
  };
  $('[data-reset]', body).onclick = async () => {
    if (await confirmAction('Начать заново? Письма, заметки, рекорды и найденные секреты будут сброшены.')) {
      ctx.save.reset();
      ctx.restart();
    }
  };
  if (ctx.save.error || ctx.save.warning) $('[data-message]', body).textContent = ctx.save.error || ctx.save.warning;
}
export function terminal(ctx, body) {
  body.innerHTML = '<div class="terminal"><pre data-output>HOME COMMAND 2.1\nВиртуальная консоль. Реальные команды не выполняются.\nНабери help для списка команд.\n</pre><form><span>C:\\&gt;</span><input aria-label="Команда" autocomplete="off" spellcheck="false"><button>↵</button></form></div>';
  const output = $('[data-output]', body);
  $('form', body).onsubmit = e => {
    e.preventDefault();
    const input = $('input', body),
      command = input.value.trim().toLowerCase();
    input.value = '';
    let result = 'Неизвестная команда. Попробуй help.';
    if (command === 'help') result = 'help — справка\ndir — каталоги диска\ntime — системное время\nver — версия\necho ТЕКСТ — вывести строку\nclear — очистить экран\nРома знает ещё одно слово.';
    if (command === 'dir') result = 'SYSTEM  PROGRAMS  GAMES  DOCUMENTS\nPICTURES  MUSIC  DOWNLOADS  OLD_BACKUP';
    if (command === 'time') result = '31.12.1999 23:47\nПредупреждение: батарейка часов разряжена.';
    if (command === 'ver') result = 'HOME OS 99 / build 1999.12.31\nМашина времени не установлена.';
    if (command === 'xyzzy') {
      ctx.story.secret('xyzzy');
      result = 'Ничего не произошло.\nИ всё-таки где-то в старой пещере зажёгся маленький огонёк.\nПривет первым текстовым приключениям.';
    }
    if (command.startsWith('echo ')) result = command.slice(5);
    if (command === 'clear') {
      output.textContent = '';
      return;
    }
    output.textContent += '\nC:\\> ' + command + '\n' + result + '\n';
    $('.terminal', body).scrollTop = $('.terminal', body).scrollHeight;
  };
}
export function midnight(ctx, body) {
  let page = 0;
  function render() {
    if (!ctx.story.has('archive')) {
      body.innerHTML = '<div class="paper"><h2>Файл ещё в архиве.</h2><p>Сначала открой window.zip в DOCUMENTS / ARCHIVE.</p></div>';
      return;
    }
    if (!ctx.story.has('program')) {
      body.innerHTML = '<form class="archive-form"><div class="eyebrow">MIDNIGHT.EXE / ОКНО 1.0</div><h2>Зажги четыре огня.</h2><p>Четыре цифры со страницы okno.home.<br>Порядок важнее направления.</p><div class="form-row"><input aria-label="Ключ программы" inputmode="numeric" maxlength="4" placeholder="····" autocomplete="off"><button>Открыть окно</button></div><p class="error" role="status"></p></form>';
      $('form', body).onsubmit = e => {
        e.preventDefault();
        if (ctx.story.unlockProgram($('input', body).value)) {
          ctx.audio.startup();
          render();
        } else $('.error', body).textContent = 'Огни зажглись не в том порядке. Вернись к описанию на странице.';
      };
      return;
    }
    if (page < ctx.data.story.ending.length) {
      const scene = ctx.data.story.ending[page];
      body.innerHTML = `<div class="ending"><div class="eyebrow">${esc(scene.time)} · ${page + 1} / 4</div><h2>${esc(scene.title)}</h2>${page === 0 || page === 3 ? '<img src="assets/images/roof.svg" alt="Трое друзей на крыше">' : ''}<p>${esc(scene.text)}</p><button data-next>${page === 3 ? 'Открыть окно' : 'Дальше →'}</button></div>`;
      $('[data-next]', body).onclick = () => {
        page++;
        render();
      };
    } else {
      ctx.story.event('ending');
      ctx.applySettings();
      body.innerHTML = `<div class="ending"><div class="eyebrow">1999.EXE / КОНЕЦ ИСТОРИИ</div><h2>Некоторые файлы<br>стоило открыть.</h2><img src="assets/images/roof.svg" alt="Окно в лето 1999 года"><p>На экране — крыша, на которой вы когда-то придумали собственное созвездие. И подпись, которую ты написал семнадцатилетним:<br><br>«Если окно горит — значит, тебя ждут».<br><br>Ты достаёшь телефон. На этот раз не нужно придумывать программу. Достаточно написать: «Нашёл. Показывать?»</p><button data-desktop>Вернуться на рабочий стол</button><p style="text-align:center"><small>Спасибо, что заглянул. Этот маленький мир останется здесь.</small></p></div>`;
      $('[data-desktop]', body).onclick = () => {
        ctx.wm.close('midnight');
        ctx.open('journal');
      };
    }
  }
  render();
}
