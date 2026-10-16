export function chapter(flags) {
  const has = x => flags.includes(x);
  if (has('ending')) return 5;
  if (has('site')) return 4;
  if (has('archive')) return 3;
  if (has('chat') && has('rehearsal') && has('letter')) return 2;
  if (has('letter')) return 1;
  return 0;
}
export function passwordMatches(input, expected) {
  return input.trim().toLowerCase() === expected.toLowerCase();
}
export class Story {
  constructor(save, data, notify = () => {}) {
    this.save = save;
    this.data = data;
    this.notify = notify;
  }
  has(id) {
    return this.save.state.flags.includes(id);
  }
  event(id) {
    if (this.has(id)) return;
    this.save.state.flags.push(id);
    if (id === 'letter') this.achieve('mail');
    if (id === 'ending') this.achieve('ending');
    this.save.save();
  }
  achieve(id) {
    if (this.save.state.achievements.includes(id)) return;
    this.save.state.achievements.push(id);
    this.save.save();
    const names = {
      boot: 'Первый запуск',
      mail: 'Письмо из прошлого',
      hidden: 'Между строк',
      game: 'Ещё одну партию',
      ending: 'Окно открыто'
    };
    this.notify('Достижение: ' + (names[id] || id));
  }
  secret(id) {
    if (this.save.state.secrets.includes(id)) return;
    this.save.state.secrets.push(id);
    this.achieve('hidden');
    this.save.save();
    this.notify('Найден секрет · ' + this.save.state.secrets.length + ' / 6');
  }
  unlockArchive(input) {
    if (!passwordMatches(input, this.data.archivePassword)) return false;
    this.event('archive');
    return true;
  }
  unlockProgram(input) {
    if (!this.has('archive') || !passwordMatches(input, this.data.programKey)) return false;
    this.event('program');
    return true;
  }
  get chapter() {
    return chapter(this.save.state.flags);
  }
  hint() {
    const index = Math.min(this.chapter, 4),
      level = this.save.state.hints[index] || 0;
    this.save.state.hints[index] = Math.min(3, level + 1);
    this.save.save();
    return this.data.hints[index][Math.min(2, level)];
  }
}
