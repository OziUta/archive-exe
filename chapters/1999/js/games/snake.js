import { $, toast } from '../ui.js';
import { SnakeEngine } from './engines.js';
export function snake(ctx, body, win) {
  let game = new SnakeEngine(),
    running = false,
    timer = null,
    speed = 140;
  body.innerHTML = `<div class="game"><div class="game-toolbar"><button data-start>Начать</button><button data-pause disabled>Пауза</button><label>Скорость <select aria-label="Скорость"><option value="210">Спокойно</option><option value="140" selected>Обычно</option><option value="85">Быстро</option></select></label></div><div class="game-status" data-score></div><canvas width="400" height="400" tabindex="0" aria-label="Snake 99. Стрелки или WASD для движения. Пробел — пауза."></canvas><div class="game-status" data-status>Собирай огоньки. Не врезайся в себя и края.</div><div class="dpad"><button class="up" data-dir="0,-1" aria-label="Вверх">↑</button><button class="left" data-dir="-1,0" aria-label="Влево">←</button><button class="down" data-dir="0,1" aria-label="Вниз">↓</button><button class="right" data-dir="1,0" aria-label="Вправо">→</button></div></div>`;
  const canvas = $('canvas', body),
    g = canvas.getContext('2d');
  function draw() {
    g.fillStyle = '#182f29';
    g.fillRect(0, 0, 400, 400);
    g.strokeStyle = '#224036';
    for (let i = 0; i <= 20; i++) {
      g.beginPath();
      g.moveTo(i * 20, 0);
      g.lineTo(i * 20, 400);
      g.moveTo(0, i * 20);
      g.lineTo(400, i * 20);
      g.stroke();
    }
    if (game.food) {
      g.fillStyle = '#d9b471';
      g.fillRect(game.food.x * 20 + 5, game.food.y * 20 + 5, 10, 10);
    }
    game.body.forEach((p, i) => {
      g.fillStyle = i ? '#87ab8d' : '#d5dfab';
      g.fillRect(p.x * 20 + 2, p.y * 20 + 2, 16, 16);
    });
    $('[data-score]', body).textContent = `Очки: ${game.score} · Рекорд: ${ctx.save.state.records.snake}`;
  }
  function stop() {
    running = false;
    clearInterval(timer);
    $('[data-pause]', body).textContent = 'Продолжить';
  }
  function tick() {
    game.step();
    if (game.score > ctx.save.state.records.snake) {
      ctx.save.state.records.snake = game.score;
      ctx.save.save();
    }
    draw();
    if (game.dead || game.won) {
      stop();
      $('[data-pause]', body).disabled = true;
      $('[data-status]', body).textContent = game.won ? 'Всё поле твоё. Отличная партия!' : 'Игра окончена. Ещё раз?';
      $('[data-start]', body).textContent = 'Заново';
      if (game.score > ctx.save.state.records.snake) {
        ctx.save.state.records.snake = game.score;
        ctx.save.save();
        draw();
        toast('Новый рекорд Snake 99: ' + game.score);
      }
    }
  }
  function resume() {
    running = true;
    clearInterval(timer);
    timer = setInterval(tick, speed);
    $('[data-pause]', body).disabled = false;
    $('[data-pause]', body).textContent = 'Пауза';
    $('[data-status]', body).textContent = 'Стрелки / WASD · Пробел — пауза';
  }
  $('[data-start]', body).onclick = () => {
    game = new SnakeEngine();
    ctx.story.achieve('game');
    resume();
    draw();
    canvas.focus();
    $('[data-start]', body).textContent = 'Заново';
  };
  $('[data-pause]', body).onclick = () => {
    if (running) {
      stop();
      $('[data-status]', body).textContent = 'Пауза';
    } else if (!game.dead && !game.won) resume();
  };
  $('select', body).onchange = e => {
    speed = +e.target.value;
    if (running) resume();
  };
  const key = e => {
    if (ctx.wm.active !== win.id || e.target.matches('input,textarea,select')) return;
    const map = {
      ArrowUp: [0, -1],
      w: [0, -1],
      ц: [0, -1],
      ArrowDown: [0, 1],
      s: [0, 1],
      ы: [0, 1],
      ArrowLeft: [-1, 0],
      a: [-1, 0],
      ф: [-1, 0],
      ArrowRight: [1, 0],
      d: [1, 0],
      в: [1, 0]
    };
    if (map[e.key]) {
      e.preventDefault();
      if (running) game.turn(...map[e.key]);
    }
    if (e.code === 'Space') {
      e.preventDefault();
      $('[data-pause]', body).click();
    }
  };
  document.addEventListener('keydown', key);
  for (const b of body.querySelectorAll('[data-dir]')) b.onpointerdown = e => {
    e.preventDefault();
    if (running) game.turn(...b.dataset.dir.split(',').map(Number));
  };
  const visibility = () => {
    if (document.hidden && running) {
      stop();
      $('[data-status]', body).textContent = 'Пауза: вкладка скрыта.';
    }
  };
  document.addEventListener('visibilitychange', visibility);
  win.onVisibility = visible => {
    if (!visible && running) {
      stop();
      $('[data-status]', body).textContent = 'Пауза: вернись в игру и нажми «Продолжить».';
    }
  };
  win.cleanup.push(() => {
    clearInterval(timer);
    document.removeEventListener('keydown', key);
    document.removeEventListener('visibilitychange', visibility);
  });
  draw();
}
