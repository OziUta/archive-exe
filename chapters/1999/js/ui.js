export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
})[c]);
export const icon = (name = 'notepad') => `<img src="assets/icons/${name}.svg" alt="">`;
let toastTimer;
export function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.hidden = true, 5200);
}
export function confirmAction(message) {
  return new Promise(resolve => {
    const shade = document.createElement('div');
    shade.className = 'dialog-shade';
    shade.innerHTML = `<div class="dialog bevel" role="dialog" aria-modal="true" aria-label="Подтверждение"><p>${esc(message)}</p><div class="dialog-actions"><button data-no>Отмена</button><button data-yes>Подтвердить</button></div></div>`;
    document.body.append(shade);
    const previous = document.activeElement;
    const finish = value => {
      shade.remove();
      previous?.focus();
      resolve(value);
    };
    $('[data-no]', shade).onclick = () => finish(false);
    $('[data-yes]', shade).onclick = () => finish(true);
    $('[data-no]', shade).focus();
    shade.onkeydown = e => {
      if (e.key === 'Escape') finish(false);
      if (e.key === 'Tab') {
        e.preventDefault();
        (document.activeElement === $('[data-no]', shade) ? $('[data-yes]', shade) : $('[data-no]', shade)).focus();
      }
    };
  });
}
export function download(name, text, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], {
    type
  }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
