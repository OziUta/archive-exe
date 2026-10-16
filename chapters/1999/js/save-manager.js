export const SAVE_KEY = 'home-os-99.save.v1';
const flags = ['letter', 'diary', 'chat', 'rehearsal', 'archive', 'site', 'program', 'ending'];
export function freshSave() {
  return {
    version: 1,
    started: false,
    flags: [],
    readMail: [],
    secrets: [],
    achievements: [],
    notes: '',
    restored: [],
    hints: {},
    records: {
      snake: 0,
      minefield: {}
    },
    settings: {
      sound: true,
      volume: .35,
      animations: 1,
      scale: 14,
      crt: true,
      fastBoot: false,
      theme: 'teal'
    }
  };
}
function list(value, allowed) {
  if (!Array.isArray(value) || value.length > 100 || value.some(v => typeof v !== 'string' || v.length > 80)) throw Error('Повреждён список в сохранении.');
  return allowed ? value.filter(v => allowed.includes(v)) : [...new Set(value)];
}
export function validateSave(raw) {
  if (!raw || typeof raw !== 'object' || raw.version !== 1) throw Error('Неизвестный формат или версия сохранения.');
  const out = freshSave();
  out.started = !!raw.started;
  out.flags = list(raw.flags, flags);
  out.readMail = list(raw.readMail);
  out.secrets = list(raw.secrets, ['theme', 'stars', 'cat', 'xyzzy', 'forum', 'future']);
  out.achievements = list(raw.achievements);
  out.restored = list(raw.restored, ['rehearsal']);
  if (typeof raw.notes !== 'string' || raw.notes.length > 100000) throw Error('Некорректный блокнот.');
  out.notes = raw.notes;
  const s = raw.settings;
  if (!s || typeof s !== 'object') throw Error('Настройки повреждены.');
  for (const key of ['sound', 'crt', 'fastBoot']) {
    if (typeof s[key] !== 'boolean') throw Error('Настройки повреждены.');
    out.settings[key] = s[key];
  }
  for (const [key, min, max] of [['volume', 0, 1], ['animations', 0, 2], ['scale', 12, 18]]) {
    if (!Number.isFinite(s[key]) || s[key] < min || s[key] > max) throw Error('Некорректные настройки.');
    out.settings[key] = s[key];
  }
  out.settings.theme = s.theme === 'summer' ? 'summer' : 'teal';
  if (!raw.records || !Number.isInteger(raw.records.snake) || raw.records.snake < 0 || raw.records.snake > 400) throw Error('Некорректные рекорды.');
  out.records.snake = raw.records.snake;
  for (const [key, value] of Object.entries(raw.records.minefield || {})) {
    if (['8', '10', '12'].includes(key) && Number.isInteger(value) && value >= 0 && value < 100000) out.records.minefield[key] = value;
  }
  for (const [key, value] of Object.entries(raw.hints || {})) {
    if (/^[0-4]$/.test(key) && Number.isInteger(value) && value >= 0 && value <= 3) out.hints[key] = value;
  }
  if (out.flags.includes('ending') && !out.flags.includes('program')) throw Error('Нарушена структура сюжетного сохранения.');
  return out;
}
export class SaveManager {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    this.error = null;
    this.warning = null;
    this.state = freshSave();
    try {
      const raw = storage.getItem(SAVE_KEY);
      if (raw) this.state = validateSave(JSON.parse(raw));
    } catch (error) {
      this.error = 'Сохранение не прочитано. Можно импортировать резервную копию в Настройках. Старое сохранение не перезаписано.';
      this.blocked = true;
    }
  }
  save() {
    if (this.blocked) return false;
    try {
      this.storage.setItem(SAVE_KEY, JSON.stringify(this.state));
      this.warning = null;
      return true;
    } catch {
      this.warning = 'Браузер не разрешил сохранить прогресс. Экспортируй JSON в Настройках.';
      return false;
    }
  }
  export() {
    return JSON.stringify(this.state, null, 2);
  }
  import(text) {
    if (text.length > 200000) throw Error('Файл сохранения слишком большой.');
    const next = validateSave(JSON.parse(text));
    this.state = next;
    this.blocked = false;
    this.error = null;
    this.save();
    return next;
  }
  reset() {
    this.state = freshSave();
    this.blocked = false;
    this.error = null;
    this.save();
  }
}
