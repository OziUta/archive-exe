import { $, toast } from '../ui.js';
import { MineEngine } from './engines.js';
export function minefield(ctx, body, win) {
  let size = 8,
    game,
    flagMode = false,
    startedAt = 0,
    elapsed = 0,
    finished = false,
    cursor = 0;
  const counts = {
    8: 10,
    10: 16,
    12: 25
  };
  body.innerHTML = `<div class="game"><div class="game-toolbar"><select aria-label="Размер поля"><option value="8">8 × 8 · 10 мин</option><option value="10">10 × 10 · 16 мин</option><option value="12">12 × 12 · 25 мин</option></select><button data-new>Новая игра</button><button data-flag aria-pressed="false">⚑ Флаг: выкл.</button></div><div class="game-status" data-score></div><canvas width="384" height="384" tabindex="0" aria-label="Minefield. Стрелки выбирают клетку, Enter открывает, F ставит флаг."></canvas><div class="game-status" data-status role="status">Первый ход безопасен. ПКМ или режим флага — флажок.</div><small>Клавиатура: стрелки · Enter — открыть · F — флаг</small></div>`;
  const canvas = $('canvas', body),
    g = canvas.getContext('2d');
  function reset() {
    game = new MineEngine(size, counts[size]);
    startedAt = 0;
    elapsed = 0;
    finished = false;
    cursor = 0;
    $('[data-status]', body).textContent = 'Первый ход безопасен. ПКМ или режим флага — флажок.';
    draw();
  }
  function draw() {
    const cell = 384 / size;
    g.clearRect(0, 0, 384, 384);
    const colors = ['', '#315f8c', '#447554', '#995d4b', '#5b4e82', '#8e4846', '#33888c', '#333', '#777'];
    game.cells.forEach((c, i) => {
      const x = i % size * cell,
        y = Math.floor(i / size) * cell;
      g.fillStyle = c.open ? '#d5d8c6' : '#afbdab';
      g.fillRect(x, y, cell, cell);
      g.strokeStyle = c.open ? '#abb5a1' : '#eaf0d8';
      g.lineWidth = c.open ? 1 : 3;
      g.strokeRect(x + 1.5, y + 1.5, cell - 3, cell - 3);
      if (!c.open) {
        g.strokeStyle = '#637e6f';
        g.beginPath();
        g.moveTo(x + cell - 2, y + 2);
        g.lineTo(x + cell - 2, y + cell - 2);
        g.lineTo(x + 2, y + cell - 2);
        g.stroke();
      }
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `bold ${Math.floor(cell * .52)}px monospace`;
      if (c.mine && (c.open || game.dead)) {
        g.fillStyle = '#944f44';
        g.beginPath();
        g.arc(x + cell / 2, y + cell / 2, cell * .2, 0, Math.PI * 2);
        g.fill();
      } else if (c.flag) {
        g.fillStyle = '#995c49';
        g.fillText('⚑', x + cell / 2, y + cell / 2);
      } else if (c.open && c.count) {
        g.fillStyle = colors[c.count];
        g.fillText(c.count, x + cell / 2, y + cell / 2);
      }
    });
    if (document.activeElement === canvas) {
      g.strokeStyle = '#e5b253';
      g.lineWidth = 3;
      g.strokeRect(cursor % size * cell + 3, Math.floor(cursor / size) * cell + 3, cell - 6, cell - 6);
    }
    const record = ctx.save.state.records.minefield[size];
    $('[data-score]', body).textContent = `Мины: ${counts[size] - game.flags} · Время: ${elapsed} с · Рекорд: ${record === undefined ? '—' : record + ' с'}`;
  }
  function act(index, flag = false) {
    if (finished) return;
    if (flag) game.flag(index);else {
      const wasStarted = game.started;
      game.reveal(index);
      if (!wasStarted && game.started) {
        startedAt = Date.now();
        ctx.story.achieve('game');
      }
    }
    if ((game.dead || game.won) && !finished) {
      finished = true;
      elapsed = Math.floor((Date.now() - startedAt) / 1000);
      $('[data-status]', body).textContent = game.won ? 'Поле очищено. Все огни в безопасности!' : 'Мина. Можно начать новую партию.';
      if (game.won) {
        const old = ctx.save.state.records.minefield[size];
        if (old === undefined || elapsed < old) {
          ctx.save.state.records.minefield[size] = elapsed;
          ctx.save.save();
          toast('Новый рекорд Minefield: ' + elapsed + ' с');
        }
      }
    } else {
      const c = game.cells[index];
      $('[data-status]', body).textContent = `Строка ${Math.floor(index / size) + 1}, столбец ${index % size + 1}: ${c.flag ? 'флаг' : c.open ? c.count + ' соседних мин' : 'закрыто'}`;
    }
    draw();
  }
  function indexFrom(e) {
    const r = canvas.getBoundingClientRect();
    return Math.min(size - 1, Math.floor((e.clientY - r.top) / r.height * size)) * size + Math.min(size - 1, Math.floor((e.clientX - r.left) / r.width * size));
  }
  canvas.onclick = e => {
    cursor = indexFrom(e);
    act(cursor, flagMode);
  };
  canvas.oncontextmenu = e => {
    e.preventDefault();
    cursor = indexFrom(e);
    act(cursor, true);
  };
  canvas.onkeydown = e => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' ', 'f', 'F', 'а', 'А'].includes(e.key)) {
      e.preventDefault();
      if (e.key === 'ArrowUp') cursor = Math.max(0, cursor - size);else if (e.key === 'ArrowDown') cursor = Math.min(size * size - 1, cursor + size);else if (e.key === 'ArrowLeft') cursor = Math.max(0, cursor - 1);else if (e.key === 'ArrowRight') cursor = Math.min(size * size - 1, cursor + 1);else act(cursor, ['f', 'F', 'а', 'А'].includes(e.key) || flagMode);
      draw();
    }
  };
  canvas.onfocus = draw;
  canvas.onblur = draw;
  $('[data-new]', body).onclick = reset;
  $('select', body).onchange = e => {
    size = +e.target.value;
    reset();
  };
  $('[data-flag]', body).onclick = e => {
    flagMode = !flagMode;
    e.target.textContent = '⚑ Флаг: ' + (flagMode ? 'вкл.' : 'выкл.');
    e.target.setAttribute('aria-pressed', String(flagMode));
  };
  const timer = setInterval(() => {
    if (game.started && !finished) {
      elapsed = Math.floor((Date.now() - startedAt) / 1000);
      draw();
    }
  }, 500);
  win.cleanup.push(() => clearInterval(timer));
  reset();
}
