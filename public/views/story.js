import { h, S, all, get, put, create, remove, field, textInput, select, btn, iconBtn, modal, acts, orderedScenes, fmt, icon, confirmDlg, askText, pageHead, empty, toast } from '../lib.js';
import { rerender, go } from '../app.js';
import { STATUS, STATUS_COLORS } from '../content/craft.js';

let filter = '';
const actOf = (s, A) => Math.min(s.act ?? 0, A.length - 1);
const blank = (act, scenes) => ({ act, order: scenes.filter((s) => (s.act ?? 0) === act).length + 0.5, chapter: '', title: '', pov: '', setting: '', goal: '', conflict: '', outcome: '', status: 'idea', tension: 5, threads: [], draft: '', words: 0, target: 0, notes: '' });
export function newScene(act = 0) { const s = create('scene', blank(act, orderedScenes())); editScene(s, true); return s; }

export async function render() {
  const A = acts();
  const scenes = orderedScenes();
  const words = scenes.reduce((n, s) => n + (s.words || 0), 0);
  const root = h('div', { class: 'stack-lg' },
    pageHead('Storyboard', scenes.length ? `${fmt(scenes.length)} scenes, ${fmt(words)} words. Drag a card by its handle to move it; tap a card to open it.` : 'One card per scene. Lay out the book before you write it, or as you go.',
      btn('New scene', () => newScene(0), 'primary', 'plus')));
  if (!scenes.length) { root.append(empty('The board is empty', 'Add a first scene, or fill the board from a plot structure in the Plot library.', h('div', { class: 'row' }, btn('Add a scene', () => newScene(0), 'primary', 'plus'), h('a', { class: 'btn', href: '#/plots' }, 'Open the Plot library')))); return root; }

  const max = Math.max(1, ...scenes.map((s) => s.words || 0));
  root.append(h('div', { class: 'shape', role: 'img', 'aria-label': 'Length of each scene in board order' }, scenes.map((s) => h('a', { href: '#/write/' + s.id, title: `${s.title || 'Untitled'}: ${fmt(s.words || 0)} words, ${s.status || 'idea'}`, style: { height: `${6 + ((s.words || 0) / max) * 38}px`, background: STATUS_COLORS[s.status || 'idea'] } }))));
  root.append(h('div', { class: 'row toolbar' },
    h('select', { class: 'in auto', 'aria-label': 'Filter by status', onChange: (e) => { filter = e.target.value; rerender(); } }, [['', 'Every status'], ...STATUS.map((s) => [s, s[0].toUpperCase() + s.slice(1)])].map(([v, l]) => h('option', { value: v, selected: v === filter }, l))),
    btn('Number chapters in order', async () => { if (await confirmDlg('Number chapters 1 to ' + scenes.length + '?', 'Each scene gets its own chapter number in board order, replacing any numbers already set.', 'Number chapters', 'primary')) { scenes.forEach((s, i) => put(Object.assign(s, { chapter: String(i + 1) }), true)); setTimeout(rerender, 150); } }),
    btn('Add an act', async () => { const n = await askText('Add an act or part', 'Name', '', 'Add'); if (n) { S.project.acts = [...A, n]; put(S.project, true); rerender(); } })));

  const board = h('div', { class: 'board' });
  A.forEach((name, ai) => {
    const list = scenes.filter((s) => actOf(s, A) === ai);
    board.append(h('section', { class: 'col', 'data-act': ai },
      h('header', { class: 'col-h' }, h('button', { class: 'col-name', type: 'button', title: 'Rename', onClick: () => renameAct(ai) }, name), h('span', { class: 'count' }, list.length), iconBtn('plus', `Add a scene to ${name}`, () => newScene(ai), 'ghost sm')),
      list.filter((s) => !filter || (s.status || 'idea') === filter).map((s) => card(s, board))));
  });
  root.append(board);
  return root;
}

async function renameAct(i) {
  const A = acts();
  const n = await askText('Rename act or part', 'Name (leave empty to remove an act with no scenes)', A[i]);
  if (n === null) return;
  if (!n) {
    if (orderedScenes().some((s) => actOf(s, A) === i)) return toast('Move its scenes to another act first.');
    if (A.length < 2) return;
    S.project.acts = A.filter((_, j) => j !== i); orderedScenes().forEach((s) => { if (s.act > i) { s.act--; put(s, true); } });
  } else S.project.acts = A.map((a, j) => (j === i ? n : a));
  put(S.project, true); rerender();
}

function card(s, board) {
  const threads = (s.threads || []).map((id) => get(id)).filter(Boolean);
  const meta = [s.pov, s.setting].filter(Boolean).join(', ');
  const el = h('article', { class: 'scene', 'data-id': s.id, style: { '--sc': STATUS_COLORS[s.status || 'idea'] } },
    h('div', { class: 'grip', title: 'Drag to move', 'aria-hidden': 'true', onPointerdown: (e) => startDrag(e, s, el, board) }, icon('grip', 18)),
    h('button', { class: 'scene-body', type: 'button', onClick: () => editScene(s) },
      h('span', { class: 'scene-title' }, (s.chapter ? `${s.chapter}. ` : '') + (s.title || 'Untitled scene')),
      meta && h('span', { class: 'scene-meta' }, meta),
      s.goal && h('span', { class: 'scene-goal' }, s.goal.length > 90 ? s.goal.slice(0, 88) + '…' : s.goal),
      h('span', { class: 'scene-foot' }, h('span', { class: 'status' }, s.status || 'idea'), s.words ? h('span', {}, `${fmt(s.words)} words`) : null, threads.map((t) => h('i', { class: 'thread-dot', style: { background: t.color }, title: t.name })))));
  return el;
}

function startDrag(e, scene, el, board) {
  e.preventDefault();
  const grip = e.currentTarget; grip.setPointerCapture(e.pointerId);
  const clone = el.cloneNode(true); clone.classList.add('drag-clone'); clone.style.width = el.offsetWidth + 'px'; document.body.append(clone);
  const line = h('div', { class: 'drop-line' }); el.classList.add('ghost');
  const place = (x, y) => { clone.style.left = x - 18 + 'px'; clone.style.top = y - 18 + 'px'; };
  place(e.clientX, e.clientY);
  let target = { col: null, before: null };
  const move = (ev) => {
    place(ev.clientX, ev.clientY);
    if (ev.clientX < 50) board.scrollLeft -= 14; else if (ev.clientX > innerWidth - 50) board.scrollLeft += 14;
    if (ev.clientY < 110) scrollBy(0, -12); else if (ev.clientY > innerHeight - 110) scrollBy(0, 12);
    const col = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.col');
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
    const lists = A.map((_, i) => orderedScenes().filter((s) => actOf(s, A) === i && s.id !== scene.id));
    const ai = Number(target.col.dataset.act);
    let idx = lists[ai].length;
    if (target.before) { const bid = target.before.dataset.id; idx = lists[ai].findIndex((s) => s.id === bid); if (idx < 0) idx = lists[ai].length; }
    lists[ai].splice(idx, 0, scene);
    lists.forEach((l, i) => l.forEach((s, j) => { if (s.act !== i || s.order !== j) { s.act = i; s.order = j; put(s); } }));
    rerender();
  };
  grip.addEventListener('pointermove', move); grip.addEventListener('pointerup', up); grip.addEventListener('pointercancel', up);
}

export function sceneFields(s, { compact = false } = {}) {
  const A = acts();
  const threads = all('thread');
  const chars = all('char').map((c) => c.name).filter(Boolean);
  const tv = h('output', {}, String(s.tension ?? 5));
  return h('div', { class: 'stack' },
    h('div', { class: 'fields' },
      field('Title', textInput(s, 'title', { placeholder: 'What happens, in a few words' })), field('Chapter', textInput(s, 'chapter', { placeholder: 'Number or name' })),
      field('Act or part', h('select', { class: 'in', onChange: (e) => { s.act = Number(e.target.value); s.order = 9999; put(s, true); } }, A.map((a, i) => h('option', { value: i, selected: actOf(s, A) === i }, a)))),
      field('Status', select(s, 'status', STATUS)),
      field('Point of view', h('div', {}, h('input', { class: 'in', value: s.pov || '', list: 'povlist', onInput: (e) => { s.pov = e.target.value; put(s); } }), h('datalist', { id: 'povlist' }, chars.map((n) => h('option', { value: n }))))),
      field('Setting', textInput(s, 'setting')),
      !compact && field('Target words', textInput(s, 'target', { type: 'number', number: true, inputMode: 'numeric' }))),
    field(h('span', {}, 'Tension ', tv, ' of 10'), h('input', { type: 'range', min: 1, max: 10, step: 1, value: s.tension ?? 5, class: 'range', onInput: (e) => { s.tension = Number(e.target.value); tv.textContent = e.target.value; put(s); } }), 'How tight the screw is in this scene. The Tracker draws the curve.'),
    field('Goal: what does the viewpoint character want?', textInput(s, 'goal', { multi: true, rows: 2 })),
    field('Conflict: what stands in the way?', textInput(s, 'conflict', { multi: true, rows: 2 })),
    field('Outcome: how does it end, and what changes?', textInput(s, 'outcome', { multi: true, rows: 2 })),
    field('Notes', textInput(s, 'notes', { multi: true, rows: 2 })),
    threads.length ? h('fieldset', { class: 'checks' }, h('legend', {}, 'Threads in this scene'), threads.map((t) => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: (s.threads || []).includes(t.id), onChange: (e) => { s.threads = e.target.checked ? [...(s.threads || []), t.id] : (s.threads || []).filter((x) => x !== t.id); put(s, true); } }), h('i', { class: 'thread-dot', style: { background: t.color } }), h('span', {}, t.name)))) : null);
}

export function editScene(s, isNew = false) {
  let deleted = false;
  const body = h('div', { class: 'stack' }, sceneFields(s),
    h('div', { class: 'row sb' }, btn('Write this scene', () => { close(); go('write/' + s.id); }, 'primary', 'pen'),
      btn('Delete scene', async () => { if (await confirmDlg('Delete this scene?', 'The scene and its versions move to Deleted scenes in Settings, where you can restore them.', 'Delete scene')) { await remove(s); all('snap').filter((x) => x.scene === s.id).forEach((x) => S.recs.delete(x.id)); deleted = true; close(); } }, 'danger', 'trash')));
  const close = modal(isNew ? 'New scene' : 'Scene', body, [['Done', () => {}, 'primary']], () => { if (!deleted) { if (!s.title) s.title = 'Untitled scene'; put(s, true); } setTimeout(rerender, 120); }, { wide: true });
}
