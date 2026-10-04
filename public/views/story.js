import { h, S, all, get, put, create, remove, field, textInput, select, btn, modal, tabs, byOrder, acts, orderedScenes, fmt, wordCount, logWords } from '../lib.js';
import { rerender, go } from '../app.js';
import { STATUS, STATUS_COLORS } from '../content/craft.js';

let filter = '';
export async function render() {
  const A = acts();
  const scenes = orderedScenes();
  const root = h('div', { class: 'stack' },
    h('div', { class: 'row sb' }, h('h1', { style: { margin: 0 } }, 'Storyboard'), h('div', { class: 'row' },
      btn('+ Scene', () => editScene(create('scene', blank(0, scenes)), true), 'primary'),
      btn('Number chapters', () => { if (confirm('Set chapter numbers 1…n in board order?')) { scenes.forEach((s, i) => put(Object.assign(s, { chapter: String(i + 1) }), true)); setTimeout(rerender, 150); } }))),
    h('div', { class: 'row' }, h('select', { class: 'in', style: { width: 'auto' }, onChange: (e) => { filter = e.target.value; rerender(); } }, [['', 'All statuses'], ...STATUS.map((s) => [s, s])].map(([v, l]) => h('option', { value: v, selected: v === filter }, l))),
      h('small', {}, `${scenes.length} scenes · ${fmt(scenes.reduce((n, s) => n + (s.words || 0), 0))} words. Drag ⠿ to move; tap a card to edit.`)));
  const board = h('div', { class: 'board' });
  A.forEach((name, ai) => {
    const list = scenes.filter((s) => Math.min(s.act ?? 0, A.length - 1) === ai);
    const col = h('div', { class: 'col', 'data-act': ai },
      h('div', { class: 'col-h' }, h('b', { onClick: () => renameAct(ai) }, `${name}  ·  ${list.length}`), btn('+', () => editScene(create('scene', blank(ai, scenes)), true), 'sm ghost')),
      list.filter((s) => !filter || s.status === filter).map((s) => card(s, board)));
    board.append(col);
  });
  root.append(board, h('div', { class: 'row' }, btn('+ Add act/part', () => { const n = prompt('Name of new act/part?'); if (n) { S.project.acts = [...A, n]; put(S.project, true); rerender(); } }, 'sm')));
  return root;
}
const blank = (act, scenes) => ({ act, order: scenes.filter((s) => s.act === act).length + 0.5, chapter: '', title: 'New scene', pov: '', setting: '', goal: '', conflict: '', outcome: '', status: 'idea', threads: [], draft: '', words: 0, target: 0, notes: '' });
function renameAct(i) {
  const A = acts(); const n = prompt('Rename act/part (empty to delete if it has no scenes)', A[i]); if (n === null) return;
  if (!n.trim()) { if (orderedScenes().some((s) => Math.min(s.act ?? 0, A.length - 1) === i)) return alert('Move its scenes first.'); if (A.length < 2) return; S.project.acts = A.filter((_, j) => j !== i); orderedScenes().forEach((s) => { if (s.act > i) { s.act--; put(s, true); } }); }
  else S.project.acts = A.map((a, j) => (j === i ? n.trim() : a));
  put(S.project, true); rerender();
}

function card(s, board) {
  const threads = (s.threads || []).map((id) => get(id)).filter(Boolean);
  const el = h('div', { class: 'scene', 'data-id': s.id, style: { '--sc': STATUS_COLORS[s.status] } },
    h('div', { class: 'grip', title: 'Drag', onPointerdown: (e) => startDrag(e, s, el, board) }, '⠿'),
    h('div', { class: 'body', onClick: () => editScene(s) },
      h('div', { class: 't' }, (s.chapter ? `Ch ${s.chapter} · ` : '') + (s.title || 'Untitled')),
      h('div', { class: 'm' }, [s.pov && `POV ${s.pov}`, s.setting, s.status, s.words ? `${fmt(s.words)}w` : ''].filter(Boolean).join(' · ')),
      s.goal ? h('div', { class: 'm' }, 'Goal: ' + s.goal.slice(0, 70)) : null,
      threads.length ? h('div', {}, threads.map((t) => h('span', { class: 'chip', style: { background: t.color, color: '#fff' } }, t.name))) : null));
  return el;
}

function startDrag(e, scene, el, board) {
  e.preventDefault();
  const grip = e.currentTarget; grip.setPointerCapture(e.pointerId);
  const clone = el.cloneNode(true); clone.classList.add('drag-clone'); document.body.append(clone);
  const line = h('div', { class: 'drop-line' }); el.classList.add('ghost');
  const place = (x, y) => { clone.style.left = x - 20 + 'px'; clone.style.top = y - 20 + 'px'; };
  place(e.clientX, e.clientY);
  let target = { col: null, before: null };
  const move = (ev) => {
    place(ev.clientX, ev.clientY);
    if (ev.clientX < 50) board.scrollLeft -= 14; else if (ev.clientX > innerWidth - 50) board.scrollLeft += 14;
    if (ev.clientY < 110) scrollBy(0, -12); else if (ev.clientY > innerHeight - 110) scrollBy(0, 12);
    const under = document.elementFromPoint(ev.clientX, ev.clientY);
    const col = under?.closest('.col');
    board.querySelectorAll('.col').forEach((c) => c.classList.toggle('over', c === col));
    if (!col) return;
    const cards = [...col.querySelectorAll('.scene:not(.ghost)')];
    const before = cards.find((c) => { const r = c.getBoundingClientRect(); return ev.clientY < r.top + r.height / 2; }) || null;
    target = { col, before };
    before ? col.insertBefore(line, before) : col.append(line);
  };
  const up = () => {
    grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', up); grip.removeEventListener('pointercancel', up);
    clone.remove(); line.remove();
    if (!target.col) { el.classList.remove('ghost'); return; }
    const A = acts();
    const lists = A.map((_, i) => orderedScenes().filter((s) => Math.min(s.act ?? 0, A.length - 1) === i && s.id !== scene.id));
    const ai = Number(target.col.dataset.act);
    let idx = lists[ai].length;
    if (target.before) { const bid = target.before.dataset.id; idx = lists[ai].findIndex((s) => s.id === bid); if (idx < 0) idx = lists[ai].length; }
    lists[ai].splice(idx, 0, scene);
    lists.forEach((l, i) => l.forEach((s, j) => { if (s.act !== i || s.order !== j) { s.act = i; s.order = j; put(s); } }));
    rerender();
  };
  grip.addEventListener('pointermove', move); grip.addEventListener('pointerup', up); grip.addEventListener('pointercancel', up);
}

export function editScene(s, isNew = false) {
  const A = acts();
  const threads = all('thread');
  const body = h('div', { class: 'stack' },
    h('div', { class: 'fields' },
      field('Title', textInput(s, 'title')), field('Chapter', textInput(s, 'chapter', { placeholder: 'e.g. 4' })),
      field('Act / part', h('select', { class: 'in', onChange: (e) => { s.act = Number(e.target.value); s.order = 9999; put(s, true); } }, A.map((a, i) => h('option', { value: i, selected: (s.act ?? 0) === i }, a)))),
      field('Status', select(s, 'status', STATUS)), field('POV character', textInput(s, 'pov')), field('Setting', textInput(s, 'setting')),
      field('Target words', textInput(s, 'target', { type: 'number', number: true, inputMode: 'numeric' }))),
    field('Goal (what does the POV character want?)', textInput(s, 'goal', { multi: true })),
    field('Conflict (what stands in the way?)', textInput(s, 'conflict', { multi: true })),
    field('Outcome (how does it end? what changes?)', textInput(s, 'outcome', { multi: true })),
    field('Notes', textInput(s, 'notes', { multi: true })),
    threads.length ? h('div', {}, h('b', {}, 'Threads'), h('div', {}, threads.map((t) => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: (s.threads || []).includes(t.id), onChange: (e) => { s.threads = e.target.checked ? [...(s.threads || []), t.id] : (s.threads || []).filter((x) => x !== t.id); put(s, true); } }), h('span', {}, t.name))))) : null,
    h('div', { class: 'row' }, btn('✍️ Write this scene', () => { close(); go('write/' + s.id); }, 'primary'), btn('Delete', () => { if (confirm('Delete this scene and its draft?')) { remove(s); close(); } }, 'danger')));
  const close = modal(isNew ? 'New scene' : 'Scene', body, [['Done', () => { put(s, true); }, 'primary']], () => { put(s, true); setTimeout(rerender, 100); });
}
