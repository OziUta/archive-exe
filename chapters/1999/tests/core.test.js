import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SaveManager, freshSave, validateSave, SAVE_KEY } from '../js/save-manager.js';
import { Story, chapter, passwordMatches } from '../js/story.js';
import { children, entries, parentPath } from '../js/filesystem.js';
import { SnakeEngine, MineEngine } from '../js/games/engines.js';
const read = name => JSON.parse(fs.readFileSync(new URL('../data/' + name + '.json', import.meta.url), 'utf8'));
const storyData = read('story'),
  files = read('filesystem');
function memory() {
  const data = new Map();
  return {
    getItem: k => data.get(k) || null,
    setItem: (k, v) => data.set(k, v)
  };
}
function seeded(seed) {
  return () => {
    seed = seed * 1664525 + 1013904223 >>> 0;
    return seed / 4294967296;
  };
}
test('Clean start, full story path, ending and reload', () => {
  const storage = memory(),
    save = new SaveManager(storage),
    story = new Story(save, storyData);
  assert.equal(story.chapter, 0);
  story.achieve('boot');
  const letter = read('emails').find(e => e.id === 'last');
  story.event(letter.event);
  assert.equal(story.chapter, 1);
  assert.ok(read('chats').find(c => c.id === 'misha').messages.some(m => m[2].includes('MAYAK')));
  story.event('chat');
  save.state.restored.push('rehearsal');
  story.event('rehearsal');
  assert.equal(story.chapter, 2);
  assert.ok(storyData.rehearsal.includes('23:47'));
  assert.equal(story.unlockArchive('bad'), false);
  assert.equal(story.unlockArchive(' MAYAK2347 '), true);
  assert.equal(story.chapter, 3);
  assert.ok(entries(files, save.state, storyData).some(f => f.app === 'midnight'));
  assert.ok(storyData.archiveText.includes('okno.home'));
  assert.ok(read('websites').some(s => s.address === 'okno.home'));
  story.event('site');
  assert.equal(story.chapter, 4);
  assert.equal(story.unlockProgram('1968'), false);
  assert.equal(story.unlockProgram('1986'), true);
  assert.equal(storyData.ending.length, 4);
  story.event('ending');
  assert.equal(story.chapter, 5);
  const reloaded = new SaveManager(storage);
  assert.equal(chapter(reloaded.state.flags), 5);
  assert.ok(reloaded.state.achievements.includes('ending'));
});
test('Export/import roundtrip preserves notes, records, flags, secrets and settings', () => {
  const a = new SaveManager(memory());
  a.state.notes = '<script>hello</script>\nМои заметки';
  a.state.records.snake = 18;
  a.state.records.minefield['8'] = 63;
  a.state.settings.volume = .8;
  a.state.settings.theme = 'summer';
  a.state.secrets = ['theme'];
  a.state.flags = ['letter'];
  a.save();
  const b = new SaveManager(memory());
  b.import(a.export());
  assert.deepEqual(b.state, a.state);
});
test('Malformed and unsupported imports do not change current state', () => {
  const save = new SaveManager(memory());
  save.state.notes = 'keep';
  const before = save.export();
  for (const value of ['{', 'null', '{}', JSON.stringify({
    ...freshSave(),
    version: 2
  }), JSON.stringify({
    ...freshSave(),
    notes: 22
  }), JSON.stringify({
    ...freshSave(),
    settings: {
      ...freshSave().settings,
      volume: 5
    }
  }), 'x'.repeat(200001)]) assert.throws(() => save.import(value));
  assert.equal(save.export(), before);
});
test('Corrupted stored save is protected until an explicit import or reset', () => {
  const storage = memory();
  storage.setItem(SAVE_KEY, '{bad');
  const save = new SaveManager(storage);
  assert.ok(save.error);
  assert.equal(save.save(), false);
  assert.equal(storage.getItem(SAVE_KEY), '{bad');
  save.reset();
  assert.equal(new SaveManager(storage).error, null);
});
test('Unavailable storage is handled without crashing', () => {
  const save = new SaveManager({
    getItem: () => null,
    setItem: () => {
      throw Error('quota');
    }
  });
  assert.equal(save.save(), false);
  assert.ok(save.warning);
  assert.doesNotThrow(() => save.export());
});
test('Import whitelists state and excludes prototype payloads', () => {
  const raw = JSON.parse(JSON.stringify(freshSave()).replace('"hints":{}', '"hints":{"__proto__":{"polluted":true}}'));
  raw.flags.push('impossible');
  const clean = validateSave(raw);
  assert.deepEqual(clean.flags, []);
  assert.equal({}.polluted, undefined);
});
test('Hints advance without exceeding final help level', () => {
  const save = new SaveManager(memory()),
    s = new Story(save, storyData);
  const got = [s.hint(), s.hint(), s.hint(), s.hint()];
  assert.equal(got[2], got[3]);
  assert.equal(save.state.hints[0], 3);
});
test('Achievements and secrets are idempotent; six discoverable secrets', () => {
  const save = new SaveManager(memory()),
    s = new Story(save, storyData);
  for (const id of ['theme', 'stars', 'cat', 'xyzzy', 'forum', 'future']) {
    s.secret(id);
    s.secret(id);
  }
  assert.equal(save.state.secrets.length, 6);
  assert.deepEqual(save.state.achievements, ['hidden']);
});
test('File tree, hidden entries and recovered text are reachable', () => {
  const state = freshSave(),
    all = entries(files, state, storyData);
  assert.equal(parentPath('C:'), 'C:');
  assert.equal(parentPath('C:/DOCUMENTS/PERSONAL'), 'C:/DOCUMENTS');
  assert.equal(children(all, 'C:').length, 8);
  for (const f of files) {
    if (f.path !== 'C:') assert.ok(all.some(d => d.type === 'folder' && d.path === parentPath(f.path)), f.path);
  }
  assert.equal(children(all, 'C:/PICTURES').length, 1);
  assert.equal(children(all, 'C:/PICTURES', true).length, 2);
  state.restored.push('rehearsal');
  assert.ok(entries(files, state, storyData).some(f => f.path.endsWith('/rehearsal.txt')));
});
test('Narrative content includes all four mail folders and unique identities', () => {
  const mail = read('emails');
  assert.ok(mail.length >= 12);
  assert.equal(new Set(mail.map(m => m.id)).size, mail.length);
  assert.equal(new Set(mail.map(m => m.folder)).size, 4);
  assert.ok(mail.every(m => m.body.length > 60));
  assert.equal(passwordMatches(' MAYAK2347 ', storyData.archivePassword), true);
});
test('Secret program cannot bypass the archive lock', () => {
  const s = new Story(new SaveManager(memory()), storyData);
  assert.equal(s.unlockProgram('1986'), false);
});
test('Snake rejects reverse and multiple turns within a tick', () => {
  const s = new SnakeEngine(20, () => 0);
  s.turn(-1, 0);
  assert.deepEqual(s.next, {
    x: 1,
    y: 0
  });
  s.turn(0, -1);
  s.turn(-1, 0);
  s.step();
  assert.deepEqual(s.body[0], {
    x: 10,
    y: 9
  });
});
test('Snake grows on food, scores, and dies at boundary', () => {
  const s = new SnakeEngine(20, () => 0);
  s.food = {
    x: 11,
    y: 10
  };
  s.step();
  assert.equal(s.score, 1);
  assert.equal(s.body.length, 4);
  for (let i = 0; i < 20; i++) s.step();
  assert.equal(s.dead, true);
});
test('Snake may enter vacating tail, but not its body', () => {
  const s = new SnakeEngine(8);
  s.body = [{
    x: 2,
    y: 2
  }, {
    x: 2,
    y: 3
  }, {
    x: 1,
    y: 3
  }, {
    x: 1,
    y: 2
  }];
  s.direction = {
    x: 0,
    y: -1
  };
  s.next = {
    x: -1,
    y: 0
  };
  s.food = {
    x: 7,
    y: 7
  };
  s.step();
  assert.equal(s.dead, false);
  s.body = [{
    x: 2,
    y: 2
  }, {
    x: 2,
    y: 3
  }, {
    x: 1,
    y: 3
  }, {
    x: 1,
    y: 2
  }, {
    x: 1,
    y: 1
  }];
  s.next = {
    x: -1,
    y: 0
  };
  s.step();
  assert.equal(s.dead, true);
});
test('Snake food never spawns on its body and full board wins', () => {
  const s = new SnakeEngine(4, () => .999);
  assert.ok(!s.body.some(c => c.x === s.food.x && c.y === s.food.y));
  s.body = Array.from({
    length: 16
  }, (_, i) => ({
    x: i % 4,
    y: Math.floor(i / 4)
  }));
  assert.equal(s.spawn(), null);
  assert.equal(s.won, true);
});
test('Minefield first move and its neighbors are safe at every board position', () => {
  for (const [size, mines] of [[8, 10], [10, 16], [12, 25]]) for (let first = 0; first < size * size; first++) {
    const m = new MineEngine(size, mines, seeded(first + 1));
    m.reveal(first);
    assert.equal(m.dead, false);
    assert.equal(m.cells[first].count, 0);
    assert.equal(m.cells.filter(c => c.mine).length, mines);
    assert.ok(m.neighbors(first).every(i => !m.cells[i].mine));
  }
});
test('Minefield flood, flags and win work without opening a mine', () => {
  const m = new MineEngine(8, 10, seeded(42));
  m.flag(0);
  m.reveal(0);
  assert.equal(m.started, false);
  m.flag(0);
  m.reveal(0);
  assert.ok(m.cells.filter(c => c.open).length > 1);
  const mine = m.cells.findIndex(c => c.mine);
  m.flag(mine);
  assert.equal(m.flags, 1);
  for (let i = 0; i < m.cells.length; i++) if (!m.cells[i].mine) m.reveal(i);
  assert.equal(m.won, true);
  assert.equal(m.dead, false);
});
test('Minefield loss and reset use independent boards', () => {
  const m = new MineEngine(8, 10, seeded(1));
  m.reveal(0);
  m.reveal(m.cells.findIndex(c => c.mine));
  assert.equal(m.dead, true);
  const next = new MineEngine(8, 10);
  assert.equal(next.dead, false);
  assert.equal(next.started, false);
  assert.ok(next.cells.every(c => !c.open && !c.flag));
});

test('Hidden window geometry is preserved during viewport changes', async () => {
  const { WindowManager } = await import('../js/window-manager.js');
  const el = { hidden: true, style: { width: '640px', height: '480px' } };
  WindowManager.prototype.clamp.call({}, { el });
  assert.deepEqual(el.style, { width: '640px', height: '480px' });
});

test('Visible oversized windows are clamped inside the desktop', async () => {
  const { WindowManager } = await import('../js/window-manager.js');
  const oldDoc = globalThis.document, oldWidth = globalThis.innerWidth;
  globalThis.innerWidth = 1200;
  globalThis.document = { querySelector: () => ({ clientWidth: 1000, clientHeight: 600 }) };
  try {
    const el = {
      hidden: false, classList: { contains: () => false },
      style: { width: '1500px', height: '900px', left: '400px', top: '700px' },
      get offsetWidth() { return parseInt(this.style.width); },
      get offsetHeight() { return parseInt(this.style.height); },
      get offsetLeft() { return parseInt(this.style.left); },
      get offsetTop() { return parseInt(this.style.top); }
    };
    WindowManager.prototype.clamp.call({}, { el });
    assert.equal(el.offsetWidth, 992);
    assert.equal(el.offsetHeight, 592);
    assert.ok(el.offsetLeft + el.offsetWidth <= 1000);
    assert.ok(el.offsetTop + el.offsetHeight <= 600);
  } finally {
    if (oldDoc === undefined) delete globalThis.document; else globalThis.document = oldDoc;
    if (oldWidth === undefined) delete globalThis.innerWidth; else globalThis.innerWidth = oldWidth;
  }
});
