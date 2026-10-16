export class SnakeEngine {
  constructor(size = 20, random = Math.random) {
    this.size = size;
    this.random = random;
    this.reset();
  }
  reset() {
    const c = Math.floor(this.size / 2);
    this.body = [{
      x: c,
      y: c
    }, {
      x: c - 1,
      y: c
    }, {
      x: c - 2,
      y: c
    }];
    this.direction = {
      x: 1,
      y: 0
    };
    this.next = {
      x: 1,
      y: 0
    };
    this.turned = false;
    this.score = 0;
    this.dead = false;
    this.won = false;
    this.food = this.spawn();
  }
  spawn() {
    const empty = [];
    for (let y = 0; y < this.size; y++) for (let x = 0; x < this.size; x++) if (!this.body.some(p => p.x === x && p.y === y)) empty.push({
      x,
      y
    });
    if (!empty.length) {
      this.won = true;
      return null;
    }
    return empty[Math.floor(this.random() * empty.length)];
  }
  turn(x, y) {
    if (this.turned || this.dead || Math.abs(x) + Math.abs(y) !== 1 || x === -this.direction.x && y === -this.direction.y) return;
    this.next = {
      x,
      y
    };
    this.turned = true;
  }
  step() {
    if (this.dead || this.won) return;
    this.direction = this.next;
    this.turned = false;
    const head = {
      x: this.body[0].x + this.direction.x,
      y: this.body[0].y + this.direction.y
    };
    const eat = this.food && head.x === this.food.x && head.y === this.food.y;
    const occupied = eat ? this.body : this.body.slice(0, -1);
    if (head.x < 0 || head.y < 0 || head.x >= this.size || head.y >= this.size || occupied.some(p => p.x === head.x && p.y === head.y)) {
      this.dead = true;
      return;
    }
    this.body.unshift(head);
    if (eat) {
      this.score++;
      this.food = this.spawn();
    } else this.body.pop();
  }
}
export class MineEngine {
  constructor(size = 8, mines = 10, random = Math.random) {
    this.size = size;
    this.mineCount = mines;
    this.random = random;
    this.cells = Array.from({
      length: size * size
    }, () => ({
      mine: false,
      count: 0,
      open: false,
      flag: false
    }));
    this.started = false;
    this.dead = false;
    this.won = false;
  }
  neighbors(index) {
    const x = index % this.size,
      y = Math.floor(index / this.size),
      out = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const xx = x + dx,
        yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < this.size && yy < this.size) out.push(yy * this.size + xx);
    }
    return out;
  }
  generate(first) {
    const excluded = new Set([first, ...this.neighbors(first)]);
    const choices = this.cells.map((_, i) => i).filter(i => !excluded.has(i));
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    for (const index of choices.slice(0, this.mineCount)) this.cells[index].mine = true;
    this.cells.forEach((c, i) => c.count = this.neighbors(i).filter(n => this.cells[n].mine).length);
    this.started = true;
  }
  reveal(index) {
    if (!Number.isInteger(index) || !this.cells[index] || this.dead || this.won || this.cells[index].flag || this.cells[index].open) return false;
    if (!this.started) this.generate(index);
    if (this.cells[index].mine) {
      this.cells[index].open = true;
      this.dead = true;
      return true;
    }
    const stack = [index];
    while (stack.length) {
      const i = stack.pop(),
        cell = this.cells[i];
      if (cell.open || cell.flag || cell.mine) continue;
      cell.open = true;
      if (cell.count === 0) stack.push(...this.neighbors(i));
    }
    this.won = this.cells.filter(c => !c.mine).every(c => c.open);
    return true;
  }
  flag(index) {
    const cell = this.cells[index];
    if (!cell || cell.open || this.dead || this.won) return;
    cell.flag = !cell.flag;
  }
  get flags() {
    return this.cells.filter(c => c.flag).length;
  }
}
