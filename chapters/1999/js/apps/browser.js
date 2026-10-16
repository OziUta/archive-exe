import { $, $$, esc, toast } from '../ui.js';
export function browser(ctx, body, win, options = {}) {
  let address = options.address || 'oldsearch.home',
    history = [],
    index = -1;
  const normalize = value => value.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
  function navigate(value, push = true) {
    address = normalize(value);
    if (push) {
      history = history.slice(0, index + 1);
      history.push(address);
      index = history.length - 1;
    }
    render();
  }
  function render() {
    const site = ctx.data.websites.find(s => s.address === address);
    body.innerHTML = `<form class="toolbar"><button type="button" data-back aria-label="Назад" ${index < 1 ? 'disabled' : ''}>←</button><button type="button" data-forward aria-label="Вперёд" ${index >= history.length - 1 ? 'disabled' : ''}>→</button><button type="button" data-home>Домой</button><input aria-label="Виртуальный адрес" value="${esc(address)}"><button>Перейти</button></form><div class="web-page"></div><div class="statusbar">RetroWeb · Сохранённая внутриигровая сеть. Не настоящий интернет.</div>`;
    $('form', body).onsubmit = e => {
      e.preventDefault();
      ctx.audio.modem();
      navigate($('input', body).value);
    };
    $('[data-back]', body).onclick = () => {
      index--;
      navigate(history[index], false);
    };
    $('[data-forward]', body).onclick = () => {
      index++;
      navigate(history[index], false);
    };
    $('[data-home]', body).onclick = () => navigate('oldsearch.home');
    const page = $('.web-page', body);
    if (!site) {
      page.innerHTML = '<h2>Страница не найдена</h2><p>В этой копии сети такого адреса нет. Попробуй OldSearch или проверь адрес из записки.</p>';
      return;
    }
    if (address === 'okno.home' && !ctx.story.has('archive')) {
      page.innerHTML = '<h2>Личная копия не смонтирована</h2><p>Страница хранится внутри window.zip. Сначала открой архив.</p>';
      return;
    }
    if (address === 'oldsearch.home') {
      page.classList.add('search');
      page.innerHTML = `<div class="eyebrow">HOME NETWORK · SINCE 1997</div><div class="search-brand">Old<em>Search</em></div><p>Маленькая сеть. Большой мир.</p><form data-search class="form-row"><input aria-label="Поиск в OldSearch" placeholder="Что будем искать?"><button>Найти</button></form><div data-results></div><div class="web-footer">Ищет среди 4 сохранённых страниц · Обновлено 31.12.99</div>`;
      const results = query => {
        const q = query.toLowerCase().trim();
        if (q === 'будущее') {
          ctx.story.secret('future');
          $('[data-results]', page).innerHTML = '<p>Будущее не найдено в кэше.<br>Выйдите из дома и попробуйте ещё раз.</p>';
          return;
        }
        const sites = ctx.data.websites.filter(s => s.address !== 'oldsearch.home' && (s.address !== 'okno.home' || ctx.story.has('archive')) && (!q || (s.title + ' ' + s.address + ' ' + s.text).toLowerCase().includes(q)));
        $('[data-results]', page).innerHTML = sites.length ? sites.map(s => `<p><button class="web-link" data-url="${s.address}">${esc(s.title)}</button><br><small>${s.address}</small></p>`).join('') : '<p>Совпадений нет. Попробуй «Лёша», «игры» или пустой запрос.</p>';
        wire();
      };
      $('[data-search]', page).onsubmit = e => {
        e.preventDefault();
        results($('input', page).value);
      };
      results('');
    } else {
      page.classList.add(address === 'lex.home' ? 'homepage' : address === 'gamezone.home' ? 'forum' : 'secret-page');
      if (address === 'okno.home') ctx.story.event('site');
      page.innerHTML = `<div class="eyebrow">${esc(address)} · СОХРАНЁННАЯ КОПИЯ</div><h2>${esc(site.title)}</h2><p><i>${esc(site.subtitle)}</i></p><p style="white-space:pre-line">${esc(site.text)}</p>${address === 'okno.home' ? '<div class="lanterns"><div class="lantern"><small>ЗАПАД</small><strong>8</strong></div><div class="lantern"><small>ЮГ</small><strong>6</strong></div><div class="lantern"><small>СЕВЕР</small><strong>1</strong></div><div class="lantern"><small>ВОСТОК</small><strong>9</strong></div></div><button data-midnight>Открыть midnight.exe</button>' : ''}${address === 'lex.home' ? '<img src="assets/images/roof.svg" style="max-width:100%;width:340px" alt="Трое друзей на крыше на закате">' : ''}${address === 'gamezone.home' ? '<button data-secret>★ Секретный клуб ночных игроков</button>' : ''}<div class="web-footer">ЛУЧШЕ СМОТРИТСЯ С ДРУЗЬЯМИ · 000003</div>`;
      if ($('[data-secret]', page)) $('[data-secret]', page).onclick = () => {
        ctx.story.secret('forum');
        toast('Членский билет № 004. Секрет клуба: можно проиграть партию и отлично провести вечер.');
      };
      if ($('[data-midnight]', page)) $('[data-midnight]', page).onclick = () => ctx.open('midnight');
    }
  }
  function wire() {
    for (const b of $$('[data-url]', body)) b.onclick = () => navigate(b.dataset.url);
  }
  win.navigate = value => navigate(value);
  navigate(address);
}
