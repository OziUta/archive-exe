export function saveNote(state,{id,chapter,title,text},now=Date.now()){
  title=title.trim();if(!title||title.length>120||text.length>20000)throw Error('Укажите заголовок до 120 символов; текст — до 20 000.');
  const index=state.notes.findIndex(n=>n.id===id);
  if(index<0&&state.notes.length>=300)throw Error('В журнале уже 300 записей. Сохраните резервную копию и удалите ненужные записи.');
  const note={id:id||'n-'+now.toString(36)+'-'+Math.random().toString(36).slice(2,8),chapter,title,text,updated:now};
  if(index>=0)state.notes[index]=note;else state.notes.unshift(note);return note;
}
export function removeNote(state,id){state.notes=state.notes.filter(n=>n.id!==id);}
