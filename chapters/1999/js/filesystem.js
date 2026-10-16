export const parentPath = path => path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : 'C:';
export const basename = path => path.split('/').at(-1);
export function entries(data, state, storyData) {
  const all = [...data];
  if (state.restored.includes('rehearsal')) all.push({
    path: 'C:/DOCUMENTS/PERSONAL/rehearsal.txt',
    type: 'text',
    text: storyData.rehearsal,
    event: 'rehearsal'
  });
  if (state.flags.includes('archive')) {
    all.push({
      path: 'C:/DOCUMENTS/ARCHIVE/midnight.exe',
      type: 'app',
      app: 'midnight'
    });
    all.push({
      path: 'C:/DOCUMENTS/ARCHIVE/letter_for_anya.txt',
      type: 'text',
      text: storyData.letterForAnya
    });
    all.push({
      path: 'C:/DOCUMENTS/ARCHIVE/readme.txt',
      type: 'text',
      text: storyData.archiveText
    });
  }
  return all;
}
export function children(all, path, showHidden = false) {
  return all.filter(f => f.path !== path && parentPath(f.path) === path && (!f.hidden || showHidden));
}
