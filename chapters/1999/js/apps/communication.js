import { $, $$, esc } from '../ui.js';
export function mail(ctx, body) {
  let folder = 'Входящие',
    selected = null;
  const folders = ['Входящие', 'Отправленные', 'Черновики', 'Удалённые'];
  function render() {
    body.innerHTML = `<div class="toolbar"><span>PostBox 99</span><span class="muted">· Локальный архив почты / LEX</span></div><div class="split"><nav class="sidebar">${folders.map(f => `<button data-folder="${f}" class="${folder === f ? 'selected' : ''}">${f}${f === 'Входящие' ? ' (' + ctx.data.emails.filter(m => m.folder === f && !ctx.save.state.readMail.includes(m.id)).length + ')' : ''}</button>`).join('')}</nav><div class="main-pane mail-layout"><div class="mail-list"></div><article class="mail-content"></article></div></div><div class="statusbar">14 писем на диске · Подключение к сети не требуется</div>`;
    for (const b of $$('[data-folder]', body)) b.onclick = () => {
      folder = b.dataset.folder;
      selected = null;
      render();
    };
    const mails = ctx.data.emails.filter(m => m.folder === folder);
    $('.mail-list', body).innerHTML = mails.map(m => `<button class="mail-row ${ctx.save.state.readMail.includes(m.id) ? '' : 'unread'} ${selected === m.id ? 'selected' : ''}" data-mail="${m.id}"><span>${esc(m.sender.split('<')[0])}</span><span>${esc(m.subject)}</span><span>${m.date.slice(0, 10)}</span></button>`).join('');
    for (const b of $$('[data-mail]', body)) b.onclick = () => {
      selected = b.dataset.mail;
      const m = mails.find(x => x.id === selected);
      if (!ctx.save.state.readMail.includes(m.id)) ctx.save.state.readMail.push(m.id);
      ctx.story.achieve('mail');
      if (m.event) ctx.story.event(m.event);
      ctx.save.save();
      render();
    };
    const message = mails.find(m => m.id === selected);
    $('.mail-content', body).innerHTML = message ? `<div class="eyebrow">СОХРАНЁННОЕ ПИСЬМО</div><h2>${esc(message.subject)}</h2><div class="mail-meta">От: ${esc(message.sender)}<br>${message.date}</div><p class="doc-content">${esc(message.body)}</p>` : '<div class="eyebrow">31 декабря 1999</div><h2>Кто-то оставил тебе письмо.</h2><p class="muted">Выбери сообщение в списке.<br>Всё сохранилось таким, каким было в ту ночь.</p>';
  }
  render();
}
export function messenger(ctx, body, win, options = {}) {
  let contact = options.contact || 'anya',
    search = '';
  function render() {
    const person = ctx.data.chats.find(c => c.id === contact);
    body.innerHTML = `<div class="toolbar"><span>NetChat</span><span class="muted">· Архив · Вымышленные персонажи</span></div><div class="split"><nav class="sidebar">${ctx.data.chats.map(c => `<button class="chat-contact ${c.id === contact ? 'selected' : ''}" data-contact="${c.id}"><span class="avatar" style="background:${c.color}">${c.initial}</span>${esc(c.name)}<small class="contact-status">${esc(c.status)}</small></button>`).join('')}</nav><div class="main-pane mail-layout"><div class="toolbar"><input type="search" aria-label="Поиск по переписке" placeholder="Поиск в этом разговоре…" value="${esc(search)}"></div><div class="messages"></div></div></div><div class="statusbar">Переписки из прошлого. Отправка сообщений недоступна.</div>`;
    for (const b of $$('[data-contact]', body)) b.onclick = () => {
      contact = b.dataset.contact;
      search = '';
      if (contact === 'misha') ctx.story.event('chat');
      render();
    };
    $('input', body).oninput = e => {
      search = e.target.value;
      messages();
    };
    function messages() {
      const records = [...person.messages, ...(ctx.story.has('archive') ? person.restored || [] : [])].filter(m => m.join(' ').toLowerCase().includes(search.toLowerCase()));
      $('.messages', body).innerHTML = records.length ? records.map(m => `<div class="message ${m[1] === 'Лёша' ? 'self' : ''}"><small>${esc(m[0])} · ${esc(m[1])}</small>${esc(m[2])}</div>`).join('') : '<p>Совпадений нет.</p>';
      if (person.restored && !ctx.story.has('archive') && !search) $('.messages', body).insertAdjacentHTML('beforeend', '<p class="muted"><small>Часть разговора отсутствует. Возможно, есть резервная копия.</small></p>');
    }
    messages();
  }
  win.navigate = id => {
    contact = id;
    if (id === 'misha') ctx.story.event('chat');
    render();
  };
  win.onVisibility = visible => {
    if (visible) render();
  };
  if (contact === 'misha') ctx.story.event('chat');
  render();
}
